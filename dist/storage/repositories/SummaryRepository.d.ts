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
import { ConversationSummary, PaginatedResult } from '../../types/interfaces.js';
import { BaseRepository } from './BaseRepository.js';
/**
 * Interface for creating summary parameters
 */
export interface CreateSummaryParams {
    id?: string;
    conversationId: string;
    level: 'brief' | 'standard' | 'detailed';
    summaryText: string;
    tokenCount: number;
    provider: string;
    model: string;
    messageCount: number;
    startMessageId?: string;
    endMessageId?: string;
    metadata?: Record<string, any>;
    qualityScore?: number;
}
/**
 * Interface for updating summary parameters
 */
export interface UpdateSummaryParams {
    summaryText?: string;
    tokenCount?: number;
    metadata?: Record<string, any>;
    qualityScore?: number;
}
/**
 * Interface for summary batch creation
 */
export interface BatchSummaryParams {
    summaries: CreateSummaryParams[];
}
/**
 * Repository for conversation summary CRUD operations
 */
export declare class SummaryRepository extends BaseRepository {
    /**
     * Create a new conversation summary
     */
    create(params: CreateSummaryParams): Promise<ConversationSummary>;
    /**
     * Find summaries by conversation ID with optional level filter
     */
    findByConversation(conversationId: string, level?: 'brief' | 'standard' | 'detailed', limit?: number, offset?: number): Promise<PaginatedResult<ConversationSummary>>;
    /**
     * Find the most recent summary for a conversation at a specific level
     */
    findByConversationAndLevel(conversationId: string, level: 'brief' | 'standard' | 'detailed'): Promise<ConversationSummary | null>;
    /**
     * Find recent summaries across all conversations
     */
    findRecent(limit?: number, minQualityScore?: number): Promise<ConversationSummary[]>;
    /**
     * Create multiple summaries in a single transaction
     */
    createBatch(params: BatchSummaryParams): Promise<ConversationSummary[]>;
    /**
     * Invalidate/delete all summaries for a conversation
     */
    invalidateForConversation(conversationId: string): Promise<number>;
    /**
     * Find a summary by ID
     */
    findById(id: string): Promise<ConversationSummary | null>;
    /**
     * Update a summary
     */
    update(id: string, params: UpdateSummaryParams): Promise<ConversationSummary | null>;
    /**
     * Delete a summary
     */
    delete(id: string): Promise<boolean>;
    /**
     * Get summaries by provider
     */
    findByProvider(provider: string, limit?: number, offset?: number): Promise<PaginatedResult<ConversationSummary>>;
    /**
     * Count summaries by conversation
     */
    countByConversation(conversationId: string): Promise<number>;
    /**
     * Check if a summary exists
     */
    exists(id: string): Promise<boolean>;
    /**
     * Map database row to ConversationSummary object
     */
    private mapRowToSummary;
}
//# sourceMappingURL=SummaryRepository.d.ts.map