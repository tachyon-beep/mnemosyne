/**
 * Provider Configuration Repository - CRUD operations for LLM providers
 *
 * This repository provides:
 * - Full CRUD operations for LLM provider configurations
 * - Secure storage of API keys using encryption
 * - Provider activation/deactivation management
 * - Priority-based ordering for provider selection
 * - Type-based filtering (local vs external providers)
 */
import { LLMProvider } from '../../types/interfaces.js';
import { IProviderConfigRepository, CreateProviderParams } from '../../types/repositories.js';
import { BaseRepository } from './BaseRepository.js';
/**
 * Interface for updating provider parameters
 */
export interface UpdateProviderParams {
    name?: string;
    endpoint?: string;
    apiKeyEnv?: string;
    modelName?: string;
    maxTokens?: number;
    temperature?: number;
    isActive?: boolean;
    priority?: number;
    costPer1kTokens?: number;
    metadata?: Record<string, any>;
}
/**
 * Repository for LLM provider configuration operations
 */
export declare class ProviderConfigRepository extends BaseRepository implements IProviderConfigRepository {
    /**
     * Find all active providers ordered by priority (descending)
     */
    findActive(): Promise<LLMProvider[]>;
    /**
     * Find providers by type (local or external)
     */
    findByType(type: 'local' | 'external'): Promise<LLMProvider[]>;
    /**
     * Update provider configuration
     */
    updateConfig(id: string, config: UpdateProviderParams): Promise<LLMProvider | null>;
    /**
     * Toggle provider active status
     */
    toggleActive(id: string): Promise<boolean>;
    /**
     * Find provider by ID
     */
    findById(id: string): Promise<LLMProvider | null>;
    /**
     * Create a new provider configuration
     */
    create(params: CreateProviderParams): Promise<LLMProvider>;
    /**
     * Delete a provider configuration
     */
    delete(id: string): Promise<boolean>;
    /**
     * Get all providers (active and inactive)
     */
    findAll(): Promise<LLMProvider[]>;
    /**
     * Count providers by type and status
     */
    getProviderStats(): Promise<{
        total: number;
        active: number;
        local: number;
        external: number;
    }>;
    /**
     * Check if a provider exists
     */
    exists(id: string): Promise<boolean>;
    /**
     * Map database row to LLMProvider object
     * Note: API keys are stored as environment variable names, not encrypted values
     */
    private mapRowToProvider;
}
//# sourceMappingURL=ProviderConfigRepository.d.ts.map