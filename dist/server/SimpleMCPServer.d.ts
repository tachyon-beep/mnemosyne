/**
 * Simple MCP Server - Minimal working implementation
 *
 * This is a simplified version of the MCP server that demonstrates
 * the core functionality without complex tool dependencies.
 */
import { PersistenceServerConfig } from '../types/index.js';
/**
 * Simple server configuration
 */
export interface SimpleMCPServerConfig extends Partial<PersistenceServerConfig> {
    name?: string;
    version?: string;
    debug?: boolean;
}
/**
 * Simple MCP Server implementation
 */
export declare class SimpleMCPServer {
    private server;
    private transport;
    private database;
    private config;
    private startTime;
    constructor(config?: SimpleMCPServerConfig);
    start(): Promise<void>;
    stop(): Promise<void>;
    private setupHandlers;
}
export declare function createSimpleMCPServer(config?: SimpleMCPServerConfig): SimpleMCPServer;
//# sourceMappingURL=SimpleMCPServer.d.ts.map