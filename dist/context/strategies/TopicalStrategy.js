/**
 * Topical Strategy - Semantic clustering and grouping
 *
 * This strategy groups content by topics and themes,
 * making it ideal for research and knowledge exploration.
 */
import { AssemblyStrategy } from './AssemblyStrategy.js';
/**
 * Topical assembly strategy implementation
 */
export class TopicalStrategy extends AssemblyStrategy {
    constructor() {
        super('topical');
    }
    /**
     * Select items with topical clustering
     */
    async selectItems(scoredItems, request, _budget) {
        // Get strategy criteria
        const criteria = this.getTopicalCriteria(request);
        // Filter by minimum relevance
        const relevantItems = this.filterByRelevance(scoredItems, criteria.minRelevance);
        if (relevantItems.length === 0) {
            return [];
        }
        // Create topic clusters
        const clusters = await this.createTopicClusters(relevantItems, request);
        // Rank clusters by relevance and coherence
        const rankedClusters = this.rankClusters(clusters, request);
        // Select items from top clusters
        const selectedItems = this.selectFromClusters(rankedClusters, criteria, request);
        // Apply diversity selection within selection
        const diverseItems = criteria.diversityFactor > 0
            ? this.applyDiversitySelection(selectedItems, criteria.diversityFactor, criteria.maxItems)
            : selectedItems.slice(0, criteria.maxItems);
        // Final topical ordering
        return this.applyTopicalOrdering(diverseItems, clusters);
    }
    /**
     * Get topical-specific selection criteria
     */
    getTopicalCriteria(request) {
        return {
            maxItems: this.calculateMaxItems(request),
            minRelevance: request.minRelevance || 0.3, // Higher threshold for topical coherence
            diversityFactor: 0.4, // Moderate diversity to balance coherence and variety
            preferRecent: false,
            summaryMessageRatio: 0.5 // Equal balance for topical exploration
        };
    }
    /**
     * Calculate maximum items for topical strategy
     */
    calculateMaxItems(request) {
        let maxItems = 20; // Base number for topic exploration
        // Increase for entity-focused queries
        if (request.focusEntities && request.focusEntities.length > 0) {
            maxItems += request.focusEntities.length * 2;
        }
        // Increase for broad queries that need more context
        if (this.isBroadQuery(request.query)) {
            maxItems += 5;
        }
        return Math.min(maxItems, 30); // Cap at 30 for performance
    }
    /**
     * Create topic clusters from items
     */
    async createTopicClusters(items, _request) {
        // Extract keywords from all items
        const itemKeywords = items.map(item => ({
            item,
            keywords: this.extractKeywords(item.content)
        }));
        // Group items by keyword similarity
        const clusters = [];
        const processedItems = new Set();
        for (const { item, keywords } of itemKeywords) {
            if (processedItems.has(item.id)) {
                continue;
            }
            // Find or create cluster for this item
            let bestCluster = null;
            let bestSimilarity = 0;
            for (const cluster of clusters) {
                const similarity = this.calculateKeywordSimilarity(keywords, cluster.keywords);
                if (similarity > bestSimilarity && similarity > 0.3) { // Minimum similarity threshold
                    bestSimilarity = similarity;
                    bestCluster = cluster;
                }
            }
            if (bestCluster) {
                // Add to existing cluster
                bestCluster.items.push(item);
                bestCluster.totalRelevance += item.relevanceScore;
                bestCluster.avgRelevance = bestCluster.totalRelevance / bestCluster.items.length;
                bestCluster.keywords = this.mergeKeywords(bestCluster.keywords, keywords);
            }
            else {
                // Create new cluster
                const theme = this.generateTheme(keywords, item.content);
                clusters.push({
                    id: `cluster_${clusters.length}`,
                    theme,
                    items: [item],
                    avgRelevance: item.relevanceScore,
                    totalRelevance: item.relevanceScore,
                    keywords
                });
            }
            processedItems.add(item.id);
        }
        // Add remaining items to best matching clusters or create single-item clusters
        for (const { item, keywords } of itemKeywords) {
            if (processedItems.has(item.id)) {
                continue;
            }
            const theme = this.generateTheme(keywords, item.content);
            clusters.push({
                id: `cluster_${clusters.length}`,
                theme,
                items: [item],
                avgRelevance: item.relevanceScore,
                totalRelevance: item.relevanceScore,
                keywords
            });
        }
        return clusters;
    }
    /**
     * Extract keywords from content
     */
    extractKeywords(content) {
        // Simple keyword extraction - could be enhanced with TF-IDF or more sophisticated NLP
        const words = this.extractWords(content);
        // Filter for meaningful keywords (longer words, technical terms, etc.)
        const keywords = words.filter(word => {
            return word.length >= 4 && // Minimum length
                !this.isCommonWord(word) && // Not too common
                /^[a-zA-Z]+$/.test(word); // Letters only
        });
        // Count frequency and return most frequent
        const wordCount = new Map();
        for (const word of keywords) {
            wordCount.set(word, (wordCount.get(word) || 0) + 1);
        }
        // Sort by frequency and return top keywords
        return Array.from(wordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10) // Top 10 keywords
            .map(([word]) => word);
    }
    /**
     * Check if word is too common to be a good keyword
     */
    isCommonWord(word) {
        const commonWords = [
            'this', 'that', 'with', 'have', 'will', 'from', 'they', 'know',
            'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when',
            'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over',
            'such', 'take', 'than', 'them', 'well', 'were', 'work', 'your',
            'think', 'about', 'after', 'again', 'before', 'being', 'below',
            'between', 'during', 'under', 'while', 'through', 'where', 'which'
        ];
        return commonWords.includes(word.toLowerCase());
    }
    /**
     * Calculate keyword similarity between two keyword sets
     */
    calculateKeywordSimilarity(keywords1, keywords2) {
        if (keywords1.length === 0 && keywords2.length === 0) {
            return 1.0;
        }
        if (keywords1.length === 0 || keywords2.length === 0) {
            return 0.0;
        }
        const set1 = new Set(keywords1);
        const set2 = new Set(keywords2);
        const intersection = new Set([...set1].filter(word => set2.has(word)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    /**
     * Merge keyword sets, keeping most frequent
     */
    mergeKeywords(keywords1, keywords2) {
        const combined = [...keywords1, ...keywords2];
        const wordCount = new Map();
        for (const word of combined) {
            wordCount.set(word, (wordCount.get(word) || 0) + 1);
        }
        return Array.from(wordCount.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 15) // Top 15 merged keywords
            .map(([word]) => word);
    }
    /**
     * Generate theme name for a cluster
     */
    generateTheme(keywords, _sampleContent) {
        if (keywords.length === 0) {
            return 'General Discussion';
        }
        // Take top 2-3 keywords
        const topKeywords = keywords.slice(0, 3);
        // Create theme name
        if (topKeywords.length === 1) {
            return this.capitalizeWord(topKeywords[0]);
        }
        else if (topKeywords.length === 2) {
            return `${this.capitalizeWord(topKeywords[0])} & ${this.capitalizeWord(topKeywords[1])}`;
        }
        else {
            return `${this.capitalizeWord(topKeywords[0])}, ${this.capitalizeWord(topKeywords[1])} & ${this.capitalizeWord(topKeywords[2])}`;
        }
    }
    /**
     * Capitalize first letter of word
     */
    capitalizeWord(word) {
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }
    /**
     * Rank clusters by relevance and coherence
     */
    rankClusters(clusters, _request) {
        return clusters.sort((a, b) => {
            // Primary sort by average relevance
            const relevanceDiff = b.avgRelevance - a.avgRelevance;
            if (Math.abs(relevanceDiff) > 0.1) {
                return relevanceDiff;
            }
            // Secondary sort by cluster size (more items = more comprehensive)
            const sizeDiff = b.items.length - a.items.length;
            if (sizeDiff !== 0) {
                return sizeDiff;
            }
            // Tertiary sort by total relevance
            return b.totalRelevance - a.totalRelevance;
        });
    }
    /**
     * Select items from top clusters
     */
    selectFromClusters(clusters, criteria, _request) {
        const selectedItems = [];
        const maxItems = criteria.maxItems;
        // Distribute items across top clusters
        const topClusters = clusters.slice(0, Math.min(5, clusters.length)); // Top 5 clusters
        if (topClusters.length === 0) {
            return [];
        }
        // Calculate items per cluster
        const baseItemsPerCluster = Math.floor(maxItems / topClusters.length);
        let remainingItems = maxItems;
        for (let i = 0; i < topClusters.length && remainingItems > 0; i++) {
            const cluster = topClusters[i];
            // Calculate how many items to take from this cluster
            let itemsToTake = baseItemsPerCluster;
            // Give extra items to the first (best) clusters
            if (i === 0 && remainingItems > itemsToTake) {
                itemsToTake = Math.min(itemsToTake + 3, remainingItems);
            }
            else if (i === 1 && remainingItems > itemsToTake) {
                itemsToTake = Math.min(itemsToTake + 2, remainingItems);
            }
            // Take the highest-scoring items from this cluster
            const clusterItems = cluster.items
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, Math.min(itemsToTake, cluster.items.length));
            selectedItems.push(...clusterItems);
            remainingItems -= clusterItems.length;
        }
        // Fill remaining slots with best items from any cluster
        if (remainingItems > 0) {
            const allRemainingItems = clusters
                .flatMap(cluster => cluster.items)
                .filter(item => !selectedItems.some(selected => selected.id === item.id))
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, remainingItems);
            selectedItems.push(...allRemainingItems);
        }
        return selectedItems;
    }
    /**
     * Apply topical ordering to final selection
     */
    applyTopicalOrdering(items, clusters) {
        // Group items back by their clusters
        const itemClusterMap = new Map();
        for (const cluster of clusters) {
            for (const item of cluster.items) {
                itemClusterMap.set(item.id, cluster);
            }
        }
        // Group selected items by cluster
        const clusterGroups = new Map();
        for (const item of items) {
            const cluster = itemClusterMap.get(item.id);
            if (cluster) {
                const clusterId = cluster.id;
                if (!clusterGroups.has(clusterId)) {
                    clusterGroups.set(clusterId, []);
                }
                clusterGroups.get(clusterId).push(item);
            }
        }
        // Order items by cluster priority, then by relevance within cluster
        const orderedItems = [];
        // Process clusters in order of their ranking
        const sortedClusters = clusters
            .filter(cluster => clusterGroups.has(cluster.id))
            .sort((a, b) => b.avgRelevance - a.avgRelevance);
        for (const cluster of sortedClusters) {
            const clusterItems = clusterGroups.get(cluster.id) || [];
            // Sort items within cluster by relevance
            clusterItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
            orderedItems.push(...clusterItems);
        }
        return orderedItems;
    }
    /**
     * Check if query is broad and would benefit from topical organization
     */
    isBroadQuery(query) {
        const broadIndicators = [
            'explain', 'overview', 'summary', 'about', 'regarding', 'concerning',
            'related to', 'information about', 'tell me about', 'what is',
            'how does', 'why does', 'what are the'
        ];
        const queryLower = query.toLowerCase();
        return broadIndicators.some(indicator => queryLower.includes(indicator));
    }
    /**
     * Get strategy description
     */
    getDescription() {
        return 'Groups content by topics and themes. Best for research and knowledge exploration queries.';
    }
    /**
     * Check if strategy is suitable for the request
     */
    isSuitableFor(request) {
        const query = request.query.toLowerCase();
        // Topical indicators
        const topicalKeywords = [
            'explain', 'overview', 'summary', 'about', 'compare', 'contrast',
            'difference', 'similar', 'related', 'category', 'type', 'kind',
            'research', 'study', 'analysis', 'examine', 'explore'
        ];
        const hasTopicalKeywords = topicalKeywords.some(keyword => query.includes(keyword));
        // Entity-focused queries benefit from topical grouping
        const hasEntityFocus = request.focusEntities && request.focusEntities.length > 0;
        // Broad queries benefit from topical organization
        const isBroad = this.isBroadQuery(query);
        return hasTopicalKeywords || hasEntityFocus || isBroad;
    }
}
//# sourceMappingURL=TopicalStrategy.js.map