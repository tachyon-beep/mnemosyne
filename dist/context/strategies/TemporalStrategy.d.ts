/**
 * Temporal Strategy - Recent-first with time decay
 *
 * This strategy prioritizes recent content with time-based decay,
 * making it ideal for queries about current state or recent changes.
 */
import { AssemblyStrategy } from './AssemblyStrategy.js';
import { ScoredItem } from '../scoring/RelevanceScorer.js';
import { ContextAssemblyRequest } from '../ContextAssembler.js';
import { TokenBudget } from '../optimization/TokenOptimizer.js';
/**
 * Temporal assembly strategy implementation
 */
export declare class TemporalStrategy extends AssemblyStrategy {
    constructor();
    /**
     * Select items with temporal prioritization
     */
    selectItems(scoredItems: ScoredItem[], request: ContextAssemblyRequest, _budget: TokenBudget): Promise<ScoredItem[]>;
    /**
     * Get temporal-specific selection criteria
     */
    private getTemporalCriteria;
    /**
     * Calculate maximum items based on time window and request
     */
    private calculateMaxItems;
    /**
     * Apply temporal scoring to items
     */
    private applyTemporalScoring;
    /**
     * Calculate temporal score based on age and time window
     */
    private calculateTemporalScore;
    /**
     * Apply final temporal ordering to maintain chronological flow
     */
    private applyFinalTemporalOrdering;
    /**
     * Interleave items to maintain temporal flow while preserving relevance
     */
    private interleaveTemporalItems;
    /**
     * Get strategy description
     */
    getDescription(): string;
    /**
     * Check if strategy is suitable for the request
     */
    isSuitableFor(request: ContextAssemblyRequest): boolean;
}
//# sourceMappingURL=TemporalStrategy.d.ts.map