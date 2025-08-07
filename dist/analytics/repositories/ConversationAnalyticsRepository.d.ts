/**
 * Conversation Analytics Repository
 *
 * Handles database operations for conversation flow metrics and analysis:
 * - Topic flow tracking
 * - Depth score calculations
 * - Circularity measurements
 * - Productivity scoring
 * - Insight detection
 */
import { AnalyticsRepository, TimeRange } from './AnalyticsRepository.js';
import { DatabaseManager } from '../../storage/Database.js';
export interface ConversationAnalytics {
    id: string;
    conversationId: string;
    analyzedAt: number;
    topicCount: number;
    topicTransitions: number;
    depthScore: number;
    circularityIndex: number;
    productivityScore: number;
    resolutionTime?: number;
    insightCount: number;
    breakthroughCount: number;
    questionQualityAvg: number;
    responseQualityAvg: number;
    engagementScore: number;
    metadata: Record<string, any>;
    createdAt: number;
    updatedAt: number;
}
export interface ConversationAnalyticsInput {
    conversationId: string;
    topicCount: number;
    topicTransitions: number;
    depthScore: number;
    circularityIndex: number;
    productivityScore: number;
    resolutionTime?: number;
    insightCount?: number;
    breakthroughCount?: number;
    questionQualityAvg?: number;
    responseQualityAvg?: number;
    engagementScore?: number;
    metadata?: Record<string, any>;
}
export interface ProductivitySummary {
    averageScore: number;
    medianScore: number;
    trendSlope: number;
    totalConversations: number;
    totalInsights: number;
    averageDepth: number;
    averageCircularity: number;
}
export interface TopicFlowSummary {
    averageTopicCount: number;
    averageTransitions: number;
    averageDepthScore: number;
    averageCircularityIndex: number;
    conversationsWithHighCircularity: number;
    conversationsWithDeepAnalysis: number;
}
/**
 * Repository for conversation analytics data
 */
export declare class ConversationAnalyticsRepository extends AnalyticsRepository {
    constructor(databaseManager: DatabaseManager);
    /**
     * Save conversation analytics
     */
    saveAnalytics(input: ConversationAnalyticsInput): Promise<string>;
    /**
     * Get analytics for specific conversation
     */
    getConversationAnalytics(conversationId: string): Promise<ConversationAnalytics | null>;
    /**
     * Get analytics for multiple conversations
     */
    getMultipleAnalytics(conversationIds: string[]): Promise<Map<string, ConversationAnalytics>>;
    /**
     * Get productivity summary for time range
     */
    getProductivitySummary(timeRange?: TimeRange): Promise<ProductivitySummary>;
    /**
     * Get topic flow summary
     */
    getTopicFlowSummary(timeRange?: TimeRange): Promise<TopicFlowSummary>;
    /**
     * Get top performing conversations by productivity
     */
    getTopPerformingConversations(limit?: number, timeRange?: TimeRange): Promise<ConversationAnalytics[]>;
    /**
     * Get conversations needing analysis
     */
    getConversationsNeedingAnalysis(limit?: number): Promise<string[]>;
    /**
     * Update existing analytics
     */
    updateAnalytics(conversationId: string, updates: Partial<ConversationAnalyticsInput>): Promise<void>;
    /**
     * Delete analytics for conversation
     */
    deleteAnalytics(conversationId: string): Promise<number>;
    /**
     * Batch save conversation analytics with optimized performance
     */
    batchSaveAnalytics(analyticsInputs: ConversationAnalyticsInput[], options?: {
        batchSize?: number;
        conflictResolution?: 'IGNORE' | 'REPLACE' | 'UPDATE';
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        inserted: number;
        updated: number;
        failed: number;
        errors: Error[];
    }>;
    /**
     * Batch update analytics with selective field updates
     */
    batchUpdateAnalytics(updates: Array<{
        conversationId: string;
        updates: Partial<ConversationAnalyticsInput>;
    }>, options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        updated: number;
        failed: number;
    }>;
    /**
     * Batch delete analytics for multiple conversations
     */
    batchDeleteAnalytics(conversationIds: string[], options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        deleted: number;
        failed: number;
    }>;
    /**
     * Get productivity scores for percentile calculation
     */
    private getProductivityScores;
    /**
     * Convert camelCase to snake_case
     */
    private camelToSnake;
    /**
     * Map database row to ConversationAnalytics interface
     */
    private mapRowToAnalytics;
}
//# sourceMappingURL=ConversationAnalyticsRepository.d.ts.map