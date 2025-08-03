/**
 * Tools Module - Export barrel and tool registry
 * 
 * This module provides all MCP tool implementations for the persistence system
 * and includes a tool registry for easy instantiation and management.
 */

// Base tool classes and utilities
export { BaseTool } from './BaseTool';
export type { ToolContext } from './BaseTool';
export {
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  isKnownError,
  wrapDatabaseOperation
} from './BaseTool';

// Tool implementations
export { SaveMessageTool } from './SaveMessageTool';
export type {
  SaveMessageResponse,
  SaveMessageDependencies
} from './SaveMessageTool';

export { SearchMessagesTool } from './SearchMessagesTool';
export type {
  SearchMessagesResponse,
  SearchMessagesDependencies,
  EnhancedSearchResult
} from './SearchMessagesTool';

export { GetConversationTool } from './GetConversationTool';
export type {
  GetConversationResponse,
  GetConversationDependencies,
  MessageWithContext
} from './GetConversationTool';

export { GetConversationsTool } from './GetConversationsTool';
export type {
  GetConversationsResponse,
  GetConversationsDependencies,
  ConversationWithMetadata
} from './GetConversationsTool';

export { DeleteConversationTool } from './DeleteConversationTool';
export type {
  DeleteConversationResponse,
  DeleteConversationDependencies
} from './DeleteConversationTool';

// Re-export tool schemas and types for convenience
export type {
  SaveMessageInput,
  SearchMessagesInput,
  GetConversationInput,
  GetConversationsInput,
  DeleteConversationInput
} from '../types/schemas';

// Re-export MCP tool definitions
export {
  SaveMessageTool as SaveMessageToolDef,
  SearchMessagesTool as SearchMessagesToolDef,
  GetConversationTool as GetConversationToolDef,
  GetConversationsTool as GetConversationsToolDef,
  DeleteConversationTool as DeleteConversationToolDef,
  AllTools,
  type MCPTool,
  type MCPToolResult,
  type ToolName
} from '../types/mcp';

// Import required dependencies for the registry
import { ConversationRepository, MessageRepository } from '../storage/repositories';
import { SearchEngine } from '../search/SearchEngine';
import { SaveMessageTool } from './SaveMessageTool';
import { SearchMessagesTool } from './SearchMessagesTool';
import { GetConversationTool } from './GetConversationTool';
import { GetConversationsTool } from './GetConversationsTool';
import { DeleteConversationTool } from './DeleteConversationTool';
import { ToolName } from '../types/mcp';
import { BaseTool, ToolContext } from './BaseTool';

/**
 * Dependencies required by the tool registry
 */
export interface ToolRegistryDependencies {
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  searchEngine: SearchEngine;
}

/**
 * Tool registry for managing and instantiating MCP tools
 */
export class ToolRegistry {
  private readonly tools: Map<ToolName, BaseTool>;
  private readonly dependencies: ToolRegistryDependencies;

  constructor(dependencies: ToolRegistryDependencies) {
    this.dependencies = dependencies;
    this.tools = new Map();
    this.initializeTools();
  }

  /**
   * Initialize all available tools
   */
  private initializeTools(): void {
    // Create tool instances with their dependencies
    const saveMessageTool = SaveMessageTool.create({
      conversationRepository: this.dependencies.conversationRepository,
      messageRepository: this.dependencies.messageRepository,
      searchEngine: this.dependencies.searchEngine
    });

    const searchMessagesTool = SearchMessagesTool.create({
      searchEngine: this.dependencies.searchEngine
    });

    const getConversationTool = GetConversationTool.create({
      conversationRepository: this.dependencies.conversationRepository,
      messageRepository: this.dependencies.messageRepository
    });

    const getConversationsTool = GetConversationsTool.create({
      conversationRepository: this.dependencies.conversationRepository,
      messageRepository: this.dependencies.messageRepository
    });

    const deleteConversationTool = DeleteConversationTool.create({
      conversationRepository: this.dependencies.conversationRepository,
      messageRepository: this.dependencies.messageRepository,
      searchEngine: this.dependencies.searchEngine
    });

    // Register tools by name
    this.tools.set('save_message', saveMessageTool);
    this.tools.set('search_messages', searchMessagesTool);
    this.tools.set('get_conversation', getConversationTool);
    this.tools.set('get_conversations', getConversationsTool);
    this.tools.set('delete_conversation', deleteConversationTool);
  }

  /**
   * Get a tool by name
   */
  public getTool(name: ToolName): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all available tools
   */
  public getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool names
   */
  public getToolNames(): ToolName[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool exists
   */
  public hasTool(name: ToolName): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name
   */
  public async executeTool(
    name: ToolName,
    input: unknown,
    context?: Partial<ToolContext>
  ): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    const executionContext = BaseTool.createContext(context);
    return await tool.execute(input, executionContext);
  }

  /**
   * Get tool definitions for MCP protocol
   */
  public getToolDefinitions(): any[] {
    return this.getAllTools().map(tool => tool.getTool());
  }

  /**
   * Get tool definition by name
   */
  public getToolDefinition(name: ToolName): any | undefined {
    const tool = this.getTool(name);
    return tool?.getTool();
  }

  /**
   * Validate tool input
   */
  public validateToolInput(name: ToolName, input: unknown): any {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    // Use the tool's validation method
    return (tool as any).validateInput(input);
  }
}

/**
 * Factory function to create a tool registry
 */
export function createToolRegistry(dependencies: ToolRegistryDependencies): ToolRegistry {
  return new ToolRegistry(dependencies);
}

/**
 * Utility function to get all tool definitions for MCP
 */
export function getAllToolDefinitions(): any[] {
  // Import tool definitions from MCP types
  const { AllTools } = require('../types/mcp');
  return AllTools;
}

/**
 * Type guard to check if a string is a valid tool name
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
 * Tool execution helper with error handling
 */
export async function executeToolSafely(
  registry: ToolRegistry,
  toolName: string,
  input: unknown,
  context?: Partial<ToolContext>
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  details?: any;
}> {
  try {
    if (!isValidToolName(toolName)) {
      return {
        success: false,
        error: 'InvalidToolName',
        details: `'${toolName}' is not a valid tool name`
      };
    }

    const result = await registry.executeTool(toolName, input, context);
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error(`Error executing tool '${toolName}':`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.name : 'UnknownError',
      details: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
}

/**
 * Get tool statistics
 */
export function getToolStatistics(registry: ToolRegistry): {
  totalTools: number;
  toolNames: ToolName[];
  toolDescriptions: Record<ToolName, string>;
} {
  const tools = registry.getAllTools();
  const toolNames = registry.getToolNames();
  
  const toolDescriptions: Record<ToolName, string> = {} as Record<ToolName, string>;
  tools.forEach(tool => {
    const name = tool.getName() as ToolName;
    toolDescriptions[name] = tool.getDescription();
  });

  return {
    totalTools: tools.length,
    toolNames,
    toolDescriptions
  };
}