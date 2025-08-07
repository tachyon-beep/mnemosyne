/**
 * SaveMessage Tool Implementation
 *
 * This tool saves a message to conversation history. If no conversation ID is provided,
 * it creates a new conversation. It also updates the full-text search index.
 */
import { SaveMessageInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { Conversation, Message } from '../types/interfaces.js';
import { SearchEngine } from '../search/SearchEngine.js';
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
export declare class SaveMessageTool extends BaseTool<SaveMessageInput, SaveMessageResponse> {
    private readonly conversationRepo;
    private readonly messageRepo;
    private readonly searchEngine;
    constructor(dependencies: SaveMessageDependencies);
    /**
     * Execute the save_message tool
     */
    protected executeImpl(input: SaveMessageInput, context: ToolContext): Promise<SaveMessageResponse>;
    /**
     * Get an existing conversation by ID
     */
    private getExistingConversation;
    /**
     * Create a new conversation
     */
    private createNewConversation;
    /**
     * Validate that the parent message exists and belongs to the conversation
     */
    private validateParentMessage;
    /**
     * Create a new message
     */
    private createMessage;
    /**
     * Update the conversation's updatedAt timestamp
     */
    private updateConversationTimestamp;
    /**
     * Update the search index with the new message
     */
    private updateSearchIndex;
    /**
     * Generate a conversation title from the message content
     */
    private generateConversationTitle;
    /**
     * Static factory method to create a SaveMessageTool instance
     */
    static create(dependencies: SaveMessageDependencies): SaveMessageTool;
}
//# sourceMappingURL=SaveMessageTool.d.ts.map