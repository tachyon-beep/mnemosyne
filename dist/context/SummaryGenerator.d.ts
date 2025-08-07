/**
 * Summary Generator - Hierarchical conversation summarization service
 *
 * This service provides intelligent conversation summarization using multiple
 * LLM providers with automatic fallback, quality validation, and temporal compression.
 *
 * Key features:
 * - Hierarchical summary levels (brief/standard/detailed)
 * - Temporal decay strategy for older conversations
 * - Quality validation and scoring
 * - Batch processing for efficiency
 * - Provider failover and cost management
 */
import { Message, ConversationSummary } from '../types/interfaces.js';
import { ProviderManager, ProviderStrategy } from './ProviderManager.js';
import { SummaryRepository } from '../storage/repositories/SummaryRepository.js';
import { SummaryHistoryRepository } from '../storage/repositories/SummaryHistoryRepository.js';
import { CacheRepository } from '../storage/repositories/CacheRepository.js';
import { TokenCounter } from './TokenCounter.js';
import { ValidationResult } from './validators/SummaryValidator.js';
/**
 * Configuration for the summary generator
 */
export interface SummaryGeneratorConfig {
    /** Default summary level for new summaries */
    defaultLevel: 'brief' | 'standard' | 'detailed';
    /** Enable quality validation */
    enableValidation: boolean;
    /** Minimum quality score to accept (0-1) */
    minQualityScore: number;
    /** Maximum retries for failed generations */
    maxRetries: number;
    /** Enable batch processing */
    enableBatchProcessing: boolean;
    /** Maximum messages per batch */
    maxBatchSize: number;
    /** Cache generated summaries */
    enableCaching: boolean;
    /** Cache TTL in milliseconds */
    cacheTtl: number;
    /** Temporal compression settings */
    temporalCompression: {
        /** Recent conversations threshold (hours) */
        recentThresholdHours: number;
        /** Medium age threshold (days) */
        mediumThresholdDays: number;
        /** Force brief summaries for old conversations */
        forceOldBrief: boolean;
    };
}
/**
 * Summary generation request
 */
export interface GenerationRequest {
    /** Messages to summarize */
    messages: Message[];
    /** Conversation ID */
    conversationId: string;
    /** Requested summary level (optional, uses temporal logic if not specified) */
    level?: 'brief' | 'standard' | 'detailed';
    /** Focus on specific topics */
    focusTopics?: string[];
    /** Previous summary to build upon */
    previousSummary?: string;
    /** Provider strategy to use */
    providerStrategy?: ProviderStrategy;
    /** Maximum tokens for output */
    maxTokens?: number;
    /** Force regeneration even if cached */
    forceRegenerate?: boolean;
}
/**
 * Summary generation result
 */
export interface GenerationResult {
    /** Generated summary */
    summary: ConversationSummary;
    /** Validation result */
    validation?: ValidationResult;
    /** Generation metadata */
    metadata: {
        /** Provider used */
        provider: string;
        /** Model used */
        model: string;
        /** Generation time in ms */
        generationTime: number;
        /** Whether result was cached */
        fromCache: boolean;
        /** Cost of generation */
        cost?: number;
        /** Quality score */
        qualityScore?: number;
    };
}
/**
 * Batch generation request
 */
export interface BatchGenerationRequest {
    /** Individual generation requests */
    requests: GenerationRequest[];
    /** Strategy for batch processing */
    batchStrategy?: 'sequential' | 'parallel' | 'optimal';
    /** Maximum concurrent generations */
    maxConcurrency?: number;
}
/**
 * Batch generation result
 */
export interface BatchGenerationResult {
    /** Successful generations */
    successes: GenerationResult[];
    /** Failed generations with errors */
    failures: Array<{
        request: GenerationRequest;
        error: Error;
    }>;
    /** Batch metadata */
    metadata: {
        /** Total time for batch */
        totalTime: number;
        /** Total cost */
        totalCost: number;
        /** Success rate */
        successRate: number;
    };
}
/**
 * Main summary generator service
 */
export declare class SummaryGenerator {
    private readonly providerManager;
    private readonly summaryRepository;
    private readonly historyRepository;
    private readonly cacheRepository;
    private readonly validator;
    private readonly config;
    constructor(providerManager: ProviderManager, summaryRepository: SummaryRepository, historyRepository: SummaryHistoryRepository, cacheRepository: CacheRepository, tokenCounter: TokenCounter, config?: Partial<SummaryGeneratorConfig>);
    /**
     * Generate a single conversation summary
     */
    generateSummary(request: GenerationRequest): Promise<GenerationResult>;
    /**
     * Generate multiple summaries in batch
     */
    generateBatch(request: BatchGenerationRequest): Promise<BatchGenerationResult>;
    /**
     * Get existing summaries for a conversation
     */
    getConversationSummaries(conversationId: string, level?: 'brief' | 'standard' | 'detailed'): Promise<ConversationSummary[]>;
    /**
     * Invalidate summaries for a conversation (e.g., when messages are updated)
     */
    invalidateConversationSummaries(conversationId: string): Promise<void>;
    /**
     * Get generation statistics
     */
    getGenerationStats(): Promise<{
        totalSummaries: number;
        summariesByLevel: Record<string, number>;
        averageQualityScore: number;
        topProviders: Array<{
            provider: string;
            count: number;
        }>;
        recentGenerations: number;
    }>;
    /**
     * Attempt a single generation
     */
    private attemptGeneration;
    /**
     * Determine target summary level based on temporal compression
     */
    private determineTargetLevel;
    /**
     * Get conversation age in milliseconds
     */
    private getConversationAge;
    /**
     * Get temporal category for metadata
     */
    private getTemporalCategory;
    /**
     * Detect conversation type from messages
     */
    private detectConversationType;
    /**
     * Get target token count for summary level
     */
    private getTargetTokenCount;
    /**
     * Get time range from messages
     */
    private getTimeRange;
    /**
     * Check for cached summary
     */
    private getCachedSummary;
    /**
     * Cache generation result
     */
    private cacheResult;
    /**
     * Start generation history tracking
     */
    private startGenerationHistory;
    /**
     * Complete generation history
     */
    private completeGenerationHistory;
    /**
     * Mark generation history as failed
     */
    private failGenerationHistory;
    /**
     * Chunk array into smaller arrays
     */
    private chunkArray;
    /**
     * Generate unique ID
     */
    private generateId;
}
//# sourceMappingURL=SummaryGenerator.d.ts.map