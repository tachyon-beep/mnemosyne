/**
 * Configure LLM Provider Tool
 *
 * MCP tool for managing LLM provider configurations at runtime. This tool provides
 * full CRUD operations for LLM providers used in context generation and summarization.
 */
import { BaseTool, ToolContext } from './BaseTool.js';
import { ConfigureLLMProviderInput } from '../types/schemas.js';
import { ProviderConfigRepository } from '../storage/repositories/ProviderConfigRepository.js';
/**
 * Dependencies required by ConfigureLLMProviderTool
 */
export interface ConfigureLLMProviderDependencies {
    providerConfigRepository: ProviderConfigRepository;
}
/**
 * Response format for configure_llm_provider tool
 */
export interface ConfigureLLMProviderResponse {
    /** The operation that was performed */
    operation: 'add' | 'update' | 'remove' | 'list';
    /** Whether the operation was successful */
    success: boolean;
    /** For single provider operations, the affected provider */
    provider?: {
        id: string;
        name: string;
        type: 'local' | 'external';
        endpoint?: string;
        modelName: string;
        maxTokens: number;
        temperature: number;
        isActive: boolean;
        priority: number;
        costPer1kTokens?: number;
        metadata: Record<string, any>;
    };
    /** For list operations, all providers */
    providers?: Array<{
        id: string;
        name: string;
        type: 'local' | 'external';
        endpoint?: string;
        modelName: string;
        maxTokens: number;
        temperature: number;
        isActive: boolean;
        priority: number;
        costPer1kTokens?: number;
        metadata: Record<string, any>;
    }>;
    /** Provider statistics */
    statistics?: {
        total: number;
        active: number;
        local: number;
        external: number;
    };
    /** Informational message */
    message: string;
}
/**
 * Configure LLM Provider Tool implementation
 */
export declare class ConfigureLLMProviderTool extends BaseTool<ConfigureLLMProviderInput, ConfigureLLMProviderResponse> {
    private providerConfigRepository;
    constructor(dependencies: ConfigureLLMProviderDependencies);
    /**
     * Execute the tool implementation
     */
    protected executeImpl(params: ConfigureLLMProviderInput, _context: ToolContext): Promise<ConfigureLLMProviderResponse>;
    /**
     * Handle adding a new provider
     */
    private handleAddProvider;
    /**
     * Handle updating an existing provider
     */
    private handleUpdateProvider;
    /**
     * Handle removing a provider
     */
    private handleRemoveProvider;
    /**
     * Handle listing all providers
     */
    private handleListProviders;
    /**
     * Format provider for response
     */
    private formatProvider;
    /**
     * Factory method to create the tool
     */
    static create(dependencies: ConfigureLLMProviderDependencies): ConfigureLLMProviderTool;
}
//# sourceMappingURL=ConfigureLLMProviderTool.d.ts.map