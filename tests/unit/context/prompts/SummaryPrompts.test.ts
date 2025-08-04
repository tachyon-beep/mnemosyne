/**
 * SummaryPrompts Unit Tests
 * 
 * Tests for the summary prompt generation system
 */

import { SummaryPrompts, PromptConfig } from '../../../../src/context/prompts/SummaryPrompts.js';
import { Message } from '../../../../src/types/interfaces.js';

describe('SummaryPrompts', () => {
  let prompts: SummaryPrompts;

  const sampleMessages: Message[] = [
    {
      id: 'msg1',
      conversationId: 'conv1',
      role: 'user',
      content: 'I need help debugging a memory leak in our Node.js application. The issue started appearing after we deployed version 2.1.0 last Tuesday.',
      createdAt: Date.now() - 300000, // 5 minutes ago
      metadata: {}
    },
    {
      id: 'msg2',
      conversationId: 'conv1',
      role: 'assistant',
      content: 'I can help you identify the memory leak. First, let\'s check the heap snapshots and look for retained objects. Can you run `node --inspect` and generate a heap dump?',
      createdAt: Date.now() - 180000, // 3 minutes ago
      metadata: {}
    },
    {
      id: 'msg3',
      conversationId: 'conv1',
      role: 'user',
      content: 'Here\'s the heap dump analysis. I see a lot of EventEmitter objects not being cleaned up properly in the database connection pool.',
      createdAt: Date.now(),
      metadata: {}
    }
  ];

  beforeEach(() => {
    prompts = new SummaryPrompts();
  });

  describe('generateBriefPrompt', () => {
    it('should generate brief prompt with correct structure', () => {
      const config: PromptConfig = {
        targetTokens: 75,
        conversationType: 'technical',
        includeTemporalContext: false
      };

      const result = prompts.generateBriefPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('BRIEF summary');
      expect(result.systemPrompt).toContain('50-100 tokens');
      expect(result.userPrompt).toContain('CONVERSATION TO SUMMARIZE:');
      expect(result.expectedTokens).toBe(75);
      expect(result.metadata.level).toBe('brief');
      expect(result.metadata.conversationType).toBe('technical');
    });

    it('should include technical focus for technical conversations', () => {
      const config: PromptConfig = {
        targetTokens: 75,
        conversationType: 'technical',
        includeTemporalContext: false
      };

      const result = prompts.generateBriefPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('Code changes, bug fixes, technical decisions');
    });

    it('should include all messages in user prompt', () => {
      const config: PromptConfig = {
        targetTokens: 75,
        conversationType: 'general',
        includeTemporalContext: false
      };

      const result = prompts.generateBriefPrompt(sampleMessages, config);

      expect(result.userPrompt).toContain('memory leak');
      expect(result.userPrompt).toContain('heap snapshots');
      expect(result.userPrompt).toContain('EventEmitter objects');
      expect(result.userPrompt).toContain('[1] USER:');
      expect(result.userPrompt).toContain('[2] ASSISTANT:');
      expect(result.userPrompt).toContain('[3] USER:');
    });
  });

  describe('generateStandardPrompt', () => {
    it('should generate standard prompt with correct structure', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'planning',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('STANDARD summary');
      expect(result.systemPrompt).toContain('200-300 tokens');
      expect(result.expectedTokens).toBe(250);
      expect(result.metadata.level).toBe('standard');
    });

    it('should include planning focus for planning conversations', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'planning',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('project scope, timelines, and resource allocation');
    });

    it('should include structure guidance', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('STRUCTURE:');
      expect(result.systemPrompt).toContain('main topic/purpose');
      expect(result.systemPrompt).toContain('key discussion points');
    });
  });

  describe('generateDetailedPrompt', () => {
    it('should generate detailed prompt with correct structure', () => {
      const config: PromptConfig = {
        targetTokens: 750,
        conversationType: 'support',
        includeTemporalContext: false
      };

      const result = prompts.generateDetailedPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('DETAILED summary');
      expect(result.systemPrompt).toContain('500-1000 tokens');
      expect(result.expectedTokens).toBe(750);
      expect(result.metadata.level).toBe('detailed');
    });

    it('should include support focus for support conversations', () => {
      const config: PromptConfig = {
        targetTokens: 750,
        conversationType: 'support',
        includeTemporalContext: false
      };

      const result = prompts.generateDetailedPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('problem description with symptoms and impact');
      expect(result.systemPrompt).toContain('troubleshooting steps');
    });

    it('should include comprehensive structure guidance', () => {
      const config: PromptConfig = {
        targetTokens: 750,
        conversationType: 'general',
        includeTemporalContext: false
      };

      const result = prompts.generateDetailedPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('Opening: Main topic, purpose, and participants');
      expect(result.systemPrompt).toContain('Main Content: Organized by major topics');
      expect(result.systemPrompt).toContain('Closing: Outcomes, action items');
    });
  });

  describe('conversation type handling', () => {
    it('should handle technical conversation type', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'technical',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('code changes, algorithms, and technical solutions');
      expect(result.systemPrompt).toContain('version numbers, file names, and system specifications');
    });

    it('should handle planning conversation type', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'planning',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('project scope, timelines, and resource allocation');
      expect(result.systemPrompt).toContain('roles, responsibilities, and deliverables');
    });

    it('should handle support conversation type', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'support',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('problem symptoms, troubleshooting steps, and solutions');
      expect(result.systemPrompt).toContain('system details and error conditions');
    });

    it('should fall back to general for unknown types', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'unknown-type',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.systemPrompt).toContain('Cover all major topics with appropriate context');
    });
  });

  describe('optional features', () => {
    it('should include focus topics when provided', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        focusTopics: ['memory management', 'performance optimization'],
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.userPrompt).toContain('FOCUS TOPICS: memory management, performance optimization');
    });

    it('should include previous summary when provided', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        previousSummary: 'Previous discussion covered basic setup and configuration.',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.userPrompt).toContain('PREVIOUS SUMMARY:');
      expect(result.userPrompt).toContain('Previous discussion covered basic setup');
    });

    it('should include temporal context when enabled', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        includeTemporalContext: true
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);

      expect(result.userPrompt).toContain('CONVERSATION TIMESPAN:');
      // Should include timestamps in message headers
      expect(result.userPrompt).toMatch(/\[1\] USER \([^)]+\):/);
    });
  });

  describe('prompt validation', () => {
    it('should estimate prompt token count', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(sampleMessages, config);
      const tokenEstimate = prompts.estimatePromptTokens(result);

      expect(tokenEstimate).toBeGreaterThan(0);
      expect(typeof tokenEstimate).toBe('number');
    });

    it('should validate prompt length against max tokens', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        includeTemporalContext: false
      };

      const result = prompts.generateBriefPrompt(sampleMessages, config);
      const isValid = prompts.validatePromptLength(result, 2000);

      expect(isValid).toBe(true);
    });

    it('should detect overly long prompts', () => {
      const longMessages: Message[] = Array.from({ length: 50 }, (_, i) => ({
        id: `msg${i}`,
        conversationId: 'conv1',
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'This is a very long message that repeats many times to create a large prompt that might exceed token limits in some scenarios where we have extensive conversations with detailed technical discussions.',
        createdAt: Date.now() - (i * 60000),
        metadata: {}
      }));

      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        includeTemporalContext: true
      };

      const result = prompts.generateDetailedPrompt(longMessages, config);
      const isValid = prompts.validatePromptLength(result, 100); // Very low limit

      expect(isValid).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle empty message array', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt([], config);

      expect(result.systemPrompt).toBeDefined();
      expect(result.userPrompt).toContain('CONVERSATION TO SUMMARIZE:');
      expect(result.expectedTokens).toBe(250);
    });

    it('should handle single message', () => {
      const singleMessage: Message[] = [sampleMessages[0]];
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(singleMessage, config);

      expect(result.userPrompt).toContain('[1] USER:');
      expect(result.userPrompt).not.toContain('[2]');
    });

    it('should handle messages with various roles', () => {
      const mixedMessages: Message[] = [
        { ...sampleMessages[0], role: 'system' },
        { ...sampleMessages[1], role: 'user' },
        { ...sampleMessages[2], role: 'assistant' }
      ];

      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'general',
        includeTemporalContext: false
      };

      const result = prompts.generateStandardPrompt(mixedMessages, config);

      expect(result.userPrompt).toContain('[1] SYSTEM:');
      expect(result.userPrompt).toContain('[2] USER:');
      expect(result.userPrompt).toContain('[3] ASSISTANT:');
    });
  });

  describe('consistency across levels', () => {
    it('should maintain consistent structure across levels', () => {
      const config: PromptConfig = {
        targetTokens: 250,
        conversationType: 'technical',
        includeTemporalContext: false
      };

      const brief = prompts.generateBriefPrompt(sampleMessages, { ...config, targetTokens: 75 });
      const standard = prompts.generateStandardPrompt(sampleMessages, config);
      const detailed = prompts.generateDetailedPrompt(sampleMessages, { ...config, targetTokens: 750 });

      // All should have system and user prompts
      expect(brief.systemPrompt).toBeDefined();
      expect(brief.userPrompt).toBeDefined();
      expect(standard.systemPrompt).toBeDefined();
      expect(standard.userPrompt).toBeDefined();
      expect(detailed.systemPrompt).toBeDefined();
      expect(detailed.userPrompt).toBeDefined();

      // All should contain the same conversation content
      expect(brief.userPrompt).toContain('memory leak');
      expect(standard.userPrompt).toContain('memory leak');
      expect(detailed.userPrompt).toContain('memory leak');

      // All should have metadata
      expect(brief.metadata.level).toBe('brief');
      expect(standard.metadata.level).toBe('standard');
      expect(detailed.metadata.level).toBe('detailed');
    });
  });
});