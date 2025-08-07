/**
 * Knowledge Graph Service - Phase 3
 *
 * Orchestrates entity extraction, linking, and relationship detection to build
 * a comprehensive knowledge graph from conversations. This is the main entry
 * point for all knowledge graph operations.
 */
import { EntityExtractionService } from './EntityExtractionService.js';
import { EntityLinker } from './EntityLinker.js';
import { RelationshipDetector } from './RelationshipDetector.js';
import { EntityRepository } from '../storage/repositories/EntityRepository.js';
export class KnowledgeGraphService {
    dbManager;
    extractionService;
    entityLinker;
    relationshipDetector;
    entityRepository;
    config;
    constructor(dbManager, config) {
        this.dbManager = dbManager;
        this.config = this.mergeConfig(config);
        // Initialize services
        this.extractionService = new EntityExtractionService(dbManager, this.config.extraction);
        this.entityLinker = new EntityLinker(dbManager, this.config.linking);
        this.relationshipDetector = new RelationshipDetector(dbManager, this.config.relationships);
        this.entityRepository = new EntityRepository(dbManager);
    }
    /**
     * Process a single message through the full knowledge graph pipeline
     */
    async processMessage(messageId, conversationId, content, metadata) {
        const startTime = Date.now();
        const insights = [];
        try {
            // Step 1: Extract entities from message
            const extractionResult = await this.extractionService.processMessage(messageId, conversationId, content);
            // Step 2: Link entities and resolve aliases
            let linkedCount = 0;
            let aliasesCreated = 0;
            for (const extracted of extractionResult.extractedEntities) {
                const linkingResult = await this.entityLinker.linkEntity(extracted.text, extracted.type, extracted.context);
                if (linkingResult.linkedEntity && linkingResult.suggestedAliases.length > 0) {
                    linkedCount++;
                    // Create aliases for better future matching
                    const aliases = await this.entityLinker.createAliases(linkingResult.linkedEntity.id, linkingResult.suggestedAliases.map(alias => ({
                        alias,
                        type: 'variation',
                        confidence: 0.8
                    })));
                    aliasesCreated += aliases.length;
                }
            }
            // Step 3: Detect relationships between entities
            const entityMentions = extractionResult.mentions.map(mention => ({
                entityId: mention.entityId,
                startPosition: mention.startPosition,
                endPosition: mention.endPosition,
                type: extractionResult.extractedEntities.find(e => e.startPosition === mention.startPosition)?.type || 'concept'
            }));
            const relationshipResult = await this.relationshipDetector.analyzeMessage(messageId, conversationId, content, entityMentions);
            // Store detected relationships
            for (const relationship of relationshipResult.detectedRelationships) {
                await this.relationshipDetector.storeRelationship(relationship);
            }
            // Step 4: Generate insights
            const messageInsights = await this.generateInsights(extractionResult.extractedEntities, relationshipResult.detectedRelationships, metadata);
            insights.push(...messageInsights);
            return {
                entitiesExtracted: extractionResult.extractedEntities.length,
                entitiesLinked: linkedCount,
                relationshipsDetected: relationshipResult.detectedRelationships.length,
                aliasesCreated,
                processingTime: Date.now() - startTime,
                insights
            };
        }
        catch (error) {
            console.error('Failed to process message for knowledge graph:', error);
            throw error;
        }
    }
    /**
     * Process an entire conversation
     */
    async processConversation(conversationId) {
        const startTime = Date.now();
        // Get all messages in conversation
        const db = this.dbManager.getConnection();
        const messages = db.prepare(`
      SELECT id, content, created_at, role 
      FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `).all(conversationId);
        let totalEntities = 0;
        let totalRelationships = 0;
        const allInsights = [];
        // Process each message
        for (const message of messages) {
            const result = await this.processMessage(message.id, conversationId, message.content, {
                timestamp: message.created_at
            });
            totalEntities += result.entitiesExtracted;
            totalRelationships += result.relationshipsDetected;
            allInsights.push(...result.insights);
        }
        // Analyze conversation-level patterns
        const keyInsights = await this.analyzeConversationPatterns(conversationId, allInsights);
        return {
            totalMessages: messages.length,
            totalEntities,
            totalRelationships,
            keyInsights,
            processingTime: Date.now() - startTime
        };
    }
    /**
     * Generate insights from extracted entities and relationships
     */
    async generateInsights(entities, relationships, _metadata) {
        const insights = [];
        // Detect key persons (mentioned multiple times or in important contexts)
        const personEntities = entities.filter(e => e.type === 'person');
        if (personEntities.length > 2) {
            insights.push({
                type: 'collaboration_network',
                confidence: 0.7,
                description: `Detected collaboration between ${personEntities.length} people`,
                entities: personEntities,
                evidence: personEntities.map(p => p.context || p.text)
            });
        }
        // Detect technology stacks
        const techEntities = entities.filter(e => e.type === 'technical');
        if (techEntities.length >= 3) {
            insights.push({
                type: 'technology_stack',
                confidence: 0.8,
                description: `Identified technology stack with ${techEntities.length} components`,
                entities: techEntities,
                evidence: techEntities.map(t => t.context || t.text)
            });
        }
        // Detect hub entities (entities with multiple relationships)
        const relationshipCounts = new Map();
        for (const rel of relationships) {
            relationshipCounts.set(rel.sourceEntity.id, (relationshipCounts.get(rel.sourceEntity.id) || 0) + 1);
            relationshipCounts.set(rel.targetEntity.id, (relationshipCounts.get(rel.targetEntity.id) || 0) + 1);
        }
        for (const [entityId, count] of relationshipCounts) {
            if (count >= 3) {
                const entity = await this.entityRepository.getById(entityId);
                if (entity) {
                    insights.push({
                        type: 'hub_entity',
                        confidence: Math.min(0.9, 0.6 + count * 0.1),
                        description: `${entity.name} is connected to ${count} other entities`,
                        entities: [entity],
                        evidence: relationships
                            .filter(r => r.sourceEntity.id === entityId || r.targetEntity.id === entityId)
                            .map(r => r.suggestedContext)
                    });
                }
            }
        }
        return insights;
    }
    /**
     * Analyze patterns across an entire conversation
     */
    async analyzeConversationPatterns(_conversationId, messageInsights) {
        const keyInsights = [];
        // Find most mentioned entities
        const entities = await this.entityRepository.getMostMentioned(5);
        if (entities.length > 0) {
            const keyPerson = entities.find(e => e.type === 'person');
            if (keyPerson) {
                keyInsights.push({
                    type: 'key_person',
                    confidence: 0.85,
                    description: `${keyPerson.name} is a key person with ${keyPerson.mentionCount} mentions`,
                    entities: [keyPerson],
                    evidence: [`Mentioned ${keyPerson.mentionCount} times across conversations`]
                });
            }
        }
        // Aggregate technology insights
        const techInsights = messageInsights.filter(i => i.type === 'technology_stack');
        if (techInsights.length > 0) {
            const allTechEntities = new Set();
            techInsights.forEach(insight => {
                insight.entities.forEach(e => allTechEntities.add(e.name));
            });
            if (allTechEntities.size >= 5) {
                keyInsights.push({
                    type: 'technology_stack',
                    confidence: 0.9,
                    description: `Comprehensive technology stack identified with ${allTechEntities.size} components`,
                    entities: [],
                    evidence: Array.from(allTechEntities)
                });
            }
        }
        return keyInsights;
    }
    /**
     * Get entity with all its relationships and aliases
     */
    async getEntityGraph(entityId) {
        const entity = await this.entityRepository.getById(entityId);
        if (!entity) {
            return {
                entity: null,
                aliases: [],
                relationships: [],
                relatedEntities: []
            };
        }
        const aliases = await this.entityLinker.getEntityAliases(entityId);
        const relationships = await this.relationshipDetector.getEntityRelationships(entityId);
        // Get all related entities
        const relatedEntityIds = new Set();
        relationships.forEach(rel => {
            if (rel.sourceEntityId !== entityId)
                relatedEntityIds.add(rel.sourceEntityId);
            if (rel.targetEntityId !== entityId)
                relatedEntityIds.add(rel.targetEntityId);
        });
        const relatedEntities = await Promise.all(Array.from(relatedEntityIds).map(id => this.entityRepository.getById(id)));
        return {
            entity,
            aliases,
            relationships,
            relatedEntities: relatedEntities.filter(e => e !== null)
        };
    }
    /**
     * Search for entities and their relationships
     */
    async searchKnowledgeGraph(query, options) {
        // Search for matching entities
        // If multiple entity types specified, we need to do multiple searches
        let allEntities = [];
        if (options?.entityTypes && options.entityTypes.length > 0) {
            // Search each type separately and combine results
            for (const entityType of options.entityTypes) {
                const searchResult = await this.entityRepository.search({
                    query,
                    type: entityType,
                    limit: options?.limit || 10
                });
                allEntities.push(...searchResult.entities);
            }
            // Remove duplicates
            const uniqueEntities = new Map();
            allEntities.forEach(entity => uniqueEntities.set(entity.id, entity));
            allEntities = Array.from(uniqueEntities.values());
        }
        else {
            // Search all types
            const searchResult = await this.entityRepository.search({
                query,
                limit: options?.limit || 10
            });
            allEntities = searchResult.entities;
        }
        // Get relationships for found entities
        const allRelationships = [];
        for (const entity of allEntities) {
            const relationships = await this.relationshipDetector.getEntityRelationships(entity.id);
            allRelationships.push(...relationships);
        }
        // Filter relationships by type if specified
        const filteredRelationships = options?.relationshipTypes
            ? allRelationships.filter(r => options.relationshipTypes.includes(r.relationshipType))
            : allRelationships;
        // Generate search-specific insights
        const insights = [];
        if (allEntities.length > 0) {
            insights.push({
                type: 'relationship_cluster',
                confidence: 0.7,
                description: `Found ${allEntities.length} entities related to "${query}"`,
                entities: allEntities,
                evidence: allEntities.map(e => `${e.name} (${e.type})`)
            });
        }
        return {
            entities: allEntities,
            relationships: filteredRelationships,
            insights
        };
    }
    /**
     * Export knowledge graph in various formats
     */
    async exportKnowledgeGraph(format) {
        const allEntities = await this.entityRepository.search({ limit: 1000 });
        const allRelationships = [];
        for (const entity of allEntities.entities) {
            const relationships = await this.relationshipDetector.getEntityRelationships(entity.id);
            allRelationships.push(...relationships);
        }
        switch (format) {
            case 'json':
                return JSON.stringify({
                    entities: allEntities.entities,
                    relationships: allRelationships,
                    metadata: {
                        exportDate: new Date().toISOString(),
                        entityCount: allEntities.total,
                        relationshipCount: allRelationships.length
                    }
                }, null, 2);
            case 'graphml':
                // GraphML format for graph visualization tools
                let graphml = '<?xml version="1.0" encoding="UTF-8"?>\n';
                graphml += '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">\n';
                graphml += '  <graph id="G" edgedefault="directed">\n';
                // Add nodes
                for (const entity of allEntities.entities) {
                    graphml += `    <node id="${entity.id}">\n`;
                    graphml += `      <data key="name">${entity.name}</data>\n`;
                    graphml += `      <data key="type">${entity.type}</data>\n`;
                    graphml += `    </node>\n`;
                }
                // Add edges
                for (const rel of allRelationships) {
                    graphml += `    <edge source="${rel.sourceEntityId}" target="${rel.targetEntityId}">\n`;
                    graphml += `      <data key="type">${rel.relationshipType}</data>\n`;
                    graphml += `      <data key="strength">${rel.strength}</data>\n`;
                    graphml += `    </edge>\n`;
                }
                graphml += '  </graph>\n</graphml>';
                return graphml;
            case 'cypher':
                // Neo4j Cypher query format
                let cypher = '// Knowledge Graph Export - Neo4j Cypher Queries\n\n';
                // Create nodes
                cypher += '// Create Entities\n';
                for (const entity of allEntities.entities) {
                    cypher += `CREATE (n:${entity.type} {id: '${entity.id}', name: '${entity.name}'});\n`;
                }
                cypher += '\n// Create Relationships\n';
                for (const rel of allRelationships) {
                    cypher += `MATCH (a {id: '${rel.sourceEntityId}'}), (b {id: '${rel.targetEntityId}'}) `;
                    cypher += `CREATE (a)-[:${rel.relationshipType.toUpperCase()} {strength: ${rel.strength}}]->(b);\n`;
                }
                return cypher;
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    /**
     * Merge default config with provided config
     */
    mergeConfig(config) {
        return {
            extraction: {
                minConfidence: 0.6,
                maxEntitiesPerMessage: 20,
                enableContextCapture: true,
                ...config?.extraction
            },
            linking: {
                fuzzyThreshold: 0.8,
                enableAliasGeneration: true,
                maxCandidates: 5,
                ...config?.linking
            },
            relationships: {
                maxCoOccurrenceDistance: 500,
                minRelationshipStrength: 0.3,
                enableSemanticAnalysis: true,
                ...config?.relationships
            },
            future: {
                enableSentimentAnalysis: false,
                enableTopicModeling: false,
                enableTemporalAnalysis: false,
                enableCausalInference: false,
                ...config?.future
            }
        };
    }
}
//# sourceMappingURL=KnowledgeGraphService.js.map