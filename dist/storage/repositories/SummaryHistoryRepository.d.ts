/**
 * Summary History Repository - Operations for tracking summary generation
 *
 * This repository provides:
 * - Tracking summary generation lifecycle (start, complete, failure)
 * - Provider performance statistics and monitoring
 * - Cost tracking and analysis
 * - Historical data cleanup and maintenance
 * - Generation status management
 */
import { SummaryHistory } from '../../types/interfaces.js';
import { ISummaryHistoryRepository, SummaryStartData, SummaryCompleteResult, SummaryStats } from '../../types/repositories.js';
import { BaseRepository } from './BaseRepository.js';
/**
 * Repository for summary generation history operations
 */
export declare class SummaryHistoryRepository extends BaseRepository implements ISummaryHistoryRepository {
    /**
     * Record the start of a summary generation
     */
    recordStart(data: SummaryStartData): Promise<SummaryHistory>;
    /**
     * Record successful completion of summary generation
     */
    recordComplete(id: string, result: SummaryCompleteResult): Promise<SummaryHistory | null>;
    /**
     * Record failure of summary generation
     */
    recordFailure(id: string, error: string): Promise<SummaryHistory | null>;
    /**
     * Update status to processing (when generation actually starts)
     */
    markProcessing(id: string): Promise<boolean>;
    /**
     * Get generation statistics for a provider (or all providers if none specified)
     */
    getStats(providerId?: string): Promise<SummaryStats>;
    /**
     * Find history entries by status
     */
    findByStatus(status: SummaryHistory['status'], limit?: number): Promise<SummaryHistory[]>;
    /**
     * Find history entries by summary ID
     */
    findBySummaryId(summaryId: string): Promise<SummaryHistory[]>;
    /**
     * Find history entries by provider ID
     */
    findByProviderId(providerId: string, limit?: number): Promise<SummaryHistory[]>;
    /**
     * Clean up old history entries
     */
    cleanupOldEntries(olderThanDays: number): Promise<number>;
    /**
     * Find a history entry by ID
     */
    findById(id: string): Promise<SummaryHistory | null>;
    /**
     * Get recent history entries across all providers
     */
    findRecent(limit?: number): Promise<SummaryHistory[]>;
    /**
     * Count history entries by status
     */
    countByStatus(): Promise<Record<string, number>>;
    /**
     * Check if a history entry exists
     */
    exists(id: string): Promise<boolean>;
    /**
     * Map database row to SummaryHistory object
     */
    private mapRowToHistory;
}
//# sourceMappingURL=SummaryHistoryRepository.d.ts.map