/**
 * Hybrid Strategy - Adaptive strategy selection
 *
 * This strategy dynamically selects and combines approaches based on
 * query characteristics and content analysis.
 */
import { AssemblyStrategy } from './AssemblyStrategy.js';
import { ScoredItem } from '../scoring/RelevanceScorer.js';
import { ContextAssemblyRequest } from '../ContextAssembler.js';
import { TokenBudget } from '../optimization/TokenOptimizer.js';
/**
 * Hybrid assembly strategy implementation
 */
export declare class HybridStrategy extends AssemblyStrategy {
    private temporalStrategy;
    private topicalStrategy;
    private entityStrategy;
    constructor();
    /**
     * Select items using adaptive hybrid approach
     */
    selectItems(scoredItems: ScoredItem[], request: ContextAssemblyRequest, budget: TokenBudget): Promise<ScoredItem[]>;
    /**
     * Analyze request to determine strategy weights
     */
    private analyzeRequestForStrategies;
    /**
     * Calculate temporal strategy weight
     */
    private calculateTemporalWeight;
    /**
     * Calculate topical strategy weight
     */
    private calculateTopicalWeight;
    /**
     * Calculate entity-centric strategy weight
     */
    private calculateEntityWeight;
    /**
     * Get hybrid-specific criteria
     */
    private getHybridCriteria;
    /**
     * Find strategy with dominant weight
     */
    private findDominantStrategy;
    /**
     * Execute single strategy when one dominates
     */
    private executeSingleStrategy;
    /**
     * Execute hybrid selection combining multiple strategies
     */
    private executeHybridSelection;
    /**
     * Create sub-budget for strategy
     */
    private createSubBudget;
    /**
     * Calculate ratio of recent items
     */
    private calculateRecentItemsRatio;
    /**
     * Calculate topic diversity in items
     */
    private calculateTopicDiversity;
    /**
     * Check if query is broad
     */
    private isBroadQuery;
    /**
     * Check if query is research-oriented
     */
    private isResearchQuery;
    /**
     * Calculate entity density in query
     */
    private calculateEntityDensityInQuery;
    /**
     * Calculate entity richness in content
     */
    private calculateEntityRichnessInContent;
    /**
     * Get strategy description
     */
    getDescription(): string;
    /**
     * Check if strategy is suitable for the request
     */
    isSuitableFor(_request: ContextAssemblyRequest): boolean;
}
//# sourceMappingURL=HybridStrategy.d.ts.map