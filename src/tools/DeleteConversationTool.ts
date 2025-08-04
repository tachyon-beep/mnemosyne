/**
 * DeleteConversation Tool Implementation
 * 
 * This tool deletes a conversation and all its messages. It supports both
 * soft deletion (marking as deleted) and permanent deletion.
 */

import { DeleteConversationTool as DeleteConversationToolDef } from '../types/mcp.js';
import { DeleteConversationSchema, DeleteConversationInput } from '../types/schemas.js';
import { BaseTool, ToolContext, NotFoundError, ValidationError, wrapDatabaseOperation } from './BaseTool.js';
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { Conversation, Message } from '../types/interfaces.js';

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
export class DeleteConversationTool extends BaseTool<DeleteConversationInput, DeleteConversationResponse> {
  private readonly conversationRepo: ConversationRepository;
  private readonly messageRepo: MessageRepository;
  private readonly searchEngine: SearchEngine;

  constructor(dependencies: DeleteConversationDependencies) {
    super(DeleteConversationToolDef, DeleteConversationSchema);
    this.conversationRepo = dependencies.conversationRepository;
    this.messageRepo = dependencies.messageRepository;
    this.searchEngine = dependencies.searchEngine;
  }

  /**
   * Execute the delete_conversation tool
   */
  protected async executeImpl(input: DeleteConversationInput, context: ToolContext): Promise<DeleteConversationResponse> {
    const deletedAt = Date.now();

    // Step 1: Verify the conversation exists and get its details
    const conversation = await this.getConversationForDeletion(input.conversationId);

    // Step 2: Get all messages in the conversation
    const messages = await this.getMessagesForDeletion(input.conversationId);

    // Step 3: Validate deletion is allowed
    this.validateDeletion(conversation, messages, input);

    // Step 4: Perform the deletion
    await this.performDeletion(
      conversation,
      messages,
      input.permanent ?? false,
      context
    );

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
  private async getConversationForDeletion(conversationId: string): Promise<Conversation> {
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
  private async getMessagesForDeletion(conversationId: string): Promise<Message[]> {
    return wrapDatabaseOperation(async () => {
      return await this.messageRepo.findByConversationId(conversationId);
    }, 'Failed to retrieve messages for deletion');
  }

  /**
   * Validate that the deletion is allowed
   */
  private validateDeletion(conversation: Conversation, messages: Message[], input: DeleteConversationInput): void {
    // Check for system conversations that shouldn't be deleted
    if (conversation.metadata?.system === true) {
      throw new ValidationError('System conversations cannot be deleted');
    }

    // Check for very large conversations in non-permanent mode
    if (!input.permanent && messages.length > 1000) {
      throw new ValidationError(
        'Conversations with more than 1000 messages require permanent deletion. ' +
        'Use permanent: true if you want to delete this conversation.'
      );
    }

    // Additional business logic validation could go here
  }

  /**
   * Perform the actual deletion
   */
  private async performDeletion(
    conversation: Conversation,
    messages: Message[],
    permanent: boolean,
    context: ToolContext
  ): Promise<{ messagesDeleted: number }> {
    return wrapDatabaseOperation(async () => {
      if (permanent) {
        // Permanent deletion: remove from database
        await this.performPermanentDeletion(conversation, messages, context);
      } else {
        // Soft deletion: mark as deleted
        await this.performSoftDeletion(conversation, messages, context);
      }

      return { messagesDeleted: messages.length };
    }, 'Failed to perform deletion');
  }

  /**
   * Perform permanent deletion
   */
  private async performPermanentDeletion(
    conversation: Conversation,
    messages: Message[],
    context: ToolContext
  ): Promise<void> {
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
  private async performSoftDeletion(
    conversation: Conversation,
    messages: Message[],
    context: ToolContext
  ): Promise<void> {
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
  private async updateSearchIndex(messages: Message[], permanent: boolean): Promise<boolean> {
    try {
      if (permanent) {
        // Remove messages from search index
        for (const message of messages) {
          await this.searchEngine.removeMessage(message.id);
        }
      } else {
        // For soft deletion, we might want to mark as deleted in search index
        // but keep for potential recovery. This depends on search engine implementation.
        // For now, we'll remove from search but keep in database.
        for (const message of messages) {
          await this.searchEngine.removeMessage(message.id);
        }
      }
      return true;
    } catch (error) {
      // Log the error but don't fail the entire operation
      console.warn('Failed to update search index after deletion:', error);
      return false;
    }
  }

  /**
   * Build recovery information for soft deletes
   */
  private buildRecoveryInfo(_conversation: Conversation, messages: Message[]): DeleteConversationResponse['recovery'] {
    const messageCount = messages.length;
    let difficulty: 'easy' | 'moderate' | 'difficult';
    let instructions: string;

    if (messageCount <= 10) {
      difficulty = 'easy';
      instructions = 'Recovery is straightforward. Contact support with the conversation ID to restore.';
    } else if (messageCount <= 100) {
      difficulty = 'moderate';
      instructions = 'Recovery is possible but may take some time due to the number of messages. Contact support with the conversation ID.';
    } else {
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
  static create(dependencies: DeleteConversationDependencies): DeleteConversationTool {
    return new DeleteConversationTool(dependencies);
  }
}