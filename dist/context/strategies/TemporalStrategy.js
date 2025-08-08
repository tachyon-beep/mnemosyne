/**
 * Temporal Strategy - Recent-first with time decay
 *
 * This strategy prioritizes recent content with time-based decay,
 * making it ideal for queries about current state or recent changes.
 */
import { AssemblyStrategy } from './AssemblyStrategy.js';
/**
 * Temporal assembly strategy implementation
 */
export class TemporalStrategy extends AssemblyStrategy {
    constructor() {
        super('temporal');
    }
    /**
     * Select items with temporal prioritization
     */
    async selectItems(scoredItems, request, _budget) {
        // Get strategy criteria
        const criteria = this.getTemporalCriteria(request);
        // Filter by minimum relevance
        const relevantItems = this.filterByRelevance(scoredItems, criteria.minRelevance);
        if (relevantItems.length === 0) {
            return [];
        }
        // Apply temporal scoring boost
        const temporallyScored = this.applyTemporalScoring(relevantItems, request);
        // Sort by combined temporal + relevance score
        temporallyScored.sort((a, b) => {
            const scoreA = (a.relevanceScore * 0.7) + (a.temporalScore * 0.3);
            const scoreB = (b.relevanceScore * 0.7) + (b.temporalScore * 0.3);
            return scoreB - scoreA;
        });
        // Apply diversity selection if needed
        const diverseItems = criteria.diversityFactor > 0
            ? this.applyDiversitySelection(temporallyScored, criteria.diversityFactor, criteria.maxItems)
            : temporallyScored.slice(0, criteria.maxItems);
        // Balance between summaries and messages
        const balanced = this.balanceTypeSelection(diverseItems, criteria.summaryMessageRatio, criteria.maxItems);
        // Final temporal ordering within groups
        return this.applyFinalTemporalOrdering(balanced);
    }
    /**
     * Get temporal-specific selection criteria
     */
    getTemporalCriteria(request) {
        // const baseCriteria = this.getDefaultCriteria();
        return {
            maxItems: this.calculateMaxItems(request),
            minRelevance: request.minRelevance || 0.2, // Lower threshold for temporal strategy
            diversityFactor: 0.2, // Lower diversity to focus on recent items
            preferRecent: true,
            summaryMessageRatio: 0.3 // Favor messages for temporal strategy
        };
    }
    /**
     * Calculate maximum items based on time window and request
     */
    calculateMaxItems(request) {
        let maxItems = 15; // Base number
        // Increase for longer time windows
        if (request.timeWindow && request.timeWindow > 7 * 24 * 60 * 60 * 1000) {
            maxItems = 25;
        }
        // Increase for conversation-specific requests
        if (request.conversationId) {
            maxItems += 5;
        }
        // Increase for recent-focused queries
        if (request.includeRecent) {
            maxItems += 3;
        }
        return maxItems;
    }
    /**
     * Apply temporal scoring to items
     */
    applyTemporalScoring(items, request) {
        const now = Date.now();
        const timeWindow = request.timeWindow || (7 * 24 * 60 * 60 * 1000); // 7 days default
        return items.map(item => {
            const age = now - item.createdAt;
            const temporalScore = this.calculateTemporalScore(age, timeWindow);
            return {
                ...item,
                temporalScore
            };
        });
    }
    /**
     * Calculate temporal score based on age and time window
     */
    calculateTemporalScore(age, timeWindow) {
        if (age < 0) {
            return 1.0; // Future items get maximum score
        }
        // Items within the time window get full consideration
        if (age <= timeWindow) {
            // Exponential decay within the time window
            const decayRate = 0.5; // Half-life factor
            const normalizedAge = age / timeWindow;
            return Math.exp(-decayRate * normalizedAge);
        }
        // Items outside the time window get heavily penalized
        const excessAge = age - timeWindow;
        const penaltyDecayRate = 2.0; // Faster decay outside window
        const normalizedExcess = excessAge / timeWindow;
        return 0.1 * Math.exp(-penaltyDecayRate * normalizedExcess);
    }
    /**
     * Apply final temporal ordering to maintain chronological flow
     */
    applyFinalTemporalOrdering(items) {
        // Group by conversation
        const groupedItems = this.groupByConversation(items);
        const orderedItems = [];
        // Process each conversation group
        for (const [, groupItems] of groupedItems) {
            // Sort group items by timestamp (newest first for temporal strategy)
            const temporallySorted = groupItems.sort((a, b) => b.createdAt - a.createdAt);
            // For temporal strategy, interleave items to maintain flow
            orderedItems.push(...this.interleaveTemporalItems(temporallySorted));
        }
        // Final sort by relevance score to ensure best items are first
        return orderedItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    /**
     * Interleave items to maintain temporal flow while preserving relevance
     */
    interleaveTemporalItems(items) {
        if (items.length <= 3) {
            return items; // No need to interleave small groups
        }
        const summaries = items.filter(item => item.type === 'summary');
        const messages = items.filter(item => item.type === 'message');
        // Start with highest relevance summary if available
        const interleaved = [];
        if (summaries.length > 0) {
            interleaved.push(summaries[0]);
        }
        // Add recent messages
        const recentMessages = messages.slice(0, 3);
        interleaved.push(...recentMessages);
        // Add remaining summaries
        if (summaries.length > 1) {
            interleaved.push(...summaries.slice(1));
        }
        // Add remaining messages
        if (messages.length > 3) {
            interleaved.push(...messages.slice(3));
        }
        return interleaved;
    }
    /**
     * Get strategy description
     */
    getDescription() {
        return 'Prioritizes recent content with time-based decay. Best for queries about current state or recent changes.';
    }
    /**
     * Check if strategy is suitable for the request
     */
    isSuitableFor(request) {
        const query = request.query.toLowerCase();
        // Temporal indicators in query
        const temporalKeywords = [
            'recent', 'latest', 'current', 'now', 'today', 'yesterday',
            'this week', 'last', 'new', 'updated', 'changed', 'just'
        ];
        const hasTemporalKeywords = temporalKeywords.some(keyword => query.includes(keyword));
        // Time-sensitive requests
        const isTimeSensitive = request.includeRecent ||
            (request.timeWindow && request.timeWindow < 7 * 24 * 60 * 60 * 1000);
        // Conversation-specific requests often benefit from temporal ordering
        const isConversationSpecific = !!request.conversationId;
        return hasTemporalKeywords || isTimeSensitive || isConversationSpecific;
    }
}
//# sourceMappingURL=TemporalStrategy.js.map