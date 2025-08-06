/**
 * Integration tests for Context Change Detector with repository layer
 */

import { describe, beforeAll, afterAll, test, expect } from '@jest/globals';
import { DatabaseManager } from '../../src/storage/Database.js';
import { EntityRepository } from '../../src/storage/repositories/EntityRepository.js';
import { KnowledgeGraphRepository } from '../../src/storage/repositories/KnowledgeGraphRepository.js';
import { ConversationRepository } from '../../src/storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../../src/storage/repositories/MessageRepository.js';
import { ContextChangeDetector } from '../../src/services/proactive/intelligence/ContextChangeDetector.js';
import { EntityExtractionService } from '../../src/entities/EntityExtractionService.js';
import path from 'path';
import os from 'os';

describe('Context Change Detector Integration', () => {
  let dbManager: DatabaseManager;
  let contextDetector: ContextChangeDetector;
  let conversationRepository: ConversationRepository;
  let messageRepository: MessageRepository;
  let entityExtractionService: EntityExtractionService;
  let testDbPath: string;

  beforeAll(async () => {
    // Create test database
    testDbPath = path.join(os.tmpdir(), `test-context-integration-${Date.now()}.db`);
    
    dbManager = new DatabaseManager({ databasePath: testDbPath });
    await dbManager.initialize();
    
    const entityRepository = new EntityRepository(dbManager);
    const knowledgeGraphRepo = new KnowledgeGraphRepository(dbManager.getConnection());
    
    contextDetector = new ContextChangeDetector(dbManager, entityRepository, knowledgeGraphRepo, {
      minShiftConfidence: 0.6,
      minRelevanceScore: 0.3,
      maxHistoryAgeDays: 30
    });
    
    conversationRepository = new ConversationRepository(dbManager);
    messageRepository = new MessageRepository(dbManager);
    entityExtractionService = new EntityExtractionService(dbManager);
  });

  afterAll(async () => {
    if (dbManager) {
      dbManager.close();
    }
  });

  test('should integrate with message saving and entity extraction workflow', async () => {
    const conversationId = 'integration-test-conv';
    
    // Step 1: Create conversation and save messages using repositories
    await conversationRepository.create({
      id: conversationId,
      title: 'Integration Test Conversation',
      metadata: { source: 'integration-test' }
    });

    const messages = [
      {
        conversationId,
        role: 'user' as const,
        content: 'I need help with JavaScript closures and scope',
        metadata: { source: 'integration-test' }
      },
      {
        conversationId,
        role: 'assistant' as const,
        content: 'JavaScript closures are functions that retain access to their outer scope',
        metadata: { source: 'integration-test' }
      },
      {
        conversationId,
        role: 'user' as const,
        content: 'Now I want to switch to Python classes and inheritance',
        metadata: { source: 'integration-test' }
      },
      {
        conversationId,
        role: 'assistant' as const,
        content: 'Python classes provide a powerful object-oriented programming model',
        metadata: { source: 'integration-test' }
      }
    ];

    const savedMessages = [];
    for (const msgData of messages) {
      const message = await messageRepository.create(msgData);
      savedMessages.push(message);
      
      // Extract entities from each message
      await entityExtractionService.processMessage(
        message.id,
        message.conversationId,
        message.content
      );
    }

    expect(savedMessages.length).toBe(4);

    // Step 2: Use Context Change Detector to analyze the conversation
    const topicShifts = await contextDetector.detectTopicShifts(conversationId, {
      lookbackMessages: 4,
      minShiftConfidence: 0.5
    });

    // Should detect a shift from JavaScript to Python
    expect(topicShifts.length).toBeGreaterThan(0);
    
    const contextWindow = await contextDetector.analyzeContextWindow(conversationId, {
      maxTokens: 1500,
      includeHistory: false
    });
    
    // Verify context window is populated
    expect(contextWindow.coreEntities.length).toBeGreaterThan(0);
    expect(contextWindow.recommendedMessages.length).toBe(4);
    expect(contextWindow.contextRelevance).toBeGreaterThan(0);
    expect(contextWindow.estimatedTokens).toBeGreaterThan(0);
    expect(contextWindow.freshness).toBeGreaterThan(0.5); // Should be fresh
  });

  test('should detect relevant history across multiple conversations', async () => {
    // Create first conversation about React
    const conv1Id = 'react-conversation';
    await conversationRepository.create({
      id: conv1Id,
      title: 'React Discussion',
      metadata: {}
    });

    const reactMessages = [
      {
        conversationId: conv1Id,
        role: 'user' as const,
        content: 'How do React hooks work?',
        metadata: {}
      },
      {
        conversationId: conv1Id,
        role: 'assistant' as const,
        content: 'React hooks let you use state in functional components',
        metadata: {}
      }
    ];

    for (const msgData of reactMessages) {
      const message = await messageRepository.create(msgData);
      await entityExtractionService.processMessage(
        message.id,
        message.conversationId,
        message.content
      );
    }

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create second conversation also about React
    const conv2Id = 'react-followup-conversation';
    await conversationRepository.create({
      id: conv2Id,
      title: 'React Follow-up',
      metadata: {}
    });

    const followupMessages = [
      {
        conversationId: conv2Id,
        role: 'user' as const,
        content: 'I want to learn more about React useEffect',
        metadata: {}
      },
      {
        conversationId: conv2Id,
        role: 'assistant' as const,
        content: 'React useEffect is used for side effects in functional components',
        metadata: {}
      }
    ];

    for (const msgData of followupMessages) {
      const message = await messageRepository.create(msgData);
      await entityExtractionService.processMessage(
        message.id,
        message.conversationId,
        message.content
      );
    }

    // Find relevant history from the second conversation's perspective
    const relevantHistory = await contextDetector.identifyRelevantHistory(conv2Id, {
      maxHistoryAge: 1, // 1 day
      minRelevanceScore: 0.2,
      limit: 5
    });

    // Should find the first React conversation as relevant
    expect(relevantHistory.length).toBeGreaterThan(0);
    
    const reactHistory = relevantHistory.find(h => h.conversation.id === conv1Id);
    expect(reactHistory).toBeDefined();
    
    if (reactHistory) {
      expect(reactHistory.connectingEntities.length).toBeGreaterThan(0);
      expect(reactHistory.relevanceType).toMatch(/entity_overlap|topic_continuation/);
      expect(reactHistory.relevanceScore).toBeGreaterThan(0.2);
    }
  });

  test('should handle empty or minimal data gracefully', async () => {
    const emptyConvId = 'empty-conversation';
    
    // Create conversation with minimal content
    await conversationRepository.create({
      id: emptyConvId,
      title: 'Empty Conversation',
      metadata: {}
    });

    await messageRepository.create({
      conversationId: emptyConvId,
      role: 'user',
      content: 'Hello world',
      metadata: {}
    });

    // Context change detection should handle empty entity sets
    const shifts = await contextDetector.detectTopicShifts(emptyConvId);
    expect(shifts).toEqual([]);

    const history = await contextDetector.identifyRelevantHistory(emptyConvId);
    expect(history).toEqual([]);

    const conflicts = await contextDetector.findConflictingInformation({
      conversationId: emptyConvId
    });
    expect(conflicts).toEqual([]);

    const contextWindow = await contextDetector.analyzeContextWindow(emptyConvId);
    expect(contextWindow.coreEntities).toEqual([]);
    expect(contextWindow.recommendedMessages.length).toBe(1); // The single message
  });

  test('should maintain performance with larger datasets', async () => {
    const perfConvId = 'performance-test-conv';
    
    // Create conversation
    await conversationRepository.create({
      id: perfConvId,
      title: 'Performance Test',
      metadata: {}
    });

    // Create a larger conversation
    const manyMessages = Array.from({ length: 50 }, (_, i) => ({
      conversationId: perfConvId,
      role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
      content: `Message ${i + 1}: This discusses ${i % 2 === 0 ? 'JavaScript' : 'Python'} programming concepts`,
      metadata: {}
    }));

    const startTime = Date.now();
    
    // Save all messages
    for (const msgData of manyMessages) {
      const message = await messageRepository.create(msgData);
      await entityExtractionService.processMessage(
        message.id,
        message.conversationId,
        message.content
      );
    }

    const insertTime = Date.now() - startTime;
    console.log(`Inserted ${manyMessages.length} messages in ${insertTime}ms`);

    // Test performance of context analysis
    const analysisStartTime = Date.now();
    
    const shifts = await contextDetector.detectTopicShifts(perfConvId, {
      lookbackMessages: 20
    });
    
    const contextWindow = await contextDetector.analyzeContextWindow(perfConvId, {
      maxTokens: 2000
    });
    
    const analysisTime = Date.now() - analysisStartTime;
    console.log(`Context analysis completed in ${analysisTime}ms`);
    
    // Should complete in reasonable time (less than 5 seconds)
    expect(analysisTime).toBeLessThan(5000);
    
    // Should detect some shifts due to alternating entities
    expect(shifts.length).toBeGreaterThan(0);
    expect(contextWindow.coreEntities.length).toBeGreaterThan(0);
  });
});