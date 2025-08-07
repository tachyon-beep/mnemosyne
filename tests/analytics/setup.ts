/**
 * Analytics Test Setup Utilities
 * 
 * Provides utilities for setting up analytics tests with comprehensive test data,
 * mock dependencies, and analytics-specific test helpers.
 */

import { DatabaseManager } from '../../src/storage/Database';
import { AnalyticsEngine } from '../../src/analytics/services/AnalyticsEngine';
import { ConversationFlowAnalyzer } from '../../src/analytics/analyzers/ConversationFlowAnalyzer';
import { ProductivityAnalyzer } from '../../src/analytics/analyzers/ProductivityAnalyzer';
import { KnowledgeGapDetector } from '../../src/analytics/analyzers/KnowledgeGapDetector';
import { DecisionTracker } from '../../src/analytics/analyzers/DecisionTracker';
import {
  ConversationAnalyticsRepository,
  ProductivityPatternsRepository,
  KnowledgeGapsRepository,
  DecisionTrackingRepository
} from '../../src/analytics/repositories';
import { ConversationRepository } from '../../src/storage/repositories/ConversationRepository';
import { MessageRepository } from '../../src/storage/repositories/MessageRepository';
import { createTestDatabase } from '../utils/test-helpers';

export interface TestAnalyticsData {
  conversations: TestConversation[];
  productivityPatterns: TestProductivityPattern[];
  knowledgeGaps: TestKnowledgeGap[];
  decisions: TestDecision[];
  insights: TestInsight[];
}

export interface TestConversation {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messages: TestMessage[];
  analytics?: {
    topicCount: number;
    depthScore: number;
    productivityScore: number;
    insightCount: number;
  };
}

export interface TestMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

export interface TestProductivityPattern {
  windowType: 'hour' | 'day' | 'week' | 'month';
  windowStart: number;
  windowEnd: number;
  avgProductivityScore: number;
  peakHours: number[];
  totalConversations: number;
  totalMessages: number;
}

export interface TestKnowledgeGap {
  gapType: 'question' | 'topic' | 'skill' | 'concept';
  content: string;
  frequency: number;
  firstOccurrence: number;
  lastOccurrence: number;
  resolved: boolean;
  explorationDepth: number;
}

export interface TestDecision {
  decisionSummary: string;
  decisionType: 'strategic' | 'tactical' | 'operational' | 'personal';
  conversationIds: string[];
  decisionMadeAt: number;
  clarityScore: number;
  confidenceLevel: number;
  outcomeScore?: number;
  status: 'pending' | 'decided' | 'implemented' | 'assessed' | 'reversed';
}

export interface TestInsight {
  conversationId: string;
  messageId?: string;
  insightType: 'breakthrough' | 'connection' | 'pattern' | 'solution' | 'realization';
  insightSummary: string;
  significanceScore: number;
  noveltyScore: number;
  applicabilityScore: number;
}

/**
 * Create in-memory database with analytics schema
 */
export async function createAnalyticsTestDatabase(): Promise<DatabaseManager> {
  const dbManager = await createTestDatabase();
  const db = dbManager.getConnection();

  // Run analytics migration (simplified for testing)
  db.exec(`
    -- Analytics tables
    CREATE TABLE IF NOT EXISTS conversation_analytics (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      conversation_id TEXT NOT NULL,
      analyzed_at INTEGER NOT NULL,
      topic_count INTEGER NOT NULL DEFAULT 0,
      topic_transitions INTEGER NOT NULL DEFAULT 0,
      depth_score REAL NOT NULL DEFAULT 0,
      circularity_index REAL NOT NULL DEFAULT 0,
      productivity_score REAL NOT NULL DEFAULT 0,
      resolution_time INTEGER,
      insight_count INTEGER DEFAULT 0,
      breakthrough_count INTEGER DEFAULT 0,
      question_quality_avg REAL DEFAULT 0,
      response_quality_avg REAL DEFAULT 0,
      engagement_score REAL DEFAULT 0,
      metadata TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS productivity_patterns (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      window_start INTEGER NOT NULL,
      window_end INTEGER NOT NULL,
      window_type TEXT NOT NULL,
      total_conversations INTEGER NOT NULL DEFAULT 0,
      total_messages INTEGER NOT NULL DEFAULT 0,
      total_decisions INTEGER DEFAULT 0,
      total_insights INTEGER DEFAULT 0,
      avg_productivity_score REAL NOT NULL DEFAULT 0,
      peak_productivity_score REAL DEFAULT 0,
      min_productivity_score REAL DEFAULT 0,
      peak_hours TEXT,
      effective_question_patterns TEXT,
      breakthrough_indicators TEXT,
      optimal_session_length INTEGER,
      sample_size INTEGER NOT NULL DEFAULT 0,
      confidence_level REAL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS knowledge_gaps (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      gap_type TEXT NOT NULL,
      content TEXT NOT NULL,
      normalized_content TEXT NOT NULL,
      frequency INTEGER NOT NULL DEFAULT 1,
      first_occurrence INTEGER NOT NULL,
      last_occurrence INTEGER NOT NULL,
      exploration_depth REAL DEFAULT 0,
      resolved BOOLEAN DEFAULT FALSE,
      resolution_conversation_id TEXT,
      resolution_date INTEGER,
      resolution_quality REAL DEFAULT 0,
      learning_curve_gradient REAL DEFAULT 0,
      estimated_time_to_mastery INTEGER,
      related_entities TEXT,
      related_gaps TEXT,
      suggested_actions TEXT,
      suggested_resources TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (resolution_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS decision_tracking (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      decision_summary TEXT NOT NULL,
      decision_type TEXT,
      conversation_ids TEXT NOT NULL,
      problem_identified_at INTEGER,
      options_considered_at INTEGER,
      decision_made_at INTEGER NOT NULL,
      implementation_started_at INTEGER,
      outcome_assessed_at INTEGER,
      clarity_score REAL DEFAULT 0,
      confidence_level REAL DEFAULT 0,
      consensus_level REAL DEFAULT 0,
      reversal_count INTEGER DEFAULT 0,
      modification_count INTEGER DEFAULT 0,
      outcome_score REAL,
      outcome_assessment TEXT,
      information_completeness REAL DEFAULT 0,
      stakeholder_count INTEGER DEFAULT 0,
      alternatives_considered INTEGER DEFAULT 0,
      risk_assessed BOOLEAN DEFAULT FALSE,
      success_factors TEXT,
      failure_factors TEXT,
      lessons_learned TEXT,
      tags TEXT,
      priority TEXT,
      status TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    );

    CREATE TABLE IF NOT EXISTS insights (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      conversation_id TEXT NOT NULL,
      message_id TEXT,
      insight_type TEXT,
      insight_summary TEXT NOT NULL,
      trigger_pattern TEXT,
      significance_score REAL DEFAULT 0,
      novelty_score REAL DEFAULT 0,
      applicability_score REAL DEFAULT 0,
      influenced_decisions TEXT,
      resolved_gaps TEXT,
      tags TEXT,
      validated BOOLEAN DEFAULT FALSE,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topic_evolution (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      topic TEXT NOT NULL,
      normalized_topic TEXT NOT NULL,
      first_mentioned_at INTEGER NOT NULL,
      last_discussed_at INTEGER NOT NULL,
      total_mentions INTEGER DEFAULT 1,
      conversation_count INTEGER DEFAULT 1,
      understanding_level REAL DEFAULT 0,
      complexity_score REAL DEFAULT 0,
      branching_factor REAL DEFAULT 0,
      parent_topic_id TEXT,
      child_topic_ids TEXT,
      related_topic_ids TEXT,
      tags TEXT,
      importance_score REAL DEFAULT 0,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      FOREIGN KEY (parent_topic_id) REFERENCES topic_evolution(id) ON DELETE SET NULL
    );

    -- Create indexes
    CREATE INDEX idx_conversation_analytics_conversation ON conversation_analytics(conversation_id);
    CREATE INDEX idx_productivity_patterns_window_type ON productivity_patterns(window_type, window_start DESC);
    CREATE INDEX idx_knowledge_gaps_active ON knowledge_gaps(resolved, gap_type, frequency DESC);
    CREATE INDEX idx_decision_tracking_timeline_status ON decision_tracking(decision_made_at DESC, status);
    CREATE INDEX idx_insights_conversation_type ON insights(conversation_id, insight_type, created_at DESC);
    CREATE INDEX idx_topic_evolution_normalized_activity ON topic_evolution(normalized_topic, last_discussed_at DESC);
  `);

  return dbManager;
}

/**
 * Create comprehensive analytics test data
 */
export function createAnalyticsTestData(): TestAnalyticsData {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const hourMs = 60 * 60 * 1000;

  const conversations: TestConversation[] = [
    {
      id: 'conv-analytics-1',
      title: 'Advanced React Patterns Discussion',
      createdAt: now - (7 * dayMs),
      updatedAt: now - (7 * dayMs) + (2 * hourMs),
      analytics: {
        topicCount: 8,
        depthScore: 85.2,
        productivityScore: 92.1,
        insightCount: 4
      },
      messages: [
        {
          id: 'msg-analytics-1',
          conversationId: 'conv-analytics-1',
          role: 'user',
          content: 'I need to understand advanced React patterns like render props, HOCs, and hooks composition. Can you help me design a complex form system?',
          createdAt: now - (7 * dayMs)
        },
        {
          id: 'msg-analytics-2',
          conversationId: 'conv-analytics-1',
          role: 'assistant',
          content: 'Absolutely! Let\'s explore these patterns systematically. Render props provide a way to share code between components using a function prop. HOCs wrap components to add functionality. Modern hooks composition can achieve both patterns\' benefits with better ergonomics.',
          createdAt: now - (7 * dayMs) + (5 * 60 * 1000)
        },
        {
          id: 'msg-analytics-3',
          conversationId: 'conv-analytics-1',
          role: 'user',
          content: 'How would you decide between these patterns? What are the trade-offs?',
          createdAt: now - (7 * dayMs) + (15 * 60 * 1000)
        },
        {
          id: 'msg-analytics-4',
          conversationId: 'conv-analytics-1',
          role: 'assistant',
          content: 'Great question! The decision depends on several factors: reusability needs, type safety requirements, performance considerations, and team familiarity. Hooks composition is generally preferred for new code due to better DevTools support and simpler testing.',
          createdAt: now - (7 * dayMs) + (20 * 60 * 1000)
        }
      ]
    },
    {
      id: 'conv-analytics-2',
      title: 'Machine Learning Model Evaluation',
      createdAt: now - (3 * dayMs),
      updatedAt: now - (3 * dayMs) + (1.5 * hourMs),
      analytics: {
        topicCount: 6,
        depthScore: 78.4,
        productivityScore: 88.7,
        insightCount: 3
      },
      messages: [
        {
          id: 'msg-analytics-5',
          conversationId: 'conv-analytics-2',
          role: 'user',
          content: 'I\'m struggling with model evaluation metrics. My accuracy is high but precision and recall are concerning. How do I interpret these conflicting signals?',
          createdAt: now - (3 * dayMs)
        },
        {
          id: 'msg-analytics-6',
          conversationId: 'conv-analytics-2',
          role: 'assistant',
          content: 'This suggests class imbalance issues. High accuracy with poor precision/recall typically indicates your model is biased toward the majority class. Let\'s examine your confusion matrix and consider stratified sampling, different thresholds, or balanced loss functions.',
          createdAt: now - (3 * dayMs) + (8 * 60 * 1000)
        }
      ]
    },
    {
      id: 'conv-analytics-3',
      title: 'Database Design Consultation',
      createdAt: now - dayMs,
      updatedAt: now - dayMs + (3 * hourMs),
      analytics: {
        topicCount: 12,
        depthScore: 91.3,
        productivityScore: 85.9,
        insightCount: 5
      },
      messages: [
        {
          id: 'msg-analytics-7',
          conversationId: 'conv-analytics-3',
          role: 'user',
          content: 'I need to design a database schema for a multi-tenant SaaS application. Should I use separate schemas, row-level security, or separate databases?',
          createdAt: now - dayMs
        },
        {
          id: 'msg-analytics-8',
          conversationId: 'conv-analytics-3',
          role: 'assistant',
          content: 'Each approach has distinct trade-offs. Separate databases provide maximum isolation but increase operational complexity. Row-level security offers good balance but requires careful query optimization. Let\'s analyze your specific requirements: tenant count, data isolation needs, and scaling expectations.',
          createdAt: now - dayMs + (12 * 60 * 1000)
        }
      ]
    }
  ];

  const productivityPatterns: TestProductivityPattern[] = [
    {
      windowType: 'day',
      windowStart: now - dayMs,
      windowEnd: now,
      avgProductivityScore: 89.5,
      peakHours: [9, 10, 14, 15, 16],
      totalConversations: 3,
      totalMessages: 12
    },
    {
      windowType: 'week',
      windowStart: now - (7 * dayMs),
      windowEnd: now,
      avgProductivityScore: 85.2,
      peakHours: [9, 10, 11, 14, 15, 16, 17],
      totalConversations: 8,
      totalMessages: 45
    }
  ];

  const knowledgeGaps: TestKnowledgeGap[] = [
    {
      gapType: 'concept',
      content: 'Understanding of React server components and their implications',
      frequency: 3,
      firstOccurrence: now - (10 * dayMs),
      lastOccurrence: now - (2 * dayMs),
      resolved: false,
      explorationDepth: 65.2
    },
    {
      gapType: 'skill',
      content: 'Advanced SQL query optimization techniques',
      frequency: 2,
      firstOccurrence: now - (5 * dayMs),
      lastOccurrence: now - dayMs,
      resolved: true,
      explorationDepth: 88.1
    },
    {
      gapType: 'topic',
      content: 'Machine learning model interpretability methods',
      frequency: 4,
      firstOccurrence: now - (8 * dayMs),
      lastOccurrence: now - (3 * dayMs),
      resolved: false,
      explorationDepth: 72.8
    }
  ];

  const decisions: TestDecision[] = [
    {
      decisionSummary: 'Adopt hooks composition over HOCs for new React components',
      decisionType: 'strategic',
      conversationIds: ['conv-analytics-1'],
      decisionMadeAt: now - (7 * dayMs) + (30 * 60 * 1000),
      clarityScore: 92.1,
      confidenceLevel: 88.5,
      outcomeScore: 91.2,
      status: 'implemented'
    },
    {
      decisionSummary: 'Use row-level security for multi-tenant database design',
      decisionType: 'tactical',
      conversationIds: ['conv-analytics-3'],
      decisionMadeAt: now - dayMs + (45 * 60 * 1000),
      clarityScore: 85.3,
      confidenceLevel: 79.1,
      status: 'decided'
    }
  ];

  const insights: TestInsight[] = [
    {
      conversationId: 'conv-analytics-1',
      messageId: 'msg-analytics-4',
      insightType: 'breakthrough',
      insightSummary: 'Hooks composition provides better testing ergonomics than traditional patterns',
      significanceScore: 89.2,
      noveltyScore: 76.4,
      applicabilityScore: 92.1
    },
    {
      conversationId: 'conv-analytics-2',
      messageId: 'msg-analytics-6',
      insightType: 'connection',
      insightSummary: 'Class imbalance directly correlates with accuracy-precision divergence',
      significanceScore: 94.1,
      noveltyScore: 65.2,
      applicabilityScore: 87.3
    },
    {
      conversationId: 'conv-analytics-3',
      messageId: 'msg-analytics-8',
      insightType: 'pattern',
      insightSummary: 'Multi-tenancy decisions require balancing isolation, complexity, and scalability',
      significanceScore: 91.8,
      noveltyScore: 71.5,
      applicabilityScore: 89.6
    }
  ];

  return {
    conversations,
    productivityPatterns,
    knowledgeGaps,
    decisions,
    insights
  };
}

/**
 * Insert analytics test data into database
 */
export async function insertAnalyticsTestData(
  dbManager: DatabaseManager,
  data: TestAnalyticsData
): Promise<void> {
  const db = dbManager.getConnection();

  // Insert conversations and messages
  const insertConv = db.prepare(`
    INSERT INTO conversations (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  const insertMsg = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertAnalytics = db.prepare(`
    INSERT INTO conversation_analytics 
    (conversation_id, analyzed_at, topic_count, depth_score, productivity_score, insight_count)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertPattern = db.prepare(`
    INSERT INTO productivity_patterns 
    (window_type, window_start, window_end, avg_productivity_score, peak_hours, total_conversations, total_messages)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const insertGap = db.prepare(`
    INSERT INTO knowledge_gaps 
    (gap_type, content, normalized_content, frequency, first_occurrence, last_occurrence, resolved, exploration_depth)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertDecision = db.prepare(`
    INSERT INTO decision_tracking 
    (decision_summary, decision_type, conversation_ids, decision_made_at, clarity_score, confidence_level, outcome_score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertInsight = db.prepare(`
    INSERT INTO insights 
    (conversation_id, message_id, insight_type, insight_summary, significance_score, novelty_score, applicability_score)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    // Insert conversations and messages
    for (const conv of data.conversations) {
      insertConv.run(conv.id, conv.title, conv.createdAt, conv.updatedAt);
      
      for (const msg of conv.messages) {
        insertMsg.run(msg.id, msg.conversationId, msg.role, msg.content, msg.createdAt);
      }
      
      // Insert analytics if available
      if (conv.analytics) {
        insertAnalytics.run(
          conv.id,
          Date.now(),
          conv.analytics.topicCount,
          conv.analytics.depthScore,
          conv.analytics.productivityScore,
          conv.analytics.insightCount
        );
      }
    }

    // Insert productivity patterns
    for (const pattern of data.productivityPatterns) {
      insertPattern.run(
        pattern.windowType,
        pattern.windowStart,
        pattern.windowEnd,
        pattern.avgProductivityScore,
        JSON.stringify(pattern.peakHours),
        pattern.totalConversations,
        pattern.totalMessages
      );
    }

    // Insert knowledge gaps
    for (const gap of data.knowledgeGaps) {
      insertGap.run(
        gap.gapType,
        gap.content,
        gap.content.toLowerCase().replace(/[^a-z0-9\s]/g, ''),
        gap.frequency,
        gap.firstOccurrence,
        gap.lastOccurrence,
        gap.resolved,
        gap.explorationDepth
      );
    }

    // Insert decisions
    for (const decision of data.decisions) {
      insertDecision.run(
        decision.decisionSummary,
        decision.decisionType,
        JSON.stringify(decision.conversationIds),
        decision.decisionMadeAt,
        decision.clarityScore,
        decision.confidenceLevel,
        decision.outcomeScore,
        decision.status
      );
    }

    // Insert insights
    for (const insight of data.insights) {
      insertInsight.run(
        insight.conversationId,
        insight.messageId,
        insight.insightType,
        insight.insightSummary,
        insight.significanceScore,
        insight.noveltyScore,
        insight.applicabilityScore
      );
    }
  });

  transaction();
}

/**
 * Create complete analytics engine setup for testing
 */
export async function createTestAnalyticsEngine(): Promise<{
  dbManager: DatabaseManager;
  analyticsEngine: AnalyticsEngine;
  repositories: {
    conversationAnalytics: ConversationAnalyticsRepository;
    productivityPatterns: ProductivityPatternsRepository;
    knowledgeGaps: KnowledgeGapsRepository;
    decisionTracking: DecisionTrackingRepository;
    conversations: ConversationRepository;
    messages: MessageRepository;
  };
  analyzers: {
    conversationFlow: ConversationFlowAnalyzer;
    productivity: ProductivityAnalyzer;
    knowledgeGap: KnowledgeGapDetector;
    decision: DecisionTracker;
  };
}> {
  const dbManager = await createAnalyticsTestDatabase();
  
  // Create repositories
  const conversationAnalytics = new ConversationAnalyticsRepository(dbManager);
  const productivityPatterns = new ProductivityPatternsRepository(dbManager);
  const knowledgeGaps = new KnowledgeGapsRepository(dbManager);
  const decisionTracking = new DecisionTrackingRepository(dbManager);
  const conversations = new ConversationRepository(dbManager);
  const messages = new MessageRepository(dbManager);

  // Create analyzers
  const conversationFlow = new ConversationFlowAnalyzer();
  const productivity = new ProductivityAnalyzer();
  const knowledgeGap = new KnowledgeGapDetector();
  const decision = new DecisionTracker();

  // Create analytics engine
  const analyticsEngine = new AnalyticsEngine(dbManager, {
    enableIncrementalProcessing: true,
    cacheExpirationMinutes: 5, // Short cache for tests
    batchProcessingSize: 10,
    maxProcessingTimeMs: 5000
  });

  return {
    dbManager,
    analyticsEngine,
    repositories: {
      conversationAnalytics,
      productivityPatterns,
      knowledgeGaps,
      decisionTracking,
      conversations,
      messages
    },
    analyzers: {
      conversationFlow,
      productivity,
      knowledgeGap,
      decision
    }
  };
}

/**
 * Performance timing helper for analytics operations
 */
export class AnalyticsPerformanceTimer {
  private startTime: number;
  private checkpoints: Map<string, number> = new Map();

  constructor() {
    this.startTime = Date.now();
  }

  checkpoint(name: string): void {
    this.checkpoints.set(name, Date.now() - this.startTime);
  }

  getCheckpoint(name: string): number {
    return this.checkpoints.get(name) || 0;
  }

  elapsed(): number {
    return Date.now() - this.startTime;
  }

  expectAnalyticsPerformance(operationName: string, maxMs: number): void {
    const elapsed = this.elapsed();
    if (elapsed > maxMs) {
      throw new Error(`Analytics operation '${operationName}' took ${elapsed}ms, expected under ${maxMs}ms`);
    }
  }

  reset(): void {
    this.startTime = Date.now();
    this.checkpoints.clear();
  }
}

/**
 * Mock time helper for analytics testing
 */
export function setupAnalyticsMockTime(fixedTime: number = Date.now()): void {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(fixedTime));
}

/**
 * Restore real timers
 */
export function restoreAnalyticsTime(): void {
  jest.useRealTimers();
}

/**
 * Assert analytics score within expected range
 */
export function expectAnalyticsScore(
  actual: number,
  expectedMin: number,
  expectedMax: number,
  scoreName: string
): void {
  expect(actual).toBeGreaterThanOrEqual(expectedMin);
  expect(actual).toBeLessThanOrEqual(expectedMax);
  expect(typeof actual).toBe('number');
  expect(isFinite(actual)).toBe(true);
}

/**
 * Assert analytics metadata completeness
 */
export function expectAnalyticsMetadata(
  metadata: any,
  requiredFields: string[]
): void {
  for (const field of requiredFields) {
    expect(metadata).toHaveProperty(field);
  }

  if (metadata.messageCount !== undefined) {
    expect(metadata.messageCount).toBeGreaterThan(0);
  }

  if (metadata.analysisDuration !== undefined) {
    expect(metadata.analysisDuration).toBeGreaterThan(0);
  }

  if (metadata.componentsIncluded) {
    expect(Array.isArray(metadata.componentsIncluded)).toBe(true);
    expect(metadata.componentsIncluded.length).toBeGreaterThan(0);
  }
}

/**
 * Create mock analytics dependencies for isolated testing
 */
export function createMockAnalyticsDependencies() {
  return {
    mockAnalyticsEngine: {
      generateConversationReport: jest.fn(),
      generateProductivityReport: jest.fn(),
      generateKnowledgeGapsReport: jest.fn(),
      generateDecisionQualityReport: jest.fn(),
      analyzeConversation: jest.fn(),
      getCachedReport: jest.fn(),
      clearCache: jest.fn()
    },
    mockConversationFlowAnalyzer: {
      analyzeConversation: jest.fn(),
      detectTopicTransitions: jest.fn(),
      calculateDepthScore: jest.fn(),
      calculateCircularityIndex: jest.fn()
    },
    mockProductivityAnalyzer: {
      analyzeConversation: jest.fn(),
      calculateProductivityScore: jest.fn(),
      identifyBreakthroughs: jest.fn(),
      assessEngagement: jest.fn()
    },
    mockKnowledgeGapDetector: {
      detectGaps: jest.fn(),
      analyzeExplorationDepth: jest.fn(),
      suggestLearningPath: jest.fn(),
      trackResolution: jest.fn()
    },
    mockDecisionTracker: {
      extractDecisions: jest.fn(),
      trackOutcomes: jest.fn(),
      assessQuality: jest.fn(),
      identifyPatterns: jest.fn()
    }
  };
}