/**
 * LLM Provider Interface
 * 
 * Abstract interface for Large Language Model providers that can generate
 * conversation summaries. Supports both local and external providers.
 */

import { Message } from '../../types/interfaces.js';

/**
 * Configuration for an LLM provider
 */
export interface ProviderConfig {
  id: string;
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
 * Request for summary generation
 */
export interface SummaryRequest {
  messages: Message[];
  level: 'brief' | 'standard' | 'detailed';
  maxTokens: number;
  focusTopics?: string[];
  previousSummary?: string;
  context?: {
    conversationId: string;
    timeRange?: { start: Date; end: Date };
    userPreferences?: Record<string, any>;
  };
}

/**
 * Response from summary generation
 */
export interface SummaryResponse {
  summary: string;
  tokenCount: number;
  inputTokens: number;
  outputTokens: number;
  cost?: number;
  qualityScore?: number;
  metadata?: Record<string, any>;
  processingTime?: number;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  isAvailable: boolean;
  latency?: number;
  lastChecked: Date;
  error?: string;
  modelInfo?: ModelInfo;
}

/**
 * Information about the model
 */
export interface ModelInfo {
  name: string;
  version?: string;
  contextLength: number;
  tokensPerSecond?: number;
  memoryUsage?: number;
  capabilities?: string[];
}

/**
 * Token counting result
 */
export interface TokenCount {
  count: number;
  model: string;
  estimatedCost?: number;
}

/**
 * Provider statistics
 */
export interface ProviderStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  totalCost: number;
  lastUsed?: Date;
}

/**
 * Abstract base class for LLM providers
 */
export abstract class LLMProvider {
  protected config: ProviderConfig;
  protected stats: ProviderStats;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0,
      totalCost: 0
    };
  }

  // Abstract methods that must be implemented by concrete providers
  abstract initialize(): Promise<void>;
  abstract isAvailable(): Promise<boolean>;
  abstract generateSummary(request: SummaryRequest): Promise<SummaryResponse>;
  abstract countTokens(text: string): Promise<TokenCount>;
  abstract getHealth(): Promise<ProviderHealth>;

  // Concrete methods with default implementations
  getId(): string {
    return this.config.id;
  }

  getName(): string {
    return this.config.name;
  }

  getType(): 'local' | 'external' {
    return this.config.type;
  }

  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  getMaxTokens(): number {
    return this.config.maxTokens;
  }

  getModelName(): string {
    return this.config.modelName;
  }

  getPriority(): number {
    return this.config.priority || 0;
  }

  isActive(): boolean {
    return this.config.isActive !== false;
  }

  getStats(): ProviderStats {
    return { ...this.stats };
  }

  estimateCost(tokens: number): number {
    if (!this.config.costPer1kTokens) {
      return 0;
    }
    return (tokens / 1000) * this.config.costPer1kTokens;
  }

  /**
   * Update provider configuration
   */
  updateConfig(updates: Partial<ProviderConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Record successful request
   */
  protected recordSuccess(latency: number, cost: number = 0): void {
    this.stats.totalRequests++;
    this.stats.successfulRequests++;
    this.stats.totalCost += cost;
    this.stats.lastUsed = new Date();
    
    // Update average latency
    const totalSuccessful = this.stats.successfulRequests;
    this.stats.averageLatency = 
      (this.stats.averageLatency * (totalSuccessful - 1) + latency) / totalSuccessful;
  }

  /**
   * Record failed request
   */
  protected recordFailure(): void {
    this.stats.totalRequests++;
    this.stats.failedRequests++;
  }

  /**
   * Validate request parameters
   */
  protected validateRequest(request: SummaryRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('No messages provided for summarization');
    }

    if (request.maxTokens <= 0 || request.maxTokens > this.config.maxTokens) {
      throw new Error(`Invalid token count: ${request.maxTokens}. Must be between 1 and ${this.config.maxTokens}`);
    }

    if (!['brief', 'standard', 'detailed'].includes(request.level)) {
      throw new Error(`Invalid summary level: ${request.level}`);
    }
  }

  /**
   * Get model information (optional implementation)
   */
  async getModelInfo(): Promise<ModelInfo | undefined> {
    return undefined;
  }

  /**
   * Cleanup resources (optional implementation)
   */
  async cleanup(): Promise<void> {
    // Default: no cleanup needed
  }

  /**
   * Test the provider with a simple request (optional implementation)
   */
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.getHealth();
      return health.isAvailable;
    } catch {
      return false;
    }
  }
}

/**
 * Provider error types
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly provider: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export class ProviderUnavailableError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super(`Provider ${provider} is not available`, 'PROVIDER_UNAVAILABLE', provider, cause);
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderTimeoutError extends ProviderError {
  constructor(provider: string, timeout: number) {
    super(`Provider ${provider} timed out after ${timeout}ms`, 'PROVIDER_TIMEOUT', provider);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super(`Authentication failed for provider ${provider}`, 'PROVIDER_AUTH_ERROR', provider, cause);
    this.name = 'ProviderAuthError';
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(provider: string, retryAfter?: number) {
    super(
      `Rate limit exceeded for provider ${provider}${retryAfter ? `. Retry after ${retryAfter}s` : ''}`,
      'PROVIDER_RATE_LIMIT',
      provider
    );
    this.name = 'ProviderRateLimitError';
  }
}

export class ProviderQuotaError extends ProviderError {
  constructor(provider: string, cause?: Error) {
    super(`Quota exceeded for provider ${provider}`, 'PROVIDER_QUOTA_EXCEEDED', provider, cause);
    this.name = 'ProviderQuotaError';
  }
}