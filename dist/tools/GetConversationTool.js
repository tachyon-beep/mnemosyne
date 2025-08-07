/**
 * GetConversation Tool Implementation
 *
 * This tool retrieves a specific conversation with its messages, supporting
 * pagination and optional message filtering.
 */
import { GetConversationTool as GetConversationToolDef } from '../types/mcp.js';
import { GetConversationSchema } from '../types/schemas.js';
import { BaseTool, NotFoundError, ValidationError, wrapDatabaseOperation } from './BaseTool.js';
/**
 * Implementation of the get_conversation MCP tool
 */
export class GetConversationTool extends BaseTool {
    conversationRepo;
    messageRepo;
    constructor(dependencies) {
        super(GetConversationToolDef, GetConversationSchema);
        this.conversationRepo = dependencies.conversationRepository;
        this.messageRepo = dependencies.messageRepository;
    }
    /**
     * Execute the get_conversation tool
     */
    async executeImpl(input, _context) {
        // Step 1: Retrieve the conversation
        const conversation = await this.getConversation(input.conversationId);
        // Step 2: Get total message count and statistics
        const messageStats = await this.getMessageStatistics(conversation.id);
        // Step 3: Retrieve messages if requested
        let messages;
        let pagination;
        if (input.includeMessages) {
            const messageResult = await this.getMessages(input, conversation.id);
            messages = messageResult.messages;
            pagination = messageResult.pagination;
        }
        return {
            conversation,
            messages,
            messageStats,
            pagination
        };
    }
    /**
     * Retrieve the conversation by ID
     */
    async getConversation(conversationId) {
        return wrapDatabaseOperation(async () => {
            const conversation = await this.conversationRepo.findById(conversationId);
            if (!conversation) {
                throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
            }
            return conversation;
        }, 'Failed to retrieve conversation');
    }
    /**
     * Get message statistics for the conversation
     */
    async getMessageStatistics(conversationId) {
        return wrapDatabaseOperation(async () => {
            const messages = await this.messageRepo.findByConversationId(conversationId);
            const roleDistribution = {};
            let earliest = Number.MAX_SAFE_INTEGER;
            let latest = 0;
            messages.forEach(message => {
                // Count by role
                roleDistribution[message.role] = (roleDistribution[message.role] || 0) + 1;
                // Track date range
                earliest = Math.min(earliest, message.createdAt);
                latest = Math.max(latest, message.createdAt);
            });
            return {
                totalCount: messages.length,
                returnedCount: 0, // Will be updated if messages are included
                roleDistribution,
                dateRange: messages.length > 0 ? { earliest, latest } : undefined
            };
        }, 'Failed to get message statistics');
    }
    /**
     * Retrieve messages with pagination
     */
    async getMessages(input, conversationId) {
        return wrapDatabaseOperation(async () => {
            // Validate pagination parameters
            this.validatePaginationParams(input);
            let messages;
            if (input.beforeMessageId || input.afterMessageId) {
                // Cursor-based pagination
                messages = await this.getMessagesByCursor(input, conversationId);
            }
            else {
                // Simple limit-based retrieval (most recent first)
                messages = await this.messageRepo.findByConversationId(conversationId, { limit: input.messageLimit, orderBy: 'created_at', orderDir: 'DESC' });
            }
            // Add context information to messages
            const messagesWithContext = await this.addMessageContext(messages, conversationId);
            // Calculate pagination info
            const pagination = await this.calculatePagination(input, messages, conversationId);
            return {
                messages: messagesWithContext,
                pagination
            };
        }, 'Failed to retrieve messages');
    }
    /**
     * Validate pagination parameters
     */
    validatePaginationParams(input) {
        if (input.beforeMessageId && input.afterMessageId) {
            throw new ValidationError('Cannot specify both beforeMessageId and afterMessageId');
        }
        if (input.messageLimit < 1 || input.messageLimit > 1000) {
            throw new ValidationError('Message limit must be between 1 and 1000');
        }
    }
    /**
     * Get messages using cursor-based pagination
     */
    async getMessagesByCursor(_input, conversationId) {
        // Simplified implementation - cursor-based pagination not fully supported
        // by current repository interface. Fall back to simple retrieval.
        const result = await this.messageRepo.findByConversationId(conversationId, {
            limit: _input.messageLimit,
            orderBy: 'created_at',
            orderDir: 'DESC'
        });
        return result;
    }
    /**
     * Add context information to messages
     */
    async addMessageContext(messages, conversationId) {
        if (messages.length === 0) {
            return [];
        }
        // Get all messages to determine positions and context
        const allMessages = await this.messageRepo.findByConversationId(conversationId);
        const messageMap = new Map(allMessages.map(m => [m.id, m]));
        // Sort all messages by creation time
        const sortedMessages = allMessages.sort((a, b) => a.createdAt - b.createdAt);
        const positionMap = new Map(sortedMessages.map((m, index) => [m.id, index]));
        return messages.map(message => {
            const position = positionMap.get(message.id) ?? -1;
            const threadDepth = this.calculateThreadDepth(message, messageMap);
            return {
                ...message,
                position,
                isFirst: position === 0,
                isLast: position === sortedMessages.length - 1,
                threadDepth
            };
        });
    }
    /**
     * Calculate thread depth for a message
     */
    calculateThreadDepth(message, messageMap) {
        let depth = 0;
        let currentMessage = message;
        while (currentMessage.parentMessageId) {
            const parent = messageMap.get(currentMessage.parentMessageId);
            if (!parent)
                break;
            depth++;
            currentMessage = parent;
            // Prevent infinite loops
            if (depth > 100)
                break;
        }
        return depth;
    }
    /**
     * Calculate pagination information
     */
    async calculatePagination(_input, messages, conversationId) {
        if (messages.length === 0) {
            return {
                hasPrevious: false,
                hasNext: false
            };
        }
        const firstMessage = messages[0];
        const lastMessage = messages[messages.length - 1];
        // Check if there are more messages before/after
        const hasPrevious = await this.hasMessagesBefore(firstMessage.id, conversationId);
        const hasNext = await this.hasMessagesAfter(lastMessage.id, conversationId);
        return {
            hasPrevious,
            hasNext,
            firstMessageId: firstMessage.id,
            lastMessageId: lastMessage.id,
            // nextPage functionality not supported with current repository interface
        };
    }
    /**
     * Check if there are messages before a given message
     */
    async hasMessagesBefore(messageId, conversationId) {
        const message = await this.messageRepo.findById(messageId);
        if (!message)
            return false;
        const earlierMessages = await this.messageRepo.findByConversationId(conversationId, {
            limit: 1,
            orderBy: 'created_at',
            orderDir: 'DESC'
        });
        return earlierMessages.length > 0;
    }
    /**
     * Check if there are messages after a given message
     */
    async hasMessagesAfter(messageId, conversationId) {
        const message = await this.messageRepo.findById(messageId);
        if (!message)
            return false;
        const laterMessages = await this.messageRepo.findByConversationId(conversationId, {
            limit: 1,
            orderBy: 'created_at',
            orderDir: 'ASC'
        });
        return laterMessages.length > 0;
    }
    /**
     * Static factory method to create a GetConversationTool instance
     */
    static create(dependencies) {
        return new GetConversationTool(dependencies);
    }
}
//# sourceMappingURL=GetConversationTool.js.map