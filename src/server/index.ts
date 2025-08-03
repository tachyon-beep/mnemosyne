/**
 * Server Module - Export barrel
 * 
 * This module provides all server-related classes and utilities for the
 * MCP Persistence System server implementation.
 */

// Main server class and factory
export { MCPServer, createMCPServer, ServerStatus } from './MCPServer';
export type { 
  MCPServerConfig, 
  HealthCheckResult
} from './MCPServer';
export type { 
  MCPServerConfig as ServerConfig, 
  HealthCheckResult as HealthCheck 
} from './MCPServer';

// Simple server for demonstration
export { SimpleMCPServer, createSimpleMCPServer } from './SimpleMCPServer';
export type { SimpleMCPServerConfig } from './SimpleMCPServer';

// Tool registry for server
export { ToolRegistry, createToolRegistry, isValidToolName, createServerToolContext } from './ToolRegistry';
export type { 
  ToolRegistryDependencies, 
  ServerToolContext, 
  ToolExecutionResult 
} from './ToolRegistry';

// Re-export commonly used types from other modules for convenience
export type { PersistenceServerConfig } from '../types';
export type { ToolName, MCPTool, MCPToolResult } from '../types/mcp';

import { MCPServer, MCPServerConfig, createMCPServer, ServerStatus } from './MCPServer';

/**
 * Server factory function with full dependency injection
 */
export async function createMCPServerWithDependencies(config?: MCPServerConfig): Promise<MCPServer> {
  const server = createMCPServer(config);
  return server;
}

/**
 * Utility to check if server is in a running state
 */
export function isServerRunning(status: ServerStatus): boolean {
  return status === ServerStatus.RUNNING;
}

/**
 * Utility to check if server is in an error state
 */
export function isServerInError(status: ServerStatus): boolean {
  return status === ServerStatus.ERROR;
}

/**
 * Utility to check if server can be started
 */
export function canStartServer(status: ServerStatus): boolean {
  return status === ServerStatus.STOPPED;
}

/**
 * Utility to check if server can be stopped
 */
export function canStopServer(status: ServerStatus): boolean {
  return status === ServerStatus.RUNNING || status === ServerStatus.ERROR;
}