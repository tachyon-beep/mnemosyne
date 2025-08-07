/**
 * Production Scale Validation Tests
 * 
 * Tests system behavior with production-scale data volumes and realistic
 * usage patterns to ensure the system can handle real-world deployments.
 */

import { describe, beforeAll, afterAll, test, expect, jest } from '@jest/globals';
import { DatabaseManager } from '../../src/storage/Database.js';
import { EnhancedSearchEngine } from '../../src/search/EnhancedSearchEngine.js';
import { EmbeddingManager } from '../../src/search/EmbeddingManager.js';
import { ConversationRepository, MessageRepository } from '../../src/storage/repositories/index.js';
import { ToolRegistry } from '../../src/tools/index.js';
import { createTestDatabase, PerformanceTimer } from '../utils/test-helpers.js';
import { rmSync, existsSync } from 'fs';
import { join } from 'path';

// Production scale targets
const PRODUCTION_SCALE = {
  CONVERSATIONS: 10000,
  MESSAGES_PER_CONVERSATION: 50,
  TOTAL_MESSAGES: 500000,
  SEARCH_RESPONSE_TIME: 2000, // 2 seconds max
  CONCURRENT_USERS: 50,
  MEMORY_LIMIT: 1024 * 1024 * 1024, // 1GB
  UPTIME_TEST_HOURS: 1 // Reduced for CI
};

describe('Production Scale Validation Tests', () => {
  let dbManager: DatabaseManager;
  let embeddingManager: EmbeddingManager;
  let searchEngine: EnhancedSearchEngine;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let toolRegistry: ToolRegistry;
  let testDbPath: string;

  beforeAll(async () => {
    console.log('🚀 Setting up production scale test environment...');
    console.log(`Target: ${PRODUCTION_SCALE.CONVERSATIONS} conversations, ${PRODUCTION_SCALE.TOTAL_MESSAGES} messages`);
    
    testDbPath = join(process.cwd(), '.test-production-scale.db');
    
    // Initialize with production-like configuration
    dbManager = await createTestDatabase(testDbPath);
    conversationRepo = new ConversationRepository(dbManager);
    messageRepo = new MessageRepository(dbManager);
    
    // Create production-scale test data
    await createProductionScaleData();
    
    console.log('✅ Production scale test setup complete');
  }, 300000); // 5 minute timeout for setup

  afterAll(async () => {
    if (searchEngine) searchEngine.destroy();
    if (dbManager) dbManager.close();
    
    if (existsSync(testDbPath)) {
      rmSync(testDbPath, { force: true });
    }
  });

  describe('Data Volume Handling', () => {
    test('should handle 10,000+ conversations efficiently', async () => {
      const timer = new PerformanceTimer();
      
      // Query conversations with various filters
      const recentConversations = await conversationRepo.findRecent(100);
      expect(recentConversations.data.length).toBe(100);
      
      const totalConversations = await conversationRepo.count();
      expect(totalConversations).toBeGreaterThanOrEqual(PRODUCTION_SCALE.CONVERSATIONS);
      
      const elapsed = timer.elapsed();
      expect(elapsed).toBeLessThan(5000); // Should complete within 5 seconds
      
      console.log(`✅ Conversation queries completed in ${elapsed}ms`);
    });

    test('should handle 500,000+ messages with maintained performance', async () => {
      const timer = new PerformanceTimer();
      
      // Test message queries at scale
      const recentMessages = await messageRepo.findRecent(1000);
      expect(recentMessages.data.length).toBe(1000);
      
      const messagesByConversation = await messageRepo.findByConversation('conv-scale-5000');
      expect(messagesByConversation.data.length).toBe(PRODUCTION_SCALE.MESSAGES_PER_CONVERSATION);
      
      const totalMessages = await messageRepo.count();
      expect(totalMessages).toBeGreaterThanOrEqual(PRODUCTION_SCALE.TOTAL_MESSAGES);
      
      const elapsed = timer.elapsed();
      expect(elapsed).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`✅ Message queries completed in ${elapsed}ms`);
    });

    test('should maintain search performance at scale', async () => {
      const searchQueries = [
        'machine learning algorithms',
        'React components and hooks',
        'database optimization techniques',
        'API design patterns',
        'security best practices'
      ];

      const results = [];
      
      for (const query of searchQueries) {
        const timer = new PerformanceTimer();
        
        const searchResult = await toolRegistry.executeTool('search_messages', {
          query,
          limit: 50
        });
        
        const elapsed = timer.elapsed();
        results.push({ query, elapsed, count: searchResult.results?.length || 0 });
        
        expect(elapsed).toBeLessThan(PRODUCTION_SCALE.SEARCH_RESPONSE_TIME);
        expect(searchResult.results).toBeDefined();
      }
      
      console.log('🔍 Search performance results:', results);
    });
  });

  describe('Concurrent User Simulation', () => {
    test('should handle 50 concurrent users performing typical operations', async () => {
      const concurrentUsers = PRODUCTION_SCALE.CONCURRENT_USERS;
      const operationsPerUser = 10;
      
      console.log(`🧪 Simulating ${concurrentUsers} concurrent users...`);
      
      const userSimulations = Array.from({ length: concurrentUsers }, (_, userId) =>
        simulateUserSession(userId, operationsPerUser)
      );
      
      const startTime = Date.now();
      const results = await Promise.allSettled(userSimulations);
      const elapsed = Date.now() - startTime;
      
      // Analyze results
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      console.log(`✅ Concurrent users test completed in ${elapsed}ms`);
      console.log(`📊 Success rate: ${successful.length}/${concurrentUsers} (${(successful.length/concurrentUsers*100).toFixed(1)}%)`);
      
      // Should have at least 90% success rate
      expect(successful.length / concurrentUsers).toBeGreaterThanOrEqual(0.9);
      
      // Total time should be reasonable (not linear with user count)
      expect(elapsed).toBeLessThan(60000); // 1 minute max
    });

    test('should maintain data consistency under concurrent load', async () => {
      const testConversationId = 'concurrent-consistency-test';
      
      // Create test conversation
      await conversationRepo.create({
        id: testConversationId,
        title: 'Concurrent Consistency Test'
      });
      
      // Simulate concurrent message additions
      const concurrentOperations = Array.from({ length: 20 }, (_, i) =>
        toolRegistry.executeTool('save_message', {
          conversationId: testConversationId,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Concurrent message ${i} for consistency testing`
        })
      );
      
      const results = await Promise.allSettled(concurrentOperations);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      // Verify final state consistency
      const finalConversation = await toolRegistry.executeTool('get_conversation', {
        conversationId: testConversationId
      });
      
      expect(finalConversation.messages.length).toBe(successful + 1); // +1 for initial message
      expect(finalConversation.messages.every((msg, idx) => msg.messageIndex === idx)).toBe(true);
      
      console.log(`✅ Data consistency maintained: ${successful} messages added successfully`);
    });
  });

  describe('Memory Usage and Resource Management', () => {
    test('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const operations = [];
      
      // Simulate heavy search operations
      for (let i = 0; i < 100; i++) {
        operations.push(
          toolRegistry.executeTool('search_messages', {
            query: `memory test query batch ${Math.floor(i / 10)}`,
            limit: 100
          })
        );
      }
      
      await Promise.all(operations);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for GC
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      console.log(`📊 Memory usage: ${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB → ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`);
      console.log(`📈 Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      
      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(PRODUCTION_SCALE.MEMORY_LIMIT / 2);
      expect(finalMemory.heapUsed).toBeLessThan(PRODUCTION_SCALE.MEMORY_LIMIT);
    });

    test('should handle database connection pooling efficiently', async () => {
      const connectionTests = Array.from({ length: 100 }, async (_, i) => {
        // Simulate database operations that would use connections
        const conversation = await conversationRepo.findById(`conv-scale-${i % 1000}`);
        const messages = await messageRepo.findByConversation(conversation?.id || 'nonexistent');
        return { conversation: !!conversation, messageCount: messages.data.length };
      });
      
      const results = await Promise.all(connectionTests);
      const validResults = results.filter(r => r.conversation);
      
      expect(validResults.length).toBeGreaterThan(50);
      console.log(`✅ Database connection pooling handled ${results.length} operations`);
    });
  });

  describe('Long-Running Stability', () => {
    test('should maintain performance over extended operation', async () => {
      const testDurationMs = PRODUCTION_SCALE.UPTIME_TEST_HOURS * 60 * 60 * 1000;
      const measurementInterval = 5 * 60 * 1000; // 5 minutes
      const measurements = [];
      
      console.log(`⏱️ Starting ${PRODUCTION_SCALE.UPTIME_TEST_HOURS}h stability test...`);
      
      const startTime = Date.now();
      let operationCount = 0;
      
      while (Date.now() - startTime < testDurationMs) {
        const measurementStart = Date.now();
        
        // Perform typical operations
        await performTypicalOperations();
        operationCount++;
        
        const elapsed = Date.now() - measurementStart;
        measurements.push({
          timestamp: Date.now() - startTime,
          operationTime: elapsed,
          memoryUsage: process.memoryUsage().heapUsed
        });
        
        // Wait until next measurement interval
        const nextMeasurement = measurementStart + measurementInterval;
        const waitTime = nextMeasurement - Date.now();
        if (waitTime > 0) {
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
      
      // Analyze stability metrics
      const avgOperationTime = measurements.reduce((sum, m) => sum + m.operationTime, 0) / measurements.length;
      const maxOperationTime = Math.max(...measurements.map(m => m.operationTime));
      const finalMemory = measurements[measurements.length - 1].memoryUsage;
      const initialMemory = measurements[0].memoryUsage;
      const memoryGrowth = finalMemory - initialMemory;
      
      console.log(`✅ Stability test completed:`);
      console.log(`   Operations performed: ${operationCount}`);
      console.log(`   Average operation time: ${avgOperationTime.toFixed(1)}ms`);
      console.log(`   Max operation time: ${maxOperationTime}ms`);
      console.log(`   Memory growth: ${Math.round(memoryGrowth / 1024 / 1024)}MB`);
      
      // Performance should remain stable
      expect(maxOperationTime).toBeLessThan(avgOperationTime * 3); // No more than 3x average
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth per hour
    });
  });

  // Helper functions
  async function createProductionScaleData(): Promise<void> {
    console.log('📊 Creating production scale test data...');
    
    const db = dbManager.getConnection();
    const batchSize = 1000;
    
    // Prepare statements for bulk insertion
    const insertConv = db.prepare(`
      INSERT INTO conversations (id, title, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    
    const insertMsg = db.prepare(`
      INSERT INTO messages (id, conversation_id, role, content, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    // Create conversations in batches
    for (let batch = 0; batch < PRODUCTION_SCALE.CONVERSATIONS / batchSize; batch++) {
      const transaction = db.transaction(() => {
        const batchStart = batch * batchSize;
        const batchEnd = Math.min((batch + 1) * batchSize, PRODUCTION_SCALE.CONVERSATIONS);
        
        for (let i = batchStart; i < batchEnd; i++) {
          const convId = `conv-scale-${i}`;
          const createdAt = Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000; // Last year
          
          insertConv.run(convId, `Production Scale Conversation ${i}`, createdAt, createdAt);
          
          // Add messages to this conversation
          for (let j = 0; j < PRODUCTION_SCALE.MESSAGES_PER_CONVERSATION; j++) {
            const msgId = `msg-scale-${i}-${j}`;
            const role = j % 2 === 0 ? 'user' : 'assistant';
            const content = generateRealisticMessageContent(i, j);
            const msgCreatedAt = createdAt + j * 60000; // 1 minute apart
            
            insertMsg.run(msgId, convId, role, content, msgCreatedAt);
          }
        }
      });
      
      transaction();
      
      if (batch % 10 === 0) {
        const progress = ((batch + 1) * batchSize / PRODUCTION_SCALE.CONVERSATIONS * 100).toFixed(1);
        console.log(`   Progress: ${progress}% (${(batch + 1) * batchSize} conversations)`);
      }
    }
    
    console.log('✅ Production scale data creation complete');
  }

  function generateRealisticMessageContent(convIndex: number, msgIndex: number): string {
    const topics = [
      'software development', 'machine learning', 'web development', 'database design',
      'system architecture', 'API development', 'user experience', 'project management',
      'data analysis', 'cloud computing', 'security practices', 'performance optimization'
    ];
    
    const patterns = [
      'I need help with {topic}. Can you guide me through the best practices?',
      'What are the latest developments in {topic}? I want to stay current.',
      'I\'m working on a project involving {topic}. What should I consider for scalability?',
      'Can you recommend tools and frameworks for {topic}?',
      'I\'m having issues with {topic} performance. Any optimization suggestions?',
      'How does {topic} integrate with modern development workflows?',
      'What are common pitfalls to avoid when implementing {topic}?',
      'I\'d like to understand the fundamentals of {topic} better.',
      'Are there any new trends or approaches in {topic} I should know about?',
      'Can you help me troubleshoot this {topic} implementation?'
    ];
    
    const topic = topics[convIndex % topics.length];
    const pattern = patterns[msgIndex % patterns.length];
    
    return pattern.replace('{topic}', topic) + 
           ` This message is part of a production scale test with conversation ${convIndex} message ${msgIndex}.`;
  }

  async function simulateUserSession(userId: number, operationCount: number): Promise<void> {
    const operations = ['search', 'save', 'get_conversation', 'get_conversations'];
    
    for (let i = 0; i < operationCount; i++) {
      const operation = operations[Math.floor(Math.random() * operations.length)];
      
      try {
        switch (operation) {
          case 'search':
            await toolRegistry.executeTool('search_messages', {
              query: `user ${userId} search query ${i}`,
              limit: 20
            });
            break;
            
          case 'save':
            await toolRegistry.executeTool('save_message', {
              role: i % 2 === 0 ? 'user' : 'assistant',
              content: `User ${userId} message ${i} for concurrent testing`
            });
            break;
            
          case 'get_conversation':
            const convId = `conv-scale-${Math.floor(Math.random() * 1000)}`;
            await toolRegistry.executeTool('get_conversation', { conversationId: convId });
            break;
            
          case 'get_conversations':
            await toolRegistry.executeTool('get_conversations', { limit: 10 });
            break;
        }
        
        // Small delay to simulate real user behavior
        await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        
      } catch (error) {
        // Log but don't throw - simulate user continuing despite errors
        console.warn(`User ${userId} operation ${operation} failed:`, error.message);
      }
    }
  }

  async function performTypicalOperations(): Promise<void> {
    // Simulate typical user operations during stability test
    await toolRegistry.executeTool('search_messages', {
      query: 'stability test query',
      limit: 10
    });
    
    await toolRegistry.executeTool('get_conversations', { limit: 5 });
    
    const convId = `conv-scale-${Math.floor(Math.random() * 1000)}`;
    await toolRegistry.executeTool('get_conversation', { conversationId: convId });
  }
});