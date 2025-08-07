/**
 * Knowledge Graph Service - Phase 3
 *
 * Orchestrates entity extraction, linking, and relationship detection to build
 * a comprehensive knowledge graph from conversations. This is the main entry
 * point for all knowledge graph operations.
 */
import { DatabaseManager } from '../storage/Database.js';
import { Entity, EntityType } from '../storage/repositories/EntityRepository.js';
export interface KnowledgeGraphConfig {
    extraction: {
        minConfidence: number;
        maxEntitiesPerMessage: number;
        enableContextCapture: boolean;
    };
    linking: {
        fuzzyThreshold: number;
        enableAliasGeneration: boolean;
        maxCandidates: number;
    };
    relationships: {
        maxCoOccurrenceDistance: number;
        minRelationshipStrength: number;
        enableSemanticAnalysis: boolean;
    };
    future: {
        enableSentimentAnalysis: boolean;
        enableTopicModeling: boolean;
        enableTemporalAnalysis: boolean;
        enableCausalInference: boolean;
    };
}
export interface ProcessingResult {
    entitiesExtracted: number;
    entitiesLinked: number;
    relationshipsDetected: number;
    aliasesCreated: number;
    processingTime: number;
    insights: KnowledgeInsight[];
}
export interface KnowledgeInsight {
    type: InsightType;
    confidence: number;
    description: string;
    entities: Entity[];
    evidence: string[];
}
export type InsightType = 'key_person' | 'hub_entity' | 'emerging_topic' | 'relationship_cluster' | 'expertise_area' | 'decision_pattern' | 'collaboration_network' | 'technology_stack';
export type FutureRelationshipType = 'influences' | 'competes_with' | 'successor_of' | 'prerequisite_for' | 'contradicts' | 'supports' | 'criticizes' | 'recommends' | 'learns_from' | 'reports_to' | 'funded_by' | 'owns' | 'publishes' | 'hosts' | 'integrates_with';
export interface FutureExtractionTypes {
    sentiment: {
        polarity: 'positive' | 'negative' | 'neutral' | 'mixed';
        intensity: number;
        target: string;
        aspect: string;
    };
    temporal: {
        type: 'deadline' | 'milestone' | 'duration' | 'frequency';
        value: string;
        reference: 'past' | 'present' | 'future';
        entities: string[];
    };
    metrics: {
        name: string;
        value: number;
        unit: string;
        trend: 'increasing' | 'decreasing' | 'stable';
        context: string;
    };
    commitments: {
        actor: string;
        action: string;
        deadline?: string;
        status: 'proposed' | 'committed' | 'completed' | 'cancelled';
        dependencies: string[];
    };
    uncertainties: {
        question: string;
        askedBy: string;
        answeredBy?: string;
        resolved: boolean;
        importance: 'high' | 'medium' | 'low';
    };
    risks: {
        description: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        likelihood: number;
        mitigation?: string;
        owner?: string;
    };
}
export declare class KnowledgeGraphService {
    private dbManager;
    private extractionService;
    private entityLinker;
    private relationshipDetector;
    private entityRepository;
    private config;
    constructor(dbManager: DatabaseManager, config?: Partial<KnowledgeGraphConfig>);
    /**
     * Process a single message through the full knowledge graph pipeline
     */
    processMessage(messageId: string, conversationId: string, content: string, metadata?: {
        author?: string;
        timestamp?: number;
        context?: Record<string, any>;
    }): Promise<ProcessingResult>;
    /**
     * Process an entire conversation
     */
    processConversation(conversationId: string): Promise<{
        totalMessages: number;
        totalEntities: number;
        totalRelationships: number;
        keyInsights: KnowledgeInsight[];
        processingTime: number;
    }>;
    /**
     * Generate insights from extracted entities and relationships
     */
    private generateInsights;
    /**
     * Analyze patterns across an entire conversation
     */
    private analyzeConversationPatterns;
    /**
     * Get entity with all its relationships and aliases
     */
    getEntityGraph(entityId: string): Promise<{
        entity: Entity | null;
        aliases: any[];
        relationships: any[];
        relatedEntities: Entity[];
    }>;
    /**
     * Search for entities and their relationships
     */
    searchKnowledgeGraph(query: string, options?: {
        entityTypes?: EntityType[];
        relationshipTypes?: string[];
        minConfidence?: number;
        limit?: number;
    }): Promise<{
        entities: Entity[];
        relationships: any[];
        insights: KnowledgeInsight[];
    }>;
    /**
     * Export knowledge graph in various formats
     */
    exportKnowledgeGraph(format: 'json' | 'graphml' | 'cypher'): Promise<string>;
    /**
     * Merge default config with provided config
     */
    private mergeConfig;
}
//# sourceMappingURL=KnowledgeGraphService.d.ts.map