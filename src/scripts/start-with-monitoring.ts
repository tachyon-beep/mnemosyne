#!/usr/bin/env tsx

/**
 * Startup Script with Production Monitoring
 * 
 * Demonstrates how to start the MCP Persistence Server with comprehensive
 * production monitoring enabled. Shows integration of all monitoring
 * components for a production-ready deployment.
 */

import { DatabaseManager } from '../storage/Database.js';
import { MCPServer } from '../server/MCPServer.js';
import { getProductionConfig, generateStartupReport } from '../config/ProductionConfig.js';
import { setupProductionMonitoring, HealthCheckUtils } from '../monitoring/index.js';

interface StartupOptions {
  enableDashboard: boolean;
  enableEndpoints: boolean;
  monitoringPort: number;
  enableRegressionDetection: boolean;
  authToken?: string;
}

async function startServerWithMonitoring(options: StartupOptions = {
  enableDashboard: true,
  enableEndpoints: true,
  monitoringPort: 9090,
  enableRegressionDetection: true
}) {
  console.log('🚀 Starting MCP Persistence Server with Production Monitoring...\n');
  
  try {
    // Load configuration
    const config = getProductionConfig();
    console.log(generateStartupReport(config));
    console.log();

    // Initialize database
    console.log('📊 Initializing database...');
    const dbManager = new DatabaseManager(config.database);
    await dbManager.initialize();
    console.log('✅ Database initialized\n');

    // Setup monitoring system
    console.log('📈 Setting up monitoring system...');
    const monitoring = await setupProductionMonitoring(dbManager, config, {
      enableEndpoints: options.enableEndpoints,
      endpointsPort: options.monitoringPort,
      enableDashboard: options.enableDashboard,
      enableRegressionDetection: options.enableRegressionDetection,
      authToken: options.authToken || process.env.MONITORING_AUTH_TOKEN,
      autoStart: true
    });
    console.log('✅ Monitoring system initialized\n');

    // Initialize MCP Server
    console.log('🌐 Initializing MCP server...');
    const mcpServer = new MCPServer(dbManager);
    
    // Add monitoring to MCP server operations
    instrumentMCPServer(mcpServer, monitoring);
    
    console.log('✅ MCP server initialized\n');

    // Start server
    console.log('🎯 Starting services...');
    await mcpServer.start();
    console.log(`✅ MCP server started on stdio transport`);
    
    if (options.enableEndpoints) {
      console.log(`📡 Monitoring endpoints available on http://localhost:${options.monitoringPort}`);
      console.log('   Health check: /health');
      console.log('   Detailed health: /health/detailed');
      console.log('   Metrics: /metrics');
      console.log('   Alerts: /alerts');
    }
    
    if (options.enableDashboard) {
      console.log('🖥️  Console dashboard is running (press Ctrl+C to exit)');
    }
    
    console.log('\n🎉 All systems operational!\n');

    // Perform initial health check
    const healthStatus = await HealthCheckUtils.quickHealthCheck(monitoring);
    console.log(`System Health: ${healthStatus.status.toUpperCase()}`);
    console.log(`System Uptime: ${Math.floor(healthStatus.uptime / 1000)}s\n`);

    // Setup graceful shutdown
    setupGracefulShutdown(mcpServer, monitoring);

    // Keep process alive
    await new Promise(() => {}); // Run forever

  } catch (error) {
    console.error('❌ Failed to start server with monitoring:', error);
    process.exit(1);
  }
}

/**
 * Instrument MCP server with monitoring
 */
function instrumentMCPServer(mcpServer: MCPServer, monitoring: any): void {
  // Monitor MCP tool calls
  mcpServer.on('tool:called', (toolName: string, duration: number, success: boolean) => {
    monitoring.recordMetric('mcp', `tool_${toolName}`, duration, {
      success: success.toString()
    });

    if (!success) {
      monitoring.createAlert('medium', 'mcp', `Tool call failed: ${toolName}`);
    }
  });

  // Monitor resource usage
  mcpServer.on('resource:listed', (resourceType: string, count: number, duration: number) => {
    monitoring.recordMetric('mcp', `resource_list_${resourceType}`, duration, {
      count: count.toString()
    });
  });

  // Monitor server errors
  mcpServer.on('error', async (error: Error) => {
    await monitoring.createAlert('high', 'mcp', `Server error: ${error.message}`, {
      stack: error.stack,
      name: error.name
    });
  });

  console.log('🔗 MCP server instrumented with monitoring');
}

/**
 * Setup graceful shutdown handling
 */
function setupGracefulShutdown(mcpServer: MCPServer, monitoring: any): void {
  const shutdown = async (signal: string) => {
    console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
    
    try {
      // Stop MCP server first
      console.log('Stopping MCP server...');
      await mcpServer.stop();
      
      // Stop monitoring system
      console.log('Stopping monitoring system...');
      await monitoring.stopMonitoring();
      
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('uncaughtException', async (error) => {
    console.error('💥 Uncaught exception:', error);
    
    try {
      await monitoring.createAlert('critical', 'system', `Uncaught exception: ${error.message}`, {
        stack: error.stack,
        name: error.name
      });
    } catch (alertError) {
      console.error('Failed to create alert for uncaught exception');
    }
    
    process.exit(1);
  });
  
  process.on('unhandledRejection', async (reason, promise) => {
    console.error('💥 Unhandled rejection at:', promise, 'reason:', reason);
    
    try {
      await monitoring.createAlert('critical', 'system', `Unhandled rejection: ${reason}`, {
        promise: promise.toString()
      });
    } catch (alertError) {
      console.error('Failed to create alert for unhandled rejection');
    }
    
    process.exit(1);
  });
}

// Parse command line arguments
function parseArgs(): StartupOptions {
  const args = process.argv.slice(2);
  const options: StartupOptions = {
    enableDashboard: true,
    enableEndpoints: true,
    monitoringPort: 9090,
    enableRegressionDetection: true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--no-dashboard':
        options.enableDashboard = false;
        break;
      case '--no-endpoints':
        options.enableEndpoints = false;
        break;
      case '--no-regression':
        options.enableRegressionDetection = false;
        break;
      case '--monitoring-port':
        options.monitoringPort = parseInt(args[++i], 10) || 9090;
        break;
      case '--auth-token':
        options.authToken = args[++i];
        break;
      case '--help':
        console.log(`
MCP Persistence Server with Production Monitoring

Usage: tsx start-with-monitoring.ts [options]

Options:
  --no-dashboard           Disable console dashboard
  --no-endpoints           Disable HTTP monitoring endpoints  
  --no-regression          Disable performance regression detection
  --monitoring-port <port> Port for monitoring endpoints (default: 9090)
  --auth-token <token>     Authentication token for monitoring endpoints
  --help                   Show this help message

Environment Variables:
  NODE_ENV                 Environment (development, production, staging)
  DEPLOYMENT_SIZE          Deployment size (small, medium, large)
  MONITORING_AUTH_TOKEN    Authentication token for monitoring endpoints
  
Examples:
  tsx start-with-monitoring.ts
  tsx start-with-monitoring.ts --monitoring-port 8080 --no-dashboard
  tsx start-with-monitoring.ts --auth-token secret123
`);
        process.exit(0);
        break;
    }
  }

  return options;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const options = parseArgs();
  startServerWithMonitoring(options).catch(console.error);
}

export { startServerWithMonitoring };