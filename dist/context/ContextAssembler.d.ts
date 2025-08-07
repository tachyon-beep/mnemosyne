/**
 * Context Assembler - Intelligent context assembly for queries
 *
 * This module provides:
 * - Multi-factor relevance scoring
 * - Token budget management
 * - Progressive context building
 * - Different assembly strategies
 * - Optimal context selection
 */
import { EmbeddingManager } from '../search/EmbeddingManager.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { SummaryRepository } from '../storage/repositories/SummaryRepository.js';
import { StrategyType } from './strategies/AssemblyStrategy.js';
/**
 * Context assembly request parameters
 */
export interface ContextAssemblyRequest {
    /** The user's query */
    query: string;
    /** Optional conversation ID to limit scope */
    conversationId?: string;
    /** Maximum token budget for assembled context */
    maxTokens?: number;
    /** Assembly strategy to use */
    strategy?: StrategyType;
    /** Minimum relevance threshold */
    minRelevance?: number;
    /** Include recent messages regardless of relevance */
    includeRecent?: boolean;
    /** Entity names to focus on */
    focusEntities?: string[];
    /** Time window for context (in milliseconds) */
    timeWindow?: number;
    /** Model name for token counting */
    model?: string;
}
/**
 * Assembled context result
 */
export interface AssembledContext {
    /** The assembled context text */
    text: string;
    /** Token count of the assembled context */
    tokenCount: number;
    /** Breakdown of token usage */
    tokenBreakdown: {
        query: number;
        summaries: number;
        messages: number;
        metadata: number;
        buffer: number;
    };
    /** Items included in the context */
    includedItems: Array<{
        type: 'summary' | 'message';
        id: string;
        relevanceScore: number;
        tokenCount: number;
        position: number;
    }>;
    /** Assembly strategy used */
    strategy: StrategyType;
    /** Performance metrics */
    metrics: {
        processingTimeMs: number;
        itemsEvaluated: number;
        itemsIncluded: number;
        averageRelevance: number;
        tokenEfficiency: number;
    };
}
/**
 * Context assembly configuration
 */
export interface ContextAssemblerConfig {
    /** Default maximum token budget */
    defaultMaxTokens: number;
    /** Default assembly strategy */
    defaultStrategy: StrategyType;
    /** Default minimum relevance threshold */
    defaultMinRelevance: number;
    /** Token allocation ratios */
    tokenAllocation: {
        query: number;
        summaries: number;
        messages: number;
        metadata: number;
        buffer: number;
    };
    /** Performance thresholds */
    performance: {
        maxProcessingTimeMs: number;
        maxItemsToEvaluate: number;
    };
}
/**
 * Context Assembler - Main service for intelligent context assembly
 */
export declare class ContextAssembler {
    private config;
    private embeddingManager;
    private messageRepository;
    private summaryRepository;
    private relevanceScorer;
    private tokenOptimizer;
    private strategies;
    constructor(embeddingManager: EmbeddingManager, messageRepository: MessageRepository, summaryRepository: SummaryRepository, config?: Partial<ContextAssemblerConfig>);
    /**
     * Assemble optimal context for a query
     */
    assembleContext(request: ContextAssemblyRequest): Promise<AssembledContext>;
    /**
     * Normalize and validate request parameters
     */
    private normalizeRequest;
    /**
     * Calculate token budget allocation
     */
    private calculateTokenBudget;
    /**
     * Collect candidate summaries and messages
     */
    private collectCandidates;
    /**
     * Score items for relevance using multi-factor scoring
     */
    private scoreItems;
    /**
     * Build the final context text from selected items
     */
    private buildContextText;
    /**
     * Calculate performance metrics
     */
    private calculateMetrics;
    /**
     * Create fallback context when assembly fails
     */
    private createFallbackContext;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<ContextAssemblerConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): ContextAssemblerConfig;
    /**
     * Get available strategies
     */
    getAvailableStrategies(): StrategyType[];
    /**
     * Get embedding manager instance
     */
    getEmbeddingManager(): EmbeddingManager;
}
//# sourceMappingURL=ContextAssembler.d.ts.map