/**
 * Unit tests for SaveMessageTool
 * 
 * Tests the save_message tool functionality including conversation creation,
 * message saving, search index updates, and error handling.
 */

import {
  SaveMessageTool,
  SaveMessageDependencies,
  SaveMessageResponse
} from '../../../src/tools/SaveMessageTool';
import { BaseTool } from '../../../src/tools/BaseTool';
import { ConversationRepository, MessageRepository } from '../../../src/storage/repositories';
import { SearchEngine } from '../../../src/search/SearchEngine';
import { Conversation, Message } from '../../../src/types/interfaces';
import { SaveMessageInput } from '../../../src/types/schemas';

// Mock dependencies
const mockConversationRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateTimestamp: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  getStats: jest.fn(),
  findByTitle: jest.fn(),
  findByDateRange: jest.fn(),
  exists: jest.fn(),
  cleanup: jest.fn(),
  executeStatement: jest.fn(),
  executeStatementAll: jest.fn(),
  executeStatementRun: jest.fn()
} as unknown as jest.Mocked<ConversationRepository>;

const mockMessageRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByConversationId: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  findByConversation: jest.fn(),
  countByConversation: jest.fn(),
  search: jest.fn(),
  findByRole: jest.fn(),
  exists: jest.fn(),
  cleanup: jest.fn(),
  executeStatement: jest.fn(),
  executeStatementAll: jest.fn(),
  executeStatementRun: jest.fn()
} as unknown as jest.Mocked<MessageRepository>;

const mockSearchEngine = {
  search: jest.fn(),
  indexMessage: jest.fn(),
  removeMessage: jest.fn(),
  updateMessage: jest.fn(),
  clearIndex: jest.fn(),
  simpleSearch: jest.fn(),
  phraseSearch: jest.fn(),
  prefixSearch: jest.fn(),
  searchByDateRange: jest.fn(),
  searchWithBoolean: jest.fn(),
  reindex: jest.fn(),
  getStats: jest.fn(),
  optimize: jest.fn(),
  destroy: jest.fn()
} as unknown as jest.Mocked<SearchEngine>;

describe('SaveMessageTool', () => {
  let saveMessageTool: SaveMessageTool;
  let dependencies: SaveMessageDependencies;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    dependencies = {
      conversationRepository: mockConversationRepo,
      messageRepository: mockMessageRepo,
      searchEngine: mockSearchEngine
    };
    
    saveMessageTool = new SaveMessageTool(dependencies);
  });

  describe('constructor and basic properties', () => {
    test('should initialize correctly', () => {
      expect(saveMessageTool.getName()).toBe('save_message');
      expect(saveMessageTool.getDescription()).toContain('Save a message to conversation history');
    });

    test('should create instance using factory method', () => {
      const tool = SaveMessageTool.create(dependencies);
      expect(tool).toBeInstanceOf(SaveMessageTool);
    });
  });

  describe('input validation', () => {
    test('should accept valid input with existing conversation', async () => {
      const mockConversation: Conversation = {
        id: 'conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const mockMessage: Message = {
        id: 'msg-123',
        conversationId: 'conv-123',
        role: 'user',
        content: 'Test message',
        createdAt: Date.now()
      };

      mockConversationRepo.findById.mockResolvedValue(mockConversation);
      mockMessageRepo.create.mockResolvedValue(mockMessage);
      mockConversationRepo.updateTimestamp.mockResolvedValue(undefined);
      mockSearchEngine.indexMessage.mockResolvedValue(undefined);

      const input: SaveMessageInput = {
        conversationId: 'conv-123',
        role: 'user',
        content: 'Test message'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SaveMessageResponse };
      expect(response.success).toBe(true);
      expect(response.data.conversationCreated).toBe(false);
      expect(response.data.message.content).toBe('Test message');
    });

    test('should reject empty content', async () => {
      const input: SaveMessageInput = {
        role: 'user',
        content: ''
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should reject invalid role', async () => {
      const input = {
        role: 'invalid_role',
        content: 'Test message'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });
  });

  describe('conversation creation', () => {
    test('should create new conversation when no conversationId provided', async () => {
      const mockNewConversation: Conversation = {
        id: 'new-conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: 'Test message',
        metadata: {
          createdBy: 'save_message_tool',
          initialRole: 'user'
        }
      };

      const mockMessage: Message = {
        id: 'msg-123',
        conversationId: 'new-conv-123',
        role: 'user',
        content: 'Test message',
        createdAt: Date.now()
      };

      mockConversationRepo.create.mockResolvedValue(mockNewConversation);
      mockMessageRepo.create.mockResolvedValue(mockMessage);
      mockConversationRepo.updateTimestamp.mockResolvedValue(undefined);
      mockConversationRepo.findById.mockResolvedValue(mockNewConversation);
      mockSearchEngine.indexMessage.mockResolvedValue(undefined);

      const input: SaveMessageInput = {
        role: 'user',
        content: 'Test message'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SaveMessageResponse };
      
      expect(response.success).toBe(true);
      expect(response.data.conversationCreated).toBe(true);
      expect(response.data.conversation.id).toBe('new-conv-123');
      expect(mockConversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test message',
          metadata: expect.objectContaining({
            createdBy: 'save_message_tool',
            initialRole: 'user'
          })
        })
      );
    });

    test('should generate appropriate title for long content', async () => {
      const longContent = 'This is a very long message that should be truncated when used as a conversation title because it exceeds the reasonable length limit for titles';
      
      const mockNewConversation: Conversation = {
        id: 'new-conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: longContent.substring(0, 47) + '...',
        metadata: {}
      };

      const mockMessage: Message = {
        id: 'msg-123',
        conversationId: 'new-conv-123',
        role: 'user',
        content: longContent,
        createdAt: Date.now()
      };

      mockConversationRepo.create.mockResolvedValue(mockNewConversation);
      mockMessageRepo.create.mockResolvedValue(mockMessage);
      mockConversationRepo.updateTimestamp.mockResolvedValue(undefined);
      mockConversationRepo.findById.mockResolvedValue(mockNewConversation);
      mockSearchEngine.indexMessage.mockResolvedValue(undefined);

      const input: SaveMessageInput = {
        role: 'user',
        content: longContent
      };

      const context = BaseTool.createContext();
      await saveMessageTool.execute(input, context);

      expect(mockConversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringMatching(/\.{3}$/) // Should end with ...
        })
      );
    });
  });

  describe('existing conversation handling', () => {
    test('should use existing conversation when conversationId provided', async () => {
      const mockConversation: Conversation = {
        id: 'existing-conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        title: 'Existing Conversation',
        metadata: {}
      };

      const mockMessage: Message = {
        id: 'msg-123',
        conversationId: 'existing-conv-123',
        role: 'assistant',
        content: 'Response message',
        createdAt: Date.now()
      };

      mockConversationRepo.findById.mockResolvedValue(mockConversation);
      mockMessageRepo.create.mockResolvedValue(mockMessage);
      mockConversationRepo.updateTimestamp.mockResolvedValue(undefined);
      mockSearchEngine.indexMessage.mockResolvedValue(undefined);

      const input: SaveMessageInput = {
        conversationId: 'existing-conv-123',
        role: 'assistant',
        content: 'Response message'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SaveMessageResponse };
      
      expect(response.success).toBe(true);
      expect(response.data.conversationCreated).toBe(false);
      expect(response.data.conversation.id).toBe('existing-conv-123');
      expect(mockConversationRepo.findById).toHaveBeenCalledWith('existing-conv-123');
    });

    test('should throw NotFoundError for non-existent conversation', async () => {
      mockConversationRepo.findById.mockResolvedValue(null);

      const input: SaveMessageInput = {
        conversationId: 'non-existent-conv',
        role: 'user',
        content: 'Test message'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('NotFoundError');
      expect(response.message).toContain('not found');
    });
  });

  describe('parent message validation', () => {
    test('should validate parent message exists and belongs to conversation', async () => {
      const mockConversation: Conversation = {
        id: 'conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const mockParentMessage: Message = {
        id: 'parent-msg-123',
        conversationId: 'conv-123',
        role: 'user',
        content: 'Parent message',
        createdAt: Date.now()
      };

      const mockNewMessage: Message = {
        id: 'msg-123',
        conversationId: 'conv-123',
        role: 'assistant',
        content: 'Reply message',
        createdAt: Date.now(),
        parentMessageId: 'parent-msg-123'
      };

      mockConversationRepo.findById.mockResolvedValue(mockConversation);
      mockMessageRepo.findById.mockResolvedValue(mockParentMessage);
      mockMessageRepo.create.mockResolvedValue(mockNewMessage);
      mockConversationRepo.updateTimestamp.mockResolvedValue(undefined);
      mockSearchEngine.indexMessage.mockResolvedValue(undefined);

      const input: SaveMessageInput = {
        conversationId: 'conv-123',
        role: 'assistant',
        content: 'Reply message',
        parentMessageId: 'parent-msg-123'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      expect(mockMessageRepo.findById).toHaveBeenCalledWith('parent-msg-123');
    });

    test('should reject non-existent parent message', async () => {
      const mockConversation: Conversation = {
        id: 'conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      mockConversationRepo.findById.mockResolvedValue(mockConversation);
      mockMessageRepo.findById.mockResolvedValue(null);

      const input: SaveMessageInput = {
        conversationId: 'conv-123',
        role: 'assistant',
        content: 'Reply message',
        parentMessageId: 'non-existent-parent'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('NotFoundError');
      expect(response.message).toContain('Parent message');
    });

    test('should reject parent message from different conversation', async () => {
      const mockConversation: Conversation = {
        id: 'conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const mockParentMessage: Message = {
        id: 'parent-msg-123',
        conversationId: 'different-conv-456', // Different conversation
        role: 'user',
        content: 'Parent message',
        createdAt: Date.now()
      };

      mockConversationRepo.findById.mockResolvedValue(mockConversation);
      mockMessageRepo.findById.mockResolvedValue(mockParentMessage);

      const input: SaveMessageInput = {
        conversationId: 'conv-123',
        role: 'assistant',
        content: 'Reply message',
        parentMessageId: 'parent-msg-123'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('does not belong to conversation');
    });
  });

  describe('search index updates', () => {
    test('should update search index after saving message', async () => {
      const mockConversation: Conversation = {
        id: 'conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const mockMessage: Message = {
        id: 'msg-123',
        conversationId: 'conv-123',
        role: 'user',
        content: 'Test message',
        createdAt: Date.now()
      };

      mockConversationRepo.findById.mockResolvedValue(mockConversation);
      mockMessageRepo.create.mockResolvedValue(mockMessage);
      mockConversationRepo.updateTimestamp.mockResolvedValue(undefined);
      mockSearchEngine.indexMessage.mockResolvedValue(undefined);

      const input: SaveMessageInput = {
        conversationId: 'conv-123',
        role: 'user',
        content: 'Test message'
      };

      const context = BaseTool.createContext();
      await saveMessageTool.execute(input, context);

      expect(mockSearchEngine.indexMessage).toHaveBeenCalledWith(mockMessage);
    });

    test('should not fail if search index update fails', async () => {
      const mockConversation: Conversation = {
        id: 'conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const mockMessage: Message = {
        id: 'msg-123',
        conversationId: 'conv-123',
        role: 'user',
        content: 'Test message',
        createdAt: Date.now()
      };

      mockConversationRepo.findById.mockResolvedValue(mockConversation);
      mockMessageRepo.create.mockResolvedValue(mockMessage);
      mockConversationRepo.updateTimestamp.mockResolvedValue(undefined);
      mockSearchEngine.indexMessage.mockRejectedValue(new Error('Search index error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const input: SaveMessageInput = {
        conversationId: 'conv-123',
        role: 'user',
        content: 'Test message'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update search index'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('metadata handling', () => {
    test('should include metadata in message and conversation', async () => {
      const mockNewConversation: Conversation = {
        id: 'new-conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      const mockMessage: Message = {
        id: 'msg-123',
        conversationId: 'new-conv-123',
        role: 'user',
        content: 'Test message',
        createdAt: Date.now(),
        metadata: {
          createdBy: 'save_message_tool',
          customField: 'customValue'
        }
      };

      mockConversationRepo.create.mockResolvedValue(mockNewConversation);
      mockMessageRepo.create.mockResolvedValue(mockMessage);
      mockConversationRepo.updateTimestamp.mockResolvedValue(undefined);
      mockConversationRepo.findById.mockResolvedValue(mockNewConversation);
      mockSearchEngine.indexMessage.mockResolvedValue(undefined);

      const input: SaveMessageInput = {
        role: 'user',
        content: 'Test message',
        metadata: { customField: 'customValue' }
      };

      const context = BaseTool.createContext();
      await saveMessageTool.execute(input, context);

      expect(mockMessageRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            createdBy: 'save_message_tool',
            customField: 'customValue'
          })
        })
      );
    });
  });

  describe('error handling', () => {
    test('should handle database errors gracefully', async () => {
      mockConversationRepo.findById.mockRejectedValue(new Error('Database connection failed'));

      const input: SaveMessageInput = {
        conversationId: 'conv-123',
        role: 'user',
        content: 'Test message'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
    });

    test('should handle message creation failure', async () => {
      const mockConversation: Conversation = {
        id: 'conv-123',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: {}
      };

      mockConversationRepo.findById.mockResolvedValue(mockConversation);
      mockMessageRepo.create.mockRejectedValue(new Error('Message creation failed'));

      const input: SaveMessageInput = {
        conversationId: 'conv-123',
        role: 'user',
        content: 'Test message'
      };

      const context = BaseTool.createContext();
      const result = await saveMessageTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
    });
  });
});