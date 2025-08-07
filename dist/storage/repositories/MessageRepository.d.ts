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
export declare class MessageRepository extends BaseRepository {
    /**
     * Create a new message
     */
    create(params: CreateMessageParams): Promise<Message>;
    /**
     * Find a message by ID
     */
    findById(id: string): Promise<Message | null>;
    /**
     * Find messages by conversation ID with pagination
     */
    findByConversation(conversationId: string, limit?: number, offset?: number, orderBy?: 'created_at', orderDir?: 'ASC' | 'DESC'): Promise<PaginatedResult<Message>>;
    /**
     * Update a message
     */
    update(id: string, params: UpdateMessageParams): Promise<Message | null>;
    /**
     * Delete a message
     */
    delete(id: string): Promise<boolean>;
    /**
     * Count messages in a conversation
     */
    countByConversation(conversationId: string): Promise<number>;
    /**
     * Full-text search across messages with optimized query
     */
    search(options: SearchOptions): Promise<PaginatedResult<SearchResult>>;
    /**
     * Find messages by role
     */
    findByRole(role: 'user' | 'assistant' | 'system', conversationId?: string, limit?: number, offset?: number): Promise<PaginatedResult<Message>>;
    /**
     * Find child messages of a parent message
     */
    findChildren(parentMessageId: string): Promise<Message[]>;
    /**
     * Get messages with embeddings for vector search
     */
    findWithEmbeddings(conversationId?: string, limit?: number, offset?: number): Promise<PaginatedResult<Message>>;
    /**
     * Check if a message exists
     */
    exists(id: string): Promise<boolean>;
    /**
     * Batch create messages for better performance
     */
    batchCreate(messages: CreateMessageParams[]): Promise<Message[]>;
    /**
     * Batch update message embeddings
     */
    batchUpdateEmbeddings(updates: {
        id: string;
        embedding: number[];
    }[]): Promise<number>;
    /**
     * Get messages by IDs (optimized batch retrieval)
     */
    findByIds(ids: string[]): Promise<Message[]>;
    /**
     * Get conversation message statistics
     */
    getConversationStats(conversationId: string): Promise<{
        totalMessages: number;
        messagesByRole: {
            [role: string]: number;
        };
        dateRange: {
            earliest: number;
            latest: number;
        } | null;
        hasEmbeddings: boolean;
        avgMessageLength: number;
    }>;
    /**
     * Find messages by conversation ID (alias for findByConversation for compatibility)
     */
    findByConversationId(conversationId: string, options?: {
        limit?: number;
        offset?: number;
        orderBy?: 'created_at';
        orderDir?: 'ASC' | 'DESC';
    }): Promise<Message[]>;
    /**
     * Map database row to Message object
     */
    private mapRowToMessage;
}
//# sourceMappingURL=MessageRepository.d.ts.map