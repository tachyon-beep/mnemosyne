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
import { createMCPServer } from './server/MCPServer.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
/**
 * Load configuration from environment variables
 */
function loadConfigFromEnvironment() {
    const config = {
        name: 'mcp-persistence-server',
        version: '1.0.0',
        databasePath: process.env.PERSISTENCE_DB_PATH || './conversations.db',
        logLevel: process.env.PERSISTENCE_LOG_LEVEL || 'info',
        maxDatabaseSizeMB: parseInt(process.env.PERSISTENCE_MAX_DB_SIZE_MB || '1000', 10),
        debug: process.env.PERSISTENCE_DEBUG === 'true' || process.env.NODE_ENV === 'development',
        toolTimeoutMs: parseInt(process.env.PERSISTENCE_TOOL_TIMEOUT_MS || '30000', 10)
    };
    return config;
}
/**
 * Validate configuration
 */
function validateConfig(config) {
    const errors = [];
    // Validate database path
    if (!config.databasePath) {
        errors.push('Database path is required');
    }
    // Validate max database size
    if (config.maxDatabaseSizeMB && (config.maxDatabaseSizeMB < 10 || config.maxDatabaseSizeMB > 10000)) {
        errors.push('Max database size must be between 10 and 10000 MB');
    }
    // Validate tool timeout
    if (config.toolTimeoutMs && (config.toolTimeoutMs < 1000 || config.toolTimeoutMs > 300000)) {
        errors.push('Tool timeout must be between 1000 and 300000 ms');
    }
    // Validate log level
    if (config.logLevel && !['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
        errors.push('Log level must be one of: debug, info, warn, error');
    }
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`);
    }
}
/**
 * Log configuration (without sensitive data)
 */
function logConfiguration(config) {
    console.log(`[INFO] Starting ${config.name} v${config.version}`);
    console.log(`[INFO] Configuration:`);
    console.log(`  - Database Path: ${config.databasePath}`);
    console.log(`  - Log Level: ${config.logLevel}`);
    console.log(`  - Max DB Size: ${config.maxDatabaseSizeMB} MB`);
    console.log(`  - Debug Mode: ${config.debug ? 'enabled' : 'disabled'}`);
    console.log(`  - Tool Timeout: ${config.toolTimeoutMs} ms`);
}
/**
 * Setup error handling for uncaught exceptions
 */
function setupErrorHandling() {
    process.on('uncaughtException', (error) => {
        console.error('[ERROR] Uncaught Exception:', error);
        process.exit(1);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('[ERROR] Unhandled Rejection at:', promise, 'reason:', reason);
        process.exit(1);
    });
}
/**
 * Handle command line arguments
 */
function handleCommandLineArgs() {
    const args = process.argv.slice(2);
    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
MCP Persistence Server

A Model Context Protocol server for conversation persistence and search.

Usage:
  node dist/index.js [options]

Options:
  -h, --help       Show this help message
  --version        Show version information
  --health-check   Perform a health check and exit

Environment Variables:
  PERSISTENCE_DB_PATH               Database file path (default: ./conversations.db)
  PERSISTENCE_LOG_LEVEL             Log level: debug|info|warn|error (default: info)
  PERSISTENCE_MAX_DB_SIZE_MB        Maximum database size in MB (default: 1000)
  PERSISTENCE_DEBUG                 Enable debug mode: true|false (default: false)
  PERSISTENCE_TOOL_TIMEOUT_MS       Tool execution timeout in ms (default: 30000)
  PERSISTENCE_EMBEDDINGS_ENABLED    Enable semantic search features: true|false (default: true)
  PERSISTENCE_EMBEDDINGS_BATCH_SIZE Batch size for embedding generation (default: 100)

Examples:
  node dist/index.js
  PERSISTENCE_DEBUG=true node dist/index.js
  PERSISTENCE_DB_PATH=/data/conversations.db node dist/index.js
`);
        process.exit(0);
    }
    if (args.includes('--version')) {
        try {
            const packageJsonPath = join(__dirname, '../package.json');
            const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
            console.log(`${packageJson.name} v${packageJson.version}`);
        }
        catch (error) {
            console.log('mcp-persistence-server v1.0.0');
        }
        process.exit(0);
    }
}
/**
 * Perform health check and exit
 */
async function performHealthCheck(server) {
    try {
        console.log('[INFO] Performing health check...');
        const health = await server.healthCheck();
        console.log(`[INFO] Health Status: ${health.status}`);
        console.log('[INFO] Component Status:');
        console.log(`  - Database: ${health.checks.database}`);
        console.log(`  - Tools: ${health.checks.tools}`);
        console.log(`  - Search: ${health.checks.search}`);
        if (health.error) {
            console.log(`[ERROR] Health Check Error: ${health.error}`);
        }
        process.exit(health.status === 'healthy' ? 0 : 1);
    }
    catch (error) {
        console.error('[ERROR] Health check failed:', error);
        process.exit(1);
    }
}
/**
 * Main function
 */
async function main() {
    try {
        // Handle command line arguments
        handleCommandLineArgs();
        // Setup error handling
        setupErrorHandling();
        // Load and validate configuration
        const config = loadConfigFromEnvironment();
        validateConfig(config);
        // Log configuration
        logConfiguration(config);
        // Create and start server
        const server = createMCPServer(config);
        // Handle health check argument
        if (process.argv.includes('--health-check')) {
            await server.start();
            await performHealthCheck(server);
            return;
        }
        // Start the server
        await server.start();
        // Log successful startup
        console.log('[INFO] MCP Persistence Server is running');
        console.log('[INFO] Listening for MCP requests on stdio...');
        // Keep the process alive
        process.stdin.resume();
    }
    catch (error) {
        console.error('[ERROR] Failed to start server:', error instanceof Error ? error.message : error);
        process.exit(1);
    }
}
/**
 * Handle startup in different environments
 */
// For ES modules, we can use import.meta.url to detect if this is the main module
const isMainModule = process.argv[1] && new URL(process.argv[1], 'file://').href === import.meta.url;
if (isMainModule) {
    // Only run main() if this file is executed directly
    main().catch(error => {
        console.error('[ERROR] Unexpected error in main():', error);
        process.exit(1);
    });
}
// Export functions for module use
export { main, loadConfigFromEnvironment, validateConfig, createMCPServer };
//# sourceMappingURL=index.js.map