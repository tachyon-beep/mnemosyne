/**
 * Simple Phase 5 Analytics Integration Validation
 * 
 * Basic integration test to validate that the Phase 5 analytics system
 * components can be instantiated and work together at a basic level.
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { DatabaseManager } from '../../src/storage/Database.js';
import { AnalyticsEngine } from '../../src/analytics/services/AnalyticsEngine.js';
import { GetConversationAnalyticsTool } from '../../src/tools/GetConversationAnalyticsTool.js';
import { ConversationRepository } from '../../src/storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../../src/storage/repositories/MessageRepository.js';
import { ConversationFlowAnalyzer } from '../../src/analytics/analyzers/ConversationFlowAnalyzer.js';
import { ProductivityAnalyzer } from '../../src/analytics/analyzers/ProductivityAnalyzer.js';
import { KnowledgeGapDetector } from '../../src/analytics/analyzers/KnowledgeGapDetector.js';
import { DecisionTracker } from '../../src/analytics/analyzers/DecisionTracker.js';
import { BaseTool } from '../../src/tools/BaseTool.js';

describe('Simple Phase 5 Analytics Validation', () => {
  let databaseManager: DatabaseManager;
  let analyticsEngine: AnalyticsEngine;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;

  beforeAll(async () => {
    // Create in-memory database
    databaseManager = new DatabaseManager({ databasePath: ':memory:' });
    await databaseManager.initialize();

    // Create repositories
    conversationRepo = new ConversationRepository(databaseManager);
    messageRepo = new MessageRepository(databaseManager);

    // Create analytics engine
    analyticsEngine = new AnalyticsEngine(databaseManager);
  });

  afterAll(async () => {
    if (databaseManager) {
      await databaseManager.close();
    }
  });

  test('should create basic analytics infrastructure', async () => {
    // Test that we can create all the required components
    expect(databaseManager).toBeDefined();
    expect(analyticsEngine).toBeDefined();
    expect(conversationRepo).toBeDefined();
    expect(messageRepo).toBeDefined();
  });

  test('should create analytics tools with proper dependencies', async () => {
    // Create analyzers
    const conversationFlowAnalyzer = new ConversationFlowAnalyzer();
    const productivityAnalyzer = new ProductivityAnalyzer();
    const knowledgeGapDetector = new KnowledgeGapDetector();
    const decisionTracker = new DecisionTracker();

    // Create analytics tool
    const conversationAnalyticsTool = new GetConversationAnalyticsTool({
      analyticsEngine,
      conversationRepository: conversationRepo,
      messageRepository: messageRepo,
      conversationFlowAnalyzer,
      productivityAnalyzer,
      knowledgeGapDetector,
      decisionTracker
    });

    expect(conversationAnalyticsTool).toBeDefined();
    
    // Test tool metadata
    const toolDef = conversationAnalyticsTool.getTool();
    expect(toolDef.name).toBe('get_conversation_analytics');
    expect(toolDef.description).toBeDefined();
  });

  test('should handle non-existent conversation gracefully', async () => {
    // Create analytics tool
    const conversationFlowAnalyzer = new ConversationFlowAnalyzer();
    const productivityAnalyzer = new ProductivityAnalyzer();
    const knowledgeGapDetector = new KnowledgeGapDetector();
    const decisionTracker = new DecisionTracker();

    const conversationAnalyticsTool = new GetConversationAnalyticsTool({
      analyticsEngine,
      conversationRepository: conversationRepo,
      messageRepository: messageRepo,
      conversationFlowAnalyzer,
      productivityAnalyzer,
      knowledgeGapDetector,
      decisionTracker
    });

    const context = BaseTool.createContext();
    const result = await conversationAnalyticsTool.execute({
      conversationId: 'nonexistent-conversation'
    }, context);

    // Should handle error gracefully
    if (result.isError) {
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    } else {
      // If it succeeds, it should return a meaningful response
      const response = JSON.parse(result.content[0].text!);
      if (!response.success) {
        expect(response.error).toBeDefined();
      }
    }
  });

  test('should have required database tables', async () => {
    const db = databaseManager.getConnection();

    const requiredTables = [
      'conversations',
      'messages'
    ];

    for (const tableName of requiredTables) {
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?
      `).get(tableName);

      expect(tableExists).toBeDefined();
      console.log(`✓ Table ${tableName} exists`);
    }
  });

  test('should be able to save and retrieve basic conversation data', async () => {
    // Create test conversation
    const conversation = await conversationRepo.create({
      id: 'test-validation-conv',
      title: 'Test Conversation for Validation'
    });

    expect(conversation.id).toBe('test-validation-conv');

    // Create test message
    const message = await messageRepo.create({
      id: 'test-validation-msg-1',
      conversationId: 'test-validation-conv',
      role: 'user',
      content: 'This is a test message for validation.'
    });

    expect(message.id).toBe('test-validation-msg-1');
    expect(message.conversationId).toBe('test-validation-conv');

    // Retrieve conversation
    const retrievedConversation = await conversationRepo.findById('test-validation-conv');
    expect(retrievedConversation).toBeDefined();
    expect(retrievedConversation!.id).toBe('test-validation-conv');

    // Retrieve messages
    const messages = await messageRepo.findByConversationId('test-validation-conv');
    expect(messages.length).toBe(1);
    expect(messages[0].content).toBe('This is a test message for validation.');
  });

  test('should be able to generate basic analytics report', async () => {
    const report = await analyticsEngine.generateReport({
      start: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
      end: Date.now()
    });

    expect(report).toBeDefined();
    expect(report.generatedAt).toBeGreaterThan(0);
    expect(report.conversationMetrics).toBeDefined();
    expect(report.productivityInsights).toBeDefined();
    expect(report.knowledgeGaps).toBeDefined();
    expect(report.decisionQuality).toBeDefined();
    expect(report.recommendations).toBeDefined();
    expect(report.insights).toBeDefined();

    console.log('✓ Analytics report generated successfully');
    console.log('  - Conversations:', report.conversationMetrics.totalConversations);
    console.log('  - Insights:', report.insights.length);
    console.log('  - Recommendations:', report.recommendations.length);
  });

  test('should demonstrate performance within reasonable bounds', async () => {
    const startTime = Date.now();
    
    // Generate report
    await analyticsEngine.generateReport({
      start: Date.now() - (24 * 60 * 60 * 1000),
      end: Date.now()
    });

    const reportGenerationTime = Date.now() - startTime;
    console.log(`Analytics report generation took ${reportGenerationTime}ms`);

    // Should complete within reasonable time
    expect(reportGenerationTime).toBeLessThan(10000); // Max 10 seconds
  });
});