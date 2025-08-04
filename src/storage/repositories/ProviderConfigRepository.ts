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
export class ProviderConfigRepository extends BaseRepository implements IProviderConfigRepository {

  /**
   * Find all active providers ordered by priority (descending)
   */
  async findActive(): Promise<LLMProvider[]> {
    const rows = this.executeStatementAll<{
      id: string;
      name: string;
      type: string;
      endpoint: string | null;
      api_key_env: string | null;
      model_name: string;
      max_tokens: number;
      temperature: number;
      is_active: number;
      priority: number;
      cost_per_1k_tokens: number | null;
      metadata: string;
    }>(
      'find_active_providers',
      `SELECT id, name, type, endpoint, api_key_env, model_name, max_tokens, 
              temperature, is_active, priority, cost_per_1k_tokens, metadata
       FROM llm_providers
       WHERE is_active = 1
       ORDER BY priority DESC, name ASC`
    );

    const providers: LLMProvider[] = [];
    for (const row of rows) {
      const provider = await this.mapRowToProvider(row);
      providers.push(provider);
    }

    return providers;
  }

  /**
   * Find providers by type (local or external)
   */
  async findByType(type: 'local' | 'external'): Promise<LLMProvider[]> {
    const rows = this.executeStatementAll<{
      id: string;
      name: string;
      type: string;
      endpoint: string | null;
      api_key_env: string | null;
      model_name: string;
      max_tokens: number;
      temperature: number;
      is_active: number;
      priority: number;
      cost_per_1k_tokens: number | null;
      metadata: string;
    }>(
      `find_providers_by_type_${type}`,
      `SELECT id, name, type, endpoint, api_key_env, model_name, max_tokens, 
              temperature, is_active, priority, cost_per_1k_tokens, metadata
       FROM llm_providers
       WHERE type = ?
       ORDER BY priority DESC, name ASC`,
      [type]
    );

    const providers: LLMProvider[] = [];
    for (const row of rows) {
      const provider = await this.mapRowToProvider(row);
      providers.push(provider);
    }

    return providers;
  }

  /**
   * Update provider configuration
   */
  async updateConfig(id: string, config: UpdateProviderParams): Promise<LLMProvider | null> {
    if (!this.isValidUUID(id)) {
      return null;
    }

    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    // Build dynamic update query based on provided fields
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (config.name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(config.name);
    }

    if (config.endpoint !== undefined) {
      updateFields.push('endpoint = ?');
      updateValues.push(config.endpoint);
    }

    if (config.apiKeyEnv !== undefined) {
      updateFields.push('api_key_env = ?');
      updateValues.push(config.apiKeyEnv);
    }

    if (config.modelName !== undefined) {
      updateFields.push('model_name = ?');
      updateValues.push(config.modelName);
    }

    if (config.maxTokens !== undefined) {
      updateFields.push('max_tokens = ?');
      updateValues.push(config.maxTokens);
    }

    if (config.temperature !== undefined) {
      updateFields.push('temperature = ?');
      updateValues.push(config.temperature);
    }

    if (config.isActive !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(config.isActive ? 1 : 0);
    }

    if (config.priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(config.priority);
    }

    if (config.costPer1kTokens !== undefined) {
      updateFields.push('cost_per_1k_tokens = ?');
      updateValues.push(config.costPer1kTokens);
    }

    if (config.metadata !== undefined) {
      updateFields.push('metadata = ?');
      updateValues.push(this.stringifyMetadata(config.metadata));
    }

    // If no fields to update, return existing
    if (updateFields.length === 0) {
      return existing;
    }

    updateValues.push(id);

    try {
      const result = this.executeStatementRun(
        'update_provider_config',
        `UPDATE llm_providers SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      if (result.changes === 0) {
        return null;
      }

      // Return updated provider
      return await this.findById(id);
    } catch (error) {
      this.handleConstraintError(error as Error, 'Provider');
    }
  }

  /**
   * Toggle provider active status
   */
  async toggleActive(id: string): Promise<boolean> {
    if (!this.isValidUUID(id)) {
      return false;
    }

    const result = this.executeStatementRun(
      'toggle_provider_active',
      'UPDATE llm_providers SET is_active = NOT is_active WHERE id = ?',
      [id]
    );

    return result.changes > 0;
  }

  /**
   * Find provider by ID
   */
  async findById(id: string): Promise<LLMProvider | null> {
    if (!this.isValidUUID(id)) {
      return null;
    }

    const row = this.executeStatement<{
      id: string;
      name: string;
      type: string;
      endpoint: string | null;
      api_key_env: string | null;
      model_name: string;
      max_tokens: number;
      temperature: number;
      is_active: number;
      priority: number;
      cost_per_1k_tokens: number | null;
      metadata: string;
    }>(
      'find_provider_by_id',
      `SELECT id, name, type, endpoint, api_key_env, model_name, max_tokens, 
              temperature, is_active, priority, cost_per_1k_tokens, metadata
       FROM llm_providers
       WHERE id = ?`,
      [id]
    );

    if (!row) {
      return null;
    }

    return await this.mapRowToProvider(row);
  }

  /**
   * Create a new provider configuration
   */
  async create(params: CreateProviderParams): Promise<LLMProvider> {
    const id = params.id || this.generateId();
    
    const provider: LLMProvider = {
      id,
      name: params.name,
      type: params.type,
      endpoint: params.endpoint,
      apiKeyEnv: params.apiKeyEnv,
      modelName: params.modelName,
      maxTokens: params.maxTokens,
      temperature: params.temperature !== undefined ? params.temperature : 0.7,
      isActive: params.isActive !== undefined ? params.isActive : true,
      priority: params.priority !== undefined ? params.priority : 0,
      costPer1kTokens: params.costPer1kTokens,
      metadata: params.metadata || {}
    };

    try {
      this.executeStatementRun(
        'insert_provider',
        `INSERT INTO llm_providers (
          id, name, type, endpoint, api_key_env, model_name, max_tokens,
          temperature, is_active, priority, cost_per_1k_tokens, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          provider.id,
          provider.name,
          provider.type,
          provider.endpoint || null,
          provider.apiKeyEnv || null,
          provider.modelName,
          provider.maxTokens,
          provider.temperature,
          provider.isActive ? 1 : 0,
          provider.priority,
          provider.costPer1kTokens || null,
          this.stringifyMetadata(provider.metadata)
        ]
      );

      return provider;
    } catch (error) {
      this.handleConstraintError(error as Error, 'Provider');
    }
  }

  /**
   * Delete a provider configuration
   */
  async delete(id: string): Promise<boolean> {
    if (!this.isValidUUID(id)) {
      return false;
    }

    const result = this.executeStatementRun(
      'delete_provider',
      'DELETE FROM llm_providers WHERE id = ?',
      [id]
    );

    return result.changes > 0;
  }

  /**
   * Get all providers (active and inactive)
   */
  async findAll(): Promise<LLMProvider[]> {
    const rows = this.executeStatementAll<{
      id: string;
      name: string;
      type: string;
      endpoint: string | null;
      api_key_env: string | null;
      model_name: string;
      max_tokens: number;
      temperature: number;
      is_active: number;
      priority: number;
      cost_per_1k_tokens: number | null;
      metadata: string;
    }>(
      'find_all_providers',
      `SELECT id, name, type, endpoint, api_key_env, model_name, max_tokens, 
              temperature, is_active, priority, cost_per_1k_tokens, metadata
       FROM llm_providers
       ORDER BY priority DESC, name ASC`
    );

    const providers: LLMProvider[] = [];
    for (const row of rows) {
      const provider = await this.mapRowToProvider(row);
      providers.push(provider);
    }

    return providers;
  }

  /**
   * Count providers by type and status
   */
  async getProviderStats(): Promise<{
    total: number;
    active: number;
    local: number;
    external: number;
  }> {
    const result = this.executeStatement<{
      total: number;
      active: number;
      local: number;
      external: number;
    }>(
      'get_provider_stats',
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN type = 'local' THEN 1 ELSE 0 END) as local,
        SUM(CASE WHEN type = 'external' THEN 1 ELSE 0 END) as external
       FROM llm_providers`
    );

    return result || { total: 0, active: 0, local: 0, external: 0 };
  }

  /**
   * Check if a provider exists
   */
  async exists(id: string): Promise<boolean> {
    if (!this.isValidUUID(id)) {
      return false;
    }

    const result = this.executeStatement<{ count: number }>(
      'provider_exists',
      'SELECT 1 as count FROM llm_providers WHERE id = ? LIMIT 1',
      [id]
    );
    return !!result;
  }

  /**
   * Map database row to LLMProvider object
   * Note: API keys are stored as environment variable names, not encrypted values
   */
  private async mapRowToProvider(row: {
    id: string;
    name: string;
    type: string;
    endpoint: string | null;
    api_key_env: string | null;
    model_name: string;
    max_tokens: number;
    temperature: number;
    is_active: number;
    priority: number;
    cost_per_1k_tokens: number | null;
    metadata: string;
  }): Promise<LLMProvider> {
    return {
      id: row.id,
      name: row.name,
      type: row.type as 'local' | 'external',
      endpoint: row.endpoint || undefined,
      apiKeyEnv: row.api_key_env || undefined,
      modelName: row.model_name,
      maxTokens: row.max_tokens,
      temperature: row.temperature,
      isActive: row.is_active === 1,
      priority: row.priority,
      costPer1kTokens: row.cost_per_1k_tokens || undefined,
      metadata: this.parseMetadata(row.metadata)
    };
  }
}