/**
 * Server Module - Export barrel
 *
 * This module provides all server-related classes and utilities for the
 * MCP Persistence System server implementation.
 */
// Main server class and factory
export { MCPServer, createMCPServer, ServerStatus } from './MCPServer.js';
// Simple server for demonstration
export { SimpleMCPServer, createSimpleMCPServer } from './SimpleMCPServer.js';
// Tool registry for server
export { ToolRegistry, createToolRegistry, isValidToolName, createServerToolContext } from './ToolRegistry.js';
import { createMCPServer, ServerStatus } from './MCPServer.js';
/**
 * Server factory function with full dependency injection
 */
export async function createMCPServerWithDependencies(config) {
    const server = createMCPServer(config);
    return server;
}
/**
 * Utility to check if server is in a running state
 */
export function isServerRunning(status) {
    return status === ServerStatus.RUNNING;
}
/**
 * Utility to check if server is in an error state
 */
export function isServerInError(status) {
    return status === ServerStatus.ERROR;
}
/**
 * Utility to check if server can be started
 */
export function canStartServer(status) {
    return status === ServerStatus.STOPPED;
}
/**
 * Utility to check if server can be stopped
 */
export function canStopServer(status) {
    return status === ServerStatus.RUNNING || status === ServerStatus.ERROR;
}
//# sourceMappingURL=index.js.map