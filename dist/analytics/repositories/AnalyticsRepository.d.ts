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
import { DatabaseManager } from '../../storage/Database.js';
export interface TimeRange {
    start: number;
    end: number;
}
export interface PaginationOptions {
    limit?: number;
    offset?: number;
}
/**
 * Base analytics repository with common analytics operations
 */
export declare abstract class AnalyticsRepository extends BaseRepository {
    constructor(databaseManager: DatabaseManager);
    /**
     * Validate and normalize time range parameters
     */
    protected validateTimeRange(timeRange?: TimeRange): TimeRange;
    /**
     * Get time window grouping SQL fragment
     */
    protected getTimeWindowGroupBy(windowType: 'hour' | 'day' | 'week' | 'month'): string;
    /**
     * Calculate weighted average for metrics
     */
    protected calculateWeightedAverage(values: Array<{
        value: number;
        weight: number;
    }>): number;
    /**
     * Calculate standard deviation
     */
    protected calculateStandardDeviation(values: number[]): number;
    /**
     * Convert database timestamps to JavaScript Date objects
     */
    protected parseTimestamp(timestamp: number): Date;
    /**
     * Parse JSON metadata from analytics tables
     */
    protected parseAnalyticsMetadata<T = Record<string, any>>(metadataJson?: string): T;
    /**
     * Build where clause for time range filtering
     */
    protected buildTimeRangeWhere(timeRange: TimeRange, timestampColumn?: string): {
        sql: string;
        params: Record<string, any>;
    };
    /**
     * Execute aggregation query with time grouping
     */
    protected executeTimeGroupedQuery<T>(baseQuery: string, timeRange: TimeRange, windowType: 'hour' | 'day' | 'week' | 'month', additionalParams?: Record<string, any>): T[];
    /**
     * Get conversation IDs for time range (common filter)
     */
    protected getConversationIdsInRange(timeRange: TimeRange): string[];
    /**
     * Check if analytics data exists for time range
     */
    protected hasDataInRange(tableName: string, timeRange: TimeRange, timestampColumn?: string): boolean;
    /**
     * Calculate percentile for a dataset
     */
    protected calculatePercentile(values: number[], percentile: number): number;
    /**
     * Build SQL for trend calculation (using linear regression)
     */
    protected getTrendCalculationSQL(valueColumn: string, timeColumn?: string): string;
    /**
     * Advanced batch insert with error handling and performance monitoring
     */
    protected batchInsert<T extends Record<string, any>>(tableName: string, records: T[], options?: {
        batchSize?: number;
        conflictResolution?: 'IGNORE' | 'REPLACE' | 'FAIL';
        onProgress?: (processed: number, total: number) => void;
        enableRollback?: boolean;
    }): {
        inserted: number;
        failed: number;
        errors: Error[];
    };
    /**
     * Optimized batch upsert (insert or update)
     */
    protected batchUpsert<T extends Record<string, any>>(tableName: string, records: T[], keyColumns: string[], options?: {
        batchSize?: number;
        updateColumns?: string[];
        onProgress?: (processed: number, total: number) => void;
    }): {
        inserted: number;
        updated: number;
        failed: number;
    };
    /**
     * Streaming batch processor for large datasets
     */
    protected streamingBatchProcess<T, R>(items: T[], processor: (batch: T[]) => Promise<R[]>, options?: {
        batchSize?: number;
        maxConcurrency?: number;
        onProgress?: (processed: number, total: number) => void;
        onBatchComplete?: (results: R[], batchIndex: number) => void;
    }): Promise<R[]>;
    /**
     * Batch delete with conditions
     */
    protected batchDelete(tableName: string, whereConditions: Array<{
        column: string;
        value: any;
        operator?: string;
    }>, options?: {
        batchSize?: number;
        dryRun?: boolean;
    }): number;
    /**
     * Clean up old analytics data beyond retention period
     */
    protected cleanupOldData(tableName: string, retentionDays: number, timestampColumn?: string): number;
}
//# sourceMappingURL=AnalyticsRepository.d.ts.map