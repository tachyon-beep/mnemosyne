/**
 * Entity-Centric Strategy - Focus on mentioned entities
 *
 * This strategy prioritizes content that mentions specific entities,
 * making it ideal for queries about people, places, products, or concepts.
 */
import { AssemblyStrategy } from './AssemblyStrategy.js';
/**
 * Entity-centric assembly strategy implementation
 */
export class EntityCentricStrategy extends AssemblyStrategy {
    entityPatterns = new Map();
    constructor() {
        super('entity-centric');
        this.initializeEntityPatterns();
    }
    /**
     * Initialize entity recognition patterns
     */
    initializeEntityPatterns() {
        this.entityPatterns = new Map();
        // Person names (simple pattern)
        this.entityPatterns.set('person', [
            /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // First Last
            /\b[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+\b/g, // First M. Last
            /\b(Mr|Ms|Mrs|Dr|Prof)\. [A-Z][a-z]+\b/g // Title Name
        ]);
        // Organizations
        this.entityPatterns.set('organization', [
            /\b[A-Z][A-Z0-9&]+(?:\s+[A-Z][A-Za-z]+)*\b/g, // IBM, AT&T, etc.
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|Corp|LLC|Ltd|Co)\b/g, // Company Inc
            /\b[A-Z][a-z]+\s+(?:University|College|Institute)\b/g // Educational institutions
        ]);
        // Products/Technologies
        this.entityPatterns.set('product', [
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+\d+(?:\.\d+)*\b/g, // Version numbers
            /\b[A-Z][a-z]+(?:[A-Z][a-z]*)*\b/g // CamelCase products
        ]);
        // Technical terms
        this.entityPatterns.set('technical', [
            /\b[a-z]+\([^)]*\)/g, // Functions
            /\b[A-Z]{2,}(?:[A-Z][a-z]*)*\b/g, // Acronyms like HTTP, API
            /\b\w+\.\w+(?:\.\w+)*\b/g, // Namespaces/domains
            /\b[a-zA-Z_]\w*::[a-zA-Z_]\w*\b/g // C++ style namespaces
        ]);
        // Locations
        this.entityPatterns.set('location', [
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2}\b/g, // City, ST
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/g
        ]);
        // Concepts (capitalized multi-word terms)
        this.entityPatterns.set('concept', [
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g // Multi-word concepts
        ]);
    }
    /**
     * Select items with entity-centric prioritization
     */
    async selectItems(scoredItems, request, _budget) {
        // Get strategy criteria
        const criteria = this.getEntityCentricCriteria(request);
        // Filter by minimum relevance
        const relevantItems = this.filterByRelevance(scoredItems, criteria.minRelevance);
        if (relevantItems.length === 0) {
            return [];
        }
        // Extract entities from query and focus entities
        const targetEntities = this.extractTargetEntities(request);
        if (targetEntities.length === 0) {
            // Fall back to relevance-based selection if no entities found
            return relevantItems
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, criteria.maxItems);
        }
        // Score items based on entity mentions
        const entityScoredItems = this.scoreItemsByEntityMentions(relevantItems, targetEntities);
        // Apply diversity selection to avoid entity echo chambers
        const diverseItems = criteria.diversityFactor > 0
            ? this.applyDiversitySelection(entityScoredItems, criteria.diversityFactor, criteria.maxItems)
            : entityScoredItems.slice(0, criteria.maxItems);
        // Balance between summaries and messages
        const balanced = this.balanceTypeSelection(diverseItems, criteria.summaryMessageRatio, criteria.maxItems);
        // Final entity-centric ordering
        return this.applyEntityCentricOrdering(balanced, targetEntities);
    }
    /**
     * Get entity-centric selection criteria
     */
    getEntityCentricCriteria(request) {
        return {
            maxItems: this.calculateMaxItems(request),
            minRelevance: request.minRelevance || 0.25, // Moderate threshold
            diversityFactor: 0.3, // Moderate diversity to avoid entity repetition
            preferRecent: false,
            summaryMessageRatio: 0.4 // Favor messages for entity details
        };
    }
    /**
     * Calculate maximum items for entity-centric strategy
     */
    calculateMaxItems(request) {
        let maxItems = 18; // Base number
        // Increase for multiple focus entities
        if (request.focusEntities && request.focusEntities.length > 1) {
            maxItems += request.focusEntities.length * 2;
        }
        // Increase for entity-rich queries
        const entityCount = this.countEntitiesInQuery(request.query);
        if (entityCount > 2) {
            maxItems += entityCount;
        }
        return Math.min(maxItems, 25); // Cap for performance
    }
    /**
     * Extract target entities from request
     */
    extractTargetEntities(request) {
        const entities = new Set();
        // Add focus entities
        if (request.focusEntities) {
            for (const entity of request.focusEntities) {
                entities.add(entity.toLowerCase().trim());
            }
        }
        // Extract entities from query
        const queryEntities = this.extractEntitiesFromText(request.query);
        for (const entity of queryEntities) {
            entities.add(entity.normalizedEntity);
        }
        return Array.from(entities);
    }
    /**
     * Extract entities from text with type classification
     */
    extractEntitiesFromText(text) {
        const entities = [];
        const processed = new Set();
        for (const [entityType, patterns] of this.entityPatterns) {
            for (const pattern of patterns) {
                const matches = text.matchAll(pattern);
                for (const match of matches) {
                    if (match[0] && match.index !== undefined) {
                        const entity = match[0].trim();
                        const normalized = entity.toLowerCase();
                        if (processed.has(normalized) || entity.length < 2) {
                            continue;
                        }
                        processed.add(normalized);
                        // Count occurrences and find positions
                        const allMatches = [...text.matchAll(new RegExp(this.escapeRegex(entity), 'gi'))];
                        entities.push({
                            entity,
                            normalizedEntity: normalized,
                            count: allMatches.length,
                            positions: allMatches.map(m => m.index),
                            type: entityType
                        });
                    }
                }
            }
        }
        return entities.sort((a, b) => b.count - a.count); // Sort by frequency
    }
    /**
     * Escape special regex characters
     */
    escapeRegex(text) {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Score items based on entity mentions
     */
    scoreItemsByEntityMentions(items, targetEntities) {
        return items.map(item => {
            const entityScore = this.calculateEntityScore(item.content, targetEntities);
            const combinedScore = (item.relevanceScore * 0.6) + (entityScore * 0.4);
            return {
                ...item,
                entityScore,
                relevanceScore: combinedScore // Update relevance score with entity weighting
            };
        }).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    /**
     * Calculate entity score for content
     */
    calculateEntityScore(content, targetEntities) {
        if (targetEntities.length === 0) {
            return 0;
        }
        const contentLower = content.toLowerCase();
        let totalScore = 0;
        let maxPossibleScore = 0;
        for (const entity of targetEntities) {
            maxPossibleScore += 1;
            // Exact matches get full points
            const exactMatches = (contentLower.match(new RegExp(this.escapeRegex(entity), 'g')) || []).length;
            if (exactMatches > 0) {
                totalScore += Math.min(1, exactMatches * 0.3); // Diminishing returns for multiple mentions
                continue;
            }
            // Partial matches get partial points
            const entityWords = entity.split(/\s+/);
            if (entityWords.length > 1) {
                const partialMatches = entityWords.filter(word => contentLower.includes(word) && word.length > 2).length;
                if (partialMatches > 0) {
                    totalScore += (partialMatches / entityWords.length) * 0.7; // 70% for partial matches
                }
            }
        }
        return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
    }
    /**
     * Count entities in query
     */
    countEntitiesInQuery(query) {
        const entities = this.extractEntitiesFromText(query);
        return entities.length;
    }
    /**
     * Apply entity-centric ordering
     */
    applyEntityCentricOrdering(items, targetEntities) {
        // Group items by entity mentions
        const entityGroups = this.groupItemsByEntityMentions(items, targetEntities);
        const orderedItems = [];
        // Process entity groups in order of importance
        const sortedEntityGroups = Array.from(entityGroups.entries())
            .sort((a, b) => {
            // Sort by number of items mentioning this entity
            return b[1].length - a[1].length;
        });
        const processedItems = new Set();
        // Add items from entity groups
        for (const [, groupItems] of sortedEntityGroups) {
            const unprocessedItems = groupItems.filter(item => !processedItems.has(item.id));
            // Sort items within group by relevance
            unprocessedItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
            // Add up to 3 items per entity to avoid over-concentration
            const itemsToAdd = unprocessedItems.slice(0, 3);
            for (const item of itemsToAdd) {
                if (!processedItems.has(item.id)) {
                    orderedItems.push(item);
                    processedItems.add(item.id);
                }
            }
        }
        // Add any remaining items
        const remainingItems = items.filter(item => !processedItems.has(item.id));
        remainingItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
        orderedItems.push(...remainingItems);
        return orderedItems;
    }
    /**
     * Group items by entity mentions
     */
    groupItemsByEntityMentions(items, targetEntities) {
        const groups = new Map();
        for (const entity of targetEntities) {
            groups.set(entity, []);
        }
        for (const item of items) {
            const contentLower = item.content.toLowerCase();
            for (const entity of targetEntities) {
                if (contentLower.includes(entity)) {
                    groups.get(entity).push(item);
                }
            }
        }
        return groups;
    }
    /**
     * Get strategy description
     */
    getDescription() {
        return 'Focuses on content mentioning specific entities. Best for queries about people, places, products, or concepts.';
    }
    /**
     * Check if strategy is suitable for the request
     */
    isSuitableFor(request) {
        // Has explicit focus entities
        if (request.focusEntities && request.focusEntities.length > 0) {
            return true;
        }
        // Query contains named entities
        const entityCount = this.countEntitiesInQuery(request.query);
        if (entityCount > 0) {
            return true;
        }
        // Entity-related query patterns
        const query = request.query.toLowerCase();
        const entityKeywords = [
            'who is', 'what is', 'about', 'regarding', 'concerning',
            'tell me about', 'information about', 'details about',
            'company', 'person', 'product', 'service', 'organization'
        ];
        const hasEntityKeywords = entityKeywords.some(keyword => query.includes(keyword));
        return hasEntityKeywords;
    }
}
//# sourceMappingURL=EntityCentricStrategy.js.map