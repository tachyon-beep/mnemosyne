/**
 * Summary Repository - CRUD operations for conversation summaries
 *
 * This repository provides:
 * - Full CRUD operations for conversation summaries
 * - Efficient querying by conversation and level
 * - Batch operations for creating multiple summaries
 * - Summary invalidation and cleanup
 * - Quality score tracking and filtering
 */
import { BaseRepository } from './BaseRepository.js';
/**
 * Repository for conversation summary CRUD operations
 */
export class SummaryRepository extends BaseRepository {
    /**
     * Create a new conversation summary
     */
    async create(params) {
        const id = params.id || this.generateId();
        const now = this.getCurrentTimestamp();
        const summary = {
            id,
            conversationId: params.conversationId,
            level: params.level,
            summaryText: params.summaryText,
            tokenCount: params.tokenCount,
            provider: params.provider,
            model: params.model,
            generatedAt: now,
            messageCount: params.messageCount,
            startMessageId: params.startMessageId,
            endMessageId: params.endMessageId,
            metadata: params.metadata || {},
            qualityScore: params.qualityScore
        };
        try {
            this.executeStatementRun('insert_summary', `INSERT INTO conversation_summaries (
          id, conversation_id, level, summary_text, token_count, provider, model,
          generated_at, message_count, start_message_id, end_message_id, metadata, quality_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                summary.id,
                summary.conversationId,
                summary.level,
                summary.summaryText,
                summary.tokenCount,
                summary.provider,
                summary.model,
                summary.generatedAt,
                summary.messageCount,
                summary.startMessageId || null,
                summary.endMessageId || null,
                this.stringifyMetadata(summary.metadata),
                summary.qualityScore || null
            ]);
            return summary;
        }
        catch (error) {
            this.handleConstraintError(error, 'Summary');
        }
    }
    /**
     * Find summaries by conversation ID with optional level filter
     */
    async findByConversation(conversationId, level, limit, offset) {
        if (!this.isValidUUID(conversationId)) {
            return { data: [], hasMore: false };
        }
        const pagination = this.validatePagination(limit, offset);
        let whereClause = 'WHERE conversation_id = ?';
        let params = [conversationId];
        if (level) {
            whereClause += ' AND level = ?';
            params.push(level);
        }
        params.push(pagination.limit + 1, pagination.offset);
        const rows = this.executeStatementAll(`find_summaries_by_conversation_${level || 'all'}`, `SELECT id, conversation_id, level, summary_text, token_count, provider, model,
              generated_at, message_count, start_message_id, end_message_id, metadata, quality_score
       FROM conversation_summaries
       ${whereClause}
       ORDER BY generated_at DESC
       LIMIT ? OFFSET ?`, params);
        const hasMore = rows.length > pagination.limit;
        const data = rows.slice(0, pagination.limit).map(row => this.mapRowToSummary(row));
        return {
            data,
            hasMore
        };
    }
    /**
     * Find the most recent summary for a conversation at a specific level
     */
    async findByConversationAndLevel(conversationId, level) {
        if (!this.isValidUUID(conversationId)) {
            return null;
        }
        const row = this.executeStatement(`find_summary_by_conversation_and_level_${level}`, `SELECT id, conversation_id, level, summary_text, token_count, provider, model,
              generated_at, message_count, start_message_id, end_message_id, metadata, quality_score
       FROM conversation_summaries
       WHERE conversation_id = ? AND level = ?
       ORDER BY generated_at DESC
       LIMIT 1`, [conversationId, level]);
        if (!row) {
            return null;
        }
        return this.mapRowToSummary(row);
    }
    /**
     * Find recent summaries across all conversations
     */
    async findRecent(limit, minQualityScore) {
        const validatedLimit = Math.min(limit || 50, 100);
        let whereClause = '';
        let params = [];
        if (minQualityScore !== undefined) {
            whereClause = 'WHERE quality_score >= ?';
            params.push(minQualityScore);
        }
        params.push(validatedLimit);
        const rows = this.executeStatementAll(`find_recent_summaries${minQualityScore !== undefined ? '_with_quality' : ''}`, `SELECT id, conversation_id, level, summary_text, token_count, provider, model,
              generated_at, message_count, start_message_id, end_message_id, metadata, quality_score
       FROM conversation_summaries
       ${whereClause}
       ORDER BY generated_at DESC
       LIMIT ?`, params);
        return rows.map(row => this.mapRowToSummary(row));
    }
    /**
     * Create multiple summaries in a single transaction
     */
    async createBatch(params) {
        if (!params.summaries || params.summaries.length === 0) {
            return [];
        }
        return this.transaction((_db) => {
            const createdSummaries = [];
            for (const summaryParams of params.summaries) {
                const id = summaryParams.id || this.generateId();
                const now = this.getCurrentTimestamp();
                const summary = {
                    id,
                    conversationId: summaryParams.conversationId,
                    level: summaryParams.level,
                    summaryText: summaryParams.summaryText,
                    tokenCount: summaryParams.tokenCount,
                    provider: summaryParams.provider,
                    model: summaryParams.model,
                    generatedAt: now,
                    messageCount: summaryParams.messageCount,
                    startMessageId: summaryParams.startMessageId,
                    endMessageId: summaryParams.endMessageId,
                    metadata: summaryParams.metadata || {},
                    qualityScore: summaryParams.qualityScore
                };
                try {
                    this.executeStatementRun('insert_summary_batch', `INSERT INTO conversation_summaries (
              id, conversation_id, level, summary_text, token_count, provider, model,
              generated_at, message_count, start_message_id, end_message_id, metadata, quality_score
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                        summary.id,
                        summary.conversationId,
                        summary.level,
                        summary.summaryText,
                        summary.tokenCount,
                        summary.provider,
                        summary.model,
                        summary.generatedAt,
                        summary.messageCount,
                        summary.startMessageId || null,
                        summary.endMessageId || null,
                        this.stringifyMetadata(summary.metadata),
                        summary.qualityScore || null
                    ]);
                    createdSummaries.push(summary);
                }
                catch (error) {
                    this.handleConstraintError(error, 'Summary');
                }
            }
            return createdSummaries;
        });
    }
    /**
     * Invalidate/delete all summaries for a conversation
     */
    async invalidateForConversation(conversationId) {
        if (!this.isValidUUID(conversationId)) {
            return 0;
        }
        const result = this.executeStatementRun('delete_summaries_by_conversation', 'DELETE FROM conversation_summaries WHERE conversation_id = ?', [conversationId]);
        return result.changes;
    }
    /**
     * Find a summary by ID
     */
    async findById(id) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        const row = this.executeStatement('find_summary_by_id', `SELECT id, conversation_id, level, summary_text, token_count, provider, model,
              generated_at, message_count, start_message_id, end_message_id, metadata, quality_score
       FROM conversation_summaries
       WHERE id = ?`, [id]);
        if (!row) {
            return null;
        }
        return this.mapRowToSummary(row);
    }
    /**
     * Update a summary
     */
    async update(id, params) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        const existing = await this.findById(id);
        if (!existing) {
            return null;
        }
        const updatedSummary = {
            ...existing,
            summaryText: params.summaryText !== undefined ? params.summaryText : existing.summaryText,
            tokenCount: params.tokenCount !== undefined ? params.tokenCount : existing.tokenCount,
            metadata: params.metadata !== undefined ? params.metadata : existing.metadata,
            qualityScore: params.qualityScore !== undefined ? params.qualityScore : existing.qualityScore
        };
        try {
            const result = this.executeStatementRun('update_summary', `UPDATE conversation_summaries 
         SET summary_text = ?, token_count = ?, metadata = ?, quality_score = ?
         WHERE id = ?`, [
                updatedSummary.summaryText,
                updatedSummary.tokenCount,
                this.stringifyMetadata(updatedSummary.metadata),
                updatedSummary.qualityScore || null,
                id
            ]);
            if (result.changes === 0) {
                return null;
            }
            return updatedSummary;
        }
        catch (error) {
            this.handleConstraintError(error, 'Summary');
        }
    }
    /**
     * Delete a summary
     */
    async delete(id) {
        if (!this.isValidUUID(id)) {
            return false;
        }
        const result = this.executeStatementRun('delete_summary', 'DELETE FROM conversation_summaries WHERE id = ?', [id]);
        return result.changes > 0;
    }
    /**
     * Get summaries by provider
     */
    async findByProvider(provider, limit, offset) {
        const pagination = this.validatePagination(limit, offset);
        const rows = this.executeStatementAll('find_summaries_by_provider', `SELECT id, conversation_id, level, summary_text, token_count, provider, model,
              generated_at, message_count, start_message_id, end_message_id, metadata, quality_score
       FROM conversation_summaries
       WHERE provider = ?
       ORDER BY generated_at DESC
       LIMIT ? OFFSET ?`, [provider, pagination.limit + 1, pagination.offset]);
        const hasMore = rows.length > pagination.limit;
        const data = rows.slice(0, pagination.limit).map(row => this.mapRowToSummary(row));
        return {
            data,
            hasMore
        };
    }
    /**
     * Count summaries by conversation
     */
    async countByConversation(conversationId) {
        if (!this.isValidUUID(conversationId)) {
            return 0;
        }
        const result = this.executeStatement('count_summaries_by_conversation', 'SELECT COUNT(*) as count FROM conversation_summaries WHERE conversation_id = ?', [conversationId]);
        return result.count;
    }
    /**
     * Check if a summary exists
     */
    async exists(id) {
        if (!this.isValidUUID(id)) {
            return false;
        }
        const result = this.executeStatement('summary_exists', 'SELECT 1 as count FROM conversation_summaries WHERE id = ? LIMIT 1', [id]);
        return !!result;
    }
    /**
     * Map database row to ConversationSummary object
     */
    mapRowToSummary(row) {
        return {
            id: row.id,
            conversationId: row.conversation_id,
            level: row.level,
            summaryText: row.summary_text,
            tokenCount: row.token_count,
            provider: row.provider,
            model: row.model,
            generatedAt: row.generated_at,
            messageCount: row.message_count,
            startMessageId: row.start_message_id || undefined,
            endMessageId: row.end_message_id || undefined,
            metadata: this.parseMetadata(row.metadata),
            qualityScore: row.quality_score || undefined
        };
    }
}
//# sourceMappingURL=SummaryRepository.js.map