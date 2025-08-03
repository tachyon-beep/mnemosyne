/**
 * SaveMessage Tool Implementation
 * 
 * This tool saves a message to conversation history. If no conversation ID is provided,
 * it creates a new conversation. It also updates the full-text search index.
 */

import { SaveMessageTool as SaveMessageToolDef } from '../types/mcp';
import { SaveMessageSchema, SaveMessageInput } from '../types/schemas';
import { BaseTool, ToolContext, NotFoundError, ValidationError, wrapDatabaseOperation } from './BaseTool';
import { ConversationRepository, MessageRepository } from '../storage/repositories';
import { Conversation, Message } from '../types/interfaces';
import { SearchEngine } from '../search/SearchEngine';

/**
 * Response interface for save_message tool
 */
export interface SaveMessageResponse {
  /** The created or existing conversation */
  conversation: Conversation;
  /** The saved message */
  message: Message;
  /** Whether a new conversation was created */
  conversationCreated: boolean;
}

/**
 * Dependencies required by SaveMessageTool
 */
export interface SaveMessageDependencies {
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  searchEngine: SearchEngine;
}

/**
 * Implementation of the save_message MCP tool
 */
export class SaveMessageTool extends BaseTool<SaveMessageInput, SaveMessageResponse> {
  private readonly conversationRepo: ConversationRepository;
  private readonly messageRepo: MessageRepository;
  private readonly searchEngine: SearchEngine;

  constructor(dependencies: SaveMessageDependencies) {
    super(SaveMessageToolDef, SaveMessageSchema);
    this.conversationRepo = dependencies.conversationRepository;
    this.messageRepo = dependencies.messageRepository;
    this.searchEngine = dependencies.searchEngine;
  }

  /**
   * Execute the save_message tool
   */
  protected async executeImpl(input: SaveMessageInput, context: ToolContext): Promise<SaveMessageResponse> {
    let conversation: Conversation;
    let conversationCreated = false;

    // Step 1: Get or create conversation
    if (input.conversationId) {
      // Use existing conversation
      conversation = await this.getExistingConversation(input.conversationId);
    } else {
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
  private async getExistingConversation(conversationId: string): Promise<Conversation> {
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
  private async createNewConversation(input: SaveMessageInput, context: ToolContext): Promise<Conversation> {
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
  private async validateParentMessage(parentMessageId: string, conversationId: string): Promise<void> {
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
  private async createMessage(input: SaveMessageInput, conversationId: string, context: ToolContext): Promise<Message> {
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
  private async updateConversationTimestamp(conversationId: string): Promise<void> {
    return wrapDatabaseOperation(async () => {
      await this.conversationRepo.updateTimestamp(conversationId);
    }, 'Failed to update conversation timestamp');
  }

  /**
   * Update the search index with the new message
   */
  private async updateSearchIndex(message: Message): Promise<void> {
    try {
      await this.searchEngine.indexMessage(message);
    } catch (error) {
      // Log the error but don't fail the entire operation
      // Search indexing failures shouldn't prevent message saving
      console.warn(`Failed to update search index for message ${message.id}:`, error);
    }
  }

  /**
   * Generate a conversation title from the message content
   */
  private generateConversationTitle(content: string): string {
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
  static create(dependencies: SaveMessageDependencies): SaveMessageTool {
    return new SaveMessageTool(dependencies);
  }
}