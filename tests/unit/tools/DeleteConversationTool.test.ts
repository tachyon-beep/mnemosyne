/**
 * Unit tests for DeleteConversationTool
 * 
 * Tests the delete_conversation tool functionality including soft deletion,
 * permanent deletion, validation, and search index updates.
 */

import {
  DeleteConversationTool,
  DeleteConversationDependencies,
  DeleteConversationResponse
} from '../../../src/tools/DeleteConversationTool';
import { BaseTool } from '../../../src/tools/BaseTool';
import { ConversationRepository, MessageRepository } from '../../../src/storage/repositories';
import { SearchEngine } from '../../../src/search/SearchEngine';
import { Conversation, Message } from '../../../src/types/interfaces';
import { DeleteConversationInput } from '../../../src/types/schemas';

// Mock dependencies
const mockConversationRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateTimestamp: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn()
} as unknown as jest.Mocked<ConversationRepository>;

const mockMessageRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  findByConversationId: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn()
} as unknown as jest.Mocked<MessageRepository>;

const mockSearchEngine = {
  search: jest.fn(),
  indexMessage: jest.fn(),
  removeMessage: jest.fn(),
  updateMessage: jest.fn(),
  clearIndex: jest.fn()
} as unknown as jest.Mocked<SearchEngine>;

// Sample data for testing
const sampleConversation: Conversation = {
  id: 'conv-123',
  createdAt: Date.now() - 3600000,
  updatedAt: Date.now() - 1800000,
  title: 'Test Conversation',
  metadata: { topic: 'testing' }
};

const systemConversation: Conversation = {
  id: 'system-conv',
  createdAt: Date.now() - 7200000,
  updatedAt: Date.now() - 3600000,
  title: 'System Conversation',
  metadata: { system: true }
};

const deletedConversation: Conversation = {
  id: 'deleted-conv',
  createdAt: Date.now() - 7200000,
  updatedAt: Date.now() - 3600000,
  title: 'Deleted Conversation',
  metadata: { deleted: true, deletedAt: Date.now() - 3600000 }
};

const sampleMessages: Message[] = [
  {
    id: 'msg-1',
    conversationId: 'conv-123',
    role: 'user',
    content: 'First message',
    createdAt: Date.now() - 3000000
  },
  {
    id: 'msg-2',
    conversationId: 'conv-123',
    role: 'assistant',
    content: 'Response message',
    createdAt: Date.now() - 2700000
  },
  {
    id: 'msg-3',
    conversationId: 'conv-123',
    role: 'user',
    content: 'Follow up',
    createdAt: Date.now() - 2400000
  }
];

const largeConversationMessages: Message[] = Array(1500).fill(null).map((_, index) => ({
  id: `msg-${index}`,
  conversationId: 'conv-123',
  role: (index % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
  content: `Message ${index}`,
  createdAt: Date.now() - (1500 - index) * 1000
}));

describe('DeleteConversationTool', () => {
  let deleteConversationTool: DeleteConversationTool;
  let dependencies: DeleteConversationDependencies;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    dependencies = {
      conversationRepository: mockConversationRepo,
      messageRepository: mockMessageRepo,
      searchEngine: mockSearchEngine
    };
    
    deleteConversationTool = new DeleteConversationTool(dependencies);
  });

  describe('constructor and basic properties', () => {
    test('should initialize correctly', () => {
      expect(deleteConversationTool.getName()).toBe('delete_conversation');
      expect(deleteConversationTool.getDescription()).toContain('Delete a conversation');
    });

    test('should create instance using factory method', () => {
      const tool = DeleteConversationTool.create(dependencies);
      expect(tool).toBeInstanceOf(DeleteConversationTool);
    });
  });

  describe('input validation', () => {
    test('should accept valid soft delete input', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockConversationRepo.update.mockResolvedValue(null);
      mockMessageRepo.update.mockResolvedValue(null);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      expect(response.success).toBe(true);
      expect(response.data.details.permanent).toBe(false);
    });

    test('should accept valid permanent delete input', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockMessageRepo.delete.mockResolvedValue(true);
      mockConversationRepo.delete.mockResolvedValue(true);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: true
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      expect(response.success).toBe(true);
      expect(response.data.details.permanent).toBe(true);
    });

    test('should reject empty conversation ID', async () => {
      const input: DeleteConversationInput = {
        conversationId: '',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });
  });

  describe('conversation existence validation', () => {
    test('should handle non-existent conversation', async () => {
      mockConversationRepo.findById.mockResolvedValue(null);

      const input: DeleteConversationInput = {
        conversationId: 'non-existent',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('NotFoundError');
      expect(response.message).toContain('not found');
    });

    test('should reject already deleted conversation', async () => {
      mockConversationRepo.findById.mockResolvedValue(deletedConversation);

      const input: DeleteConversationInput = {
        conversationId: 'deleted-conv',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('already deleted');
    });

    test('should reject system conversation deletion', async () => {
      mockConversationRepo.findById.mockResolvedValue(systemConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue([]);

      const input: DeleteConversationInput = {
        conversationId: 'system-conv',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('System conversations cannot be deleted');
    });
  });

  describe('large conversation validation', () => {
    test('should require permanent deletion for large conversations', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(largeConversationMessages);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('more than 1000 messages require permanent deletion');
    });

    test('should allow permanent deletion of large conversations', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(largeConversationMessages);
      mockMessageRepo.delete.mockResolvedValue(true);
      mockConversationRepo.delete.mockResolvedValue(true);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: true
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      expect(response.success).toBe(true);
      expect(response.data.details.messagesDeleted).toBe(1500);
    });
  });

  describe('soft deletion', () => {
    test('should perform soft deletion correctly', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockConversationRepo.update.mockResolvedValue(null);
      mockMessageRepo.update.mockResolvedValue(null);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      
      // Verify conversation was marked as deleted
      expect(mockConversationRepo.update).toHaveBeenCalledWith(
        'conv-123',
        expect.objectContaining({
          metadata: expect.objectContaining({
            deleted: true,
            deletedAt: expect.any(Number),
            deletedBy: 'delete_conversation_tool',
            requestId: expect.any(String)
          })
        })
      );

      // Verify all messages were marked as deleted
      expect(mockMessageRepo.update).toHaveBeenCalledTimes(3);
      sampleMessages.forEach((message, index) => {
        expect(mockMessageRepo.update).toHaveBeenNthCalledWith(
          index + 1,
          message.id,
          expect.objectContaining({
            metadata: expect.objectContaining({
              deleted: true,
              deletedAt: expect.any(Number),
              deletedBy: 'delete_conversation_tool'
            })
          })
        );
      });
    });

    test('should include recovery information for soft deletion', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockConversationRepo.update.mockResolvedValue(null);
      mockMessageRepo.update.mockResolvedValue(null);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      
      expect(response.data.recovery).toBeDefined();
      expect(response.data.recovery!.difficulty).toBe('easy'); // 3 messages = easy
      expect(response.data.recovery!.instructions).toContain('Contact support');
    });

    test('should set appropriate recovery difficulty based on message count', async () => {
      // Test moderate difficulty (10-100 messages)
      const moderateMessages = Array(50).fill(null).map((_, index) => ({
        ...sampleMessages[0],
        id: `msg-${index}`
      }));

      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(moderateMessages);
      mockConversationRepo.update.mockResolvedValue(null);
      mockMessageRepo.update.mockResolvedValue(null);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      expect(response.data.recovery!.difficulty).toBe('moderate');
    });
  });

  describe('permanent deletion', () => {
    test('should perform permanent deletion correctly', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockMessageRepo.delete.mockResolvedValue(true);
      mockConversationRepo.delete.mockResolvedValue(true);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: true
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      
      // Verify all messages were deleted from database
      expect(mockMessageRepo.delete).toHaveBeenCalledTimes(3);
      sampleMessages.forEach(message => {
        expect(mockMessageRepo.delete).toHaveBeenCalledWith(message.id);
      });

      // Verify conversation was deleted from database
      expect(mockConversationRepo.delete).toHaveBeenCalledWith('conv-123');

      // Verify logging
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Permanently deleted conversation'),
        expect.objectContaining({
          conversationId: 'conv-123',
          messageCount: 3
        })
      );

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      expect(response.data.recovery).toBeUndefined(); // No recovery for permanent deletion

      consoleSpy.mockRestore();
    });

    test('should not include recovery information for permanent deletion', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockMessageRepo.delete.mockResolvedValue(true);
      mockConversationRepo.delete.mockResolvedValue(true);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: true
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      expect(response.data.recovery).toBeUndefined();
    });
  });

  describe('search index updates', () => {
    test('should remove messages from search index', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockConversationRepo.update.mockResolvedValue(null);
      mockMessageRepo.update.mockResolvedValue(null);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      
      // Verify all messages were removed from search index
      expect(mockSearchEngine.removeMessage).toHaveBeenCalledTimes(3);
      sampleMessages.forEach(message => {
        expect(mockSearchEngine.removeMessage).toHaveBeenCalledWith(message.id);
      });

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      expect(response.data.details.searchIndexUpdated).toBe(true);
    });

    test('should handle search index update failures gracefully', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockConversationRepo.update.mockResolvedValue(null);
      mockMessageRepo.update.mockResolvedValue(null);
      mockSearchEngine.removeMessage.mockRejectedValue(new Error('Search index error'));

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to update search index'),
        expect.any(Error)
      );

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      expect(response.data.details.searchIndexUpdated).toBe(false);

      consoleSpy.mockRestore();
    });
  });

  describe('response data', () => {
    test('should include correct deletion metadata', async () => {
      const startTime = Date.now();
      
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockConversationRepo.update.mockResolvedValue(null);
      mockMessageRepo.update.mockResolvedValue(null);
      mockSearchEngine.removeMessage.mockResolvedValue(undefined);

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: DeleteConversationResponse };
      
      expect(response.data.success).toBe(true);
      expect(response.data.deletedConversation.id).toBe('conv-123');
      expect(response.data.deletedConversation.title).toBe('Test Conversation');
      expect(response.data.deletedConversation.messageCount).toBe(3);
      expect(response.data.deletedConversation.createdAt).toBe(sampleConversation.createdAt);
      expect(response.data.deletedConversation.updatedAt).toBe(sampleConversation.updatedAt);
      
      expect(response.data.details.permanent).toBe(false);
      expect(response.data.details.messagesDeleted).toBe(3);
      expect(response.data.details.deletedAt).toBeGreaterThanOrEqual(startTime);
      expect(response.data.details.searchIndexUpdated).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should handle database errors gracefully', async () => {
      mockConversationRepo.findById.mockRejectedValue(new Error('Database connection failed'));

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
    });

    test('should handle message deletion failures', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockMessageRepo.delete.mockRejectedValue(new Error('Deletion failed'));

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: true
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
    });

    test('should handle conversation update failures for soft deletion', async () => {
      mockConversationRepo.findById.mockResolvedValue(sampleConversation);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessages);
      mockConversationRepo.update.mockRejectedValue(new Error('Update failed'));

      const input: DeleteConversationInput = {
        conversationId: 'conv-123',
        permanent: false
      };

      const context = BaseTool.createContext();
      const result = await deleteConversationTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
    });
  });
});