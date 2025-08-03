/**
 * MCP (Model Context Protocol) related types for the persistence system
 * 
 * This file contains types specific to MCP protocol implementation,
 * tool definitions, and server capabilities.
 */

import { z } from 'zod';

/**
 * MCP Tool definition structure
 */
export interface MCPTool {
  /** Name of the tool */
  name: string;
  /** Human-readable description of what the tool does */
  description: string;
  /** JSON schema for the tool's input parameters */
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

/**
 * MCP Tool result content types
 */
export type MCPContentType = 'text' | 'image' | 'resource';

/**
 * MCP Tool result content item
 */
export interface MCPContent {
  /** Type of content */
  type: MCPContentType;
  /** Text content (for text type) */
  text?: string;
  /** Image data (for image type) */
  data?: string;
  /** MIME type (for image/resource types) */
  mimeType?: string;
  /** Resource URI (for resource type) */
  uri?: string;
}

/**
 * MCP Tool execution result
 */
export interface MCPToolResult {
  /** Array of content items returned by the tool */
  content: MCPContent[];
  /** Whether the tool execution was successful */
  isError?: boolean;
}

/**
 * MCP Server capabilities
 */
export interface MCPServerCapabilities {
  /** Supported tools */
  tools?: Record<string, any>;
  /** Supported resources */
  resources?: Record<string, any>;
  /** Supported prompts */
  prompts?: Record<string, any>;
  /** Experimental features */
  experimental?: Record<string, any>;
}

/**
 * MCP Server information
 */
export interface MCPServerInfo {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Server capabilities */
  capabilities: MCPServerCapabilities;
  /** Additional server metadata */
  metadata?: Record<string, any>;
}

/**
 * MCP JSON-RPC request structure
 */
export interface MCPRequest {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: '2.0';
  /** Unique request identifier */
  id: string | number;
  /** Method name */
  method: string;
  /** Method parameters */
  params?: any;
}

/**
 * MCP JSON-RPC response structure
 */
export interface MCPResponse {
  /** JSON-RPC version (always "2.0") */
  jsonrpc: '2.0';
  /** Request identifier */
  id: string | number;
  /** Response result (if successful) */
  result?: any;
  /** Error information (if failed) */
  error?: MCPError;
}

/**
 * MCP Error structure
 */
export interface MCPError {
  /** Error code */
  code: number;
  /** Error message */
  message: string;
  /** Additional error data */
  data?: any;
}

/**
 * Standard MCP error codes
 */
export enum MCPErrorCode {
  // JSON-RPC standard errors
  PARSE_ERROR = -32700,
  INVALID_REQUEST = -32600,
  METHOD_NOT_FOUND = -32601,
  INVALID_PARAMS = -32602,
  INTERNAL_ERROR = -32603,
  
  // MCP-specific errors
  TOOL_NOT_FOUND = -32000,
  TOOL_EXECUTION_ERROR = -32001,
  RESOURCE_NOT_FOUND = -32002,
  RESOURCE_ACCESS_ERROR = -32003,
  PROMPT_NOT_FOUND = -32004,
  PROMPT_EXECUTION_ERROR = -32005
}

/**
 * Tool definition for save_message
 */
export const SaveMessageTool: MCPTool = {
  name: 'save_message',
  description: 'Save a message to conversation history. Creates a new conversation if none specified.',
  inputSchema: {
    type: 'object',
    properties: {
      conversationId: {
        type: 'string',
        description: 'Optional conversation ID. If not provided, creates a new conversation.'
      },
      role: {
        type: 'string',
        enum: ['user', 'assistant', 'system'],
        description: 'Role of the message sender'
      },
      content: {
        type: 'string',
        description: 'Content of the message',
        minLength: 1
      },
      parentMessageId: {
        type: 'string',
        description: 'Optional parent message ID for threading'
      },
      metadata: {
        type: 'object',
        description: 'Optional metadata as key-value pairs',
        additionalProperties: true
      }
    },
    required: ['role', 'content'],
    additionalProperties: false
  }
};

/**
 * Tool definition for search_messages
 */
export const SearchMessagesTool: MCPTool = {
  name: 'search_messages',
  description: 'Search through conversation history using full-text search with optional filters.',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query string',
        minLength: 1
      },
      conversationId: {
        type: 'string',
        description: 'Optional conversation ID to limit search scope'
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results to return',
        minimum: 1,
        maximum: 100,
        default: 20
      },
      offset: {
        type: 'number',
        description: 'Number of results to skip for pagination',
        minimum: 0,
        default: 0
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Start date for time-based filtering (ISO 8601)'
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'End date for time-based filtering (ISO 8601)'
      },
      matchType: {
        type: 'string',
        enum: ['fuzzy', 'exact', 'prefix'],
        default: 'fuzzy',
        description: 'Type of matching to perform'
      }
    },
    required: ['query'],
    additionalProperties: false
  }
};

/**
 * Tool definition for get_conversation
 */
export const GetConversationTool: MCPTool = {
  name: 'get_conversation',
  description: 'Retrieve a specific conversation with its messages.',
  inputSchema: {
    type: 'object',
    properties: {
      conversationId: {
        type: 'string',
        description: 'ID of the conversation to retrieve',
        minLength: 1
      },
      includeMessages: {
        type: 'boolean',
        description: 'Whether to include messages in the response',
        default: true
      },
      messageLimit: {
        type: 'number',
        description: 'Maximum number of messages to return',
        minimum: 1,
        maximum: 1000,
        default: 100
      },
      beforeMessageId: {
        type: 'string',
        description: 'Return messages before this message ID (for pagination)'
      },
      afterMessageId: {
        type: 'string',
        description: 'Return messages after this message ID (for pagination)'
      }
    },
    required: ['conversationId'],
    additionalProperties: false
  }
};

/**
 * Tool definition for get_conversations
 */
export const GetConversationsTool: MCPTool = {
  name: 'get_conversations',
  description: 'List conversations with optional filtering and pagination.',
  inputSchema: {
    type: 'object',
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of conversations to return',
        minimum: 1,
        maximum: 100,
        default: 20
      },
      offset: {
        type: 'number',
        description: 'Number of conversations to skip for pagination',
        minimum: 0,
        default: 0
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Start date for filtering conversations'
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'End date for filtering conversations'
      },
      includeMessageCounts: {
        type: 'boolean',
        description: 'Whether to include message counts for each conversation',
        default: false
      }
    },
    required: [],
    additionalProperties: false
  }
};

/**
 * Tool definition for delete_conversation
 */
export const DeleteConversationTool: MCPTool = {
  name: 'delete_conversation',
  description: 'Delete a conversation and all its messages.',
  inputSchema: {
    type: 'object',
    properties: {
      conversationId: {
        type: 'string',
        description: 'ID of the conversation to delete',
        minLength: 1
      },
      permanent: {
        type: 'boolean',
        description: 'Whether to permanently delete (vs soft delete)',
        default: false
      }
    },
    required: ['conversationId'],
    additionalProperties: false
  }
};

/**
 * Tool definition for export_conversations
 */
export const ExportConversationsTool: MCPTool = {
  name: 'export_conversations',
  description: 'Export conversations to various formats (JSON, Markdown, CSV).',
  inputSchema: {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['json', 'markdown', 'csv'],
        default: 'json',
        description: 'Format for the export'
      },
      conversationIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional conversation IDs to include (if not specified, exports all)'
      },
      startDate: {
        type: 'string',
        format: 'date-time',
        description: 'Start date for filtering conversations'
      },
      endDate: {
        type: 'string',
        format: 'date-time',
        description: 'End date for filtering conversations'
      },
      includeMetadata: {
        type: 'boolean',
        description: 'Whether to include message metadata in the export',
        default: true
      }
    },
    required: [],
    additionalProperties: false
  }
};

/**
 * Tool definition for get_database_stats
 */
export const GetDatabaseStatsTool: MCPTool = {
  name: 'get_database_stats',
  description: 'Get statistics about the conversation database.',
  inputSchema: {
    type: 'object',
    properties: {
      includeDetails: {
        type: 'boolean',
        description: 'Whether to include detailed breakdown by conversation',
        default: false
      }
    },
    required: [],
    additionalProperties: false
  }
};

/**
 * All available tools in the persistence system
 */
export const AllTools: MCPTool[] = [
  SaveMessageTool,
  SearchMessagesTool,
  GetConversationTool,
  GetConversationsTool,
  DeleteConversationTool,
  ExportConversationsTool,
  GetDatabaseStatsTool
];

/**
 * Tool name type for type safety
 */
export type ToolName = 
  | 'save_message'
  | 'search_messages'
  | 'get_conversation'
  | 'get_conversations'
  | 'delete_conversation'
  | 'export_conversations'
  | 'get_database_stats';

/**
 * MCP transport types
 */
export type MCPTransportType = 'stdio' | 'http' | 'websocket';

/**
 * MCP transport configuration
 */
export interface MCPTransportConfig {
  /** Type of transport to use */
  type: MCPTransportType;
  /** Additional transport-specific options */
  options?: Record<string, any>;
}

/**
 * Validation schema for MCP requests
 */
export const MCPRequestSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  method: z.string(),
  params: z.any().optional()
});

/**
 * Validation schema for MCP responses
 */
export const MCPResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.union([z.string(), z.number()]),
  result: z.any().optional(),
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.any().optional()
  }).optional()
});

export type MCPRequestType = z.infer<typeof MCPRequestSchema>;
export type MCPResponseType = z.infer<typeof MCPResponseSchema>;