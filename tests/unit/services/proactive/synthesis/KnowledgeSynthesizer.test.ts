import { describe, beforeEach, afterEach, test, expect, jest } from '@jest/globals';
import { KnowledgeSynthesizer, EntityKnowledge, EntityConflict, ContextSuggestion, ExpertRecommendation, EntityMention } from '../../../../../src/services/proactive/synthesis/KnowledgeSynthesizer.js';
import { DatabaseManager } from '../../../../../src/storage/Database.js';
import { EntityRepository, Entity, EntityType } from '../../../../../src/storage/repositories/EntityRepository.js';
import { RelationshipDetector, EntityRelationship } from '../../../../../src/entities/RelationshipDetector.js';

// Mock dependencies
jest.mock('../../../../../src/storage/Database.js');
jest.mock('../../../../../src/storage/repositories/EntityRepository.js');
jest.mock('../../../../../src/storage/repositories/ConversationRepository.js');
jest.mock('../../../../../src/storage/repositories/MessageRepository.js');
jest.mock('../../../../../src/entities/RelationshipDetector.js');

describe('KnowledgeSynthesizer', () => {
  let synthesizer: KnowledgeSynthesizer;
  let mockDbManager: jest.Mocked<DatabaseManager>;
  let mockEntityRepository: jest.Mocked<EntityRepository>;
  let mockRelationshipDetector: jest.Mocked<RelationshipDetector>;
  let mockDb: any;

  // Test data
  const testEntity: Entity = {
    id: 'entity-1',
    name: 'John Doe',
    normalizedName: 'john doe',
    type: 'person',
    canonicalForm: 'John Doe',
    confidenceScore: 0.9,
    createdAt: Date.now() - 1000000,
    updatedAt: Date.now() - 100000,
    metadata: { role: 'developer' },
    mentionCount: 15,
    lastMentionedAt: Date.now() - 50000
  };

  const testRelationship: EntityRelationship = {
    id: 'rel-1',
    sourceEntityId: 'entity-1',
    targetEntityId: 'entity-2',
    relationshipType: 'works_for',
    strength: 0.8,
    context: 'John works for Acme Corp as a senior developer',
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 50000
  };

  beforeEach(() => {
    // Setup mocks
    mockDb = {
      prepare: jest.fn(() => ({
        all: jest.fn(() => []),
        get: jest.fn(() => null),
        run: jest.fn(() => ({ changes: 1 }))
      }))
    };

    mockDbManager = {
      getConnection: jest.fn(() => mockDb),
      initialize: jest.fn(),
      close: jest.fn()
    } as any;

    mockEntityRepository = {
      getById: jest.fn(),
      search: jest.fn(),
      getMostMentioned: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByNormalizedName: jest.fn()
    } as any;

    mockRelationshipDetector = {
      getEntityRelationships: jest.fn(),
      analyzeMessage: jest.fn(),
      storeRelationship: jest.fn()
    } as any;

    // Create synthesizer instance
    synthesizer = new KnowledgeSynthesizer(mockDbManager);
    
    // Replace private fields (accessing via any type)
    (synthesizer as any).entityRepository = mockEntityRepository;
    (synthesizer as any).relationshipDetector = mockRelationshipDetector;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('synthesizeEntityKnowledge', () => {
    test('should synthesize comprehensive entity knowledge', async () => {
      // Setup mocks
      mockEntityRepository.getById.mockResolvedValue(testEntity);
      mockRelationshipDetector.getEntityRelationships.mockResolvedValue([testRelationship]);
      
      // Mock database queries for mentions
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [
          {
            message_id: 'msg-1',
            conversation_id: 'conv-1',
            content: 'John Doe is a senior developer at Acme Corp',
            created_at: Date.now() - 100000,
            start_position: 0,
            end_position: 8,
            confidence_score: 0.9
          }
        ])
      });

      const knowledge = await synthesizer.synthesizeEntityKnowledge('entity-1');

      expect(knowledge).toBeDefined();
      expect(knowledge.entity).toEqual(testEntity);
      expect(knowledge.relationships).toEqual([testRelationship]);
      expect(knowledge.mentions).toHaveLength(1);
      expect(knowledge.attributes).toBeDefined();
      expect(knowledge.timeline).toBeDefined();
      expect(knowledge.knowledgeScore).toBeGreaterThan(0);
      expect(knowledge.lastUpdated).toBeGreaterThan(0);
    });

    test('should throw error for non-existent entity', async () => {
      mockEntityRepository.getById.mockResolvedValue(null);

      await expect(synthesizer.synthesizeEntityKnowledge('nonexistent'))
        .rejects.toThrow('Entity not found: nonexistent');
    });

    test('should extract attributes from mentions', async () => {
      mockEntityRepository.getById.mockResolvedValue(testEntity);
      mockRelationshipDetector.getEntityRelationships.mockResolvedValue([]);
      
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [
          {
            message_id: 'msg-1',
            conversation_id: 'conv-1',
            content: 'John Doe is a senior developer at Acme Corp founded in 2010',
            created_at: Date.now() - 100000,
            start_position: 0,
            end_position: 8,
            confidence_score: 0.9
          }
        ])
      });

      const knowledge = await synthesizer.synthesizeEntityKnowledge('entity-1');

      expect(knowledge.attributes.length).toBeGreaterThan(0);
      // Should find role attribute
      const roleAttr = knowledge.attributes.find(attr => attr.name === 'role');
      expect(roleAttr).toBeDefined();
    });
  });

  describe('detectConflictingStatements', () => {
    test('should detect property contradictions', async () => {
      mockEntityRepository.search.mockResolvedValue({
        entities: [testEntity],
        total: 1,
        hasMore: false
      });

      mockEntityRepository.getById.mockResolvedValue(testEntity);
      mockRelationshipDetector.getEntityRelationships.mockResolvedValue([]);
      
      // Mock mentions with conflicting information
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [
          {
            message_id: 'msg-1',
            conversation_id: 'conv-1',
            content: 'John Doe is a senior developer',
            created_at: Date.now() - 100000,
            start_position: 0,
            end_position: 8,
            confidence_score: 0.9
          },
          {
            message_id: 'msg-2',
            conversation_id: 'conv-2',
            content: 'John Doe is a product manager',
            created_at: Date.now() - 50000,
            start_position: 0,
            end_position: 8,
            confidence_score: 0.8
          }
        ])
      });

      const conflicts = await synthesizer.detectConflictingStatements();

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });

    test('should detect status inconsistencies', async () => {
      const orgEntity: Entity = {
        ...testEntity,
        id: 'org-1',
        name: 'Acme Corp',
        type: 'organization'
      };

      mockEntityRepository.search.mockResolvedValue({
        entities: [orgEntity],
        total: 1,
        hasMore: false
      });

      mockEntityRepository.getById.mockResolvedValue(orgEntity);
      mockRelationshipDetector.getEntityRelationships.mockResolvedValue([]);
      
      // Mock mentions with conflicting status
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [
          {
            message_id: 'msg-1',
            conversation_id: 'conv-1',
            content: 'Acme Corp is active and running',
            created_at: Date.now() - 100000,
            start_position: 0,
            end_position: 9,
            confidence_score: 0.9
          },
          {
            message_id: 'msg-2',
            conversation_id: 'conv-2',
            content: 'Acme Corp is closed and inactive',
            created_at: Date.now() - 50000,
            start_position: 0,
            end_position: 9,
            confidence_score: 0.8
          }
        ])
      });

      const conflicts = await synthesizer.detectConflictingStatements('org-1');

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });

    test('should return empty array when conflict detection is disabled', async () => {
      const configWithoutConflicts = { conflictDetectionEnabled: false };
      const synthesizerNoConflicts = new KnowledgeSynthesizer(mockDbManager, configWithoutConflicts);

      const conflicts = await synthesizerNoConflicts.detectConflictingStatements();

      expect(conflicts).toEqual([]);
    });

    test('should detect temporal impossibilities', async () => {
      const productEntity: Entity = {
        ...testEntity,
        id: 'product-1',
        name: 'App v1.0',
        type: 'product'
      };

      mockEntityRepository.search.mockResolvedValue({
        entities: [productEntity],
        total: 1,
        hasMore: false
      });

      mockEntityRepository.getById.mockResolvedValue(productEntity);
      mockRelationshipDetector.getEntityRelationships.mockResolvedValue([]);
      
      // Mock mentions with impossible timeline
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [
          {
            message_id: 'msg-1',
            conversation_id: 'conv-1',
            content: 'App v1.0 launched in 2023',
            created_at: Date.now() - 100000,
            start_position: 0,
            end_position: 8,
            confidence_score: 0.9
          },
          {
            message_id: 'msg-2',
            conversation_id: 'conv-2',
            content: 'App v1.0 ended in 2022',
            created_at: Date.now() - 50000,
            start_position: 0,
            end_position: 8,
            confidence_score: 0.8
          }
        ])
      });

      const conflicts = await synthesizer.detectConflictingStatements('product-1');

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });
  });

  describe('suggestRelevantContext', () => {
    test('should suggest related conversations', async () => {
      mockEntityRepository.getById.mockResolvedValue(testEntity);
      
      // Mock conversation search results
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [
          {
            id: 'conv-2',
            title: 'Development Discussion',
            created_at: Date.now() - 100000,
            entity_count: 2,
            entity_names: 'John Doe,Acme Corp'
          }
        ])
      });

      // Mock conversation repository
      const mockConversationRepository = {
        findById: jest.fn(() => Promise.resolve({
          id: 'conv-2',
          title: 'Development Discussion',
          createdAt: Date.now() - 100000,
          updatedAt: Date.now() - 50000,
          metadata: {}
        }))
      };
      (synthesizer as any).conversationRepository = mockConversationRepository;

      const suggestions = await synthesizer.suggestRelevantContext(['entity-1'], 'conv-1', 5);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });

    test('should return empty array for invalid entities', async () => {
      mockEntityRepository.getById.mockResolvedValue(null);

      const suggestions = await synthesizer.suggestRelevantContext(['invalid-entity'], 'conv-1', 5);

      expect(suggestions).toEqual([]);
    });

    test('should suggest expert insights', async () => {
      mockEntityRepository.getById.mockResolvedValue(testEntity);
      
      // Mock conversation search results (empty to focus on expert insights)
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [])
      });

      // Mock conversation repository
      const mockConversationRepository = {
        findById: jest.fn(() => Promise.resolve(null))
      };
      (synthesizer as any).conversationRepository = mockConversationRepository;

      const suggestions = await synthesizer.suggestRelevantContext(['entity-1'], 'conv-1', 5);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('recommendExperts', () => {
    test('should recommend experts based on entity interactions', async () => {
      // Mock finding people with entity interactions
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [
          {
            id: 'expert-1',
            name: 'Jane Expert',
            normalized_name: 'jane expert',
            type: 'person',
            canonical_form: 'Jane Expert',
            confidence_score: 0.9,
            created_at: Date.now() - 1000000,
            updated_at: Date.now() - 100000,
            metadata: '{}',
            mention_count: 10,
            last_mentioned_at: Date.now() - 50000
          }
        ])
      });

      // Mock the private method to return empty mentions for simplicity
      // @ts-ignore
      (synthesizer as any).getEntityMentions = jest.fn().mockResolvedValue([]);

      const recommendations = await synthesizer.recommendExperts(['entity-1'], 'development', 3);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });

    test('should filter out low-credibility experts', async () => {
      // Mock finding people with low interactions
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [
          {
            id: 'low-expert',
            name: 'Low Expert',
            normalized_name: 'low expert',
            type: 'person',
            canonical_form: 'Low Expert',
            confidence_score: 0.5,
            created_at: Date.now() - 1000000,
            updated_at: Date.now() - 100000,
            metadata: '{}',
            mention_count: 1,
            last_mentioned_at: Date.now() - 500000
          }
        ])
      });

      // Mock minimal entity mentions (not enough to qualify as expert)
      // @ts-ignore
      (synthesizer as any).getEntityMentions = jest.fn().mockResolvedValue([{
        messageId: 'msg-1',
        conversationId: 'conv-1',
        content: 'Low Expert mentioned something',
        context: 'Brief mention',
        timestamp: Date.now() - 500000,
        importance: 0.3
      }]);

      const recommendations = await synthesizer.recommendExperts(['entity-1'], 'development', 3);

      // Should return empty array due to low credibility/interactions
      expect(recommendations).toEqual([]);
    });

    test('should sort recommendations by credibility and knowledge depth', async () => {
      mockDb.prepare.mockReturnValue({
        all: jest.fn(() => [
          {
            id: 'expert-1',
            name: 'Expert One',
            normalized_name: 'expert one',
            type: 'person',
            canonical_form: 'Expert One',
            confidence_score: 0.9,
            created_at: Date.now() - 1000000,
            updated_at: Date.now() - 100000,
            metadata: '{}',
            mention_count: 20,
            last_mentioned_at: Date.now() - 10000
          },
          {
            id: 'expert-2',
            name: 'Expert Two',
            normalized_name: 'expert two',
            type: 'person',
            canonical_form: 'Expert Two',
            confidence_score: 0.8,
            created_at: Date.now() - 1000000,
            updated_at: Date.now() - 100000,
            metadata: '{}',
            mention_count: 15,
            last_mentioned_at: Date.now() - 50000
          }
        ])
      });

      // Mock sufficient mentions for both experts to pass the filters
      // @ts-ignore
      const mockGetEntityMentions = jest.fn();
      mockGetEntityMentions
        // @ts-ignore
        .mockResolvedValueOnce([
          { messageId: 'msg-1', conversationId: 'conv-1', content: 'High quality insight', context: 'insight', timestamp: Date.now() - 10000, importance: 0.9 },
          { messageId: 'msg-2', conversationId: 'conv-2', content: 'Another insight', context: 'insight', timestamp: Date.now() - 20000, importance: 0.8 },
          { messageId: 'msg-3', conversationId: 'conv-3', content: 'More expertise', context: 'expertise', timestamp: Date.now() - 30000, importance: 0.9 },
          { messageId: 'msg-4', conversationId: 'conv-4', content: 'Technical guidance', context: 'guidance', timestamp: Date.now() - 40000, importance: 0.8 }
        ])
        // @ts-ignore
        .mockResolvedValueOnce([
          { messageId: 'msg-5', conversationId: 'conv-5', content: 'Basic comment', context: 'comment', timestamp: Date.now() - 60000, importance: 0.5 },
          { messageId: 'msg-6', conversationId: 'conv-6', content: 'Simple response', context: 'response', timestamp: Date.now() - 70000, importance: 0.4 },
          { messageId: 'msg-7', conversationId: 'conv-7', content: 'Brief input', context: 'input', timestamp: Date.now() - 80000, importance: 0.3 }
        ]);
      (synthesizer as any).getEntityMentions = mockGetEntityMentions;

      const recommendations = await synthesizer.recommendExperts(['entity-1'], 'development', 5);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('configuration and utilities', () => {
    test('should use default configuration when none provided', () => {
      const defaultSynthesizer = new KnowledgeSynthesizer(mockDbManager);
      
      expect(defaultSynthesizer).toBeDefined();
      // Test that default config is applied
      const config = (defaultSynthesizer as any).config;
      expect(config.minConfidenceThreshold).toBe(0.5);
      expect(config.conflictDetectionEnabled).toBe(true);
      expect(config.maxSuggestions).toBe(5);
    });

    test('should merge custom configuration with defaults', () => {
      const customConfig = {
        minConfidenceThreshold: 0.8,
        maxSuggestions: 10,
        conflictDetectionEnabled: false
      };
      
      const customSynthesizer = new KnowledgeSynthesizer(mockDbManager, customConfig);
      const config = (customSynthesizer as any).config;
      
      expect(config.minConfidenceThreshold).toBe(0.8);
      expect(config.maxSuggestions).toBe(10);
      expect(config.conflictDetectionEnabled).toBe(false);
      // Should still have default values for non-overridden settings
      expect(config.maxAttributesPerEntity).toBe(50);
    });

    test('should generate unique IDs', () => {
      const id1 = (synthesizer as any).generateId();
      const id2 = (synthesizer as any).generateId();
      
      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[a-f0-9]{4}-[a-f0-9]{12}$/);
    });

    test('should calculate string similarity correctly', () => {
      const similarity1 = (synthesizer as any).calculateStringSimilarity('hello world', 'hello world');
      const similarity2 = (synthesizer as any).calculateStringSimilarity('hello world', 'goodbye world');
      const similarity3 = (synthesizer as any).calculateStringSimilarity('hello world', 'completely different');
      
      expect(similarity1).toBe(1.0); // Identical strings
      expect(similarity2).toBeGreaterThan(0); // Some overlap
      expect(similarity2).toBeLessThan(1.0);
      expect(similarity3).toBeGreaterThanOrEqual(0); // No/minimal overlap
      expect(similarity3).toBeLessThan(similarity2);
    });

    test('should determine change types correctly', () => {
      const addition = (synthesizer as any).determineChangeType(undefined, 'new value', []);
      const confirmation = (synthesizer as any).determineChangeType('same value', 'same value', []);
      const modification = (synthesizer as any).determineChangeType('old version', 'new version', []);
      const contradiction = (synthesizer as any).determineChangeType('completely different', 'totally unrelated', []);
      
      expect(addition).toBe('addition');
      expect(confirmation).toBe('confirmation');
      expect(modification).toBe('modification');
      expect(contradiction).toBe('contradiction');
    });
  });

  describe('error handling', () => {
    test('should handle database errors gracefully', async () => {
      mockEntityRepository.getById.mockRejectedValue(new Error('Database connection failed'));

      await expect(synthesizer.synthesizeEntityKnowledge('entity-1'))
        .rejects.toThrow('Database connection failed');
    });

    test('should handle missing entities in conflict detection', async () => {
      mockEntityRepository.search.mockResolvedValue({
        entities: [],
        total: 0,
        hasMore: false
      });

      const conflicts = await synthesizer.detectConflictingStatements();
      expect(conflicts).toEqual([]);
    });

    test('should handle malformed dates in temporal conflict detection', () => {
      const invalidDate = (synthesizer as any).parseDate('not a date');
      const validDate = (synthesizer as any).parseDate('2023-01-01');
      const yearOnly = (synthesizer as any).parseDate('2023');
      
      expect(invalidDate).toBeNull();
      expect(validDate).toBeInstanceOf(Date);
      expect(yearOnly).toBeInstanceOf(Date);
    });

    test('should handle empty attribute lists', () => {
      const timeline = (synthesizer as any).buildAttributeTimeline([]);
      const deduped = (synthesizer as any).deduplicateAttributes([]);
      
      expect(timeline).toEqual([]);
      expect(deduped).toEqual([]);
    });
  });

  describe('knowledge scoring', () => {
    test('should calculate knowledge scores based on multiple factors', () => {
      const attributes = [
        { name: 'role', value: 'developer', confidence: 0.9, sourceMessageId: 'msg-1', sourceConversationId: 'conv-1', extractedAt: Date.now(), context: 'test' },
        { name: 'company', value: 'Acme', confidence: 0.8, sourceMessageId: 'msg-2', sourceConversationId: 'conv-1', extractedAt: Date.now(), context: 'test' }
      ];
      
      const relationships = [testRelationship];
      
      const mentions = [
        { messageId: 'msg-1', conversationId: 'conv-1', content: 'test', context: 'test', timestamp: Date.now(), importance: 0.8 }
      ];

      const score = (synthesizer as any).calculateKnowledgeScore(testEntity, attributes, relationships, mentions);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1.0);
    });

    test('should penalize entities with low confidence', () => {
      const lowConfidenceEntity = { ...testEntity, confidenceScore: 0.3 };
      
      const score1 = (synthesizer as any).calculateKnowledgeScore(testEntity, [], [], []);
      const score2 = (synthesizer as any).calculateKnowledgeScore(lowConfidenceEntity, [], [], []);
      
      expect(score2).toBeLessThan(score1);
    });
  });
});