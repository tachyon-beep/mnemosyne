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
import { Conversation, PaginatedResult } from '../../types/interfaces.js';
import { BaseRepository } from './BaseRepository.js';
/**
 * Interface for conversation creation parameters
 */
export interface CreateConversationParams {
    id?: string;
    title?: string;
    metadata?: Record<string, any>;
}
/**
 * Interface for conversation update parameters
 */
export interface UpdateConversationParams {
    title?: string;
    metadata?: Record<string, any>;
}
/**
 * Interface for conversation statistics
 */
export interface ConversationStats {
    messageCount: number;
    firstMessageAt?: number;
    lastMessageAt?: number;
    participantRoles: string[];
}
/**
 * Repository for conversation CRUD operations
 */
export declare class ConversationRepository extends BaseRepository {
    /**
     * Create a new conversation
     */
    create(params: CreateConversationParams): Promise<Conversation>;
    /**
     * Find a conversation by ID
     */
    findById(id: string): Promise<Conversation | null>;
    /**
     * Find all conversations with pagination
     */
    findAll(limit?: number, offset?: number, orderBy?: 'created_at' | 'updated_at', orderDir?: 'ASC' | 'DESC'): Promise<PaginatedResult<Conversation>>;
    /**
     * Update a conversation
     */
    update(id: string, params: UpdateConversationParams): Promise<Conversation | null>;
    /**
     * Delete a conversation and all its messages (cascade)
     */
    delete(id: string): Promise<boolean>;
    /**
     * Get conversation statistics
     */
    getStats(id: string): Promise<ConversationStats | null>;
    /**
     * Find conversations by title (fuzzy search)
     */
    findByTitle(titleQuery: string, limit?: number, offset?: number): Promise<PaginatedResult<Conversation>>;
    /**
     * Get conversations created within a date range
     */
    findByDateRange(startDate: number, endDate: number, limit?: number, offset?: number): Promise<PaginatedResult<Conversation>>;
    /**
     * Count total conversations
     */
    count(): Promise<number>;
    /**
     * Check if a conversation exists
     */
    exists(id: string): Promise<boolean>;
    /**
     * Update the timestamp of a conversation to mark it as recently active
     */
    updateTimestamp(id: string): Promise<void>;
    /**
     * Find the oldest conversation based on filters
     */
    findOldest(filters?: {
        startDate?: string;
        endDate?: string;
    }): Promise<Conversation | null>;
    /**
     * Find the newest conversation based on filters
     */
    findNewest(filters?: {
        startDate?: string;
        endDate?: string;
    }): Promise<Conversation | null>;
}
//# sourceMappingURL=ConversationRepository.d.ts.map