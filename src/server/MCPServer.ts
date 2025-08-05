/**
 * MCP Server - Main server implementation using @modelcontextprotocol/sdk
 * 
 * This class provides:
 * - MCP protocol communication via stdio transport
 * - Tool registration and execution
 * - Database initialization and management
 * - Graceful startup and shutdown
 * - Error handling and logging
 * - Health checks and status reporting
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolRequest,
  ListToolsRequestSchema,
  ListResourcesRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { DatabaseManager, createDatabaseManager } from '../storage/Database.js';
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { EnhancedSearchEngine } from '../search/EnhancedSearchEngine.js';
import { EmbeddingManager } from '../search/EmbeddingManager.js';
import { ToolRegistry } from './ToolRegistry.js';
import { PersistenceServerConfig } from '../types/index.js';
import { isValidToolName } from '../tools/index.js';
import { KnowledgeGraphService as NewKnowledgeGraphService } from '../knowledge-graph/KnowledgeGraphService.js';

/**
 * Configuration options for the MCP server
 */
export interface MCPServerConfig extends Partial<PersistenceServerConfig> {
  /** Server name for MCP protocol */
  name?: string;
  /** Server version */
  version?: string;
  /** Enable debug logging */
  debug?: boolean;
  /** Maximum execution time for tools (ms) */
  toolTimeoutMs?: number;
}

/**
 * Server status enumeration
 */
export enum ServerStatus {
  STOPPED = 'stopped',
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  ERROR = 'error'
}

/**
 * Server health check result
 */
export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: 'ok' | 'error';
    tools: 'ok' | 'error';
    search: 'ok' | 'error';
  };
  uptime: number;
  error?: string;
}

/**
 * Main MCP server class
 */
export class MCPServer {
  private server: Server;
  private transport: StdioServerTransport | null = null;
  private database: DatabaseManager;
  private toolRegistry: ToolRegistry | null = null;
  private basicSearchEngine: SearchEngine | null = null;
  private enhancedSearchEngine: EnhancedSearchEngine | null = null;
  private embeddingManager: EmbeddingManager | null = null;
  private knowledgeGraphService: NewKnowledgeGraphService | null = null;
  private config: MCPServerConfig;
  private status: ServerStatus = ServerStatus.STOPPED;
  private startTime: number | null = null;
  private shutdownHandlers: (() => Promise<void>)[] = [];

  constructor(config: MCPServerConfig = {}) {
    this.config = {
      name: 'mcp-persistence-server',
      version: '1.0.0',
      databasePath: process.env.PERSISTENCE_DB_PATH || './conversations.db',
      logLevel: (process.env.PERSISTENCE_LOG_LEVEL as any) || 'info',
      maxDatabaseSizeMB: parseInt(process.env.PERSISTENCE_MAX_DB_SIZE_MB || '1000', 10),
      debug: false,
      toolTimeoutMs: 30000,
      ...config
    };

    // Initialize database manager
    this.database = createDatabaseManager(this.config);

    // Create MCP server instance
    this.server = new Server(
      {
        name: this.config.name!,
        version: this.config.version!
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {}
        }
      }
    );

    this.setupServerHandlers();
    this.setupProcessHandlers();
  }

  /**
   * Start the MCP server
   */
  async start(): Promise<void> {
    if (this.status !== ServerStatus.STOPPED) {
      throw new Error(`Cannot start server: current status is ${this.status}`);
    }

    try {
      this.status = ServerStatus.STARTING;
      this.startTime = Date.now();
      
      this.log('info', 'Starting MCP Persistence Server...');

      // Initialize database
      await this.initializeDatabase();

      // Initialize search engine and repositories
      await this.initializeServices();

      // Register tools
      await this.initializeTools();

      // Start transport
      await this.startTransport();

      this.status = ServerStatus.RUNNING;
      this.log('info', `Server started successfully on ${this.config.name} v${this.config.version}`);
      
    } catch (error) {
      this.status = ServerStatus.ERROR;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.log('error', `Failed to start server: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Stop the MCP server
   */
  async stop(): Promise<void> {
    if (this.status === ServerStatus.STOPPED || this.status === ServerStatus.STOPPING) {
      return;
    }

    try {
      this.status = ServerStatus.STOPPING;
      this.log('info', 'Stopping MCP Persistence Server...');

      // Run shutdown handlers
      for (const handler of this.shutdownHandlers) {
        try {
          await handler();
        } catch (error) {
          this.log('error', `Shutdown handler error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Close embedding manager if initialized
      if (this.embeddingManager) {
        try {
          // Embedding manager cleanup if needed
          this.embeddingManager = null;
        } catch (error) {
          this.log('error', `Error closing embedding manager: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Close search engines
      if (this.basicSearchEngine) {
        this.basicSearchEngine.destroy();
        this.basicSearchEngine = null;
      }
      
      if (this.enhancedSearchEngine) {
        this.enhancedSearchEngine = null;
      }

      // Close database connection
      if (this.database) {
        this.database.close();
      }

      // Close transport
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }

      this.status = ServerStatus.STOPPED;
      this.log('info', 'Server stopped successfully');
      
    } catch (error) {
      this.status = ServerStatus.ERROR;
      this.log('error', `Error during shutdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get current server status
   */
  getStatus(): ServerStatus {
    return this.status;
  }

  /**
   * Get the tool registry (for testing)
   */
  getToolRegistry(): ToolRegistry | null {
    return this.toolRegistry;
  }

  /**
   * Perform health check
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {
      database: 'error',
      tools: 'error',
      search: 'error'
    };

    let overallStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    let error: string | undefined;

    try {
      // Check database
      if (this.database && this.database.isConnected()) {
        await this.database.getStats();
        checks.database = 'ok';
      } else {
        checks.database = 'error';
      }

      // Check tools
      if (this.toolRegistry) {
        const toolCount = this.toolRegistry.getAllTools().length;
        if (toolCount > 0) {
          checks.tools = 'ok';
        } else {
          checks.tools = 'error';
        }
      } else {
        checks.tools = 'error';
      }

      // Check search (enhanced or basic functionality)
      if (this.toolRegistry) {
        try {
          // Test basic search functionality
          const tools = this.toolRegistry.getAllTools();
          const hasSearchTools = tools.some(tool => {
            const name = (tool as any).getName?.();
            return name === 'search_messages' || name === 'semantic_search' || name === 'hybrid_search';
          });
          
          if (hasSearchTools) {
            checks.search = 'ok';
          } else {
            checks.search = 'error';
          }
        } catch (err) {
          checks.search = 'error';
        }
      } else {
        checks.search = 'error';
      }

      // Overall status
      if (checks.database === 'ok' && checks.tools === 'ok' && checks.search === 'ok') {
        overallStatus = 'healthy';
      }

    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    return {
      status: overallStatus,
      checks,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      error
    };
  }

  /**
   * Get server statistics
   */
  async getStats(): Promise<any> {
    const health = await this.healthCheck();
    const dbStats = this.database?.isConnected() ? await this.database.getStats() : null;
    const toolStats = this.toolRegistry ? {
      totalTools: this.toolRegistry.getAllTools().length,
      toolNames: this.toolRegistry.getToolNames(),
      enhancedSearchEnabled: this.enhancedSearchEngine !== null,
      executionStats: this.toolRegistry.getToolStatistics()
    } : null;

    // Get embedding statistics if available
    let embeddingStats = null;
    if (this.embeddingManager) {
      try {
        embeddingStats = {
          enabled: true,
          model: 'local',
          lastIndex: dbStats?.lastEmbeddingIndex || 0
        };
      } catch (error) {
        embeddingStats = {
          enabled: false,
          error: 'Failed to get embedding stats'
        };
      }
    } else {
      embeddingStats = {
        enabled: false,
        reason: 'Embedding manager not initialized'
      };
    }

    return {
      server: {
        name: this.config.name,
        version: this.config.version,
        status: this.status,
        uptime: health.uptime,
        health: health.status
      },
      database: dbStats,
      tools: toolStats,
      embeddings: embeddingStats,
      search: {
        enhancedSearchAvailable: this.enhancedSearchEngine !== null,
        semanticSearchAvailable: this.toolRegistry?.hasTool('semantic_search') || false,
        hybridSearchAvailable: this.toolRegistry?.hasTool('hybrid_search') || false
      }
    };
  }

  /**
   * Initialize database and run migrations
   */
  private async initializeDatabase(): Promise<void> {
    this.log('info', 'Initializing database...');
    
    try {
      await this.database.initialize();
      this.log('info', `Database initialized at ${this.config.databasePath}`);
    } catch (error) {
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize repositories and search engine
   */
  private async initializeServices(): Promise<void> {
    this.log('info', 'Initializing services...');
    
    try {
      // Initialize embedding manager (may fail gracefully)
      this.embeddingManager = new EmbeddingManager(this.database);
      await this.embeddingManager.initialize();
      
      // Initialize enhanced search engine with embedding support
      const messageRepository = new MessageRepository(this.database);
      this.basicSearchEngine = new SearchEngine(messageRepository);
      
      this.enhancedSearchEngine = new EnhancedSearchEngine(
        this.database,
        this.embeddingManager,
        this.basicSearchEngine
      );
      
      this.log('info', 'Enhanced search engine initialized successfully');
    } catch (error) {
      // Enhanced search is optional - log warning but continue
      this.log('warn', `Enhanced search initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.log('warn', 'Continuing with basic search functionality only');
      this.basicSearchEngine = null;
      this.enhancedSearchEngine = null;
      this.embeddingManager = null;
    }

    // Initialize knowledge graph service
    try {
      this.knowledgeGraphService = new NewKnowledgeGraphService(this.database.getConnection(), {
        enableAutoProcessing: true,
        batchProcessingSize: 100,
        maxEntitiesPerMessage: 20,
        minEntityConfidence: 0.6,
        minRelationshipConfidence: 0.3,
        enableRelationshipDecay: true,
        relationshipDecayDays: 30
      });
      this.log('info', 'Knowledge graph service initialized successfully');
    } catch (error) {
      // Knowledge graph is optional - log warning but continue
      this.log('warn', `Knowledge graph initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.log('warn', 'Continuing without knowledge graph functionality');
      this.knowledgeGraphService = null;
    }
  }

  /**
   * Initialize and register tools
   */
  private async initializeTools(): Promise<void> {
    this.log('info', 'Initializing tools...');
    
    try {
      // Create repositories
      const conversationRepository = new ConversationRepository(this.database);
      const messageRepository = new MessageRepository(this.database);
      const { SummaryRepository, ProviderConfigRepository } = await import('../storage/repositories/index.js');
      const summaryRepository = new SummaryRepository(this.database);
      const providerConfigRepository = new ProviderConfigRepository(this.database);
      
      // Use existing search engine or create a new one if enhanced search failed
      const searchEngine = this.basicSearchEngine || new SearchEngine(messageRepository);
      
      // Create context management components if available
      let providerManager;
      let contextAssembler;
      
      if (this.embeddingManager) {
        const { ProviderManager } = await import('../context/ProviderManager.js');
        const { ContextAssembler } = await import('../context/ContextAssembler.js');
        
        providerManager = new ProviderManager({
          defaultStrategy: 'fallback',
          maxRetries: 3,
          retryDelay: 1000,
          healthCheckInterval: 300000
        });
        contextAssembler = new ContextAssembler(
          this.embeddingManager,
          messageRepository,
          summaryRepository
        );
      }
      
      // Create tool registry with all dependencies
      this.toolRegistry = await ToolRegistry.create({
        conversationRepository,
        messageRepository,
        searchEngine,
        enhancedSearchEngine: this.enhancedSearchEngine || undefined,
        providerManager,
        providerConfigRepository,
        summaryRepository,
        embeddingManager: this.embeddingManager || undefined,
        contextAssembler,
        knowledgeGraphService: this.knowledgeGraphService || undefined
      });

      const toolCount = this.toolRegistry ? this.toolRegistry.getAllTools().length : 0;
      const enhancedStatus = this.enhancedSearchEngine ? 'with enhanced search' : 'basic search only';
      this.log('info', `Registered ${toolCount} tools (${enhancedStatus})`);
      
    } catch (error) {
      throw new Error(`Tool initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start the stdio transport
   */
  private async startTransport(): Promise<void> {
    this.log('info', 'Starting stdio transport...');
    
    try {
      this.transport = new StdioServerTransport();
      await this.server.connect(this.transport);
      this.log('info', 'Stdio transport started');
    } catch (error) {
      throw new Error(`Transport startup failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Setup MCP server request handlers
   */
  private setupServerHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      if (!this.toolRegistry) {
        throw new Error('Tool registry not initialized');
      }

      return {
        tools: this.toolRegistry.getToolDefinitions()
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      if (!this.toolRegistry) {
        throw new Error('Tool registry not initialized');
      }

      const { name, arguments: args } = request.params;
      
      this.log('debug', `Executing tool: ${name}`, args);

      // Track search tool performance
      const isSearchTool = ['search_messages', 'semantic_search', 'hybrid_search'].includes(name);
      const searchStartTime = isSearchTool ? Date.now() : null;

      try {
        // Validate tool name
        if (!isValidToolName(name)) {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: 'InvalidTool',
                message: `Unknown tool: ${name}`
              })
            }],
            isError: true
          };
        }

        // Execute tool with timeout
        const result = await this.executeWithTimeout(
          () => this.toolRegistry!.executeTool(name, args),
          this.config.toolTimeoutMs!
        );

        if (result.success) {
          // Log search performance if this was a search tool
          if (isSearchTool && searchStartTime) {
            const searchDuration = Date.now() - searchStartTime;
            const resultCount = result.result?.results?.length || result.result?.data?.results?.length || 0;
            this.log('info', `Search tool '${name}' completed in ${searchDuration}ms, returned ${resultCount} results`);
            
            // Log enhanced search specific metrics
            if (name === 'semantic_search' || name === 'hybrid_search') {
              this.log('debug', `Enhanced search metrics: strategy=${result.result?.metadata?.strategy || 'unknown'}, embeddings=${this.embeddingManager ? 'enabled' : 'disabled'}`);
            }
          }

          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify(result.result)
            }]
          };
        } else {
          return {
            content: [{
              type: 'text' as const,
              text: JSON.stringify({
                error: result.error,
                message: result.details
              })
            }],
            isError: true
          };
        }

      } catch (error) {
        this.log('error', `Tool execution error for ${name}:`, error);
        
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              error: 'ToolExecutionError',
              message: error instanceof Error ? error.message : 'Unknown error'
            })
          }],
          isError: true
        };
      }
    });

    // Handle resource listing (empty for now)
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: []
      };
    });
  }

  /**
   * Setup process signal handlers for graceful shutdown
   */
  private setupProcessHandlers(): void {
    const signals = ['SIGINT', 'SIGTERM', 'SIGUSR2'] as const;
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        this.log('info', `Received ${signal}, initiating graceful shutdown...`);
        try {
          await this.stop();
          process.exit(0);
        } catch (error) {
          this.log('error', `Error during graceful shutdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
          process.exit(1);
        }
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.log('error', 'Uncaught exception:', error);
      process.exit(1);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.log('error', 'Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });
  }

  /**
   * Execute a function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Add a shutdown handler
   */
  onShutdown(handler: () => Promise<void>): void {
    this.shutdownHandlers.push(handler);
  }

  /**
   * Logging utility
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const shouldLog = this.config.debug || level !== 'debug';
    
    if (shouldLog) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
      
      if (args.length > 0) {
        console.log(`${prefix} ${message}`, ...args);
      } else {
        console.log(`${prefix} ${message}`);
      }
    }
  }
}

/**
 * Factory function to create an MCP server instance
 */
export function createMCPServer(config?: MCPServerConfig): MCPServer {
  return new MCPServer(config);
}

/**
 * Type exports for external use
 */
export type { MCPServerConfig as ServerConfig, HealthCheckResult as HealthCheck };