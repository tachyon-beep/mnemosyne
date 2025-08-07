/**
 * Hybrid Strategy - Adaptive strategy selection
 *
 * This strategy dynamically selects and combines approaches based on
 * query characteristics and content analysis.
 */
import { AssemblyStrategy } from './AssemblyStrategy.js';
import { TemporalStrategy } from './TemporalStrategy.js';
import { TopicalStrategy } from './TopicalStrategy.js';
import { EntityCentricStrategy } from './EntityCentricStrategy.js';
/**
 * Hybrid assembly strategy implementation
 */
export class HybridStrategy extends AssemblyStrategy {
    temporalStrategy;
    topicalStrategy;
    entityStrategy;
    constructor() {
        super('hybrid');
        this.temporalStrategy = new TemporalStrategy();
        this.topicalStrategy = new TopicalStrategy();
        this.entityStrategy = new EntityCentricStrategy();
    }
    /**
     * Select items using adaptive hybrid approach
     */
    async selectItems(scoredItems, request, budget) {
        // Analyze request to determine strategy weights
        const strategyWeights = this.analyzeRequestForStrategies(request, scoredItems);
        // Get strategy criteria
        const criteria = this.getHybridCriteria(request, strategyWeights);
        // Filter by minimum relevance
        const relevantItems = this.filterByRelevance(scoredItems, criteria.minRelevance);
        if (relevantItems.length === 0) {
            return [];
        }
        // If one strategy dominates, use it primarily
        const dominantStrategy = this.findDominantStrategy(strategyWeights);
        if (dominantStrategy && dominantStrategy.weight > 0.7) {
            return this.executeSingleStrategy(dominantStrategy.strategy, relevantItems, request, budget);
        }
        // Execute hybrid selection combining multiple strategies
        return this.executeHybridSelection(relevantItems, request, budget, strategyWeights, criteria);
    }
    /**
     * Analyze request to determine strategy weights
     */
    analyzeRequestForStrategies(request, items) {
        const weights = [];
        // Analyze temporal suitability
        const temporalWeight = this.calculateTemporalWeight(request, items);
        weights.push({
            strategy: 'temporal',
            weight: temporalWeight.weight,
            reason: temporalWeight.reason
        });
        // Analyze topical suitability
        const topicalWeight = this.calculateTopicalWeight(request, items);
        weights.push({
            strategy: 'topical',
            weight: topicalWeight.weight,
            reason: topicalWeight.reason
        });
        // Analyze entity-centric suitability
        const entityWeight = this.calculateEntityWeight(request, items);
        weights.push({
            strategy: 'entity-centric',
            weight: entityWeight.weight,
            reason: entityWeight.reason
        });
        // Normalize weights so they sum to 1
        const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
        if (totalWeight > 0) {
            weights.forEach(w => w.weight = w.weight / totalWeight);
        }
        return weights.sort((a, b) => b.weight - a.weight);
    }
    /**
     * Calculate temporal strategy weight
     */
    calculateTemporalWeight(request, items) {
        let weight = 0.2; // Base weight
        const reasons = [];
        // Check if temporal strategy thinks it's suitable
        if (this.temporalStrategy.isSuitableFor(request)) {
            weight += 0.4;
            reasons.push('temporal keywords detected');
        }
        // Check for recent content emphasis
        if (request.includeRecent) {
            weight += 0.2;
            reasons.push('recent content requested');
        }
        // Check conversation-specific requests
        if (request.conversationId) {
            weight += 0.1;
            reasons.push('conversation-specific query');
        }
        // Check time window
        if (request.timeWindow && request.timeWindow < 7 * 24 * 60 * 60 * 1000) {
            weight += 0.2;
            reasons.push('narrow time window');
        }
        // Analyze item timestamps
        const recentItemsRatio = this.calculateRecentItemsRatio(items);
        if (recentItemsRatio > 0.5) {
            weight += 0.1;
            reasons.push('many recent items available');
        }
        return {
            weight: Math.min(1, weight),
            reason: reasons.join(', ') || 'default temporal weight'
        };
    }
    /**
     * Calculate topical strategy weight
     */
    calculateTopicalWeight(request, items) {
        let weight = 0.3; // Base weight (higher as it's generally useful)
        const reasons = [];
        // Check if topical strategy thinks it's suitable
        if (this.topicalStrategy.isSuitableFor(request)) {
            weight += 0.4;
            reasons.push('topical keywords detected');
        }
        // Check for broad, exploratory queries
        if (this.isBroadQuery(request.query)) {
            weight += 0.2;
            reasons.push('broad query benefits from organization');
        }
        // Check content diversity
        const topicDiversity = this.calculateTopicDiversity(items);
        if (topicDiversity > 0.6) {
            weight += 0.2;
            reasons.push('diverse content benefits from clustering');
        }
        // Research-oriented queries
        if (this.isResearchQuery(request.query)) {
            weight += 0.2;
            reasons.push('research query benefits from topical organization');
        }
        return {
            weight: Math.min(1, weight),
            reason: reasons.join(', ') || 'default topical weight'
        };
    }
    /**
     * Calculate entity-centric strategy weight
     */
    calculateEntityWeight(request, items) {
        let weight = 0.1; // Base weight
        const reasons = [];
        // Check if entity strategy thinks it's suitable
        if (this.entityStrategy.isSuitableFor(request)) {
            weight += 0.5;
            reasons.push('entity-related query detected');
        }
        // Check for explicit focus entities
        if (request.focusEntities && request.focusEntities.length > 0) {
            weight += 0.3;
            reasons.push('explicit focus entities provided');
        }
        // Check entity density in query
        const entityDensity = this.calculateEntityDensityInQuery(request.query);
        if (entityDensity > 0.3) {
            weight += 0.2;
            reasons.push('high entity density in query');
        }
        // Check entity richness in content
        const entityRichness = this.calculateEntityRichnessInContent(items);
        if (entityRichness > 0.4) {
            weight += 0.1;
            reasons.push('entity-rich content available');
        }
        return {
            weight: Math.min(1, weight),
            reason: reasons.join(', ') || 'default entity weight'
        };
    }
    /**
     * Get hybrid-specific criteria
     */
    getHybridCriteria(request, strategyWeights) {
        const dominantStrategy = strategyWeights[0];
        // Base criteria on dominant strategy
        let maxItems = 20;
        let minRelevance = 0.3;
        let diversityFactor = 0.4;
        let summaryMessageRatio = 0.4;
        // Adjust based on dominant strategy
        switch (dominantStrategy.strategy) {
            case 'temporal':
                maxItems = 18;
                minRelevance = 0.25;
                diversityFactor = 0.3;
                summaryMessageRatio = 0.3;
                break;
            case 'topical':
                maxItems = 22;
                minRelevance = 0.3;
                diversityFactor = 0.4;
                summaryMessageRatio = 0.5;
                break;
            case 'entity-centric':
                maxItems = 20;
                minRelevance = 0.25;
                diversityFactor = 0.3;
                summaryMessageRatio = 0.4;
                break;
        }
        return {
            maxItems,
            minRelevance: request.minRelevance || minRelevance,
            diversityFactor,
            preferRecent: request.includeRecent || false,
            summaryMessageRatio
        };
    }
    /**
     * Find strategy with dominant weight
     */
    findDominantStrategy(weights) {
        if (weights.length === 0)
            return null;
        const strongest = weights[0];
        return strongest.weight > 0.7 ? strongest : null;
    }
    /**
     * Execute single strategy when one dominates
     */
    async executeSingleStrategy(strategyType, items, request, budget) {
        switch (strategyType) {
            case 'temporal':
                return this.temporalStrategy.selectItems(items, request, budget);
            case 'topical':
                return this.topicalStrategy.selectItems(items, request, budget);
            case 'entity-centric':
                return this.entityStrategy.selectItems(items, request, budget);
            default:
                return items.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 20);
        }
    }
    /**
     * Execute hybrid selection combining multiple strategies
     */
    async executeHybridSelection(items, request, budget, strategyWeights, criteria) {
        const selectedItems = new Map();
        const maxItems = criteria.maxItems;
        // Calculate items per strategy based on weights
        const itemsPerStrategy = strategyWeights.map(sw => ({
            strategy: sw.strategy,
            weight: sw.weight,
            itemCount: Math.max(1, Math.floor(maxItems * sw.weight))
        }));
        // Execute each strategy and collect items
        for (const strategyInfo of itemsPerStrategy) {
            if (strategyInfo.itemCount === 0)
                continue;
            let strategyItems = [];
            try {
                // Create limited budget for this strategy
                const strategyBudget = this.createSubBudget(budget, strategyInfo.weight);
                switch (strategyInfo.strategy) {
                    case 'temporal':
                        strategyItems = await this.temporalStrategy.selectItems(items, request, strategyBudget);
                        break;
                    case 'topical':
                        strategyItems = await this.topicalStrategy.selectItems(items, request, strategyBudget);
                        break;
                    case 'entity-centric':
                        strategyItems = await this.entityStrategy.selectItems(items, request, strategyBudget);
                        break;
                }
                // Add items from this strategy (up to allocation)
                const itemsToAdd = strategyItems.slice(0, strategyInfo.itemCount);
                for (const item of itemsToAdd) {
                    if (!selectedItems.has(item.id)) {
                        selectedItems.set(item.id, {
                            ...item,
                            relevanceScore: item.relevanceScore + (strategyInfo.weight * 0.1) // Small boost for strategy preference
                        });
                    }
                }
            }
            catch (error) {
                console.warn(`Hybrid strategy failed to execute ${strategyInfo.strategy}:`, error);
            }
        }
        // Convert to array and apply final ranking
        const hybridItems = Array.from(selectedItems.values());
        // Apply diversity if we have too many items
        const finalItems = hybridItems.length > maxItems
            ? this.applyDiversitySelection(hybridItems, criteria.diversityFactor, maxItems)
            : hybridItems;
        // Final sort by adjusted relevance scores
        return finalItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    /**
     * Create sub-budget for strategy
     */
    createSubBudget(budget, weight) {
        return {
            total: Math.floor(budget.total * weight),
            query: budget.query, // Keep query budget constant
            summaries: Math.floor(budget.summaries * weight),
            messages: Math.floor(budget.messages * weight),
            metadata: Math.floor(budget.metadata * weight),
            buffer: Math.floor(budget.buffer * weight)
        };
    }
    /**
     * Calculate ratio of recent items
     */
    calculateRecentItemsRatio(items) {
        if (items.length === 0)
            return 0;
        const now = Date.now();
        const recentThreshold = 24 * 60 * 60 * 1000; // 24 hours
        const recentItems = items.filter(item => now - item.createdAt < recentThreshold);
        return recentItems.length / items.length;
    }
    /**
     * Calculate topic diversity in items
     */
    calculateTopicDiversity(items) {
        if (items.length < 2)
            return 0;
        // Simple diversity measure based on conversation spread
        const conversations = new Set(items.map(item => item.conversationId));
        const conversationDiversity = conversations.size / Math.min(items.length, 10);
        // Content type diversity
        const summaries = items.filter(item => item.type === 'summary').length;
        const messages = items.filter(item => item.type === 'message').length;
        const typeDiversity = Math.min(summaries, messages) / (Math.max(summaries, messages) || 1);
        return (conversationDiversity + typeDiversity) / 2;
    }
    /**
     * Check if query is broad
     */
    isBroadQuery(query) {
        const broadIndicators = [
            'explain', 'overview', 'summary', 'about', 'tell me about',
            'what is', 'how does', 'why does', 'what are'
        ];
        const queryLower = query.toLowerCase();
        return broadIndicators.some(indicator => queryLower.includes(indicator));
    }
    /**
     * Check if query is research-oriented
     */
    isResearchQuery(query) {
        const researchIndicators = [
            'research', 'study', 'analysis', 'compare', 'contrast',
            'investigate', 'examine', 'explore', 'find out'
        ];
        const queryLower = query.toLowerCase();
        return researchIndicators.some(indicator => queryLower.includes(indicator));
    }
    /**
     * Calculate entity density in query
     */
    calculateEntityDensityInQuery(query) {
        // Simple entity detection based on capitalized words
        const words = query.split(/\s+/);
        const capitalizedWords = words.filter(word => /^[A-Z][a-z]+/.test(word) && word.length > 2);
        return words.length > 0 ? capitalizedWords.length / words.length : 0;
    }
    /**
     * Calculate entity richness in content
     */
    calculateEntityRichnessInContent(items) {
        if (items.length === 0)
            return 0;
        let totalEntityMentions = 0;
        let totalWords = 0;
        for (const item of items) {
            const words = item.content.split(/\s+/);
            totalWords += words.length;
            // Count capitalized words as potential entities
            const entities = words.filter(word => /^[A-Z][a-z]+/.test(word) && word.length > 2);
            totalEntityMentions += entities.length;
        }
        return totalWords > 0 ? totalEntityMentions / totalWords : 0;
    }
    /**
     * Get strategy description
     */
    getDescription() {
        return 'Adaptively combines temporal, topical, and entity-centric approaches based on query analysis. Best for general-purpose context assembly.';
    }
    /**
     * Check if strategy is suitable for the request
     */
    isSuitableFor(_request) {
        // Hybrid strategy is always suitable as it adapts to the request
        return true;
    }
}
//# sourceMappingURL=HybridStrategy.js.map