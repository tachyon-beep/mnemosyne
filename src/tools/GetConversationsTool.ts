/**
 * GetConversations Tool Implementation
 * 
 * This tool lists conversations with optional filtering and pagination,
 * providing metadata and optional message counts.
 */

import { GetConversationsTool as GetConversationsToolDef } from '../types/mcp';
import { GetConversationsSchema, GetConversationsInput } from '../types/schemas';
import { BaseTool, ToolContext, ValidationError, wrapDatabaseOperation } from './BaseTool';
import { ConversationRepository, MessageRepository } from '../storage/repositories';
import { Conversation } from '../types/interfaces';

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
    preview: string; // First 100 characters of content
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
export class GetConversationsTool extends BaseTool<GetConversationsInput, GetConversationsResponse> {
  private readonly conversationRepo: ConversationRepository;
  private readonly messageRepo: MessageRepository;

  constructor(dependencies: GetConversationsDependencies) {
    super(GetConversationsToolDef, GetConversationsSchema);
    this.conversationRepo = dependencies.conversationRepository;
    this.messageRepo = dependencies.messageRepository;
  }

  /**
   * Execute the get_conversations tool
   */
  protected async executeImpl(input: GetConversationsInput, _context: ToolContext): Promise<GetConversationsResponse> {
    // Step 1: Validate input parameters
    this.validateInputParameters(input);

    // Step 2: Build query filters
    const filters = this.buildQueryFilters(input);

    // Step 3: Get conversations with pagination
    const conversationResult = await this.getConversations(filters, input);

    // Step 4: Enhance conversations with metadata if requested
    const enhancedConversations = await this.enhanceConversations(
      conversationResult.conversations,
      input.includeMessageCounts ?? false
    );

    // Step 5: Calculate summary statistics
    const summary = await this.calculateSummaryStatistics(
      enhancedConversations,
      input.includeMessageCounts ?? false
    );

    // Step 6: Build pagination information
    const pagination = this.buildPaginationInfo(input, conversationResult.hasMore);

    return {
      conversations: enhancedConversations,
      totalCount: conversationResult.totalCount,
      hasMore: conversationResult.hasMore,
      summary,
      pagination
    };
  }

  /**
   * Validate input parameters
   */
  private validateInputParameters(input: GetConversationsInput): void {
    // Validate date range
    if (input.startDate && input.endDate) {
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      
      if (start > end) {
        throw new ValidationError('Start date must be before end date');
      }
    }

    // Validate pagination parameters
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;
    
    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new ValidationError('Offset must be non-negative');
    }

    if (offset > 10000) {
      throw new ValidationError('Offset cannot exceed 10,000 for performance reasons');
    }
  }

  /**
   * Build query filters from input
   */
  private buildQueryFilters(input: GetConversationsInput): {
    startDate?: number;
    endDate?: number;
    limit: number;
    offset: number;
  } {
    return {
      startDate: input.startDate ? new Date(input.startDate).getTime() : undefined,
      endDate: input.endDate ? new Date(input.endDate).getTime() : undefined,
      limit: input.limit ?? 20,
      offset: input.offset ?? 0
    };
  }

  /**
   * Get conversations with pagination
   */
  private async getConversations(
    _filters: any,
    input: GetConversationsInput
  ): Promise<{
    conversations: Conversation[];
    totalCount: number;
    hasMore: boolean;
  }> {
    return wrapDatabaseOperation(async () => {
      // Get conversations with filters
      const limit = input.limit ?? 20;
      const offset = input.offset ?? 0;
      
      let conversationResult: any;
      
      if (_filters.startDate || _filters.endDate) {
        // Use date range filtering if dates are provided
        conversationResult = await this.conversationRepo.findByDateRange(
          _filters.startDate || 0,
          _filters.endDate || Date.now(),
          limit + 1, // Get one extra to check if there are more
          offset
        );
      } else {
        // Use default findAll for no date filtering
        conversationResult = await this.conversationRepo.findAll(
          limit + 1, // Get one extra to check if there are more
          offset,
          'updated_at',
          'DESC'
        );
      }

      // Check if there are more results
      const hasMore = conversationResult.data.length > limit;
      const actualConversations = hasMore ? conversationResult.data.slice(0, limit) : conversationResult.data;

      // Get total count from the paginated result
      const totalCount = conversationResult.totalCount || conversationResult.data.length;

      return {
        conversations: actualConversations,
        totalCount,
        hasMore
      };
    }, 'Failed to retrieve conversations');
  }

  /**
   * Enhance conversations with additional metadata
   */
  private async enhanceConversations(
    conversations: Conversation[],
    includeMessageCounts: boolean
  ): Promise<ConversationWithMetadata[]> {
    if (conversations.length === 0) {
      return [];
    }

    return Promise.all(
      conversations.map(async (conversation) => {
        const enhanced: ConversationWithMetadata = { ...conversation };

        if (includeMessageCounts) {
          // Get message statistics for this conversation
          const messages = await wrapDatabaseOperation(
            () => this.messageRepo.findByConversationId(conversation.id),
            'Failed to get message counts for conversation'
          );
          
          enhanced.messageCount = messages.length;
          enhanced.roleDistribution = this.calculateRoleDistribution(messages);

          if (messages.length > 0) {
            // Sort messages by creation time
            const sortedMessages = messages.sort((a, b) => a.createdAt - b.createdAt);
            const firstMessage = sortedMessages[0];
            const latestMessage = sortedMessages[sortedMessages.length - 1];

            enhanced.firstMessage = {
              id: firstMessage.id,
              role: firstMessage.role,
              preview: this.createPreview(firstMessage.content),
              createdAt: firstMessage.createdAt
            };

            enhanced.latestMessage = {
              id: latestMessage.id,
              role: latestMessage.role,
              preview: this.createPreview(latestMessage.content),
              createdAt: latestMessage.createdAt
            };

            enhanced.duration = latestMessage.createdAt - firstMessage.createdAt;
          }
        }

        return enhanced;
      })
    );
  }

  /**
   * Calculate role distribution for messages
   */
  private calculateRoleDistribution(messages: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    messages.forEach(message => {
      distribution[message.role] = (distribution[message.role] || 0) + 1;
    });

    return distribution;
  }

  /**
   * Create a preview of message content
   */
  private createPreview(content: string): string {
    const cleaned = content.replace(/\s+/g, ' ').trim();
    return cleaned.length > 100 ? cleaned.substring(0, 97) + '...' : cleaned;
  }

  /**
   * Calculate summary statistics
   */
  private async calculateSummaryStatistics(
    conversations: ConversationWithMetadata[],
    includeMessageCounts: boolean
  ): Promise<GetConversationsResponse['summary']> {
    const summary: GetConversationsResponse['summary'] = {};

    if (conversations.length === 0) {
      return summary;
    }

    // Calculate date range
    const createdAts = conversations.map(c => c.createdAt);
    summary.dateRange = {
      earliest: Math.min(...createdAts),
      latest: Math.max(...createdAts)
    };

    // Calculate message statistics if available
    if (includeMessageCounts) {
      const messageCounts = conversations
        .map(c => c.messageCount || 0)
        .filter(count => count > 0);

      if (messageCounts.length > 0) {
        summary.totalMessages = messageCounts.reduce((sum, count) => sum + count, 0);
        summary.averageMessagesPerConversation = summary.totalMessages / messageCounts.length;
      }
    }

    // Calculate time distribution
    summary.timeDistribution = this.calculateTimeDistribution(conversations);

    return summary;
  }

  /**
   * Calculate time distribution of conversations
   */
  private calculateTimeDistribution(conversations: ConversationWithMetadata[]): {
    thisWeek: number;
    thisMonth: number;
    older: number;
  } {
    const now = Date.now();
    const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);

    let thisWeek = 0;
    let thisMonth = 0;
    let older = 0;

    conversations.forEach(conversation => {
      if (conversation.createdAt >= oneWeekAgo) {
        thisWeek++;
      } else if (conversation.createdAt >= oneMonthAgo) {
        thisMonth++;
      } else {
        older++;
      }
    });

    return { thisWeek, thisMonth, older };
  }

  /**
   * Build pagination information
   */
  private buildPaginationInfo(
    input: GetConversationsInput,
    hasMore: boolean
  ): GetConversationsResponse['pagination'] {
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 20;
    
    return {
      offset,
      limit,
      nextOffset: hasMore ? offset + limit : undefined,
      previousOffset: offset > 0 ? Math.max(0, offset - limit) : undefined
    };
  }


  /**
   * Static factory method to create a GetConversationsTool instance
   */
  static create(dependencies: GetConversationsDependencies): GetConversationsTool {
    return new GetConversationsTool(dependencies);
  }
}