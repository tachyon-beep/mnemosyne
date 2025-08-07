/**
 * GetConversations Tool Implementation
 *
 * This tool lists conversations with optional filtering and pagination,
 * providing metadata and optional message counts.
 */
import { GetConversationsInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { Conversation } from '../types/interfaces.js';
/**
 * Enhanced conversation with additional metadata
 */
export interface ConversationWithMetadata extends Conversation {
    /** Number of messages in the conversation (if requested) */
    messageCount?: number;
    /** Information about the latest message */
    latestMessage?: {
        id: string;
        role: string;
        preview: string;
        createdAt: number;
    };
    /** Information about the first message */
    firstMessage?: {
        id: string;
        role: string;
        preview: string;
        createdAt: number;
    };
    /** Message role distribution */
    roleDistribution?: Record<string, number>;
    /** Conversation duration in milliseconds */
    duration?: number;
}
/**
 * Response interface for get_conversations tool
 */
export interface GetConversationsResponse {
    /** Array of conversations with optional metadata */
    conversations: ConversationWithMetadata[];
    /** Total number of conversations matching the criteria */
    totalCount: number;
    /** Whether there are more conversations available */
    hasMore: boolean;
    /** Summary statistics */
    summary: {
        /** Date range of conversations */
        dateRange?: {
            earliest: number;
            latest: number;
        };
        /** Total messages across all returned conversations */
        totalMessages?: number;
        /** Average messages per conversation */
        averageMessagesPerConversation?: number;
        /** Distribution of conversations by creation time */
        timeDistribution?: {
            thisWeek: number;
            thisMonth: number;
            older: number;
        };
    };
    /** Pagination information */
    pagination: {
        /** Current offset */
        offset: number;
        /** Requested limit */
        limit: number;
        /** Next page offset (if hasMore is true) */
        nextOffset?: number;
        /** Previous page offset (if offset > 0) */
        previousOffset?: number;
    };
}
/**
 * Dependencies required by GetConversationsTool
 */
export interface GetConversationsDependencies {
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
}
/**
 * Implementation of the get_conversations MCP tool
 */
export declare class GetConversationsTool extends BaseTool<GetConversationsInput, GetConversationsResponse> {
    private readonly conversationRepo;
    private readonly messageRepo;
    constructor(dependencies: GetConversationsDependencies);
    /**
     * Execute the get_conversations tool
     */
    protected executeImpl(input: GetConversationsInput, _context: ToolContext): Promise<GetConversationsResponse>;
    /**
     * Validate input parameters
     */
    private validateInputParameters;
    /**
     * Build query filters from input
     */
    private buildQueryFilters;
    /**
     * Get conversations with pagination
     */
    private getConversations;
    /**
     * Enhance conversations with additional metadata
     */
    private enhanceConversations;
    /**
     * Calculate role distribution for messages
     */
    private calculateRoleDistribution;
    /**
     * Create a preview of message content
     */
    private createPreview;
    /**
     * Calculate summary statistics
     */
    private calculateSummaryStatistics;
    /**
     * Calculate time distribution of conversations
     */
    private calculateTimeDistribution;
    /**
     * Build pagination information
     */
    private buildPaginationInfo;
    /**
     * Static factory method to create a GetConversationsTool instance
     */
    static create(dependencies: GetConversationsDependencies): GetConversationsTool;
}
//# sourceMappingURL=GetConversationsTool.d.ts.map