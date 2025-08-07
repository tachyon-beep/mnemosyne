/**
 * Server Module - Export barrel
 *
 * This module provides all server-related classes and utilities for the
 * MCP Persistence System server implementation.
 */
export { MCPServer, createMCPServer, ServerStatus } from './MCPServer.js';
export type { MCPServerConfig, HealthCheckResult } from './MCPServer.js';
export type { MCPServerConfig as ServerConfig, HealthCheckResult as HealthCheck } from './MCPServer.js';
export { SimpleMCPServer, createSimpleMCPServer } from './SimpleMCPServer.js';
export type { SimpleMCPServerConfig } from './SimpleMCPServer.js';
export { ToolRegistry, createToolRegistry, isValidToolName, createServerToolContext } from './ToolRegistry.js';
export type { ToolRegistryDependencies, ServerToolContext, ToolExecutionResult } from './ToolRegistry.js';
export type { PersistenceServerConfig } from '../types/index.js';
export type { ToolName, MCPTool, MCPToolResult } from '../types/mcp.js';
import { MCPServer, MCPServerConfig, ServerStatus } from './MCPServer.js';
/**
 * Server factory function with full dependency injection
 */
export declare function createMCPServerWithDependencies(config?: MCPServerConfig): Promise<MCPServer>;
/**
 * Utility to check if server is in a running state
 */
export declare function isServerRunning(status: ServerStatus): boolean;
/**
 * Utility to check if server is in an error state
 */
export declare function isServerInError(status: ServerStatus): boolean;
/**
 * Utility to check if server can be started
 */
export declare function canStartServer(status: ServerStatus): boolean;
/**
 * Utility to check if server can be stopped
 */
export declare function canStopServer(status: ServerStatus): boolean;
//# sourceMappingURL=index.d.ts.map