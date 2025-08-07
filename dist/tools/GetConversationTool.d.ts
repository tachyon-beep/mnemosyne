/**
 * GetConversation Tool Implementation
 *
 * This tool retrieves a specific conversation with its messages, supporting
 * pagination and optional message filtering.
 */
import { GetConversationInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { Conversation, Message } from '../types/interfaces.js';
/**
 * Message with pagination context
 */
export interface MessageWithContext extends Message {
    /** Position of this message in the conversation */
    position: number;
    /** Whether this is the first message in the conversation */
    isFirst: boolean;
    /** Whether this is the last message in the conversation */
    isLast: boolean;
    /** Thread depth (0 for top-level messages) */
    threadDepth?: number;
}
/**
 * Response interface for get_conversation tool
 */
export interface GetConversationResponse {
    /** The conversation metadata */
    conversation: Conversation;
    /** Messages in the conversation (if requested) */
    messages?: MessageWithContext[];
    /** Message statistics */
    messageStats: {
        /** Total number of messages in the conversation */
        totalCount: number;
        /** Number of messages returned in this response */
        returnedCount: number;
        /** Count by role */
        roleDistribution: Record<string, number>;
        /** Date range of messages */
        dateRange?: {
            earliest: number;
            latest: number;
        };
    };
    /** Pagination information */
    pagination?: {
        /** Whether there are more messages before the current set */
        hasPrevious: boolean;
        /** Whether there are more messages after the current set */
        hasNext: boolean;
        /** ID of the first message in this page */
        firstMessageId?: string;
        /** ID of the last message in this page */
        lastMessageId?: string;
        /** Suggested next page parameters */
        nextPage?: {
            beforeMessageId?: string;
            afterMessageId?: string;
        };
    };
}
/**
 * Dependencies required by GetConversationTool
 */
export interface GetConversationDependencies {
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
}
/**
 * Implementation of the get_conversation MCP tool
 */
export declare class GetConversationTool extends BaseTool<GetConversationInput, GetConversationResponse> {
    private readonly conversationRepo;
    private readonly messageRepo;
    constructor(dependencies: GetConversationDependencies);
    /**
     * Execute the get_conversation tool
     */
    protected executeImpl(input: GetConversationInput, _context: ToolContext): Promise<GetConversationResponse>;
    /**
     * Retrieve the conversation by ID
     */
    private getConversation;
    /**
     * Get message statistics for the conversation
     */
    private getMessageStatistics;
    /**
     * Retrieve messages with pagination
     */
    private getMessages;
    /**
     * Validate pagination parameters
     */
    private validatePaginationParams;
    /**
     * Get messages using cursor-based pagination
     */
    private getMessagesByCursor;
    /**
     * Add context information to messages
     */
    private addMessageContext;
    /**
     * Calculate thread depth for a message
     */
    private calculateThreadDepth;
    /**
     * Calculate pagination information
     */
    private calculatePagination;
    /**
     * Check if there are messages before a given message
     */
    private hasMessagesBefore;
    /**
     * Check if there are messages after a given message
     */
    private hasMessagesAfter;
    /**
     * Static factory method to create a GetConversationTool instance
     */
    static create(dependencies: GetConversationDependencies): GetConversationTool;
}
//# sourceMappingURL=GetConversationTool.d.ts.map