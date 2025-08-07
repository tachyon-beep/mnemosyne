/**
 * Productivity Patterns Repository
 *
 * Handles database operations for productivity analytics:
 * - Time-based productivity patterns
 * - Peak hour detection
 * - Question effectiveness metrics
 * - Session length analysis
 * - Breakthrough pattern tracking
 */
import { AnalyticsRepository, TimeRange, PaginationOptions } from './AnalyticsRepository.js';
import { DatabaseManager } from '../../storage/Database.js';
export interface ProductivityPattern {
    id: string;
    windowStart: number;
    windowEnd: number;
    windowType: 'hour' | 'day' | 'week' | 'month';
    totalConversations: number;
    totalMessages: number;
    totalDecisions: number;
    totalInsights: number;
    avgProductivityScore: number;
    peakProductivityScore: number;
    minProductivityScore: number;
    peakHours: number[];
    effectiveQuestionPatterns: QuestionPattern[];
    breakthroughIndicators: string[];
    optimalSessionLength: number;
    sampleSize: number;
    confidenceLevel: number;
    createdAt: number;
    updatedAt: number;
}
export interface QuestionPattern {
    pattern: string;
    effectivenessScore: number;
    insightProbability: number;
    frequency: number;
}
export interface ProductivityPatternInput {
    windowStart: number;
    windowEnd: number;
    windowType: 'hour' | 'day' | 'week' | 'month';
    totalConversations: number;
    totalMessages: number;
    totalDecisions?: number;
    totalInsights?: number;
    avgProductivityScore: number;
    peakProductivityScore?: number;
    minProductivityScore?: number;
    peakHours?: number[];
    effectiveQuestionPatterns?: QuestionPattern[];
    breakthroughIndicators?: string[];
    optimalSessionLength?: number;
    sampleSize: number;
    confidenceLevel?: number;
}
export interface HourlyProductivity {
    hour: number;
    avgScore: number;
    conversationCount: number;
    messageCount: number;
    insightCount: number;
    confidenceLevel: number;
}
export interface SessionLengthAnalysis {
    optimalLength: number;
    averageLength: number;
    medianLength: number;
    efficiencyByLength: Array<{
        lengthRange: string;
        efficiency: number;
        sampleSize: number;
    }>;
}
/**
 * Repository for productivity patterns and time-based analytics
 */
export declare class ProductivityPatternsRepository extends AnalyticsRepository {
    constructor(databaseManager: DatabaseManager);
    /**
     * Save productivity pattern
     */
    savePattern(input: ProductivityPatternInput): Promise<string>;
    /**
     * Get productivity patterns for time range and window type
     */
    getPatterns(windowType: 'hour' | 'day' | 'week' | 'month', timeRange?: TimeRange, options?: PaginationOptions): Promise<ProductivityPattern[]>;
    /**
     * Get hourly productivity analysis
     */
    getHourlyProductivity(timeRange?: TimeRange): Promise<HourlyProductivity[]>;
    /**
     * Get peak productivity hours
     */
    getPeakHours(timeRange?: TimeRange): Promise<number[]>;
    /**
     * Analyze session lengths and find optimal duration
     */
    getSessionLengthAnalysis(timeRange?: TimeRange): Promise<SessionLengthAnalysis>;
    /**
     * Get question effectiveness patterns
     */
    getQuestionPatterns(timeRange?: TimeRange, minFrequency?: number): Promise<QuestionPattern[]>;
    /**
     * Get latest patterns for time window type
     */
    getLatestPattern(windowType: 'hour' | 'day' | 'week' | 'month'): Promise<ProductivityPattern | null>;
    /**
     * Delete old patterns beyond retention period
     */
    cleanupOldPatterns(retentionDays?: number): Promise<number>;
    /**
     * Batch save productivity patterns with optimized performance
     */
    batchSavePatterns(patternInputs: ProductivityPatternInput[], options?: {
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
     * Batch update productivity patterns
     */
    batchUpdatePatterns(updates: Array<{
        windowStart: number;
        windowEnd: number;
        windowType: 'hour' | 'day' | 'week' | 'month';
        updates: Partial<ProductivityPatternInput>;
    }>, options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        updated: number;
        failed: number;
    }>;
    /**
     * Batch delete patterns for multiple time windows
     */
    batchDeletePatterns(patterns: Array<{
        windowStart: number;
        windowEnd: number;
        windowType: 'hour' | 'day' | 'week' | 'month';
    }>, options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        deleted: number;
        failed: number;
    }>;
    /**
     * Bulk analyze conversations and generate productivity patterns
     */
    bulkAnalyzeProductivityPatterns(conversations: Array<{
        id: string;
        createdAt: number;
        messages: any[];
        analytics?: any;
    }>, windowType: 'hour' | 'day' | 'week' | 'month', options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        patterns: ProductivityPattern[];
        processed: number;
        failed: number;
    }>;
    /**
     * Map database row to ProductivityPattern interface
     */
    private mapRowToPattern;
    /**
     * Get weekly productivity data for trend analysis
     */
    getWeeklyProductivity(timeRange: TimeRange): Promise<number>;
    /**
     * Get monthly productivity data for trend analysis
     */
    getMonthlyProductivity(timeRange: TimeRange): Promise<number>;
    /**
     * Get daily productivity data with timestamps
     */
    getDailyProductivity(timeRange: TimeRange): Promise<Array<{
        timestamp: number;
        productivity: number;
    }>>;
    /**
     * Safely parse JSON array from database
     */
    private parseJSONArray;
    /**
     * Group conversations by time window for batch analysis
     */
    private groupConversationsByTimeWindow;
    /**
     * Calculate productivity pattern for a time window
     */
    private calculateWindowPattern;
}
//# sourceMappingURL=ProductivityPatternsRepository.d.ts.map