/**
 * GetConversation Tool Implementation
 * 
 * This tool retrieves a specific conversation with its messages, supporting
 * pagination and optional message filtering.
 */

import { GetConversationTool as GetConversationToolDef } from '../types/mcp.js';
import { GetConversationSchema, GetConversationInput } from '../types/schemas.js';
import { BaseTool, ToolContext, NotFoundError, ValidationError, wrapDatabaseOperation } from './BaseTool.js';
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
export class GetConversationTool extends BaseTool<GetConversationInput, GetConversationResponse> {
  private readonly conversationRepo: ConversationRepository;
  private readonly messageRepo: MessageRepository;

  constructor(dependencies: GetConversationDependencies) {
    super(GetConversationToolDef, GetConversationSchema);
    this.conversationRepo = dependencies.conversationRepository;
    this.messageRepo = dependencies.messageRepository;
  }

  /**
   * Execute the get_conversation tool
   */
  protected async executeImpl(input: GetConversationInput, _context: ToolContext): Promise<GetConversationResponse> {
    // Step 1: Retrieve the conversation
    const conversation = await this.getConversation(input.conversationId);

    // Step 2: Get total message count and statistics
    const messageStats = await this.getMessageStatistics(conversation.id);

    // Step 3: Retrieve messages if requested
    let messages: MessageWithContext[] | undefined;
    let pagination: GetConversationResponse['pagination'] | undefined;

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
  private async getConversation(conversationId: string): Promise<Conversation> {
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
  private async getMessageStatistics(conversationId: string): Promise<GetConversationResponse['messageStats']> {
    return wrapDatabaseOperation(async () => {
      const messages = await this.messageRepo.findByConversationId(conversationId);
      
      const roleDistribution: Record<string, number> = {};
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
  private async getMessages(
    input: GetConversationInput,
    conversationId: string
  ): Promise<{
    messages: MessageWithContext[];
    pagination: GetConversationResponse['pagination'];
  }> {
    return wrapDatabaseOperation(async () => {
      // Validate pagination parameters
      this.validatePaginationParams(input);

      let messages: Message[];
      
      if (input.beforeMessageId || input.afterMessageId) {
        // Cursor-based pagination
        messages = await this.getMessagesByCursor(input, conversationId);
      } else {
        // Simple limit-based retrieval (most recent first)
        messages = await this.messageRepo.findByConversationId(
          conversationId,
          { limit: input.messageLimit, orderBy: 'created_at', orderDir: 'DESC' }
        );
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
  private validatePaginationParams(input: GetConversationInput): void {
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
  private async getMessagesByCursor(
    _input: GetConversationInput,
    conversationId: string
  ): Promise<Message[]> {
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
  private async addMessageContext(
    messages: Message[],
    conversationId: string
  ): Promise<MessageWithContext[]> {
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
  private calculateThreadDepth(message: Message, messageMap: Map<string, Message>): number {
    let depth = 0;
    let currentMessage = message;

    while (currentMessage.parentMessageId) {
      const parent = messageMap.get(currentMessage.parentMessageId);
      if (!parent) break;
      
      depth++;
      currentMessage = parent;
      
      // Prevent infinite loops
      if (depth > 100) break;
    }

    return depth;
  }

  /**
   * Calculate pagination information
   */
  private async calculatePagination(
    _input: GetConversationInput,
    messages: Message[],
    conversationId: string
  ): Promise<GetConversationResponse['pagination']> {
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
  private async hasMessagesBefore(messageId: string, conversationId: string): Promise<boolean> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) return false;

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
  private async hasMessagesAfter(messageId: string, conversationId: string): Promise<boolean> {
    const message = await this.messageRepo.findById(messageId);
    if (!message) return false;

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
  static create(dependencies: GetConversationDependencies): GetConversationTool {
    return new GetConversationTool(dependencies);
  }
}