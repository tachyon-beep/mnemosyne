/**
 * Unit tests for Zod schema validation in the MCP Persistence System
 * 
 * This file tests all the validation schemas to ensure they properly
 * validate inputs and reject invalid data.
 */

import {
  SaveMessageSchema,
  SearchMessagesSchema,
  GetConversationSchema,
  SetRetentionPolicySchema,
  ConversationDataSchema,
  PersistenceServerConfigSchema,
  MessageRoleSchema,
  ExportFormatSchema,
  ExportConversationsSchema
} from '../../../src/types/schemas';

describe('Schema Validation', () => {
  describe('MessageRoleSchema', () => {
    it('should accept valid roles', () => {
      expect(() => MessageRoleSchema.parse('user')).not.toThrow();
      expect(() => MessageRoleSchema.parse('assistant')).not.toThrow();
      expect(() => MessageRoleSchema.parse('system')).not.toThrow();
    });

    it('should reject invalid roles', () => {
      expect(() => MessageRoleSchema.parse('invalid')).toThrow();
      expect(() => MessageRoleSchema.parse('')).toThrow();
      expect(() => MessageRoleSchema.parse(null)).toThrow();
    });
  });

  describe('ExportFormatSchema', () => {
    it('should accept valid formats', () => {
      expect(() => ExportFormatSchema.parse('json')).not.toThrow();
      expect(() => ExportFormatSchema.parse('markdown')).not.toThrow();
      expect(() => ExportFormatSchema.parse('csv')).not.toThrow();
    });

    it('should reject invalid formats', () => {
      expect(() => ExportFormatSchema.parse('xml')).toThrow();
      expect(() => ExportFormatSchema.parse('')).toThrow();
    });
  });

  describe('SaveMessageSchema', () => {
    const validInput = {
      role: 'user' as const,
      content: 'Hello, world!'
    };

    it('should accept valid input with required fields only', () => {
      const result = SaveMessageSchema.parse(validInput);
      expect(result.role).toBe('user');
      expect(result.content).toBe('Hello, world!');
    });

    it('should accept valid input with all optional fields', () => {
      const fullInput = {
        ...validInput,
        conversationId: 'conv-123',
        parentMessageId: 'msg-456',
        metadata: { key: 'value' }
      };
      
      const result = SaveMessageSchema.parse(fullInput);
      expect(result.conversationId).toBe('conv-123');
      expect(result.parentMessageId).toBe('msg-456');
      expect(result.metadata).toEqual({ key: 'value' });
    });

    it('should reject empty content', () => {
      expect(() => SaveMessageSchema.parse({
        ...validInput,
        content: ''
      })).toThrow();
    });

    it('should reject invalid role', () => {
      expect(() => SaveMessageSchema.parse({
        ...validInput,
        role: 'invalid'
      })).toThrow();
    });

    it('should reject missing required fields', () => {
      expect(() => SaveMessageSchema.parse({
        role: 'user'
        // content missing
      })).toThrow();

      expect(() => SaveMessageSchema.parse({
        content: 'Hello'
        // role missing
      })).toThrow();
    });
  });

  describe('SearchMessagesSchema', () => {
    const validInput = {
      query: 'search term'
    };

    it('should accept valid input with defaults', () => {
      const result = SearchMessagesSchema.parse(validInput);
      expect(result.query).toBe('search term');
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
      expect(result.matchType).toBe('fuzzy');
      expect(result.highlightStart).toBe('<mark>');
      expect(result.highlightEnd).toBe('</mark>');
    });

    it('should accept valid input with all fields', () => {
      const fullInput = {
        ...validInput,
        conversationId: 'conv-123',
        limit: 50,
        offset: 10,
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-12-31T23:59:59Z',
        matchType: 'exact' as const,
        highlightStart: '<em>',
        highlightEnd: '</em>'
      };

      const result = SearchMessagesSchema.parse(fullInput);
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
      expect(result.matchType).toBe('exact');
    });

    it('should reject empty query', () => {
      expect(() => SearchMessagesSchema.parse({
        query: ''
      })).toThrow();
    });

    it('should reject invalid limit', () => {
      expect(() => SearchMessagesSchema.parse({
        ...validInput,
        limit: 0
      })).toThrow();

      expect(() => SearchMessagesSchema.parse({
        ...validInput,
        limit: 101
      })).toThrow();
    });

    it('should reject invalid offset', () => {
      expect(() => SearchMessagesSchema.parse({
        ...validInput,
        offset: -1
      })).toThrow();
    });

    it('should reject invalid date format', () => {
      expect(() => SearchMessagesSchema.parse({
        ...validInput,
        startDate: '2023-01-01' // Not a valid datetime
      })).toThrow();
    });
  });

  describe('GetConversationSchema', () => {
    const validInput = {
      conversationId: 'conv-123'
    };

    it('should accept valid input with defaults', () => {
      const result = GetConversationSchema.parse(validInput);
      expect(result.conversationId).toBe('conv-123');
      expect(result.includeMessages).toBe(true);
      expect(result.messageLimit).toBe(100);
    });

    it('should accept valid input with all fields', () => {
      const fullInput = {
        ...validInput,
        includeMessages: false,
        messageLimit: 50,
        beforeMessageId: 'msg-456',
        afterMessageId: 'msg-789'
      };

      const result = GetConversationSchema.parse(fullInput);
      expect(result.includeMessages).toBe(false);
      expect(result.messageLimit).toBe(50);
      expect(result.beforeMessageId).toBe('msg-456');
      expect(result.afterMessageId).toBe('msg-789');
    });

    it('should reject empty conversation ID', () => {
      expect(() => GetConversationSchema.parse({
        conversationId: ''
      })).toThrow();
    });

    it('should reject invalid message limit', () => {
      expect(() => GetConversationSchema.parse({
        ...validInput,
        messageLimit: 0
      })).toThrow();

      expect(() => GetConversationSchema.parse({
        ...validInput,
        messageLimit: 1001
      })).toThrow();
    });
  });

  describe('SetRetentionPolicySchema', () => {
    it('should accept valid retention days', () => {
      const result = SetRetentionPolicySchema.parse({
        retentionDays: 90
      });
      expect(result.retentionDays).toBe(90);
      expect(result.applyImmediately).toBe(false); // default
    });

    it('should accept valid retention days with immediate application', () => {
      const result = SetRetentionPolicySchema.parse({
        retentionDays: 365,
        applyImmediately: true
      });
      expect(result.retentionDays).toBe(365);
      expect(result.applyImmediately).toBe(true);
    });

    it('should reject retention days below minimum', () => {
      expect(() => SetRetentionPolicySchema.parse({
        retentionDays: 0
      })).toThrow();
    });

    it('should reject retention days above maximum', () => {
      expect(() => SetRetentionPolicySchema.parse({
        retentionDays: 3651
      })).toThrow();
    });
  });

  describe('ConversationDataSchema', () => {
    const validConversation = {
      id: 'conv-123',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: {},
      messages: [
        {
          id: 'msg-1',
          conversationId: 'conv-123',
          role: 'user' as const,
          content: 'Hello',
          createdAt: Date.now()
        }
      ]
    };

    it('should accept valid conversation data', () => {
      const result = ConversationDataSchema.parse(validConversation);
      expect(result.id).toBe('conv-123');
      expect(result.messages).toHaveLength(1);
    });

    it('should accept conversation without messages', () => {
      const { messages, ...conversationWithoutMessages } = validConversation;
      const result = ConversationDataSchema.parse(conversationWithoutMessages);
      expect(result.id).toBe('conv-123');
      expect(result.messages).toBeUndefined();
    });

    it('should accept conversation with title', () => {
      const conversationWithTitle = {
        ...validConversation,
        title: 'My Conversation'
      };
      const result = ConversationDataSchema.parse(conversationWithTitle);
      expect(result.title).toBe('My Conversation');
    });

    it('should reject conversation with invalid message role', () => {
      const invalidConversation = {
        ...validConversation,
        messages: [
          {
            ...validConversation.messages![0],
            role: 'invalid'
          }
        ]
      };

      expect(() => ConversationDataSchema.parse(invalidConversation)).toThrow();
    });
  });

  describe('PersistenceServerConfigSchema', () => {
    const validConfig = {
      databasePath: '/path/to/database.db'
    };

    it('should accept valid config with defaults', () => {
      const result = PersistenceServerConfigSchema.parse(validConfig);
      expect(result.databasePath).toBe('/path/to/database.db');
      expect(result.maxDatabaseSizeMB).toBe(1000);
      expect(result.enableEmbeddings).toBe(false);
      expect(result.logLevel).toBe('info');
    });

    it('should accept valid config with all fields', () => {
      const fullConfig = {
        ...validConfig,
        maxDatabaseSizeMB: 500,
        maxConversationAgeDays: 180,
        maxMessagesPerConversation: 5000,
        enableEmbeddings: true,
        embeddingModel: 'sentence-transformers/all-MiniLM-L6-v2',
        enableAutoSummarization: true,
        vacuumInterval: 3600000, // 1 hour
        checkpointInterval: 60000, // 1 minute
        encryptionEnabled: true,
        defaultRetentionDays: 30,
        logLevel: 'debug' as const
      };

      const result = PersistenceServerConfigSchema.parse(fullConfig);
      expect(result.maxDatabaseSizeMB).toBe(500);
      expect(result.enableEmbeddings).toBe(true);
      expect(result.logLevel).toBe('debug');
    });

    it('should reject empty database path', () => {
      expect(() => PersistenceServerConfigSchema.parse({
        databasePath: ''
      })).toThrow();
    });

    it('should reject invalid intervals', () => {
      expect(() => PersistenceServerConfigSchema.parse({
        ...validConfig,
        vacuumInterval: 30000 // Less than minimum 1 minute
      })).toThrow();

      expect(() => PersistenceServerConfigSchema.parse({
        ...validConfig,
        checkpointInterval: 15000 // Less than minimum 30 seconds
      })).toThrow();
    });

    it('should reject invalid log level', () => {
      expect(() => PersistenceServerConfigSchema.parse({
        ...validConfig,
        logLevel: 'verbose'
      })).toThrow();
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null and undefined values appropriately', () => {
      expect(() => SaveMessageSchema.parse(null)).toThrow();
      expect(() => SaveMessageSchema.parse(undefined)).toThrow();
      expect(() => SaveMessageSchema.parse({})).toThrow();
    });

    it('should handle type coercion correctly', () => {
      // Numbers should not be coerced to strings
      expect(() => SaveMessageSchema.parse({
        role: 'user',
        content: 123 // Should be string
      })).toThrow();

      // Strings should not be coerced to numbers
      expect(() => SearchMessagesSchema.parse({
        query: 'test',
        limit: '20' // Should be number
      })).toThrow();
    });

    it('should validate nested objects correctly', () => {
      const invalidMetadata = {
        role: 'user' as const,
        content: 'Hello',
        metadata: 'should-be-object' // Invalid metadata type - should be object
      };

      // This should throw because metadata expects an object (z.record(z.any()))
      expect(() => SaveMessageSchema.parse(invalidMetadata)).toThrow();

      // Valid metadata should work
      const validMetadata = {
        role: 'user' as const,
        content: 'Hello',
        metadata: { key: 'value', nested: { deep: true } }
      };
      
      const result = SaveMessageSchema.parse(validMetadata);
      expect(result.metadata).toEqual({ key: 'value', nested: { deep: true } });
    });

    it('should validate array items correctly', () => {
      const invalidExportInput = {
        format: 'json' as const,
        conversationIds: ['valid-id', 123, 'another-valid-id'] // Mixed types
      };

      expect(() => ExportConversationsSchema.parse(invalidExportInput)).toThrow();
    });
  });

  describe('Schema composition and defaults', () => {
    it('should apply default values correctly', () => {
      const minimalSearch = SearchMessagesSchema.parse({
        query: 'test'
      });

      expect(minimalSearch.limit).toBe(20);
      expect(minimalSearch.offset).toBe(0);
      expect(minimalSearch.matchType).toBe('fuzzy');
      expect(minimalSearch.highlightStart).toBe('<mark>');
      expect(minimalSearch.highlightEnd).toBe('</mark>');
    });

    it('should preserve provided values over defaults', () => {
      const customSearch = SearchMessagesSchema.parse({
        query: 'test',
        limit: 50,
        matchType: 'exact'
      });

      expect(customSearch.limit).toBe(50);
      expect(customSearch.matchType).toBe('exact');
      expect(customSearch.offset).toBe(0); // Still default
    });

    it('should handle optional fields consistently', () => {
      const messageWithOptional = SaveMessageSchema.parse({
        role: 'user',
        content: 'Hello',
        conversationId: 'conv-123'
      });

      expect(messageWithOptional.conversationId).toBe('conv-123');
      expect(messageWithOptional.parentMessageId).toBeUndefined();
      expect(messageWithOptional.metadata).toBeUndefined();
    });
  });
});