/**
 * Relationship Detection Service for Phase 3
 *
 * Analyzes co-occurrence patterns and detects relationships between entities.
 * Builds the knowledge graph by identifying semantic connections.
 */
import { EntityRepository } from '../storage/repositories/EntityRepository.js';
export class RelationshipDetector {
    dbManager;
    entityRepository;
    config;
    constructor(dbManager, config = {}) {
        this.dbManager = dbManager;
        this.entityRepository = new EntityRepository(dbManager);
        this.config = {
            maxCoOccurrenceDistance: 500, // Characters
            minRelationshipStrength: 0.3,
            contextWindowSize: 100,
            enableSemanticAnalysis: true,
            ...config
        };
    }
    /**
     * Analyze a message for entity relationships
     */
    async analyzeMessage(messageId, conversationId, content, extractedEntities) {
        // Find co-occurrences between entities in this message
        const coOccurrences = this.findCoOccurrences(messageId, conversationId, content, extractedEntities);
        // Analyze co-occurrences to detect relationships
        const detectedRelationships = await this.detectRelationships(coOccurrences, content);
        return {
            coOccurrences,
            detectedRelationships
        };
    }
    /**
     * Find co-occurrences between entities in a message
     */
    findCoOccurrences(messageId, conversationId, content, entities) {
        const coOccurrences = [];
        // Compare each entity with every other entity
        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const entity1 = entities[i];
                const entity2 = entities[j];
                // Calculate distance between entities
                const distance = Math.abs(entity1.startPosition - entity2.startPosition);
                // Only consider entities within co-occurrence distance
                if (distance <= this.config.maxCoOccurrenceDistance) {
                    // Extract context around both entities
                    const contextStart = Math.min(entity1.startPosition, entity2.startPosition) - this.config.contextWindowSize;
                    const contextEnd = Math.max(entity1.endPosition, entity2.endPosition) + this.config.contextWindowSize;
                    const context = content.substring(Math.max(0, contextStart), Math.min(content.length, contextEnd)).trim();
                    coOccurrences.push({
                        entityId1: entity1.entityId,
                        entityId2: entity2.entityId,
                        messageId,
                        conversationId,
                        distance,
                        context,
                        timestamp: Date.now()
                    });
                }
            }
        }
        return coOccurrences;
    }
    /**
     * Analyze co-occurrences to detect semantic relationships
     */
    async detectRelationships(coOccurrences, messageContent) {
        const relationships = [];
        for (const coOccurrence of coOccurrences) {
            try {
                // Get entity details
                const sourceEntity = await this.entityRepository.getById(coOccurrence.entityId1);
                const targetEntity = await this.entityRepository.getById(coOccurrence.entityId2);
                if (!sourceEntity || !targetEntity)
                    continue;
                // Determine relationship type based on entity types and context
                const relationshipTypes = this.inferRelationshipTypes(sourceEntity, targetEntity, coOccurrence.context);
                // Create relationship candidates
                for (const relType of relationshipTypes) {
                    const confidence = this.calculateRelationshipConfidence(sourceEntity, targetEntity, relType, coOccurrence, messageContent);
                    if (confidence >= this.config.minRelationshipStrength) {
                        relationships.push({
                            sourceEntity,
                            targetEntity,
                            relationshipType: relType.type,
                            confidence,
                            evidence: [coOccurrence],
                            suggestedContext: coOccurrence.context
                        });
                    }
                }
            }
            catch (error) {
                console.warn('Failed to detect relationship for co-occurrence:', error);
            }
        }
        return relationships;
    }
    /**
     * Infer possible relationship types based on entity types
     */
    inferRelationshipTypes(sourceEntity, targetEntity, context) {
        const relationships = [];
        // Person-Person relationships
        if (sourceEntity.type === 'person' && targetEntity.type === 'person') {
            if (this.hasWorkIndicators(context)) {
                relationships.push({ type: 'discussed_with', baseConfidence: 0.7 });
            }
            relationships.push({ type: 'mentioned_with', baseConfidence: 0.5 });
        }
        // Person-Organization relationships  
        else if (sourceEntity.type === 'person' && targetEntity.type === 'organization') {
            if (this.hasEmploymentIndicators(context)) {
                relationships.push({ type: 'works_for', baseConfidence: 0.8 });
            }
            relationships.push({ type: 'related_to', baseConfidence: 0.4 });
        }
        // Person-Technical relationships
        else if (sourceEntity.type === 'person' && targetEntity.type === 'technical') {
            relationships.push({ type: 'mentioned_with', baseConfidence: 0.4 });
        }
        // Organization-Technical relationships
        else if (sourceEntity.type === 'organization' && targetEntity.type === 'technical') {
            if (this.hasDevelopmentIndicators(context)) {
                relationships.push({ type: 'created_by', baseConfidence: 0.6 });
            }
            relationships.push({ type: 'related_to', baseConfidence: 0.5 });
        }
        // Product-Organization relationships (reverse of above)
        else if (sourceEntity.type === 'technical' && targetEntity.type === 'organization') {
            if (this.hasDevelopmentIndicators(context)) {
                relationships.push({ type: 'created_by', baseConfidence: 0.6 });
            }
            relationships.push({ type: 'related_to', baseConfidence: 0.5 });
        }
        // Generic relationships for any other combinations
        else {
            relationships.push({ type: 'related_to', baseConfidence: 0.3 });
        }
        return relationships;
    }
    /**
     * Calculate confidence score for a relationship
     */
    calculateRelationshipConfidence(sourceEntity, targetEntity, relationshipType, coOccurrence, _messageContent) {
        let confidence = relationshipType.baseConfidence;
        // Distance-based adjustment (closer entities = higher confidence)
        const distanceBonus = Math.max(0, (this.config.maxCoOccurrenceDistance - coOccurrence.distance) / this.config.maxCoOccurrenceDistance) * 0.2;
        confidence += distanceBonus;
        // Context strength adjustment
        const contextStrength = this.analyzeContextStrength(coOccurrence.context, relationshipType.type);
        confidence += contextStrength * 0.3;
        // Entity confidence adjustment
        const entityConfidenceAvg = (sourceEntity.confidenceScore + targetEntity.confidenceScore) / 2;
        confidence *= entityConfidenceAvg;
        return Math.min(1.0, confidence);
    }
    /**
     * Analyze context for relationship-specific indicators
     */
    analyzeContextStrength(context, relationshipType) {
        const lowerContext = context.toLowerCase();
        switch (relationshipType) {
            case 'discussed_with':
                return this.countIndicators(lowerContext, [
                    'collaborate', 'team', 'together', 'partner', 'worked with', 'project with'
                ]) * 0.3;
            case 'works_for':
                return this.countIndicators(lowerContext, [
                    'employee', 'works at', 'job at', 'position at', 'hired by', 'employed by'
                ]) * 0.4;
            case 'created_by':
                return this.countIndicators(lowerContext, [
                    'develops', 'created', 'built', 'developed', 'maintains', 'working on'
                ]) * 0.3;
            case 'mentioned_with':
                return this.countIndicators(lowerContext, [
                    'with', 'and', 'also', 'together'
                ]) * 0.2;
            default:
                return 0.1; // Base context strength
        }
    }
    /**
     * Count relationship indicators in text
     */
    countIndicators(text, indicators) {
        let count = 0;
        for (const indicator of indicators) {
            if (text.includes(indicator)) {
                count++;
            }
        }
        return Math.min(1.0, count / indicators.length);
    }
    /**
     * Check for work-related indicators
     */
    hasWorkIndicators(context) {
        const workPatterns = /\b(collaborate|team|together|partner|project|work)\b/i;
        return workPatterns.test(context);
    }
    /**
     * Check for employment indicators
     */
    hasEmploymentIndicators(context) {
        const employmentPatterns = /\b(works at|employed by|job at|position at|hired by|employee)\b/i;
        return employmentPatterns.test(context);
    }
    /**
     * Check for development indicators
     */
    hasDevelopmentIndicators(context) {
        const devPatterns = /\b(develops|created|built|developed|maintains|working on)\b/i;
        return devPatterns.test(context);
    }
    /**
     * Store relationship in database
     */
    async storeRelationship(relationship) {
        const db = this.dbManager.getConnection();
        const now = Date.now();
        const relationshipRecord = {
            id: this.generateId(),
            sourceEntityId: relationship.sourceEntity.id,
            targetEntityId: relationship.targetEntity.id,
            relationshipType: relationship.relationshipType,
            strength: relationship.confidence,
            context: relationship.suggestedContext,
            createdAt: now,
            updatedAt: now
        };
        const stmt = db.prepare(`
      INSERT OR REPLACE INTO entity_relationships (
        id, source_entity_id, target_entity_id, relationship_type,
        strength, first_mentioned_at, last_mentioned_at, mention_count,
        context_messages, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(relationshipRecord.id, relationshipRecord.sourceEntityId, relationshipRecord.targetEntityId, relationshipRecord.relationshipType, relationshipRecord.strength, now, // first_mentioned_at
        now, // last_mentioned_at  
        1, // mention_count
        JSON.stringify([relationship.suggestedContext]), // context_messages as JSON array
        relationshipRecord.createdAt, relationshipRecord.updatedAt);
        return relationshipRecord;
    }
    /**
     * Get relationships for an entity
     */
    async getEntityRelationships(entityId) {
        const db = this.dbManager.getConnection();
        const stmt = db.prepare(`
      SELECT * FROM entity_relationships 
      WHERE source_entity_id = ? OR target_entity_id = ?
      ORDER BY strength DESC, created_at DESC
    `);
        const rows = stmt.all(entityId, entityId);
        return rows.map(row => ({
            id: row.id,
            sourceEntityId: row.source_entity_id,
            targetEntityId: row.target_entity_id,
            relationshipType: row.relationship_type,
            strength: row.strength,
            context: row.context,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        }));
    }
    /**
     * Batch analyze relationships across multiple messages
     */
    async analyzeConversation(_conversationId) {
        // This would integrate with message processing to analyze entire conversations
        // For now, return a placeholder structure
        return {
            totalCoOccurrences: 0,
            totalRelationships: 0,
            strongestRelationships: []
        };
    }
    /**
     * Generate UUID
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}
//# sourceMappingURL=RelationshipDetector.js.map