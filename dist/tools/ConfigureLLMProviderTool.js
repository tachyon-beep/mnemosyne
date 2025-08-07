/**
 * Configure LLM Provider Tool
 *
 * MCP tool for managing LLM provider configurations at runtime. This tool provides
 * full CRUD operations for LLM providers used in context generation and summarization.
 */
import { BaseTool, wrapDatabaseOperation, ValidationError, NotFoundError } from './BaseTool.js';
import { ConfigureLLMProviderSchema } from '../types/schemas.js';
/**
 * Configure LLM Provider Tool implementation
 */
export class ConfigureLLMProviderTool extends BaseTool {
    providerConfigRepository;
    constructor(dependencies) {
        const tool = {
            name: 'configure_llm_provider',
            description: 'Manage LLM provider configurations at runtime for context generation and summarization.',
            inputSchema: {
                type: 'object',
                properties: {
                    operation: {
                        type: 'string',
                        enum: ['add', 'update', 'remove', 'list'],
                        description: 'Operation to perform on provider configurations'
                    },
                    config: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                description: 'Provider ID (required for update/remove operations)'
                            },
                            name: {
                                type: 'string',
                                minLength: 1,
                                description: 'Provider name'
                            },
                            type: {
                                type: 'string',
                                enum: ['local', 'external'],
                                description: 'Provider type'
                            },
                            endpoint: {
                                type: 'string',
                                format: 'uri',
                                description: 'API endpoint URL'
                            },
                            apiKeyEnv: {
                                type: 'string',
                                description: 'Environment variable name for API key'
                            },
                            modelName: {
                                type: 'string',
                                minLength: 1,
                                description: 'Model name to use'
                            },
                            maxTokens: {
                                type: 'number',
                                minimum: 1,
                                description: 'Maximum tokens for the model'
                            },
                            temperature: {
                                type: 'number',
                                minimum: 0,
                                maximum: 2,
                                description: 'Temperature setting (0-2)'
                            },
                            isActive: {
                                type: 'boolean',
                                description: 'Whether the provider is active'
                            },
                            priority: {
                                type: 'number',
                                description: 'Priority for provider selection (higher = preferred)'
                            },
                            costPer1kTokens: {
                                type: 'number',
                                minimum: 0,
                                description: 'Cost per 1000 tokens'
                            },
                            metadata: {
                                type: 'object',
                                description: 'Additional metadata',
                                additionalProperties: true
                            }
                        },
                        additionalProperties: false,
                        description: 'Provider configuration (required for add/update operations)'
                    }
                },
                required: ['operation'],
                additionalProperties: false
            }
        };
        super(tool, ConfigureLLMProviderSchema);
        this.providerConfigRepository = dependencies.providerConfigRepository;
    }
    /**
     * Execute the tool implementation
     */
    async executeImpl(params, _context) {
        return await wrapDatabaseOperation(async () => {
            switch (params.operation) {
                case 'add':
                    return await this.handleAddProvider(params);
                case 'update':
                    return await this.handleUpdateProvider(params);
                case 'remove':
                    return await this.handleRemoveProvider(params);
                case 'list':
                    return await this.handleListProviders(params);
                default:
                    throw new ValidationError(`Unknown operation: ${params.operation}`);
            }
        }, 'Failed to configure LLM provider');
    }
    /**
     * Handle adding a new provider
     */
    async handleAddProvider(params) {
        if (!params.config) {
            throw new ValidationError('Configuration is required for add operation');
        }
        const config = params.config;
        // Validate required fields for add operation
        if (!config.name || !config.type || !config.modelName) {
            throw new ValidationError('name, type, and modelName are required for add operation');
        }
        // Validate API key environment variable for external providers
        if (config.type === 'external' && !config.apiKeyEnv) {
            throw new ValidationError('apiKeyEnv is required for external providers');
        }
        // Validate endpoint for external providers
        if (config.type === 'external' && !config.endpoint) {
            throw new ValidationError('endpoint is required for external providers');
        }
        const createParams = {
            name: config.name,
            type: config.type,
            endpoint: config.endpoint,
            apiKeyEnv: config.apiKeyEnv,
            modelName: config.modelName,
            maxTokens: config.maxTokens || 4000,
            temperature: config.temperature,
            isActive: config.isActive,
            priority: config.priority,
            costPer1kTokens: config.costPer1kTokens,
            metadata: config.metadata
        };
        const provider = await this.providerConfigRepository.create(createParams);
        return {
            operation: 'add',
            success: true,
            provider: this.formatProvider(provider),
            message: `Provider '${provider.name}' added successfully`
        };
    }
    /**
     * Handle updating an existing provider
     */
    async handleUpdateProvider(params) {
        if (!params.config || !params.config.id) {
            throw new ValidationError('Configuration with id is required for update operation');
        }
        const config = params.config;
        const providerId = config.id; // We validated this is not undefined above
        // Check if provider exists
        const existing = await this.providerConfigRepository.findById(providerId);
        if (!existing) {
            throw new NotFoundError(`Provider with id '${providerId}' not found`);
        }
        const updateParams = {
            name: config.name,
            endpoint: config.endpoint,
            apiKeyEnv: config.apiKeyEnv,
            modelName: config.modelName,
            maxTokens: config.maxTokens,
            temperature: config.temperature,
            isActive: config.isActive,
            priority: config.priority,
            costPer1kTokens: config.costPer1kTokens,
            metadata: config.metadata
        };
        const updatedProvider = await this.providerConfigRepository.updateConfig(providerId, updateParams);
        if (!updatedProvider) {
            throw new Error('Failed to update provider');
        }
        return {
            operation: 'update',
            success: true,
            provider: this.formatProvider(updatedProvider),
            message: `Provider '${updatedProvider.name}' updated successfully`
        };
    }
    /**
     * Handle removing a provider
     */
    async handleRemoveProvider(params) {
        if (!params.config || !params.config.id) {
            throw new ValidationError('Configuration with id is required for remove operation');
        }
        const providerId = params.config.id; // We validated this is not undefined above
        // Check if provider exists
        const existing = await this.providerConfigRepository.findById(providerId);
        if (!existing) {
            throw new NotFoundError(`Provider with id '${providerId}' not found`);
        }
        const success = await this.providerConfigRepository.delete(providerId);
        if (!success) {
            throw new Error('Failed to remove provider');
        }
        return {
            operation: 'remove',
            success: true,
            provider: this.formatProvider(existing),
            message: `Provider '${existing.name}' removed successfully`
        };
    }
    /**
     * Handle listing all providers
     */
    async handleListProviders(_params) {
        const providers = await this.providerConfigRepository.findAll();
        const statistics = await this.providerConfigRepository.getProviderStats();
        return {
            operation: 'list',
            success: true,
            providers: providers.map(provider => this.formatProvider(provider)),
            statistics,
            message: `Found ${providers.length} providers (${statistics.active} active)`
        };
    }
    /**
     * Format provider for response
     */
    formatProvider(provider) {
        return {
            id: provider.id,
            name: provider.name,
            type: provider.type,
            endpoint: provider.endpoint,
            modelName: provider.modelName,
            maxTokens: provider.maxTokens,
            temperature: provider.temperature,
            isActive: provider.isActive,
            priority: provider.priority,
            costPer1kTokens: provider.costPer1kTokens,
            metadata: provider.metadata || {}
        };
    }
    /**
     * Factory method to create the tool
     */
    static create(dependencies) {
        return new ConfigureLLMProviderTool(dependencies);
    }
}
//# sourceMappingURL=ConfigureLLMProviderTool.js.map