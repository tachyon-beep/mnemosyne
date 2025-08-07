/**
 * Topical Strategy - Semantic clustering and grouping
 *
 * This strategy groups content by topics and themes,
 * making it ideal for research and knowledge exploration.
 */
import { AssemblyStrategy } from './AssemblyStrategy.js';
import { ScoredItem } from '../scoring/RelevanceScorer.js';
import { ContextAssemblyRequest } from '../ContextAssembler.js';
import { TokenBudget } from '../optimization/TokenOptimizer.js';
/**
 * Topical assembly strategy implementation
 */
export declare class TopicalStrategy extends AssemblyStrategy {
    constructor();
    /**
     * Select items with topical clustering
     */
    selectItems(scoredItems: ScoredItem[], request: ContextAssemblyRequest, _budget: TokenBudget): Promise<ScoredItem[]>;
    /**
     * Get topical-specific selection criteria
     */
    private getTopicalCriteria;
    /**
     * Calculate maximum items for topical strategy
     */
    private calculateMaxItems;
    /**
     * Create topic clusters from items
     */
    private createTopicClusters;
    /**
     * Extract keywords from content
     */
    private extractKeywords;
    /**
     * Check if word is too common to be a good keyword
     */
    private isCommonWord;
    /**
     * Calculate keyword similarity between two keyword sets
     */
    private calculateKeywordSimilarity;
    /**
     * Merge keyword sets, keeping most frequent
     */
    private mergeKeywords;
    /**
     * Generate theme name for a cluster
     */
    private generateTheme;
    /**
     * Capitalize first letter of word
     */
    private capitalizeWord;
    /**
     * Rank clusters by relevance and coherence
     */
    private rankClusters;
    /**
     * Select items from top clusters
     */
    private selectFromClusters;
    /**
     * Apply topical ordering to final selection
     */
    private applyTopicalOrdering;
    /**
     * Check if query is broad and would benefit from topical organization
     */
    private isBroadQuery;
    /**
     * Get strategy description
     */
    getDescription(): string;
    /**
     * Check if strategy is suitable for the request
     */
    isSuitableFor(request: ContextAssemblyRequest): boolean;
}
//# sourceMappingURL=TopicalStrategy.d.ts.map