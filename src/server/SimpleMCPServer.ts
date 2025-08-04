/**
 * Simple MCP Server - Minimal working implementation
 * 
 * This is a simplified version of the MCP server that demonstrates
 * the core functionality without complex tool dependencies.
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
import { PersistenceServerConfig } from '../types/index.js';

/**
 * Simple server configuration
 */
export interface SimpleMCPServerConfig extends Partial<PersistenceServerConfig> {
  name?: string;
  version?: string;
  debug?: boolean;
}

/**
 * Simple MCP Server implementation
 */
export class SimpleMCPServer {
  private server: Server;
  private transport: StdioServerTransport | null = null;
  private database: DatabaseManager;
  private config: SimpleMCPServerConfig;
  private startTime: number | null = null;

  constructor(config: SimpleMCPServerConfig = {}) {
    this.config = {
      name: 'mcp-persistence-server',
      version: '1.0.0',
      databasePath: process.env.PERSISTENCE_DB_PATH || './conversations.db',
      debug: false,
      ...config
    };

    this.database = createDatabaseManager(this.config);

    this.server = new Server(
      {
        name: this.config.name!,
        version: this.config.version!
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupHandlers();
  }

  async start(): Promise<void> {
    this.startTime = Date.now();
    
    console.log(`[INFO] Starting ${this.config.name} v${this.config.version}`);
    
    // Initialize database
    await this.database.initialize();
    console.log(`[INFO] Database initialized at ${this.config.databasePath}`);
    
    // Start transport
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);
    
    console.log('[INFO] MCP Persistence Server is running');
    console.log('[INFO] Listening for MCP requests on stdio...');
  }

  async stop(): Promise<void> {
    if (this.database) {
      this.database.close();
    }
    if (this.transport) {
      await this.transport.close();
    }
    console.log('[INFO] Server stopped');
  }

  private setupHandlers(): void {
    // Handle tool listing
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'ping',
            description: 'Simple ping test to verify server functionality',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'Optional message to echo back'
                }
              }
            }
          }
        ]
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const { name, arguments: args } = request.params;
      
      if (name === 'ping') {
        const message = (args as any)?.message || 'pong';
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              response: message,
              timestamp: new Date().toISOString(),
              server: this.config.name,
              uptime: this.startTime ? Date.now() - this.startTime : 0
            })
          }]
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            error: 'UnknownTool',
            message: `Tool '${name}' not found`
          })
        }],
        isError: true
      };
    });

    // Handle resource listing
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: []
      };
    });
  }
}

export function createSimpleMCPServer(config?: SimpleMCPServerConfig): SimpleMCPServer {
  return new SimpleMCPServer(config);
}