/**
 * DeleteConversation Tool Implementation
 *
 * This tool deletes a conversation and all its messages. It supports both
 * soft deletion (marking as deleted) and permanent deletion.
 */
import { DeleteConversationInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { SearchEngine } from '../search/SearchEngine.js';
/**
 * Response interface for delete_conversation tool
 */
export interface DeleteConversationResponse {
    /** Whether the deletion was successful */
    success: boolean;
    /** The deleted conversation metadata */
    deletedConversation: {
        id: string;
        title?: string;
        messageCount: number;
        createdAt: number;
        updatedAt: number;
    };
    /** Deletion details */
    details: {
        /** Whether this was a permanent deletion */
        permanent: boolean;
        /** Number of messages deleted */
        messagesDeleted: number;
        /** Timestamp when deletion occurred */
        deletedAt: number;
        /** Whether search index was updated */
        searchIndexUpdated: boolean;
    };
    /** Recovery information (for soft deletes) */
    recovery?: {
        /** Instructions for recovery */
        instructions: string;
        /** Estimated recovery difficulty */
        difficulty: 'easy' | 'moderate' | 'difficult';
    };
}
/**
 * Dependencies required by DeleteConversationTool
 */
export interface DeleteConversationDependencies {
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
    searchEngine: SearchEngine;
}
/**
 * Implementation of the delete_conversation MCP tool
 */
export declare class DeleteConversationTool extends BaseTool<DeleteConversationInput, DeleteConversationResponse> {
    private readonly conversationRepo;
    private readonly messageRepo;
    private readonly searchEngine;
    constructor(dependencies: DeleteConversationDependencies);
    /**
     * Execute the delete_conversation tool
     */
    protected executeImpl(input: DeleteConversationInput, context: ToolContext): Promise<DeleteConversationResponse>;
    /**
     * Get conversation for deletion, ensuring it exists
     */
    private getConversationForDeletion;
    /**
     * Get all messages in the conversation
     */
    private getMessagesForDeletion;
    /**
     * Validate that the deletion is allowed
     */
    private validateDeletion;
    /**
     * Perform the actual deletion
     */
    private performDeletion;
    /**
     * Perform permanent deletion
     */
    private performPermanentDeletion;
    /**
     * Perform soft deletion
     */
    private performSoftDeletion;
    /**
     * Update search index after deletion
     */
    private updateSearchIndex;
    /**
     * Build recovery information for soft deletes
     */
    private buildRecoveryInfo;
    /**
     * Static factory method to create a DeleteConversationTool instance
     */
    static create(dependencies: DeleteConversationDependencies): DeleteConversationTool;
}
//# sourceMappingURL=DeleteConversationTool.d.ts.map