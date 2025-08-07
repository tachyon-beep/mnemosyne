/**
 * Tool Registry - Server-specific tool registration and management
 * 
 * This class provides:
 * - Tool registration for MCP server
 * - Tool execution with error handling
 * - Tool discovery and metadata
 * - Integration with database repositories and search engine
 */

import { BaseTool, ToolContext } from '../tools/BaseTool.js';
import { ConversationRepository, MessageRepository, ProviderConfigRepository, SummaryRepository } from '../storage/repositories/index.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { EnhancedSearchEngine } from '../search/EnhancedSearchEngine.js';
import { EmbeddingManager } from '../search/EmbeddingManager.js';
import { ProviderManager } from '../context/ProviderManager.js';
import { ContextAssembler } from '../context/ContextAssembler.js';
import { ToolName, MCPTool } from '../types/mcp.js';
import { 
  SaveMessageTool,
  SearchMessagesTool,
  GetConversationTool,
  GetConversationsTool,
  DeleteConversationTool,
  SemanticSearchTool,
  HybridSearchTool,
  GetContextSummaryTool,
  GetRelevantSnippetsTool,
  ConfigureLLMProviderTool
} from '../tools/index.js';

/**
 * Dependencies required by the server tool registry
 */
export interface ToolRegistryDependencies {
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  searchEngine: SearchEngine;
  enhancedSearchEngine?: EnhancedSearchEngine; // Optional for enhanced search features
  providerManager?: ProviderManager; // Optional for context management features
  providerConfigRepository?: ProviderConfigRepository; // Optional for provider management
  summaryRepository?: SummaryRepository; // Optional for context assembly
  embeddingManager?: EmbeddingManager; // Optional for context assembly
  contextAssembler?: ContextAssembler; // Optional for context assembly
  knowledgeGraphService?: any; // Optional for knowledge graph features
  databaseManager?: any; // Optional for Phase 4 proactive tools
}

/**
 * Tool execution context for server
 */
export interface ServerToolContext extends ToolContext {
  /** Request ID for tracing */
  requestId: string;
  /** Client information */
  client?: {
    name?: string;
    version?: string;
  };
}

/**
 * Tool execution result with metadata
 */
export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  details?: any;
  executionTime?: number;
  timestamp: number;
}

/**
 * Tool registration entry
 */
interface ToolRegistration {
  tool: BaseTool;
  definition: MCPTool;
  metadata: {
    name: ToolName;
    description: string;
    version: string;
    registeredAt: number;
  };
}

/**
 * Server-specific tool registry for MCP server
 */
export class ToolRegistry {
  private tools: Map<ToolName, ToolRegistration> = new Map();
  private dependencies: ToolRegistryDependencies;
  private executionStats: Map<ToolName, { calls: number; errors: number; totalTime: number }> = new Map();

  private constructor(dependencies: ToolRegistryDependencies) {
    this.dependencies = dependencies;
  }
  
  /**
   * Create and initialize a ToolRegistry
   */
  static async create(dependencies: ToolRegistryDependencies): Promise<ToolRegistry> {
    const registry = new ToolRegistry(dependencies);
    await registry.initializeTools();
    return registry;
  }

  /**
   * Initialize all available tools
   */
  private async initializeTools(): Promise<void> {
    const registrationTime = Date.now();

    // Register save_message tool
    this.registerTool('save_message', SaveMessageTool.create({
      conversationRepository: this.dependencies.conversationRepository,
      messageRepository: this.dependencies.messageRepository,
      searchEngine: this.dependencies.searchEngine
    }), registrationTime);

    // Register search_messages tool
    this.registerTool('search_messages', SearchMessagesTool.create({
      searchEngine: this.dependencies.searchEngine
    }), registrationTime);

    // Register get_conversation tool
    this.registerTool('get_conversation', GetConversationTool.create({
      conversationRepository: this.dependencies.conversationRepository,
      messageRepository: this.dependencies.messageRepository
    }), registrationTime);

    // Register get_conversations tool
    this.registerTool('get_conversations', GetConversationsTool.create({
      conversationRepository: this.dependencies.conversationRepository,
      messageRepository: this.dependencies.messageRepository
    }) as BaseTool, registrationTime);

    // Register delete_conversation tool
    this.registerTool('delete_conversation', DeleteConversationTool.create({
      conversationRepository: this.dependencies.conversationRepository,
      messageRepository: this.dependencies.messageRepository,
      searchEngine: this.dependencies.searchEngine
    }), registrationTime);

    // Register enhanced search tools if available
    if (this.dependencies.enhancedSearchEngine) {
      const semanticSearchTool = new SemanticSearchTool(this.dependencies.enhancedSearchEngine);
      const hybridSearchTool = new HybridSearchTool(this.dependencies.enhancedSearchEngine);
      
      this.registerTool('semantic_search', semanticSearchTool, registrationTime);
      this.registerTool('hybrid_search', hybridSearchTool, registrationTime);
    }

    // Register context management tools if available
    if (this.dependencies.providerManager) {
      const getContextSummaryTool = GetContextSummaryTool.create({
        providerManager: this.dependencies.providerManager,
        conversationRepository: this.dependencies.conversationRepository,
        messageRepository: this.dependencies.messageRepository
      });
      
      this.registerTool('get_context_summary', getContextSummaryTool, registrationTime);
    }

    // Register get_relevant_snippets tool if context assembler is available
    if (this.dependencies.contextAssembler && 
        this.dependencies.embeddingManager && 
        this.dependencies.summaryRepository) {
      const getRelevantSnippetsTool = GetRelevantSnippetsTool.create({
        contextAssembler: this.dependencies.contextAssembler,
        embeddingManager: this.dependencies.embeddingManager,
        messageRepository: this.dependencies.messageRepository,
        summaryRepository: this.dependencies.summaryRepository
      });
      
      this.registerTool('get_relevant_snippets', getRelevantSnippetsTool, registrationTime);
    }

    // Register configure_llm_provider tool if provider config repository is available
    if (this.dependencies.providerConfigRepository) {
      const configureLLMProviderTool = ConfigureLLMProviderTool.create({
        providerConfigRepository: this.dependencies.providerConfigRepository
      });
      
      this.registerTool('configure_llm_provider', configureLLMProviderTool, registrationTime);
    }
    
    // Register progressive detail tool if summary repository available
    if (this.dependencies.summaryRepository) {
      const { GetProgressiveDetailTool } = await import('../tools/GetProgressiveDetailTool.js');
      const getProgressiveDetailTool = GetProgressiveDetailTool.create({
        conversationRepository: this.dependencies.conversationRepository,
        messageRepository: this.dependencies.messageRepository,
        summaryRepository: this.dependencies.summaryRepository
      });
      
      this.registerTool('get_progressive_detail', getProgressiveDetailTool, registrationTime);
    }

    // Register knowledge graph tools if available
    if (this.dependencies.knowledgeGraphService) {
      const { GetEntityHistoryTool } = await import('../tools/GetEntityHistoryTool.js');
      const { FindRelatedConversationsTool } = await import('../tools/FindRelatedConversationsTool.js');
      const { GetKnowledgeGraphTool } = await import('../tools/GetKnowledgeGraphTool.js');
      
      const getEntityHistoryTool = new GetEntityHistoryTool(this.dependencies.knowledgeGraphService);
      const findRelatedConversationsTool = new FindRelatedConversationsTool(this.dependencies.knowledgeGraphService);
      const getKnowledgeGraphTool = new GetKnowledgeGraphTool(this.dependencies.knowledgeGraphService);
      
      this.registerTool('get_entity_history', getEntityHistoryTool, registrationTime);
      this.registerTool('find_related_conversations', findRelatedConversationsTool, registrationTime);
      this.registerTool('get_knowledge_graph', getKnowledgeGraphTool, registrationTime);
    }

    // Register Phase 4 proactive tools if database manager is available
    if (this.dependencies.databaseManager) {
      console.log('[INFO] Registering Phase 4 proactive tools...');
      const { 
        GetProactiveInsightsTool,
        CheckForConflictsTool,
        SuggestRelevantContextTool,
        AutoTagConversationTool
      } = await import('../tools/proactive/index.js');
      
      // Import required repositories for Phase 4 tools
      const { EntityRepository } = await import('../storage/repositories/EntityRepository.js');
      const { KnowledgeGraphRepository } = await import('../storage/repositories/KnowledgeGraphRepository.js');
      
      // Create repositories needed by Phase 4 tools
      // EntityRepository expects DatabaseManager
      const entityRepository = new EntityRepository(this.dependencies.databaseManager);
      // KnowledgeGraphRepository expects raw database connection
      const knowledgeGraphRepository = new KnowledgeGraphRepository(this.dependencies.databaseManager.getConnection());
      
      // Create proactive insights tool
      const getProactiveInsightsTool = GetProactiveInsightsTool.create({
        databaseManager: this.dependencies.databaseManager
      });
      
      // Create conflict detection tool
      const checkForConflictsTool = CheckForConflictsTool.create({
        databaseManager: this.dependencies.databaseManager,
        entityRepository,
        knowledgeGraphRepository
      });
      
      // Create context suggestion tool
      const suggestRelevantContextTool = SuggestRelevantContextTool.create({
        databaseManager: this.dependencies.databaseManager,
        entityRepository,
        knowledgeGraphRepository
      });
      
      // Create auto-tagging tool
      const autoTagConversationTool = AutoTagConversationTool.create({
        databaseManager: this.dependencies.databaseManager
      });
      
      // Register all proactive tools
      this.registerTool('get_proactive_insights', getProactiveInsightsTool, registrationTime);
      this.registerTool('check_for_conflicts', checkForConflictsTool, registrationTime);
      this.registerTool('suggest_relevant_context', suggestRelevantContextTool, registrationTime);
      this.registerTool('auto_tag_conversation', autoTagConversationTool, registrationTime);
      
      console.log('[INFO] Phase 4 proactive tools registered successfully');
    } else {
      console.log('[INFO] Skipping Phase 4 tools - database manager not available');
    }

    // Register Phase 5 analytics tools if database manager is available
    if (this.dependencies.databaseManager) {
      console.log('[INFO] Registering Phase 5 analytics tools...');
      
      try {
        const {
          GetConversationAnalyticsTool,
          AnalyzeProductivityPatternsTool,
          DetectKnowledgeGapsTool,
          TrackDecisionEffectivenessTool,
          GenerateAnalyticsReportTool
        } = await import('../tools/analytics/index.js');
        
        // Import analytics repositories
        const {
          ConversationAnalyticsRepository,
          ProductivityPatternsRepository,
          KnowledgeGapsRepository,
          DecisionTrackingRepository
        } = await import('../analytics/repositories/index.js');
        
        // Import analyzers
        const { ConversationFlowAnalyzer } = await import('../analytics/analyzers/ConversationFlowAnalyzer.js');
        const { ProductivityAnalyzer } = await import('../analytics/analyzers/ProductivityAnalyzer.js');
        const { KnowledgeGapDetector } = await import('../analytics/analyzers/KnowledgeGapDetector.js');
        const { DecisionTracker } = await import('../analytics/analyzers/DecisionTracker.js');
        
        // Import analytics engine
        const { AnalyticsEngine } = await import('../analytics/services/AnalyticsEngine.js');
        
        // Create analytics repositories
        const conversationAnalyticsRepo = new ConversationAnalyticsRepository(this.dependencies.databaseManager);
        const productivityPatternsRepo = new ProductivityPatternsRepository(this.dependencies.databaseManager);
        const knowledgeGapsRepo = new KnowledgeGapsRepository(this.dependencies.databaseManager);
        const decisionTrackingRepo = new DecisionTrackingRepository(this.dependencies.databaseManager);
        
        // Create analyzers
        const conversationFlowAnalyzer = new ConversationFlowAnalyzer();
        const productivityAnalyzer = new ProductivityAnalyzer();
        const knowledgeGapDetector = new KnowledgeGapDetector();
        const decisionTracker = new DecisionTracker();
        
        // Create analytics engine
        const analyticsEngine = new AnalyticsEngine(this.dependencies.databaseManager);
        
        // Common dependencies for analytics tools
        const analyticsToolDependencies = {
          analyticsEngine,
          conversationRepository: this.dependencies.conversationRepository,
          messageRepository: this.dependencies.messageRepository,
          conversationFlowAnalyzer,
          productivityAnalyzer,
          knowledgeGapDetector,
          decisionTracker
        };
        
        // Create and register analytics tools
        const getConversationAnalyticsTool = new GetConversationAnalyticsTool(analyticsToolDependencies);
        const analyzeProductivityPatternsTool = new AnalyzeProductivityPatternsTool({
          ...analyticsToolDependencies,
          productivityPatternsRepository: productivityPatternsRepo
        });
        const detectKnowledgeGapsTool = new DetectKnowledgeGapsTool({
          ...analyticsToolDependencies,
          knowledgeGapsRepository: knowledgeGapsRepo
        });
        const trackDecisionEffectivenessTool = new TrackDecisionEffectivenessTool({
          ...analyticsToolDependencies,
          decisionTrackingRepository: decisionTrackingRepo
        });
        const generateAnalyticsReportTool = new GenerateAnalyticsReportTool(analyticsToolDependencies);
        
        // Register Phase 5 analytics tools
        this.registerTool('get_conversation_analytics', getConversationAnalyticsTool, registrationTime);
        this.registerTool('analyze_productivity_patterns', analyzeProductivityPatternsTool, registrationTime);
        this.registerTool('detect_knowledge_gaps', detectKnowledgeGapsTool, registrationTime);
        this.registerTool('track_decision_effectiveness', trackDecisionEffectivenessTool, registrationTime);
        this.registerTool('generate_analytics_report', generateAnalyticsReportTool, registrationTime);
        
        console.log('[INFO] Phase 5 analytics tools registered successfully');
        
      } catch (error) {
        console.error('[ERROR] Failed to register Phase 5 analytics tools:', error);
        console.log('[INFO] Skipping Phase 5 analytics tools due to import error');
      }
    } else {
      console.log('[INFO] Skipping Phase 5 analytics tools - database manager not available');
    }

  }

  /**
   * Register a tool with the registry
   */
  private registerTool(name: ToolName, tool: BaseTool, registrationTime: number): void {
    const definition = tool.getTool();
    
    const registration: ToolRegistration = {
      tool,
      definition,
      metadata: {
        name,
        description: tool.getDescription(),
        version: '1.0.0',
        registeredAt: registrationTime
      }
    };

    this.tools.set(name, registration);
    this.executionStats.set(name, { calls: 0, errors: 0, totalTime: 0 });
  }

  /**
   * Get a tool by name
   */
  getTool(name: ToolName): BaseTool | undefined {
    const registration = this.tools.get(name);
    return registration?.tool;
  }

  /**
   * Get all registered tools
   */
  getAllTools(): BaseTool[] {
    return Array.from(this.tools.values()).map(reg => reg.tool);
  }

  /**
   * Get all tool names
   */
  getToolNames(): ToolName[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool is registered
   */
  hasTool(name: ToolName): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tool definitions for MCP protocol
   */
  getToolDefinitions(): MCPTool[] {
    return Array.from(this.tools.values()).map(reg => reg.definition);
  }

  /**
   * Get tool definition by name
   */
  getToolDefinition(name: ToolName): MCPTool | undefined {
    const registration = this.tools.get(name);
    return registration?.definition;
  }

  /**
   * Execute a tool with enhanced error handling and metrics
   */
  async executeTool(
    name: ToolName,
    input: unknown,
    context?: Partial<ServerToolContext>
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    const timestamp = startTime;

    try {
      // Check if tool exists
      const tool = this.getTool(name);
      if (!tool) {
        return {
          success: false,
          error: 'ToolNotFound',
          details: `Tool '${name}' is not registered`,
          timestamp
        };
      }

      // Update execution stats
      const stats = this.executionStats.get(name)!;
      stats.calls++;

      // Create execution context
      const executionContext: ServerToolContext = {
        requestId: context?.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: startTime,
        client: context?.client,
        ...context
      };

      // Execute tool directly
      const mcpResult = await tool.execute(input, executionContext);

      const executionTime = Date.now() - startTime;
      stats.totalTime += executionTime;

      // Check if the tool execution was successful (no isError flag)
      if (mcpResult.isError) {
        stats.errors++;
        return {
          success: false,
          error: 'ToolExecutionError',
          details: mcpResult.content[0]?.text || 'Tool execution failed',
          executionTime,
          timestamp
        };
      }

      // Parse the result from the MCP format
      let parsedResult;
      try {
        const responseText = mcpResult.content[0]?.text;
        if (!responseText) {
          throw new Error('No response text in tool result');
        }
        const response = JSON.parse(responseText);
        if (!response.success) {
          stats.errors++;
          return {
            success: false,
            error: response.error || 'ToolError',
            details: response.message || 'Tool reported an error',
            executionTime,
            timestamp
          };
        }
        parsedResult = response.data;
      } catch (parseError) {
        stats.errors++;
        return {
          success: false,
          error: 'ResponseParseError',
          details: 'Failed to parse tool response',
          executionTime,
          timestamp
        };
      }

      return {
        success: true,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify(parsedResult)
          }]
        },
        executionTime,
        timestamp
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const stats = this.executionStats.get(name);
      if (stats) {
        stats.errors++;
        stats.totalTime += executionTime;
      }

      return {
        success: false,
        error: 'UnexpectedError',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        executionTime,
        timestamp
      };
    }
  }

  /**
   * Validate tool input using the tool's schema
   */
  validateToolInput(name: ToolName, input: unknown): { valid: boolean; error?: string; validatedInput?: any } {
    try {
      const tool = this.getTool(name);
      if (!tool) {
        return { valid: false, error: `Tool '${name}' not found` };
      }

      // Use the tool's validation method if available
      if (typeof (tool as any).validateInput === 'function') {
        const validatedInput = (tool as any).validateInput(input);
        return { valid: true, validatedInput };
      }

      // If no validation method, assume input is valid
      return { valid: true, validatedInput: input };

    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Validation failed'
      };
    }
  }

  /**
   * Get tool execution statistics
   */
  getToolStatistics(): Record<ToolName, { calls: number; errors: number; totalTime: number; avgTime: number }> {
    const stats: Record<string, any> = {};
    
    for (const [name, stat] of this.executionStats.entries()) {
      stats[name] = {
        calls: stat.calls,
        errors: stat.errors,
        totalTime: stat.totalTime,
        avgTime: stat.calls > 0 ? stat.totalTime / stat.calls : 0
      };
    }
    
    return stats as Record<ToolName, { calls: number; errors: number; totalTime: number; avgTime: number }>;
  }

  /**
   * Get registry metadata
   */
  getRegistryInfo(): {
    totalTools: number;
    tools: Array<{
      name: ToolName;
      description: string;
      version: string;
      registeredAt: number;
    }>;
    statistics: Record<ToolName, { calls: number; errors: number; totalTime: number; avgTime: number }>;
  } {
    const tools = Array.from(this.tools.values()).map(reg => ({
      name: reg.metadata.name,
      description: reg.metadata.description,
      version: reg.metadata.version,
      registeredAt: reg.metadata.registeredAt
    }));

    return {
      totalTools: this.tools.size,
      tools,
      statistics: this.getToolStatistics()
    };
  }

  /**
   * Reset execution statistics
   */
  resetStatistics(): void {
    for (const [name] of this.tools.entries()) {
      this.executionStats.set(name, { calls: 0, errors: 0, totalTime: 0 });
    }
  }

  /**
   * Get tool by name with detailed information
   */
  getToolDetails(name: ToolName): {
    tool: BaseTool;
    definition: MCPTool;
    metadata: ToolRegistration['metadata'];
    statistics: { calls: number; errors: number; totalTime: number; avgTime: number };
  } | undefined {
    const registration = this.tools.get(name);
    if (!registration) {
      return undefined;
    }

    const stats = this.executionStats.get(name)!;
    
    return {
      tool: registration.tool,
      definition: registration.definition,
      metadata: registration.metadata,
      statistics: {
        calls: stats.calls,
        errors: stats.errors,
        totalTime: stats.totalTime,
        avgTime: stats.calls > 0 ? stats.totalTime / stats.calls : 0
      }
    };
  }

  /**
   * Health check for all tools
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    tools: Record<ToolName, { status: 'ok' | 'error'; error?: string }>;
  }> {
    const results: Record<string, { status: 'ok' | 'error'; error?: string }> = {};
    let allHealthy = true;

    for (const name of this.getToolNames()) {
      try {
        const tool = this.getTool(name);
        if (!tool) {
          results[name] = { status: 'error', error: 'Tool not found' };
          allHealthy = false;
          continue;
        }

        // Basic health check - verify tool can be instantiated and has required methods
        if (typeof tool.execute !== 'function') {
          results[name] = { status: 'error', error: 'Missing execute method' };
          allHealthy = false;
          continue;
        }

        results[name] = { status: 'ok' };

      } catch (error) {
        results[name] = { 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
        allHealthy = false;
      }
    }

    return {
      healthy: allHealthy,
      tools: results as Record<ToolName, { status: 'ok' | 'error'; error?: string }>
    };
  }
}

/**
 * Factory function to create a tool registry
 */
export async function createToolRegistry(dependencies: ToolRegistryDependencies): Promise<ToolRegistry> {
  return ToolRegistry.create(dependencies);
}

/**
 * Type guards and utilities
 */
export function isValidToolName(name: string): name is ToolName {
  const validNames: ToolName[] = [
    'save_message',
    'search_messages',
    'get_conversation',
    'get_conversations',
    'delete_conversation',
    'semantic_search',
    'hybrid_search',
    'get_context_summary',
    'get_relevant_snippets',
    'configure_llm_provider',
    'get_progressive_detail',
    'get_entity_history',
    'find_related_conversations',
    'get_knowledge_graph',
    'get_proactive_insights',
    'check_for_conflicts',
    'suggest_relevant_context',
    'auto_tag_conversation',
    'get_conversation_analytics',
    'analyze_productivity_patterns',
    'detect_knowledge_gaps',
    'track_decision_effectiveness',
    'generate_analytics_report'
  ];
  return validNames.includes(name as ToolName);
}

/**
 * Helper to create server tool context
 */
export function createServerToolContext(
  requestId?: string,
  client?: { name?: string; version?: string }
): ServerToolContext {
  return {
    requestId: requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    client
  };
}