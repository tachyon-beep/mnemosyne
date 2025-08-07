/**
 * Conversation Repository - CRUD operations for conversations
 *
 * This repository provides:
 * - Full CRUD operations for conversations
 * - Transaction support for complex operations
 * - Cascade operations (deleting conversation deletes messages)
 * - Statistics and metadata management
 * - Pagination support
 */
import { BaseRepository } from './BaseRepository.js';
/**
 * Repository for conversation CRUD operations
 */
export class ConversationRepository extends BaseRepository {
    /**
     * Create a new conversation
     */
    async create(params) {
        const id = params.id || this.generateId();
        const now = this.getCurrentTimestamp();
        const conversation = {
            id,
            createdAt: now,
            updatedAt: now,
            title: params.title,
            metadata: params.metadata || {}
        };
        try {
            this.executeStatementRun('insert_conversation', `INSERT INTO conversations (id, created_at, updated_at, title, metadata)
         VALUES (?, ?, ?, ?, ?)`, [
                conversation.id,
                conversation.createdAt,
                conversation.updatedAt,
                conversation.title || null,
                this.stringifyMetadata(conversation.metadata)
            ]);
            return conversation;
        }
        catch (error) {
            this.handleConstraintError(error, 'Conversation');
        }
    }
    /**
     * Find a conversation by ID
     */
    async findById(id) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        const row = this.executeStatement('find_conversation_by_id', `SELECT id, created_at, updated_at, title, metadata
       FROM conversations
       WHERE id = ?`, [id]);
        if (!row) {
            return null;
        }
        return {
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            title: row.title || undefined,
            metadata: this.parseMetadata(row.metadata)
        };
    }
    /**
     * Find all conversations with pagination
     */
    async findAll(limit, offset, orderBy = 'updated_at', orderDir = 'DESC') {
        const pagination = this.validatePagination(limit, offset);
        // Validate orderBy parameter to prevent SQL injection
        if (orderBy !== 'created_at' && orderBy !== 'updated_at') {
            throw new Error('Invalid orderBy parameter');
        }
        if (orderDir !== 'ASC' && orderDir !== 'DESC') {
            throw new Error('Invalid orderDir parameter');
        }
        const rows = this.executeStatementAll(`find_all_conversations_${orderBy}_${orderDir}`, `SELECT id, created_at, updated_at, title, metadata
       FROM conversations
       ORDER BY ${orderBy} ${orderDir}
       LIMIT ? OFFSET ?`, [pagination.limit + 1, pagination.offset] // Get one extra to check if there are more
        );
        const hasMore = rows.length > pagination.limit;
        const data = rows.slice(0, pagination.limit).map(row => ({
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            title: row.title || undefined,
            metadata: this.parseMetadata(row.metadata)
        }));
        return {
            data,
            hasMore,
            totalCount: undefined // We don't calculate total count for performance reasons
        };
    }
    /**
     * Update a conversation
     */
    async update(id, params) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        const existing = await this.findById(id);
        if (!existing) {
            return null;
        }
        const now = this.getCurrentTimestamp();
        const updatedConversation = {
            ...existing,
            updatedAt: now,
            title: params.title !== undefined ? params.title : existing.title,
            metadata: params.metadata !== undefined ? params.metadata : existing.metadata
        };
        try {
            const result = this.executeStatementRun('update_conversation', `UPDATE conversations 
         SET updated_at = ?, title = ?, metadata = ?
         WHERE id = ?`, [
                updatedConversation.updatedAt,
                updatedConversation.title || null,
                this.stringifyMetadata(updatedConversation.metadata),
                id
            ]);
            if (result.changes === 0) {
                return null;
            }
            return updatedConversation;
        }
        catch (error) {
            this.handleConstraintError(error, 'Conversation');
        }
    }
    /**
     * Delete a conversation and all its messages (cascade)
     */
    async delete(id) {
        if (!this.isValidUUID(id)) {
            return false;
        }
        return this.transaction((db) => {
            // First, delete all messages in the conversation
            // This will automatically update the FTS index via triggers
            const deleteMessagesStmt = db.prepare('DELETE FROM messages WHERE conversation_id = ?');
            deleteMessagesStmt.run(id);
            // Then delete the conversation
            const deleteConversationStmt = db.prepare('DELETE FROM conversations WHERE id = ?');
            const result = deleteConversationStmt.run(id);
            return result.changes > 0;
        });
    }
    /**
     * Get conversation statistics
     */
    async getStats(id) {
        if (!this.isValidUUID(id)) {
            return null;
        }
        // Check if conversation exists
        const conversation = await this.findById(id);
        if (!conversation) {
            return null;
        }
        const stats = this.executeStatement('get_conversation_stats', `SELECT 
         COUNT(*) as message_count,
         MIN(created_at) as first_message_at,
         MAX(created_at) as last_message_at
       FROM messages
       WHERE conversation_id = ?`, [id]);
        // Get distinct roles
        const roles = this.executeStatementAll('get_conversation_roles', `SELECT DISTINCT role
       FROM messages
       WHERE conversation_id = ?
       ORDER BY role`, [id]);
        return {
            messageCount: stats.message_count,
            firstMessageAt: stats.first_message_at || undefined,
            lastMessageAt: stats.last_message_at || undefined,
            participantRoles: roles.map(r => r.role)
        };
    }
    /**
     * Find conversations by title (fuzzy search)
     */
    async findByTitle(titleQuery, limit, offset) {
        const pagination = this.validatePagination(limit, offset);
        const searchPattern = `%${titleQuery}%`;
        const rows = this.executeStatementAll('find_conversations_by_title', `SELECT id, created_at, updated_at, title, metadata
       FROM conversations
       WHERE title IS NOT NULL AND title LIKE ?
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`, [searchPattern, pagination.limit + 1, pagination.offset]);
        const hasMore = rows.length > pagination.limit;
        const data = rows.slice(0, pagination.limit).map(row => ({
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            title: row.title || undefined,
            metadata: this.parseMetadata(row.metadata)
        }));
        return {
            data,
            hasMore
        };
    }
    /**
     * Get conversations created within a date range
     */
    async findByDateRange(startDate, endDate, limit, offset) {
        const pagination = this.validatePagination(limit, offset);
        const rows = this.executeStatementAll('find_conversations_by_date_range', `SELECT id, created_at, updated_at, title, metadata
       FROM conversations
       WHERE created_at >= ? AND created_at <= ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`, [startDate, endDate, pagination.limit + 1, pagination.offset]);
        const hasMore = rows.length > pagination.limit;
        const data = rows.slice(0, pagination.limit).map(row => ({
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            title: row.title || undefined,
            metadata: this.parseMetadata(row.metadata)
        }));
        return {
            data,
            hasMore
        };
    }
    /**
     * Count total conversations
     */
    async count() {
        const result = this.executeStatement('count_conversations', 'SELECT COUNT(*) as count FROM conversations');
        return result.count;
    }
    /**
     * Check if a conversation exists
     */
    async exists(id) {
        if (!this.isValidUUID(id)) {
            return false;
        }
        const result = this.executeStatement('conversation_exists', 'SELECT COUNT(*) as count FROM conversations WHERE id = ? LIMIT 1', [id]);
        return result ? result.count > 0 : false;
    }
    /**
     * Update the timestamp of a conversation to mark it as recently active
     */
    async updateTimestamp(id) {
        if (!this.isValidUUID(id)) {
            return;
        }
        const now = this.getCurrentTimestamp();
        this.executeStatementRun('update_conversation_timestamp', 'UPDATE conversations SET updated_at = ? WHERE id = ?', [now, id]);
    }
    /**
     * Find the oldest conversation based on filters
     */
    async findOldest(filters) {
        let whereClause = '';
        let params = [];
        if (filters?.startDate) {
            const startTimestamp = new Date(filters.startDate).getTime();
            whereClause += 'WHERE created_at >= ?';
            params.push(startTimestamp);
        }
        if (filters?.endDate) {
            const endTimestamp = new Date(filters.endDate).getTime();
            whereClause += whereClause ? ' AND created_at <= ?' : 'WHERE created_at <= ?';
            params.push(endTimestamp);
        }
        const row = this.executeStatement('find_oldest_conversation', `SELECT id, created_at, updated_at, title, metadata
       FROM conversations
       ${whereClause}
       ORDER BY created_at ASC
       LIMIT 1`, params);
        if (!row) {
            return null;
        }
        return {
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            title: row.title || undefined,
            metadata: this.parseMetadata(row.metadata)
        };
    }
    /**
     * Find the newest conversation based on filters
     */
    async findNewest(filters) {
        let whereClause = '';
        let params = [];
        if (filters?.startDate) {
            const startTimestamp = new Date(filters.startDate).getTime();
            whereClause += 'WHERE created_at >= ?';
            params.push(startTimestamp);
        }
        if (filters?.endDate) {
            const endTimestamp = new Date(filters.endDate).getTime();
            whereClause += whereClause ? ' AND created_at <= ?' : 'WHERE created_at <= ?';
            params.push(endTimestamp);
        }
        const row = this.executeStatement('find_newest_conversation', `SELECT id, created_at, updated_at, title, metadata
       FROM conversations
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT 1`, params);
        if (!row) {
            return null;
        }
        return {
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            title: row.title || undefined,
            metadata: this.parseMetadata(row.metadata)
        };
    }
    /**
     * Get conversations with pagination and optional filters
     */
    getConversations(options = {}) {
        const pagination = this.validatePagination(options.limit, options.offset);
        let whereClause = '';
        let params = [];
        if (options.startDate) {
            whereClause += 'WHERE created_at >= ?';
            params.push(options.startDate.getTime());
        }
        if (options.endDate) {
            whereClause += whereClause ? ' AND created_at <= ?' : 'WHERE created_at <= ?';
            params.push(options.endDate.getTime());
        }
        const rows = this.executeStatementAll('get_conversations_paginated', `SELECT id, created_at, updated_at, title, metadata
       FROM conversations
       ${whereClause}
       ORDER BY updated_at DESC
       LIMIT ? OFFSET ?`, [...params, pagination.limit, pagination.offset]);
        const conversations = rows.map(row => ({
            id: row.id,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
            title: row.title || undefined,
            metadata: this.parseMetadata(row.metadata)
        }));
        return {
            data: conversations,
            hasMore: conversations.length === pagination.limit,
            totalCount: undefined
        };
    }
}
//# sourceMappingURL=ConversationRepository.js.map