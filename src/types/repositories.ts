/**
 * Repository interface definitions for Phase 2 context management
 * 
 * This file contains TypeScript interfaces for the specialized repository
 * operations used in intelligent context management and summarization.
 */

import { LLMProvider, SummaryCache, SummaryHistory } from './interfaces.js';

/**
 * Interface for provider configuration operations
 */
export interface IProviderConfigRepository {
  /**
   * Find all active providers ordered by priority
   */
  findActive(): Promise<LLMProvider[]>;

  /**
   * Find providers by type (local or external)
   */
  findByType(type: 'local' | 'external'): Promise<LLMProvider[]>;

  /**
   * Update provider configuration
   */
  updateConfig(id: string, config: Partial<LLMProvider>): Promise<LLMProvider | null>;

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
}

/**
 * Interface for cache operations
 */
export interface ICacheRepository {
  /**
   * Get cached data by key
   */
  get(key: string): Promise<SummaryCache | null>;

  /**
   * Set cached data with optional TTL
   */
  set(key: string, data: CacheSetData, ttlHours?: number): Promise<SummaryCache>;

  /**
   * Invalidate cache entries matching a pattern
   */
  invalidate(pattern: string): Promise<number>;

  /**
   * Clean up expired cache entries
   */
  cleanup(): Promise<number>;

  /**
   * Update access time and count for a cache entry
   */
  updateAccess(id: string): Promise<void>;

  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;
}

/**
 * Interface for summary history operations
 */
export interface ISummaryHistoryRepository {
  /**
   * Record the start of a summary generation
   */
  recordStart(data: SummaryStartData): Promise<SummaryHistory>;

  /**
   * Record successful completion of summary generation
   */
  recordComplete(id: string, result: SummaryCompleteResult): Promise<SummaryHistory | null>;

  /**
   * Record failure of summary generation
   */
  recordFailure(id: string, error: string): Promise<SummaryHistory | null>;

  /**
   * Get generation statistics for a provider
   */
  getStats(providerId?: string): Promise<SummaryStats>;

  /**
   * Find history entries by status
   */
  findByStatus(status: SummaryHistory['status'], limit?: number): Promise<SummaryHistory[]>;

  /**
   * Clean up old history entries
   */
  cleanupOldEntries(olderThanDays: number): Promise<number>;
}

/**
 * Parameters for creating a new provider
 */
export interface CreateProviderParams {
  id?: string;
  name: string;
  type: 'local' | 'external';
  endpoint?: string;
  apiKeyEnv?: string;
  modelName: string;
  maxTokens: number;
  temperature?: number;
  isActive?: boolean;
  priority?: number;
  costPer1kTokens?: number;
  metadata?: Record<string, any>;
}

/**
 * Data for setting cache entries
 */
export interface CacheSetData {
  summaryIds: string[];
  assembledContext: string;
  tokenCount: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  averageAccessCount: number;
  oldestEntry?: number;
  newestEntry?: number;
  hitRate?: number;
}

/**
 * Data for starting summary generation
 */
export interface SummaryStartData {
  summaryId: string;
  providerId: string;
  inputTokens?: number;
}

/**
 * Result data for completed summary generation
 */
export interface SummaryCompleteResult {
  outputTokens: number;
  cost?: number;
}

/**
 * Summary generation statistics
 */
export interface SummaryStats {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageInputTokens?: number;
  averageOutputTokens?: number;
  totalCost?: number;
  averageDurationMs?: number;
}

/**
 * Encrypted data for secure storage
 */
export interface EncryptedData {
  encrypted: string;
  iv: string;
  tag: string;
}