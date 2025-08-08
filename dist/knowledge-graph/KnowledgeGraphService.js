/**
 * Knowledge Graph Service
 *
 * Main service that coordinates entity extraction, relationship detection,
 * and graph operations for cross-conversation intelligence.
 */
import { EntityExtractor } from './EntityExtractor.js';
import { RelationshipDetector } from './RelationshipDetector.js';
import { KnowledgeGraphRepository } from '../storage/repositories/KnowledgeGraphRepository.js';
/**
 * Main knowledge graph service implementation
 */
export class KnowledgeGraphService {
    entityExtractor;
    relationshipDetector;
    repository;
    config;
    constructor(db, config = {}) {
        this.config = {
            enableAutoProcessing: true,
            batchProcessingSize: 100,
            maxEntitiesPerMessage: 20,
            minEntityConfidence: 0.5,
            minRelationshipConfidence: 0.4,
            enableRelationshipDecay: true,
            relationshipDecayDays: 30,
            ...config
        };
        this.repository = new KnowledgeGraphRepository(db);
        this.entityExtractor = new EntityExtractor({
            maxEntitiesPerMessage: this.config.maxEntitiesPerMessage,
            minConfidence: this.config.minEntityConfidence
        });
        this.relationshipDetector = new RelationshipDetector({
            minConfidence: this.config.minRelationshipConfidence
        });
    }
    /**
     * Process a message to extract entities and detect relationships
     */
    async processMessage(messageId, conversationId, content, _createdAt) {
        const startTime = Date.now();
        try {
            // Extract entities from message content
            const extractedEntities = this.entityExtractor.extractEntities(content, messageId);
            // Create or update entities in the database
            const entityMap = new Map();
            let entitiesCreated = 0;
            for (const extractedEntity of extractedEntities) {
                const existingEntity = await this.repository.findEntityByName(extractedEntity.normalizedText);
                let entity;
                if (existingEntity) {
                    entity = existingEntity;
                }
                else {
                    entity = await this.repository.createEntity({
                        name: extractedEntity.text,
                        normalized_name: extractedEntity.normalizedText,
                        type: extractedEntity.type,
                        confidence_score: extractedEntity.confidence,
                        metadata: {
                            first_seen_message: messageId,
                            first_seen_conversation: conversationId,
                            extraction_method: extractedEntity.extractionMethod
                        }
                    });
                    entitiesCreated++;
                }
                entityMap.set(extractedEntity.normalizedText, entity);
                // Create entity mention
                await this.repository.createEntityMention({
                    entity_id: entity.id,
                    message_id: messageId,
                    conversation_id: conversationId,
                    mention_text: extractedEntity.text,
                    start_position: extractedEntity.startPosition,
                    end_position: extractedEntity.endPosition,
                    confidence_score: extractedEntity.confidence,
                    extraction_method: extractedEntity.extractionMethod
                });
            }
            // Detect relationships between entities
            const detectedRelationships = this.relationshipDetector.detectRelationships(extractedEntities, content, messageId, conversationId);
            // Create or update relationships
            let relationshipsCreated = 0;
            for (const detectedRelationship of detectedRelationships) {
                const sourceEntity = this.findEntityByExtractedId(detectedRelationship.sourceEntityId, entityMap);
                const targetEntity = this.findEntityByExtractedId(detectedRelationship.targetEntityId, entityMap);
                if (sourceEntity && targetEntity) {
                    await this.repository.createOrUpdateRelationship(sourceEntity.id, targetEntity.id, detectedRelationship.relationshipType, detectedRelationship.confidence, detectedRelationship.contextMessageIds);
                    relationshipsCreated++;
                }
            }
            const processingTimeMs = Date.now() - startTime;
            return {
                entitiesExtracted: extractedEntities.length,
                relationshipsDetected: detectedRelationships.length,
                entitiesCreated,
                relationshipsCreated,
                processingTimeMs
            };
        }
        catch (error) {
            console.error('Error processing message for knowledge graph:', error);
            throw error;
        }
    }
    /**
     * Get entity history across conversations
     */
    async getEntityHistory(entityName) {
        const normalizedName = entityName.toLowerCase().trim();
        const entity = await this.repository.findEntityByName(normalizedName);
        if (!entity) {
            return null;
        }
        // Get entity mentions
        const mentions = await this.repository.getEntityMentions(entity.id);
        // Get entity relationships
        const relationships = await this.repository.getEntityRelationships(entity.id);
        // TODO: Get entity evolution (would need to implement evolution tracking)
        const evolution = [];
        return {
            entity,
            mentions: mentions.map(mention => ({
                messageId: mention.id,
                conversationId: mention.conversation_id,
                conversationTitle: mention.conversation_title,
                content: mention.content,
                mentionText: mention.mention_text,
                createdAt: mention.created_at,
                confidence: mention.confidence_score
            })),
            relationships: relationships.map(rel => ({
                relatedEntity: {
                    id: rel.source_entity_id === entity.id ? rel.target_entity_id : rel.source_entity_id,
                    name: rel.source_entity_id === entity.id ? rel.target_name : rel.source_name
                },
                relationshipType: rel.relationship_type,
                strength: rel.strength,
                firstMentioned: rel.first_mentioned_at,
                lastMentioned: rel.last_mentioned_at
            })),
            evolution
        };
    }
    /**
     * Find conversations related to specific entities
     */
    async findRelatedConversations(entityNames, options = {}) {
        const { minRelationshipStrength = 0.3 } = options;
        // Find entities by names
        const entities = await Promise.all(entityNames.map(name => this.repository.findEntityByName(name.toLowerCase().trim())));
        const validEntities = entities.filter(e => e !== null);
        if (validEntities.length === 0) {
            return [];
        }
        // Find connected entities
        const connectedEntityIds = new Set();
        for (const entity of validEntities) {
            const connected = await this.repository.findConnectedEntities(entity.id, 2, // 2 degrees of separation
            minRelationshipStrength);
            connectedEntityIds.add(entity.id);
            connected.forEach(c => connectedEntityIds.add(c.entity_id));
        }
        // TODO: Implement conversation relevance query
        // This would require a complex query joining entity_mentions, conversations, and relationships
        // For now, returning empty array as placeholder
        return [];
    }
    /**
     * Get knowledge graph analysis across all conversations
     */
    async getCrossConversationAnalysis() {
        // Get total counts
        const totalEntities = await this.repository.db.prepare('SELECT COUNT(*) as count FROM entities').get();
        const totalRelationships = await this.repository.db.prepare('SELECT COUNT(*) as count FROM entity_relationships').get();
        // Get top entities by mention count and relationships
        const topEntitiesQuery = `
      SELECT 
        e.*,
        COUNT(DISTINCT r1.target_entity_id) + COUNT(DISTINCT r2.source_entity_id) as relationship_count,
        COUNT(DISTINCT em.conversation_id) as conversation_count
      FROM entities e
      LEFT JOIN entity_relationships r1 ON e.id = r1.source_entity_id
      LEFT JOIN entity_relationships r2 ON e.id = r2.target_entity_id
      LEFT JOIN entity_mentions em ON e.id = em.entity_id
      GROUP BY e.id
      ORDER BY relationship_count DESC, e.mention_count DESC
      LIMIT 20
    `;
        const topEntitiesRows = this.repository.db.prepare(topEntitiesQuery).all();
        const topEntities = topEntitiesRows.map(row => ({
            entity: this.mapRowToEntity(row),
            relationshipCount: row.relationship_count || 0,
            conversationCount: row.conversation_count || 0
        }));
        // Get entity clusters
        const entityClusters = await this.repository.findEntityClusters();
        // TODO: Implement temporal patterns analysis
        const temporalPatterns = [];
        return {
            totalEntities: totalEntities.count,
            totalRelationships: totalRelationships.count,
            topEntities,
            entityClusters,
            temporalPatterns
        };
    }
    /**
     * Search entities and relationships
     */
    async searchKnowledgeGraph(query, options = {}) {
        const { includeEntities = true, includeRelationships = true, maxDegrees = 2, minStrength = 0.3, limit = 50 } = options;
        const result = {
            entities: [],
            connectedEntities: [],
            relationships: []
        };
        if (includeEntities) {
            result.entities = await this.repository.searchEntities(query, limit);
        }
        // For each found entity, get connected entities
        if (result.entities.length > 0 && includeRelationships) {
            const connectedEntitySets = await Promise.all(result.entities.slice(0, 5).map(entity => // Limit to first 5 to avoid performance issues
             this.repository.findConnectedEntities(entity.id, maxDegrees, minStrength)));
            result.connectedEntities = connectedEntitySets.flat();
        }
        return result;
    }
    /**
     * Get shortest path between two entities
     */
    async getEntityPath(sourceEntityName, targetEntityName) {
        const sourceEntity = await this.repository.findEntityByName(sourceEntityName.toLowerCase().trim());
        const targetEntity = await this.repository.findEntityByName(targetEntityName.toLowerCase().trim());
        if (!sourceEntity || !targetEntity) {
            return null;
        }
        return this.repository.findShortestPath(sourceEntity.id, targetEntity.id);
    }
    /**
     * Batch process multiple messages
     */
    async batchProcessMessages(messages) {
        const results = [];
        const batchSize = this.config.batchProcessingSize;
        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            const batchResults = await Promise.all(batch.map(msg => this.processMessage(msg.messageId, msg.conversationId, msg.content, msg.createdAt)));
            results.push(...batchResults);
        }
        return results;
    }
    /**
     * Update service configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
        // Update sub-component configurations
        this.entityExtractor.updateConfig({
            maxEntitiesPerMessage: this.config.maxEntitiesPerMessage,
            minConfidence: this.config.minEntityConfidence
        });
        this.relationshipDetector.updateConfig({
            minConfidence: this.config.minRelationshipConfidence
        });
    }
    /**
     * Get service statistics
     */
    async getServiceStats() {
        const totalEntities = await this.repository.db.prepare('SELECT COUNT(*) as count FROM entities').get();
        const totalRelationships = await this.repository.db.prepare('SELECT COUNT(*) as count FROM entity_relationships').get();
        const totalMentions = await this.repository.db.prepare('SELECT COUNT(*) as count FROM entity_mentions').get();
        const entityTypesRows = this.repository.db.prepare('SELECT type, COUNT(*) as count FROM entities GROUP BY type').all();
        const entityTypes = Object.fromEntries(entityTypesRows.map(row => [row.type, row.count]));
        const relationshipTypesRows = this.repository.db.prepare('SELECT relationship_type, COUNT(*) as count FROM entity_relationships GROUP BY relationship_type').all();
        const relationshipTypes = Object.fromEntries(relationshipTypesRows.map(row => [row.relationship_type, row.count]));
        return {
            totalEntities: totalEntities.count,
            totalRelationships: totalRelationships.count,
            totalMentions: totalMentions.count,
            entityTypes,
            relationshipTypes,
            extractorStats: this.entityExtractor.getPatternStats(),
            detectorStats: this.relationshipDetector.getPatternStats()
        };
    }
    /**
     * Helper method to find entity by extracted entity ID
     */
    findEntityByExtractedId(extractedId, entityMap) {
        // The extracted ID format is: entity_{type}_{base64_normalized_name}
        // We need to decode it to find the matching entity
        const parts = extractedId.split('_');
        if (parts.length < 3)
            return null;
        const base64Name = parts.slice(2).join('_');
        try {
            const normalizedName = Buffer.from(base64Name, 'base64').toString('utf8');
            return entityMap.get(normalizedName) || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Helper method to map database row to Entity object
     */
    mapRowToEntity(row) {
        return {
            id: row.id,
            name: row.name,
            normalized_name: row.normalized_name,
            type: row.type,
            canonical_form: row.canonical_form,
            confidence_score: row.confidence_score,
            created_at: row.created_at,
            updated_at: row.updated_at,
            metadata: JSON.parse(row.metadata || '{}'),
            mention_count: row.mention_count,
            last_mentioned_at: row.last_mentioned_at
        };
    }
}
//# sourceMappingURL=KnowledgeGraphService.js.map