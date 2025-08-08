/**
 * Analytics Engine - Central orchestration service for Phase 5 analytics
 *
 * Coordinates all analytics components:
 * - Conversation flow analysis
 * - Productivity pattern detection
 * - Knowledge gap identification
 * - Decision quality tracking
 * - Report generation and caching
 */
import { DatabaseManager } from '../../storage/Database.js';
import { TimeRange } from '../repositories/index.js';
export interface AnalyticsEngineConfig {
    enableIncrementalProcessing: boolean;
    cacheExpirationMinutes: number;
    batchProcessingSize: number;
    maxProcessingTimeMs: number;
}
interface ConversationMetrics {
    totalConversations: number;
    averageProductivity: number;
    averageDepth: number;
    averageCircularity: number;
    totalInsights: number;
}
interface ProductivityInsights {
    peakHours: number[];
    optimalSessionLength: number;
    topQuestionPatterns: string[];
    weeklyTrend: number;
}
interface KnowledgeGapMetrics {
    totalUnresolved: number;
    criticalGaps: number;
    averageResolutionTime: number;
    topicCoverage: number;
}
interface DecisionMetrics {
    totalDecisions: number;
    averageQuality: number;
    averageOutcome: number;
    reversalRate: number;
}
export interface AnalyticsReport {
    generatedAt: number;
    timeRange: TimeRange;
    conversationMetrics: ConversationMetrics;
    productivityInsights: ProductivityInsights;
    knowledgeGaps: KnowledgeGapMetrics;
    decisionQuality: DecisionMetrics;
    recommendations: string[];
    insights: string[];
}
/**
 * Central analytics engine orchestrating all analytics components
 */
export declare class AnalyticsEngine {
    private conversationAnalytics;
    private productivityPatterns;
    private knowledgeGaps;
    private decisionTracking;
    private conversations;
    private messages;
    private conversationFlowAnalyzer;
    private productivityAnalyzer;
    private knowledgeGapDetector;
    private decisionTracker;
    private config;
    private cache;
    constructor(databaseManager: DatabaseManager, config?: Partial<AnalyticsEngineConfig>);
    /**
     * Generate comprehensive analytics report
     */
    generateReport(timeRange?: TimeRange, format?: 'summary' | 'detailed' | 'executive'): Promise<AnalyticsReport>;
    /**
     * Process conversations that need analytics
     */
    processNeedingAnalysis(): Promise<number>;
    /**
     * Analyze single conversation using real analyzer classes
     */
    analyzeConversation(conversationId: string): Promise<void>;
    /**
     * Get conversation metrics
     */
    private getConversationMetrics;
    /**
     * Get productivity insights with real calculation
     */
    private getProductivityInsights;
    /**
     * Get knowledge gap metrics
     */
    private getKnowledgeGapMetrics;
    /**
     * Get decision quality metrics
     */
    private getDecisionMetrics;
    /**
     * Generate insights from metrics
     */
    private generateInsights;
    /**
     * Generate recommendations from metrics
     */
    private generateRecommendations;
    /**
     * Analyze productivity patterns across conversations
     */
    analyzeProductivityPatterns(timeRange?: TimeRange): Promise<number>;
    /**
     * Analyze knowledge gaps across conversations
     */
    analyzeKnowledgeGaps(timeRange?: TimeRange): Promise<number>;
    /**
     * Estimate session duration based on message timestamps
     */
    private estimateSessionDuration;
    /**
     * Analyze decision patterns across conversations
     */
    analyzeDecisionPatterns(timeRange?: TimeRange): Promise<number>;
    /**
     * Process knowledge gaps and store them in repository using batch operations
     */
    private processKnowledgeGaps;
    /**
     * Fallback individual knowledge gap processing
     */
    private fallbackProcessKnowledgeGaps;
    /**
     * Process decisions and store them in repository using batch operations
     */
    private processDecisions;
    /**
     * Fallback individual decision processing
     */
    private fallbackProcessDecisions;
    /**
     * Calculate productivity trend over time
     */
    private calculateProductivityTrend;
    /**
     * Validate and normalize time range
     */
    private validateTimeRange;
    /**
     * Get item from cache if not expired
     */
    private getFromCache;
    /**
     * Set item in cache with expiration
     */
    private setCache;
    /**
     * Invalidate cache entries matching pattern
     */
    private invalidateCache;
    /**
     * Clear all cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        keys: string[];
    };
    /**
     * Batch process multiple conversations with optimized analytics operations
     */
    batchProcessConversations(conversationIds: string[], options?: {
        batchSize?: number;
        analysisTypes?: ('analytics' | 'productivity' | 'knowledge-gaps' | 'decisions')[];
        onProgress?: (processed: number, total: number, currentOperation: string) => void;
        maxProcessingTimeMs?: number;
    }): Promise<{
        processed: number;
        failed: number;
        analytics: {
            inserted: number;
            updated: number;
            failed: number;
        };
        patterns: {
            inserted: number;
            updated: number;
            failed: number;
        };
        knowledgeGaps: {
            processed: number;
            failed: number;
            duplicates: number;
        };
        decisions: {
            tracked: number;
            failed: number;
        };
        processingTimeMs: number;
    }>;
    /**
     * Load conversations with messages in batches
     */
    private loadConversationsBatch;
    /**
     * Batch analyze multiple conversations
     */
    private batchAnalyzeConversations;
}
export {};
//# sourceMappingURL=AnalyticsEngine.d.ts.map