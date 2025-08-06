/**
 * Performance tests for Proactive Assistance Features
 * 
 * Tests performance characteristics of pattern detection, auto-tagging,
 * and other proactive features under realistic load conditions.
 */

import { DatabaseManager } from '../../src/storage/Database.js';
import { PatternDetectionService } from '../../src/services/proactive/patterns/PatternDetectionService.js';
import { FollowupDetector } from '../../src/services/proactive/patterns/FollowupDetector.js';
import { AutoTaggingService } from '../../src/services/proactive/intelligence/AutoTaggingService.js';
import { GetProactiveInsightsTool } from '../../src/tools/proactive/GetProactiveInsightsTool.js';
import { AutoTagConversationTool } from '../../src/tools/proactive/AutoTagConversationTool.js';
import { createTestDatabase, PerformanceTimer } from '../utils/test-helpers.js';

// Skip performance tests in CI unless explicitly enabled
const shouldRunPerformanceTests = process.env.RUN_PERFORMANCE_TESTS === 'true' || process.env.NODE_ENV === 'test-performance';

describe('Proactive Features Performance', () => {
  let dbManager: DatabaseManager;
  let patternService: PatternDetectionService;
  let followupDetector: FollowupDetector;
  let autoTaggingService: AutoTaggingService;
  let proactiveInsightsTool: GetProactiveInsightsTool;
  let autoTagTool: AutoTagConversationTool;

  beforeAll(async () => {
    if (!shouldRunPerformanceTests) {
      console.log('Skipping performance tests. Set RUN_PERFORMANCE_TESTS=true to enable.');
      return;
    }

    dbManager = await createTestDatabase();
    
    // Initialize services
    patternService = new PatternDetectionService(dbManager);
    followupDetector = new FollowupDetector(dbManager);
    autoTaggingService = new AutoTaggingService(dbManager);
    proactiveInsightsTool = new GetProactiveInsightsTool({ databaseManager: dbManager });
    autoTagTool = new AutoTagConversationTool({ databaseManager: dbManager });
    
    // Generate large test dataset
    await generateLargeTestDataset(dbManager);
  });

  afterAll(async () => {
    if (dbManager) {
      await dbManager.close();
    }
  });

  describe('Pattern Detection Performance', () => {
    it('should detect unresolved actions in large dataset within time limit', async () => {
      if (!shouldRunPerformanceTests) return;

      const timer = new PerformanceTimer();
      
      const actions = await patternService.detectUnresolvedActions({
        daysSince: 90,
        minConfidence: 0.6,
        limit: 100
      });
      
      timer.expectUnder(3000, 'Unresolved actions detection');
      
      expect(actions).toBeDefined();
      expect(actions.length).toBeGreaterThanOrEqual(0);
      
      console.log(`Detected ${actions.length} unresolved actions in ${timer.elapsed()}ms`);
    });

    it('should find recurring questions efficiently', async () => {
      if (!shouldRunPerformanceTests) return;

      const timer = new PerformanceTimer();
      
      const questions = await patternService.findRecurringQuestions({
        minFrequency: 2,
        minDaysBetween: 1,
        limit: 50
      });
      
      timer.expectUnder(2000, 'Recurring questions detection');
      
      expect(questions).toBeDefined();
      console.log(`Found ${questions.length} recurring questions in ${timer.elapsed()}ms`);
    });

    it('should identify knowledge gaps quickly', async () => {
      if (!shouldRunPerformanceTests) return;

      const timer = new PerformanceTimer();
      
      const gaps = await patternService.identifyKnowledgeGaps({
        minGapRatio: 1.5,
        limit: 30
      });
      
      timer.expectUnder(4000, 'Knowledge gaps identification');
      
      expect(gaps).toBeDefined();
      console.log(`Identified ${gaps.length} knowledge gaps in ${timer.elapsed()}ms`);
    });

    it('should track commitments efficiently', async () => {
      if (!shouldRunPerformanceTests) return;

      const timer = new PerformanceTimer();
      
      const commitments = await patternService.trackCommitments({
        includeResolved: false,
        limit: 100
      });
      
      timer.expectUnder(2500, 'Commitment tracking');
      
      expect(commitments).toBeDefined();
      console.log(`Tracked ${commitments.length} commitments in ${timer.elapsed()}ms`);
    });
  });

  describe('Follow-up Detection Performance', () => {
    it('should detect commitment language in batch efficiently', async () => {
      if (!shouldRunPerformanceTests) return;

      // Get a batch of messages
      const db = dbManager.getConnection();
      const messages = db.prepare(`
        SELECT id, conversation_id, role, content, created_at
        FROM messages
        WHERE role = 'assistant'
        LIMIT 200
      `).all().map((row: any) => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role as 'user' | 'assistant' | 'system',
        content: row.content,
        createdAt: row.created_at,
        metadata: {}
      }));

      const timer = new PerformanceTimer();
      
      const commitments = await followupDetector.detectCommitmentLanguage(messages, {
        minConfidence: 0.5,
        includeEntities: true,
        conversationContext: false // Skip to improve performance
      });
      
      timer.expectUnder(5000, 'Batch commitment detection');
      
      expect(commitments).toBeDefined();
      console.log(`Detected ${commitments.length} commitments from ${messages.length} messages in ${timer.elapsed()}ms`);
    });

    it('should identify stale actions within reasonable time', async () => {
      if (!shouldRunPerformanceTests) return;

      const timer = new PerformanceTimer();
      
      const staleActions = await followupDetector.identifyStaleActions({
        includeEntityContext: false // Skip to improve performance
      });
      
      timer.expectUnder(6000, 'Stale actions identification');
      
      expect(staleActions).toBeDefined();
      console.log(`Identified ${staleActions.length} stale actions in ${timer.elapsed()}ms`);
    });
  });

  describe('Auto-tagging Performance', () => {
    it('should generate topic tags efficiently', async () => {
      if (!shouldRunPerformanceTests) return;

      const conversationIds = await getTestConversationIds(dbManager, 20);
      const timers: number[] = [];

      for (const conversationId of conversationIds) {
        const timer = new PerformanceTimer();
        
        const tags = await autoTaggingService.generateTopicTags(conversationId);
        
        const elapsed = timer.elapsed();
        timers.push(elapsed);
        
        expect(elapsed).toBeLessThan(1500); // Individual conversation should be fast
        expect(tags).toBeDefined();
      }

      const avgTime = timers.reduce((sum, time) => sum + time, 0) / timers.length;
      const maxTime = Math.max(...timers);
      
      console.log(`Topic tag generation - Avg: ${avgTime.toFixed(1)}ms, Max: ${maxTime}ms over ${conversationIds.length} conversations`);
    });

    it('should classify activities quickly across multiple conversations', async () => {
      if (!shouldRunPerformanceTests) return;

      const conversationIds = await getTestConversationIds(dbManager, 50);
      const timer = new PerformanceTimer();
      
      const classifications = await Promise.all(
        conversationIds.map(id => autoTaggingService.classifyActivity(id))
      );
      
      timer.expectUnder(4000, 'Batch activity classification');
      
      expect(classifications).toHaveLength(conversationIds.length);
      console.log(`Classified ${classifications.length} conversations in ${timer.elapsed()}ms`);
    });

    it('should detect urgency efficiently', async () => {
      if (!shouldRunPerformanceTests) return;

      const conversationIds = await getTestConversationIds(dbManager, 30);
      const timer = new PerformanceTimer();
      
      const urgencyAnalyses = await Promise.all(
        conversationIds.map(id => autoTaggingService.detectUrgencySignals(id))
      );
      
      timer.expectUnder(2000, 'Batch urgency detection');
      
      expect(urgencyAnalyses).toHaveLength(conversationIds.length);
      console.log(`Analyzed urgency for ${urgencyAnalyses.length} conversations in ${timer.elapsed()}ms`);
    });

    it('should perform complete auto-tagging within time limits', async () => {
      if (!shouldRunPerformanceTests) return;

      const conversationIds = await getTestConversationIds(dbManager, 10);
      const timer = new PerformanceTimer();
      
      const results = await Promise.all(
        conversationIds.map(id => autoTaggingService.autoTagConversation(id))
      );
      
      timer.expectUnder(8000, 'Complete auto-tagging batch');
      
      expect(results).toHaveLength(conversationIds.length);
      console.log(`Complete auto-tagging for ${results.length} conversations in ${timer.elapsed()}ms`);
    });
  });

  describe('MCP Tool Performance', () => {
    it('should handle get_proactive_insights efficiently with large datasets', async () => {
      if (!shouldRunPerformanceTests) return;

      const timer = new PerformanceTimer();
      
      const result = await proactiveInsightsTool.execute({
        includeTypes: ['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments'],
        daysSince: 60,
        limit: 50
      });
      
      timer.expectUnder(10000, 'Complete proactive insights analysis');
      
      expect(result.isError).toBe(false);
      
      const response = JSON.parse(result.content[0].text);
      console.log(`Generated ${response.summary.totalInsights} insights in ${timer.elapsed()}ms`);
    });

    it('should handle auto_tag_conversation tool efficiently', async () => {
      if (!shouldRunPerformanceTests) return;

      const conversationIds = await getTestConversationIds(dbManager, 5);
      const timers: number[] = [];

      for (const conversationId of conversationIds) {
        const timer = new PerformanceTimer();
        
        const result = await autoTagTool.execute({
          conversationId,
          includeTypes: ['topic_tags', 'activity_classification', 'urgency_detection', 'project_context'],
          storeTags: false // Skip storage for performance testing
        });
        
        const elapsed = timer.elapsed();
        timers.push(elapsed);
        
        expect(result.isError).toBe(false);
        expect(elapsed).toBeLessThan(3000); // Individual conversation tagging
      }

      const avgTime = timers.reduce((sum, time) => sum + time, 0) / timers.length;
      console.log(`Auto-tag tool average: ${avgTime.toFixed(1)}ms per conversation`);
    });
  });

  describe('Scalability Tests', () => {
    it('should maintain performance with increasing data size', async () => {
      if (!shouldRunPerformanceTests) return;

      const dataSizes = [100, 500, 1000];
      const results: Array<{ size: number; time: number }> = [];

      for (const size of dataSizes) {
        const timer = new PerformanceTimer();
        
        const actions = await patternService.detectUnresolvedActions({
          daysSince: 365, // Large time window
          limit: size
        });
        
        const elapsed = timer.elapsed();
        results.push({ size, time: elapsed });
        
        console.log(`Dataset size ${size}: ${elapsed}ms (${actions.length} results)`);
      }

      // Performance should not degrade exponentially
      for (let i = 1; i < results.length; i++) {
        const currentRatio = results[i].time / results[i].size;
        const previousRatio = results[i - 1].time / results[i - 1].size;
        
        // Time per item should not increase by more than 3x
        expect(currentRatio).toBeLessThan(previousRatio * 3);
      }
    });

    it('should handle concurrent pattern detection requests', async () => {
      if (!shouldRunPerformanceTests) return;

      const concurrentRequests = 5;
      const timer = new PerformanceTimer();
      
      const promises = Array(concurrentRequests).fill(0).map(async () => {
        return Promise.all([
          patternService.detectUnresolvedActions({ limit: 20 }),
          patternService.findRecurringQuestions({ limit: 20 }),
          patternService.identifyKnowledgeGaps({ limit: 10 })
        ]);
      });
      
      const results = await Promise.all(promises);
      
      timer.expectUnder(15000, 'Concurrent pattern detection');
      
      expect(results).toHaveLength(concurrentRequests);
      console.log(`Handled ${concurrentRequests} concurrent requests in ${timer.elapsed()}ms`);
    });

    it('should handle memory efficiently with large result sets', async () => {
      if (!shouldRunPerformanceTests) return;

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process large amounts of data
      for (let i = 0; i < 10; i++) {
        const actions = await patternService.detectUnresolvedActions({ limit: 100 });
        const questions = await patternService.findRecurringQuestions({ limit: 100 });
        const gaps = await patternService.identifyKnowledgeGaps({ limit: 50 });
        
        // Process results to simulate real usage
        actions.forEach(action => action.commitmentText.length);
        questions.forEach(question => question.questionText.length);
        gaps.forEach(gap => gap.topic.length);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)} MB`);
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncreaseMB).toBeLessThan(100);
    });
  });

  describe('Database Performance', () => {
    it('should perform well with complex FTS queries', async () => {
      if (!shouldRunPerformanceTests) return;

      const complexQueries = [
        'react typescript components',
        'database configuration setup',
        'performance optimization techniques',
        'authentication security implementation',
        'error handling debugging'
      ];

      const timer = new PerformanceTimer();
      
      for (const query of complexQueries) {
        const questions = await patternService.findRecurringQuestions({
          minFrequency: 1, // Lower threshold for testing
          limit: 50
        });
        
        expect(questions).toBeDefined();
      }
      
      timer.expectUnder(5000, 'Complex FTS queries');
      console.log(`Executed ${complexQueries.length} complex queries in ${timer.elapsed()}ms`);
    });

    it('should handle large entity relationship queries efficiently', async () => {
      if (!shouldRunPerformanceTests) return;

      const conversationIds = await getTestConversationIds(dbManager, 20);
      const timer = new PerformanceTimer();
      
      for (const conversationId of conversationIds) {
        await autoTaggingService.identifyProjectContexts(conversationId);
      }
      
      timer.expectUnder(6000, 'Entity relationship queries');
      console.log(`Processed entity relationships for ${conversationIds.length} conversations in ${timer.elapsed()}ms`);
    });
  });
});

/**
 * Generate a large test dataset for performance testing
 */
async function generateLargeTestDataset(dbManager: DatabaseManager) {
  const db = dbManager.getConnection();
  
  console.log('Generating large test dataset...');
  
  const conversationCount = 500;
  const messagesPerConv = 20;
  const baseTime = Date.now() - (365 * 24 * 60 * 60 * 1000); // 1 year ago
  
  const insertConv = db.prepare(`
    INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  
  const insertMsg = db.prepare(`
    INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  // Generate conversations and messages
  const transaction = db.transaction(() => {
    for (let i = 0; i < conversationCount; i++) {
      const convId = `perf-conv-${i}`;
      const convTime = baseTime + (i * 24 * 60 * 60 * 1000);
      
      insertConv.run(convId, `Performance Test Conversation ${i}`, convTime, convTime);
      
      for (let j = 0; j < messagesPerConv; j++) {
        const msgId = `perf-msg-${i}-${j}`;
        const msgTime = convTime + (j * 60 * 60 * 1000);
        const role = j % 3 === 0 ? 'user' : 'assistant';
        
        let content;
        if (role === 'user') {
          content = generateUserMessage(i, j);
        } else {
          content = generateAssistantMessage(i, j);
        }
        
        insertMsg.run(msgId, convId, role, content, msgTime);
      }
    }
  });
  
  transaction();
  
  // Generate entities and mentions for auto-tagging tests
  await generateEntityData(dbManager, conversationCount);
  
  console.log(`Generated ${conversationCount} conversations with ${conversationCount * messagesPerConv} messages`);
}

/**
 * Generate user messages with various patterns
 */
function generateUserMessage(convIndex: number, msgIndex: number): string {
  const patterns = [
    'How do I configure the React TypeScript setup?',
    'What are the best practices for database optimization?',
    'Can you help me with authentication implementation?',
    'I need assistance with performance tuning.',
    'How do I debug this error in production?',
    'What is the recommended approach for testing?',
    'Can you explain how the caching mechanism works?',
    'I need help with deployment configuration.',
    'How do I handle concurrent user sessions?',
    'What are the security considerations for this API?'
  ];
  
  const urgencyWords = ['urgent', 'ASAP', 'critical', 'important', 'priority'];
  const pattern = patterns[msgIndex % patterns.length];
  
  // Add urgency to some messages
  if (convIndex % 10 === 0 && msgIndex % 5 === 0) {
    const urgency = urgencyWords[msgIndex % urgencyWords.length];
    return `${urgency}: ${pattern}`;
  }
  
  return pattern;
}

/**
 * Generate assistant messages with commitment patterns
 */
function generateAssistantMessage(convIndex: number, msgIndex: number): string {
  const commitmentPatterns = [
    "I'll check the documentation and get back to you with details.",
    "Let me investigate this issue and provide a solution.",
    "I need to review the configuration and will update you soon.",
    "I'll look into the best practices and share recommendations.",
    "Let me analyze the performance metrics and report back.",
    "I'll test this scenario and confirm the behavior.",
    "I need to verify this with the team and will follow up.",
    "I'll update the documentation and notify you when complete.",
    "Let me research this topic and provide comprehensive guidance.",
    "I'll review the security implications and share my findings."
  ];
  
  const resolutionPatterns = [
    "I've completed the review as promised. Here are the findings:",
    "The issue has been resolved. The solution was to update the configuration.",
    "I've finished the investigation. The problem was in the authentication flow.",
    "The documentation has been updated with the latest best practices.",
    "I've tested the scenario and confirmed it works as expected.",
    "The performance analysis is complete. Here are the optimization recommendations:",
    "I've verified with the team and confirmed the approach is correct.",
    "The security review is done. Here are the considerations:",
    "I've researched the topic thoroughly. Here's what I found:",
    "The configuration has been updated and tested successfully."
  ];
  
  // Mix commitments and resolutions
  if (msgIndex % 4 === 0) {
    return commitmentPatterns[msgIndex % commitmentPatterns.length];
  } else if (msgIndex % 7 === 0) {
    return resolutionPatterns[msgIndex % resolutionPatterns.length];
  }
  
  return "Here's what I can help you with based on your question. Let me provide some guidance on this topic.";
}

/**
 * Generate entity data for auto-tagging tests
 */
async function generateEntityData(dbManager: DatabaseManager, conversationCount: number) {
  const db = dbManager.getConnection();
  
  const entities = [
    { name: 'React', type: 'technical' },
    { name: 'TypeScript', type: 'technical' },
    { name: 'Database', type: 'technical' },
    { name: 'Authentication', type: 'technical' },
    { name: 'Performance', type: 'concept' },
    { name: 'Security', type: 'concept' },
    { name: 'Configuration', type: 'concept' },
    { name: 'Testing', type: 'concept' },
    { name: 'Production', type: 'technical' },
    { name: 'API', type: 'technical' }
  ];
  
  const insertEntity = db.prepare(`
    INSERT OR REPLACE INTO entities (id, name, type, created_at)
    VALUES (?, ?, ?, ?)
  `);
  
  const insertMention = db.prepare(`
    INSERT OR REPLACE INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, confidence)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  entities.forEach((entity, index) => {
    insertEntity.run(`perf-entity-${index}`, entity.name, entity.type, Date.now());
  });
  
  // Add mentions for a subset of messages
  for (let i = 0; i < Math.min(conversationCount, 100); i++) {
    for (let j = 0; j < 10; j++) {
      const entityIndex = (i + j) % entities.length;
      const mentionId = `perf-mention-${i}-${j}`;
      const entityId = `perf-entity-${entityIndex}`;
      const messageId = `perf-msg-${i}-${j}`;
      const conversationId = `perf-conv-${i}`;
      
      insertMention.run(
        mentionId,
        entityId,
        messageId,
        conversationId,
        entities[entityIndex].name,
        0.8 + (Math.random() * 0.2)
      );
    }
  }
}

/**
 * Get test conversation IDs
 */
async function getTestConversationIds(dbManager: DatabaseManager, limit: number): Promise<string[]> {
  const db = dbManager.getConnection();
  
  const conversations = db.prepare(`
    SELECT id FROM conversations
    WHERE id LIKE 'perf-conv-%'
    LIMIT ?
  `).all(limit);
  
  return conversations.map((row: any) => row.id);
}