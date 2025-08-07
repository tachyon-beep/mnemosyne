/**
 * Entity-Centric Strategy - Focus on mentioned entities
 *
 * This strategy prioritizes content that mentions specific entities,
 * making it ideal for queries about people, places, products, or concepts.
 */
import { AssemblyStrategy } from './AssemblyStrategy.js';
import { ScoredItem } from '../scoring/RelevanceScorer.js';
import { ContextAssemblyRequest } from '../ContextAssembler.js';
import { TokenBudget } from '../optimization/TokenOptimizer.js';
/**
 * Entity-centric assembly strategy implementation
 */
export declare class EntityCentricStrategy extends AssemblyStrategy {
    private entityPatterns;
    constructor();
    /**
     * Initialize entity recognition patterns
     */
    private initializeEntityPatterns;
    /**
     * Select items with entity-centric prioritization
     */
    selectItems(scoredItems: ScoredItem[], request: ContextAssemblyRequest, _budget: TokenBudget): Promise<ScoredItem[]>;
    /**
     * Get entity-centric selection criteria
     */
    private getEntityCentricCriteria;
    /**
     * Calculate maximum items for entity-centric strategy
     */
    private calculateMaxItems;
    /**
     * Extract target entities from request
     */
    private extractTargetEntities;
    /**
     * Extract entities from text with type classification
     */
    private extractEntitiesFromText;
    /**
     * Escape special regex characters
     */
    private escapeRegex;
    /**
     * Score items based on entity mentions
     */
    private scoreItemsByEntityMentions;
    /**
     * Calculate entity score for content
     */
    private calculateEntityScore;
    /**
     * Count entities in query
     */
    private countEntitiesInQuery;
    /**
     * Apply entity-centric ordering
     */
    private applyEntityCentricOrdering;
    /**
     * Group items by entity mentions
     */
    private groupItemsByEntityMentions;
    /**
     * Get strategy description
     */
    getDescription(): string;
    /**
     * Check if strategy is suitable for the request
     */
    isSuitableFor(request: ContextAssemblyRequest): boolean;
}
//# sourceMappingURL=EntityCentricStrategy.d.ts.map