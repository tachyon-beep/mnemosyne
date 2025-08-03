/**
 * Tool Registry - Server-specific tool registration and management
 * 
 * This class provides:
 * - Tool registration for MCP server
 * - Tool execution with error handling
 * - Tool discovery and metadata
 * - Integration with database repositories and search engine
 */

import { BaseTool, ToolContext } from '../tools/BaseTool';
import { ConversationRepository, MessageRepository } from '../storage/repositories';
import { SearchEngine } from '../search/SearchEngine';
import { ToolName, MCPTool } from '../types/mcp';
import { 
  SaveMessageTool,
  SearchMessagesTool,
  GetConversationTool,
  GetConversationsTool,
  DeleteConversationTool
} from '../tools';

/**
 * Dependencies required by the server tool registry
 */
export interface ToolRegistryDependencies {
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  searchEngine: SearchEngine;
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

  constructor(dependencies: ToolRegistryDependencies) {
    this.dependencies = dependencies;
    this.initializeTools();
  }

  /**
   * Initialize all available tools
   */
  private initializeTools(): void {
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
        result: parsedResult,
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
export function createToolRegistry(dependencies: ToolRegistryDependencies): ToolRegistry {
  return new ToolRegistry(dependencies);
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
    'delete_conversation'
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