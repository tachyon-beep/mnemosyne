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
import { DatabaseManager } from '../../../storage/Database.js';
import { Entity, EntityType } from '../../../storage/repositories/EntityRepository.js';
import { EntityRelationship } from '../../../entities/RelationshipDetector.js';
import { Message, Conversation } from '../../../types/interfaces.js';
export interface EntityKnowledge {
    entity: Entity;
    attributes: EntityAttribute[];
    relationships: EntityRelationship[];
    mentions: EntityMention[];
    timeline: AttributeChange[];
    knowledgeScore: number;
    lastUpdated: number;
}
export interface EntityAttribute {
    name: string;
    value: string;
    confidence: number;
    sourceMessageId: string;
    sourceConversationId: string;
    extractedAt: number;
    context: string;
}
export interface EntityMention {
    messageId: string;
    conversationId: string;
    content: string;
    context: string;
    timestamp: number;
    sentiment?: 'positive' | 'negative' | 'neutral';
    importance: number;
}
export interface AttributeChange {
    attribute: string;
    oldValue?: string;
    newValue: string;
    confidence: number;
    sourceMessageId: string;
    timestamp: number;
    changeType: 'addition' | 'modification' | 'contradiction' | 'confirmation';
}
export interface EntityConflict {
    id: string;
    entityId: string;
    conflictType: ConflictType;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    conflictingStatements: ConflictingStatement[];
    detectedAt: number;
    resolutionSuggestion?: string;
}
export type ConflictType = 'property_contradiction' | 'status_inconsistency' | 'temporal_impossibility' | 'relationship_conflict' | 'existence_dispute' | 'identity_confusion' | 'authority_disagreement';
export interface ConflictingStatement {
    messageId: string;
    conversationId: string;
    statement: string;
    context: string;
    confidence: number;
    timestamp: number;
    source?: string;
}
export interface ContextSuggestion {
    type: SuggestionType;
    title: string;
    description: string;
    relevanceScore: number;
    entities: Entity[];
    conversations: Conversation[];
    messages: Message[];
    reasoning: string;
}
export type SuggestionType = 'related_conversation' | 'expert_insight' | 'similar_context' | 'temporal_connection' | 'relationship_network' | 'follow_up_needed' | 'missing_information' | 'contradiction_alert';
export interface ExpertRecommendation {
    person: Entity;
    expertiseAreas: string[];
    credibilityScore: number;
    interactionHistory: ExpertInteraction[];
    recentActivity: number;
    knowledgeDepth: number;
    recommendationReason: string;
}
export interface ExpertInteraction {
    conversationId: string;
    messageId: string;
    topic: string;
    contribution: string;
    timestamp: number;
    impactScore: number;
}
export interface KnowledgeSynthesizerConfig {
    minConfidenceThreshold: number;
    maxAttributesPerEntity: number;
    attributeExtractionPatterns: AttributePattern[];
    conflictDetectionEnabled: boolean;
    temporalWindowDays: number;
    conflictSeverityThresholds: {
        low: number;
        medium: number;
        high: number;
    };
    maxSuggestions: number;
    relevanceThreshold: number;
    temporalDecayFactor: number;
    expertiseCalculationWindow: number;
    minInteractionsForExpert: number;
    credibilityFactors: {
        recency: number;
        frequency: number;
        accuracy: number;
    };
}
export interface AttributePattern {
    name: string;
    pattern: RegExp;
    confidence: number;
    entityTypes: EntityType[];
}
export declare class KnowledgeSynthesizer {
    private dbManager;
    private entityRepository;
    private relationshipDetector;
    private conversationRepository;
    private messageRepository;
    private config;
    constructor(dbManager: DatabaseManager, config?: Partial<KnowledgeSynthesizerConfig>);
    /**
     * Synthesize comprehensive knowledge about an entity
     */
    synthesizeEntityKnowledge(entityId: string): Promise<EntityKnowledge>;
    /**
     * Detect conflicting statements about entities
     */
    detectConflictingStatements(entityId?: string): Promise<EntityConflict[]>;
    /**
     * Suggest relevant context based on current entities and conversation
     */
    suggestRelevantContext(currentEntities: string[], conversationId: string, limit?: number): Promise<ContextSuggestion[]>;
    /**
     * Recommend experts on specific topics or entities
     */
    recommendExperts(entities: string[], topic?: string, limit?: number): Promise<ExpertRecommendation[]>;
    /**
     * Get all mentions of an entity across conversations
     */
    private getEntityMentions;
    /**
     * Extract attributes from entity mentions using patterns and NLP
     */
    private extractEntityAttributes;
    /**
     * Build timeline of attribute changes
     */
    private buildAttributeTimeline;
    /**
     * Detect property conflicts (contradicting attribute values)
     */
    private detectPropertyConflicts;
    /**
     * Detect status inconsistencies
     */
    private detectStatusConflicts;
    /**
     * Detect temporal impossibilities
     */
    private detectTemporalConflicts;
    /**
     * Detect relationship conflicts
     */
    private detectRelationshipConflicts;
    /**
     * Find conversations related to given entities
     */
    private findRelatedConversations;
    /**
     * Find expert insights from knowledgeable people
     */
    private findExpertInsights;
    /**
     * Find similar discussion contexts
     */
    private findSimilarContexts;
    /**
     * Find contradiction alerts
     */
    private findContradictionAlerts;
    /**
     * Find missing information gaps
     */
    private findMissingInformation;
    /**
     * Calculate knowledge score for an entity
     */
    private calculateKnowledgeScore;
    /**
     * Helper methods
     */
    private mergeConfig;
    private getDefaultAttributePatterns;
    private getGenericAttributePatterns;
    private deduplicateAttributes;
    private determineChangeType;
    private calculateStringSimilarity;
    private calculateConflictSeverity;
    private suggestPropertyResolution;
    private parseDate;
    private findPeopleWithEntityInteractions;
    private calculateExpertiseAreas;
    private calculateCredibilityScore;
    private getExpertInteractionHistory;
    private calculateRecentActivity;
    private calculateKnowledgeDepth;
    private generateRecommendationReason;
    private identifyMissingAttributes;
    private getExpectedAttributesForType;
    private generateId;
}
//# sourceMappingURL=KnowledgeSynthesizer.d.ts.map