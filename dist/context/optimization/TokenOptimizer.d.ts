/**
 * Token Optimizer - Smart token budget allocation and optimization
 *
 * This module provides:
 * - Allocate token budget across different content types
 * - Smart truncation that preserves meaning
 * - Handle boundary conditions gracefully
 * - Provide fallback strategies
 */
import { TokenCounter } from '../TokenCounter.js';
import { ScoredItem } from '../scoring/RelevanceScorer.js';
/**
 * Token budget allocation
 */
export interface TokenBudget {
    total: number;
    query: number;
    summaries: number;
    messages: number;
    metadata: number;
    buffer: number;
}
/**
 * Token optimization configuration
 */
export interface TokenOptimizerConfig {
    /** Minimum tokens to preserve per item */
    minTokensPerItem: number;
    /** Maximum tokens allowed per item */
    maxTokensPerItem: number;
    /** Truncation strategy */
    truncationStrategy: 'end' | 'middle' | 'smart';
    /** Preserve important sentences when truncating */
    preserveImportantSentences: boolean;
    /** Token counting safety margin */
    safetyMargin: number;
}
/**
 * Optimization result
 */
export interface OptimizationResult {
    optimizedItems: ScoredItem[];
    tokenUsage: {
        allocated: number;
        used: number;
        remaining: number;
        efficiency: number;
    };
    modifications: Array<{
        itemId: string;
        action: 'included' | 'truncated' | 'excluded';
        originalTokens: number;
        finalTokens: number;
        reason: string;
    }>;
}
/**
 * Token Optimizer for context assembly
 */
export declare class TokenOptimizer {
    private config;
    constructor(config?: Partial<TokenOptimizerConfig>);
    /**
     * Optimize item selection to fit within token budget
     */
    optimizeSelection(items: ScoredItem[], budget: TokenBudget, tokenCounter: TokenCounter): ScoredItem[];
    /**
     * Optimize items with detailed result information
     */
    optimizeItems(items: ScoredItem[], budget: TokenBudget, tokenCounter: TokenCounter): OptimizationResult;
    /**
     * Optimize a category of items (summaries or messages)
     */
    private optimizeCategory;
    /**
     * Truncate an item to fit within token limit
     */
    private truncateItem;
    /**
     * Truncate from the end, preserving the beginning
     */
    private truncateFromEnd;
    /**
     * Truncate from the middle, preserving beginning and end
     */
    private truncateFromMiddle;
    /**
     * Smart truncation preserving important sentences
     */
    private smartTruncate;
    /**
     * Split text into sentences
     */
    private splitIntoSentences;
    /**
     * Score sentence importance
     */
    private scoreSentenceImportance;
    /**
     * Estimate token count without full calculation
     */
    estimateTokenCount(text: string, tokenCounter: TokenCounter): number;
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<TokenOptimizerConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): TokenOptimizerConfig;
}
//# sourceMappingURL=TokenOptimizer.d.ts.map