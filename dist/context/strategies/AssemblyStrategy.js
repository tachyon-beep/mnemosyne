/**
 * Assembly Strategy - Base interface for context assembly strategies
 *
 * This module provides:
 * - Base interface for assembly strategies
 * - Common strategy utilities
 * - Strategy type definitions
 */
/**
 * Base assembly strategy interface
 */
export class AssemblyStrategy {
    strategyType;
    constructor(strategyType) {
        this.strategyType = strategyType;
    }
    /**
     * Get strategy type
     */
    getType() {
        return this.strategyType;
    }
    /**
     * Get default selection criteria for this strategy
     */
    getDefaultCriteria() {
        return {
            maxItems: 20,
            minRelevance: 0.3,
            diversityFactor: 0.3,
            preferRecent: false,
            summaryMessageRatio: 0.4 // 40% summaries, 60% messages
        };
    }
    /**
     * Filter items by minimum relevance
     */
    filterByRelevance(items, minRelevance) {
        return items.filter(item => item.relevanceScore >= minRelevance);
    }
    /**
     * Apply diversity selection to avoid redundancy
     */
    applyDiversitySelection(items, diversityFactor, maxItems) {
        if (diversityFactor <= 0 || items.length <= maxItems) {
            return items.slice(0, maxItems);
        }
        const selected = [];
        const remaining = [...items];
        // Always include the highest scoring item
        if (remaining.length > 0) {
            selected.push(remaining.shift());
        }
        while (selected.length < maxItems && remaining.length > 0) {
            let bestItem = null;
            let bestIndex = -1;
            let bestScore = -1;
            // Find item with best combination of relevance and diversity
            for (let i = 0; i < remaining.length; i++) {
                const item = remaining[i];
                const relevanceScore = item.relevanceScore;
                const diversityScore = this.calculateDiversityScore(item, selected);
                // Combine relevance and diversity scores
                const combinedScore = (relevanceScore * (1 - diversityFactor)) +
                    (diversityScore * diversityFactor);
                if (combinedScore > bestScore) {
                    bestScore = combinedScore;
                    bestItem = item;
                    bestIndex = i;
                }
            }
            if (bestItem) {
                selected.push(bestItem);
                remaining.splice(bestIndex, 1);
            }
            else {
                break;
            }
        }
        return selected;
    }
    /**
     * Calculate diversity score for an item compared to already selected items
     */
    calculateDiversityScore(item, selectedItems) {
        if (selectedItems.length === 0) {
            return 1.0; // Maximum diversity if no items selected yet
        }
        let totalSimilarity = 0;
        let comparisons = 0;
        for (const selected of selectedItems) {
            // Different types get diversity bonus
            if (item.type !== selected.type) {
                comparisons++;
                continue; // Skip similarity calculation, assume different
            }
            // Different conversations get diversity bonus
            if (item.conversationId !== selected.conversationId) {
                comparisons++;
                continue;
            }
            // Calculate content similarity (simple approach)
            const similarity = this.calculateContentSimilarity(item.content, selected.content);
            totalSimilarity += similarity;
            comparisons++;
        }
        // Return inverse of average similarity (higher diversity for less similar items)
        const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
        return 1 - avgSimilarity;
    }
    /**
     * Simple content similarity calculation
     */
    calculateContentSimilarity(content1, content2) {
        // Simple word overlap similarity
        const words1 = this.extractWords(content1);
        const words2 = this.extractWords(content2);
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(word => set2.has(word)));
        const union = new Set([...set1, ...set2]);
        return union.size > 0 ? intersection.size / union.size : 0;
    }
    /**
     * Extract meaningful words from content
     */
    extractWords(content) {
        return content
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(word => word.length > 2) // Filter out very short words
            .filter(word => !this.isStopWord(word));
    }
    /**
     * Check if word is a stop word
     */
    isStopWord(word) {
        const stopWords = [
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
            'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have',
            'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
            'may', 'might', 'can', 'this', 'that', 'these', 'those', 'i', 'you',
            'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
        ];
        return stopWords.includes(word);
    }
    /**
     * Balance selection between summaries and messages
     */
    balanceTypeSelection(items, summaryMessageRatio, maxItems) {
        const summaries = items.filter(item => item.type === 'summary');
        const messages = items.filter(item => item.type === 'message');
        const maxSummaries = Math.ceil(maxItems * summaryMessageRatio);
        const maxMessages = maxItems - maxSummaries;
        const selectedSummaries = summaries.slice(0, maxSummaries);
        const selectedMessages = messages.slice(0, maxMessages);
        // If one type has fewer items than allocated, give extra slots to the other
        const actualSummaries = selectedSummaries.length;
        const actualMessages = selectedMessages.length;
        if (actualSummaries < maxSummaries && messages.length > maxMessages) {
            const extraMessages = Math.min(maxSummaries - actualSummaries, messages.length - maxMessages);
            selectedMessages.push(...messages.slice(maxMessages, maxMessages + extraMessages));
        }
        else if (actualMessages < maxMessages && summaries.length > maxSummaries) {
            const extraSummaries = Math.min(maxMessages - actualMessages, summaries.length - maxSummaries);
            selectedSummaries.push(...summaries.slice(maxSummaries, maxSummaries + extraSummaries));
        }
        // Combine and sort by relevance
        const combined = [...selectedSummaries, ...selectedMessages];
        return combined.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    /**
     * Group items by conversation for better organization
     */
    groupByConversation(items) {
        const groups = new Map();
        for (const item of items) {
            const conversationId = item.conversationId;
            if (!groups.has(conversationId)) {
                groups.set(conversationId, []);
            }
            groups.get(conversationId).push(item);
        }
        // Sort items within each group by timestamp
        for (const [, groupItems] of groups) {
            groupItems.sort((a, b) => a.createdAt - b.createdAt);
        }
        return groups;
    }
    /**
     * Calculate time-based score boost for recent items
     */
    calculateRecencyBoost(createdAt, maxBoost = 0.1) {
        const now = Date.now();
        const age = now - createdAt;
        const oneDay = 24 * 60 * 60 * 1000;
        if (age < oneDay) {
            return maxBoost; // Full boost for items less than 1 day old
        }
        else if (age < oneDay * 7) {
            return maxBoost * (1 - (age - oneDay) / (oneDay * 6)); // Linear decay over 1 week
        }
        else {
            return 0; // No boost for items older than 1 week
        }
    }
}
//# sourceMappingURL=AssemblyStrategy.js.map