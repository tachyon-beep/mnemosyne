/**
 * Unit tests for Follow-up Detector
 * 
 * Tests commitment language detection, temporal promise tracking,
 * stale action identification, and follow-up suggestion generation.
 */

import { DatabaseManager } from '../../../../../src/storage/Database.js';
import { 
  FollowupDetector, 
  DetectedCommitment, 
  TemporalCommitment,
  StaleAction,
  FollowupSuggestion,
  CommitmentType,
  UrgencyLevel,
  CommitmentStatus
} from '../../../../../src/services/proactive/patterns/FollowupDetector.js';
import { Message } from '../../../../../src/types/interfaces.js';
import { createTestDatabase, insertTestData, setupMockTime, restoreTime } from '../../../../utils/test-helpers.js';

describe('FollowupDetector', () => {
  let dbManager: DatabaseManager;
  let detector: FollowupDetector;
  let testConversations: any[];
  let mockTime: number;

  beforeEach(async () => {
    dbManager = await createTestDatabase();
    detector = new FollowupDetector(dbManager);
    
    // Set consistent time for testing
    mockTime = Date.now();
    setupMockTime(mockTime);
    
    testConversations = createFollowupTestData(mockTime);
    await insertTestData(dbManager, testConversations);
  });

  afterEach(async () => {
    restoreTime();
    await dbManager.close();
  });

  describe('detectCommitmentLanguage', () => {
    it('should detect action commitments', async () => {
      const messages = getMessagesWithCommitments(mockTime);
      
      const commitments = await detector.detectCommitmentLanguage(messages, {
        minConfidence: 0.5
      });

      const actionCommitments = commitments.filter(c => c.commitmentType === 'action');
      expect(actionCommitments.length).toBeGreaterThan(0);

      actionCommitments.forEach(commitment => {
        expect(commitment.commitmentType).toBe('action');
        expect(commitment.confidence).toBeGreaterThanOrEqual(0.5);
        expect(['I'll check', "I'll verify", "let me look"].some(pattern => 
          commitment.commitmentText.toLowerCase().includes(pattern.toLowerCase())
        )).toBe(true);
      });
    });

    it('should detect temporal commitments with timeframes', async () => {
      const messages = getMessagesWithCommitments(mockTime);
      
      const commitments = await detector.detectCommitmentLanguage(messages, {
        minConfidence: 0.5
      });

      const temporalCommitments = commitments.filter(c => c.commitmentType === 'temporal');
      expect(temporalCommitments.length).toBeGreaterThan(0);

      temporalCommitments.forEach(commitment => {
        expect(commitment.commitmentType).toBe('temporal');
        expect(commitment.expectedTimeframeDays).toBeDefined();
        expect(commitment.expectedTimeframeDays).toBeGreaterThan(0);
      });
    });

    it('should detect conditional commitments', async () => {
      const messages = [{
        id: 'msg-conditional',
        conversationId: 'test-conv',
        role: 'assistant' as const,
        content: "If you can provide the logs, then I'll investigate the issue thoroughly.",
        createdAt: mockTime - 1000,
        metadata: {}
      }];

      const commitments = await detector.detectCommitmentLanguage(messages, {
        minConfidence: 0.4
      });

      const conditionalCommitments = commitments.filter(c => c.commitmentType === 'conditional');
      expect(conditionalCommitments.length).toBeGreaterThan(0);
      expect(conditionalCommitments[0].commitmentText.toLowerCase()).toContain('if');
    });

    it('should detect delegated commitments', async () => {
      const messages = [{
        id: 'msg-delegated',
        conversationId: 'test-conv',
        role: 'assistant' as const,
        content: "Can you please check the server logs and let me know what you find?",
        createdAt: mockTime - 1000,
        metadata: {}
      }];

      const commitments = await detector.detectCommitmentLanguage(messages, {
        minConfidence: 0.4
      });

      const delegatedCommitments = commitments.filter(c => c.commitmentType === 'delegated');
      expect(delegatedCommitments.length).toBeGreaterThan(0);
      expect(delegatedCommitments[0].commitmentText.toLowerCase()).toContain('can you');
    });

    it('should calculate confidence scores correctly', async () => {
      const messages = getMessagesWithCommitments(mockTime);
      
      const commitments = await detector.detectCommitmentLanguage(messages, {
        minConfidence: 0.3
      });

      commitments.forEach(commitment => {
        expect(commitment.confidence).toBeGreaterThanOrEqual(0.3);
        expect(commitment.confidence).toBeLessThanOrEqual(1.0);
        
        // High-confidence patterns should score higher
        if (commitment.commitmentText.includes("I'll")) {
          expect(commitment.confidence).toBeGreaterThanOrEqual(0.6);
        }
      });
    });

    it('should determine urgency levels correctly', async () => {
      const urgentMessage = {
        id: 'msg-urgent',
        conversationId: 'test-conv',
        role: 'assistant' as const,
        content: "I'll check this urgent issue immediately and get back to you ASAP.",
        createdAt: mockTime - 1000,
        metadata: {}
      };

      const normalMessage = {
        id: 'msg-normal',
        conversationId: 'test-conv',
        role: 'assistant' as const,
        content: "I'll look into this when I can get to it.",
        createdAt: mockTime - 2000,
        metadata: {}
      };

      const urgentCommitments = await detector.detectCommitmentLanguage([urgentMessage], {
        minConfidence: 0.3
      });

      const normalCommitments = await detector.detectCommitmentLanguage([normalMessage], {
        minConfidence: 0.3
      });

      if (urgentCommitments.length > 0) {
        expect(['urgent', 'high']).toContain(urgentCommitments[0].urgencyLevel);
      }

      if (normalCommitments.length > 0) {
        expect(['low', 'normal']).toContain(normalCommitments[0].urgencyLevel);
      }
    });

    it('should filter by minimum confidence', async () => {
      const messages = getMessagesWithCommitments(mockTime);
      
      const lowConfidenceCommitments = await detector.detectCommitmentLanguage(messages, {
        minConfidence: 0.3
      });

      const highConfidenceCommitments = await detector.detectCommitmentLanguage(messages, {
        minConfidence: 0.8
      });

      expect(highConfidenceCommitments.length).toBeLessThanOrEqual(lowConfidenceCommitments.length);
      
      highConfidenceCommitments.forEach(commitment => {
        expect(commitment.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('trackTemporalPromises', () => {
    it('should track promises with specific deadlines', async () => {
      const temporalPromises = await detector.trackTemporalPromises('conv-temporal-test', {
        includePast: true,
        includeCompleted: false,
        maxDaysAhead: 30
      });

      expect(temporalPromises).toBeDefined();
      expect(Array.isArray(temporalPromises)).toBe(true);

      temporalPromises.forEach((promise: TemporalCommitment) => {
        expect(promise.commitmentType).toBe('temporal');
        expect(promise.deadline).toBeDefined();
        expect(promise.timeReference).toBeDefined();
        expect(promise.timeExpression).toBeTruthy();
      });
    });

    it('should sort temporal promises by deadline', async () => {
      const temporalPromises = await detector.trackTemporalPromises('conv-temporal-test', {
        includePast: true,
        includeCompleted: true
      });

      for (let i = 1; i < temporalPromises.length; i++) {
        const prevDeadline = temporalPromises[i - 1].deadline || 0;
        const currentDeadline = temporalPromises[i].deadline || 0;
        expect(prevDeadline).toBeLessThanOrEqual(currentDeadline);
      }
    });

    it('should filter by time window', async () => {
      const allPromises = await detector.trackTemporalPromises('conv-temporal-test', {
        maxDaysAhead: 365
      });

      const shortTermPromises = await detector.trackTemporalPromises('conv-temporal-test', {
        maxDaysAhead: 7
      });

      expect(shortTermPromises.length).toBeLessThanOrEqual(allPromises.length);

      shortTermPromises.forEach(promise => {
        if (promise.deadline) {
          const daysAhead = (promise.deadline - mockTime) / (24 * 60 * 60 * 1000);
          expect(daysAhead).toBeLessThanOrEqual(7);
        }
      });
    });

    it('should exclude completed promises by default', async () => {
      const includingCompleted = await detector.trackTemporalPromises('conv-temporal-test', {
        includeCompleted: true
      });

      const excludingCompleted = await detector.trackTemporalPromises('conv-temporal-test', {
        includeCompleted: false
      });

      expect(excludingCompleted.length).toBeLessThanOrEqual(includingCompleted.length);

      excludingCompleted.forEach(promise => {
        expect(promise.status).not.toBe('completed');
      });
    });
  });

  describe('identifyStaleActions', () => {
    it('should identify actions that have become stale', async () => {
      // Move time forward to make actions stale
      const futureTime = mockTime + (10 * 24 * 60 * 60 * 1000); // 10 days later
      setupMockTime(futureTime);

      const staleActions = await detector.identifyStaleActions({
        conversationId: 'conv-stale-test'
      });

      expect(staleActions).toBeDefined();
      expect(Array.isArray(staleActions)).toBe(true);

      staleActions.forEach((staleAction: StaleAction) => {
        expect(staleAction.commitment).toBeDefined();
        expect(staleAction.daysSinceStale).toBeGreaterThanOrEqual(0);
        expect(['mildly_stale', 'stale', 'very_stale', 'abandoned']).toContain(staleAction.stalenessLevel);
        expect(staleAction.stalenessReason).toBeTruthy();
        expect(Array.isArray(staleAction.suggestedActions)).toBe(true);
      });
    });

    it('should sort stale actions by staleness level', async () => {
      // Move time forward significantly
      const futureTime = mockTime + (20 * 24 * 60 * 60 * 1000); // 20 days later
      setupMockTime(futureTime);

      const staleActions = await detector.identifyStaleActions({});

      const stalenessScores = {
        'abandoned': 4,
        'very_stale': 3,
        'stale': 2,
        'mildly_stale': 1
      };

      for (let i = 1; i < staleActions.length; i++) {
        const prevScore = stalenessScores[staleActions[i - 1].stalenessLevel];
        const currentScore = stalenessScores[staleActions[i].stalenessLevel];
        expect(prevScore).toBeGreaterThanOrEqual(currentScore);
      }
    });

    it('should apply urgency-based staleness thresholds', async () => {
      const futureTime = mockTime + (2 * 24 * 60 * 60 * 1000); // 2 days later
      setupMockTime(futureTime);

      const staleActions = await detector.identifyStaleActions({
        stalenessConfig: {
          urgencyThresholds: {
            urgent: 1,
            high: 2,
            normal: 5,
            low: 10
          }
        }
      });

      // High and urgent items should be stale after 2 days
      const highUrgencyStale = staleActions.filter(action => 
        ['urgent', 'high'].includes(action.commitment.urgencyLevel)
      );

      expect(highUrgencyStale.length).toBeGreaterThan(0);
    });

    it('should generate appropriate follow-up suggestions', async () => {
      const futureTime = mockTime + (5 * 24 * 60 * 60 * 1000); // 5 days later
      setupMockTime(futureTime);

      const staleActions = await detector.identifyStaleActions({});

      staleActions.forEach(staleAction => {
        expect(staleAction.suggestedActions.length).toBeGreaterThan(0);
        
        staleAction.suggestedActions.forEach(suggestion => {
          expect(suggestion.suggestionType).toBeDefined();
          expect(['low', 'medium', 'high', 'urgent']).toContain(suggestion.priority);
          expect(suggestion.suggestionText).toBeTruthy();
          expect(suggestion.confidence).toBeGreaterThan(0);
          expect(suggestion.confidence).toBeLessThanOrEqual(1);
        });
      });
    });
  });

  describe('suggestFollowups', () => {
    it('should generate status check suggestions for pending commitments', async () => {
      const commitment: DetectedCommitment = {
        id: 'test-commitment',
        message: {
          id: 'msg-test',
          conversationId: 'test-conv',
          role: 'assistant',
          content: "I'll check the database configuration",
          createdAt: mockTime - (5 * 24 * 60 * 60 * 1000), // 5 days ago
          metadata: {}
        },
        commitmentType: 'action',
        commitmentText: "I'll check the database configuration",
        matchedPattern: "I'll check",
        confidence: 0.8,
        entities: [],
        urgencyLevel: 'normal',
        daysSinceCommitment: 5,
        status: 'pending',
        followUps: [],
        conversationContext: {
          conversationId: 'test-conv',
          participantCount: 2
        }
      };

      const suggestions = await detector.suggestFollowups(commitment);

      expect(suggestions.length).toBeGreaterThan(0);
      
      const statusCheckSuggestion = suggestions.find(s => s.suggestionType === 'status_check');
      expect(statusCheckSuggestion).toBeDefined();
      expect(statusCheckSuggestion?.priority).toBe('medium'); // 5 days is medium priority
    });

    it('should generate deadline reminders for temporal commitments', async () => {
      const temporalCommitment: DetectedCommitment = {
        id: 'test-temporal',
        message: {
          id: 'msg-temporal',
          conversationId: 'test-conv',
          role: 'assistant',
          content: "I'll complete this by tomorrow",
          createdAt: mockTime - (1000 * 60 * 60 * 23), // 23 hours ago
          metadata: {}
        },
        commitmentType: 'temporal',
        commitmentText: "I'll complete this by tomorrow",
        matchedPattern: 'by tomorrow',
        confidence: 0.9,
        entities: [],
        expectedTimeframeDays: 1,
        urgencyLevel: 'high',
        daysSinceCommitment: 1,
        status: 'pending',
        followUps: [],
        conversationContext: {
          conversationId: 'test-conv',
          participantCount: 2
        }
      };

      const suggestions = await detector.suggestFollowups(temporalCommitment);

      const deadlineReminder = suggestions.find(s => s.suggestionType === 'deadline_reminder');
      expect(deadlineReminder).toBeDefined();
      expect(deadlineReminder?.priority).toBe('urgent');
      expect(deadlineReminder?.isTimeSensitive).toBe(true);
    });

    it('should generate context update suggestions for investigations', async () => {
      const investigationCommitment: DetectedCommitment = {
        id: 'test-investigation',
        message: {
          id: 'msg-investigation',
          conversationId: 'test-conv',
          role: 'assistant',
          content: "I'll investigate this issue thoroughly",
          createdAt: mockTime - (7 * 24 * 60 * 60 * 1000), // 7 days ago
          metadata: {}
        },
        commitmentType: 'investigation',
        commitmentText: "I'll investigate this issue thoroughly",
        matchedPattern: "I'll investigate",
        confidence: 0.8,
        entities: [],
        urgencyLevel: 'normal',
        daysSinceCommitment: 7,
        status: 'pending',
        followUps: [],
        conversationContext: {
          conversationId: 'test-conv',
          participantCount: 2
        }
      };

      const suggestions = await detector.suggestFollowups(investigationCommitment);

      const contextUpdate = suggestions.find(s => s.suggestionType === 'context_update');
      expect(contextUpdate).toBeDefined();
      expect(contextUpdate?.priority).toBe('medium');
    });

    it('should sort suggestions by priority', async () => {
      const commitment: DetectedCommitment = {
        id: 'test-commitment',
        message: {
          id: 'msg-test',
          conversationId: 'test-conv',
          role: 'assistant',
          content: "I'll check this urgent issue by tomorrow",
          createdAt: mockTime - (1 * 24 * 60 * 60 * 1000), // 1 day ago
          metadata: {}
        },
        commitmentType: 'temporal',
        commitmentText: "I'll check this urgent issue by tomorrow",
        matchedPattern: 'by tomorrow',
        confidence: 0.9,
        entities: [],
        expectedTimeframeDays: 1,
        urgencyLevel: 'urgent',
        daysSinceCommitment: 1,
        status: 'pending',
        followUps: [],
        conversationContext: {
          conversationId: 'test-conv',
          participantCount: 2
        }
      };

      const suggestions = await detector.suggestFollowups(commitment);

      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      
      for (let i = 1; i < suggestions.length; i++) {
        const prevPriority = priorityOrder[suggestions[i - 1].priority];
        const currentPriority = priorityOrder[suggestions[i].priority];
        expect(prevPriority).toBeGreaterThanOrEqual(currentPriority);
      }
    });
  });

  describe('error handling', () => {
    it('should handle empty message arrays', async () => {
      const commitments = await detector.detectCommitmentLanguage([], {
        minConfidence: 0.5
      });

      expect(commitments).toEqual([]);
    });

    it('should handle non-existent conversation IDs', async () => {
      const staleActions = await detector.identifyStaleActions({
        conversationId: 'non-existent-conversation'
      });

      expect(staleActions).toEqual([]);
    });

    it('should handle database connection issues', async () => {
      await dbManager.close();

      await expect(detector.trackTemporalPromises('test-conv'))
        .rejects.toThrow();

      await expect(detector.identifyStaleActions({}))
        .rejects.toThrow();
    });

    it('should validate commitment status transitions', async () => {
      const messages = getMessagesWithCommitments(mockTime);
      
      const commitments = await detector.detectCommitmentLanguage(messages, {
        minConfidence: 0.3
      });

      commitments.forEach(commitment => {
        expect(['pending', 'acknowledged', 'in_progress', 'completed', 'overdue', 'cancelled'])
          .toContain(commitment.status);
      });
    });
  });
});

/**
 * Create test messages with various commitment patterns
 */
function getMessagesWithCommitments(timestamp: number): Message[] {
  return [
    {
      id: 'msg-action',
      conversationId: 'test-conv',
      role: 'assistant',
      content: "I'll check the database configuration and verify the settings.",
      createdAt: timestamp - 1000,
      metadata: {}
    },
    {
      id: 'msg-temporal',
      conversationId: 'test-conv',
      role: 'assistant',
      content: "I need to review this by Friday and will update you then.",
      createdAt: timestamp - 2000,
      metadata: {}
    },
    {
      id: 'msg-investigation',
      conversationId: 'test-conv',
      role: 'assistant',
      content: "Let me investigate this issue and find out what's causing the problem.",
      createdAt: timestamp - 3000,
      metadata: {}
    },
    {
      id: 'msg-update',
      conversationId: 'test-conv',
      role: 'assistant',
      content: "I'll update you on the progress and keep you posted on developments.",
      createdAt: timestamp - 4000,
      metadata: {}
    },
    {
      id: 'msg-followup',
      conversationId: 'test-conv',
      role: 'assistant',
      content: "I'll follow up with the team and get back to you with their response.",
      createdAt: timestamp - 5000,
      metadata: {}
    }
  ];
}

/**
 * Create comprehensive test data for follow-up detection
 */
function createFollowupTestData(baseTime: number) {
  return [
    {
      id: 'conv-temporal-test',
      title: 'Temporal Commitments Test',
      messages: [
        {
          id: 'msg-temporal-1',
          conversationId: 'conv-temporal-test',
          role: 'assistant',
          content: "I'll complete the analysis by tomorrow and send you the results.",
          createdAt: baseTime - (2 * 24 * 60 * 60 * 1000) // 2 days ago
        },
        {
          id: 'msg-temporal-2',
          conversationId: 'conv-temporal-test',
          role: 'assistant',
          content: "I need to finish this review by Friday at the latest.",
          createdAt: baseTime - (3 * 24 * 60 * 60 * 1000) // 3 days ago
        },
        {
          id: 'msg-temporal-3',
          conversationId: 'conv-temporal-test',
          role: 'assistant',
          content: "I'll have the update ready within the next week.",
          createdAt: baseTime - (1 * 24 * 60 * 60 * 1000) // 1 day ago
        }
      ]
    },
    {
      id: 'conv-stale-test',
      title: 'Stale Actions Test',
      messages: [
        {
          id: 'msg-stale-1',
          conversationId: 'conv-stale-test',
          role: 'assistant',
          content: "I'll check the server logs and diagnose the issue.",
          createdAt: baseTime - (8 * 24 * 60 * 60 * 1000) // 8 days ago (stale)
        },
        {
          id: 'msg-stale-2',
          conversationId: 'conv-stale-test',
          role: 'assistant',
          content: "Let me investigate the performance problems and report back.",
          createdAt: baseTime - (12 * 24 * 60 * 60 * 1000) // 12 days ago (very stale)
        }
      ]
    },
    {
      id: 'conv-completed-test',
      title: 'Completed Commitments Test',
      messages: [
        {
          id: 'msg-completed-1',
          conversationId: 'conv-completed-test',
          role: 'assistant',
          content: "I'll review the documentation and provide feedback.",
          createdAt: baseTime - (5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
          id: 'msg-completed-2',
          conversationId: 'conv-completed-test',
          role: 'assistant',
          content: "I've completed the documentation review as promised. Here's my feedback.",
          createdAt: baseTime - (3 * 24 * 60 * 60 * 1000) // 3 days ago (follow-up)
        }
      ]
    }
  ];
}