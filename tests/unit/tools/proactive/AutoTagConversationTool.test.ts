/**
 * Unit tests for AutoTagConversationTool
 * 
 * Tests the auto_tag_conversation MCP tool implementation
 * with focus on input validation, service integration, and tagging storage.
 */

import { DatabaseManager } from '../../../../src/storage/Database.js';
import { AutoTagConversationTool } from '../../../../src/tools/proactive/AutoTagConversationTool.js';
import { AutoTaggingService } from '../../../../src/services/proactive/intelligence/AutoTaggingService.js';
import { createTestDatabase, setupMockTime, restoreTime } from '../../../utils/test-helpers.js';

// Mock the AutoTaggingService
jest.mock('../../../../src/services/proactive/intelligence/AutoTaggingService.js');

describe('AutoTagConversationTool', () => {
  let dbManager: DatabaseManager;
  let tool: AutoTagConversationTool;
  let mockTaggingService: jest.Mocked<AutoTaggingService>;

  beforeEach(async () => {
    dbManager = await createTestDatabase();
    tool = new AutoTagConversationTool({ databaseManager: dbManager });
    
    // Get the mocked service instance
    mockTaggingService = (tool as any).autoTaggingService as jest.Mocked<AutoTaggingService>;
    
    setupMockTime();
  });

  afterEach(async () => {
    restoreTime();
    await dbManager.close();
    jest.clearAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool definition', () => {
      expect(tool.definition.name).toBe('auto_tag_conversation');
      expect(tool.definition.description).toContain('auto-tag');
      expect(tool.definition.inputSchema).toBeDefined();
      expect(tool.definition.inputSchema.properties).toBeDefined();
    });

    it('should have required input schema properties', () => {
      const schema = tool.definition.inputSchema;
      
      expect(schema.properties.conversationId).toBeDefined();
      expect(schema.properties.includeTypes).toBeDefined();
      expect(schema.properties.maxTopicTags).toBeDefined();
      expect(schema.properties.minEntityRelevance).toBeDefined();
      expect(schema.properties.storeTags).toBeDefined();
    });

    it('should have correct enum values for includeTypes', () => {
      const includeTypesProperty = tool.definition.inputSchema.properties.includeTypes;
      
      expect(includeTypesProperty.items.enum).toContain('topic_tags');
      expect(includeTypesProperty.items.enum).toContain('activity_classification');
      expect(includeTypesProperty.items.enum).toContain('urgency_detection');
      expect(includeTypesProperty.items.enum).toContain('project_context');
    });

    it('should require conversationId', () => {
      const schema = tool.definition.inputSchema;
      expect(schema.required).toContain('conversationId');
    });
  });

  describe('Input Validation', () => {
    it('should validate valid input', async () => {
      const validInput = {
        conversationId: 'test-conv-123',
        includeTypes: ['topic_tags', 'activity_classification'] as const,
        maxTopicTags: 5,
        minEntityRelevance: 0.7,
        storeTags: true
      };

      const mockResult = {
        conversationId: 'test-conv-123',
        topicTags: [],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(validInput);

      expect(result.isError).toBe(false);
    });

    it('should apply default values for optional parameters', async () => {
      const minimalInput = {
        conversationId: 'test-conv-123',
        includeTypes: ['topic_tags'] as const
      };

      const mockResult = {
        conversationId: 'test-conv-123',
        topicTags: [],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(minimalInput);

      expect(result.isError).toBe(false);
      
      // Should use default values
      const call = mockTaggingService.autoTagConversation.mock.calls[0];
      expect(call[0]).toBe('test-conv-123');
    });

    it('should reject missing conversationId', async () => {
      const invalidInput = {
        includeTypes: ['topic_tags'] as const
      } as any; // Cast to bypass TypeScript checking

      const result = await tool.handle(invalidInput);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject empty conversationId', async () => {
      const invalidInput = {
        conversationId: '',
        includeTypes: ['topic_tags'] as const
      };

      const result = await tool.handle(invalidInput);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject invalid includeTypes', async () => {
      const invalidInput = {
        conversationId: 'test-conv',
        includeTypes: ['invalid_type'] as any
      };

      const result = await tool.handle(invalidInput);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject empty includeTypes array', async () => {
      const invalidInput = {
        conversationId: 'test-conv',
        includeTypes: [] as any
      };

      const result = await tool.handle(invalidInput);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });

    it('should reject invalid maxTopicTags values', async () => {
      const invalidInputs = [
        { conversationId: 'test-conv', includeTypes: ['topic_tags'] as const, maxTopicTags: 0 },
        { conversationId: 'test-conv', includeTypes: ['topic_tags'] as const, maxTopicTags: -1 }
      ];

      for (const input of invalidInputs) {
        const result = await tool.handle(input);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation error');
      }
    });

    it('should reject invalid minEntityRelevance values', async () => {
      const invalidInputs = [
        { conversationId: 'test-conv', includeTypes: ['topic_tags'] as const, minEntityRelevance: -0.1 },
        { conversationId: 'test-conv', includeTypes: ['topic_tags'] as const, minEntityRelevance: 1.1 }
      ];

      for (const input of invalidInputs) {
        const result = await tool.handle(input);
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation error');
      }
    });
  });

  describe('Service Integration', () => {
    it('should call autoTagConversation with correct parameters', async () => {
      const input = {
        conversationId: 'test-conv-123',
        includeTypes: ['topic_tags', 'activity_classification'] as const,
        maxTopicTags: 3,
        minEntityRelevance: 0.8
      };

      const mockResult = {
        conversationId: 'test-conv-123',
        topicTags: [
          { name: 'React', type: 'entity' as const, relevance: 0.9, source: 'primary_entity' as const }
        ],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: ['discuss'] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(mockTaggingService.autoTagConversation).toHaveBeenCalledWith('test-conv-123');
    });

    it('should handle topic tags generation', async () => {
      const input = {
        conversationId: 'test-conv',
        includeTypes: ['topic_tags'] as const
      };

      const mockResult = {
        conversationId: 'test-conv',
        topicTags: [
          { name: 'React', type: 'entity' as const, relevance: 0.9, source: 'primary_entity' as const },
          { name: 'TypeScript', type: 'entity' as const, relevance: 0.8, source: 'primary_entity' as const },
          { name: 'Development Tools', type: 'theme' as const, relevance: 0.7, source: 'entity_cluster' as const }
        ],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.topicTags).toHaveLength(3);
      expect(response.taggingResult.topicTags[0].name).toBe('React');
      expect(response.taggingResult.topicTags[0].relevance).toBe(0.9);
    });

    it('should handle activity classification', async () => {
      const input = {
        conversationId: 'test-conv',
        includeTypes: ['activity_classification'] as const
      };

      const mockResult = {
        conversationId: 'test-conv',
        topicTags: [],
        activity: { 
          type: 'problem_solving' as const, 
          confidence: 0.85, 
          indicators: ['problem', 'fix', 'debug'] 
        },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.activity.type).toBe('problem_solving');
      expect(response.taggingResult.activity.confidence).toBe(0.85);
      expect(response.taggingResult.activity.indicators).toContain('problem');
    });

    it('should handle urgency detection', async () => {
      const input = {
        conversationId: 'test-conv',
        includeTypes: ['urgency_detection'] as const
      };

      const mockResult = {
        conversationId: 'test-conv',
        topicTags: [],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { 
          level: 'high' as const, 
          score: 0.8, 
          signals: ['urgent', 'priority'], 
          deadline: new Date(Date.now() + 24 * 60 * 60 * 1000)
        },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.urgency.level).toBe('high');
      expect(response.taggingResult.urgency.score).toBe(0.8);
      expect(response.taggingResult.urgency.signals).toContain('urgent');
      expect(response.taggingResult.urgency.deadline).toBeDefined();
    });

    it('should handle project context identification', async () => {
      const input = {
        conversationId: 'test-conv',
        includeTypes: ['project_context'] as const
      };

      const mockResult = {
        conversationId: 'test-conv',
        topicTags: [],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [
          {
            name: 'React Migration Project',
            entities: [],
            confidence: 0.9,
            type: 'ongoing' as const
          },
          {
            name: 'API Documentation',
            entities: [],
            confidence: 0.7,
            type: 'new' as const
          }
        ],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.projectContexts).toHaveLength(2);
      expect(response.taggingResult.projectContexts[0].name).toBe('React Migration Project');
      expect(response.taggingResult.projectContexts[0].type).toBe('ongoing');
    });
  });

  describe('Tag Storage', () => {
    beforeEach(() => {
      // Add test data setup for tag storage
      const db = dbManager.getConnection();
      db.exec(`
        INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at)
        VALUES ('test-conv-storage', 'Test Conversation', ${Date.now()}, ${Date.now()})
      `);
    });

    it('should store tags when storeTags is true', async () => {
      const input = {
        conversationId: 'test-conv-storage',
        includeTypes: ['topic_tags', 'activity_classification'] as const,
        storeTags: true
      };

      const mockResult = {
        conversationId: 'test-conv-storage',
        topicTags: [
          { name: 'React', type: 'entity' as const, relevance: 0.9, source: 'primary_entity' as const },
          { name: 'Technology', type: 'domain' as const, relevance: 0.8, source: 'keyword_analysis' as const }
        ],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: ['discuss'] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.summary.tagsStored).toBe(true);
      expect(response.summary.totalTags).toBe(2);

      // Verify tags were stored in database
      const db = dbManager.getConnection();
      const storedTags = db.prepare(`
        SELECT tag_name, tag_type, relevance_score
        FROM conversation_tags
        WHERE conversation_id = ?
      `).all('test-conv-storage');

      expect(storedTags).toHaveLength(2);
      expect(storedTags.find(tag => tag.tag_name === 'React')).toBeDefined();
      expect(storedTags.find(tag => tag.tag_name === 'Technology')).toBeDefined();
    });

    it('should not store tags when storeTags is false', async () => {
      const input = {
        conversationId: 'test-conv-storage',
        includeTypes: ['topic_tags'] as const,
        storeTags: false
      };

      const mockResult = {
        conversationId: 'test-conv-storage',
        topicTags: [
          { name: 'React', type: 'entity' as const, relevance: 0.9, source: 'primary_entity' as const }
        ],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.summary.tagsStored).toBe(false);
      expect(response.summary.totalTags).toBe(1);

      // Verify no tags were stored
      const db = dbManager.getConnection();
      const storedTags = db.prepare(`
        SELECT COUNT(*) as count
        FROM conversation_tags
        WHERE conversation_id = ?
      `).get('test-conv-storage');

      expect(storedTags.count).toBe(0);
    });

    it('should replace existing tags when storing new ones', async () => {
      const db = dbManager.getConnection();
      
      // Insert existing tags
      db.prepare(`
        INSERT INTO conversation_tags (conversation_id, tag_name, tag_type, relevance_score, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('test-conv-storage', 'OldTag', 'entity', 0.5, Date.now());

      const input = {
        conversationId: 'test-conv-storage',
        includeTypes: ['topic_tags'] as const,
        storeTags: true
      };

      const mockResult = {
        conversationId: 'test-conv-storage',
        topicTags: [
          { name: 'NewTag', type: 'entity' as const, relevance: 0.9, source: 'primary_entity' as const }
        ],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      await tool.handle(input);

      // Verify old tags were replaced
      const storedTags = db.prepare(`
        SELECT tag_name FROM conversation_tags WHERE conversation_id = ?
      `).all('test-conv-storage');

      expect(storedTags).toHaveLength(1);
      expect(storedTags[0].tag_name).toBe('NewTag');
    });
  });

  describe('Response Format', () => {
    it('should return proper response structure', async () => {
      const input = {
        conversationId: 'test-conv',
        includeTypes: ['topic_tags', 'activity_classification'] as const
      };

      const mockResult = {
        conversationId: 'test-conv',
        topicTags: [],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      
      expect(response).toHaveProperty('taggingResult');
      expect(response).toHaveProperty('summary');
      expect(response.summary).toHaveProperty('totalTags');
      expect(response.summary).toHaveProperty('tagsStored');
      expect(response.summary).toHaveProperty('includedTypes');
      expect(response.summary).toHaveProperty('processingTime');
    });

    it('should filter results based on includeTypes', async () => {
      const input = {
        conversationId: 'test-conv',
        includeTypes: ['topic_tags'] as const
      };

      const mockResult = {
        conversationId: 'test-conv',
        topicTags: [
          { name: 'React', type: 'entity' as const, relevance: 0.9, source: 'primary_entity' as const }
        ],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.topicTags).toBeDefined();
      expect(response.taggingResult.activity).toBeUndefined();
      expect(response.taggingResult.urgency).toBeUndefined();
      expect(response.taggingResult.projectContexts).toBeUndefined();
    });

    it('should calculate processing time', async () => {
      const input = {
        conversationId: 'test-conv',
        includeTypes: ['topic_tags'] as const
      };

      const mockResult = {
        conversationId: 'test-conv',
        topicTags: [],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.summary.processingTime).toBeGreaterThanOrEqual(0);
      expect(typeof response.summary.processingTime).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors', async () => {
      const input = {
        conversationId: 'test-conv',
        includeTypes: ['topic_tags'] as const
      };

      mockTaggingService.autoTagConversation.mockRejectedValue(new Error('Service unavailable'));

      const result = await tool.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Auto-tagging failed');
    });

    it('should handle database storage errors', async () => {
      const input = {
        conversationId: 'test-conv',
        includeTypes: ['topic_tags'] as const,
        storeTags: true
      };

      const mockResult = {
        conversationId: 'test-conv',
        topicTags: [
          { name: 'React', type: 'entity' as const, relevance: 0.9, source: 'primary_entity' as const }
        ],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      // Close database to simulate storage error
      await dbManager.close();

      const result = await tool.handle(input);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Database error');
    });

    it('should handle non-existent conversation gracefully', async () => {
      const input = {
        conversationId: 'non-existent-conv',
        includeTypes: ['topic_tags'] as const
      };

      const mockResult = {
        conversationId: 'non-existent-conv',
        topicTags: [],
        activity: { type: 'discussion' as const, confidence: 0.8, indicators: [] },
        urgency: { level: 'none' as const, score: 0, signals: [] },
        projectContexts: [],
        generatedAt: new Date()
      };

      mockTaggingService.autoTagConversation.mockResolvedValue(mockResult);

      const result = await tool.handle(input);

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.taggingResult.topicTags).toEqual([]);
      expect(response.summary.totalTags).toBe(0);
    });
  });

  describe('Static Factory Method', () => {
    it('should create tool instance via factory method', () => {
      const toolInstance = AutoTagConversationTool.create({ databaseManager: dbManager });
      
      expect(toolInstance).toBeInstanceOf(AutoTagConversationTool);
      expect(toolInstance.definition.name).toBe('auto_tag_conversation');
    });

    it('should initialize auto-tagging service in factory-created instance', () => {
      const toolInstance = AutoTagConversationTool.create({ databaseManager: dbManager });
      
      expect((toolInstance as any).autoTaggingService).toBeDefined();
      expect((toolInstance as any).autoTaggingService).toBeInstanceOf(AutoTaggingService);
    });
  });
});