/**
 * Core TypeScript interfaces for the MCP Persistence System
 * 
 * This file contains the fundamental data structures used throughout the system
 * for conversations, messages, search results, and configuration.
 */

/**
 * Represents a conversation containing multiple messages
 */
export interface Conversation {
  /** Unique identifier for the conversation */
  id: string;
  /** Timestamp when the conversation was created (Unix timestamp in milliseconds) */
  createdAt: number;
  /** Timestamp when the conversation was last updated (Unix timestamp in milliseconds) */
  updatedAt: number;
  /** Optional human-readable title for the conversation */
  title?: string;
  /** Additional metadata stored as key-value pairs */
  metadata: Record<string, any>;
}

/**
 * Represents a single message within a conversation
 */
export interface Message {
  /** Unique identifier for the message */
  id: string;
  /** ID of the conversation this message belongs to */
  conversationId: string;
  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';
  /** Content of the message */
  content: string;
  /** Timestamp when the message was created (Unix timestamp in milliseconds) */
  createdAt: number;
  /** ID of the parent message if this is a threaded response */
  parentMessageId?: string;
  /** Additional metadata stored as key-value pairs */
  metadata?: Record<string, any>;
  /** Optional embedding vector for semantic search (stored as array of numbers) */
  embedding?: number[];
}

/**
 * Represents search results from the search engine
 */
export interface SearchResult {
  /** The matching message */
  message: Message;
  /** Relevance score of the match */
  score: number;
  /** Text snippet with highlighted matches */
  snippet: string;
  /** Title of the conversation containing this message */
  conversationTitle?: string;
}

/**
 * Options for searching messages
 */
export interface SearchOptions {
  /** Search query string */
  query: string;
  /** Optional conversation ID to limit search scope */
  conversationId?: string;
  /** Maximum number of results to return */
  limit?: number;
  /** Number of results to skip (for pagination) */
  offset?: number;
  /** Start date for time-based filtering (ISO 8601 string) */
  startDate?: string;
  /** End date for time-based filtering (ISO 8601 string) */
  endDate?: string;
  /** Type of matching to perform */
  matchType?: 'fuzzy' | 'exact' | 'prefix';
  /** Start marker for highlighting matches in snippets */
  highlightStart?: string;
  /** End marker for highlighting matches in snippets */
  highlightEnd?: string;
}

/**
 * Result structure for paginated queries
 */
export interface PaginatedResult<T> {
  /** Array of data items */
  data: T[];
  /** Whether there are more results available */
  hasMore: boolean;
  /** Cursor for the next page (if applicable) */
  nextCursor?: string;
  /** Total count of items (if available) */
  totalCount?: number;
}

/**
 * Configuration for the persistence server
 */
export interface PersistenceServerConfig {
  /** Path to the SQLite database file */
  databasePath: string;
  /** Maximum database size in megabytes */
  maxDatabaseSizeMB: number;
  /** Maximum age of conversations in days before pruning */
  maxConversationAgeDays: number;
  /** Maximum number of messages per conversation */
  maxMessagesPerConversation: number;
  /** Whether to enable embedding generation for semantic search */
  enableEmbeddings: boolean;
  /** Model to use for generating embeddings (if enabled) */
  embeddingModel?: string;
  /** Whether to enable automatic conversation summarization */
  enableAutoSummarization: boolean;
  /** Interval for running VACUUM operations (in milliseconds) */
  vacuumInterval: number;
  /** Interval for WAL checkpoints (in milliseconds) */
  checkpointInterval: number;
  /** Whether to enable content encryption */
  encryptionEnabled: boolean;
  /** Default retention period in days */
  defaultRetentionDays: number;
  /** Log level for the server */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Encrypted data structure
 */
export interface EncryptedData {
  /** Base64-encoded encrypted content */
  encrypted: string;
  /** Base64-encoded initialization vector */
  iv: string;
  /** Base64-encoded authentication tag */
  tag: string;
}

/**
 * Database statistics
 */
export interface DatabaseStats {
  /** Total number of conversations */
  conversationCount: number;
  /** Total number of messages */
  messageCount: number;
  /** Database size in bytes */
  databaseSizeBytes: number;
  /** Oldest conversation timestamp */
  oldestConversation?: number;
  /** Newest conversation timestamp */
  newestConversation?: number;
  /** Index of the last message processed for embeddings */
  lastEmbeddingIndex?: number;
}

/**
 * Export format options
 */
export type ExportFormat = 'json' | 'markdown' | 'csv';

/**
 * Export request parameters
 */
export interface ExportRequest {
  /** Format for the export */
  format: ExportFormat;
  /** Optional conversation IDs to include (if not specified, exports all) */
  conversationIds?: string[];
  /** Start date for filtering conversations */
  startDate?: string;
  /** End date for filtering conversations */
  endDate?: string;
  /** Whether to include message metadata in the export */
  includeMetadata?: boolean;
}

/**
 * State management key-value pairs
 */
export interface PersistenceState {
  /** The state key */
  key: string;
  /** The state value (JSON string) */
  value: string;
  /** Timestamp when the state was last updated */
  updatedAt: number;
}

/**
 * Connection pool configuration
 */
export interface ConnectionPoolConfig {
  /** Database file path */
  path: string;
  /** Maximum number of connections in the pool */
  max: number;
  /** Idle timeout in milliseconds */
  idleTimeoutMillis: number;
  /** Acquire timeout in milliseconds */
  acquireTimeoutMillis: number;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  /** Whether the operation was successful */
  success: false;
  /** Error type/category */
  error: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details */
  details?: any;
  /** Error timestamp */
  timestamp?: number;
  /** Request ID for tracing */
  requestId?: string;
  /** Error ID for tracking */
  errorId?: string;
  /** Stack trace for debugging */
  stack?: string;
}

/**
 * Success response structure
 */
export interface SuccessResponse<T = any> {
  /** Whether the operation was successful */
  success: true;
  /** Response data */
  data?: T;
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Generic response type
 */
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;