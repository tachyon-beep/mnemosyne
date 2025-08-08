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
import { BaseRepository } from './BaseRepository.js';
/**
 * Repository for summary generation history operations
 */
export class SummaryHistoryRepository extends BaseRepository {
    /**
     * Record the start of a summary generation
     */
    async recordStart(data) {
        if (!this.isValidUUID(data.summaryId)) {
            throw new Error('Invalid summary ID');
        }
        if (!this.isValidUUID(data.providerId)) {
            throw new Error('Invalid provider ID');
        }
        const id = this.generateId();
        const now = this.getCurrentTimestamp();
        const history = {
            id,
            summaryId: data.summaryId,
            providerId: data.providerId,
            startedAt: now,
            status: 'pending',
            inputTokens: data.inputTokens
        };
        try {
            this.executeStatementRun('insert_summary_history', `INSERT INTO summary_history (
          id, summary_id, provider_id, started_at, status, input_tokens
        ) VALUES (?, ?, ?, ?, ?, ?)`, [
                history.id,
                history.summaryId,
                history.providerId,
                history.startedAt,
                history.status,
                history.inputTokens || null
            ]);
            return history;
        }
        catch (error) {
            this.handleConstraintError(error, 'Summary history');
        }
    }
    /**
     * Record successful completion of summary generation
     */
    async recordComplete(id, result) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        const now = this.getCurrentTimestamp();
        try {
            const updateResult = this.executeStatementRun('complete_summary_history', `UPDATE summary_history 
         SET completed_at = ?, status = 'completed', output_tokens = ?, cost = ?
         WHERE id = ? AND status IN ('pending', 'processing')`, [
                now,
                result.outputTokens,
                result.cost || null,
                id
            ]);
            if (updateResult.changes === 0) {
                return null;
            }
            return await this.findById(id);
        }
        catch (error) {
            this.handleConstraintError(error, 'Summary history');
        }
    }
    /**
     * Record failure of summary generation
     */
    async recordFailure(id, error) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        const now = this.getCurrentTimestamp();
        try {
            const updateResult = this.executeStatementRun('fail_summary_history', `UPDATE summary_history 
         SET completed_at = ?, status = 'failed', error_message = ?
         WHERE id = ? AND status IN ('pending', 'processing')`, [now, error, id]);
            if (updateResult.changes === 0) {
                return null;
            }
            return await this.findById(id);
        }
        catch (error) {
            this.handleConstraintError(error, 'Summary history');
        }
    }
    /**
     * Update status to processing (when generation actually starts)
     */
    async markProcessing(id) {
        if (!this.isValidUUID(id)) {
            return false;
        }
        const result = this.executeStatementRun('mark_processing_summary_history', `UPDATE summary_history 
       SET status = 'processing'
       WHERE id = ? AND status = 'pending'`, [id]);
        return result.changes > 0;
    }
    /**
     * Get generation statistics for a provider (or all providers if none specified)
     */
    async getStats(providerId) {
        let whereClause = '';
        const params = [];
        if (providerId) {
            if (!this.isValidUUID(providerId)) {
                throw new Error('Invalid provider ID');
            }
            whereClause = 'WHERE provider_id = ?';
            params.push(providerId);
        }
        const statsRow = this.executeStatement(`get_summary_stats${providerId ? '_by_provider' : ''}`, `SELECT 
        COUNT(*) as total_generations,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful_generations,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_generations,
        AVG(CASE WHEN input_tokens IS NOT NULL THEN input_tokens END) as average_input_tokens,
        AVG(CASE WHEN output_tokens IS NOT NULL THEN output_tokens END) as average_output_tokens,
        SUM(CASE WHEN cost IS NOT NULL THEN cost ELSE 0 END) as total_cost,
        AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
            THEN (completed_at - started_at) ELSE NULL END) as average_duration_ms
       FROM summary_history
       ${whereClause}`, params);
        return {
            totalGenerations: statsRow?.total_generations || 0,
            successfulGenerations: statsRow?.successful_generations || 0,
            failedGenerations: statsRow?.failed_generations || 0,
            averageInputTokens: statsRow?.average_input_tokens || undefined,
            averageOutputTokens: statsRow?.average_output_tokens || undefined,
            totalCost: statsRow?.total_cost || undefined,
            averageDurationMs: statsRow?.average_duration_ms || undefined
        };
    }
    /**
     * Find history entries by status
     */
    async findByStatus(status, limit = 50) {
        const validatedLimit = Math.min(Math.max(limit, 1), 200);
        const rows = this.executeStatementAll(`find_history_by_status_${status}`, `SELECT id, summary_id, provider_id, started_at, completed_at, status,
              error_message, input_tokens, output_tokens, cost
       FROM summary_history
       WHERE status = ?
       ORDER BY started_at DESC
       LIMIT ?`, [status, validatedLimit]);
        return rows.map(row => this.mapRowToHistory(row));
    }
    /**
     * Find history entries by summary ID
     */
    async findBySummaryId(summaryId) {
        if (!this.isValidUUID(summaryId)) {
            return [];
        }
        const rows = this.executeStatementAll('find_history_by_summary', `SELECT id, summary_id, provider_id, started_at, completed_at, status,
              error_message, input_tokens, output_tokens, cost
       FROM summary_history
       WHERE summary_id = ?
       ORDER BY started_at DESC`, [summaryId]);
        return rows.map(row => this.mapRowToHistory(row));
    }
    /**
     * Find history entries by provider ID
     */
    async findByProviderId(providerId, limit = 50) {
        if (!this.isValidUUID(providerId)) {
            return [];
        }
        const validatedLimit = Math.min(Math.max(limit, 1), 200);
        const rows = this.executeStatementAll('find_history_by_provider', `SELECT id, summary_id, provider_id, started_at, completed_at, status,
              error_message, input_tokens, output_tokens, cost
       FROM summary_history
       WHERE provider_id = ?
       ORDER BY started_at DESC
       LIMIT ?`, [providerId, validatedLimit]);
        return rows.map(row => this.mapRowToHistory(row));
    }
    /**
     * Clean up old history entries
     */
    async cleanupOldEntries(olderThanDays) {
        if (olderThanDays <= 0) {
            return 0;
        }
        const cutoffTimestamp = this.getCurrentTimestamp() - (olderThanDays * 24 * 60 * 60 * 1000);
        const result = this.executeStatementRun('cleanup_old_history', 'DELETE FROM summary_history WHERE started_at < ?', [cutoffTimestamp]);
        return result.changes;
    }
    /**
     * Find a history entry by ID
     */
    async findById(id) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        const row = this.executeStatement('find_history_by_id', `SELECT id, summary_id, provider_id, started_at, completed_at, status,
              error_message, input_tokens, output_tokens, cost
       FROM summary_history
       WHERE id = ?`, [id]);
        if (!row) {
            return null;
        }
        return this.mapRowToHistory(row);
    }
    /**
     * Get recent history entries across all providers
     */
    async findRecent(limit = 20) {
        const validatedLimit = Math.min(Math.max(limit, 1), 100);
        const rows = this.executeStatementAll('find_recent_history', `SELECT id, summary_id, provider_id, started_at, completed_at, status,
              error_message, input_tokens, output_tokens, cost
       FROM summary_history
       ORDER BY started_at DESC
       LIMIT ?`, [validatedLimit]);
        return rows.map(row => this.mapRowToHistory(row));
    }
    /**
     * Count history entries by status
     */
    async countByStatus() {
        const rows = this.executeStatementAll('count_history_by_status', `SELECT status, COUNT(*) as count
       FROM summary_history
       GROUP BY status`);
        const result = {};
        for (const row of rows) {
            result[row.status] = row.count;
        }
        return result;
    }
    /**
     * Check if a history entry exists
     */
    async exists(id) {
        if (!this.isValidUUID(id)) {
            return false;
        }
        const result = this.executeStatement('history_exists', 'SELECT 1 as count FROM summary_history WHERE id = ? LIMIT 1', [id]);
        return !!result;
    }
    /**
     * Map database row to SummaryHistory object
     */
    mapRowToHistory(row) {
        return {
            id: row.id,
            summaryId: row.summary_id,
            providerId: row.provider_id,
            startedAt: row.started_at,
            completedAt: row.completed_at || undefined,
            status: row.status,
            errorMessage: row.error_message || undefined,
            inputTokens: row.input_tokens || undefined,
            outputTokens: row.output_tokens || undefined,
            cost: row.cost || undefined
        };
    }
}
//# sourceMappingURL=SummaryHistoryRepository.js.map