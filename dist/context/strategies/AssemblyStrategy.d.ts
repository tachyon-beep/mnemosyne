/**
 * Assembly Strategy - Base interface for context assembly strategies
 *
 * This module provides:
 * - Base interface for assembly strategies
 * - Common strategy utilities
 * - Strategy type definitions
 */
import { ScoredItem } from '../scoring/RelevanceScorer.js';
import { ContextAssemblyRequest } from '../ContextAssembler.js';
import { TokenBudget } from '../optimization/TokenOptimizer.js';
/**
 * Available assembly strategy types
 */
export type StrategyType = 'temporal' | 'topical' | 'entity-centric' | 'hybrid';
/**
 * Strategy selection criteria
 */
export interface StrategySelectionCriteria {
    /** Maximum number of items to select */
    maxItems?: number;
    /** Minimum relevance threshold */
    minRelevance?: number;
    /** Diversity factor (0-1, higher = more diverse) */
    diversityFactor?: number;
    /** Prefer recent items */
    preferRecent?: boolean;
    /** Balance between summaries and messages */
    summaryMessageRatio?: number;
}
/**
 * Base assembly strategy interface
 */
export declare abstract class AssemblyStrategy {
    protected strategyType: StrategyType;
    constructor(strategyType: StrategyType);
    /**
     * Select and order items for context assembly
     */
    abstract selectItems(scoredItems: ScoredItem[], request: ContextAssemblyRequest, budget: TokenBudget): Promise<ScoredItem[]>;
    /**
     * Get strategy type
     */
    getType(): StrategyType;
    /**
     * Get strategy description
     */
    abstract getDescription(): string;
    /**
     * Check if strategy is suitable for the given request
     */
    abstract isSuitableFor(request: ContextAssemblyRequest): boolean;
    /**
     * Get default selection criteria for this strategy
     */
    protected getDefaultCriteria(): StrategySelectionCriteria;
    /**
     * Filter items by minimum relevance
     */
    protected filterByRelevance(items: ScoredItem[], minRelevance: number): ScoredItem[];
    /**
     * Apply diversity selection to avoid redundancy
     */
    protected applyDiversitySelection(items: ScoredItem[], diversityFactor: number, maxItems: number): ScoredItem[];
    /**
     * Calculate diversity score for an item compared to already selected items
     */
    protected calculateDiversityScore(item: ScoredItem, selectedItems: ScoredItem[]): number;
    /**
     * Simple content similarity calculation
     */
    protected calculateContentSimilarity(content1: string, content2: string): number;
    /**
     * Extract meaningful words from content
     */
    protected extractWords(content: string): string[];
    /**
     * Check if word is a stop word
     */
    protected isStopWord(word: string): boolean;
    /**
     * Balance selection between summaries and messages
     */
    protected balanceTypeSelection(items: ScoredItem[], summaryMessageRatio: number, maxItems: number): ScoredItem[];
    /**
     * Group items by conversation for better organization
     */
    protected groupByConversation(items: ScoredItem[]): Map<string, ScoredItem[]>;
    /**
     * Calculate time-based score boost for recent items
     */
    protected calculateRecencyBoost(createdAt: number, maxBoost?: number): number;
}
//# sourceMappingURL=AssemblyStrategy.d.ts.map