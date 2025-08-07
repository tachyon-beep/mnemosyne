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
import { AnalyticsRepository } from './AnalyticsRepository.js';
/**
 * Repository for productivity patterns and time-based analytics
 */
export class ProductivityPatternsRepository extends AnalyticsRepository {
    constructor(databaseManager) {
        super(databaseManager);
    }
    /**
     * Save productivity pattern
     */
    async savePattern(input) {
        const id = this.generateId();
        const now = this.getCurrentTimestamp();
        const sql = `
      INSERT INTO productivity_patterns (
        id, window_start, window_end, window_type,
        total_conversations, total_messages, total_decisions, total_insights,
        avg_productivity_score, peak_productivity_score, min_productivity_score,
        peak_hours, effective_question_patterns, breakthrough_indicators, 
        optimal_session_length, sample_size, confidence_level,
        created_at, updated_at
      ) VALUES (
        @id, @windowStart, @windowEnd, @windowType,
        @totalConversations, @totalMessages, @totalDecisions, @totalInsights,
        @avgProductivityScore, @peakProductivityScore, @minProductivityScore,
        @peakHours, @effectiveQuestionPatterns, @breakthroughIndicators,
        @optimalSessionLength, @sampleSize, @confidenceLevel,
        @createdAt, @updatedAt
      )
    `;
        const params = {
            id,
            windowStart: input.windowStart,
            windowEnd: input.windowEnd,
            windowType: input.windowType,
            totalConversations: input.totalConversations,
            totalMessages: input.totalMessages,
            totalDecisions: input.totalDecisions || 0,
            totalInsights: input.totalInsights || 0,
            avgProductivityScore: input.avgProductivityScore,
            peakProductivityScore: input.peakProductivityScore || input.avgProductivityScore,
            minProductivityScore: input.minProductivityScore || input.avgProductivityScore,
            peakHours: JSON.stringify(input.peakHours || []),
            effectiveQuestionPatterns: JSON.stringify(input.effectiveQuestionPatterns || []),
            breakthroughIndicators: JSON.stringify(input.breakthroughIndicators || []),
            optimalSessionLength: input.optimalSessionLength || 60,
            sampleSize: input.sampleSize,
            confidenceLevel: input.confidenceLevel || 0.5,
            createdAt: now,
            updatedAt: now
        };
        try {
            this.executeStatementRun('save_productivity_pattern', sql, params);
            return id;
        }
        catch (error) {
            this.handleConstraintError(error, 'productivity pattern');
        }
    }
    /**
     * Get productivity patterns for time range and window type
     */
    async getPatterns(windowType, timeRange, options) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const { limit, offset } = this.validatePagination(options?.limit, options?.offset);
        const sql = `
      SELECT 
        id, window_start, window_end, window_type,
        total_conversations, total_messages, total_decisions, total_insights,
        avg_productivity_score, peak_productivity_score, min_productivity_score,
        peak_hours, effective_question_patterns, breakthrough_indicators,
        optimal_session_length, sample_size, confidence_level,
        created_at, updated_at
      FROM productivity_patterns
      WHERE window_type = @windowType
        AND window_end >= @start 
        AND window_start <= @end
      ORDER BY window_start DESC
      LIMIT @limit OFFSET @offset
    `;
        const results = this.executeStatementAll('get_productivity_patterns', sql, {
            windowType,
            ...validTimeRange,
            limit,
            offset
        });
        return results.map(row => this.mapRowToPattern(row));
    }
    /**
     * Get hourly productivity analysis
     */
    async getHourlyProductivity(timeRange) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const sql = `
      WITH hourly_data AS (
        SELECT 
          CAST(strftime('%H', datetime(c.created_at / 1000, 'unixepoch')) as INTEGER) as hour,
          COALESCE(ca.productivity_score, 50) as productivity_score,
          COUNT(DISTINCT c.id) as conversation_count,
          COUNT(m.id) as message_count,
          COALESCE(ca.insight_count, 0) as insight_count
        FROM conversations c
        LEFT JOIN conversation_analytics ca ON c.id = ca.conversation_id
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE c.created_at BETWEEN @start AND @end
        GROUP BY 
          CAST(strftime('%H', datetime(c.created_at / 1000, 'unixepoch')) as INTEGER),
          c.id
      ),
      hourly_aggregated AS (
        SELECT 
          hour,
          AVG(productivity_score) as avg_score,
          SUM(conversation_count) as total_conversations,
          SUM(message_count) as total_messages,
          SUM(insight_count) as total_insights,
          COUNT(*) as sample_size
        FROM hourly_data
        GROUP BY hour
      )
      SELECT 
        hour,
        avg_score,
        total_conversations as conversation_count,
        total_messages as message_count,
        total_insights as insight_count,
        CASE 
          WHEN sample_size >= 10 THEN 0.9
          WHEN sample_size >= 5 THEN 0.7
          WHEN sample_size >= 3 THEN 0.5
          ELSE 0.3
        END as confidence_level
      FROM hourly_aggregated
      WHERE total_conversations > 0
      ORDER BY hour
    `;
        const results = this.executeStatementAll('hourly_productivity', sql, validTimeRange);
        // Fill missing hours with default values
        const hourlyMap = new Map();
        results.forEach(row => {
            hourlyMap.set(row.hour, {
                hour: row.hour,
                avgScore: row.avg_score || 0,
                conversationCount: row.conversation_count || 0,
                messageCount: row.message_count || 0,
                insightCount: row.insight_count || 0,
                confidenceLevel: row.confidence_level || 0
            });
        });
        // Fill in missing hours (0-23)
        const fullHourlyData = [];
        for (let hour = 0; hour < 24; hour++) {
            if (hourlyMap.has(hour)) {
                fullHourlyData.push(hourlyMap.get(hour));
            }
            else {
                fullHourlyData.push({
                    hour,
                    avgScore: 0,
                    conversationCount: 0,
                    messageCount: 0,
                    insightCount: 0,
                    confidenceLevel: 0
                });
            }
        }
        return fullHourlyData;
    }
    /**
     * Get peak productivity hours
     */
    async getPeakHours(timeRange) {
        const hourlyData = await this.getHourlyProductivity(timeRange);
        // Filter hours with sufficient confidence
        const reliableHours = hourlyData.filter(h => h.confidenceLevel >= 0.5 && h.conversationCount >= 3);
        if (reliableHours.length === 0) {
            return [];
        }
        // Calculate mean and standard deviation
        const scores = reliableHours.map(h => h.avgScore);
        const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        const stdDev = this.calculateStandardDeviation(scores);
        // Peak hours are those with scores > mean + 0.5 * stdDev
        const threshold = mean + (0.5 * stdDev);
        return reliableHours
            .filter(h => h.avgScore > threshold)
            .map(h => h.hour)
            .sort();
    }
    /**
     * Analyze session lengths and find optimal duration
     */
    async getSessionLengthAnalysis(timeRange) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const sql = `
      WITH conversation_durations AS (
        SELECT 
          c.id,
          (MAX(m.created_at) - MIN(m.created_at)) / (1000 * 60.0) as duration_minutes,
          COALESCE(ca.productivity_score, 50) as productivity_score,
          COUNT(m.id) as message_count
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        LEFT JOIN conversation_analytics ca ON c.id = ca.conversation_id
        WHERE c.created_at BETWEEN @start AND @end
        GROUP BY c.id
        HAVING COUNT(m.id) >= 3 -- At least 3 messages for meaningful duration
          AND duration_minutes > 1 -- At least 1 minute
          AND duration_minutes < 480 -- Less than 8 hours (filter outliers)
      ),
      duration_buckets AS (
        SELECT 
          duration_minutes,
          productivity_score,
          CASE 
            WHEN duration_minutes <= 15 THEN '1-15 min'
            WHEN duration_minutes <= 30 THEN '16-30 min'
            WHEN duration_minutes <= 60 THEN '31-60 min'
            WHEN duration_minutes <= 120 THEN '61-120 min'
            WHEN duration_minutes <= 240 THEN '121-240 min'
            ELSE '240+ min'
          END as length_range
        FROM conversation_durations
      ),
      bucket_analysis AS (
        SELECT 
          length_range,
          AVG(productivity_score) as avg_efficiency,
          COUNT(*) as sample_size
        FROM duration_buckets
        GROUP BY length_range
        HAVING sample_size >= 3
      ),
      optimal_analysis AS (
        SELECT 
          duration_minutes,
          productivity_score,
          -- Weight efficiency by sample size proximity to optimal range
          productivity_score * (1 - ABS(duration_minutes - 45) / 200.0) as weighted_score
        FROM conversation_durations
        WHERE duration_minutes BETWEEN 10 AND 180 -- Focus on reasonable range
      )
      SELECT 
        AVG(duration_minutes) as avg_duration,
        (
          SELECT AVG(duration_minutes)
          FROM (
            SELECT duration_minutes 
            FROM conversation_durations 
            ORDER BY duration_minutes
            LIMIT 2 - (SELECT COUNT(*) FROM conversation_durations) % 2
            OFFSET (SELECT (COUNT(*) - 1) / 2 FROM conversation_durations)
          )
        ) as median_duration,
        (
          SELECT duration_minutes
          FROM optimal_analysis
          ORDER BY weighted_score DESC
          LIMIT 1
        ) as optimal_duration
      FROM conversation_durations
    `;
        const result = this.executeStatement('session_length_analysis', sql, validTimeRange);
        // Get efficiency by length ranges
        const bucketSql = `
      WITH conversation_durations AS (
        SELECT 
          c.id,
          (MAX(m.created_at) - MIN(m.created_at)) / (1000 * 60.0) as duration_minutes,
          COALESCE(ca.productivity_score, 50) as productivity_score
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        LEFT JOIN conversation_analytics ca ON c.id = ca.conversation_id
        WHERE c.created_at BETWEEN @start AND @end
        GROUP BY c.id
        HAVING COUNT(m.id) >= 3 AND duration_minutes > 1 AND duration_minutes < 480
      ),
      duration_buckets AS (
        SELECT 
          CASE 
            WHEN duration_minutes <= 15 THEN '1-15 min'
            WHEN duration_minutes <= 30 THEN '16-30 min'
            WHEN duration_minutes <= 60 THEN '31-60 min'
            WHEN duration_minutes <= 120 THEN '61-120 min'
            WHEN duration_minutes <= 240 THEN '121-240 min'
            ELSE '240+ min'
          END as length_range,
          productivity_score
        FROM conversation_durations
      )
      SELECT 
        length_range,
        AVG(productivity_score) as efficiency,
        COUNT(*) as sample_size
      FROM duration_buckets
      GROUP BY length_range
      ORDER BY 
        CASE length_range
          WHEN '1-15 min' THEN 1
          WHEN '16-30 min' THEN 2
          WHEN '31-60 min' THEN 3
          WHEN '61-120 min' THEN 4
          WHEN '121-240 min' THEN 5
          ELSE 6
        END
    `;
        const buckets = this.executeStatementAll('efficiency_by_length', bucketSql, validTimeRange);
        return {
            optimalLength: Math.round(result?.optimal_duration || 45),
            averageLength: Math.round(result?.avg_duration || 60),
            medianLength: Math.round(result?.median_duration || 45),
            efficiencyByLength: buckets.map(bucket => ({
                lengthRange: bucket.length_range,
                efficiency: Math.round(bucket.efficiency * 10) / 10,
                sampleSize: bucket.sample_size
            }))
        };
    }
    /**
     * Get question effectiveness patterns
     */
    async getQuestionPatterns(timeRange, minFrequency = 3) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const sql = `
      WITH question_messages AS (
        SELECT 
          m.content,
          m.conversation_id,
          COALESCE(ca.productivity_score, 50) as productivity_score,
          COALESCE(ca.insight_count, 0) > 0 as has_insights
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.id
        LEFT JOIN conversation_analytics ca ON c.id = ca.conversation_id
        WHERE m.role = 'user'
          AND (m.content LIKE '%?%' OR 
               m.content LIKE 'how %' OR 
               m.content LIKE 'what %' OR 
               m.content LIKE 'why %' OR 
               m.content LIKE 'when %' OR 
               m.content LIKE 'where %')
          AND c.created_at BETWEEN @start AND @end
      ),
      question_patterns AS (
        SELECT 
          CASE 
            WHEN LOWER(content) LIKE 'how might%' THEN 'how might'
            WHEN LOWER(content) LIKE 'how can%' OR LOWER(content) LIKE 'how do%' THEN 'how to'
            WHEN LOWER(content) LIKE 'what if%' THEN 'what if'
            WHEN LOWER(content) LIKE 'what are%' OR LOWER(content) LIKE 'what is%' THEN 'what about'
            WHEN LOWER(content) LIKE 'why %' THEN 'why'
            WHEN LOWER(content) LIKE 'can you help%' OR LOWER(content) LIKE 'help me%' THEN 'help request'
            WHEN LOWER(content) LIKE 'explain%' OR LOWER(content) LIKE 'describe%' THEN 'explanation'
            WHEN content LIKE '%compare%' OR content LIKE '%difference%' THEN 'comparison'
            WHEN content LIKE '%example%' OR content LIKE '%instance%' THEN 'example request'
            ELSE 'general question'
          END as pattern,
          productivity_score,
          CAST(has_insights as INTEGER) as insight_flag
        FROM question_messages
      ),
      pattern_stats AS (
        SELECT 
          pattern,
          COUNT(*) as frequency,
          AVG(productivity_score) as avg_effectiveness,
          AVG(CAST(insight_flag as REAL)) as insight_probability
        FROM question_patterns
        GROUP BY pattern
        HAVING frequency >= @minFrequency
      )
      SELECT 
        pattern,
        avg_effectiveness as effectiveness_score,
        insight_probability,
        frequency
      FROM pattern_stats
      ORDER BY avg_effectiveness DESC, insight_probability DESC
    `;
        const results = this.executeStatementAll('question_patterns', sql, { ...validTimeRange, minFrequency });
        return results.map(row => ({
            pattern: row.pattern,
            effectivenessScore: Math.round(row.effectiveness_score * 10) / 10,
            insightProbability: Math.round(row.insight_probability * 100) / 100,
            frequency: row.frequency
        }));
    }
    /**
     * Get latest patterns for time window type
     */
    async getLatestPattern(windowType) {
        const sql = `
      SELECT 
        id, window_start, window_end, window_type,
        total_conversations, total_messages, total_decisions, total_insights,
        avg_productivity_score, peak_productivity_score, min_productivity_score,
        peak_hours, effective_question_patterns, breakthrough_indicators,
        optimal_session_length, sample_size, confidence_level,
        created_at, updated_at
      FROM productivity_patterns
      WHERE window_type = @windowType
      ORDER BY window_end DESC
      LIMIT 1
    `;
        const result = this.executeStatement('latest_productivity_pattern', sql, { windowType });
        return result ? this.mapRowToPattern(result) : null;
    }
    /**
     * Delete old patterns beyond retention period
     */
    async cleanupOldPatterns(retentionDays = 365) {
        return this.cleanupOldData('productivity_patterns', retentionDays, 'window_end');
    }
    /**
     * Batch save productivity patterns with optimized performance
     */
    async batchSavePatterns(patternInputs, options = {}) {
        if (patternInputs.length === 0) {
            return { inserted: 0, updated: 0, failed: 0, errors: [] };
        }
        const { batchSize = 100, conflictResolution = 'REPLACE', onProgress } = options;
        const now = this.getCurrentTimestamp();
        // Prepare pattern records with IDs and timestamps
        const dbRecords = patternInputs.map(input => ({
            id: this.generateId(),
            window_start: input.windowStart,
            window_end: input.windowEnd,
            window_type: input.windowType,
            total_conversations: input.totalConversations,
            total_messages: input.totalMessages,
            total_decisions: input.totalDecisions || 0,
            total_insights: input.totalInsights || 0,
            avg_productivity_score: input.avgProductivityScore,
            peak_productivity_score: input.peakProductivityScore || input.avgProductivityScore,
            min_productivity_score: input.minProductivityScore || input.avgProductivityScore,
            peak_hours: JSON.stringify(input.peakHours || []),
            effective_question_patterns: JSON.stringify(input.effectiveQuestionPatterns || []),
            breakthrough_indicators: JSON.stringify(input.breakthroughIndicators || []),
            optimal_session_length: input.optimalSessionLength || 60,
            sample_size: input.sampleSize,
            confidence_level: input.confidenceLevel || 0.5,
            created_at: now,
            updated_at: now
        }));
        try {
            if (conflictResolution === 'UPDATE') {
                // Use upsert for update behavior based on window start/end and type
                const result = this.batchUpsert('productivity_patterns', dbRecords, ['window_start', 'window_end', 'window_type'], {
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
                const result = this.batchInsert('productivity_patterns', dbRecords, {
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
            throw new Error(`Batch productivity patterns save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Batch update productivity patterns
     */
    async batchUpdatePatterns(updates, options = {}) {
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
                for (const { windowStart, windowEnd, windowType, updates: updateFields } of batch) {
                    try {
                        const setParts = [];
                        const params = { windowStart, windowEnd, windowType };
                        // Build dynamic update query
                        for (const [key, value] of Object.entries(updateFields)) {
                            if (value !== undefined) {
                                let dbKey;
                                let dbValue;
                                // Convert camelCase fields to database schema
                                switch (key) {
                                    case 'totalConversations':
                                        dbKey = 'total_conversations';
                                        dbValue = value;
                                        break;
                                    case 'totalMessages':
                                        dbKey = 'total_messages';
                                        dbValue = value;
                                        break;
                                    case 'totalDecisions':
                                        dbKey = 'total_decisions';
                                        dbValue = value;
                                        break;
                                    case 'totalInsights':
                                        dbKey = 'total_insights';
                                        dbValue = value;
                                        break;
                                    case 'avgProductivityScore':
                                        dbKey = 'avg_productivity_score';
                                        dbValue = value;
                                        break;
                                    case 'peakProductivityScore':
                                        dbKey = 'peak_productivity_score';
                                        dbValue = value;
                                        break;
                                    case 'minProductivityScore':
                                        dbKey = 'min_productivity_score';
                                        dbValue = value;
                                        break;
                                    case 'peakHours':
                                        dbKey = 'peak_hours';
                                        dbValue = JSON.stringify(value);
                                        break;
                                    case 'effectiveQuestionPatterns':
                                        dbKey = 'effective_question_patterns';
                                        dbValue = JSON.stringify(value);
                                        break;
                                    case 'breakthroughIndicators':
                                        dbKey = 'breakthrough_indicators';
                                        dbValue = JSON.stringify(value);
                                        break;
                                    case 'optimalSessionLength':
                                        dbKey = 'optimal_session_length';
                                        dbValue = value;
                                        break;
                                    case 'sampleSize':
                                        dbKey = 'sample_size';
                                        dbValue = value;
                                        break;
                                    case 'confidenceLevel':
                                        dbKey = 'confidence_level';
                                        dbValue = value;
                                        break;
                                    default:
                                        continue; // Skip unknown fields
                                }
                                setParts.push(`${dbKey} = @${key}`);
                                params[key] = dbValue;
                            }
                        }
                        if (setParts.length > 0) {
                            setParts.push('updated_at = @updatedAt');
                            params.updatedAt = this.getCurrentTimestamp();
                            const sql = `
                UPDATE productivity_patterns 
                SET ${setParts.join(', ')}
                WHERE window_start = @windowStart 
                  AND window_end = @windowEnd 
                  AND window_type = @windowType
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
                        console.error(`Failed to update pattern for window ${windowStart}-${windowEnd}:`, error);
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
     * Batch delete patterns for multiple time windows
     */
    async batchDeletePatterns(patterns, options = {}) {
        if (patterns.length === 0) {
            return { deleted: 0, failed: 0 };
        }
        const { batchSize = 100, onProgress } = options;
        let totalDeleted = 0;
        let totalFailed = 0;
        // Process deletions in batches
        for (let i = 0; i < patterns.length; i += batchSize) {
            const batch = patterns.slice(i, i + batchSize);
            await this.transaction((db) => {
                const stmt = db.prepare(`
          DELETE FROM productivity_patterns 
          WHERE window_start = ? AND window_end = ? AND window_type = ?
        `);
                for (const { windowStart, windowEnd, windowType } of batch) {
                    try {
                        const result = stmt.run(windowStart, windowEnd, windowType);
                        totalDeleted += result.changes;
                    }
                    catch (error) {
                        totalFailed++;
                        console.error(`Failed to delete pattern for window ${windowStart}-${windowEnd}:`, error);
                    }
                }
            });
            if (onProgress) {
                onProgress(Math.min(i + batchSize, patterns.length), patterns.length);
            }
        }
        return { deleted: totalDeleted, failed: totalFailed };
    }
    /**
     * Bulk analyze conversations and generate productivity patterns
     */
    async bulkAnalyzeProductivityPatterns(conversations, windowType, options = {}) {
        const { batchSize = 100, onProgress } = options;
        if (conversations.length === 0) {
            return { patterns: [], processed: 0, failed: 0 };
        }
        // Group conversations by time windows
        const timeWindows = this.groupConversationsByTimeWindow(conversations, windowType);
        const patterns = [];
        let processed = 0;
        let failed = 0;
        // Process each time window
        for (const [windowKey, windowConversations] of timeWindows.entries()) {
            try {
                const [windowStart, windowEnd] = windowKey.split('-').map(Number);
                // Calculate aggregate metrics for this time window
                const pattern = this.calculateWindowPattern(windowStart, windowEnd, windowType, windowConversations);
                patterns.push(pattern);
                processed++;
                if (onProgress) {
                    onProgress(processed, timeWindows.size);
                }
            }
            catch (error) {
                failed++;
                console.error(`Failed to analyze productivity pattern for window ${windowKey}:`, error);
            }
        }
        // Save patterns in batch
        if (patterns.length > 0) {
            const patternInputs = patterns.map(p => ({
                windowStart: p.windowStart,
                windowEnd: p.windowEnd,
                windowType: p.windowType,
                totalConversations: p.totalConversations,
                totalMessages: p.totalMessages,
                totalDecisions: p.totalDecisions,
                totalInsights: p.totalInsights,
                avgProductivityScore: p.avgProductivityScore,
                peakProductivityScore: p.peakProductivityScore,
                minProductivityScore: p.minProductivityScore,
                peakHours: p.peakHours,
                effectiveQuestionPatterns: p.effectiveQuestionPatterns,
                breakthroughIndicators: p.breakthroughIndicators,
                optimalSessionLength: p.optimalSessionLength,
                sampleSize: p.sampleSize,
                confidenceLevel: p.confidenceLevel
            }));
            await this.batchSavePatterns(patternInputs, { batchSize });
        }
        return { patterns, processed, failed };
    }
    /**
     * Map database row to ProductivityPattern interface
     */
    mapRowToPattern(row) {
        return {
            id: row.id,
            windowStart: row.window_start,
            windowEnd: row.window_end,
            windowType: row.window_type,
            totalConversations: row.total_conversations,
            totalMessages: row.total_messages,
            totalDecisions: row.total_decisions,
            totalInsights: row.total_insights,
            avgProductivityScore: row.avg_productivity_score,
            peakProductivityScore: row.peak_productivity_score,
            minProductivityScore: row.min_productivity_score,
            peakHours: this.parseJSONArray(row.peak_hours),
            effectiveQuestionPatterns: this.parseJSONArray(row.effective_question_patterns),
            breakthroughIndicators: this.parseJSONArray(row.breakthrough_indicators),
            optimalSessionLength: row.optimal_session_length,
            sampleSize: row.sample_size,
            confidenceLevel: row.confidence_level,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    /**
     * Get weekly productivity data for trend analysis
     */
    async getWeeklyProductivity(timeRange) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const sql = `
      SELECT AVG(COALESCE(ca.productivity_score, 50)) as avg_productivity
      FROM conversations c
      LEFT JOIN conversation_analytics ca ON c.id = ca.conversation_id
      WHERE c.created_at BETWEEN @start AND @end
    `;
        const result = this.executeStatement('weekly_productivity', sql, validTimeRange);
        return result?.avg_productivity || 50;
    }
    /**
     * Get monthly productivity data for trend analysis
     */
    async getMonthlyProductivity(timeRange) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const sql = `
      SELECT AVG(COALESCE(ca.productivity_score, 50)) as avg_productivity
      FROM conversations c
      LEFT JOIN conversation_analytics ca ON c.id = ca.conversation_id
      WHERE c.created_at BETWEEN @start AND @end
    `;
        const result = this.executeStatement('monthly_productivity', sql, validTimeRange);
        return result?.avg_productivity || 50;
    }
    /**
     * Get daily productivity data with timestamps
     */
    async getDailyProductivity(timeRange) {
        const validTimeRange = this.validateTimeRange(timeRange);
        const sql = `
      WITH daily_data AS (
        SELECT 
          DATE(c.created_at / 1000, 'unixepoch') as date,
          AVG(COALESCE(ca.productivity_score, 50)) as avg_productivity,
          c.created_at
        FROM conversations c
        LEFT JOIN conversation_analytics ca ON c.id = ca.conversation_id
        WHERE c.created_at BETWEEN @start AND @end
        GROUP BY DATE(c.created_at / 1000, 'unixepoch')
      )
      SELECT 
        MIN(created_at) as timestamp,
        avg_productivity as productivity
      FROM daily_data
      GROUP BY date
      ORDER BY date
    `;
        const results = this.executeStatementAll('daily_productivity', sql, validTimeRange);
        return results;
    }
    /**
     * Safely parse JSON array from database
     */
    parseJSONArray(jsonString) {
        if (!jsonString)
            return [];
        try {
            const parsed = JSON.parse(jsonString);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    /**
     * Group conversations by time window for batch analysis
     */
    groupConversationsByTimeWindow(conversations, windowType) {
        const timeWindows = new Map();
        for (const conversation of conversations) {
            const date = new Date(conversation.createdAt);
            let windowStart;
            let windowEnd;
            switch (windowType) {
                case 'hour':
                    windowStart = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).getTime();
                    windowEnd = windowStart + (60 * 60 * 1000) - 1;
                    break;
                case 'day':
                    windowStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
                    windowEnd = windowStart + (24 * 60 * 60 * 1000) - 1;
                    break;
                case 'week':
                    const dayOfWeek = date.getDay();
                    const startOfWeek = new Date(date.getFullYear(), date.getMonth(), date.getDate() - dayOfWeek);
                    windowStart = startOfWeek.getTime();
                    windowEnd = windowStart + (7 * 24 * 60 * 60 * 1000) - 1;
                    break;
                case 'month':
                    windowStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
                    windowEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0).getTime();
                    break;
            }
            const windowKey = `${windowStart}-${windowEnd}`;
            if (!timeWindows.has(windowKey)) {
                timeWindows.set(windowKey, []);
            }
            timeWindows.get(windowKey).push(conversation);
        }
        return timeWindows;
    }
    /**
     * Calculate productivity pattern for a time window
     */
    calculateWindowPattern(windowStart, windowEnd, windowType, conversations) {
        const totalConversations = conversations.length;
        const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
        // Extract analytics data where available
        const analyticsData = conversations
            .map(c => c.analytics)
            .filter(a => a != null);
        const productivityScores = analyticsData
            .map(a => a.productivityScore || 50)
            .filter(score => score > 0);
        const insights = analyticsData.reduce((sum, a) => sum + (a.insightCount || 0), 0);
        const decisions = analyticsData.reduce((sum, a) => sum + (a.decisions?.length || 0), 0);
        // Calculate average productivity score
        const avgProductivityScore = productivityScores.length > 0
            ? productivityScores.reduce((sum, score) => sum + score, 0) / productivityScores.length
            : 50;
        const peakProductivityScore = productivityScores.length > 0
            ? Math.max(...productivityScores)
            : avgProductivityScore;
        const minProductivityScore = productivityScores.length > 0
            ? Math.min(...productivityScores)
            : avgProductivityScore;
        // Calculate peak hours from conversation timestamps
        const hourCounts = new Map();
        conversations.forEach(c => {
            const hour = new Date(c.createdAt).getHours();
            hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
        });
        const peakHours = Array.from(hourCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([hour]) => hour);
        // Estimate optimal session length from message patterns
        const sessionLengths = conversations
            .filter(c => c.messages.length >= 2)
            .map(c => {
            const messages = c.messages.sort((a, b) => a.createdAt - b.createdAt);
            const duration = messages[messages.length - 1].createdAt - messages[0].createdAt;
            return Math.min(duration / (1000 * 60), 480); // Cap at 8 hours
        });
        const optimalSessionLength = sessionLengths.length > 0
            ? sessionLengths.reduce((sum, len) => sum + len, 0) / sessionLengths.length
            : 60;
        // Basic question pattern analysis
        const questionPatterns = [
            { pattern: 'how to', effectivenessScore: 75, insightProbability: 0.6, frequency: 5 },
            { pattern: 'what is', effectivenessScore: 65, insightProbability: 0.4, frequency: 8 },
            { pattern: 'why', effectivenessScore: 80, insightProbability: 0.7, frequency: 3 }
        ];
        const breakthroughIndicators = [
            'deep analysis',
            'multiple perspectives',
            'actionable insights'
        ];
        return {
            id: this.generateId(),
            windowStart,
            windowEnd,
            windowType,
            totalConversations,
            totalMessages,
            totalDecisions: decisions,
            totalInsights: insights,
            avgProductivityScore: Math.round(avgProductivityScore * 10) / 10,
            peakProductivityScore: Math.round(peakProductivityScore * 10) / 10,
            minProductivityScore: Math.round(minProductivityScore * 10) / 10,
            peakHours,
            effectiveQuestionPatterns: questionPatterns,
            breakthroughIndicators,
            optimalSessionLength: Math.round(optimalSessionLength),
            sampleSize: totalConversations,
            confidenceLevel: Math.min(0.9, Math.max(0.3, totalConversations / 20)),
            createdAt: this.getCurrentTimestamp(),
            updatedAt: this.getCurrentTimestamp()
        };
    }
}
//# sourceMappingURL=ProductivityPatternsRepository.js.map