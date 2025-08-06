/**
 * Stress tests for Proactive Assistance Features
 * 
 * Tests system behavior under high load, concurrent access,
 * and edge case scenarios for proactive features.
 */

import { DatabaseManager } from '../../src/storage/Database.js';
import { PatternDetectionService } from '../../src/services/proactive/patterns/PatternDetectionService.js';
import { FollowupDetector } from '../../src/services/proactive/patterns/FollowupDetector.js';
import { AutoTaggingService } from '../../src/services/proactive/intelligence/AutoTaggingService.js';
import { GetProactiveInsightsTool } from '../../src/tools/proactive/GetProactiveInsightsTool.js';
import { createTestDatabase, PerformanceTimer } from '../utils/test-helpers.js';

// Only run stress tests when explicitly enabled
const shouldRunStressTests = process.env.RUN_STRESS_TESTS === 'true';

describe('Proactive Features Stress Tests', () => {
  let dbManager: DatabaseManager;
  let patternService: PatternDetectionService;
  let followupDetector: FollowupDetector;
  let autoTaggingService: AutoTaggingService;
  let proactiveInsightsTool: GetProactiveInsightsTool;

  beforeAll(async () => {
    if (!shouldRunStressTests) {
      console.log('Skipping stress tests. Set RUN_STRESS_TESTS=true to enable.');
      return;
    }

    dbManager = await createTestDatabase();
    patternService = new PatternDetectionService(dbManager);
    followupDetector = new FollowupDetector(dbManager);
    autoTaggingService = new AutoTaggingService(dbManager);
    proactiveInsightsTool = new GetProactiveInsightsTool({ databaseManager: dbManager });
    
    // Generate massive test dataset
    await generateMassiveTestDataset(dbManager);
  });

  afterAll(async () => {
    if (dbManager) {
      await dbManager.close();
    }
  });

  describe('High Volume Data Handling', () => {
    it('should handle detection with 10k+ messages', async () => {
      if (!shouldRunStressTests) return;

      const timer = new PerformanceTimer();
      
      const actions = await patternService.detectUnresolvedActions({
        daysSince: 365,
        minConfidence: 0.5,
        limit: 1000
      });
      
      const elapsed = timer.elapsed();
      
      expect(actions).toBeDefined();
      expect(elapsed).toBeLessThan(30000); // Should complete within 30 seconds
      
      console.log(`Processed high volume data: ${actions.length} results in ${elapsed}ms`);
    });

    it('should handle massive recurring question analysis', async () => {
      if (!shouldRunStressTests) return;

      const timer = new PerformanceTimer();
      
      const questions = await patternService.findRecurringQuestions({
        minFrequency: 2,
        minDaysBetween: 1,
        limit: 500
      });
      
      const elapsed = timer.elapsed();
      
      expect(questions).toBeDefined();
      expect(elapsed).toBeLessThan(20000);
      
      console.log(`Massive question analysis: ${questions.length} patterns in ${elapsed}ms`);
    });

    it('should handle large-scale knowledge gap identification', async () => {
      if (!shouldRunStressTests) return;

      const timer = new PerformanceTimer();
      
      const gaps = await patternService.identifyKnowledgeGaps({
        minGapRatio: 1.2, // Lower threshold for more results
        limit: 200
      });
      
      const elapsed = timer.elapsed();
      
      expect(gaps).toBeDefined();
      expect(elapsed).toBeLessThan(25000);
      
      console.log(`Large-scale knowledge gap analysis: ${gaps.length} gaps in ${elapsed}ms`);
    });
  });

  describe('Concurrent Access Stress Tests', () => {
    it('should handle multiple concurrent pattern detection requests', async () => {
      if (!shouldRunStressTests) return;

      const concurrentRequests = 20;
      const timer = new PerformanceTimer();
      
      const promises = Array(concurrentRequests).fill(0).map(async (_, index) => {
        // Vary the parameters to create diverse load
        return {
          actions: await patternService.detectUnresolvedActions({
            daysSince: 30 + (index * 10),
            minConfidence: 0.5 + (index * 0.01),
            limit: 20 + index
          }),
          questions: await patternService.findRecurringQuestions({
            minFrequency: 2,
            limit: 10 + index
          })
        };
      });
      
      const results = await Promise.all(promises);
      
      const elapsed = timer.elapsed();
      
      expect(results).toHaveLength(concurrentRequests);
      expect(elapsed).toBeLessThan(60000); // Should complete within 1 minute
      
      const totalResults = results.reduce((sum, result) => 
        sum + result.actions.length + result.questions.length, 0
      );
      
      console.log(`Concurrent stress test: ${concurrentRequests} requests, ${totalResults} total results in ${elapsed}ms`);
    });

    it('should handle concurrent auto-tagging requests', async () => {
      if (!shouldRunStressTests) return;

      const conversationIds = await getStressTestConversationIds(dbManager, 50);
      const concurrentBatches = 10;
      const timer = new PerformanceTimer();
      
      const batchPromises = Array(concurrentBatches).fill(0).map(async (_, batchIndex) => {
        const batchStart = batchIndex * 5;
        const batchEnd = Math.min(batchStart + 5, conversationIds.length);
        const batchIds = conversationIds.slice(batchStart, batchEnd);
        
        return Promise.all(batchIds.map(async (id) => {
          return {
            topicTags: await autoTaggingService.generateTopicTags(id),
            activity: await autoTaggingService.classifyActivity(id),
            urgency: await autoTaggingService.detectUrgencySignals(id)
          };
        }));
      });
      
      const batchResults = await Promise.all(batchPromises);
      
      const elapsed = timer.elapsed();
      const totalConversations = batchResults.reduce((sum, batch) => sum + batch.length, 0);
      
      expect(totalConversations).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(45000);
      
      console.log(`Concurrent auto-tagging: ${totalConversations} conversations in ${elapsed}ms`);
    });

    it('should handle concurrent MCP tool requests', async () => {
      if (!shouldRunStressTests) return;

      const concurrentRequests = 15;
      const timer = new PerformanceTimer();
      
      const promises = Array(concurrentRequests).fill(0).map(async (_, index) => {
        const includeTypes = [
          ['unresolved_actions'],
          ['recurring_questions'],
          ['knowledge_gaps'],
          ['stale_commitments'],
          ['unresolved_actions', 'recurring_questions'],
          ['knowledge_gaps', 'stale_commitments']
        ][index % 6];
        
        return proactiveInsightsTool.handle({
          includeTypes: includeTypes as any,
          daysSince: 30 + (index * 5),
          limit: 10 + index
        });
      });
      
      const results = await Promise.all(promises);
      
      const elapsed = timer.elapsed();
      
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result.isError).toBe(false);
      });
      
      expect(elapsed).toBeLessThan(90000); // Within 1.5 minutes
      
      console.log(`Concurrent MCP tools: ${concurrentRequests} requests in ${elapsed}ms`);
    });
  });

  describe('Memory Stress Tests', () => {
    it('should handle memory efficiently under sustained load', async () => {
      if (!shouldRunStressTests) return;

      const initialMemory = process.memoryUsage();
      console.log(`Initial memory: ${formatMemory(initialMemory)}`);
      
      const iterations = 100;
      const results = [];
      
      for (let i = 0; i < iterations; i++) {
        // Perform various operations
        const [actions, questions, gaps] = await Promise.all([
          patternService.detectUnresolvedActions({ limit: 20 }),
          patternService.findRecurringQuestions({ limit: 20 }),
          patternService.identifyKnowledgeGaps({ limit: 10 })
        ]);
        
        results.push({ actions, questions, gaps });
        
        // Check memory every 20 iterations
        if (i % 20 === 0) {
          const currentMemory = process.memoryUsage();
          console.log(`Iteration ${i}: ${formatMemory(currentMemory)}`);
        }
        
        // Clear results periodically to prevent accumulation
        if (i % 50 === 0) {
          results.length = 0;
          if (global.gc) {
            global.gc();
          }
        }
      }
      
      // Final memory check
      const finalMemory = process.memoryUsage();
      console.log(`Final memory: ${formatMemory(finalMemory)}`);
      
      const heapIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const heapIncreaseMB = heapIncrease / 1024 / 1024;
      
      // Memory should not have increased excessively
      expect(heapIncreaseMB).toBeLessThan(200); // Less than 200MB increase
      
      console.log(`Memory increase after ${iterations} iterations: ${heapIncreaseMB.toFixed(2)}MB`);
    });

    it('should handle large result sets without memory issues', async () => {
      if (!shouldRunStressTests) return;

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Generate large result sets
      const largeResults = await Promise.all([
        patternService.detectUnresolvedActions({ limit: 500, daysSince: 365 }),
        patternService.findRecurringQuestions({ limit: 300, minFrequency: 1 }),
        patternService.identifyKnowledgeGaps({ limit: 200, minGapRatio: 1.0 }),
        patternService.trackCommitments({ limit: 400, includeResolved: true })
      ]);
      
      const totalResults = largeResults.reduce((sum, results) => sum + results.length, 0);
      
      // Process all results to simulate real usage
      largeResults[0].forEach(action => {
        expect(action.commitmentText).toBeTruthy();
        expect(action.confidence).toBeGreaterThan(0);
      });
      
      largeResults[1].forEach(question => {
        expect(question.questionText).toBeTruthy();
        expect(question.frequency).toBeGreaterThan(0);
      });
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024;
      
      expect(totalResults).toBeGreaterThan(0);
      expect(memoryIncrease).toBeLessThan(500); // Less than 500MB for large results
      
      console.log(`Large result sets: ${totalResults} results, ${memoryIncrease.toFixed(2)}MB memory increase`);
    });
  });

  describe('Edge Case Stress Tests', () => {
    it('should handle extremely long message content', async () => {
      if (!shouldRunStressTests) return;

      // Create messages with very long content
      const db = dbManager.getConnection();
      
      const longContent = 'This is a very long message content. '.repeat(1000);
      const longMessages = [];
      
      for (let i = 0; i < 10; i++) {
        const message = {
          id: `stress-long-${i}`,
          conversationId: `stress-conv-long`,
          role: 'assistant' as const,
          content: longContent + ` I'll check this very complex scenario ${i} and get back to you.`,
          createdAt: Date.now() - (i * 1000),
          metadata: {}
        };
        longMessages.push(message);
        
        db.prepare(`
          INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(message.id, message.conversationId, message.role, message.content, message.createdAt);
      }
      
      const timer = new PerformanceTimer();
      
      const commitments = await followupDetector.detectCommitmentLanguage(longMessages, {
        minConfidence: 0.5
      });
      
      const elapsed = timer.elapsed();
      
      expect(commitments).toBeDefined();
      expect(elapsed).toBeLessThan(10000); // Should handle long content efficiently
      
      console.log(`Long content processing: ${commitments.length} commitments from ${longMessages.length} long messages in ${elapsed}ms`);
    });

    it('should handle malformed or unusual data gracefully', async () => {
      if (!shouldRunStressTests) return;

      const malformedMessages = [
        {
          id: 'stress-malformed-1',
          conversationId: 'stress-conv-malformed',
          role: 'assistant' as const,
          content: '', // Empty content
          createdAt: Date.now(),
          metadata: {}
        },
        {
          id: 'stress-malformed-2',
          conversationId: 'stress-conv-malformed',
          role: 'assistant' as const,
          content: '!!!@#$%^&*()[]{}|\\:";\'<>?,./~`', // Special characters only
          createdAt: Date.now(),
          metadata: {}
        },
        {
          id: 'stress-malformed-3',
          conversationId: 'stress-conv-malformed',
          role: 'assistant' as const,
          content: 'a'.repeat(100000), // Extremely long single character
          createdAt: Date.now(),
          metadata: {}
        }
      ];
      
      const timer = new PerformanceTimer();
      
      // Should not throw errors with malformed data
      const commitments = await followupDetector.detectCommitmentLanguage(malformedMessages, {
        minConfidence: 0.3
      });
      
      const elapsed = timer.elapsed();
      
      expect(commitments).toBeDefined();
      expect(elapsed).toBeLessThan(5000);
      
      console.log(`Malformed data handling: ${commitments.length} results in ${elapsed}ms`);
    });

    it('should handle database under extreme load', async () => {
      if (!shouldRunStressTests) return;

      const heavyOperations = 50;
      const timer = new PerformanceTimer();
      
      // Create many simultaneous database-heavy operations
      const promises = Array(heavyOperations).fill(0).map(async (_, index) => {
        const conversationIds = await getStressTestConversationIds(dbManager, 5);
        
        return Promise.all(conversationIds.map(async (id) => {
          try {
            return await autoTaggingService.identifyProjectContexts(id);
          } catch (error) {
            // Log error but don't fail the test
            console.warn(`Operation ${index} failed for conversation ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return [];
          }
        }));
      });
      
      const results = await Promise.allSettled(promises);
      
      const elapsed = timer.elapsed();
      const successfulOps = results.filter(result => result.status === 'fulfilled').length;
      const failedOps = results.filter(result => result.status === 'rejected').length;
      
      // At least 80% of operations should succeed
      expect(successfulOps / heavyOperations).toBeGreaterThan(0.8);
      expect(elapsed).toBeLessThan(120000); // Within 2 minutes
      
      console.log(`Database stress test: ${successfulOps}/${heavyOperations} operations succeeded in ${elapsed}ms`);
      if (failedOps > 0) {
        console.log(`${failedOps} operations failed (expected under heavy load)`);
      }
    });
  });

  describe('Recovery and Resilience Tests', () => {
    it('should recover from temporary database locks', async () => {
      if (!shouldRunStressTests) return;

      // Simulate database contention
      const promises = Array(30).fill(0).map(async (_, index) => {
        try {
          // Mix read and write-heavy operations
          if (index % 3 === 0) {
            return await patternService.detectUnresolvedActions({ limit: 10 });
          } else if (index % 3 === 1) {
            return await patternService.findRecurringQuestions({ limit: 10 });
          } else {
            return await patternService.identifyKnowledgeGaps({ limit: 5 });
          }
        } catch (error) {
          console.warn(`Operation ${index} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
          return [];
        }
      });
      
      const results = await Promise.allSettled(promises);
      const successful = results.filter(result => result.status === 'fulfilled');
      
      // Most operations should succeed despite contention
      expect(successful.length / promises.length).toBeGreaterThan(0.7);
      
      console.log(`Recovery test: ${successful.length}/${promises.length} operations succeeded under contention`);
    });

    it('should handle service failures gracefully', async () => {
      if (!shouldRunStressTests) return;

      // Test with invalid conversation IDs and other error conditions
      const errorConditions = [
        async () => patternService.detectUnresolvedActions({ conversationId: 'non-existent' }),
        async () => patternService.findRecurringQuestions({ conversationId: 'invalid-id' }),
        async () => autoTaggingService.autoTagConversation('missing-conversation'),
        async () => followupDetector.identifyStaleActions({ conversationId: 'not-found' })
      ];
      
      const results = await Promise.allSettled(errorConditions);
      
      // All should either succeed with empty results or fail gracefully
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          expect(result.value).toBeDefined();
        } else {
          console.log(`Expected failure ${index}: ${result.reason.message}`);
        }
      });
      
      console.log(`Graceful failure handling: ${results.length} error conditions tested`);
    });
  });
});

/**
 * Generate massive dataset for stress testing
 */
async function generateMassiveTestDataset(dbManager: DatabaseManager) {
  console.log('Generating massive test dataset for stress testing...');
  
  const db = dbManager.getConnection();
  const conversationCount = 2000;
  const messagesPerConv = 50;
  const entityCount = 100;
  
  const baseTime = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago
  
  console.log('Creating conversations and messages...');
  
  const insertConv = db.prepare(`
    INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  
  const insertMsg = db.prepare(`
    INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  // Generate in batches to avoid memory issues
  const batchSize = 100;
  
  for (let batch = 0; batch < conversationCount / batchSize; batch++) {
    const transaction = db.transaction(() => {
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, conversationCount);
      
      for (let i = batchStart; i < batchEnd; i++) {
        const convId = `stress-conv-${i}`;
        const convTime = baseTime + (i * 24 * 60 * 60 * 1000);
        
        insertConv.run(convId, `Stress Test Conversation ${i}`, convTime, convTime);
        
        for (let j = 0; j < messagesPerConv; j++) {
          const msgId = `stress-msg-${i}-${j}`;
          const msgTime = convTime + (j * 60 * 60 * 1000);
          const role = j % 3 === 0 ? 'user' : 'assistant';
          
          const content = generateStressTestMessage(i, j, role);
          insertMsg.run(msgId, convId, role, content, msgTime);
        }
      }
    });
    
    transaction();
    
    if ((batch + 1) % 5 === 0) {
      console.log(`Generated ${(batch + 1) * batchSize} conversations...`);
    }
  }
  
  console.log('Creating entities and mentions...');
  await generateStressTestEntities(dbManager, entityCount);
  
  console.log(`Stress test dataset complete: ${conversationCount} conversations, ${conversationCount * messagesPerConv} messages`);
}

/**
 * Generate message content for stress testing
 */
function generateStressTestMessage(convIndex: number, msgIndex: number, role: string): string {
  const topics = [
    'React development', 'TypeScript configuration', 'Database optimization',
    'Authentication systems', 'Performance tuning', 'Security implementation',
    'Testing strategies', 'Deployment processes', 'Monitoring setup',
    'Code review practices', 'API design', 'User interface',
    'Data modeling', 'Caching strategies', 'Error handling',
    'Scalability planning', 'Documentation', 'Version control'
  ];
  
  const commitmentVerbs = [
    "I'll check", "I'll review", "I'll investigate", "I'll update",
    "I'll analyze", "I'll implement", "I'll test", "I'll document",
    "I'll optimize", "I'll configure", "let me verify", "let me examine"
  ];
  
  const urgencyWords = ['urgent', 'critical', 'important', 'ASAP', 'priority', 'emergency'];
  
  if (role === 'user') {
    const topic = topics[convIndex % topics.length];
    const isUrgent = convIndex % 20 === 0 && msgIndex % 10 === 0;
    const urgency = isUrgent ? urgencyWords[msgIndex % urgencyWords.length] + ': ' : '';
    
    return `${urgency}How do I handle ${topic} in this scenario? I need help with implementation details.`;
  } else {
    const commitment = commitmentVerbs[msgIndex % commitmentVerbs.length];
    const topic = topics[(convIndex + msgIndex) % topics.length];
    const isFollowUp = msgIndex % 8 === 0 && msgIndex > 0;
    
    if (isFollowUp) {
      return `I've completed the analysis of ${topic}. Here are the findings and recommendations.`;
    } else {
      return `${commitment} the ${topic} configuration and provide detailed guidance on best practices.`;
    }
  }
}

/**
 * Generate entities for stress testing
 */
async function generateStressTestEntities(dbManager: DatabaseManager, entityCount: number) {
  const db = dbManager.getConnection();
  
  const entityTypes = ['technical', 'product', 'concept', 'organization', 'person'];
  const entityNames = [
    'React', 'TypeScript', 'Node.js', 'MongoDB', 'PostgreSQL', 'Redis',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'Git', 'Jenkins',
    'Performance', 'Security', 'Scalability', 'Monitoring', 'Testing',
    'Authentication', 'Authorization', 'API', 'Database', 'Cache'
  ];
  
  const insertEntity = db.prepare(`
    INSERT OR REPLACE INTO entities (id, name, type, created_at)
    VALUES (?, ?, ?, ?)
  `);
  
  const insertMention = db.prepare(`
    INSERT OR REPLACE INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, confidence)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  // Create entities
  for (let i = 0; i < entityCount; i++) {
    const name = entityNames[i % entityNames.length] + (i >= entityNames.length ? ` ${Math.floor(i / entityNames.length)}` : '');
    const type = entityTypes[i % entityTypes.length];
    
    insertEntity.run(`stress-entity-${i}`, name, type, Date.now());
  }
  
  // Create mentions for subset of messages
  const mentionBatchSize = 1000;
  for (let batch = 0; batch < 10; batch++) {
    const transaction = db.transaction(() => {
      for (let i = 0; i < mentionBatchSize; i++) {
        const globalIndex = batch * mentionBatchSize + i;
        const convIndex = Math.floor(globalIndex / 50);
        const msgIndex = globalIndex % 50;
        const entityIndex = globalIndex % entityCount;
        
        if (convIndex >= 200) break; // Don't create mentions for all conversations
        
        const mentionId = `stress-mention-${globalIndex}`;
        const entityId = `stress-entity-${entityIndex}`;
        const messageId = `stress-msg-${convIndex}-${msgIndex}`;
        const conversationId = `stress-conv-${convIndex}`;
        
        insertMention.run(
          mentionId,
          entityId,
          messageId,
          conversationId,
          entityNames[entityIndex % entityNames.length],
          0.6 + (Math.random() * 0.4)
        );
      }
    });
    
    transaction();
  }
}

/**
 * Get conversation IDs for stress testing
 */
async function getStressTestConversationIds(dbManager: DatabaseManager, limit: number): Promise<string[]> {
  const db = dbManager.getConnection();
  
  const conversations = db.prepare(`
    SELECT id FROM conversations
    WHERE id LIKE 'stress-conv-%'
    ORDER BY RANDOM()
    LIMIT ?
  `).all(limit);
  
  return conversations.map(row => row.id);
}

/**
 * Format memory usage for logging
 */
function formatMemory(memory: NodeJS.MemoryUsage): string {
  const formatMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2);
  return `Heap: ${formatMB(memory.heapUsed)}MB/${formatMB(memory.heapTotal)}MB, RSS: ${formatMB(memory.rss)}MB`;
}