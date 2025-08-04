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

import { Message, PaginatedResult, SearchOptions, SearchResult } from '../../types/interfaces.js';
import { BaseRepository } from './BaseRepository.js';

/**
 * Interface for message creation parameters
 */
export interface CreateMessageParams {
  id?: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  parentMessageId?: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

/**
 * Interface for message update parameters
 */
export interface UpdateMessageParams {
  content?: string;
  metadata?: Record<string, any>;
  embedding?: number[];
}

/**
 * Repository for message CRUD operations with FTS support
 */
export class MessageRepository extends BaseRepository {

  /**
   * Create a new message
   */
  async create(params: CreateMessageParams): Promise<Message> {
    const id = params.id || this.generateId();
    const now = this.getCurrentTimestamp();
    
    const message: Message = {
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
      let embeddingBuffer: Buffer | null = null;
      if (params.embedding && params.embedding.length > 0) {
        embeddingBuffer = Buffer.from(new Float32Array(params.embedding).buffer);
      }

      this.executeStatementRun(
        'insert_message',
        `INSERT INTO messages (id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.conversationId,
          message.role,
          message.content,
          message.createdAt,
          message.parentMessageId || null,
          this.stringifyMetadata(message.metadata),
          embeddingBuffer
        ]
      );

      return message;
    } catch (error) {
      this.handleConstraintError(error as Error, 'Message');
    }
  }

  /**
   * Find a message by ID
   */
  async findById(id: string): Promise<Message | null> {
    if (!this.isValidUUID(id)) {
      return null;
    }

    const row = this.executeStatement<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
    }>(
      'find_message_by_id',
      `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       WHERE id = ?`,
      [id]
    );

    if (!row) {
      return null;
    }

    return this.mapRowToMessage(row);
  }

  /**
   * Find messages by conversation ID with pagination
   */
  async findByConversation(
    conversationId: string,
    limit?: number,
    offset?: number,
    orderBy: 'created_at' = 'created_at',
    orderDir: 'ASC' | 'DESC' = 'ASC'
  ): Promise<PaginatedResult<Message>> {
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

    const rows = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
    }>(
      `find_messages_by_conversation_${orderDir}`,
      `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       WHERE conversation_id = ?
       ORDER BY created_at ${orderDir}
       LIMIT ? OFFSET ?`,
      [conversationId, pagination.limit + 1, pagination.offset]
    );

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
  async update(id: string, params: UpdateMessageParams): Promise<Message | null> {
    if (!this.isValidUUID(id)) {
      return null;
    }

    const existing = await this.findById(id);
    if (!existing) {
      return null;
    }

    const updatedMessage: Message = {
      ...existing,
      content: params.content !== undefined ? params.content : existing.content,
      metadata: params.metadata !== undefined ? params.metadata : existing.metadata,
      embedding: params.embedding !== undefined ? params.embedding : existing.embedding
    };

    try {
      // Convert embedding array to Buffer if provided
      let embeddingBuffer: Buffer | null = null;
      if (updatedMessage.embedding && updatedMessage.embedding.length > 0) {
        embeddingBuffer = Buffer.from(new Float32Array(updatedMessage.embedding).buffer);
      }

      const result = this.executeStatementRun(
        'update_message',
        `UPDATE messages 
         SET content = ?, metadata = ?, embedding = ?
         WHERE id = ?`,
        [
          updatedMessage.content,
          this.stringifyMetadata(updatedMessage.metadata),
          embeddingBuffer,
          id
        ]
      );

      if (result.changes === 0) {
        return null;
      }

      return updatedMessage;
    } catch (error) {
      this.handleConstraintError(error as Error, 'Message');
    }
  }

  /**
   * Delete a message
   */
  async delete(id: string): Promise<boolean> {
    if (!this.isValidUUID(id)) {
      return false;
    }

    const result = this.executeStatementRun(
      'delete_message',
      'DELETE FROM messages WHERE id = ?',
      [id]
    );

    return result.changes > 0;
  }

  /**
   * Count messages in a conversation
   */
  async countByConversation(conversationId: string): Promise<number> {
    if (!this.isValidUUID(conversationId)) {
      return 0;
    }

    const result = this.executeStatement<{ count: number }>(
      'count_messages_by_conversation',
      'SELECT COUNT(*) as count FROM messages WHERE conversation_id = ?',
      [conversationId]
    );
    
    return result.count;
  }

  /**
   * Full-text search across messages
   */
  async search(options: SearchOptions): Promise<PaginatedResult<SearchResult>> {
    const pagination = this.validatePagination(options.limit, options.offset);
    
    // Build the FTS query
    let ftsQuery = options.query;
    if (options.matchType === 'prefix') {
      ftsQuery = `${options.query}*`;
    } else if (options.matchType === 'exact') {
      ftsQuery = `"${options.query}"`;
    }
    // For fuzzy matching, we use the query as-is (FTS5 default behavior)

    let whereClause = '';
    let params: any[] = [ftsQuery];
    
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

    const rows = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
      rank: number;
      snippet: string;
      conversation_title: string | null;
    }>(
      'search_messages_fts',
      `SELECT 
         m.id, m.conversation_id, m.role, m.content, m.created_at, 
         m.parent_message_id, m.metadata, m.embedding,
         bm25(fts) as rank,
         snippet(fts, 0, ?, ?, '...', 32) as snippet,
         c.title as conversation_title
       FROM messages_fts fts
       JOIN messages m ON m.rowid = fts.rowid
       JOIN conversations c ON c.id = m.conversation_id
       WHERE fts MATCH ?${whereClause}
       ORDER BY rank
       LIMIT ? OFFSET ?`,
      [
        options.highlightStart || '<mark>',
        options.highlightEnd || '</mark>',
        ...params
      ]
    );

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
  async findByRole(
    role: 'user' | 'assistant' | 'system',
    conversationId?: string,
    limit?: number,
    offset?: number
  ): Promise<PaginatedResult<Message>> {
    const pagination = this.validatePagination(limit, offset);
    
    let whereClause = 'WHERE role = ?';
    let params: any[] = [role];
    
    if (conversationId) {
      if (!this.isValidUUID(conversationId)) {
        return { data: [], hasMore: false };
      }
      whereClause += ' AND conversation_id = ?';
      params.push(conversationId);
    }

    params.push(pagination.limit + 1, pagination.offset);

    const rows = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
    }>(
      `find_messages_by_role_${conversationId ? 'with_conversation' : 'all'}`,
      `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

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
  async findChildren(parentMessageId: string): Promise<Message[]> {
    if (!this.isValidUUID(parentMessageId)) {
      return [];
    }

    const rows = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
    }>(
      'find_child_messages',
      `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       WHERE parent_message_id = ?
       ORDER BY created_at ASC`,
      [parentMessageId]
    );

    return rows.map(row => this.mapRowToMessage(row));
  }

  /**
   * Get messages with embeddings for vector search
   */
  async findWithEmbeddings(
    conversationId?: string,
    limit?: number,
    offset?: number
  ): Promise<PaginatedResult<Message>> {
    const pagination = this.validatePagination(limit, offset);
    
    let whereClause = 'WHERE embedding IS NOT NULL';
    let params: any[] = [];
    
    if (conversationId) {
      if (!this.isValidUUID(conversationId)) {
        return { data: [], hasMore: false };
      }
      whereClause += ' AND conversation_id = ?';
      params.push(conversationId);
    }

    params.push(pagination.limit + 1, pagination.offset);

    const rows = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
    }>(
      `find_messages_with_embeddings_${conversationId ? 'by_conversation' : 'all'}`,
      `SELECT id, conversation_id, role, content, created_at, parent_message_id, metadata, embedding
       FROM messages
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

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
  async exists(id: string): Promise<boolean> {
    if (!this.isValidUUID(id)) {
      return false;
    }

    const result = this.executeStatement<{ count: number }>(
      'message_exists',
      'SELECT 1 as count FROM messages WHERE id = ? LIMIT 1',
      [id]
    );
    return !!result;
  }

  /**
   * Find messages by conversation ID (alias for findByConversation for compatibility)
   */
  async findByConversationId(conversationId: string, options?: {
    limit?: number;
    offset?: number;
    orderBy?: 'created_at';
    orderDir?: 'ASC' | 'DESC';
  }): Promise<Message[]> {
    const result = await this.findByConversation(
      conversationId,
      options?.limit,
      options?.offset,
      options?.orderBy || 'created_at',
      options?.orderDir || 'ASC'
    );
    return result.data;
  }

  /**
   * Map database row to Message object
   */
  private mapRowToMessage(row: {
    id: string;
    conversation_id: string;
    role: string;
    content: string;
    created_at: number;
    parent_message_id: string | null;
    metadata: string;
    embedding: Buffer | null;
  }): Message {
    // Convert embedding Buffer back to number array if present
    let embedding: number[] | undefined;
    if (row.embedding) {
      const float32Array = new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4);
      embedding = Array.from(float32Array);
    }

    return {
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      createdAt: row.created_at,
      parentMessageId: row.parent_message_id || undefined,
      metadata: this.parseMetadata(row.metadata),
      embedding
    };
  }
}