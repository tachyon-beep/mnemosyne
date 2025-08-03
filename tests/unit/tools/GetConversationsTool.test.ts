/**
 * Unit tests for GetConversationsTool
 * 
 * Tests the get_conversations tool functionality including listing conversations,
 * filtering, pagination, and metadata enhancement.
 */

import {
  GetConversationsTool,
  GetConversationsDependencies,
  GetConversationsResponse,
  ConversationWithMetadata
} from '../../../src/tools/GetConversationsTool';
import { BaseTool } from '../../../src/tools/BaseTool';
import { ConversationRepository, MessageRepository } from '../../../src/storage/repositories';
import { Conversation, Message } from '../../../src/types/interfaces';
import { GetConversationsInput } from '../../../src/types/schemas';

// Mock dependencies
const mockConversationRepo = {
  findById: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateTimestamp: jest.fn(),
  delete: jest.fn(),
  findAll: jest.fn(),
  count: jest.fn(),
  findOldest: jest.fn(),
  findNewest: jest.fn(),
  getStats: jest.fn(),
  findByTitle: jest.fn(),
  findByDateRange: jest.fn(),
  exists: jest.fn(),
  cleanup: jest.fn()
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
  findChildren: jest.fn(),
  findWithEmbeddings: jest.fn(),
  exists: jest.fn(),
  cleanup: jest.fn()
} as unknown as jest.Mocked<MessageRepository>;

// Sample data for testing
const now = Date.now();
const oneWeekAgo = now - (7 * 24 * 60 * 60 * 1000);
const oneMonthAgo = now - (30 * 24 * 60 * 60 * 1000);
const twoMonthsAgo = now - (60 * 24 * 60 * 60 * 1000);

const sampleConversations: Conversation[] = [
  {
    id: 'conv-1',
    createdAt: now - 1000,
    updatedAt: now - 500,
    title: 'Recent Conversation',
    metadata: { topic: 'testing' }
  },
  {
    id: 'conv-2',
    createdAt: oneWeekAgo + 1000,
    updatedAt: oneWeekAgo + 2000,
    title: 'This Week Conversation',
    metadata: { topic: 'development' }
  },
  {
    id: 'conv-3',
    createdAt: oneMonthAgo + 1000,
    updatedAt: oneMonthAgo + 2000,
    title: 'This Month Conversation',
    metadata: { topic: 'design' }
  },
  {
    id: 'conv-4',
    createdAt: twoMonthsAgo,
    updatedAt: twoMonthsAgo + 1000,
    title: 'Older Conversation',
    metadata: { topic: 'planning' }
  }
];

const sampleMessagesForConv1: Message[] = [
  {
    id: 'msg-1-1',
    conversationId: 'conv-1',
    role: 'user',
    content: 'First message in conv-1',
    createdAt: now - 2000
  },
  {
    id: 'msg-1-2',
    conversationId: 'conv-1',
    role: 'assistant',
    content: 'Response to first message',
    createdAt: now - 1500
  },
  {
    id: 'msg-1-3',
    conversationId: 'conv-1',
    role: 'user',
    content: 'Follow up question',
    createdAt: now - 1000
  }
];

const sampleMessagesForConv2: Message[] = [
  {
    id: 'msg-2-1',
    conversationId: 'conv-2',
    role: 'user',
    content: 'Message in conv-2',
    createdAt: oneWeekAgo + 500
  },
  {
    id: 'msg-2-2',
    conversationId: 'conv-2',
    role: 'assistant',
    content: 'Assistant response',
    createdAt: oneWeekAgo + 1000
  }
];

describe('GetConversationsTool', () => {
  let getConversationsTool: GetConversationsTool;
  let dependencies: GetConversationsDependencies;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    dependencies = {
      conversationRepository: mockConversationRepo,
      messageRepository: mockMessageRepo
    };
    
    getConversationsTool = new GetConversationsTool(dependencies);
  });

  describe('constructor and basic properties', () => {
    test('should initialize correctly', () => {
      expect(getConversationsTool.getName()).toBe('get_conversations');
      expect(getConversationsTool.getDescription()).toContain('List conversations');
    });

    test('should create instance using factory method', () => {
      const tool = GetConversationsTool.create(dependencies);
      expect(tool).toBeInstanceOf(GetConversationsTool);
    });
  });

  describe('input validation', () => {
    test('should accept valid minimal input', async () => {
      mockConversationRepo.findAll.mockResolvedValue({
        data: sampleConversations.slice(0, 2),
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(4);

      const input: GetConversationsInput = {};

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      expect(response.success).toBe(true);
      expect(response.data.conversations).toHaveLength(2);
    });

    test('should accept valid input with all options', async () => {
      mockConversationRepo.findByDateRange.mockResolvedValue({
        data: sampleConversations.slice(0, 1),
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(1);
      mockMessageRepo.findByConversationId.mockResolvedValue(sampleMessagesForConv1);

      const input: GetConversationsInput = {
        limit: 10,
        offset: 0,
        startDate: new Date('2024-01-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
        includeMessageCounts: true
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      expect(response.success).toBe(true);
    });

    test('should reject invalid limit values', async () => {
      const input: GetConversationsInput = {
        limit: 0
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should reject limit exceeding maximum', async () => {
      const input: GetConversationsInput = {
        limit: 101
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should reject negative offset', async () => {
      const input: GetConversationsInput = {
        offset: -1
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should reject excessive offset', async () => {
      const input: GetConversationsInput = {
        offset: 10001
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('cannot exceed 10,000');
    });
  });

  describe('date range validation', () => {
    test('should accept valid date range', async () => {
      mockConversationRepo.findByDateRange.mockResolvedValue({
        data: sampleConversations,
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(4);

      const input: GetConversationsInput = {
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z'
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBeUndefined();
    });

    test('should reject start date after end date', async () => {
      const input: GetConversationsInput = {
        startDate: '2024-01-02T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z'
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('Start date must be before end date');
    });
  });

  describe('conversation listing', () => {
    test('should list conversations with default parameters', async () => {
      mockConversationRepo.findAll.mockResolvedValue({
        data: sampleConversations,
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(4);

      const input: GetConversationsInput = {};

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      
      expect(response.success).toBe(true);
      expect(response.data.conversations).toHaveLength(4);
      expect(response.data.totalCount).toBe(4);
      expect(response.data.hasMore).toBe(false);
      
      expect(mockConversationRepo.findAll).toHaveBeenCalledWith(
        21, // 20 + 1 to check for more
        0,
        'updated_at',
        'DESC'
      );
    });

    test('should handle pagination correctly', async () => {
      const limitedConversations = sampleConversations.slice(0, 2);
      mockConversationRepo.findAll.mockResolvedValue({
        data: [...limitedConversations, sampleConversations[2]], // +1 to indicate more
        hasMore: true
      });
      mockConversationRepo.count.mockResolvedValue(4);

      const input: GetConversationsInput = {
        limit: 2,
        offset: 0
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      
      expect(response.data.conversations).toHaveLength(2);
      expect(response.data.hasMore).toBe(true);
      expect(response.data.pagination.nextOffset).toBe(2);
      expect(response.data.pagination.previousOffset).toBeUndefined();
    });

    test('should calculate previous offset correctly', async () => {
      mockConversationRepo.findAll.mockResolvedValue({
        data: sampleConversations.slice(1, 3),
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(4);

      const input: GetConversationsInput = {
        limit: 2,
        offset: 2
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      
      expect(response.data.pagination.previousOffset).toBe(0);
      expect(response.data.pagination.offset).toBe(2);
    });
  });

  describe('message count enhancement', () => {
    test('should include message counts when requested', async () => {
      mockConversationRepo.findAll.mockResolvedValue({
        data: [sampleConversations[0], sampleConversations[1]],
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(2);
      
      // Mock message counts for each conversation
      mockMessageRepo.findByConversationId
        .mockResolvedValueOnce(sampleMessagesForConv1)  // For conv-1
        .mockResolvedValueOnce(sampleMessagesForConv2); // For conv-2

      const input: GetConversationsInput = {
        includeMessageCounts: true
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      const enhancedConversations = response.data.conversations as ConversationWithMetadata[];
      
      expect(enhancedConversations[0].messageCount).toBe(3);
      expect(enhancedConversations[0].roleDistribution).toEqual({ user: 2, assistant: 1 });
      expect(enhancedConversations[0].firstMessage).toBeDefined();
      expect(enhancedConversations[0].latestMessage).toBeDefined();
      expect(enhancedConversations[0].duration).toBeGreaterThan(0);
      
      expect(enhancedConversations[1].messageCount).toBe(2);
      expect(enhancedConversations[1].roleDistribution).toEqual({ user: 1, assistant: 1 });
    });

    test('should handle conversations with no messages', async () => {
      mockConversationRepo.findAll.mockResolvedValue({
        data: [sampleConversations[0]],
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(1);
      mockMessageRepo.findByConversationId.mockResolvedValue([]);

      const input: GetConversationsInput = {
        includeMessageCounts: true
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      const enhancedConversations = response.data.conversations as ConversationWithMetadata[];
      
      expect(enhancedConversations[0].messageCount).toBe(0);
      expect(enhancedConversations[0].roleDistribution).toEqual({});
      expect(enhancedConversations[0].firstMessage).toBeUndefined();
      expect(enhancedConversations[0].latestMessage).toBeUndefined();
      expect(enhancedConversations[0].duration).toBeUndefined();
    });

    test('should not include message counts when not requested', async () => {
      mockConversationRepo.findAll.mockResolvedValue({
        data: [sampleConversations[0]],
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(1);

      const input: GetConversationsInput = {
        includeMessageCounts: false
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      const conversations = response.data.conversations as ConversationWithMetadata[];
      
      expect(conversations[0].messageCount).toBeUndefined();
      expect(conversations[0].roleDistribution).toBeUndefined();
      expect(conversations[0].firstMessage).toBeUndefined();
      expect(conversations[0].latestMessage).toBeUndefined();
    });
  });

  describe('summary statistics', () => {
    test('should calculate summary statistics correctly', async () => {
      mockConversationRepo.findAll.mockResolvedValue({
        data: sampleConversations,
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(4);
      
      mockMessageRepo.findByConversationId
        .mockResolvedValueOnce(sampleMessagesForConv1)
        .mockResolvedValueOnce(sampleMessagesForConv2)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const input: GetConversationsInput = {
        includeMessageCounts: true
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      
      expect(response.data.summary.dateRange).toBeDefined();
      expect(response.data.summary.dateRange!.earliest).toBe(twoMonthsAgo);
      expect(response.data.summary.dateRange!.latest).toBe(now - 1000);
      
      expect(response.data.summary.totalMessages).toBe(5); // 3 + 2 + 0 + 0
      expect(response.data.summary.averageMessagesPerConversation).toBe(2.5); // 5 / 2 (only counting non-empty)
      
      expect(response.data.summary.timeDistribution).toBeDefined();
      expect(response.data.summary.timeDistribution!.thisWeek).toBe(2); // conv-1 and conv-2
      expect(response.data.summary.timeDistribution!.thisMonth).toBe(1); // conv-3
      expect(response.data.summary.timeDistribution!.older).toBe(1); // conv-4
    });

    test('should handle empty conversation list', async () => {
      mockConversationRepo.findAll.mockResolvedValue({
        data: [],
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(0);

      const input: GetConversationsInput = {};

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      
      expect(response.data.conversations).toHaveLength(0);
      expect(response.data.totalCount).toBe(0);
      expect(response.data.summary.dateRange).toBeUndefined();
      expect(response.data.summary.totalMessages).toBeUndefined();
    });
  });

  describe('message preview generation', () => {
    test('should create proper previews for message content', async () => {
      const longMessage: Message = {
        id: 'msg-long',
        conversationId: 'conv-1',
        role: 'user',
        content: 'This is a very long message that should be truncated when used as a preview because it exceeds the reasonable length limit for previews in the conversation list display',
        createdAt: now - 1000
      };

      mockConversationRepo.findAll.mockResolvedValue({
        data: [sampleConversations[0]],
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(1);
      mockMessageRepo.findByConversationId.mockResolvedValue([longMessage]);

      const input: GetConversationsInput = {
        includeMessageCounts: true
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      const enhanced = response.data.conversations[0] as ConversationWithMetadata;
      
      expect(enhanced.firstMessage!.preview).toBe(longMessage.content.substring(0, 97) + '...');
      expect(enhanced.latestMessage!.preview).toBe(longMessage.content.substring(0, 97) + '...');
    });

    test('should not truncate short messages', async () => {
      const shortMessage: Message = {
        id: 'msg-short',
        conversationId: 'conv-1',
        role: 'user',
        content: 'Short message',
        createdAt: now - 1000
      };

      mockConversationRepo.findAll.mockResolvedValue({
        data: [sampleConversations[0]],
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(1);
      mockMessageRepo.findByConversationId.mockResolvedValue([shortMessage]);

      const input: GetConversationsInput = {
        includeMessageCounts: true
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: GetConversationsResponse };
      const enhanced = response.data.conversations[0] as ConversationWithMetadata;
      
      expect(enhanced.firstMessage!.preview).toBe('Short message');
      expect(enhanced.latestMessage!.preview).toBe('Short message');
    });
  });

  describe('filtering', () => {
    test('should apply date filters correctly', async () => {
      const startDate = new Date(oneMonthAgo).toISOString();
      const endDate = new Date(now).toISOString();
      
      mockConversationRepo.findByDateRange.mockResolvedValue({
        data: sampleConversations.slice(0, 3),
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(3);

      const input: GetConversationsInput = {
        startDate,
        endDate
      };

      const context = BaseTool.createContext();
      await getConversationsTool.execute(input, context);

      expect(mockConversationRepo.findByDateRange).toHaveBeenCalledWith(
        oneMonthAgo,
        now,
        21, // limit + 1
        0   // offset
      );
    });
  });

  describe('error handling', () => {
    test('should handle database errors gracefully', async () => {
      mockConversationRepo.findAll.mockRejectedValue(new Error('Database connection failed'));

      const input: GetConversationsInput = {};

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
    });

    test('should handle message count retrieval errors', async () => {
      mockConversationRepo.findAll.mockResolvedValue({
        data: [sampleConversations[0]],
        hasMore: false
      });
      mockConversationRepo.count.mockResolvedValue(1);
      mockMessageRepo.findByConversationId.mockRejectedValue(new Error('Message query failed'));

      const input: GetConversationsInput = {
        includeMessageCounts: true
      };

      const context = BaseTool.createContext();
      const result = await getConversationsTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
    });
  });
});