/**
 * Relationship Detection Service
 *
 * Analyzes entity co-occurrences and contextual patterns to detect
 * relationships between entities across conversations.
 */
/**
 * Relationship detector implementation
 */
export class RelationshipDetector {
    relationshipPatterns = [];
    config;
    constructor(config = {}) {
        this.config = {
            maxEntityDistance: 200, // characters
            maxSentenceDistance: 2, // sentences
            minCooccurrenceCount: 2,
            minConfidence: 0.4,
            enableTemporalAnalysis: true,
            temporalWindowDays: 30,
            ...config
        };
        this.initializePatterns();
    }
    /**
     * Detect relationships between entities in text
     */
    detectRelationships(entities, text, messageId, conversationId) {
        const relationships = [];
        // Find entity co-occurrences
        const cooccurrences = this.findEntityCooccurrences(entities, text, messageId, conversationId);
        // Analyze each co-occurrence for potential relationships
        for (const cooccurrence of cooccurrences) {
            const detectedRelationships = this.analyzeCooccurrence(cooccurrence);
            relationships.push(...detectedRelationships);
        }
        // Remove duplicates and merge evidence
        return this.mergeRelationships(relationships);
    }
    /**
     * Initialize relationship detection patterns
     */
    initializePatterns() {
        this.relationshipPatterns = [
            // Work relationships
            {
                type: 'works_for',
                patterns: [
                    /(\w+)\s+(?:works? (?:for|at)|employed (?:by|at)|hired by)\s+(\w+)/gi,
                    /(\w+)\s+(?:is|was)\s+(?:a|an|the)\s+[\w\s]*(?:employee|worker|staff|member)\s+(?:of|at)\s+(\w+)/gi,
                    /(\w+)['']s?\s+(?:employee|worker|staff|team member)\s+(\w+)/gi
                ],
                entityTypes: [['person'], ['organization']],
                contextWindow: 100,
                minConfidence: 0.7
            },
            // Creation relationships
            {
                type: 'created_by',
                patterns: [
                    /(\w+)\s+(?:created|developed|built|designed|authored|wrote)\s+(?:by\s+)?(\w+)/gi,
                    /(\w+)\s+(?:is|was)\s+(?:created|developed|built|designed)\s+by\s+(\w+)/gi,
                    /(\w+)['']s?\s+(?:creation|development|product)\s+(\w+)/gi
                ],
                entityTypes: [['product', 'technical'], ['person', 'organization']],
                contextWindow: 150,
                minConfidence: 0.8
            },
            // Discussion relationships
            {
                type: 'discussed_with',
                patterns: [
                    /(?:discussed|talked|spoke|met)\s+(?:with|to)\s+(\w+)\s+about\s+(\w+)/gi,
                    /(\w+)\s+and\s+(\w+)\s+(?:discussed|talked about|reviewed)/gi,
                    /(?:conversation|meeting|discussion)\s+(?:with|between)\s+(\w+)\s+and\s+(\w+)/gi
                ],
                entityTypes: [['person'], ['person']],
                contextWindow: 200,
                minConfidence: 0.6
            },
            // Part-of relationships
            {
                type: 'part_of',
                patterns: [
                    /(\w+)\s+(?:is|was)\s+(?:a )?(?:part of|component of|module of|feature of)\s+(\w+)/gi,
                    /(\w+)['']s?\s+(\w+)\s+(?:component|module|feature|part)/gi,
                    /(\w+)\s+(?:belongs to|is part of)\s+(\w+)/gi
                ],
                entityTypes: [['technical', 'product', 'concept'], ['technical', 'product', 'concept']],
                contextWindow: 100,
                minConfidence: 0.7
            },
            // Related-to (general relationships)
            {
                type: 'related_to',
                patterns: [
                    /(\w+)\s+(?:and|with|alongside)\s+(\w+)/gi,
                    /(?:both|either)\s+(\w+)\s+(?:and|or)\s+(\w+)/gi,
                    /(\w+)(?:,|\s+as well as)\s+(\w+)/gi
                ],
                entityTypes: [['concept', 'technical', 'product'], ['concept', 'technical', 'product']],
                contextWindow: 50,
                minConfidence: 0.3
            },
            // Mentioned together (co-occurrence)
            {
                type: 'mentioned_with',
                patterns: [],
                entityTypes: [['person', 'organization', 'product', 'concept'], ['person', 'organization', 'product', 'concept']],
                contextWindow: 300,
                minConfidence: 0.2
            },
            // Temporal sequences
            {
                type: 'temporal_sequence',
                patterns: [
                    /(\w+)\s+(?:before|after|then|next|following)\s+(\w+)/gi,
                    /(?:first|initially)\s+(\w+)(?:,|\s+then)\s+(\w+)/gi,
                    /(\w+)\s+(?:led to|resulted in|caused)\s+(\w+)/gi
                ],
                entityTypes: [['event', 'decision', 'concept'], ['event', 'decision', 'concept']],
                contextWindow: 150,
                minConfidence: 0.6
            },
            // Cause-effect relationships
            {
                type: 'cause_effect',
                patterns: [
                    /(\w+)\s+(?:caused|led to|resulted in|triggered)\s+(\w+)/gi,
                    /(?:because of|due to)\s+(\w+)(?:,|\s+we|\s+the)\s+(\w+)/gi,
                    /(\w+)\s+(?:impact(?:ed)?|affect(?:ed)?|influenced)\s+(\w+)/gi
                ],
                entityTypes: [['event', 'decision', 'concept'], ['event', 'decision', 'concept']],
                contextWindow: 200,
                minConfidence: 0.7
            }
        ];
    }
    /**
     * Find entity co-occurrences within reasonable distance
     */
    findEntityCooccurrences(entities, text, messageId, conversationId) {
        const cooccurrences = [];
        const sentences = this.splitIntoSentences(text);
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entity1 = entities[i];
                const entity2 = entities[j];
                // Calculate distances
                const charDistance = Math.abs(entity1.startPosition - entity2.startPosition);
                const sentenceDistance = this.calculateSentenceDistance(entity1, entity2, sentences);
                // Skip if entities are too far apart
                if (charDistance > this.config.maxEntityDistance ||
                    sentenceDistance > this.config.maxSentenceDistance) {
                    continue;
                }
                // Extract context around both entities
                const contextStart = Math.min(entity1.startPosition, entity2.startPosition) - 50;
                const contextEnd = Math.max(entity1.endPosition, entity2.endPosition) + 50;
                const context = text.substring(Math.max(0, contextStart), Math.min(text.length, contextEnd)).trim();
                cooccurrences.push({
                    entity1,
                    entity2,
                    distance: charDistance,
                    sentenceDistance,
                    context,
                    messageId,
                    conversationId
                });
            }
        }
        return cooccurrences;
    }
    /**
     * Analyze a co-occurrence for potential relationships
     */
    analyzeCooccurrence(cooccurrence) {
        const relationships = [];
        for (const pattern of this.relationshipPatterns) {
            // Check if entity types match pattern requirements
            if (!this.entityTypesMatch(cooccurrence.entity1.type, cooccurrence.entity2.type, pattern)) {
                continue;
            }
            let confidence = this.calculateBaseConfidence(cooccurrence, pattern);
            let evidence = [];
            // Pattern-based analysis
            if (pattern.patterns.length > 0) {
                const patternMatches = this.findPatternMatches(cooccurrence.context, pattern.patterns);
                if (patternMatches.length === 0) {
                    continue; // No pattern match found
                }
                confidence *= 1.2; // Boost confidence for explicit patterns
                evidence = patternMatches;
            }
            // Additional confidence adjustments
            confidence = this.adjustConfidenceByContext(confidence, cooccurrence, pattern);
            if (confidence >= pattern.minConfidence) {
                // Determine relationship direction
                const [sourceEntity, targetEntity] = this.determineRelationshipDirection(cooccurrence.entity1, cooccurrence.entity2, pattern);
                relationships.push({
                    sourceEntityId: this.generateEntityId(sourceEntity),
                    targetEntityId: this.generateEntityId(targetEntity),
                    relationshipType: pattern.type,
                    confidence,
                    evidence,
                    contextMessageIds: [cooccurrence.messageId]
                });
            }
        }
        return relationships;
    }
    /**
     * Check if entity types match pattern requirements
     */
    entityTypesMatch(type1, type2, pattern) {
        const [sourceTypes, targetTypes] = pattern.entityTypes;
        return (sourceTypes.includes(type1) && targetTypes.includes(type2)) ||
            (sourceTypes.includes(type2) && targetTypes.includes(type1));
    }
    /**
     * Calculate base confidence for relationship
     */
    calculateBaseConfidence(cooccurrence, _pattern) {
        let confidence = 0.3; // Base confidence
        // Distance-based adjustments
        const normalizedDistance = cooccurrence.distance / this.config.maxEntityDistance;
        confidence += (1 - normalizedDistance) * 0.2; // Closer entities get higher confidence
        // Sentence distance adjustment
        if (cooccurrence.sentenceDistance === 0) {
            confidence += 0.2; // Same sentence
        }
        else if (cooccurrence.sentenceDistance === 1) {
            confidence += 0.1; // Adjacent sentences
        }
        // Entity confidence adjustment
        const avgEntityConfidence = (cooccurrence.entity1.confidence + cooccurrence.entity2.confidence) / 2;
        confidence += avgEntityConfidence * 0.2;
        return Math.min(1.0, confidence);
    }
    /**
     * Adjust confidence based on contextual factors
     */
    adjustConfidenceByContext(baseConfidence, cooccurrence, _pattern) {
        let confidence = baseConfidence;
        // Context quality indicators
        const context = cooccurrence.context.toLowerCase();
        // Positive indicators
        const positiveIndicators = [
            'specifically', 'particularly', 'exactly', 'precisely', 'clearly',
            'definitely', 'certainly', 'obviously', 'indeed', 'actually'
        ];
        // Negative indicators
        const negativeIndicators = [
            'maybe', 'perhaps', 'possibly', 'might', 'could', 'potentially',
            'not', 'never', 'rarely', 'unlikely', 'uncertain'
        ];
        // Check for positive indicators
        const positiveCount = positiveIndicators.filter(indicator => context.includes(indicator)).length;
        // Check for negative indicators
        const negativeCount = negativeIndicators.filter(indicator => context.includes(indicator)).length;
        confidence += positiveCount * 0.1;
        confidence -= negativeCount * 0.15;
        // Question context reduces confidence
        if (context.includes('?')) {
            confidence *= 0.8;
        }
        // Hypothetical context reduces confidence
        if (context.includes('if ') || context.includes('would ') || context.includes('could ')) {
            confidence *= 0.7;
        }
        return Math.max(0.0, Math.min(1.0, confidence));
    }
    /**
     * Find pattern matches in context
     */
    findPatternMatches(context, patterns) {
        const matches = [];
        for (const pattern of patterns) {
            const patternMatches = context.match(pattern);
            if (patternMatches) {
                matches.push(...patternMatches);
            }
        }
        return matches;
    }
    /**
     * Determine relationship direction based on entity types and patterns
     */
    determineRelationshipDirection(entity1, entity2, pattern) {
        const [sourceTypes, targetTypes] = pattern.entityTypes;
        // Check if entity1 should be source
        if (sourceTypes.includes(entity1.type) && targetTypes.includes(entity2.type)) {
            return [entity1, entity2];
        }
        // Check if entity2 should be source
        if (sourceTypes.includes(entity2.type) && targetTypes.includes(entity1.type)) {
            return [entity2, entity1];
        }
        // Default: earlier entity is source
        return entity1.startPosition < entity2.startPosition ? [entity1, entity2] : [entity2, entity1];
    }
    /**
     * Split text into sentences
     */
    splitIntoSentences(text) {
        return text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    }
    /**
     * Calculate sentence distance between two entities
     */
    calculateSentenceDistance(entity1, entity2, sentences) {
        let sentence1 = -1;
        let sentence2 = -1;
        let currentPos = 0;
        for (let i = 0; i < sentences.length; i++) {
            const sentenceEnd = currentPos + sentences[i].length;
            if (sentence1 === -1 && entity1.startPosition >= currentPos && entity1.startPosition <= sentenceEnd) {
                sentence1 = i;
            }
            if (sentence2 === -1 && entity2.startPosition >= currentPos && entity2.startPosition <= sentenceEnd) {
                sentence2 = i;
            }
            if (sentence1 !== -1 && sentence2 !== -1) {
                break;
            }
            currentPos = sentenceEnd + 1; // +1 for sentence delimiter
        }
        return sentence1 !== -1 && sentence2 !== -1 ? Math.abs(sentence1 - sentence2) : this.config.maxSentenceDistance + 1;
    }
    /**
     * Generate consistent entity ID from extracted entity
     */
    generateEntityId(entity) {
        return `entity_${entity.type}_${Buffer.from(entity.normalizedText).toString('base64').replace(/[^a-zA-Z0-9]/g, '')}`;
    }
    /**
     * Merge relationships with same source, target, and type
     */
    mergeRelationships(relationships) {
        const merged = new Map();
        for (const relationship of relationships) {
            const key = `${relationship.sourceEntityId}_${relationship.targetEntityId}_${relationship.relationshipType}`;
            if (merged.has(key)) {
                const existing = merged.get(key);
                existing.confidence = Math.max(existing.confidence, relationship.confidence);
                existing.evidence.push(...relationship.evidence);
                existing.contextMessageIds.push(...relationship.contextMessageIds);
            }
            else {
                merged.set(key, { ...relationship });
            }
        }
        return Array.from(merged.values())
            .filter(r => r.confidence >= this.config.minConfidence)
            .sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Update detection configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Add custom relationship pattern
     */
    addCustomPattern(pattern) {
        this.relationshipPatterns.push(pattern);
    }
    /**
     * Get detection statistics
     */
    getPatternStats() {
        const stats = {};
        for (const pattern of this.relationshipPatterns) {
            stats[pattern.type] = (stats[pattern.type] || 0) + pattern.patterns.length;
        }
        return stats;
    }
}
//# sourceMappingURL=RelationshipDetector.js.map