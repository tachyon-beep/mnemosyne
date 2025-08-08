/**
 * Message Repository - CRUD operations for messages with FTS support
 *
 * This repository provides:
 * - Full CRUD operations for messages
 * - Full-text search capabilities
 * - Parent-child message relationships (threading)
 * - Embedding vector storage and retrieval
 * - Automatic FTS index maintenance via triggers
 * - Conversation timestamp updates
 */
import { BaseRepository } from './BaseRepository.js';
/**
 * Repository for message CRUD operations with FTS support
 */
export class MessageRepository extends BaseRepository {
    /**
     * Create a new message
     */
    async create(params) {
        const id = params.id || this.generateId();
        const now = this.getCurrentTimestamp();
        const message = {
            id,
            conversationId: params.conversationId,
            role: params.role,
            content: params.content,
            createdAt: now,
            parentMessageId: params.parentMessageId,
            metadata: params.metadata || {},
            embedding: params.embedding
        };
        try {
            // Convert embedding array to Buffer if provided
            let embeddingBuffer = null;
            if (params.embedding && params.embedding.length > 0) {
                embeddingBuffer = Buffer.from(new Float32Array(params.embedding).buffer);
            }
            this.executeStatementRun('insert_message', `INSERT INTO messages (id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                message.id,
                message.conversationId,
                message.role,
                message.content,
                message.createdAt,
                message.parentMessageId || null,
                this.stringifyMetadata(message.metadata),
                embeddingBuffer
            ]);
            return message;
        }
        catch (error) {
            this.handleConstraintError(error, 'Message');
        }
    }
    /**
     * Find a message by ID
     */
    async findById(id) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        const row = this.executeStatement('find_message_by_id', `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       WHERE id = ?`, [id]);
        if (!row) {
            return null;
        }
        return this.mapRowToMessage(row);
    }
    /**
     * Find messages by conversation ID with pagination
     */
    async findByConversation(conversationId, limit, offset, orderBy = 'created_at', orderDir = 'ASC') {
        if (!this.isValidUUID(conversationId)) {
            return { data: [], hasMore: false };
        }
        const pagination = this.validatePagination(limit, offset);
        // Validate orderBy and orderDir to prevent SQL injection
        if (orderBy !== 'created_at') {
            throw new Error('Invalid orderBy parameter');
        }
        if (orderDir !== 'ASC' && orderDir !== 'DESC') {
            throw new Error('Invalid orderDir parameter');
        }
        const rows = this.executeStatementAll(`find_messages_by_conversation_${orderDir}`, `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ${orderDir}
       LIMIT ? OFFSET ?`, [conversationId, pagination.limit + 1, pagination.offset]);
        const hasMore = rows.length > pagination.limit;
        const data = rows.slice(0, pagination.limit).map(row => this.mapRowToMessage(row));
        return {
            data,
            hasMore
        };
    }
    /**
     * Update a message
     */
    async update(id, params) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        const existing = await this.findById(id);
        if (!existing) {
            return null;
        }
        const updatedMessage = {
            ...existing,
            content: params.content !== undefined ? params.content : existing.content,
            metadata: params.metadata !== undefined ? params.metadata : existing.metadata,
            embedding: params.embedding !== undefined ? params.embedding : existing.embedding
        };
        try {
            // Convert embedding array to Buffer if provided
            let embeddingBuffer = null;
            if (updatedMessage.embedding && updatedMessage.embedding.length > 0) {
                embeddingBuffer = Buffer.from(new Float32Array(updatedMessage.embedding).buffer);
            }
            const result = this.executeStatementRun('update_message', `UPDATE messages 
         SET content = ?, metadata = ?, embedding = ?
         WHERE id = ?`, [
                updatedMessage.content,
                this.stringifyMetadata(updatedMessage.metadata),
                embeddingBuffer,
                id
            ]);
            if (result.changes === 0) {
                return null;
            }
            return updatedMessage;
        }
        catch (error) {
            this.handleConstraintError(error, 'Message');
        }
    }
    /**
     * Delete a message
     */
    async delete(id) {
        if (!this.isValidUUID(id)) {
            return false;
        }
        const result = this.executeStatementRun('delete_message', 'DELETE FROM messages WHERE id = ?', [id]);
        return result.changes > 0;
    }
    /**
     * Count messages in a conversation
     */
    async countByConversation(conversationId) {
        if (!this.isValidUUID(conversationId)) {
            return 0;
        }
        const result = this.executeStatement('count_messages_by_conversation', 'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?', [conversationId]);
        return result.count;
    }
    /**
     * Full-text search across messages with optimized query
     */
    async search(options) {
        const pagination = this.validatePagination(options.limit, options.offset);
        // Build the FTS query
        let ftsQuery = options.query;
        if (options.matchType === 'prefix') {
            ftsQuery = `${options.query}*`;
        }
        else if (options.matchType === 'exact') {
            ftsQuery = `"${options.query}"`;
        }
        // For fuzzy matching, we use the query as-is (FTS5 default behavior)
        let whereClause = '';
        const params = [ftsQuery];
        // Add conversation filter if specified
        if (options.conversationId) {
            if (!this.isValidUUID(options.conversationId)) {
                return { data: [], hasMore: false };
            }
            whereClause += ' AND m.conversation_id = ?';
            params.push(options.conversationId);
        }
        // Add date range filters if specified
        if (options.startDate) {
            const startTimestamp = new Date(options.startDate).getTime();
            whereClause += ' AND m.created_at >= ?';
            params.push(startTimestamp);
        }
        if (options.endDate) {
            const endTimestamp = new Date(options.endDate).getTime();
            whereClause += ' AND m.created_at <= ?';
            params.push(endTimestamp);
        }
        // Add pagination parameters
        params.push(pagination.limit + 1, pagination.offset);
        // Optimized query with proper joins and covering indexes
        const rows = this.executeStatementAll('search_messages_fts_optimized', `WITH ranked_results AS (
         SELECT 
           m.id, m.conversation_id, m.role, m.content, m.created_at, 
           m.parent_message_id, m.metadata, m.embedding,
           messages_fts.rank as rank,
           snippet(messages_fts, 0, ?, ?, '...', 32) as snippet
         FROM messages_fts
         STRAIGHT_JOIN messages m ON m.rowid = messages_fts.rowid
         WHERE messages_fts MATCH ?${whereClause}
         ORDER BY messages_fts.rank
         LIMIT ? OFFSET ?
       )
       SELECT 
         r.*, c.title as conversation_title
       FROM ranked_results r
       LEFT JOIN conversations c ON c.id = r.conversation_id
       ORDER BY r.rank`, [
            options.highlightStart || '<mark>',
            options.highlightEnd || '</mark>',
            ...params
        ]);
        const hasMore = rows.length > pagination.limit;
        const data = rows.slice(0, pagination.limit).map(row => ({
            message: this.mapRowToMessage(row),
            score: row.rank,
            snippet: row.snippet,
            conversationTitle: row.conversation_title || undefined
        }));
        return {
            data,
            hasMore
        };
    }
    /**
     * Find messages by role
     */
    async findByRole(role, conversationId, limit, offset) {
        const pagination = this.validatePagination(limit, offset);
        let whereClause = 'WHERE role = ?';
        const params = [role];
        if (conversationId) {
            if (!this.isValidUUID(conversationId)) {
                return { data: [], hasMore: false };
            }
            whereClause += ' AND conversation_id = ?';
            params.push(conversationId);
        }
        params.push(pagination.limit + 1, pagination.offset);
        const rows = this.executeStatementAll(`find_messages_by_role_${conversationId ? 'with_conversation' : 'all'}`, `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`, params);
        const hasMore = rows.length > pagination.limit;
        const data = rows.slice(0, pagination.limit).map(row => this.mapRowToMessage(row));
        return {
            data,
            hasMore
        };
    }
    /**
     * Find child messages of a parent message
     */
    async findChildren(parentMessageId) {
        if (!this.isValidUUID(parentMessageId)) {
            return [];
        }
        const rows = this.executeStatementAll('find_child_messages', `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       WHERE parent_message_id = ?
       ORDER BY created_at ASC`, [parentMessageId]);
        return rows.map(row => this.mapRowToMessage(row));
    }
    /**
     * Get messages with embeddings for vector search
     */
    async findWithEmbeddings(conversationId, limit, offset) {
        const pagination = this.validatePagination(limit, offset);
        let whereClause = 'WHERE embedding IS NOT NULL';
        const params = [];
        if (conversationId) {
            if (!this.isValidUUID(conversationId)) {
                return { data: [], hasMore: false };
            }
            whereClause += ' AND conversation_id = ?';
            params.push(conversationId);
        }
        params.push(pagination.limit + 1, pagination.offset);
        const rows = this.executeStatementAll(`find_messages_with_embeddings_${conversationId ? 'by_conversation' : 'all'}`, `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`, params);
        const hasMore = rows.length > pagination.limit;
        const data = rows.slice(0, pagination.limit).map(row => this.mapRowToMessage(row));
        return {
            data,
            hasMore
        };
    }
    /**
     * Check if a message exists
     */
    async exists(id) {
        if (!this.isValidUUID(id)) {
            return false;
        }
        const result = this.executeStatement('message_exists', 'SELECT 1 as count FROM messages WHERE id = ? LIMIT 1', [id]);
        return !!result;
    }
    /**
     * Batch create messages for better performance
     */
    async batchCreate(messages) {
        if (messages.length === 0) {
            return [];
        }
        const db = this.getConnection();
        const now = this.getCurrentTimestamp();
        // Prepare batch insert
        const insertStmt = db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const transaction = db.transaction(() => {
            const results = [];
            for (const params of messages) {
                const id = params.id || this.generateId();
                let embeddingBuffer = null;
                if (params.embedding && params.embedding.length > 0) {
                    embeddingBuffer = Buffer.from(new Float32Array(params.embedding).buffer);
                }
                const message = {
                    id,
                    conversationId: params.conversationId,
                    role: params.role,
                    content: params.content,
                    createdAt: now,
                    parentMessageId: params.parentMessageId,
                    metadata: params.metadata || {},
                    embedding: params.embedding
                };
                insertStmt.run(message.id, message.conversationId, message.role, message.content, message.createdAt, message.parentMessageId || null, this.stringifyMetadata(message.metadata), embeddingBuffer);
                results.push(message);
            }
            return results;
        });
        return transaction();
    }
    /**
     * Batch update message embeddings
     */
    async batchUpdateEmbeddings(updates) {
        if (updates.length === 0) {
            return 0;
        }
        const db = this.getConnection();
        const updateStmt = db.prepare('UPDATE messages SET embedding = ? WHERE id = ?');
        const transaction = db.transaction(() => {
            let updatedCount = 0;
            for (const update of updates) {
                const result = updateStmt.run(JSON.stringify(update.embedding), update.id);
                updatedCount += result.changes;
            }
            return updatedCount;
        });
        return transaction();
    }
    /**
     * Get messages by IDs (optimized batch retrieval)
     */
    async findByIds(ids) {
        if (ids.length === 0) {
            return [];
        }
        // Validate all IDs
        const validIds = ids.filter(id => this.isValidUUID(id));
        if (validIds.length === 0) {
            return [];
        }
        const placeholders = validIds.map(() => '?').join(',');
        const rows = this.executeStatementAll('find_messages_by_ids', `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       WHERE id IN (${placeholders})
       ORDER BY created_at ASC`, validIds);
        return rows.map(row => this.mapRowToMessage(row));
    }
    /**
     * Get conversation message statistics
     */
    async getConversationStats(conversationId) {
        if (!this.isValidUUID(conversationId)) {
            return {
                totalMessages: 0,
                messagesByRole: {},
                dateRange: null,
                hasEmbeddings: false,
                avgMessageLength: 0
            };
        }
        const stats = this.executeStatement('conversation_message_stats', `SELECT 
         COUNT(*) as total_messages,
         SUM(CASE WHEN role = 'user' THEN 1 ELSE 0 END) as user_messages,
         SUM(CASE WHEN role = 'assistant' THEN 1 ELSE 0 END) as assistant_messages,
         SUM(CASE WHEN role = 'system' THEN 1 ELSE 0 END) as system_messages,
         MIN(created_at) as earliest_date,
         MAX(created_at) as latest_date,
         SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) as messages_with_embeddings,
         AVG(LENGTH(content)) as avg_content_length
       FROM messages 
       WHERE conversation_id = ?`, [conversationId]);
        if (!stats) {
            return {
                totalMessages: 0,
                messagesByRole: {},
                dateRange: null,
                hasEmbeddings: false,
                avgMessageLength: 0
            };
        }
        return {
            totalMessages: stats.total_messages,
            messagesByRole: {
                user: stats.user_messages,
                assistant: stats.assistant_messages,
                system: stats.system_messages
            },
            dateRange: stats.earliest_date && stats.latest_date
                ? { earliest: stats.earliest_date, latest: stats.latest_date }
                : null,
            hasEmbeddings: stats.messages_with_embeddings > 0,
            avgMessageLength: Math.round(stats.avg_content_length || 0)
        };
    }
    /**
     * Find messages by conversation ID (alias for findByConversation for compatibility)
     */
    async findByConversationId(conversationId, options) {
        const result = await this.findByConversation(conversationId, options?.limit, options?.offset, options?.orderBy || 'created_at', options?.orderDir || 'ASC');
        return result.data;
    }
    /**
     * Map database row to Message object
     */
    mapRowToMessage(row) {
        // Convert embedding Buffer back to number array if present
        let embedding;
        if (row.embedding) {
            const float32Array = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
            embedding = Array.from(float32Array);
        }
        return {
            id: row.id,
            conversationId: row.conversation_id,
            role: row.role,
            content: row.content,
            createdAt: row.created_at,
            parentMessageId: row.parent_message_id || undefined,
            metadata: this.parseMetadata(row.metadata),
            embedding
        };
    }
}
//# sourceMappingURL=MessageRepository.js.map