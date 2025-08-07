#!/usr/bin/env node
/**
 * Simple MCP Server Entry Point
 *
 * A working entry point that demonstrates the MCP server functionality
 * without complex tool dependencies.
 */
import { createSimpleMCPServer } from './server/SimpleMCPServer.js';
async function main() {
    try {
        const config = {
            name: 'mcp-persistence-server',
            version: '1.0.0',
            databasePath: process.env.PERSISTENCE_DB_PATH || './conversations.db',
            debug: process.env.PERSISTENCE_DEBUG === 'true'
        };
        const server = createSimpleMCPServer(config);
        // Setup graceful shutdown
        const signals = ['SIGINT', 'SIGTERM'];
        signals.forEach(signal => {
            process.on(signal, async () => {
                console.log(`\n[INFO] Received ${signal}, shutting down...`);
                await server.stop();
                process.exit(0);
            });
        });
        await server.start();
        // Keep process alive
        process.stdin.resume();
    }
    catch (error) {
        console.error('[ERROR] Failed to start server:', error);
        process.exit(1);
    }
}
// For ES modules, we can use import.meta.url to detect if this is the main module
const isMainModule = process.argv[1] && new URL(process.argv[1], 'file://').href === import.meta.url;
if (isMainModule) {
    main().catch(error => {
        console.error('[ERROR] Unexpected error:', error);
        process.exit(1);
    });
}
// Export main function for module use
export { main };
//# sourceMappingURL=simple-index.js.map