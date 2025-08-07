#!/usr/bin/env node
/**
 * MCP Persistence Server - Main Entry Point
 *
 * This is the main entry point for the MCP (Model Context Protocol) Persistence Server.
 * It initializes and starts the server with proper configuration, error handling,
 * and environment variable support.
 *
 * Environment Variables:
 * - PERSISTENCE_DB_PATH: Database file path (default: ./conversations.db)
 * - PERSISTENCE_LOG_LEVEL: Logging level (default: info)
 * - PERSISTENCE_MAX_DB_SIZE_MB: Maximum database size in MB (default: 1000)
 * - PERSISTENCE_DEBUG: Enable debug mode (default: false)
 * - PERSISTENCE_TOOL_TIMEOUT_MS: Tool execution timeout in ms (default: 30000)
 * - PERSISTENCE_EMBEDDINGS_ENABLED: Enable semantic search features (default: true)
 * - PERSISTENCE_EMBEDDINGS_BATCH_SIZE: Batch size for embedding generation (default: 100)
 *
 * Usage:
 *   node dist/index.js                    # Start server with default config
 *   PERSISTENCE_DEBUG=true node dist/index.js   # Start with debug logging
 */
import { MCPServerConfig, createMCPServer } from './server/MCPServer.js';
/**
 * Load configuration from environment variables
 */
declare function loadConfigFromEnvironment(): MCPServerConfig;
/**
 * Validate configuration
 */
declare function validateConfig(config: MCPServerConfig): void;
/**
 * Main function
 */
declare function main(): Promise<void>;
export { main, loadConfigFromEnvironment, validateConfig, createMCPServer };
//# sourceMappingURL=index.d.ts.map