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
import { AnalyticsRepository } from './AnalyticsRepository.js';
/**
 * Repository for conversation analytics data
 */
export class ConversationAnalyticsRepository extends AnalyticsRepository {
    constructor(databaseManager) {
        super(databaseManager);
    }
    /**
     * Save conversation analytics
     */
    async saveAnalytics(input) {
        const id = this.generateId();
        const now = this.getCurrentTimestamp();
        const sql = `
      INSERT INTO conversation_analytics (
        id, conversation_id, analyzed_at,
        topic_count, topic_transitions, depth_score, circularity_index,
        productivity_score, resolution_time, insight_count, breakthrough_count,
        question_quality_avg, response_quality_avg, engagement_score,
        metadata, created_at, updated_at
      ) VALUES (
        @id, @conversationId, @analyzedAt,
        @topicCount, @topicTransitions, @depthScore, @circularityIndex,
        @productivityScore, @resolutionTime, @insightCount, @breakthroughCount,
        @questionQualityAvg, @responseQualityAvg, @engagementScore,
        @metadata, @createdAt, @updatedAt
      )
    `;
        const params = {
            id,
            conversationId: input.conversationId,
            analyzedAt: now,
            topicCount: input.topicCount,
            topicTransitions: input.topicTransitions,
            depthScore: input.depthScore,
            circularityIndex: input.circularityIndex,
            productivityScore: input.productivityScore,
            resolutionTime: input.resolutionTime || null,
            insightCount: input.insightCount || 0,
            breakthroughCount: input.breakthroughCount || 0,
            questionQualityAvg: input.questionQualityAvg || 0,
            responseQualityAvg: input.responseQualityAvg || 0,
            engagementScore: input.engagementScore || 0,
            metadata: this.stringifyMetadata(input.metadata),
            createdAt: now,
            updatedAt: now
        };
        try {
            this.executeStatementRun('save_analytics', sql, params);
            return id;
        }
        catch (error) {
            this.handleConstraintError(error, 'conversation analytics');
        }
    }
    /**
     * Get analytics for specific conversation
     */
    async getConversationAnalytics(conversationId) {
        const sql = `
      SELECT 
        id, conversation_id, analyzed_at,
        topic_count, topic_transitions, depth_score, circularity_index,
        productivity_score, resolution_time, insight_count, breakthrough_count,
        question_quality_avg, response_quality_avg, engagement_score,
        metadata, created_at, updated_at
      FROM conversation_analytics 
      WHERE conversation_id = @conversationId
      ORDER BY analyzed_at DESC 
      LIMIT 1
    `;
        const result = this.executeStatement('get_conversation_analytics', sql, { conversationId });
        return result ? this.mapRowToAnalytics(result) : null;
    }
    /**
     * Get analytics for multiple conversations
     */
    async getMultipleAnalytics(conversationIds) {
        if (conversationIds.length === 0) {
            return new Map();
        }
        const placeholders = conversationIds.map((_, i) => `$${i + 1}`).join(', ');
        const sql = `
      SELECT DISTINCT
        conversation_id, 
        id, analyzed_at, topic_count, topic_transitions, depth_score, circularity_index,
        productivity_score, resolution_time, insight_count, breakthrough_count,
        question_quality_avg, response_quality_avg, engagement_score,
        metadata, created_at, updated_at
      FROM conversation_analytics 
      WHERE conversation_id IN (${placeholders})
        AND analyzed_at = (
          SELECT MAX(analyzed_at) 
          FROM conversation_analytics ca2 
          WHERE ca2.conversation_id = conversation_analytics.conversation_id
        )
      ORDER BY analyzed_at DESC
    `;
        const results = this.executeStatementAll(`get_multiple_analytics_${conversationIds.length}`, sql, conversationIds);
        const analyticsMap = new Map();
        for (const row of results) {
            const analytics = this.mapRowToAnalytics(row);
            analyticsMap.set(analytics.conversationId, analytics);
        }
        return analyticsMap;
    }
    /**
     * Get productivity summary for time range
     */
    async getProductivitySummary(timeRange) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const sql = `
      WITH latest_analytics AS (
        SELECT DISTINCT
          conversation_id,
          productivity_score,
          depth_score,
          circularity_index,
          insight_count,
          analyzed_at,
          ROW_NUMBER() OVER (
            PARTITION BY conversation_id 
            ORDER BY analyzed_at DESC
          ) as rn
        FROM conversation_analytics
        WHERE analyzed_at BETWEEN @start AND @end
      ),
      filtered_analytics AS (
        SELECT 
          productivity_score,
          depth_score,
          circularity_index,
          insight_count
        FROM latest_analytics 
        WHERE rn = 1
      ),
      trend_data AS (
        SELECT 
          productivity_score,
          (analyzed_at / 1000) as time_x
        FROM latest_analytics
        WHERE rn = 1 AND productivity_score IS NOT NULL
        ORDER BY analyzed_at
      ),
      trend_stats AS (
        SELECT 
          COUNT(*) as n,
          AVG(time_x) as x_mean,
          AVG(productivity_score) as y_mean,
          SUM(time_x * productivity_score) as sum_xy,
          SUM(time_x * time_x) as sum_x2
        FROM trend_data
      )
      SELECT 
        COALESCE(AVG(productivity_score), 0) as average_score,
        COALESCE(SUM(insight_count), 0) as total_insights,
        COALESCE(AVG(depth_score), 0) as average_depth,
        COALESCE(AVG(circularity_index), 0) as average_circularity,
        COUNT(*) as total_conversations,
        COALESCE(
          CASE 
            WHEN ts.n > 1 AND (ts.n * ts.sum_x2 - (ts.n * ts.x_mean * ts.x_mean)) != 0 
            THEN (ts.n * ts.sum_xy - (ts.n * ts.x_mean * ts.y_mean)) / 
                 (ts.n * ts.sum_x2 - (ts.n * ts.x_mean * ts.x_mean))
            ELSE 0 
          END, 0
        ) as trend_slope
      FROM filtered_analytics fa
      CROSS JOIN trend_stats ts
    `;
        const result = this.executeStatement('productivity_summary', sql, validTimeRange);
        // Calculate median separately (SQLite doesn't have built-in median)
        const scores = this.getProductivityScores(validTimeRange);
        const medianScore = this.calculatePercentile(scores, 50);
        return {
            averageScore: result?.average_score || 0,
            medianScore,
            trendSlope: result?.trend_slope || 0,
            totalConversations: result?.total_conversations || 0,
            totalInsights: result?.total_insights || 0,
            averageDepth: result?.average_depth || 0,
            averageCircularity: result?.average_circularity || 0
        };
    }
    /**
     * Get topic flow summary
     */
    async getTopicFlowSummary(timeRange) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const sql = `
      WITH latest_analytics AS (
        SELECT DISTINCT
          conversation_id,
          topic_count,
          topic_transitions,
          depth_score,
          circularity_index,
          analyzed_at,
          ROW_NUMBER() OVER (
            PARTITION BY conversation_id 
            ORDER BY analyzed_at DESC
          ) as rn
        FROM conversation_analytics
        WHERE analyzed_at BETWEEN @start AND @end
      ),
      filtered_analytics AS (
        SELECT 
          topic_count,
          topic_transitions,
          depth_score,
          circularity_index
        FROM latest_analytics 
        WHERE rn = 1
      )
      SELECT 
        COALESCE(AVG(topic_count), 0) as average_topic_count,
        COALESCE(AVG(topic_transitions), 0) as average_transitions,
        COALESCE(AVG(depth_score), 0) as average_depth_score,
        COALESCE(AVG(circularity_index), 0) as average_circularity_index,
        COUNT(CASE WHEN circularity_index > 0.7 THEN 1 END) as high_circularity_count,
        COUNT(CASE WHEN depth_score > 80 THEN 1 END) as deep_analysis_count
      FROM filtered_analytics
    `;
        const result = this.executeStatement('topic_flow_summary', sql, validTimeRange);
        return {
            averageTopicCount: result?.average_topic_count || 0,
            averageTransitions: result?.average_transitions || 0,
            averageDepthScore: result?.average_depth_score || 0,
            averageCircularityIndex: result?.average_circularity_index || 0,
            conversationsWithHighCircularity: result?.high_circularity_count || 0,
            conversationsWithDeepAnalysis: result?.deep_analysis_count || 0
        };
    }
    /**
     * Get top performing conversations by productivity
     */
    async getTopPerformingConversations(limit = 10, timeRange) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const { limit: validLimit } = this.validatePagination(limit);
        const sql = `
      WITH latest_analytics AS (
        SELECT 
          id, conversation_id, analyzed_at,
          topic_count, topic_transitions, depth_score, circularity_index,
          productivity_score, resolution_time, insight_count, breakthrough_count,
          question_quality_avg, response_quality_avg, engagement_score,
          metadata, created_at, updated_at,
          ROW_NUMBER() OVER (
            PARTITION BY conversation_id 
            ORDER BY analyzed_at DESC
          ) as rn
        FROM conversation_analytics
        WHERE analyzed_at BETWEEN @start AND @end
      )
      SELECT 
        id, conversation_id, analyzed_at,
        topic_count, topic_transitions, depth_score, circularity_index,
        productivity_score, resolution_time, insight_count, breakthrough_count,
        question_quality_avg, response_quality_avg, engagement_score,
        metadata, created_at, updated_at
      FROM latest_analytics 
      WHERE rn = 1
      ORDER BY productivity_score DESC, insight_count DESC
      LIMIT @limit
    `;
        const results = this.executeStatementAll('top_performing_conversations', sql, { ...validTimeRange, limit: validLimit });
        return results.map(row => this.mapRowToAnalytics(row));
    }
    /**
     * Get conversations needing analysis
     */
    async getConversationsNeedingAnalysis(limit = 50) {
        const sql = `
      SELECT c.id
      FROM conversations c
      LEFT JOIN conversation_analytics ca ON c.id = ca.conversation_id
      WHERE ca.conversation_id IS NULL 
        OR ca.analyzed_at < c.updated_at
      ORDER BY c.updated_at DESC
      LIMIT @limit
    `;
        const results = this.executeStatementAll('conversations_needing_analysis', sql, { limit });
        return results.map(row => row.id);
    }
    /**
     * Update existing analytics
     */
    async updateAnalytics(conversationId, updates) {
        const setParts = [];
        const params = { conversationId };
        // Build dynamic update query
        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                const dbKey = this.camelToSnake(key);
                setParts.push(`${dbKey} = @${key}`);
                params[key] = key === 'metadata' ? this.stringifyMetadata(value) : value;
            }
        }
        if (setParts.length === 0) {
            return; // Nothing to update
        }
        setParts.push('updated_at = @updatedAt');
        params.updatedAt = this.getCurrentTimestamp();
        const sql = `
      UPDATE conversation_analytics 
      SET ${setParts.join(', ')}
      WHERE conversation_id = @conversationId
        AND analyzed_at = (
          SELECT MAX(analyzed_at) 
          FROM conversation_analytics ca2 
          WHERE ca2.conversation_id = @conversationId
        )
    `;
        this.executeStatementRun('update_analytics', sql, params);
    }
    /**
     * Delete analytics for conversation
     */
    async deleteAnalytics(conversationId) {
        const sql = `
      DELETE FROM conversation_analytics 
      WHERE conversation_id = @conversationId
    `;
        const result = this.executeStatementRun('delete_analytics', sql, { conversationId });
        return result.changes;
    }
    /**
     * Batch save conversation analytics with optimized performance
     */
    async batchSaveAnalytics(analyticsInputs, options = {}) {
        if (analyticsInputs.length === 0) {
            return { inserted: 0, updated: 0, failed: 0, errors: [] };
        }
        const { batchSize = 100, conflictResolution = 'UPDATE', onProgress } = options;
        const now = this.getCurrentTimestamp();
        // Prepare analytics records with IDs and timestamps
        const records = analyticsInputs.map(input => ({
            id: this.generateId(),
            conversationId: input.conversationId,
            analyzedAt: now,
            topicCount: input.topicCount,
            topicTransitions: input.topicTransitions,
            depthScore: input.depthScore,
            circularityIndex: input.circularityIndex,
            productivityScore: input.productivityScore,
            resolutionTime: input.resolutionTime || null,
            insightCount: input.insightCount || 0,
            breakthroughCount: input.breakthroughCount || 0,
            questionQualityAvg: input.questionQualityAvg || 0,
            responseQualityAvg: input.responseQualityAvg || 0,
            engagementScore: input.engagementScore || 0,
            metadata: this.stringifyMetadata(input.metadata),
            createdAt: now,
            updatedAt: now
        }));
        // Transform keys for database
        const dbRecords = records.map(record => ({
            id: record.id,
            conversation_id: record.conversationId,
            analyzed_at: record.analyzedAt,
            topic_count: record.topicCount,
            topic_transitions: record.topicTransitions,
            depth_score: record.depthScore,
            circularity_index: record.circularityIndex,
            productivity_score: record.productivityScore,
            resolution_time: record.resolutionTime,
            insight_count: record.insightCount,
            breakthrough_count: record.breakthroughCount,
            question_quality_avg: record.questionQualityAvg,
            response_quality_avg: record.responseQualityAvg,
            engagement_score: record.engagementScore,
            metadata: record.metadata,
            created_at: record.createdAt,
            updated_at: record.updatedAt
        }));
        try {
            if (conflictResolution === 'UPDATE') {
                // Use upsert for update behavior
                const result = this.batchUpsert('conversation_analytics', dbRecords, ['conversation_id'], {
                    batchSize,
                    onProgress
                });
                return {
                    inserted: result.inserted,
                    updated: result.updated,
                    failed: result.failed,
                    errors: []
                };
            }
            else {
                // Use batch insert for other conflict resolutions
                const result = this.batchInsert('conversation_analytics', dbRecords, {
                    batchSize,
                    conflictResolution: conflictResolution,
                    onProgress
                });
                return {
                    inserted: result.inserted,
                    updated: 0,
                    failed: result.failed,
                    errors: result.errors
                };
            }
        }
        catch (error) {
            throw new Error(`Batch analytics save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Batch update analytics with selective field updates
     */
    async batchUpdateAnalytics(updates, options = {}) {
        if (updates.length === 0) {
            return { updated: 0, failed: 0 };
        }
        const { batchSize = 100, onProgress } = options;
        let totalUpdated = 0;
        let totalFailed = 0;
        // Process updates in batches
        for (let i = 0; i < updates.length; i += batchSize) {
            const batch = updates.slice(i, i + batchSize);
            await this.transaction((db) => {
                for (const { conversationId, updates: updateFields } of batch) {
                    try {
                        const setParts = [];
                        const params = { conversationId };
                        // Build dynamic update query
                        for (const [key, value] of Object.entries(updateFields)) {
                            if (value !== undefined) {
                                const dbKey = this.camelToSnake(key);
                                setParts.push(`${dbKey} = @${key}`);
                                params[key] = key === 'metadata' ? this.stringifyMetadata(value) : value;
                            }
                        }
                        if (setParts.length > 0) {
                            setParts.push('updated_at = @updatedAt');
                            params.updatedAt = this.getCurrentTimestamp();
                            const sql = `
                UPDATE conversation_analytics 
                SET ${setParts.join(', ')}
                WHERE conversation_id = @conversationId
                  AND analyzed_at = (
                    SELECT MAX(analyzed_at) 
                    FROM conversation_analytics ca2 
                    WHERE ca2.conversation_id = @conversationId
                  )
              `;
                            const stmt = db.prepare(sql);
                            const result = stmt.run(params);
                            if (result.changes > 0) {
                                totalUpdated++;
                            }
                        }
                    }
                    catch (error) {
                        totalFailed++;
                        console.error(`Failed to update analytics for conversation ${conversationId}:`, error);
                    }
                }
            });
            if (onProgress) {
                onProgress(Math.min(i + batchSize, updates.length), updates.length);
            }
        }
        return { updated: totalUpdated, failed: totalFailed };
    }
    /**
     * Batch delete analytics for multiple conversations
     */
    async batchDeleteAnalytics(conversationIds, options = {}) {
        if (conversationIds.length === 0) {
            return { deleted: 0, failed: 0 };
        }
        const { batchSize = 100, onProgress } = options;
        let totalDeleted = 0;
        let totalFailed = 0;
        // Process deletions in batches
        for (let i = 0; i < conversationIds.length; i += batchSize) {
            const batch = conversationIds.slice(i, i + batchSize);
            try {
                const placeholders = batch.map((_, index) => `@id${index}`).join(', ');
                const params = batch.reduce((acc, id, index) => {
                    acc[`id${index}`] = id;
                    return acc;
                }, {});
                const sql = `
          DELETE FROM conversation_analytics 
          WHERE conversation_id IN (${placeholders})
        `;
                const result = this.executeStatementRun(`batch_delete_analytics_${i}`, sql, params);
                totalDeleted += result.changes;
            }
            catch (error) {
                totalFailed += batch.length;
                console.error(`Failed to delete analytics batch ${i}:`, error);
            }
            if (onProgress) {
                onProgress(Math.min(i + batchSize, conversationIds.length), conversationIds.length);
            }
        }
        return { deleted: totalDeleted, failed: totalFailed };
    }
    /**
     * Get productivity scores for percentile calculation
     */
    getProductivityScores(timeRange) {
        const sql = `
      WITH latest_analytics AS (
        SELECT DISTINCT
          conversation_id,
          productivity_score,
          ROW_NUMBER() OVER (
            PARTITION BY conversation_id 
            ORDER BY analyzed_at DESC
          ) as rn
        FROM conversation_analytics
        WHERE analyzed_at BETWEEN @start AND @end
          AND productivity_score IS NOT NULL
      )
      SELECT productivity_score
      FROM latest_analytics 
      WHERE rn = 1
      ORDER BY productivity_score
    `;
        const results = this.executeStatementAll('productivity_scores', sql, timeRange);
        return results.map(r => r.productivity_score);
    }
    /**
     * Convert camelCase to snake_case
     */
    camelToSnake(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    /**
     * Map database row to ConversationAnalytics interface
     */
    mapRowToAnalytics(row) {
        return {
            id: row.id,
            conversationId: row.conversation_id,
            analyzedAt: row.analyzed_at,
            topicCount: row.topic_count,
            topicTransitions: row.topic_transitions,
            depthScore: row.depth_score,
            circularityIndex: row.circularity_index,
            productivityScore: row.productivity_score,
            resolutionTime: row.resolution_time,
            insightCount: row.insight_count,
            breakthroughCount: row.breakthrough_count,
            questionQualityAvg: row.question_quality_avg,
            responseQualityAvg: row.response_quality_avg,
            engagementScore: row.engagement_score,
            metadata: this.parseAnalyticsMetadata(row.metadata),
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
}
//# sourceMappingURL=ConversationAnalyticsRepository.js.map