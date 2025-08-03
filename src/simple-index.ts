#!/usr/bin/env node

/**
 * Simple MCP Server Entry Point
 * 
 * A working entry point that demonstrates the MCP server functionality
 * without complex tool dependencies.
 */

import { createSimpleMCPServer } from './server/SimpleMCPServer';

async function main(): Promise<void> {
  try {
    const config = {
      name: 'mcp-persistence-server',
      version: '1.0.0',
      databasePath: process.env.PERSISTENCE_DB_PATH || './conversations.db',
      debug: process.env.PERSISTENCE_DEBUG === 'true'
    };

    const server = createSimpleMCPServer(config);
    
    // Setup graceful shutdown
    const signals = ['SIGINT', 'SIGTERM'] as const;
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
    
  } catch (error) {
    console.error('[ERROR] Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('[ERROR] Unexpected error:', error);
    process.exit(1);
  });
}