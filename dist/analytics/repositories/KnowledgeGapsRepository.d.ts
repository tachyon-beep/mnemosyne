/**
 * Knowledge Gaps Repository
 *
 * Handles database operations for knowledge gap detection and tracking:
 * - Gap identification and clustering
 * - Learning curve tracking
 * - Resolution monitoring
 * - Topic coverage analysis
 * - Expertise mapping
 */
import { AnalyticsRepository, TimeRange, PaginationOptions } from './AnalyticsRepository.js';
import { DatabaseManager } from '../../storage/Database.js';
export interface KnowledgeGap {
    id: string;
    gapType: 'question' | 'topic' | 'skill' | 'concept';
    content: string;
    normalizedContent: string;
    frequency: number;
    firstOccurrence: number;
    lastOccurrence: number;
    explorationDepth: number;
    resolved: boolean;
    resolutionConversationId?: string;
    resolutionDate?: number;
    resolutionQuality: number;
    learningCurveGradient: number;
    estimatedTimeToMastery?: number;
    relatedEntities: string[];
    relatedGaps: string[];
    suggestedActions: string[];
    suggestedResources: string[];
    createdAt: number;
    updatedAt: number;
}
export interface KnowledgeGapInput {
    gapType: 'question' | 'topic' | 'skill' | 'concept';
    content: string;
    normalizedContent?: string;
    frequency?: number;
    firstOccurrence?: number;
    lastOccurrence?: number;
    explorationDepth?: number;
    relatedEntities?: string[];
    suggestedActions?: string[];
    suggestedResources?: string[];
}
export interface GapCluster {
    clusterId: string;
    gaps: KnowledgeGap[];
    centroidContent: string;
    totalFrequency: number;
    averageExploration: number;
    resolvedCount: number;
    priority: 'critical' | 'high' | 'medium' | 'low';
}
export interface LearningProgress {
    gapId: string;
    topic: string;
    progressPoints: Array<{
        timestamp: number;
        understandingLevel: number;
        conversationId: string;
    }>;
    currentLevel: number;
    gradient: number;
    plateauDetected: boolean;
    estimatedCompletion?: number;
}
export interface TopicCoverage {
    topic: string;
    mentionCount: number;
    explorationDepth: number;
    relatedTopics: string[];
    gapCount: number;
    averageResolutionTime: number;
    coverageScore: number;
}
/**
 * Repository for knowledge gap detection and learning analytics
 */
export declare class KnowledgeGapsRepository extends AnalyticsRepository {
    constructor(databaseManager: DatabaseManager);
    /**
     * Save or update a knowledge gap
     */
    saveGap(input: KnowledgeGapInput): Promise<string>;
    /**
     * Find gaps that need resolution
     */
    getUnresolvedGaps(gapType?: 'question' | 'topic' | 'skill' | 'concept', options?: PaginationOptions): Promise<KnowledgeGap[]>;
    /**
     * Get gaps by priority (frequency and recency weighted)
     */
    getGapsByPriority(timeRange?: TimeRange, options?: PaginationOptions): Promise<Array<KnowledgeGap & {
        priority: number;
    }>>;
    /**
     * Cluster similar gaps
     */
    getGapClusters(minClusterSize?: number, similarityThreshold?: number): Promise<GapCluster[]>;
    /**
     * Track learning progress for a gap
     */
    getLearningProgress(gapId: string): Promise<LearningProgress | null>;
    /**
     * Get topic coverage analysis
     */
    getTopicCoverage(timeRange?: TimeRange): Promise<TopicCoverage[]>;
    /**
     * Mark gap as resolved
     */
    markResolved(gapId: string, resolutionConversationId: string, resolutionQuality?: number): Promise<void>;
    /**
     * Update gap exploration depth
     */
    updateExplorationDepth(gapId: string, depth: number): Promise<void>;
    /**
     * Get gap by ID
     */
    getGap(gapId: string): Promise<KnowledgeGap | null>;
    /**
     * Find similar gap by content
     */
    private findSimilarGap;
    /**
     * Increment gap frequency
     */
    private incrementGapFrequency;
    /**
     * Normalize content for similarity comparison
     */
    private normalizeContent;
    /**
     * Calculate string similarity (simple Jaccard similarity)
     */
    private calculateStringSimilarity;
    /**
     * Calculate learning gradient from progress points
     */
    private calculateLearningGradient;
    /**
     * Detect if learning has plateaued
     */
    private detectPlateau;
    /**
     * Estimate completion time based on gradient and current level
     */
    private estimateCompletionTime;
    /**
     * Map database row to KnowledgeGap interface
     */
    private mapRowToGap;
    /**
     * Parse JSON array safely
     */
    private parseJSONArray;
    /**
     * Batch save knowledge gaps with optimized performance
     */
    batchSaveGaps(gapInputs: KnowledgeGapInput[], options?: {
        batchSize?: number;
        conflictResolution?: 'IGNORE' | 'REPLACE' | 'UPDATE';
        onProgress?: (processed: number, total: number) => void;
        deduplication?: boolean;
    }): Promise<{
        inserted: number;
        updated: number;
        failed: number;
        duplicates: number;
        errors: Error[];
    }>;
    /**
     * Batch update gap exploration depth
     */
    batchUpdateExplorationDepth(updates: Array<{
        gapId: string;
        depth: number;
    }>, options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        updated: number;
        failed: number;
    }>;
    /**
     * Batch mark gaps as resolved
     */
    batchMarkResolved(resolutions: Array<{
        gapId: string;
        resolutionConversationId: string;
        resolutionQuality?: number;
    }>, options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        updated: number;
        failed: number;
    }>;
    /**
     * Batch increment gap frequencies
     */
    batchIncrementFrequency(gapIds: string[], options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        updated: number;
        failed: number;
    }>;
    /**
     * Batch process knowledge gaps from conversation analysis
     */
    batchProcessGapsFromConversations(conversationGaps: Array<{
        conversationId: string;
        gaps: any[];
        conversationMetadata?: any;
    }>, options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
        deduplication?: boolean;
    }): Promise<{
        processed: number;
        failed: number;
        duplicates: number;
    }>;
    /**
     * Deduplicate similar gaps based on normalized content
     */
    private deduplicateGaps;
    /**
     * Merge multiple similar gaps into one
     */
    private mergeGaps;
    /**
     * Estimate exploration depth from gap and conversation metadata
     */
    private estimateExplorationDepth;
    /**
     * Extract related entities from gap content
     */
    private extractRelatedEntities;
    /**
     * Generate suggested actions for a gap
     */
    private generateSuggestedActions;
    /**
     * Generate suggested resources for a gap
     */
    private generateSuggestedResources;
}
//# sourceMappingURL=KnowledgeGapsRepository.d.ts.map