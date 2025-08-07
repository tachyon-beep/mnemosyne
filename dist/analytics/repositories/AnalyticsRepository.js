/**
 * Analytics Repository - Base class for analytics-specific database operations
 *
 * Provides common patterns and utilities for analytics data access:
 * - Time-based query helpers
 * - Aggregation utilities
 * - Metric calculation helpers
 * - Cache-aware operations
 */
import { BaseRepository } from '../../storage/repositories/BaseRepository.js';
/**
 * Base analytics repository with common analytics operations
 */
export class AnalyticsRepository extends BaseRepository {
    constructor(databaseManager) {
        super(databaseManager);
    }
    /**
     * Validate and normalize time range parameters
     */
    validateTimeRange(timeRange) {
        if (!timeRange) {
            // Default to last 30 days
            const end = Date.now();
            const start = end - (30 * 24 * 60 * 60 * 1000);
            return { start, end };
        }
        const start = Math.max(0, timeRange.start);
        const end = Math.max(start, timeRange.end);
        return { start, end };
    }
    /**
     * Get time window grouping SQL fragment
     */
    getTimeWindowGroupBy(windowType) {
        switch (windowType) {
            case 'hour':
                return "strftime('%Y-%m-%d %H', datetime(created_at / 1000, 'unixepoch'))";
            case 'day':
                return "DATE(created_at / 1000, 'unixepoch')";
            case 'week':
                return "strftime('%Y-%W', datetime(created_at / 1000, 'unixepoch'))";
            case 'month':
                return "strftime('%Y-%m', datetime(created_at / 1000, 'unixepoch'))";
            default:
                return "DATE(created_at / 1000, 'unixepoch')";
        }
    }
    /**
     * Calculate weighted average for metrics
     */
    calculateWeightedAverage(values) {
        if (values.length === 0)
            return 0;
        const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
        if (totalWeight === 0)
            return 0;
        const weightedSum = values.reduce((sum, v) => sum + (v.value * v.weight), 0);
        return weightedSum / totalWeight;
    }
    /**
     * Calculate standard deviation
     */
    calculateStandardDeviation(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const squaredDifferences = values.map(v => Math.pow(v - mean, 2));
        const variance = squaredDifferences.reduce((sum, v) => sum + v, 0) / values.length;
        return Math.sqrt(variance);
    }
    /**
     * Convert database timestamps to JavaScript Date objects
     */
    parseTimestamp(timestamp) {
        return new Date(timestamp);
    }
    /**
     * Parse JSON metadata from analytics tables
     */
    parseAnalyticsMetadata(metadataJson) {
        if (!metadataJson) {
            return {};
        }
        try {
            return JSON.parse(metadataJson);
        }
        catch (error) {
            return {};
        }
    }
    /**
     * Build where clause for time range filtering
     */
    buildTimeRangeWhere(timeRange, timestampColumn = 'created_at') {
        return {
            sql: `${timestampColumn} BETWEEN @start AND @end`,
            params: {
                start: timeRange.start,
                end: timeRange.end
            }
        };
    }
    /**
     * Execute aggregation query with time grouping
     */
    executeTimeGroupedQuery(baseQuery, timeRange, windowType, additionalParams = {}) {
        const timeGroupBy = this.getTimeWindowGroupBy(windowType);
        const query = baseQuery.replace('{{TIME_GROUP}}', timeGroupBy);
        const params = {
            start: timeRange.start,
            end: timeRange.end,
            ...additionalParams
        };
        return this.executeStatementAll(`time_grouped_${windowType}_${Buffer.from(baseQuery).toString('base64').slice(0, 10)}`, query, params);
    }
    /**
     * Get conversation IDs for time range (common filter)
     */
    getConversationIdsInRange(timeRange) {
        const sql = `
      SELECT DISTINCT conversation_id 
      FROM conversations 
      WHERE created_at BETWEEN @start AND @end
      ORDER BY created_at DESC
    `;
        const result = this.executeStatementAll('conversations_in_range', sql, { start: timeRange.start, end: timeRange.end });
        return result.map(r => r.conversation_id);
    }
    /**
     * Check if analytics data exists for time range
     */
    hasDataInRange(tableName, timeRange, timestampColumn = 'created_at') {
        const sql = `
      SELECT 1 as exists_flag
      FROM ${tableName} 
      WHERE ${timestampColumn} BETWEEN @start AND @end 
      LIMIT 1
    `;
        const result = this.executeStatement(`has_data_${tableName}`, sql, { start: timeRange.start, end: timeRange.end });
        return !!result?.exists_flag;
    }
    /**
     * Calculate percentile for a dataset
     */
    calculatePercentile(values, percentile) {
        if (values.length === 0)
            return 0;
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil(sorted.length * (percentile / 100)) - 1;
        return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
    }
    /**
     * Build SQL for trend calculation (using linear regression)
     */
    getTrendCalculationSQL(valueColumn, timeColumn = 'created_at') {
        return `
      WITH trend_data AS (
        SELECT 
          ${valueColumn} as y,
          (${timeColumn} / 1000) as x
        FROM analytics_temp
        WHERE ${valueColumn} IS NOT NULL
      ),
      stats AS (
        SELECT 
          COUNT(*) as n,
          AVG(x) as x_mean,
          AVG(y) as y_mean,
          SUM(x * y) as sum_xy,
          SUM(x * x) as sum_x2
        FROM trend_data
      )
      SELECT 
        CASE 
          WHEN n > 1 AND (n * sum_x2 - (n * x_mean * x_mean)) != 0 
          THEN (n * sum_xy - (n * x_mean * y_mean)) / (n * sum_x2 - (n * x_mean * x_mean))
          ELSE 0 
        END as slope
      FROM stats
    `;
    }
    /**
     * Advanced batch insert with error handling and performance monitoring
     */
    batchInsert(tableName, records, options = {}) {
        if (records.length === 0) {
            return { inserted: 0, failed: 0, errors: [] };
        }
        const { batchSize = 100, conflictResolution = 'IGNORE', onProgress, enableRollback = true } = options;
        // Validate records have consistent schema
        const columns = Object.keys(records[0]);
        const invalidRecords = records.filter(record => !columns.every(col => col in record));
        if (invalidRecords.length > 0) {
            throw new Error(`Schema mismatch: ${invalidRecords.length} records have missing columns`);
        }
        const placeholders = columns.map(col => `@${col}`).join(', ');
        const conflictClause = conflictResolution !== 'FAIL' ? `OR ${conflictResolution}` : '';
        const sql = `
      INSERT ${conflictClause} INTO ${tableName} (${columns.join(', ')}) 
      VALUES (${placeholders})
    `;
        let inserted = 0;
        let failed = 0;
        const errors = [];
        try {
            this.transaction((db) => {
                const stmt = db.prepare(sql);
                const insertMany = db.transaction((batch) => {
                    for (const record of batch) {
                        try {
                            const result = stmt.run(record);
                            if (result.changes > 0) {
                                inserted++;
                            }
                        }
                        catch (error) {
                            failed++;
                            errors.push(error);
                            if (enableRollback && errors.length > Math.ceil(batch.length * 0.1)) {
                                throw new Error(`Batch failure rate too high: ${failed}/${batch.length} failed`);
                            }
                        }
                    }
                });
                // Process in batches with progress tracking
                for (let i = 0; i < records.length; i += batchSize) {
                    const batch = records.slice(i, i + batchSize);
                    try {
                        insertMany(batch);
                        if (onProgress) {
                            onProgress(Math.min(i + batchSize, records.length), records.length);
                        }
                    }
                    catch (batchError) {
                        // Handle batch-level errors
                        failed += batch.length - (inserted % batchSize);
                        errors.push(batchError);
                        if (enableRollback) {
                            throw batchError;
                        }
                    }
                }
            });
        }
        catch (transactionError) {
            errors.push(transactionError);
            throw new Error(`Batch insert failed: ${errors[errors.length - 1].message}`);
        }
        return { inserted, failed, errors };
    }
    /**
     * Optimized batch upsert (insert or update)
     */
    batchUpsert(tableName, records, keyColumns, options = {}) {
        if (records.length === 0) {
            return { inserted: 0, updated: 0, failed: 0 };
        }
        const { batchSize = 100, updateColumns, onProgress } = options;
        const columns = Object.keys(records[0]);
        const updateCols = updateColumns || columns.filter(col => !keyColumns.includes(col));
        const placeholders = columns.map(col => `@${col}`).join(', ');
        const updateSet = updateCols.map(col => `${col} = excluded.${col}`).join(', ');
        const sql = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(${keyColumns.join(', ')}) DO UPDATE SET
        ${updateSet},
        updated_at = @currentTime
    `;
        let inserted = 0;
        let updated = 0;
        let failed = 0;
        this.transaction((db) => {
            const stmt = db.prepare(sql);
            const currentTime = this.getCurrentTimestamp();
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                for (const record of batch) {
                    try {
                        const result = stmt.run({ ...record, currentTime });
                        if (result.changes > 0) {
                            // Check if it was insert or update based on last_insert_rowid
                            if (result.lastInsertRowid) {
                                inserted++;
                            }
                            else {
                                updated++;
                            }
                        }
                    }
                    catch (error) {
                        failed++;
                        console.error('Upsert failed for record:', record, error);
                    }
                }
                if (onProgress) {
                    onProgress(Math.min(i + batchSize, records.length), records.length);
                }
            }
        });
        return { inserted, updated, failed };
    }
    /**
     * Streaming batch processor for large datasets
     */
    async streamingBatchProcess(items, processor, options = {}) {
        const { batchSize = 100, maxConcurrency = 4, onProgress, onBatchComplete } = options;
        if (items.length === 0)
            return [];
        const results = [];
        const batches = [];
        // Create batches
        for (let i = 0; i < items.length; i += batchSize) {
            batches.push(items.slice(i, i + batchSize));
        }
        // Process batches with concurrency control
        const processBatch = async (batch, batchIndex) => {
            try {
                const batchResults = await processor(batch);
                if (onBatchComplete) {
                    onBatchComplete(batchResults, batchIndex);
                }
                if (onProgress) {
                    const processed = Math.min((batchIndex + 1) * batchSize, items.length);
                    onProgress(processed, items.length);
                }
                return batchResults;
            }
            catch (error) {
                console.error(`Batch ${batchIndex} processing failed:`, error);
                return [];
            }
        };
        // Process with controlled concurrency
        for (let i = 0; i < batches.length; i += maxConcurrency) {
            const concurrentBatches = batches.slice(i, i + maxConcurrency);
            const promises = concurrentBatches.map((batch, index) => processBatch(batch, i + index));
            const batchResults = await Promise.all(promises);
            results.push(...batchResults.flat());
        }
        return results;
    }
    /**
     * Batch delete with conditions
     */
    batchDelete(tableName, whereConditions, options = {}) {
        const { batchSize = 1000, dryRun = false } = options;
        if (whereConditions.length === 0) {
            throw new Error('No conditions provided for batch delete');
        }
        // Build WHERE clause
        const whereClause = whereConditions
            .map(({ column, operator = '=' }) => `${column} ${operator} ?`)
            .join(' AND ');
        const sql = `DELETE FROM ${tableName} WHERE ${whereClause}`;
        if (dryRun) {
            // Return count of rows that would be deleted
            const countSql = `SELECT COUNT(*) as count FROM ${tableName} WHERE ${whereClause}`;
            const values = whereConditions.map(({ value }) => value);
            const result = this.executeStatement(`count_${tableName}_delete`, countSql, values);
            return result?.count || 0;
        }
        let totalDeleted = 0;
        this.transaction((db) => {
            const stmt = db.prepare(sql);
            const values = whereConditions.map(({ value }) => value);
            // For large deletes, process in chunks to avoid locking issues
            let deleteCount;
            do {
                const result = stmt.run(values);
                deleteCount = result.changes;
                totalDeleted += deleteCount;
            } while (deleteCount === batchSize);
        });
        return totalDeleted;
    }
    /**
     * Clean up old analytics data beyond retention period
     */
    cleanupOldData(tableName, retentionDays, timestampColumn = 'created_at') {
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        const sql = `
      DELETE FROM ${tableName} 
      WHERE ${timestampColumn} < @cutoff
    `;
        const result = this.executeStatementRun(`cleanup_${tableName}`, sql, { cutoff: cutoffTime });
        return result.changes;
    }
}
//# sourceMappingURL=AnalyticsRepository.js.map