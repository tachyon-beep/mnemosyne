/**
 * Knowledge Synthesizer - Advanced Entity Knowledge Management
 *
 * Provides comprehensive knowledge synthesis, conflict detection, and contextual
 * recommendations by analyzing entity information across all conversations.
 *
 * Features:
 * - Aggregate entity knowledge from multiple sources
 * - Detect conflicting statements and contradictions
 * - Suggest relevant context based on entity relationships
 * - Recommend domain experts and knowledgeable people
 * - Track entity attribute evolution over time
 */
import { EntityRepository } from '../../../storage/repositories/EntityRepository.js';
import { RelationshipDetector } from '../../../entities/RelationshipDetector.js';
import { ConversationRepository } from '../../../storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../../../storage/repositories/MessageRepository.js';
export class KnowledgeSynthesizer {
    dbManager;
    entityRepository;
    relationshipDetector;
    conversationRepository;
    messageRepository;
    config;
    constructor(dbManager, config) {
        this.dbManager = dbManager;
        this.entityRepository = new EntityRepository(dbManager);
        this.relationshipDetector = new RelationshipDetector(dbManager);
        this.conversationRepository = new ConversationRepository(dbManager);
        this.messageRepository = new MessageRepository(dbManager);
        this.config = this.mergeConfig(config);
    }
    /**
     * Synthesize comprehensive knowledge about an entity
     */
    async synthesizeEntityKnowledge(entityId) {
        const entity = await this.entityRepository.getById(entityId);
        if (!entity) {
            throw new Error(`Entity not found: ${entityId}`);
        }
        // Get all mentions of this entity across conversations
        const mentions = await this.getEntityMentions(entityId);
        // Extract attributes from mentions
        const attributes = await this.extractEntityAttributes(entityId, mentions);
        // Get relationships
        const relationships = await this.relationshipDetector.getEntityRelationships(entityId);
        // Build timeline of attribute changes
        const timeline = this.buildAttributeTimeline(attributes);
        // Calculate knowledge score
        const knowledgeScore = this.calculateKnowledgeScore(entity, attributes, relationships, mentions);
        return {
            entity,
            attributes,
            relationships,
            mentions,
            timeline,
            knowledgeScore,
            lastUpdated: Date.now()
        };
    }
    /**
     * Detect conflicting statements about entities
     */
    async detectConflictingStatements(entityId) {
        if (!this.config.conflictDetectionEnabled) {
            return [];
        }
        let entitiesToCheck;
        if (entityId) {
            const entity = await this.entityRepository.getById(entityId);
            entitiesToCheck = entity ? [entity] : [];
        }
        else {
            // Check all entities with sufficient mentions
            const searchResult = await this.entityRepository.search({
                minMentions: 3,
                limit: 100
            });
            entitiesToCheck = searchResult.entities;
        }
        const conflicts = [];
        for (const entity of entitiesToCheck) {
            const entityKnowledge = await this.synthesizeEntityKnowledge(entity.id);
            // Detect different types of conflicts
            const propertyConflicts = await this.detectPropertyConflicts(entity, entityKnowledge);
            const statusConflicts = await this.detectStatusConflicts(entity, entityKnowledge);
            const temporalConflicts = await this.detectTemporalConflicts(entity, entityKnowledge);
            const relationshipConflicts = await this.detectRelationshipConflicts(entity, entityKnowledge);
            conflicts.push(...propertyConflicts, ...statusConflicts, ...temporalConflicts, ...relationshipConflicts);
        }
        // Sort by severity and recency
        return conflicts.sort((a, b) => {
            const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
            const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
            if (severityDiff !== 0)
                return severityDiff;
            return b.detectedAt - a.detectedAt;
        });
    }
    /**
     * Suggest relevant context based on current entities and conversation
     */
    async suggestRelevantContext(currentEntities, conversationId, limit = 5) {
        const suggestions = [];
        // Get entity objects
        const entities = await Promise.all(currentEntities.map(id => this.entityRepository.getById(id)));
        const validEntities = entities.filter(e => e !== null);
        if (validEntities.length === 0) {
            return suggestions;
        }
        // Find related conversations through entity co-occurrence
        const relatedConversations = await this.findRelatedConversations(validEntities, conversationId);
        // Find expert insights
        const expertInsights = await this.findExpertInsights(validEntities);
        // Find similar contexts
        const similarContexts = await this.findSimilarContexts(validEntities, conversationId);
        // Check for contradictions
        const contradictionAlerts = await this.findContradictionAlerts(validEntities);
        // Find missing information
        const missingInfo = await this.findMissingInformation(validEntities);
        // Combine and score suggestions
        suggestions.push(...relatedConversations, ...expertInsights, ...similarContexts, ...contradictionAlerts, ...missingInfo);
        // Sort by relevance score and return top results
        return suggestions
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, limit);
    }
    /**
     * Recommend experts on specific topics or entities
     */
    async recommendExperts(entities, topic, limit = 3) {
        const recommendations = [];
        // Get all people entities who have interacted with the specified entities
        const peopleWithInteractions = await this.findPeopleWithEntityInteractions(entities);
        for (const person of peopleWithInteractions) {
            const expertiseAreas = await this.calculateExpertiseAreas(person.id, entities);
            const credibilityScore = await this.calculateCredibilityScore(person.id, entities, topic);
            const interactionHistory = await this.getExpertInteractionHistory(person.id, entities);
            const recentActivity = await this.calculateRecentActivity(person.id);
            const knowledgeDepth = await this.calculateKnowledgeDepth(person.id, entities);
            if (credibilityScore >= 0.3 && interactionHistory.length >= this.config.minInteractionsForExpert) {
                recommendations.push({
                    person,
                    expertiseAreas,
                    credibilityScore,
                    interactionHistory,
                    recentActivity,
                    knowledgeDepth,
                    recommendationReason: this.generateRecommendationReason(person, expertiseAreas, credibilityScore, interactionHistory.length)
                });
            }
        }
        // Sort by credibility and knowledge depth
        return recommendations
            .sort((a, b) => {
            const scoreA = a.credibilityScore * 0.6 + a.knowledgeDepth * 0.4;
            const scoreB = b.credibilityScore * 0.6 + b.knowledgeDepth * 0.4;
            return scoreB - scoreA;
        })
            .slice(0, limit);
    }
    /**
     * Get all mentions of an entity across conversations
     */
    async getEntityMentions(entityId) {
        const db = this.dbManager.getConnection();
        const query = `
      SELECT 
        m.id as message_id,
        m.conversation_id,
        m.content,
        m.created_at,
        em.start_position,
        em.end_position,
        em.confidence_score
      FROM messages m
      JOIN entity_mentions em ON m.id = em.message_id
      WHERE em.entity_id = ?
      ORDER BY m.created_at DESC
    `;
        const rows = db.prepare(query).all(entityId);
        return rows.map(row => {
            const startPos = row.start_position || 0;
            const content = row.content || '';
            const endPos = row.end_position || content.length;
            const contextStart = Math.max(0, startPos - 50);
            const contextEnd = Math.min(content.length, endPos + 50);
            return {
                messageId: row.message_id,
                conversationId: row.conversation_id,
                content: content,
                context: content.substring(contextStart, contextEnd),
                timestamp: row.created_at,
                importance: Math.min(1.0, row.confidence_score || 0.5)
            };
        });
    }
    /**
     * Extract attributes from entity mentions using patterns and NLP
     */
    async extractEntityAttributes(entityId, mentions) {
        const attributes = [];
        const entity = await this.entityRepository.getById(entityId);
        if (!entity)
            return attributes;
        for (const mention of mentions) {
            // Apply extraction patterns based on entity type
            const applicablePatterns = this.config.attributeExtractionPatterns.filter(pattern => pattern.entityTypes.includes(entity.type));
            for (const pattern of applicablePatterns) {
                const matches = mention.content.match(pattern.pattern);
                if (matches && matches[1]) {
                    attributes.push({
                        name: pattern.name,
                        value: matches[1].trim(),
                        confidence: pattern.confidence * mention.importance,
                        sourceMessageId: mention.messageId,
                        sourceConversationId: mention.conversationId,
                        extractedAt: mention.timestamp,
                        context: mention.context
                    });
                }
            }
            // Apply generic attribute extraction patterns
            const genericPatterns = this.getGenericAttributePatterns(entity.type);
            for (const pattern of genericPatterns) {
                const matches = mention.content.match(pattern.regex);
                if (matches && matches[1]) {
                    attributes.push({
                        name: pattern.attribute,
                        value: matches[1].trim(),
                        confidence: pattern.confidence * mention.importance,
                        sourceMessageId: mention.messageId,
                        sourceConversationId: mention.conversationId,
                        extractedAt: mention.timestamp,
                        context: mention.context
                    });
                }
            }
        }
        // Deduplicate and merge similar attributes
        return this.deduplicateAttributes(attributes);
    }
    /**
     * Build timeline of attribute changes
     */
    buildAttributeTimeline(attributes) {
        const timeline = [];
        const attributeGroups = new Map();
        // Group attributes by name
        for (const attr of attributes) {
            if (!attributeGroups.has(attr.name)) {
                attributeGroups.set(attr.name, []);
            }
            attributeGroups.get(attr.name).push(attr);
        }
        // Analyze changes for each attribute
        for (const [attributeName, attrs] of attributeGroups) {
            // Sort by extraction time
            attrs.sort((a, b) => a.extractedAt - b.extractedAt);
            let previousValue;
            for (const attr of attrs) {
                const changeType = this.determineChangeType(previousValue, attr.value, attrs);
                timeline.push({
                    attribute: attributeName,
                    oldValue: previousValue,
                    newValue: attr.value,
                    confidence: attr.confidence,
                    sourceMessageId: attr.sourceMessageId,
                    timestamp: attr.extractedAt,
                    changeType
                });
                previousValue = attr.value;
            }
        }
        return timeline.sort((a, b) => a.timestamp - b.timestamp);
    }
    /**
     * Detect property conflicts (contradicting attribute values)
     */
    async detectPropertyConflicts(entity, knowledge) {
        const conflicts = [];
        const attributeGroups = new Map();
        // Group attributes by name
        for (const attr of knowledge.attributes) {
            if (!attributeGroups.has(attr.name)) {
                attributeGroups.set(attr.name, []);
            }
            attributeGroups.get(attr.name).push(attr);
        }
        // Check each attribute group for conflicts
        for (const [attributeName, attrs] of attributeGroups) {
            if (attrs.length < 2)
                continue;
            const uniqueValues = new Set(attrs.map(a => a.value.toLowerCase()));
            if (uniqueValues.size > 1) {
                // Potential conflict found
                const highConfidenceValues = attrs.filter(a => a.confidence > 0.7);
                if (highConfidenceValues.length > 1) {
                    const conflictingStatements = attrs.map(attr => ({
                        messageId: attr.sourceMessageId,
                        conversationId: attr.sourceConversationId,
                        statement: `${attributeName}: ${attr.value}`,
                        context: attr.context,
                        confidence: attr.confidence,
                        timestamp: attr.extractedAt
                    }));
                    const severity = this.calculateConflictSeverity(attrs);
                    conflicts.push({
                        id: this.generateId(),
                        entityId: entity.id,
                        conflictType: 'property_contradiction',
                        description: `Conflicting values for ${attributeName}: ${Array.from(uniqueValues).join(' vs ')}`,
                        severity,
                        conflictingStatements,
                        detectedAt: Date.now(),
                        resolutionSuggestion: this.suggestPropertyResolution(attrs)
                    });
                }
            }
        }
        return conflicts;
    }
    /**
     * Detect status inconsistencies
     */
    async detectStatusConflicts(entity, knowledge) {
        const conflicts = [];
        // Look for status-related attributes
        const statusAttributes = knowledge.attributes.filter(attr => ['status', 'state', 'active', 'inactive', 'enabled', 'disabled', 'open', 'closed'].includes(attr.name.toLowerCase()));
        if (statusAttributes.length < 2)
            return conflicts;
        // Check for contradictory statuses
        const statusValues = statusAttributes.map(attr => attr.value.toLowerCase());
        const hasActive = statusValues.some(v => ['active', 'enabled', 'open', 'running'].includes(v));
        const hasInactive = statusValues.some(v => ['inactive', 'disabled', 'closed', 'stopped'].includes(v));
        if (hasActive && hasInactive) {
            const conflictingStatements = statusAttributes.map(attr => ({
                messageId: attr.sourceMessageId,
                conversationId: attr.sourceConversationId,
                statement: `Status: ${attr.value}`,
                context: attr.context,
                confidence: attr.confidence,
                timestamp: attr.extractedAt
            }));
            conflicts.push({
                id: this.generateId(),
                entityId: entity.id,
                conflictType: 'status_inconsistency',
                description: `Conflicting status information for ${entity.name}`,
                severity: 'medium',
                conflictingStatements,
                detectedAt: Date.now(),
                resolutionSuggestion: 'Check recent status updates to determine current state'
            });
        }
        return conflicts;
    }
    /**
     * Detect temporal impossibilities
     */
    async detectTemporalConflicts(entity, knowledge) {
        const conflicts = [];
        // Look for temporal attributes
        const temporalAttributes = knowledge.attributes.filter(attr => ['created', 'founded', 'started', 'ended', 'born', 'died', 'launched', 'closed'].includes(attr.name.toLowerCase()));
        // Check for impossible timelines (e.g., end date before start date)
        const startDates = temporalAttributes.filter(attr => ['created', 'founded', 'started', 'born', 'launched'].includes(attr.name.toLowerCase()));
        const endDates = temporalAttributes.filter(attr => ['ended', 'died', 'closed'].includes(attr.name.toLowerCase()));
        for (const startAttr of startDates) {
            for (const endAttr of endDates) {
                const startDate = this.parseDate(startAttr.value);
                const endDate = this.parseDate(endAttr.value);
                if (startDate && endDate && startDate > endDate) {
                    conflicts.push({
                        id: this.generateId(),
                        entityId: entity.id,
                        conflictType: 'temporal_impossibility',
                        description: `${entity.name} has end date (${endAttr.value}) before start date (${startAttr.value})`,
                        severity: 'high',
                        conflictingStatements: [
                            {
                                messageId: startAttr.sourceMessageId,
                                conversationId: startAttr.sourceConversationId,
                                statement: `${startAttr.name}: ${startAttr.value}`,
                                context: startAttr.context,
                                confidence: startAttr.confidence,
                                timestamp: startAttr.extractedAt
                            },
                            {
                                messageId: endAttr.sourceMessageId,
                                conversationId: endAttr.sourceConversationId,
                                statement: `${endAttr.name}: ${endAttr.value}`,
                                context: endAttr.context,
                                confidence: endAttr.confidence,
                                timestamp: endAttr.extractedAt
                            }
                        ],
                        detectedAt: Date.now(),
                        resolutionSuggestion: 'Verify the correct dates from authoritative sources'
                    });
                }
            }
        }
        return conflicts;
    }
    /**
     * Detect relationship conflicts
     */
    async detectRelationshipConflicts(entity, knowledge) {
        const conflicts = [];
        // Look for contradictory relationships
        const relationships = knowledge.relationships || [];
        // Check for mutually exclusive relationships
        const exclusivePatterns = [
            { type1: 'works_for', type2: 'works_for' }, // Can't work for two competing companies
            { type1: 'created_by', type2: 'created_by' } // Can't be created by multiple sources
        ];
        for (const pattern of exclusivePatterns) {
            const type1Rels = relationships.filter(r => r.relationshipType === pattern.type1);
            const type2Rels = relationships.filter(r => r.relationshipType === pattern.type2);
            if (type1Rels.length > 1 && pattern.type1 === pattern.type2) {
                // Multiple relationships of same type might be problematic
                const targets = new Set(type1Rels.map(r => r.sourceEntityId === entity.id ? r.targetEntityId : r.sourceEntityId));
                if (targets.size > 1 && pattern.type1 === 'works_for') {
                    conflicts.push({
                        id: this.generateId(),
                        entityId: entity.id,
                        conflictType: 'relationship_conflict',
                        description: `${entity.name} appears to work for multiple organizations`,
                        severity: 'medium',
                        conflictingStatements: [], // Would need to fetch original statements
                        detectedAt: Date.now(),
                        resolutionSuggestion: 'Check if these are sequential employment or consulting relationships'
                    });
                }
            }
        }
        return conflicts;
    }
    /**
     * Find conversations related to given entities
     */
    async findRelatedConversations(entities, excludeConversationId) {
        const suggestions = [];
        const entityIds = entities.map(e => e.id);
        const db = this.dbManager.getConnection();
        // Find conversations with high entity overlap
        const query = `
      SELECT 
        c.id,
        c.title,
        c.created_at,
        COUNT(DISTINCT em.entity_id) as entity_count,
        GROUP_CONCAT(DISTINCT e.name) as entity_names
      FROM conversations c
      JOIN messages m ON c.id = m.conversation_id
      JOIN entity_mentions em ON m.id = em.message_id
      JOIN entities e ON em.entity_id = e.id
      WHERE em.entity_id IN (${entityIds.map(() => '?').join(',')})
        AND c.id != ?
      GROUP BY c.id
      HAVING entity_count >= 2
      ORDER BY entity_count DESC, c.created_at DESC
      LIMIT 10
    `;
        const rows = db.prepare(query).all(...entityIds, excludeConversationId);
        for (const row of rows) {
            const conversation = await this.conversationRepository.findById(row.id);
            if (!conversation)
                continue;
            const relevanceScore = Math.min(1.0, (row.entity_count / entityIds.length) * 0.8);
            suggestions.push({
                type: 'related_conversation',
                title: `Related discussion: ${conversation.title || 'Untitled conversation'}`,
                description: `Previous conversation mentioning ${row.entity_names}`,
                relevanceScore,
                entities,
                conversations: [conversation],
                messages: [],
                reasoning: `Found ${row.entity_count} overlapping entities`
            });
        }
        return suggestions;
    }
    /**
     * Find expert insights from knowledgeable people
     */
    async findExpertInsights(entities) {
        const suggestions = [];
        const experts = await this.recommendExperts(entities.map(e => e.id), undefined, 3);
        for (const expert of experts) {
            if (expert.interactionHistory.length > 0) {
                const recentInteractions = expert.interactionHistory
                    .filter(i => Date.now() - i.timestamp < 30 * 24 * 60 * 60 * 1000) // 30 days
                    .slice(0, 3);
                if (recentInteractions.length > 0) {
                    const messages = await Promise.all(recentInteractions.map(i => this.messageRepository.findById(i.messageId)));
                    const validMessages = messages.filter((m) => m !== null);
                    suggestions.push({
                        type: 'expert_insight',
                        title: `Insights from ${expert.person.name}`,
                        description: `${expert.person.name} has expertise in ${expert.expertiseAreas.join(', ')}`,
                        relevanceScore: expert.credibilityScore,
                        entities: [expert.person],
                        conversations: [],
                        messages: validMessages,
                        reasoning: `Expert with ${expert.credibilityScore.toFixed(2)} credibility score`
                    });
                }
            }
        }
        return suggestions;
    }
    /**
     * Find similar discussion contexts
     */
    async findSimilarContexts(entities, excludeConversationId) {
        // This would use semantic similarity if embeddings are available
        // For now, use entity co-occurrence as a proxy
        return this.findRelatedConversations(entities, excludeConversationId);
    }
    /**
     * Find contradiction alerts
     */
    async findContradictionAlerts(entities) {
        const suggestions = [];
        for (const entity of entities) {
            const conflicts = await this.detectConflictingStatements(entity.id);
            const highSeverityConflicts = conflicts.filter(c => c.severity === 'high' || c.severity === 'critical');
            for (const conflict of highSeverityConflicts) {
                suggestions.push({
                    type: 'contradiction_alert',
                    title: `⚠️ Conflicting information about ${entity.name}`,
                    description: conflict.description,
                    relevanceScore: 0.9, // High relevance for conflicts
                    entities: [entity],
                    conversations: [],
                    messages: [],
                    reasoning: `${conflict.conflictType} detected with ${conflict.severity} severity`
                });
            }
        }
        return suggestions;
    }
    /**
     * Find missing information gaps
     */
    async findMissingInformation(entities) {
        const suggestions = [];
        for (const entity of entities) {
            const knowledge = await this.synthesizeEntityKnowledge(entity.id);
            const missingAttributes = this.identifyMissingAttributes(entity, knowledge);
            if (missingAttributes.length > 0) {
                suggestions.push({
                    type: 'missing_information',
                    title: `Missing information about ${entity.name}`,
                    description: `Consider gathering: ${missingAttributes.join(', ')}`,
                    relevanceScore: 0.6,
                    entities: [entity],
                    conversations: [],
                    messages: [],
                    reasoning: `${missingAttributes.length} key attributes missing`
                });
            }
        }
        return suggestions;
    }
    /**
     * Calculate knowledge score for an entity
     */
    calculateKnowledgeScore(entity, attributes, relationships, mentions) {
        let score = 0;
        // Base score from entity confidence
        score += entity.confidenceScore * 0.2;
        // Attribute completeness
        const expectedAttributes = this.getExpectedAttributesForType(entity.type);
        const attributeCompleteness = Math.min(1.0, attributes.length / expectedAttributes.length);
        score += attributeCompleteness * 0.3;
        // Relationship richness
        const relationshipScore = Math.min(1.0, (relationships?.length || 0) / 5.0);
        score += relationshipScore * 0.2;
        // Mention frequency and recency
        const mentionScore = Math.min(1.0, mentions.length / 10.0);
        const recentMentions = mentions.filter(m => Date.now() - m.timestamp < 30 * 24 * 60 * 60 * 1000).length;
        const recencyScore = Math.min(1.0, recentMentions / 3.0);
        score += (mentionScore * 0.15) + (recencyScore * 0.15);
        return Math.min(1.0, score);
    }
    /**
     * Helper methods
     */
    mergeConfig(config) {
        return {
            minConfidenceThreshold: 0.5,
            maxAttributesPerEntity: 50,
            attributeExtractionPatterns: this.getDefaultAttributePatterns(),
            conflictDetectionEnabled: true,
            temporalWindowDays: 365,
            conflictSeverityThresholds: {
                low: 0.3,
                medium: 0.6,
                high: 0.8
            },
            maxSuggestions: 5,
            relevanceThreshold: 0.4,
            temporalDecayFactor: 0.1,
            expertiseCalculationWindow: 90,
            minInteractionsForExpert: 3,
            credibilityFactors: {
                recency: 0.3,
                frequency: 0.4,
                accuracy: 0.3
            },
            ...config
        };
    }
    getDefaultAttributePatterns() {
        return [
            {
                name: 'role',
                pattern: /(?:is a|works as|role of|position of)\s+([^.,]+)/i,
                confidence: 0.7,
                entityTypes: ['person']
            },
            {
                name: 'founded',
                pattern: /(?:founded in|established in|started in)\s+(\d{4})/i,
                confidence: 0.8,
                entityTypes: ['organization', 'product']
            },
            {
                name: 'location',
                pattern: /(?:based in|located in|headquarters in)\s+([^.,]+)/i,
                confidence: 0.7,
                entityTypes: ['organization', 'person']
            },
            {
                name: 'technology',
                pattern: /(?:built with|uses|powered by)\s+([^.,]+)/i,
                confidence: 0.6,
                entityTypes: ['product', 'technical']
            }
        ];
    }
    getGenericAttributePatterns(entityType) {
        const patterns = [];
        switch (entityType) {
            case 'person':
                patterns.push({ attribute: 'title', regex: /(?:title|role):\s*([^.,\n]+)/i, confidence: 0.7 }, { attribute: 'company', regex: /(?:works at|employed by)\s+([^.,\n]+)/i, confidence: 0.8 });
                break;
            case 'organization':
                patterns.push({ attribute: 'industry', regex: /(?:industry|sector):\s*([^.,\n]+)/i, confidence: 0.7 }, { attribute: 'size', regex: /(?:employees|people):\s*([^.,\n]+)/i, confidence: 0.6 });
                break;
            case 'product':
                patterns.push({ attribute: 'version', regex: /(?:version|v\.?)\s*([0-9.]+)/i, confidence: 0.9 }, { attribute: 'platform', regex: /(?:platform|OS):\s*([^.,\n]+)/i, confidence: 0.7 });
                break;
        }
        return patterns;
    }
    deduplicateAttributes(attributes) {
        const deduped = new Map();
        for (const attr of attributes) {
            const key = `${attr.name}:${attr.value.toLowerCase()}`;
            const existing = deduped.get(key);
            if (!existing || attr.confidence > existing.confidence) {
                deduped.set(key, attr);
            }
        }
        return Array.from(deduped.values());
    }
    determineChangeType(previousValue, newValue, allAttributes) {
        if (!previousValue) {
            return 'addition';
        }
        if (previousValue === newValue) {
            return 'confirmation';
        }
        // Check if values are contradictory vs just different versions
        const similarity = this.calculateStringSimilarity(previousValue, newValue);
        if (similarity < 0.3) {
            return 'contradiction';
        }
        return 'modification';
    }
    calculateStringSimilarity(str1, str2) {
        // Simple Jaccard similarity
        const set1 = new Set(str1.toLowerCase().split(/\s+/));
        const set2 = new Set(str2.toLowerCase().split(/\s+/));
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    calculateConflictSeverity(attributes) {
        const avgConfidence = attributes.reduce((sum, attr) => sum + attr.confidence, 0) / attributes.length;
        if (avgConfidence >= this.config.conflictSeverityThresholds.high)
            return 'critical';
        if (avgConfidence >= this.config.conflictSeverityThresholds.medium)
            return 'high';
        if (avgConfidence >= this.config.conflictSeverityThresholds.low)
            return 'medium';
        return 'low';
    }
    suggestPropertyResolution(attributes) {
        const sortedByConfidence = attributes.sort((a, b) => b.confidence - a.confidence);
        const mostRecent = attributes.sort((a, b) => b.extractedAt - a.extractedAt)[0];
        const mostConfident = sortedByConfidence[0];
        if (mostConfident.confidence > 0.8) {
            return `Consider the most confident value: ${mostConfident.value}`;
        }
        else if (mostRecent.extractedAt > Date.now() - 7 * 24 * 60 * 60 * 1000) {
            return `Consider the most recent value: ${mostRecent.value}`;
        }
        return 'Manual verification needed to resolve conflict';
    }
    parseDate(dateString) {
        try {
            // Try various date formats
            const patterns = [
                /(\d{4})-(\d{2})-(\d{2})/,
                /(\d{2})\/(\d{2})\/(\d{4})/,
                /(\d{4})/
            ];
            for (const pattern of patterns) {
                const match = dateString.match(pattern);
                if (match) {
                    return new Date(match[0]);
                }
            }
            return null;
        }
        catch {
            return null;
        }
    }
    async findPeopleWithEntityInteractions(entityIds) {
        const db = this.dbManager.getConnection();
        const query = `
      SELECT DISTINCT e.* 
      FROM entities e
      JOIN entity_mentions em1 ON e.id = em1.entity_id
      JOIN entity_mentions em2 ON em1.message_id = em2.message_id
      WHERE e.type = 'person' 
        AND em2.entity_id IN (${entityIds.map(() => '?').join(',')})
        AND e.id NOT IN (${entityIds.map(() => '?').join(',')})
      ORDER BY e.mention_count DESC
    `;
        const rows = db.prepare(query).all(...entityIds, ...entityIds);
        return rows.map(row => ({
            id: row.id,
            name: row.name,
            normalizedName: row.normalized_name,
            type: row.type,
            canonicalForm: row.canonical_form,
            confidenceScore: row.confidence_score,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            metadata: JSON.parse(row.metadata || '{}'),
            mentionCount: row.mention_count,
            lastMentionedAt: row.last_mentioned_at
        }));
    }
    async calculateExpertiseAreas(personId, entityIds) {
        // Analyze topics this person discusses in relation to the entities
        const mentions = await this.getEntityMentions(personId);
        const topics = new Set();
        if (!mentions) {
            return [];
        }
        for (const mention of mentions) {
            // Extract topics from message content (simplified)
            const words = (mention.content || '').toLowerCase().split(/\s+/);
            const techWords = words.filter(word => ['technology', 'development', 'design', 'architecture', 'programming'].includes(word));
            techWords.forEach(word => topics.add(word));
        }
        return Array.from(topics).slice(0, 5);
    }
    async calculateCredibilityScore(personId, entityIds, topic) {
        const mentions = await this.getEntityMentions(personId);
        if (!mentions || mentions.length === 0) {
            return 0;
        }
        const recentMentions = mentions.filter(m => Date.now() - m.timestamp < this.config.expertiseCalculationWindow * 24 * 60 * 60 * 1000);
        let score = 0;
        // Recency factor
        score += (recentMentions.length / mentions.length) * this.config.credibilityFactors.recency;
        // Frequency factor
        score += Math.min(1.0, mentions.length / 10) * this.config.credibilityFactors.frequency;
        // Accuracy factor (simplified - could be enhanced with feedback)
        score += 0.7 * this.config.credibilityFactors.accuracy;
        return Math.min(1.0, score);
    }
    async getExpertInteractionHistory(personId, entityIds) {
        const mentions = await this.getEntityMentions(personId);
        if (!mentions) {
            return [];
        }
        return mentions.map(mention => ({
            conversationId: mention.conversationId,
            messageId: mention.messageId,
            topic: 'General discussion', // Could be enhanced with topic modeling
            contribution: mention.context,
            timestamp: mention.timestamp,
            impactScore: mention.importance
        }));
    }
    async calculateRecentActivity(personId) {
        const mentions = await this.getEntityMentions(personId);
        if (!mentions)
            return 0;
        const recent = mentions.filter(m => Date.now() - m.timestamp < 7 * 24 * 60 * 60 * 1000);
        return recent.length;
    }
    async calculateKnowledgeDepth(personId, entityIds) {
        const mentions = await this.getEntityMentions(personId);
        if (!mentions || mentions.length === 0)
            return 0;
        const avgImportance = mentions.reduce((sum, m) => sum + m.importance, 0) / mentions.length;
        return avgImportance || 0;
    }
    generateRecommendationReason(person, expertiseAreas, credibilityScore, interactionCount) {
        return `${person.name} has ${credibilityScore.toFixed(2)} credibility score with ${interactionCount} relevant interactions in ${expertiseAreas.join(', ')}`;
    }
    identifyMissingAttributes(entity, knowledge) {
        const expectedAttributes = this.getExpectedAttributesForType(entity.type);
        const existingAttributes = new Set(knowledge.attributes.map(a => a.name.toLowerCase()));
        return expectedAttributes.filter(attr => !existingAttributes.has(attr.toLowerCase()));
    }
    getExpectedAttributesForType(entityType) {
        switch (entityType) {
            case 'person':
                return ['role', 'company', 'title', 'location', 'expertise'];
            case 'organization':
                return ['industry', 'founded', 'location', 'size', 'status'];
            case 'product':
                return ['version', 'platform', 'technology', 'status', 'created'];
            case 'technical':
                return ['type', 'version', 'documentation', 'maintainer'];
            default:
                return ['description', 'category', 'status'];
        }
    }
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
//# sourceMappingURL=KnowledgeSynthesizer.js.map