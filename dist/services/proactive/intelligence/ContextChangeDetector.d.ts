/**
 * Context Change Detector - Intelligence Services Expert specializing in context analysis
 *
 * This service detects when conversation context shifts, identifies relevant historical
 * context, finds conflicting information, and optimizes context windows for current
 * conversations by leveraging our knowledge graph infrastructure.
 */
import { BaseRepository } from '../../../storage/repositories/BaseRepository.js';
import { EntityRepository, Entity } from '../../../storage/repositories/EntityRepository.js';
import { KnowledgeGraphRepository } from '../../../storage/repositories/KnowledgeGraphRepository.js';
import { DatabaseManager } from '../../../storage/Database.js';
import { Message, Conversation } from '../../../types/interfaces.js';
/**
 * Represents a detected topic shift in conversation
 */
export interface TopicShift {
    /** Unique identifier for this shift */
    id: string;
    /** Message where shift was detected */
    shiftMessage: Message;
    /** Previous dominant entities */
    previousEntities: Entity[];
    /** New dominant entities */
    newEntities: Entity[];
    /** Confidence of shift detection (0-1) */
    shiftConfidence: number;
    /** Type of shift detected */
    shiftType: 'entity_replacement' | 'entity_addition' | 'topic_pivot' | 'context_expansion';
    /** Entities that triggered the shift */
    triggerEntities: Entity[];
    /** Timestamp when shift was detected */
    detectedAt: number;
}
/**
 * Represents relevant historical context for current conversation
 */
export interface RelevantHistory {
    /** Unique identifier for this history entry */
    id: string;
    /** Related conversation */
    conversation: Conversation;
    /** Messages relevant to current context */
    relevantMessages: Message[];
    /** Entities connecting this history to current context */
    connectingEntities: Entity[];
    /** Relevance score (0-1) */
    relevanceScore: number;
    /** Type of relevance */
    relevanceType: 'entity_overlap' | 'relationship_chain' | 'topic_continuation' | 'problem_resolution';
    /** Time since this history was last mentioned */
    daysSinceLastMention: number;
}
/**
 * Represents conflicting information about entities
 */
export interface ConflictingInformation {
    /** Unique identifier for this conflict */
    id: string;
    /** Entity that has conflicting information */
    entity: Entity;
    /** Messages containing conflicting statements */
    conflictingMessages: Array<{
        message: Message;
        extractedClaim: string;
        confidence: number;
    }>;
    /** Type of conflict */
    conflictType: 'property_contradiction' | 'status_inconsistency' | 'relationship_conflict' | 'temporal_impossibility';
    /** Severity of conflict (0-1) */
    conflictSeverity: number;
    /** Suggested resolution */
    suggestedResolution?: string;
    /** Timestamp when conflict was detected */
    detectedAt: number;
}
/**
 * Represents optimal context window analysis
 */
export interface ContextWindow {
    /** Unique identifier for this context window */
    id: string;
    /** Core entities for current conversation */
    coreEntities: Entity[];
    /** Recommended messages to include in context */
    recommendedMessages: Message[];
    /** Context relevance score (0-1) */
    contextRelevance: number;
    /** Estimated token count for this context */
    estimatedTokens: number;
    /** Context freshness score (0-1) */
    freshness: number;
    /** Entities that might become relevant soon */
    potentialEntities: Entity[];
}
/**
 * Entity appearance pattern in conversation
 */
export interface EntityPattern {
    entity: Entity;
    frequency: number;
    firstMention: number;
    lastMention: number;
    mentionTrend: 'increasing' | 'decreasing' | 'stable' | 'sporadic';
    averageGapBetweenMentions: number;
    coOccurringEntities: Array<{
        entity: Entity;
        coOccurrenceCount: number;
    }>;
}
/**
 * Configuration for context change detection
 */
export interface ContextDetectionConfig {
    /** Minimum confidence threshold for detecting shifts */
    minShiftConfidence: number;
    /** Window size for analyzing entity patterns (in messages) */
    entityPatternWindow: number;
    /** Minimum relevance score for historical context */
    minRelevanceScore: number;
    /** Maximum age of historical context in days */
    maxHistoryAgeDays: number;
    /** Minimum conflict severity to report */
    minConflictSeverity: number;
    /** Maximum context window size in estimated tokens */
    maxContextTokens: number;
}
/**
 * Context Change Detection Service
 */
export declare class ContextChangeDetector extends BaseRepository {
    private entityRepository;
    private knowledgeGraphRepo;
    private config;
    constructor(databaseManager: DatabaseManager, entityRepository: EntityRepository, knowledgeGraphRepo: KnowledgeGraphRepository, config?: Partial<ContextDetectionConfig>);
    /**
     * Detect topic shifts by analyzing entity frequency changes
     */
    detectTopicShifts(conversationId: string, options?: {
        lookbackMessages?: number;
        minShiftConfidence?: number;
    }): Promise<TopicShift[]>;
    /**
     * Identify relevant historical conversations about current entities
     */
    identifyRelevantHistory(conversationId: string, options?: {
        maxHistoryAge?: number;
        minRelevanceScore?: number;
        limit?: number;
    }): Promise<RelevantHistory[]>;
    /**
     * Find conflicting information about entities across conversations
     */
    findConflictingInformation(options?: {
        conversationId?: string;
        entityIds?: string[];
        minSeverity?: number;
        limit?: number;
    }): Promise<ConflictingInformation[]>;
    /**
     * Analyze optimal context window for current conversation
     */
    analyzeContextWindow(conversationId: string, options?: {
        maxTokens?: number;
        includeHistory?: boolean;
    }): Promise<ContextWindow>;
    /**
     * Analyze entity patterns within a conversation
     */
    private analyzeEntityPatterns;
    /**
     * Analyze potential shift between two message windows
     */
    private analyzeWindowShift;
    /**
     * Get entities currently active in conversation
     */
    private getCurrentConversationEntities;
    /**
     * Get connecting entities and messages between conversations
     */
    private getConnectingEntitiesAndMessages;
    /**
     * Calculate relevance score for historical context
     */
    private calculateHistoryRelevanceScore;
    /**
     * Detect conflicts between entity mentions
     */
    private detectEntityConflicts;
    /**
     * Calculate conflict severity
     */
    private calculateConflictSeverity;
    /**
     * Classify type of conflict
     */
    private classifyConflictType;
    /**
     * Generate resolution suggestion for conflicts
     */
    private generateResolutionSuggestion;
    /**
     * Identify entities that might become relevant
     */
    private identifyPotentialEntities;
    /**
     * Estimate token count for messages
     */
    private estimateTokenCount;
    /**
     * Calculate context relevance score
     */
    private calculateContextRelevance;
    /**
     * Calculate freshness score based on message ages
     */
    private calculateFreshness;
    /**
     * Calculate mention trend for entity
     */
    private calculateMentionTrend;
    /**
     * Classify type of topic shift
     */
    private classifyShiftType;
    /**
     * Determine type of historical relevance
     */
    private determineRelevanceType;
    /**
     * Map database row to Message object
     */
    private mapRowToMessage;
}
//# sourceMappingURL=ContextChangeDetector.d.ts.map