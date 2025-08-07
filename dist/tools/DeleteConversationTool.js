/**
 * DeleteConversation Tool Implementation
 *
 * This tool deletes a conversation and all its messages. It supports both
 * soft deletion (marking as deleted) and permanent deletion.
 */
import { DeleteConversationTool as DeleteConversationToolDef } from '../types/mcp.js';
import { DeleteConversationSchema } from '../types/schemas.js';
import { BaseTool, NotFoundError, ValidationError, wrapDatabaseOperation } from './BaseTool.js';
/**
 * Implementation of the delete_conversation MCP tool
 */
export class DeleteConversationTool extends BaseTool {
    conversationRepo;
    messageRepo;
    searchEngine;
    constructor(dependencies) {
        super(DeleteConversationToolDef, DeleteConversationSchema);
        this.conversationRepo = dependencies.conversationRepository;
        this.messageRepo = dependencies.messageRepository;
        this.searchEngine = dependencies.searchEngine;
    }
    /**
     * Execute the delete_conversation tool
     */
    async executeImpl(input, context) {
        const deletedAt = Date.now();
        // Step 1: Verify the conversation exists and get its details
        const conversation = await this.getConversationForDeletion(input.conversationId);
        // Step 2: Get all messages in the conversation
        const messages = await this.getMessagesForDeletion(input.conversationId);
        // Step 3: Validate deletion is allowed
        this.validateDeletion(conversation, messages, input);
        // Step 4: Perform the deletion
        await this.performDeletion(conversation, messages, input.permanent ?? false, context);
        // Step 5: Update search index
        const searchIndexUpdated = await this.updateSearchIndex(messages, input.permanent ?? false);
        // Step 6: Build response
        return {
            success: true,
            deletedConversation: {
                id: conversation.id,
                title: conversation.title,
                messageCount: messages.length,
                createdAt: conversation.createdAt,
                updatedAt: conversation.updatedAt
            },
            details: {
                permanent: input.permanent ?? false,
                messagesDeleted: messages.length,
                deletedAt,
                searchIndexUpdated
            },
            recovery: input.permanent ? undefined : this.buildRecoveryInfo(conversation, messages)
        };
    }
    /**
     * Get conversation for deletion, ensuring it exists
     */
    async getConversationForDeletion(conversationId) {
        return wrapDatabaseOperation(async () => {
            const conversation = await this.conversationRepo.findById(conversationId);
            if (!conversation) {
                throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
            }
            // Check if already soft-deleted
            if (conversation.metadata?.deleted === true) {
                throw new ValidationError(`Conversation '${conversationId}' is already deleted`);
            }
            return conversation;
        }, 'Failed to retrieve conversation for deletion');
    }
    /**
     * Get all messages in the conversation
     */
    async getMessagesForDeletion(conversationId) {
        return wrapDatabaseOperation(async () => {
            return await this.messageRepo.findByConversationId(conversationId);
        }, 'Failed to retrieve messages for deletion');
    }
    /**
     * Validate that the deletion is allowed
     */
    validateDeletion(conversation, messages, input) {
        // Check for system conversations that shouldn't be deleted
        if (conversation.metadata?.system === true) {
            throw new ValidationError('System conversations cannot be deleted');
        }
        // Check for very large conversations in non-permanent mode
        if (!input.permanent && messages.length > 1000) {
            throw new ValidationError('Conversations with more than 1000 messages require permanent deletion. ' +
                'Use permanent: true if you want to delete this conversation.');
        }
        // Additional business logic validation could go here
    }
    /**
     * Perform the actual deletion
     */
    async performDeletion(conversation, messages, permanent, context) {
        return wrapDatabaseOperation(async () => {
            if (permanent) {
                // Permanent deletion: remove from database
                await this.performPermanentDeletion(conversation, messages, context);
            }
            else {
                // Soft deletion: mark as deleted
                await this.performSoftDeletion(conversation, messages, context);
            }
            return { messagesDeleted: messages.length };
        }, 'Failed to perform deletion');
    }
    /**
     * Perform permanent deletion
     */
    async performPermanentDeletion(conversation, messages, context) {
        // Delete all messages first (foreign key constraints)
        for (const message of messages) {
            await this.messageRepo.delete(message.id);
        }
        // Delete the conversation
        await this.conversationRepo.delete(conversation.id);
        // Log the permanent deletion
        console.info(`Permanently deleted conversation ${conversation.id} with ${messages.length} messages`, {
            conversationId: conversation.id,
            messageCount: messages.length,
            requestId: context.requestId,
            timestamp: context.timestamp
        });
    }
    /**
     * Perform soft deletion
     */
    async performSoftDeletion(conversation, messages, context) {
        const deletionMetadata = {
            deleted: true,
            deletedAt: Date.now(),
            deletedBy: 'delete_conversation_tool',
            requestId: context.requestId,
            originalMetadata: conversation.metadata
        };
        // Mark conversation as deleted
        await this.conversationRepo.update(conversation.id, {
            metadata: deletionMetadata
        });
        // Mark all messages as deleted
        for (const message of messages) {
            await this.messageRepo.update(message.id, {
                metadata: {
                    ...message.metadata,
                    deleted: true,
                    deletedAt: Date.now(),
                    deletedBy: 'delete_conversation_tool',
                    requestId: context.requestId
                }
            });
        }
        // Log the soft deletion
        console.info(`Soft deleted conversation ${conversation.id} with ${messages.length} messages`, {
            conversationId: conversation.id,
            messageCount: messages.length,
            requestId: context.requestId,
            timestamp: context.timestamp
        });
    }
    /**
     * Update search index after deletion
     */
    async updateSearchIndex(messages, permanent) {
        try {
            if (permanent) {
                // Remove messages from search index
                for (const message of messages) {
                    await this.searchEngine.removeMessage(message.id);
                }
            }
            else {
                // For soft deletion, we might want to mark as deleted in search index
                // but keep for potential recovery. This depends on search engine implementation.
                // For now, we'll remove from search but keep in database.
                for (const message of messages) {
                    await this.searchEngine.removeMessage(message.id);
                }
            }
            return true;
        }
        catch (error) {
            // Log the error but don't fail the entire operation
            console.warn('Failed to update search index after deletion:', error);
            return false;
        }
    }
    /**
     * Build recovery information for soft deletes
     */
    buildRecoveryInfo(_conversation, messages) {
        const messageCount = messages.length;
        let difficulty;
        let instructions;
        if (messageCount <= 10) {
            difficulty = 'easy';
            instructions = 'Recovery is straightforward. Contact support with the conversation ID to restore.';
        }
        else if (messageCount <= 100) {
            difficulty = 'moderate';
            instructions = 'Recovery is possible but may take some time due to the number of messages. Contact support with the conversation ID.';
        }
        else {
            difficulty = 'difficult';
            instructions = 'Recovery is complex due to the large number of messages. Contact support immediately if recovery is needed.';
        }
        return {
            instructions,
            difficulty
        };
    }
    /**
     * Static factory method to create a DeleteConversationTool instance
     */
    static create(dependencies) {
        return new DeleteConversationTool(dependencies);
    }
}
//# sourceMappingURL=DeleteConversationTool.js.map