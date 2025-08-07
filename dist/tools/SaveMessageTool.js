/**
 * SaveMessage Tool Implementation
 *
 * This tool saves a message to conversation history. If no conversation ID is provided,
 * it creates a new conversation. It also updates the full-text search index.
 */
import { SaveMessageTool as SaveMessageToolDef } from '../types/mcp.js';
import { SaveMessageSchema } from '../types/schemas.js';
import { BaseTool, NotFoundError, ValidationError, wrapDatabaseOperation } from './BaseTool.js';
/**
 * Implementation of the save_message MCP tool
 */
export class SaveMessageTool extends BaseTool {
    conversationRepo;
    messageRepo;
    searchEngine;
    constructor(dependencies) {
        super(SaveMessageToolDef, SaveMessageSchema);
        this.conversationRepo = dependencies.conversationRepository;
        this.messageRepo = dependencies.messageRepository;
        this.searchEngine = dependencies.searchEngine;
    }
    /**
     * Execute the save_message tool
     */
    async executeImpl(input, context) {
        let conversation;
        let conversationCreated = false;
        // Step 1: Get or create conversation
        if (input.conversationId) {
            // Use existing conversation
            conversation = await this.getExistingConversation(input.conversationId);
        }
        else {
            // Create new conversation
            conversation = await this.createNewConversation(input, context);
            conversationCreated = true;
        }
        // Step 2: Validate parent message if specified
        if (input.parentMessageId) {
            await this.validateParentMessage(input.parentMessageId, conversation.id);
        }
        // Step 3: Create the message
        const message = await this.createMessage(input, conversation.id, context);
        // Step 4: Update conversation metadata
        await this.updateConversationTimestamp(conversation.id);
        // Step 5: Update search index
        await this.updateSearchIndex(message);
        // Return the final conversation (with updated timestamp)
        const updatedConversation = await this.conversationRepo.findById(conversation.id);
        if (!updatedConversation) {
            throw new Error('Failed to retrieve updated conversation');
        }
        return {
            conversation: updatedConversation,
            message,
            conversationCreated
        };
    }
    /**
     * Get an existing conversation by ID
     */
    async getExistingConversation(conversationId) {
        return wrapDatabaseOperation(async () => {
            const conversation = await this.conversationRepo.findById(conversationId);
            if (!conversation) {
                throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
            }
            return conversation;
        }, 'Failed to retrieve conversation');
    }
    /**
     * Create a new conversation
     */
    async createNewConversation(input, context) {
        return wrapDatabaseOperation(async () => {
            // Generate a title based on the message content
            const title = this.generateConversationTitle(input.content);
            const conversationParams = {
                title,
                metadata: {
                    createdBy: 'save_message_tool',
                    requestId: context.requestId,
                    initialRole: input.role,
                    ...input.metadata
                }
            };
            return await this.conversationRepo.create(conversationParams);
        }, 'Failed to create new conversation');
    }
    /**
     * Validate that the parent message exists and belongs to the conversation
     */
    async validateParentMessage(parentMessageId, conversationId) {
        return wrapDatabaseOperation(async () => {
            const parentMessage = await this.messageRepo.findById(parentMessageId);
            if (!parentMessage) {
                throw new NotFoundError(`Parent message with ID '${parentMessageId}' not found`);
            }
            if (parentMessage.conversationId !== conversationId) {
                throw new ValidationError(`Parent message '${parentMessageId}' does not belong to conversation '${conversationId}'`);
            }
        }, 'Failed to validate parent message');
    }
    /**
     * Create a new message
     */
    async createMessage(input, conversationId, context) {
        return wrapDatabaseOperation(async () => {
            const messageParams = {
                conversationId,
                role: input.role,
                content: input.content,
                parentMessageId: input.parentMessageId,
                metadata: {
                    createdBy: 'save_message_tool',
                    requestId: context.requestId,
                    ...input.metadata
                }
            };
            return await this.messageRepo.create(messageParams);
        }, 'Failed to create message');
    }
    /**
     * Update the conversation's updatedAt timestamp
     */
    async updateConversationTimestamp(conversationId) {
        return wrapDatabaseOperation(async () => {
            await this.conversationRepo.updateTimestamp(conversationId);
        }, 'Failed to update conversation timestamp');
    }
    /**
     * Update the search index with the new message
     */
    async updateSearchIndex(message) {
        try {
            await this.searchEngine.indexMessage(message);
        }
        catch (error) {
            // Log the error but don't fail the entire operation
            // Search indexing failures shouldn't prevent message saving
            console.warn(`Failed to update search index for message ${message.id}:`, error);
        }
    }
    /**
     * Generate a conversation title from the message content
     */
    generateConversationTitle(content) {
        // Clean the content and take the first meaningful words
        const cleaned = content
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
        // Take the first 50 characters or up to the first sentence
        const firstSentence = cleaned.split(/[.!?]/)[0];
        const title = firstSentence.length > 50
            ? firstSentence.substring(0, 47) + '...'
            : firstSentence;
        return title || 'New Conversation';
    }
    /**
     * Static factory method to create a SaveMessageTool instance
     */
    static create(dependencies) {
        return new SaveMessageTool(dependencies);
    }
}
//# sourceMappingURL=SaveMessageTool.js.map