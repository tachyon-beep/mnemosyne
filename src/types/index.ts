/**
 * Export barrel file for all types in the MCP Persistence System
 * 
 * This file re-exports all types, interfaces, and schemas from the types module
 * to provide a single import point for consumers.
 */

// Core interfaces
export type {
  Conversation,
  Message,
  SearchResult,
  SearchOptions,
  PaginatedResult,
  PersistenceServerConfig,
  EncryptedData,
  DatabaseStats,
  ExportFormat,
  ExportRequest,
  PersistenceState,
  ConnectionPoolConfig,
  ErrorResponse,
  SuccessResponse,
  ApiResponse
} from './interfaces.js';

// Zod schemas and their inferred types
export {
  // Enum schemas
  MessageRoleSchema,
  ExportFormatSchema,
  MatchTypeSchema,
  LogLevelSchema,
  
  // Tool input schemas
  SaveMessageSchema,
  SearchMessagesSchema,
  GetConversationSchema,
  GetConversationsSchema,
  DeleteConversationSchema,
  DeleteMessageSchema,
  UpdateConversationSchema,
  UpdateMessageSchema,
  ExportConversationsSchema,
  ImportConversationsSchema,
  GetDatabaseStatsSchema,
  OptimizeDatabaseSchema,
  SetRetentionPolicySchema,
  GenerateEmbeddingsSchema,
  
  // Data structure schemas
  ConversationDataSchema,
  PersistenceServerConfigSchema,
  
  // Union schemas
  ToolInputSchema
} from './schemas.js';

// Inferred types from schemas
export type {
  SaveMessageInput,
  SearchMessagesInput,
  GetConversationInput,
  GetConversationsInput,
  DeleteConversationInput,
  DeleteMessageInput,
  UpdateConversationInput,
  UpdateMessageInput,
  ExportConversationsInput,
  ImportConversationsInput,
  GetDatabaseStatsInput,
  OptimizeDatabaseInput,
  SetRetentionPolicyInput,
  GenerateEmbeddingsInput,
  ConversationData,
  PersistenceServerConfigInput,
  ToolInput
} from './schemas.js';

// MCP protocol types
export type {
  MCPTool,
  MCPContentType,
  MCPContent,
  MCPToolResult,
  MCPServerCapabilities,
  MCPServerInfo,
  MCPRequest,
  MCPResponse,
  MCPError,
  ToolName,
  MCPTransportType,
  MCPTransportConfig,
  MCPRequestType,
  MCPResponseType
} from './mcp.js';

// MCP constants and tools
export {
  MCPErrorCode,
  SaveMessageTool,
  SearchMessagesTool,
  GetConversationTool,
  GetConversationsTool,
  DeleteConversationTool,
  ExportConversationsTool,
  GetDatabaseStatsTool,
  AllTools,
  MCPRequestSchema,
  MCPResponseSchema
} from './mcp.js';