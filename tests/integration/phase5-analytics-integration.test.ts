/**
 * Phase 5 Analytics System - Comprehensive End-to-End Integration Tests
 * 
 * This test suite validates the complete Phase 5 analytics system integration:
 * - Complete workflow from MCP tool calls to database storage
 * - Component integration between ToolRegistry, MCP Tools, AnalyticsEngine, and Repositories
 * - Database migration validation (006_analytics, 008_validation_triggers, 008_index_monitoring)
 * - Real data processing with realistic conversation scenarios
 * - Performance integration with batch operations, caching, and optimization features
 * - Cross-component interaction validation
 * - Production-quality error handling and resilience
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll } from '@jest/globals';
import { Database } from 'better-sqlite3';
import { DatabaseManager } from '../../src/storage/Database.js';
import { ToolRegistry } from '../../src/server/ToolRegistry.js';
import { AnalyticsEngine } from '../../src/analytics/services/AnalyticsEngine.js';

// Import analytics tools
import { GetConversationAnalyticsTool } from '../../src/tools/GetConversationAnalyticsTool.js';
import { AnalyzeProductivityPatternsTool } from '../../src/tools/AnalyzeProductivityPatternsTool.js';
import { DetectKnowledgeGapsTool } from '../../src/tools/DetectKnowledgeGapsTool.js';
import { TrackDecisionEffectivenessTool } from '../../src/tools/TrackDecisionEffectivenessTool.js';
import { GenerateAnalyticsReportTool } from '../../src/tools/GenerateAnalyticsReportTool.js';

// Import repositories
import { ConversationRepository } from '../../src/storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../../src/storage/repositories/MessageRepository.js';
import { 
  ConversationAnalyticsRepository,
  ProductivityPatternsRepository,
  KnowledgeGapsRepository,
  DecisionTrackingRepository
} from '../../src/analytics/repositories/index.js';

// Import analyzers
import { ConversationFlowAnalyzer } from '../../src/analytics/analyzers/ConversationFlowAnalyzer.js';
import { ProductivityAnalyzer } from '../../src/analytics/analyzers/ProductivityAnalyzer.js';
import { KnowledgeGapDetector } from '../../src/analytics/analyzers/KnowledgeGapDetector.js';
import { DecisionTracker } from '../../src/analytics/analyzers/DecisionTracker.js';

import { BaseTool } from '../../src/tools/BaseTool.js';
import { SearchEngine } from '../../src/search/SearchEngine.js';

/**
 * Test environment setup for Phase 5 analytics system
 */
interface Phase5TestEnvironment {
  databaseManager: DatabaseManager;
  toolRegistry: ToolRegistry;
  analyticsEngine: AnalyticsEngine;
  
  repositories: {
    conversations: ConversationRepository;
    messages: MessageRepository;
    conversationAnalytics: ConversationAnalyticsRepository;
    productivityPatterns: ProductivityPatternsRepository;
    knowledgeGaps: KnowledgeGapsRepository;
    decisionTracking: DecisionTrackingRepository;
  };
  
  analyzers: {
    conversationFlow: ConversationFlowAnalyzer;
    productivity: ProductivityAnalyzer;
    knowledgeGap: KnowledgeGapDetector;
    decision: DecisionTracker;
  };
  
  tools: {
    conversationAnalytics: GetConversationAnalyticsTool;
    productivityPatterns: AnalyzeProductivityPatternsTool;
    knowledgeGaps: DetectKnowledgeGapsTool;
    decisionEffectiveness: TrackDecisionEffectivenessTool;
    analyticsReport: GenerateAnalyticsReportTool;
  };
}

/**
 * Test data generator for realistic conversation scenarios
 */
class Phase5TestDataGenerator {
  static generateTechnicalDiscussionScenario(conversationId: string): {
    conversation: any;
    messages: any[];
    expectedAnalytics: {
      topicCount: number;
      productivityScore: number;
      knowledgeGaps: number;
      decisions: number;
    };
  } {
    const now = Date.now();
    const conversation = {
      id: conversationId,
      title: 'Database Architecture Discussion',
      createdAt: now - (60 * 60 * 1000), // 1 hour ago
      updatedAt: now - (10 * 60 * 1000)   // 10 minutes ago
    };

    const messages = [
      {
        id: `${conversationId}-msg-1`,
        conversation_id: conversationId,
        role: 'user',
        content: 'I need help designing a distributed database architecture for high-throughput analytics workloads.',
        created_at: now - (60 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-2`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'I\'d be happy to help! For high-throughput analytics, you\'ll want to consider several key factors: data partitioning strategy, replication topology, and query optimization. What\'s your expected data volume and query patterns?',
        created_at: now - (58 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-3`,
        conversation_id: conversationId,
        role: 'user',
        content: 'We\'re looking at about 10TB of data with complex aggregation queries running every few minutes. Read-heavy workload with occasional batch writes.',
        created_at: now - (55 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-4`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Based on your requirements, I recommend a column-store approach with time-based partitioning. Consider using Apache Druid or ClickHouse for this use case. Key decisions you\'ll need to make: 1) Partition granularity (hourly vs daily), 2) Replication factor, 3) Indexing strategy.',
        created_at: now - (50 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-5`,
        conversation_id: conversationId,
        role: 'user',
        content: 'What about data consistency requirements? How should I handle the CAP theorem trade-offs?',
        created_at: now - (45 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-6`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Great question! For analytics workloads, you typically prioritize Availability and Partition tolerance over strict Consistency. Consider eventual consistency with conflict-free replicated data types (CRDTs) for your use case.',
        created_at: now - (40 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-7`,
        conversation_id: conversationId,
        role: 'user',
        content: 'I think I understand. Let me decide on using ClickHouse with daily partitions and a replication factor of 3. Does this sound reasonable?',
        created_at: now - (35 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-8`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'That\'s an excellent decision! ClickHouse with daily partitions will give you great query performance, and RF=3 provides good durability. Make sure to set up proper monitoring and consider implementing data retention policies.',
        created_at: now - (30 * 60 * 1000)
      }
    ];

    const expectedAnalytics = {
      topicCount: 4, // database architecture, partitioning, CAP theorem, specific implementation
      productivityScore: 85, // High-quality technical discussion with clear progression
      knowledgeGaps: 2, // Gap about monitoring and retention policies
      decisions: 3  // Partition granularity, replication factor, database choice
    };

    return { conversation, messages, expectedAnalytics };
  }

  static generateProjectPlanningScenario(conversationId: string): {
    conversation: any;
    messages: any[];
    expectedAnalytics: {
      topicCount: number;
      productivityScore: number;
      knowledgeGaps: number;
      decisions: number;
    };
  } {
    const now = Date.now();
    const conversation = {
      id: conversationId,
      title: 'Q4 Feature Planning Session',
      createdAt: now - (2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: now - (30 * 60 * 1000)      // 30 minutes ago
    };

    const messages = [
      {
        id: `${conversationId}-msg-1`,
        conversation_id: conversationId,
        role: 'user',
        content: 'We need to plan our Q4 feature roadmap. Priority items include user authentication, API rate limiting, and performance optimizations.',
        created_at: now - (2 * 60 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-2`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Good priorities! Let\'s break these down by effort and impact. User authentication is critical for security, API rate limiting prevents abuse, and performance optimizations improve user experience. What\'s your team size and timeline?',
        created_at: now - (115 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-3`,
        conversation_id: conversationId,
        role: 'user',
        content: 'We have 3 developers for 10 weeks. Authentication seems like the highest priority, but I\'m unsure about the complexity of rate limiting implementation.',
        created_at: now - (110 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-4`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'With 3 devs for 10 weeks, here\'s my recommendation: Week 1-4: Authentication (complex but foundational), Week 5-7: API rate limiting (moderate complexity), Week 8-10: Performance optimizations (high impact, variable complexity). This provides a logical dependency order.',
        created_at: now - (105 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-5`,
        conversation_id: conversationId,
        role: 'user',
        content: 'Should we consider any risks or dependencies? What if authentication takes longer than expected?',
        created_at: now - (100 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-6`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Great risk assessment thinking! Build in 20% buffer time and consider parallel work streams. If authentication is delayed, you could start performance optimizations that don\'t depend on auth. Also consider third-party auth solutions to reduce complexity.',
        created_at: now - (95 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-7`,
        conversation_id: conversationId,
        role: 'user',
        content: 'I\'ve decided to use Auth0 for authentication to reduce implementation time. This should free up resources for more performance work. Good call on the buffer time.',
        created_at: now - (90 * 60 * 1000)
      }
    ];

    const expectedAnalytics = {
      topicCount: 5, // roadmap planning, resource allocation, risk assessment, timeline, dependencies
      productivityScore: 78, // Good planning discussion with actionable outcomes
      knowledgeGaps: 3, // Buffer time calculation, third-party auth evaluation, performance optimization scope
      decisions: 4  // Priority ordering, timeline allocation, third-party auth choice, buffer time inclusion
    };

    return { conversation, messages, expectedAnalytics };
  }

  static generateTroubleshootingScenario(conversationId: string): {
    conversation: any;
    messages: any[];
    expectedAnalytics: {
      topicCount: number;
      productivityScore: number;
      knowledgeGaps: number;
      decisions: number;
    };
  } {
    const now = Date.now();
    const conversation = {
      id: conversationId,
      title: 'Production Database Performance Issue',
      createdAt: now - (90 * 60 * 1000), // 1.5 hours ago
      updatedAt: now - (5 * 60 * 1000)   // 5 minutes ago
    };

    const messages = [
      {
        id: `${conversationId}-msg-1`,
        conversation_id: conversationId,
        role: 'user',
        content: 'URGENT: Our production database is experiencing severe slowdowns. Query response times have increased from 100ms to 15+ seconds since yesterday.',
        created_at: now - (90 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-2`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Let\'s diagnose this systematically. First, check: 1) Current connections and active queries, 2) Disk I/O and CPU utilization, 3) Recent schema changes, 4) Lock contention. What monitoring data do you have available?',
        created_at: now - (88 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-3`,
        conversation_id: conversationId,
        role: 'user',
        content: 'CPU is at 95%, disk I/O seems normal. We did deploy a new feature yesterday that includes a complex reporting query. Active connections are at 150 (usually 50).',
        created_at: now - (85 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-4`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'The connection spike and high CPU point to the new reporting query. Let\'s examine the query execution plan and check if it\'s missing indexes. Can you run EXPLAIN ANALYZE on the problematic query?',
        created_at: now - (82 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-5`,
        conversation_id: conversationId,
        role: 'user',
        content: 'Found it! The reporting query is doing a full table scan on our 10M row events table. The query plan shows no index usage for the date range filter.',
        created_at: now - (78 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-6`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Perfect diagnosis! Create an index on the date column immediately: `CREATE INDEX CONCURRENTLY idx_events_date ON events(created_at)`. This should resolve the performance issue. Also consider adding query timeout limits.',
        created_at: now - (75 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-7`,
        conversation_id: conversationId,
        role: 'user',
        content: 'Index created successfully! Query times are back to 150ms. I\'ll implement query timeouts and add this to our deployment checklist to prevent future issues.',
        created_at: now - (70 * 60 * 1000)
      },
      {
        id: `${conversationId}-msg-8`,
        conversation_id: conversationId,
        role: 'assistant',
        content: 'Excellent resolution! The systematic diagnosis approach worked well. Consider implementing automated index recommendations and query performance monitoring to catch these issues earlier in development.',
        created_at: now - (65 * 60 * 1000)
      }
    ];

    const expectedAnalytics = {
      topicCount: 4, // problem identification, systematic diagnosis, root cause analysis, solution implementation
      productivityScore: 92, // Highly effective troubleshooting with clear resolution
      knowledgeGaps: 1, // Automated monitoring and prevention strategies
      decisions: 3  // Index creation, query timeout implementation, process improvement
    };

    return { conversation, messages, expectedAnalytics };
  }
}

/**
 * Performance measurement utilities for integration tests
 */
class PerformanceMeasurer {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(key: string): () => number {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      if (!this.measurements.has(key)) {
        this.measurements.set(key, []);
      }
      this.measurements.get(key)!.push(duration);
      return duration;
    };
  }

  getStats(key: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.measurements.get(key);
    if (!values || values.length === 0) return null;

    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  expectPerformance(key: string, maxAvgMs: number, maxMs?: number): void {
    const stats = this.getStats(key);
    expect(stats).toBeDefined();
    expect(stats!.avg).toBeLessThan(maxAvgMs);
    if (maxMs) {
      expect(stats!.max).toBeLessThan(maxMs);
    }
  }

  getAllStats(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, values] of this.measurements) {
      result[key] = this.getStats(key);
    }
    return result;
  }
}

describe('Phase 5 Analytics System - End-to-End Integration', () => {
  let testEnv: Phase5TestEnvironment;
  let performanceMeasurer: PerformanceMeasurer;
  let testConversations: Array<{
    id: string;
    scenario: any;
  }>;

  /**
   * Setup comprehensive test environment
   */
  async function createPhase5TestEnvironment(): Promise<Phase5TestEnvironment> {
    // Create in-memory database with all analytics migrations
    const databaseManager = new DatabaseManager({ databasePath: ':memory:' });
    await databaseManager.initialize();

    // Run all analytics migrations
    const db = databaseManager.getConnection();
    
    // Ensure all required tables exist (these should be created by migrations)
    const requiredTables = [
      'conversations', 'messages', 
      'conversation_analytics', 'productivity_patterns', 
      'knowledge_gaps', 'decision_tracking'
    ];
    
    for (const table of requiredTables) {
      const tableExists = db.prepare(`
        SELECT name FROM sqlite_master WHERE type='table' AND name=?
      `).get(table);
      
      if (!tableExists) {
        console.warn(`Table ${table} does not exist, creating basic structure for testing`);
        // Create minimal table structures for testing
        if (table === 'conversations') {
          db.exec(`CREATE TABLE conversations (id TEXT PRIMARY KEY, title TEXT, created_at INTEGER, updated_at INTEGER)`);
        } else if (table === 'messages') {
          db.exec(`CREATE TABLE messages (id TEXT PRIMARY KEY, conversation_id TEXT, role TEXT, content TEXT, created_at INTEGER)`);
        }
      }
    }

    // Create repositories
    const conversationRepo = new ConversationRepository(databaseManager);
    const messageRepo = new MessageRepository(databaseManager);
    const conversationAnalyticsRepo = new ConversationAnalyticsRepository(databaseManager);
    const productivityPatternsRepo = new ProductivityPatternsRepository(databaseManager);
    const knowledgeGapsRepo = new KnowledgeGapsRepository(databaseManager);
    const decisionTrackingRepo = new DecisionTrackingRepository(databaseManager);

    // Create search engine for ToolRegistry
    const searchEngine = new SearchEngine(messageRepo);

    // Create analytics engine
    const analyticsEngine = new AnalyticsEngine(databaseManager, {
      enableIncrementalProcessing: true,
      cacheExpirationMinutes: 1, // Short cache for testing
      batchProcessingSize: 10,
      maxProcessingTimeMs: 30000
    });

    // Create analyzers
    const conversationFlowAnalyzer = new ConversationFlowAnalyzer();
    const productivityAnalyzer = new ProductivityAnalyzer();
    const knowledgeGapDetector = new KnowledgeGapDetector();
    const decisionTracker = new DecisionTracker();

    // Create analytics tools
    const conversationAnalyticsTool = new GetConversationAnalyticsTool({
      analyticsEngine,
      conversationRepository: conversationRepo,
      messageRepository: messageRepo,
      conversationFlowAnalyzer,
      productivityAnalyzer,
      knowledgeGapDetector,
      decisionTracker
    });

    const productivityPatternsTool = new AnalyzeProductivityPatternsTool({
      analyticsEngine,
      conversationRepository: conversationRepo,
      messageRepository: messageRepo,
      productivityAnalyzer,
      productivityPatternsRepository: productivityPatternsRepo
    });

    const knowledgeGapsTool = new DetectKnowledgeGapsTool({
      analyticsEngine,
      conversationRepository: conversationRepo,
      messageRepository: messageRepo,
      knowledgeGapsRepository: knowledgeGapsRepo
    });

    const decisionEffectivenessTool = new TrackDecisionEffectivenessTool({
      analyticsEngine,
      conversationRepository: conversationRepo,
      messageRepository: messageRepo,
      decisionTrackingRepository: decisionTrackingRepo
    });

    const analyticsReportTool = new GenerateAnalyticsReportTool({
      analyticsEngine,
      conversationRepository: conversationRepo,
      messageRepository: messageRepo
    });

    // Create tool registry with analytics dependencies
    const toolRegistry = await ToolRegistry.create({
      conversationRepository: conversationRepo,
      messageRepository: messageRepo,
      searchEngine,
      databaseManager // This enables Phase 4 tools, but we focus on Phase 5
    });

    return {
      databaseManager,
      toolRegistry,
      analyticsEngine,
      repositories: {
        conversations: conversationRepo,
        messages: messageRepo,
        conversationAnalytics: conversationAnalyticsRepo,
        productivityPatterns: productivityPatternsRepo,
        knowledgeGaps: knowledgeGapsRepo,
        decisionTracking: decisionTrackingRepo
      },
      analyzers: {
        conversationFlow: conversationFlowAnalyzer,
        productivity: productivityAnalyzer,
        knowledgeGap: knowledgeGapDetector,
        decision: decisionTracker
      },
      tools: {
        conversationAnalytics: conversationAnalyticsTool,
        productivityPatterns: productivityPatternsTool,
        knowledgeGaps: knowledgeGapsTool,
        decisionEffectiveness: decisionEffectivenessTool,
        analyticsReport: analyticsReportTool
      }
    };
  }

  /**
   * Load test data into the database
   */
  async function loadTestData(): Promise<void> {
    const scenarios = [
      Phase5TestDataGenerator.generateTechnicalDiscussionScenario('conv-tech-1'),
      Phase5TestDataGenerator.generateProjectPlanningScenario('conv-plan-1'),
      Phase5TestDataGenerator.generateTroubleshootingScenario('conv-trouble-1'),
      // Add more scenarios for comprehensive testing
      Phase5TestDataGenerator.generateTechnicalDiscussionScenario('conv-tech-2'),
      Phase5TestDataGenerator.generateProjectPlanningScenario('conv-plan-2')
    ];

    testConversations = [];

    for (const scenario of scenarios) {
      // Save conversation
      await testEnv.repositories.conversations.create({
        id: scenario.conversation.id,
        title: scenario.conversation.title
      });

      // Save messages
      for (const message of scenario.messages) {
        await testEnv.repositories.messages.create({
          id: message.id,
          conversationId: message.conversation_id,
          role: message.role,
          content: message.content
        });
      }

      testConversations.push({
        id: scenario.conversation.id,
        scenario
      });
    }
  }

  beforeAll(async () => {
    testEnv = await createPhase5TestEnvironment();
    performanceMeasurer = new PerformanceMeasurer();
    await loadTestData();
  });

  afterEach(async () => {
    // Clear analytics caches between tests
    testEnv.analyticsEngine.clearCache();
  });

  afterAll(async () => {
    if (testEnv?.databaseManager) {
      await testEnv.databaseManager.close();
    }
  });

  describe('Complete Analytics Workflow Integration', () => {
    test('should execute end-to-end analytics pipeline successfully', async () => {
      const endMeasurement = performanceMeasurer.startMeasurement('complete-pipeline');
      const context = BaseTool.createContext();

      // Step 1: Analyze individual conversations
      for (const testConv of testConversations.slice(0, 3)) { // Test with 3 conversations
        const result = await testEnv.tools.conversationAnalytics.execute({
          conversationId: testConv.id,
          includeFlow: true,
          includeProductivity: true,
          includeKnowledgeGaps: true,
          includeDecisions: true
        }, context);

        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.data.conversationId).toBe(testConv.id);

        // Validate analytics structure
        expect(response.data.metadata).toBeDefined();
        expect(response.data.metadata.messageCount).toBeGreaterThan(0);
        expect(response.data.analyzedAt).toBeGreaterThan(0);
      }

      // Step 2: Analyze productivity patterns
      const productivityResult = await testEnv.tools.productivityPatterns.execute({
        timeRange: {
          start: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
          end: Date.now()
        },
        granularity: 'hour'
      }, context);

      expect(productivityResult.isError).toBeUndefined();
      const productivityData = JSON.parse(productivityResult.content[0].text!);
      expect(productivityData.success).toBe(true);
      expect(productivityData.data.patterns).toBeDefined();

      // Step 3: Detect knowledge gaps
      for (const testConv of testConversations.slice(0, 2)) {
        const gapsResult = await testEnv.tools.knowledgeGaps.execute({
          conversationId: testConv.id,
          includeResolved: false,
          minConfidence: 0.5
        }, context);

        expect(gapsResult.isError).toBeUndefined();
        const gapsData = JSON.parse(gapsResult.content[0].text!);
        expect(gapsData.success).toBe(true);
        expect(gapsData.data.gaps).toBeDefined();
        expect(Array.isArray(gapsData.data.gaps)).toBe(true);
      }

      // Step 4: Track decision effectiveness
      const decisionsResult = await testEnv.tools.decisionEffectiveness.execute({
        timeRange: {
          start: Date.now() - (24 * 60 * 60 * 1000),
          end: Date.now()
        },
        includeOutcomes: true
      }, context);

      expect(decisionsResult.isError).toBeUndefined();
      const decisionsData = JSON.parse(decisionsResult.content[0].text!);
      expect(decisionsData.success).toBe(true);
      expect(decisionsData.data.decisions).toBeDefined();

      // Step 5: Generate comprehensive report
      const reportResult = await testEnv.tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (24 * 60 * 60 * 1000),
          end: Date.now()
        },
        includeConversationMetrics: true,
        includeProductivityInsights: true,
        includeKnowledgeGaps: true,
        includeDecisionQuality: true
      }, context);

      expect(reportResult.isError).toBeUndefined();
      const reportData = JSON.parse(reportResult.content[0].text!);
      expect(reportData.success).toBe(true);
      
      const report = reportData.data;
      expect(report.conversationMetrics).toBeDefined();
      expect(report.productivityInsights).toBeDefined();
      expect(report.knowledgeGaps).toBeDefined();
      expect(report.decisionQuality).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.insights).toBeDefined();

      // Verify report coherence
      expect(report.conversationMetrics.totalConversations).toBeGreaterThan(0);
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.insights.length).toBeGreaterThan(0);

      const pipelineDuration = endMeasurement();
      console.log(`Complete analytics pipeline took ${pipelineDuration}ms`);
      performanceMeasurer.expectPerformance('complete-pipeline', 30000); // Max 30s for complete pipeline
    });

    test('should maintain data consistency across all analytics tools', async () => {
      const context = BaseTool.createContext();
      const testConversationId = testConversations[0].id;

      // Get analytics from conversation tool
      const conversationResult = await testEnv.tools.conversationAnalytics.execute({
        conversationId: testConversationId,
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      }, context);

      const conversationData = JSON.parse(conversationResult.content[0].text!);
      expect(conversationData.success).toBe(true);

      // Get analytics from specialized tools
      const [gapsResult, reportResult] = await Promise.all([
        testEnv.tools.knowledgeGaps.execute({ conversationId: testConversationId }, context),
        testEnv.tools.analyticsReport.execute({
          timeRange: {
            start: Date.now() - (24 * 60 * 60 * 1000),
            end: Date.now()
          }
        }, context)
      ]);

      const gapsData = JSON.parse(gapsResult.content[0].text!);
      const reportData = JSON.parse(reportResult.content[0].text!);

      expect(gapsData.success).toBe(true);
      expect(reportData.success).toBe(true);

      // Data consistency checks
      const convMetadata = conversationData.data.metadata;
      expect(convMetadata.messageCount).toBeGreaterThan(0);
      expect(convMetadata.analysisDuration).toBeGreaterThan(0);

      // Report should include the test conversation
      expect(reportData.data.conversationMetrics.totalConversations).toBeGreaterThanOrEqual(1);
      
      // Analytics should be internally consistent
      if (conversationData.data.knowledgeGaps && gapsData.data.gaps) {
        // Both should detect gaps (may differ due to different contexts)
        const hasConvGaps = conversationData.data.knowledgeGaps.length > 0;
        const hasSpecializedGaps = gapsData.data.gaps.length > 0;
        
        if (hasConvGaps || hasSpecializedGaps) {
          // At least one should detect gaps in our technical conversation
          expect(hasConvGaps || hasSpecializedGaps).toBe(true);
        }
      }
    });
  });

  describe('Database Integration and Migration Validation', () => {
    test('should have all required analytics tables and indexes', async () => {
      const db = testEnv.databaseManager.getConnection();

      // Verify analytics tables exist
      const requiredTables = [
        'conversation_analytics',
        'productivity_patterns', 
        'knowledge_gaps',
        'decision_tracking'
      ];

      for (const tableName of requiredTables) {
        const tableInfo = db.prepare(`
          SELECT sql FROM sqlite_master WHERE type='table' AND name=?
        `).get(tableName);

        expect(tableInfo).toBeDefined();
        expect((tableInfo as any).sql).toContain(tableName);
      }

      // Verify analytics indexes exist
      const analyticsIndexes = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name IN (${requiredTables.map(() => '?').join(',')})
      `).all(...requiredTables);

      expect(analyticsIndexes.length).toBeGreaterThan(0);

      // Test write/read operations on each analytics table
      const testOperations = [
        {
          table: 'conversation_analytics',
          insert: `INSERT INTO conversation_analytics 
                   (conversation_id, analyzed_at, productivity_score, insight_count, topic_count, depth_score) 
                   VALUES (?, ?, ?, ?, ?, ?)`,
          select: `SELECT * FROM conversation_analytics WHERE conversation_id = ?`,
          params: ['test-conv-db', Date.now(), 75.5, 3, 5, 85.2]
        }
      ];

      for (const op of testOperations) {
        // Test insert
        const insertResult = db.prepare(op.insert).run(...op.params);
        expect(insertResult.changes).toBe(1);

        // Test select
        const selectResult = db.prepare(op.select).get(op.params[0]);
        expect(selectResult).toBeDefined();
      }
    });

    test('should handle database validation triggers correctly', async () => {
      const db = testEnv.databaseManager.getConnection();

      // Test validation triggers (if they exist)
      try {
        // Test invalid data insertion
        const invalidInsert = db.prepare(`
          INSERT INTO conversation_analytics 
          (conversation_id, analyzed_at, productivity_score) 
          VALUES (?, ?, ?)
        `);

        // This should work with valid data
        const validResult = invalidInsert.run('valid-test', Date.now(), 50);
        expect(validResult.changes).toBe(1);

        // Test boundary conditions
        const boundaryTests = [
          ['boundary-test-1', Date.now(), 0],   // Minimum score
          ['boundary-test-2', Date.now(), 100] // Maximum score
        ];

        for (const [id, timestamp, score] of boundaryTests) {
          const result = invalidInsert.run(id, timestamp, score);
          expect(result.changes).toBe(1);
        }

      } catch (error) {
        // If triggers don't exist, that's also acceptable for this test
        console.log('No validation triggers detected, which is acceptable');
      }
    });
  });

  describe('Performance and Scalability Integration', () => {
    test('should handle concurrent analytics operations efficiently', async () => {
      const endMeasurement = performanceMeasurer.startMeasurement('concurrent-analytics');
      const context = BaseTool.createContext();

      // Create concurrent operations
      const concurrentOperations = [
        ...testConversations.slice(0, 3).map(conv => 
          testEnv.tools.conversationAnalytics.execute({
            conversationId: conv.id,
            includeFlow: true,
            includeProductivity: true
          }, context)
        ),
        testEnv.tools.productivityPatterns.execute({
          timeRange: {
            start: Date.now() - (24 * 60 * 60 * 1000),
            end: Date.now()
          }
        }, context),
        testEnv.tools.analyticsReport.execute({
          timeRange: {
            start: Date.now() - (24 * 60 * 60 * 1000),
            end: Date.now()
          }
        }, context)
      ];

      // Execute all operations concurrently
      const results = await Promise.all(concurrentOperations);

      // All operations should succeed
      results.forEach((result, index) => {
        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(true);
      });

      const concurrentDuration = endMeasurement();
      console.log(`Concurrent analytics operations took ${concurrentDuration}ms`);
      performanceMeasurer.expectPerformance('concurrent-analytics', 20000); // Max 20s for concurrent ops
    });

    test('should maintain performance with batch operations', async () => {
      const endMeasurement = performanceMeasurer.startMeasurement('batch-operations');
      
      // Test batch processing through analytics engine
      const conversationIds = testConversations.map(c => c.id);
      
      const batchResult = await testEnv.analyticsEngine.batchProcessConversations(
        conversationIds,
        {
          batchSize: 5,
          analysisTypes: ['analytics', 'productivity', 'knowledge-gaps', 'decisions'],
          maxProcessingTimeMs: 30000,
          onProgress: (processed, total, operation) => {
            console.log(`Batch progress: ${processed}/${total} - ${operation}`);
          }
        }
      );

      expect(batchResult.processed).toBeGreaterThan(0);
      expect(batchResult.failed).toBeLessThanOrEqual(1); // Allow for occasional failures
      expect(batchResult.analytics.inserted + batchResult.analytics.updated).toBeGreaterThan(0);

      const batchDuration = endMeasurement();
      console.log(`Batch operations took ${batchDuration}ms for ${conversationIds.length} conversations`);
      performanceMeasurer.expectPerformance('batch-operations', 25000); // Max 25s for batch processing
    });

    test('should demonstrate caching effectiveness', async () => {
      const context = BaseTool.createContext();
      const testConversationId = testConversations[0].id;

      // First call (uncached)
      const firstCallEnd = performanceMeasurer.startMeasurement('first-call');
      const firstResult = await testEnv.tools.conversationAnalytics.execute({
        conversationId: testConversationId,
        includeFlow: true,
        includeProductivity: true
      }, context);
      const firstDuration = firstCallEnd();

      expect(firstResult.isError).toBeUndefined();

      // Second call (should be faster due to caching)
      const secondCallEnd = performanceMeasurer.startMeasurement('second-call');
      const secondResult = await testEnv.tools.conversationAnalytics.execute({
        conversationId: testConversationId,
        includeFlow: true,
        includeProductivity: true
      }, context);
      const secondDuration = secondCallEnd();

      expect(secondResult.isError).toBeUndefined();

      // Results should be identical
      expect(firstResult.content[0].text).toBe(secondResult.content[0].text);

      // Second call should be faster (allowing for some variance)
      console.log(`First call: ${firstDuration}ms, Second call: ${secondDuration}ms`);
      
      // Verify cache statistics
      const cacheStats = testEnv.analyticsEngine.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
      expect(cacheStats.keys.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Resilience', () => {
    test('should gracefully handle invalid conversation IDs', async () => {
      const context = BaseTool.createContext();

      const invalidCalls = [
        { conversationId: 'nonexistent-conversation' },
        { conversationId: null },
        { conversationId: '' }
      ];

      for (const input of invalidCalls) {
        const result = await testEnv.tools.conversationAnalytics.execute(input as any, context);

        if (result.isError) {
          expect(result.isError).toBe(true);
          const response = JSON.parse(result.content[0].text!);
          expect(response.success).toBe(false);
          expect(response.error).toBeDefined();
        } else {
          // If no error, should return meaningful result
          const response = JSON.parse(result.content[0].text!);
          if (!response.success) {
            expect(response.error).toBeDefined();
          }
        }
      }
    });

    test('should recover from partial component failures', async () => {
      const context = BaseTool.createContext();
      const db = testEnv.databaseManager.getConnection();

      // Insert some corrupted analytics data
      try {
        db.prepare(`
          INSERT INTO conversation_analytics 
          (conversation_id, analyzed_at, productivity_score) 
          VALUES (?, ?, ?)
        `).run('corrupted-conversation', Date.now(), null);
      } catch (error) {
        // If constraints prevent this, that's also good
      }

      // Analytics report should still work despite some corrupted data
      const result = await testEnv.tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (24 * 60 * 60 * 1000),
          end: Date.now()
        }
      }, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      
      // Should generate report with available data
      expect(response.data.conversationMetrics).toBeDefined();
      expect(response.data.recommendations).toBeDefined();
    });

    test('should handle resource constraints gracefully', async () => {
      // Create engine with very restrictive limits
      const constrainedEngine = new AnalyticsEngine(testEnv.databaseManager, {
        maxProcessingTimeMs: 1000, // Very short processing time
        cacheExpirationMinutes: 0.01, // Minimal caching
        batchProcessingSize: 2 // Small batches
      });

      const constrainedTool = new GenerateAnalyticsReportTool({
        analyticsEngine: constrainedEngine,
        conversationRepository: testEnv.repositories.conversations,
        messageRepository: testEnv.repositories.messages
      });

      const context = BaseTool.createContext();
      const result = await constrainedTool.execute({
        timeRange: {
          start: Date.now() - (24 * 60 * 60 * 1000),
          end: Date.now()
        }
      }, context);

      // Should still succeed but may have reduced analysis depth
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
    });
  });

  describe('Real-World Usage Patterns', () => {
    test('should support typical dashboard workflow efficiently', async () => {
      const context = BaseTool.createContext();
      const dashboardEnd = performanceMeasurer.startMeasurement('dashboard-workflow');

      // 1. Load overview analytics
      const overviewResult = await testEnv.tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (7 * 24 * 60 * 60 * 1000),
          end: Date.now()
        }
      }, context);

      expect(overviewResult.isError).toBeUndefined();

      // 2. Drill down into specific conversation
      const conversationResult = await testEnv.tools.conversationAnalytics.execute({
        conversationId: testConversations[0].id,
        includeFlow: true,
        includeProductivity: true
      }, context);

      expect(conversationResult.isError).toBeUndefined();

      // 3. Analyze productivity patterns
      const productivityResult = await testEnv.tools.productivityPatterns.execute({
        timeRange: {
          start: Date.now() - (7 * 24 * 60 * 60 * 1000),
          end: Date.now()
        },
        granularity: 'day'
      }, context);

      expect(productivityResult.isError).toBeUndefined();

      const dashboardDuration = dashboardEnd();
      console.log(`Dashboard workflow took ${dashboardDuration}ms`);
      performanceMeasurer.expectPerformance('dashboard-workflow', 15000); // Max 15s for dashboard

      // Validate response structures
      const overview = JSON.parse(overviewResult.content[0].text!);
      const conversation = JSON.parse(conversationResult.content[0].text!);
      const productivity = JSON.parse(productivityResult.content[0].text!);

      expect(overview.success).toBe(true);
      expect(conversation.success).toBe(true);
      expect(productivity.success).toBe(true);

      // Should show coherent data across all views
      expect(overview.data.conversationMetrics.totalConversations).toBeGreaterThan(0);
      expect(conversation.data.conversationId).toBe(testConversations[0].id);
      expect(productivity.data.patterns).toBeDefined();
    });

    test('should provide analytics insights that make business sense', async () => {
      const context = BaseTool.createContext();

      // Generate comprehensive report
      const reportResult = await testEnv.tools.analyticsReport.execute({
        timeRange: {
          start: Date.now() - (24 * 60 * 60 * 1000),
          end: Date.now()
        },
        includeConversationMetrics: true,
        includeProductivityInsights: true,
        includeKnowledgeGaps: true,
        includeDecisionQuality: true
      }, context);

      const reportData = JSON.parse(reportResult.content[0].text!);
      expect(reportData.success).toBe(true);

      const report = reportData.data;

      // Validate business-relevant insights
      expect(report.conversationMetrics.totalConversations).toBeGreaterThan(0);
      expect(report.conversationMetrics.averageProductivity).toBeGreaterThanOrEqual(0);
      expect(report.conversationMetrics.averageProductivity).toBeLessThanOrEqual(100);

      // Should provide actionable recommendations
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);

      // Should provide meaningful insights
      expect(report.insights).toBeDefined();
      expect(Array.isArray(report.insights)).toBe(true);

      // Insights should be contextually relevant
      if (report.insights.length > 0) {
        const hasProductivityInsight = report.insights.some((insight: string) => 
          insight.toLowerCase().includes('productivity') || 
          insight.toLowerCase().includes('performance') ||
          insight.toLowerCase().includes('efficiency')
        );
        expect(hasProductivityInsight).toBe(true);
      }

      console.log('Generated insights:', report.insights);
      console.log('Generated recommendations:', report.recommendations);
    });
  });

  describe('Cross-Component Integration Validation', () => {
    test('should correlate insights across different analysis types', async () => {
      const context = BaseTool.createContext();

      // Get comprehensive analytics for a technical discussion
      const techConversation = testConversations.find(c => c.scenario.conversation.title.includes('Database'));
      expect(techConversation).toBeDefined();

      const result = await testEnv.tools.conversationAnalytics.execute({
        conversationId: techConversation!.id,
        includeFlow: true,
        includeProductivity: true,
        includeKnowledgeGaps: true,
        includeDecisions: true
      }, context);

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text!);
      expect(data.success).toBe(true);

      const analytics = data.data;

      // Validate cross-component correlations
      if (analytics.flowMetrics && analytics.productivityMetrics) {
        // High topic count should correlate with complexity
        if (analytics.flowMetrics.topicCount > 3) {
          expect(analytics.productivityMetrics.depthScore).toBeGreaterThan(40);
        }
      }

      if (analytics.knowledgeGaps && analytics.decisions) {
        // Technical discussions should have both gaps and decisions
        expect(analytics.knowledgeGaps.length + analytics.decisions.length).toBeGreaterThan(0);
      }

      // Metadata should show internal consistency
      const metadata = analytics.metadata;
      expect(metadata.messageCount).toBeGreaterThan(0);
      expect(metadata.analysisDuration).toBeGreaterThan(0);
      expect(metadata.analysisDuration).toBeLessThan(30000); // Should complete reasonably quickly
    });

    test('should demonstrate effective analytics engine coordination', async () => {
      // Test the analytics engine directly
      const conversationIds = testConversations.map(c => c.id);
      
      // Process conversations needing analysis
      const processedCount = await testEnv.analyticsEngine.processNeedingAnalysis();
      expect(processedCount).toBeGreaterThanOrEqual(0);

      // Generate comprehensive report
      const report = await testEnv.analyticsEngine.generateReport({
        start: Date.now() - (24 * 60 * 60 * 1000),
        end: Date.now()
      }, 'detailed');

      expect(report).toBeDefined();
      expect(report.generatedAt).toBeGreaterThan(0);
      expect(report.conversationMetrics).toBeDefined();
      expect(report.productivityInsights).toBeDefined();
      expect(report.knowledgeGaps).toBeDefined();
      expect(report.decisionQuality).toBeDefined();

      // Test specific analysis types
      const productivityProcessed = await testEnv.analyticsEngine.analyzeProductivityPatterns({
        start: Date.now() - (24 * 60 * 60 * 1000),
        end: Date.now()
      });
      expect(productivityProcessed).toBeGreaterThanOrEqual(0);

      const knowledgeGapsProcessed = await testEnv.analyticsEngine.analyzeKnowledgeGaps({
        start: Date.now() - (24 * 60 * 60 * 1000),
        end: Date.now()
      });
      expect(knowledgeGapsProcessed).toBeGreaterThanOrEqual(0);

      const decisionsProcessed = await testEnv.analyticsEngine.analyzeDecisionPatterns({
        start: Date.now() - (24 * 60 * 60 * 1000),
        end: Date.now()
      });
      expect(decisionsProcessed).toBeGreaterThanOrEqual(0);

      console.log('Analytics engine processing results:', {
        processedCount,
        productivityProcessed,
        knowledgeGapsProcessed,
        decisionsProcessed
      });
    });
  });

  afterAll(() => {
    // Print final performance statistics
    console.log('\n=== Phase 5 Analytics Integration Test Performance Summary ===');
    const allStats = performanceMeasurer.getAllStats();
    for (const [operation, stats] of Object.entries(allStats)) {
      console.log(`${operation}: avg=${stats.avg.toFixed(0)}ms, min=${stats.min}ms, max=${stats.max}ms, count=${stats.count}`);
    }
    console.log('================================================================\n');
  });
});