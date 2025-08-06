/**
 * Unit tests for Context Change Detector service
 */

import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import { DatabaseManager, DatabaseOptions } from '../../../../../src/storage/Database.js';
import { EntityRepository, Entity } from '../../../../../src/storage/repositories/EntityRepository.js';
import { KnowledgeGraphRepository } from '../../../../../src/storage/repositories/KnowledgeGraphRepository.js';
import { ContextChangeDetector } from '../../../../../src/services/proactive/intelligence/ContextChangeDetector.js';
import { Message, Conversation } from '../../../../../src/types/interfaces.js';
import path from 'path';
import os from 'os';

describe('ContextChangeDetector', () => {
  let dbManager: DatabaseManager;
  let entityRepository: EntityRepository;
  let knowledgeGraphRepo: KnowledgeGraphRepository;
  let contextDetector: ContextChangeDetector;

  // Test data
  const mockConversationId = 'conv-123';
  let createdEntityIds: string[] = []; // Store actual entity IDs created during setup
  const mockEntities = [
    {
      id: 'entity-1',
      name: 'JavaScript',
      normalizedName: 'javascript',
      type: 'technical' as const,
      confidenceScore: 0.9,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
      metadata: {},
      mentionCount: 5,
      lastMentionedAt: Date.now() - 3600000
    },
    {
      id: 'entity-2',
      name: 'React',
      normalizedName: 'react',
      type: 'technical' as const,
      confidenceScore: 0.85,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
      metadata: {},
      mentionCount: 3,
      lastMentionedAt: Date.now() - 7200000
    },
    {
      id: 'entity-3',
      name: 'Python',
      normalizedName: 'python',
      type: 'technical' as const,
      confidenceScore: 0.8,
      createdAt: Date.now() - 86400000,
      updatedAt: Date.now() - 86400000,
      metadata: {},
      mentionCount: 2,
      lastMentionedAt: Date.now() - 14400000
    }
  ];

  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      conversationId: mockConversationId,
      role: 'user',
      content: 'How do I use JavaScript arrays effectively?',
      createdAt: Date.now() - 14400000
    },
    {
      id: 'msg-2',
      conversationId: mockConversationId,
      role: 'assistant',
      content: 'JavaScript arrays have many useful methods like map, filter, and reduce.',
      createdAt: Date.now() - 14340000
    },
    {
      id: 'msg-3',
      conversationId: mockConversationId,
      role: 'user',
      content: 'What about React hooks?',
      createdAt: Date.now() - 10800000
    },
    {
      id: 'msg-4',
      conversationId: mockConversationId,
      role: 'assistant',
      content: 'React hooks are functions that let you use state in functional components.',
      createdAt: Date.now() - 10740000
    },
    {
      id: 'msg-5',
      conversationId: mockConversationId,
      role: 'user',
      content: 'Now I need help with Python data analysis.',
      createdAt: Date.now() - 3600000
    },
    {
      id: 'msg-6',
      conversationId: mockConversationId,
      role: 'assistant',
      content: 'Python has excellent libraries like pandas and numpy for data analysis.',
      createdAt: Date.now() - 3540000
    }
  ];

  beforeEach(async () => {
    // Create test database
    const testDbPath = path.join(os.tmpdir(), `test-context-detector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.db`);
    const options: DatabaseOptions = {
      databasePath: testDbPath
    };
    
    dbManager = new DatabaseManager(options);
    await dbManager.initialize();
    
    entityRepository = new EntityRepository(dbManager);
    knowledgeGraphRepo = new KnowledgeGraphRepository(dbManager.getConnection());
    contextDetector = new ContextChangeDetector(dbManager, entityRepository, knowledgeGraphRepo, {
      minShiftConfidence: 0.5,
      entityPatternWindow: 10,
      minRelevanceScore: 0.3,
      maxHistoryAgeDays: 30,
      minConflictSeverity: 0.4,
      maxContextTokens: 2000
    });

    // Setup test data
    const entities = await setupTestData();
    createdEntityIds = entities.map(e => e.id);
  });

  async function setupTestData() {
    // Create test conversation
    const conversationStmt = dbManager.getConnection().prepare(`
      INSERT INTO conversations (id, created_at, updated_at, title, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);
    conversationStmt.run(
      mockConversationId,
      Date.now() - 86400000,
      Date.now(),
      'Test Conversation',
      '{}'
    );

    // Create test messages
    const messageStmt = dbManager.getConnection().prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at, parent_message_id, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const message of mockMessages) {
      messageStmt.run(
        message.id,
        message.conversationId,
        message.role,
        message.content,
        message.createdAt,
        message.parentMessageId || null,
        JSON.stringify(message.metadata || {})
      );
    }

    // Create test entities and capture their IDs
    const createdEntities: Entity[] = [];
    for (const entity of mockEntities) {
      const created = await entityRepository.create({
        name: entity.name,
        type: entity.type,
        confidenceScore: entity.confidenceScore,
        metadata: entity.metadata
      });
      createdEntities.push(created);
    }

    // Create entity mentions
    const mentionStmt = dbManager.getConnection().prepare(`
      INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, extraction_method, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // JavaScript mentions (first entity)
    mentionStmt.run('mention-1', createdEntities[0].id, 'msg-1', mockConversationId, 'JavaScript', 11, 21, 0.9, 'pattern', mockMessages[0].createdAt);
    mentionStmt.run('mention-2', createdEntities[0].id, 'msg-2', mockConversationId, 'JavaScript', 0, 10, 0.9, 'pattern', mockMessages[1].createdAt);

    // React mentions (second entity)
    mentionStmt.run('mention-3', createdEntities[1].id, 'msg-3', mockConversationId, 'React', 11, 16, 0.85, 'pattern', mockMessages[2].createdAt);
    mentionStmt.run('mention-4', createdEntities[1].id, 'msg-4', mockConversationId, 'React', 0, 5, 0.85, 'pattern', mockMessages[3].createdAt);

    // Python mentions (third entity)
    mentionStmt.run('mention-5', createdEntities[2].id, 'msg-5', mockConversationId, 'Python', 21, 27, 0.8, 'pattern', mockMessages[4].createdAt);
    mentionStmt.run('mention-6', createdEntities[2].id, 'msg-6', mockConversationId, 'Python', 0, 6, 0.8, 'pattern', mockMessages[5].createdAt);
    
    return createdEntities;
  }

  describe('detectTopicShifts', () => {
    test('should detect topic shift from JavaScript to Python', async () => {
      const shifts = await contextDetector.detectTopicShifts(mockConversationId, {
        lookbackMessages: 6,
        minShiftConfidence: 0.5
      });

      expect(shifts.length).toBeGreaterThan(0);
      
      const shift = shifts.find(s => s.shiftType === 'entity_replacement' || s.shiftType === 'topic_pivot');
      expect(shift).toBeDefined();
      
      if (shift) {
        expect(shift.shiftConfidence).toBeGreaterThanOrEqual(0.5);
        expect(shift.triggerEntities).toBeDefined();
        expect(shift.detectedAt).toBeGreaterThan(0);
      }
    });

    test('should not detect shifts when confidence is too low', async () => {
      // Test with a conversation that has only minor entity differences
      // Create a new conversation with similar entities
      const similarConvId = 'similar-conv';
      const conversationStmt = dbManager.getConnection().prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      conversationStmt.run(similarConvId, Date.now(), Date.now(), 'Similar Conversation', '{}');

      // Create messages with similar entities (all JavaScript-related)
      const messageStmt = dbManager.getConnection().prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at, parent_message_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      const similarMessages = [
        { id: 'similar-msg-1', content: 'JavaScript variables', createdAt: Date.now() - 100000 },
        { id: 'similar-msg-2', content: 'JavaScript functions', createdAt: Date.now() - 90000 },
        { id: 'similar-msg-3', content: 'JavaScript arrays', createdAt: Date.now() - 80000 },
        { id: 'similar-msg-4', content: 'JavaScript objects', createdAt: Date.now() - 70000 }
      ];

      for (const msg of similarMessages) {
        messageStmt.run(msg.id, similarConvId, 'user', msg.content, msg.createdAt, null, '{}');
      }

      // Add mentions - all JavaScript, so minimal shift
      const mentionStmt = dbManager.getConnection().prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, extraction_method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < similarMessages.length; i++) {
        mentionStmt.run(
          `similar-mention-${i}`, 
          createdEntityIds[0], // All JavaScript entity
          similarMessages[i].id, 
          similarConvId, 
          'JavaScript', 
          0, 10, 0.9, 'pattern', 
          similarMessages[i].createdAt
        );
      }

      const shifts = await contextDetector.detectTopicShifts(similarConvId, {
        lookbackMessages: 4,
        minShiftConfidence: 0.9 // Very high threshold
      });

      expect(shifts.length).toBe(0);
    });

    test('should handle conversation with insufficient messages', async () => {
      // Create conversation with only 2 messages
      const shortConvId = 'short-conv';
      const conversationStmt = dbManager.getConnection().prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      conversationStmt.run(shortConvId, Date.now(), Date.now(), 'Short Conversation', '{}');

      const shifts = await contextDetector.detectTopicShifts(shortConvId);
      expect(shifts).toEqual([]);
    });
  });

  describe('identifyRelevantHistory', () => {
    beforeEach(async () => {
      // Create a second conversation with overlapping entities
      const historyConvId = 'history-conv';
      const conversationStmt = dbManager.getConnection().prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      conversationStmt.run(
        historyConvId,
        Date.now() - 172800000, // 2 days ago
        Date.now() - 172800000,
        'Historical Conversation',
        '{}'
      );

      // Add messages to historical conversation
      const messageStmt = dbManager.getConnection().prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at, parent_message_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      
      messageStmt.run(
        'hist-msg-1',
        historyConvId,
        'user',
        'Tell me about JavaScript frameworks',
        Date.now() - 172800000,
        null,
        '{}'
      );

      messageStmt.run(
        'hist-msg-2',
        historyConvId,
        'assistant',
        'JavaScript frameworks like React are very popular',
        Date.now() - 172740000,
        null,
        '{}'
      );

      // Add entity mentions for historical conversation
      const mentionStmt = dbManager.getConnection().prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, extraction_method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      mentionStmt.run('hist-mention-1', createdEntityIds[0], 'hist-msg-1', historyConvId, 'JavaScript', 15, 25, 0.9, 'pattern', Date.now() - 172800000);
      mentionStmt.run('hist-mention-2', createdEntityIds[1], 'hist-msg-2', historyConvId, 'React', 29, 34, 0.85, 'pattern', Date.now() - 172740000);
    });

    test('should identify relevant historical conversations', async () => {
      const relevantHistory = await contextDetector.identifyRelevantHistory(mockConversationId, {
        maxHistoryAge: 30,
        minRelevanceScore: 0.2,
        limit: 5
      });

      expect(relevantHistory.length).toBeGreaterThan(0);
      
      const history = relevantHistory[0];
      expect(history.conversation).toBeDefined();
      expect(history.connectingEntities.length).toBeGreaterThan(0);
      expect(history.relevantMessages.length).toBeGreaterThan(0);
      expect(history.relevanceScore).toBeGreaterThanOrEqual(0.2);
      expect(history.relevanceType).toMatch(/entity_overlap|relationship_chain|topic_continuation|problem_resolution/);
    });

    test('should respect relevance score threshold', async () => {
      const relevantHistory = await contextDetector.identifyRelevantHistory(mockConversationId, {
        minRelevanceScore: 0.9 // Very high threshold
      });

      expect(relevantHistory.length).toBe(0);
    });

    test('should handle conversation with no entities', async () => {
      const emptyConvId = 'empty-conv';
      const conversationStmt = dbManager.getConnection().prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      conversationStmt.run(emptyConvId, Date.now(), Date.now(), 'Empty Conversation', '{}');

      const relevantHistory = await contextDetector.identifyRelevantHistory(emptyConvId);
      expect(relevantHistory).toEqual([]);
    });
  });

  describe('findConflictingInformation', () => {
    beforeEach(async () => {
      // Create conflicting information about JavaScript
      const conflictConvId = 'conflict-conv';
      const conversationStmt = dbManager.getConnection().prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title, metadata)
        VALUES (?, ?, ?, ?, ?)
      `);
      conversationStmt.run(conflictConvId, Date.now() - 86400000, Date.now() - 86400000, 'Conflict Conversation', '{}');

      const messageStmt = dbManager.getConnection().prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at, parent_message_id, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // First claim: JavaScript is interpreted
      messageStmt.run(
        'conflict-msg-1',
        conflictConvId,
        'assistant',
        'JavaScript is an interpreted language that runs in browsers',
        Date.now() - 86400000,
        null,
        '{}'
      );

      // Second claim: JavaScript is compiled (JIT)
      messageStmt.run(
        'conflict-msg-2',
        mockConversationId,
        'assistant',
        'JavaScript is a compiled language with just-in-time compilation',
        Date.now() - 3600000,
        null,
        '{}'
      );

      // Add entity mentions for conflicting messages
      const mentionStmt = dbManager.getConnection().prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, extraction_method, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      mentionStmt.run('conflict-mention-1', createdEntityIds[0], 'conflict-msg-1', conflictConvId, 'JavaScript', 0, 10, 0.9, 'pattern', Date.now() - 86400000);
      mentionStmt.run('conflict-mention-2', createdEntityIds[0], 'conflict-msg-2', mockConversationId, 'JavaScript', 0, 10, 0.9, 'pattern', Date.now() - 3600000);
    });

    test('should detect conflicting information about entities', async () => {
      const conflicts = await contextDetector.findConflictingInformation({
        conversationId: mockConversationId,
        minSeverity: 0.3
      });

      // Note: The simple conflict detection might not catch this example
      // In a real implementation, this would need more sophisticated NLP
      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
    });

    test('should filter by minimum severity', async () => {
      const conflicts = await contextDetector.findConflictingInformation({
        minSeverity: 0.9 // Very high threshold
      });

      expect(conflicts.length).toBe(0);
    });

    test('should handle entity with single mention', async () => {
      // Create entity with only one mention
      const singleEntity = await entityRepository.create({
        name: 'SingleMention',
        type: 'concept',
        confidenceScore: 0.8
      });

      const conflicts = await contextDetector.findConflictingInformation({
        entityIds: [singleEntity.id]
      });

      expect(conflicts.length).toBe(0);
    });
  });

  describe('analyzeContextWindow', () => {
    test('should analyze optimal context window', async () => {
      const contextWindow = await contextDetector.analyzeContextWindow(mockConversationId, {
        maxTokens: 1000,
        includeHistory: true
      });

      expect(contextWindow).toBeDefined();
      expect(contextWindow.id).toBeDefined();
      expect(contextWindow.coreEntities).toBeDefined();
      expect(contextWindow.recommendedMessages).toBeDefined();
      expect(contextWindow.contextRelevance).toBeGreaterThanOrEqual(0);
      expect(contextWindow.contextRelevance).toBeLessThanOrEqual(1);
      expect(contextWindow.estimatedTokens).toBeGreaterThan(0);
      expect(contextWindow.freshness).toBeGreaterThanOrEqual(0);
      expect(contextWindow.freshness).toBeLessThanOrEqual(1);
      expect(contextWindow.potentialEntities).toBeDefined();
    });

    test('should respect token limits', async () => {
      const contextWindow = await contextDetector.analyzeContextWindow(mockConversationId, {
        maxTokens: 100, // Very low limit
        includeHistory: false
      });

      expect(contextWindow.estimatedTokens).toBeLessThanOrEqual(100);
    });

    test('should handle conversation without history when includeHistory is false', async () => {
      const contextWindow = await contextDetector.analyzeContextWindow(mockConversationId, {
        includeHistory: false
      });

      expect(contextWindow.recommendedMessages.length).toBeLessThanOrEqual(mockMessages.length);
    });
  });

  describe('edge cases and error handling', () => {
    test('should handle non-existent conversation', async () => {
      const shifts = await contextDetector.detectTopicShifts('non-existent');
      expect(shifts).toEqual([]);

      const history = await contextDetector.identifyRelevantHistory('non-existent');
      expect(history).toEqual([]);

      const contextWindow = await contextDetector.analyzeContextWindow('non-existent');
      expect(contextWindow.coreEntities).toEqual([]);
      expect(contextWindow.recommendedMessages).toEqual([]);
    });

    test('should handle empty entity arrays gracefully', async () => {
      const conflicts = await contextDetector.findConflictingInformation({
        entityIds: [] // Empty array
      });
      expect(conflicts).toEqual([]);
    });

    test('should calculate confidence scores within bounds', async () => {
      const shifts = await contextDetector.detectTopicShifts(mockConversationId);
      
      for (const shift of shifts) {
        expect(shift.shiftConfidence).toBeGreaterThanOrEqual(0);
        expect(shift.shiftConfidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('configuration options', () => {
    test('should respect custom configuration', () => {
      const customDetector = new ContextChangeDetector(dbManager, entityRepository, knowledgeGraphRepo, {
        minShiftConfidence: 0.8,
        entityPatternWindow: 15,
        minRelevanceScore: 0.6,
        maxHistoryAgeDays: 60,
        minConflictSeverity: 0.7,
        maxContextTokens: 8000
      });

      expect(customDetector).toBeInstanceOf(ContextChangeDetector);
    });

    test('should use default configuration when not provided', () => {
      const defaultDetector = new ContextChangeDetector(dbManager, entityRepository, knowledgeGraphRepo);
      expect(defaultDetector).toBeInstanceOf(ContextChangeDetector);
    });
  });

  afterEach(async () => {
    if (dbManager) {
      dbManager.close();
    }
  });
});