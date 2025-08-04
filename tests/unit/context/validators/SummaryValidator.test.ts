/**
 * SummaryValidator Unit Tests
 * 
 * Tests for the summary quality validation and scoring system
 */

import { SummaryValidator } from '../../../../src/context/validators/SummaryValidator.js';
import { ConversationSummary, Message } from '../../../../src/types/interfaces.js';

// Mock TokenCounter
class MockTokenCounter {
  async countTokens(text: string) {
    return {
      count: Math.ceil(text.length / 4), // Rough estimation: 4 chars per token
      model: 'test-model'
    };
  }
}

describe('SummaryValidator', () => {
  let validator: SummaryValidator;
  let mockTokenCounter: MockTokenCounter;

  const sampleMessages: Message[] = [
    {
      id: 'msg1',
      conversationId: 'conv1',
      role: 'user',
      content: 'I need help implementing JWT authentication in our Node.js API. The project is called SecureApp and we need to support role-based access control.',
      createdAt: Date.now() - 120000,
      metadata: {}
    },
    {
      id: 'msg2',
      conversationId: 'conv1',
      role: 'assistant',
      content: 'I can help you implement JWT authentication. First, you\'ll need to install jsonwebtoken and bcrypt packages. Then create middleware for token verification.',
      createdAt: Date.now() - 60000,
      metadata: {}
    },
    {
      id: 'msg3',
      conversationId: 'conv1',
      role: 'user',
      content: 'Great! Also, we discovered a bug on January 15, 2024 where users with admin role couldn\'t access the dashboard. The fix needs to be deployed by next Friday.',
      createdAt: Date.now(),
      metadata: {}
    }
  ];

  beforeEach(() => {
    mockTokenCounter = new MockTokenCounter();
    validator = new SummaryValidator(mockTokenCounter as any, {
      minScore: 0.7,
      enableEntityExtraction: true,
      enableContentAnalysis: true,
      enableFactualChecks: true
    });
  });

  describe('validateSummary', () => {
    it('should validate a high-quality summary', async () => {
      const goodSummary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'User requested help implementing JWT authentication for SecureApp project with role-based access control. Assistant provided guidance on jsonwebtoken and bcrypt packages, plus middleware creation. Bug discovered on January 15, 2024 affecting admin role dashboard access, requiring fix by next Friday.',
        tokenCount: 45,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await validator.validateSummary(goodSummary, sampleMessages);

      expect(result.score).toBeGreaterThan(0.7);
      expect(result.metrics.informationCoverage).toBeGreaterThan(0.6);
      expect(result.metrics.entityPreservation).toBeGreaterThan(0.6);
      expect(result.metrics.consistency).toBeGreaterThan(0.8);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect poor information coverage', async () => {
      const poorSummary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'User asked for help.',
        tokenCount: 4,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await validator.validateSummary(poorSummary, sampleMessages);

      expect(result.score).toBeLessThan(0.5);
      expect(result.metrics.informationCoverage).toBeLessThan(0.5);
      expect(result.warnings.some(w => w.includes('information coverage'))).toBe(true);
    });

    it('should detect poor entity preservation', async () => {
      const summaryMissingEntities: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'User needed help with authentication in an application. Assistant provided guidance on packages and middleware. There was a bug affecting role access.',
        tokenCount: 24,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await validator.validateSummary(summaryMissingEntities, sampleMessages);

      expect(result.metrics.entityPreservation).toBeLessThan(0.8);
      expect(result.warnings.some(w => w.includes('entity preservation'))).toBe(true);
    });

    it('should validate token count compliance', async () => {
      const oversizedSummary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'brief', // Brief should be ~75 tokens
        summaryText: 'This is an extremely long summary that goes on and on with lots of unnecessary details and repetitive information that should not be in a brief summary according to the token count requirements for this level of summarization which should be concise and to the point but this clearly is not and continues to ramble without adding value to the reader who expects a brief overview of the conversation content.',
        tokenCount: 200, // Way over brief limit
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await validator.validateSummary(oversizedSummary, sampleMessages);

      expect(result.metrics.tokenCompliance).toBeLessThan(0.8);
      expect(result.warnings.some(w => w.includes('longer than expected'))).toBe(true);
    });

    it('should detect empty summary', async () => {
      const emptySummary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: '',
        tokenCount: 0,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await validator.validateSummary(emptySummary, sampleMessages);

      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
      expect(result.score).toBe(0);
    });

    it('should handle validation with no messages', async () => {
      const summary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'Some summary text',
        tokenCount: 5,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 0
      };

      const result = await validator.validateSummary(summary, []);

      expect(result.errors.some(e => e.includes('No original messages'))).toBe(true);
    });
  });

  describe('entity extraction', () => {
    it('should extract people names', async () => {
      const summary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'John Smith and Mary Johnson discussed the project with Alice Cooper.',
        tokenCount: 12,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 1
      };

      const messagesWithNames: Message[] = [{
        id: 'msg1',
        conversationId: 'conv1',
        role: 'user',
        content: 'John Smith and Mary Johnson need to discuss the project with Alice Cooper.',
        createdAt: Date.now(),
        metadata: {}
      }];

      const result = await validator.validateSummary(summary, messagesWithNames);

      expect(result.metadata.detectedEntities.people).toContain('John Smith');
      expect(result.metadata.detectedEntities.people).toContain('Mary Johnson');
      expect(result.metadata.detectedEntities.people).toContain('Alice Cooper');
    });

    it('should extract dates', async () => {
      const summary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'Bug discovered on January 15, 2024 needs fix by 12/31/2024.',
        tokenCount: 12,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 1
      };

      const messagesWithDates: Message[] = [{
        id: 'msg1',
        conversationId: 'conv1',
        role: 'user',
        content: 'We found a bug on January 15, 2024 and need to fix it by 12/31/2024.',
        createdAt: Date.now(),
        metadata: {}
      }];

      const result = await validator.validateSummary(summary, messagesWithDates);

      expect(result.metadata.detectedEntities.dates.length).toBeGreaterThan(0);
    });

    it('should extract technical terms', async () => {
      const summary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'Implementation uses JWT tokens, API endpoints, and user.js file.',
        tokenCount: 11,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 1
      };

      const messagesWithTech: Message[] = [{
        id: 'msg1',
        conversationId: 'conv1',
        role: 'user',
        content: 'We need to implement JWT tokens in the API endpoints. Check the user.js file.',
        createdAt: Date.now(),
        metadata: {}
      }];

      const result = await validator.validateSummary(summary, messagesWithTech);

      expect(result.metadata.detectedEntities.technicalTerms.some(term => 
        term.includes('JWT') || term.includes('API') || term.includes('user.js')
      )).toBe(true);
    });
  });

  describe('content analysis', () => {
    it('should assess structure quality', async () => {
      const wellStructuredSummary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'detailed',
        summaryText: 'First, the user requested help with JWT authentication. Then, the assistant provided implementation guidance. Finally, a bug was identified that requires urgent attention.',
        tokenCount: 25,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await validator.validateSummary(wellStructuredSummary, sampleMessages);

      expect(result.metadata.contentAnalysis.structureQuality).toBeGreaterThan(0.7);
    });

    it('should detect redundancy', async () => {
      const redundantSummary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'User needs help with authentication. User requested authentication help. Help with authentication was requested by the user.',
        tokenCount: 18,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await validator.validateSummary(redundantSummary, sampleMessages);

      expect(result.metadata.contentAnalysis.redundancyLevel).toBeGreaterThan(0.3);
    });
  });

  describe('different summary levels', () => {
    it('should have appropriate expectations for brief summaries', async () => {
      const briefSummary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'brief',
        summaryText: 'User needs JWT auth help for SecureApp. Admin bug found on Jan 15, fix needed by Friday.',
        tokenCount: 18,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await validator.validateSummary(briefSummary, sampleMessages);

      // Brief summaries should have lower coverage expectations
      expect(result.metrics.informationCoverage).toBeGreaterThan(0.4);
      expect(result.metrics.tokenCompliance).toBeGreaterThan(0.8);
    });

    it('should have higher expectations for detailed summaries', async () => {
      const detailedSummary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'detailed',
        summaryText: 'User requested comprehensive help implementing JWT authentication system for the SecureApp project, specifically requiring role-based access control functionality. Assistant provided detailed guidance including installation of jsonwebtoken and bcrypt packages, along with middleware creation for token verification. During the conversation, a critical bug was identified that occurred on January 15, 2024, where users with admin role permissions could not access the dashboard interface. This issue requires immediate attention and deployment of a fix by the upcoming Friday deadline to maintain system functionality.',
        tokenCount: 85,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await validator.validateSummary(detailedSummary, sampleMessages);

      // Detailed summaries should have higher coverage expectations
      expect(result.metrics.informationCoverage).toBeGreaterThan(0.7);
      expect(result.metrics.entityPreservation).toBeGreaterThan(0.8);
    });
  });

  describe('validation configuration', () => {
    it('should respect custom weights', async () => {
      const customValidator = new SummaryValidator(mockTokenCounter as any, {
        weights: {
          informationCoverage: 0.5,
          entityPreservation: 0.3,
          consistency: 0.1,
          tokenCompliance: 0.05,
          factualAccuracy: 0.05
        }
      });

      const summary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'User needed help with JWT authentication for SecureApp project with role-based access control.',
        tokenCount: 15,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await customValidator.validateSummary(summary, sampleMessages);

      expect(result.score).toBeDefined();
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    it('should disable features when configured', async () => {
      const minimalValidator = new SummaryValidator(mockTokenCounter as any, {
        enableEntityExtraction: false,
        enableContentAnalysis: false,
        enableFactualChecks: false
      });

      const summary: ConversationSummary = {
        id: 'sum1',
        conversationId: 'conv1',
        level: 'standard',
        summaryText: 'Some summary text.',
        tokenCount: 4,
        provider: 'test-provider',
        model: 'test-model',
        generatedAt: Date.now(),
        messageCount: 3
      };

      const result = await minimalValidator.validateSummary(summary, sampleMessages);

      expect(result.metadata.detectedEntities.people).toHaveLength(0);
      expect(result.metadata.contentAnalysis.keyTopics).toHaveLength(0);
      expect(result.metrics.factualAccuracy).toBe(1.0); // Default when disabled
    });
  });
});