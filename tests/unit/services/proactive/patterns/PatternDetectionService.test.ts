/**
 * Unit tests for Pattern Detection Service
 * 
 * Tests commitment pattern detection, unresolved action tracking,
 * recurring question identification, and knowledge gap detection.
 */

import { DatabaseManager } from '../../../../../src/storage/Database.js';
import { PatternDetectionService } from '../../../../../src/services/proactive/patterns/PatternDetectionService.js';
import { Message } from '../../../../../src/types/interfaces.js';
import { createTestDatabase, insertTestData, createTestConversations } from '../../../../utils/test-helpers.js';

describe('PatternDetectionService', () => {
  let dbManager: DatabaseManager;
  let service: PatternDetectionService;
  let testConversations: any[];

  beforeEach(async () => {
    dbManager = await createTestDatabase();
    service = new PatternDetectionService(dbManager);
    testConversations = createProactiveTestData();
    await insertTestData(dbManager, testConversations);
  });

  afterEach(async () => {
    await dbManager.close();
  });

  describe('detectUnresolvedActions', () => {
    it('should detect unresolved commitments from assistant messages', async () => {
      const actions = await service.detectUnresolvedActions({
        daysSince: 30,
        minConfidence: 0.6,
        limit: 10
      });

      expect(actions).toBeDefined();
      expect(Array.isArray(actions)).toBe(true);
      
      // Should find the unresolved "I'll check" commitment
      const checkAction = actions.find(a => 
        a.commitmentText.toLowerCase().includes("i'll check")
      );
      expect(checkAction).toBeDefined();
      expect(checkAction?.confidence).toBeGreaterThanOrEqual(0.6);
      expect(checkAction?.hasFollowUp).toBe(false);
      expect(checkAction?.daysSinceCommitment).toBeGreaterThan(0);
    });

    it('should filter out actions with follow-ups', async () => {
      const actions = await service.detectUnresolvedActions({
        daysSince: 30,
        minConfidence: 0.5
      });

      // Actions with follow-ups should not be included
      actions.forEach(action => {
        expect(action.hasFollowUp).toBe(false);
      });
    });

    it('should respect confidence threshold', async () => {
      const highConfidenceActions = await service.detectUnresolvedActions({
        minConfidence: 0.8
      });
      
      const lowConfidenceActions = await service.detectUnresolvedActions({
        minConfidence: 0.3
      });

      expect(highConfidenceActions.length).toBeLessThanOrEqual(lowConfidenceActions.length);
      
      highConfidenceActions.forEach(action => {
        expect(action.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should limit results correctly', async () => {
      const limitedActions = await service.detectUnresolvedActions({
        limit: 2
      });

      expect(limitedActions.length).toBeLessThanOrEqual(2);
    });

    it('should filter by conversation ID when provided', async () => {
      const conversationId = 'conv-commitment-test';
      
      const allActions = await service.detectUnresolvedActions({});
      const filteredActions = await service.detectUnresolvedActions({
        conversationId
      });

      expect(filteredActions.length).toBeLessThanOrEqual(allActions.length);
      
      filteredActions.forEach(action => {
        expect(action.conversationId).toBe(conversationId);
      });
    });

    it('should handle empty results gracefully', async () => {
      const actions = await service.detectUnresolvedActions({
        conversationId: 'non-existent-conversation',
        daysSince: 1
      });

      expect(actions).toEqual([]);
    });
  });

  describe('findRecurringQuestions', () => {
    it('should identify recurring question patterns', async () => {
      const questions = await service.findRecurringQuestions({
        minFrequency: 2,
        minDaysBetween: 1
      });

      expect(questions).toBeDefined();
      expect(Array.isArray(questions)).toBe(true);
      
      questions.forEach(question => {
        expect(question.frequency).toBeGreaterThanOrEqual(2);
        expect(question.daysBetweenOccurrences).toBeGreaterThanOrEqual(1);
        expect(question.instances.length).toBe(question.frequency);
        expect(question.conversationIds.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should normalize similar questions correctly', async () => {
      const questions = await service.findRecurringQuestions({
        minFrequency: 2
      });

      // Questions should be normalized (lowercase, punctuation removed)
      questions.forEach(question => {
        expect(question.questionText).toBe(question.questionText.toLowerCase());
        expect(question.questionText).not.toMatch(/[^\w\s]/);
      });
    });

    it('should sort by frequency', async () => {
      const questions = await service.findRecurringQuestions({
        minFrequency: 2
      });

      for (let i = 1; i < questions.length; i++) {
        expect(questions[i-1].frequency).toBeGreaterThanOrEqual(questions[i].frequency);
      }
    });

    it('should track time ranges correctly', async () => {
      const questions = await service.findRecurringQuestions({
        minFrequency: 2
      });

      questions.forEach(question => {
        expect(question.firstAskedAt).toBeLessThanOrEqual(question.lastAskedAt);
        expect(question.instances[0].createdAt).toBe(question.firstAskedAt);
        expect(question.instances[question.instances.length - 1].createdAt).toBe(question.lastAskedAt);
      });
    });

    it('should respect limit parameter', async () => {
      const limitedQuestions = await service.findRecurringQuestions({
        limit: 3
      });

      expect(limitedQuestions.length).toBeLessThanOrEqual(3);
    });
  });

  describe('identifyKnowledgeGaps', () => {
    it('should find knowledge gaps with high question-to-answer ratios', async () => {
      const gaps = await service.identifyKnowledgeGaps({
        minGapRatio: 1.5
      });

      expect(gaps).toBeDefined();
      expect(Array.isArray(gaps)).toBe(true);
      
      gaps.forEach(gap => {
        expect(gap.gapRatio).toBeGreaterThanOrEqual(1.5);
        expect(gap.questionCount).toBeGreaterThan(0);
        expect(gap.answerCount).toBeGreaterThanOrEqual(0);
        expect(gap.topicConfidence).toBeGreaterThan(0);
        expect(gap.relatedMessages.length).toBeGreaterThan(0);
      });
    });

    it('should extract meaningful topics', async () => {
      const gaps = await service.identifyKnowledgeGaps({
        minGapRatio: 1.0
      });

      gaps.forEach(gap => {
        expect(gap.topic).toBeTruthy();
        expect(typeof gap.topic).toBe('string');
        expect(gap.topic.length).toBeGreaterThan(0);
        expect(gap.topic).not.toBe('general'); // Should find specific topics
      });
    });

    it('should sort by gap ratio in descending order', async () => {
      const gaps = await service.identifyKnowledgeGaps({
        minGapRatio: 1.0
      });

      for (let i = 1; i < gaps.length; i++) {
        expect(gaps[i-1].gapRatio).toBeGreaterThanOrEqual(gaps[i].gapRatio);
      }
    });

    it('should track time ranges for knowledge gaps', async () => {
      const gaps = await service.identifyKnowledgeGaps({
        minGapRatio: 1.0
      });

      gaps.forEach(gap => {
        expect(gap.firstQuestionAt).toBeLessThanOrEqual(gap.lastQuestionAt);
        expect(gap.firstQuestionAt).toBeGreaterThan(0);
        expect(gap.lastQuestionAt).toBeGreaterThan(0);
      });
    });
  });

  describe('trackCommitments', () => {
    it('should track all types of commitments', async () => {
      const commitments = await service.trackCommitments({
        includeResolved: true
      });

      expect(commitments).toBeDefined();
      expect(Array.isArray(commitments)).toBe(true);
      
      commitments.forEach(commitment => {
        expect(['check', 'follow_up', 'update', 'investigate', 'temporal']).toContain(commitment.commitmentType);
        expect(['pending', 'mentioned', 'resolved', 'overdue']).toContain(commitment.status);
        expect(commitment.confidence).toBeGreaterThan(0);
        expect(commitment.daysSinceCommitment).toBeGreaterThanOrEqual(0);
        expect(commitment.commitmentText).toBeTruthy();
      });
    });

    it('should exclude resolved commitments by default', async () => {
      const allCommitments = await service.trackCommitments({
        includeResolved: true
      });
      
      const activeCommitments = await service.trackCommitments({
        includeResolved: false
      });

      expect(activeCommitments.length).toBeLessThanOrEqual(allCommitments.length);
      
      activeCommitments.forEach(commitment => {
        expect(commitment.status).not.toBe('resolved');
      });
    });

    it('should classify commitment types correctly', async () => {
      const commitments = await service.trackCommitments({
        includeResolved: true
      });

      const checkCommitment = commitments.find(c => 
        c.commitmentText.toLowerCase().includes('check')
      );
      
      if (checkCommitment) {
        expect(checkCommitment.commitmentType).toBe('check');
      }

      const updateCommitment = commitments.find(c => 
        c.commitmentText.toLowerCase().includes('update')
      );
      
      if (updateCommitment) {
        expect(updateCommitment.commitmentType).toBe('update');
      }
    });

    it('should extract timeframes from temporal commitments', async () => {
      const commitments = await service.trackCommitments({
        includeResolved: true
      });

      const temporalCommitments = commitments.filter(c => 
        c.commitmentType === 'temporal'
      );

      temporalCommitments.forEach(commitment => {
        expect(commitment.expectedTimeframeDays).toBeDefined();
        expect(commitment.expectedTimeframeDays).toBeGreaterThan(0);
      });
    });

    it('should track follow-up messages', async () => {
      const commitments = await service.trackCommitments({
        includeResolved: true
      });

      commitments.forEach(commitment => {
        expect(Array.isArray(commitment.followUps)).toBe(true);
        // Follow-ups should be after the commitment timestamp
        commitment.followUps.forEach(followUp => {
          expect(followUp.createdAt).toBeGreaterThan(commitment.message.createdAt);
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle database connection issues gracefully', async () => {
      // Close the database to simulate connection issues
      await dbManager.close();

      await expect(service.detectUnresolvedActions({}))
        .rejects.toThrow();

      await expect(service.findRecurringQuestions({}))
        .rejects.toThrow();

      await expect(service.identifyKnowledgeGaps({}))
        .rejects.toThrow();

      await expect(service.trackCommitments({}))
        .rejects.toThrow();
    });

    it('should validate input parameters', async () => {
      // Recreate database for clean state
      dbManager = await createTestDatabase();
      service = new PatternDetectionService(dbManager);

      const negativeParams = { daysSince: -1 };
      const zeroParams = { limit: 0 };
      const excessiveParams = { limit: 1000 };

      // These should either handle gracefully or throw meaningful errors
      await expect(service.detectUnresolvedActions(negativeParams))
        .resolves.toBeDefined();

      await expect(service.detectUnresolvedActions(zeroParams))
        .resolves.toBeDefined();

      await expect(service.detectUnresolvedActions(excessiveParams))
        .resolves.toBeDefined();
    });
  });
});

/**
 * Create test data focused on proactive pattern detection
 */
function createProactiveTestData() {
  const now = Date.now();
  
  return [
    {
      id: 'conv-commitment-test',
      title: 'Commitment Test Conversation',
      messages: [
        {
          id: 'msg-commitment-1',
          conversationId: 'conv-commitment-test',
          role: 'user',
          content: 'Can you help me understand how this system works?',
          createdAt: now - (10 * 24 * 60 * 60 * 1000) // 10 days ago
        },
        {
          id: 'msg-commitment-2',
          conversationId: 'conv-commitment-test',
          role: 'assistant',
          content: "I'll check the documentation and get back to you with detailed information about how the system works.",
          createdAt: now - (9 * 24 * 60 * 60 * 1000) // 9 days ago (unresolved)
        },
        {
          id: 'msg-commitment-3',
          conversationId: 'conv-commitment-test',
          role: 'user',
          content: 'Thanks, looking forward to hearing back.',
          createdAt: now - (9 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 'conv-recurring-questions',
      title: 'Recurring Questions Test',
      messages: [
        {
          id: 'msg-question-1',
          conversationId: 'conv-recurring-questions',
          role: 'user',
          content: 'How do I configure the database connection?',
          createdAt: now - (15 * 24 * 60 * 60 * 1000) // 15 days ago
        },
        {
          id: 'msg-answer-1',
          conversationId: 'conv-recurring-questions',
          role: 'assistant',
          content: 'You can configure the database connection by setting the environment variables.',
          createdAt: now - (15 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-question-2',
          conversationId: 'conv-recurring-questions',
          role: 'user',
          content: 'How do I configure database connection again?',
          createdAt: now - (8 * 24 * 60 * 60 * 1000) // 8 days ago (recurring)
        },
        {
          id: 'msg-question-3',
          conversationId: 'conv-recurring-questions',
          role: 'user',
          content: 'Can you remind me how to configure the DB connection?',
          createdAt: now - (3 * 24 * 60 * 60 * 1000) // 3 days ago (recurring)
        }
      ]
    },
    {
      id: 'conv-knowledge-gaps',
      title: 'Knowledge Gap Test',
      messages: [
        {
          id: 'msg-gap-1',
          conversationId: 'conv-knowledge-gaps',
          role: 'user',
          content: 'What are the best practices for React performance optimization?',
          createdAt: now - (12 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-gap-2',
          conversationId: 'conv-knowledge-gaps',
          role: 'user',
          content: 'How can I optimize React application performance?',
          createdAt: now - (10 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-gap-3',
          conversationId: 'conv-knowledge-gaps',
          role: 'user',
          content: 'Are there any React performance optimization techniques?',
          createdAt: now - (7 * 24 * 60 * 60 * 1000)
        },
        // Only one brief answer for many questions = knowledge gap
        {
          id: 'msg-gap-answer',
          conversationId: 'conv-knowledge-gaps',
          role: 'assistant',
          content: 'Use React.memo and useMemo.',
          createdAt: now - (6 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 'conv-resolved-commitment',
      title: 'Resolved Commitment Test',
      messages: [
        {
          id: 'msg-resolved-1',
          conversationId: 'conv-resolved-commitment',
          role: 'assistant',
          content: "I'll update the documentation by tomorrow.",
          createdAt: now - (5 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-resolved-2',
          conversationId: 'conv-resolved-commitment',
          role: 'assistant',
          content: "I've completed the documentation update as promised.",
          createdAt: now - (4 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 'conv-temporal-commitment',
      title: 'Temporal Commitment Test',
      messages: [
        {
          id: 'msg-temporal-1',
          conversationId: 'conv-temporal-commitment',
          role: 'assistant',
          content: "I need to review this by Friday and will get back to you.",
          createdAt: now - (7 * 24 * 60 * 60 * 1000)
        }
      ]
    }
  ];
}