/**
 * Conversation Flow Analyzer Test Suite
 * 
 * Tests the conversation flow analysis including:
 * - Topic detection and transitions
 * - Depth scoring algorithms
 * - Circularity index calculation
 * - Flow pattern recognition
 * - Performance and accuracy metrics
 */

import { ConversationFlowAnalyzer, ConversationFlowMetrics } from '../../../src/analytics/analyzers/ConversationFlowAnalyzer';
import { Message } from '../../../src/types/interfaces';
import {
  createTestAnalyticsEngine,
  createAnalyticsTestData,
  AnalyticsPerformanceTimer,
  expectAnalyticsScore,
  setupAnalyticsMockTime,
  restoreAnalyticsTime
} from '../setup';

describe('ConversationFlowAnalyzer', () => {
  let analyzer: ConversationFlowAnalyzer;

  beforeEach(() => {
    analyzer = new ConversationFlowAnalyzer();
    setupAnalyticsMockTime();
  });

  afterEach(() => {
    restoreAnalyticsTime();
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with default settings', () => {
      expect(analyzer).toBeDefined();
      expect(typeof analyzer.analyzeFlow).toBe('function');
      // Internal methods are private, so we only test the public interface
    });

    test('should accept configuration options', () => {
      const config = {
        minTopicThreshold: 0.8,
        maxCircularityLookback: 5,
        depthDecayFactor: 0.9
      };

      const customAnalyzer = new ConversationFlowAnalyzer(config);
      expect(customAnalyzer).toBeDefined();
    });
  });

  describe('Topic Detection and Analysis', () => {
    test('should detect topics in simple conversations', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I want to learn about React hooks',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'React hooks are functions that let you use state and lifecycle features in functional components. useState and useEffect are the most common ones.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'How does useEffect work with dependencies?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'useEffect dependencies control when the effect runs. An empty array means it runs once, no array means it runs on every render.',
          createdAt: Date.now() + 3000
        }
      ];

      const timer = new AnalyticsPerformanceTimer();
      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, messages);
      timer.expectAnalyticsPerformance('analyzeFlow-simple', 1000);

      expect(metrics).toBeDefined();
      expect(metrics.topicCount).toBeGreaterThan(0);
      expect(metrics.topicCount).toBeLessThanOrEqual(messages.length);
      expect(Array.isArray(metrics.topics)).toBe(true);
      expect(metrics.topics.length).toBe(metrics.topicCount);
    });

    test('should handle complex multi-topic conversations', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I need help with React performance optimization',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'React performance can be optimized through memoization, code splitting, and virtual DOM efficiency.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What about database design for this application?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Database design should consider normalization, indexing strategies, and query optimization for your use case.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Back to React - how do I implement useMemo effectively?',
          createdAt: Date.now() + 4000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'useMemo should be used for expensive calculations. It takes a function and dependency array.',
          createdAt: Date.now() + 5000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, messages);

      expect(metrics.topicCount).toBeGreaterThanOrEqual(2); // React and database topics
      expect(metrics.topicTransitions).toBeGreaterThan(0);
      expect(metrics.topics).toContain('react');
      expect(metrics.topics).toContain('database');
    });

    test('should detect topic transitions accurately', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Tell me about machine learning algorithms',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Machine learning algorithms can be supervised, unsupervised, or reinforcement learning based.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What about neural networks specifically?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Neural networks are a subset of ML that mimic brain structure with layers of interconnected nodes.',
          createdAt: Date.now() + 3000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 4000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, messages);
      const transitions = metrics.topicTransitions;

      expect(typeof transitions).toBe('number');
      expect(transitions).toBeGreaterThanOrEqual(0);
    });

    test('should handle conversations with minimal topic variation', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hi',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Hello! How can I help you?',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Thanks, goodbye',
          createdAt: Date.now() + 2000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, messages);

      expect(metrics.topicCount).toBeGreaterThanOrEqual(0);
      expect(metrics.topicTransitions).toBeGreaterThanOrEqual(0);
      expectAnalyticsScore(metrics.depthScore, 0, 100, 'depth score for minimal conversation');
    });
  });

  describe('Depth Scoring Algorithm', () => {
    test('should calculate depth score for deep technical discussion', async () => {
      const deepMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What is computational complexity theory?',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Computational complexity theory studies the resources required to solve computational problems, primarily time and space complexity.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Can you explain P vs NP problem in detail?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'The P vs NP problem asks whether every problem whose solution can be verified quickly can also be solved quickly. P is the class of problems solvable in polynomial time, NP contains problems verifiable in polynomial time.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What are the implications for cryptography if P equals NP?',
          createdAt: Date.now() + 4000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'If P=NP, most current cryptographic systems would become insecure, as factoring large numbers and discrete logarithms would be solvable in polynomial time, breaking RSA and elliptic curve cryptography.',
          createdAt: Date.now() + 5000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 6000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, deepMessages);
      const depthScore = metrics.depthScore;

      expectAnalyticsScore(depthScore, 60, 100, 'deep technical discussion');
    });

    test('should calculate lower depth score for shallow conversation', async () => {
      const shallowMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What is programming?',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Programming is writing code.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'OK, thanks.',
          createdAt: Date.now() + 2000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 3000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, shallowMessages);
      const depthScore = metrics.depthScore;

      expectAnalyticsScore(depthScore, 0, 40, 'shallow conversation');
    });

    test('should consider message length and complexity in depth calculation', async () => {
      const complexMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I need to understand the architectural patterns for implementing microservices with event sourcing and CQRS in a distributed system.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Event sourcing with CQRS in microservices requires careful consideration of event store design, aggregate boundaries, eventual consistency, saga patterns for distributed transactions, and proper event versioning strategies.',
          createdAt: Date.now() + 1000
        }
      ];

      const simpleMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hi',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Hello',
          createdAt: Date.now() + 1000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 2000, updatedAt: Date.now(), metadata: {} };
      const complexMetrics = await analyzer.analyzeFlow(conversation, complexMessages);
      const simpleMetrics = await analyzer.analyzeFlow(conversation, simpleMessages);
      const complexDepth = complexMetrics.depthScore;
      const simpleDepth = simpleMetrics.depthScore;

      expect(complexDepth).toBeGreaterThan(simpleDepth);
    });
  });

  describe('Circularity Index Calculation', () => {
    test('should detect circular conversation patterns', async () => {
      const circularMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'How do I optimize database queries?',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'You can optimize queries using indexes and query analysis.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What about React performance?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'React performance can be improved with memoization.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Going back to database optimization - what specific indexes should I use?',
          createdAt: Date.now() + 4000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'For database optimization, consider B-tree indexes for equality searches and composite indexes for multi-column queries.',
          createdAt: Date.now() + 5000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 6000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, circularMessages);
      const circularityIndex = metrics.circularityIndex;

      expectAnalyticsScore(circularityIndex, 0.1, 1, 'circularity index with topic return');
    });

    test('should show low circularity for linear conversations', async () => {
      const linearMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Explain machine learning basics',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Machine learning is a subset of AI that learns from data.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What are the main types?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Main types are supervised, unsupervised, and reinforcement learning.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Can you give examples of supervised learning algorithms?',
          createdAt: Date.now() + 4000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, linearMessages);
      const circularityIndex = metrics.circularityIndex;

      expectAnalyticsScore(circularityIndex, 0, 0.3, 'circularity index for linear conversation');
    });

    test('should handle conversations with high topic repetition', async () => {
      const repetitiveMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What is React?',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'React is a JavaScript library for building user interfaces.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Can you explain React again?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'React is a popular library for creating interactive web applications.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I still don\'t understand React',
          createdAt: Date.now() + 4000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, repetitiveMessages);
      const circularityIndex = metrics.circularityIndex;

      expectAnalyticsScore(circularityIndex, 0.5, 1, 'circularity index for repetitive conversation');
    });
  });

  describe('Flow Pattern Recognition', () => {
    test('should identify common conversation patterns', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I have a problem with my React application',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'What specific issue are you encountering?',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'The state is not updating properly in my component',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'This sounds like a state mutation issue. Are you directly modifying state objects?',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Yes, I was directly changing the array. Let me try using spread operator instead.',
          createdAt: Date.now() + 4000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Great! That should solve the issue. Always create new objects when updating state.',
          createdAt: Date.now() + 5000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, messages);

      expect(metrics).toBeDefined();
      expect(metrics.patterns).toBeDefined();
      expect(Array.isArray(metrics.patterns)).toBe(true);
      
      // Should detect problem-solving pattern
      const patternTypes = metrics.patterns.map(p => p.type);
      expect(patternTypes).toContain('problem_solving');
    });

    test('should detect exploration patterns', async () => {
      const explorationMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I want to learn about blockchain technology',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Blockchain is a distributed ledger technology. What aspects interest you most?',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'How do smart contracts work?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Smart contracts are self-executing contracts with terms directly written into code.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What about consensus mechanisms?',
          createdAt: Date.now() + 4000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, explorationMessages);

      expect(metrics.patterns).toBeDefined();
      const patternTypes = metrics.patterns.map(p => p.type);
      expect(patternTypes).toContain('exploration');
    });

    test('should calculate pattern confidence scores', async () => {
      const messages = createAnalyticsTestData().conversations[0].messages.map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant' | 'system'
      }));

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, messages);

      if (metrics.patterns && metrics.patterns.length > 0) {
        metrics.patterns.forEach(pattern => {
          expect(pattern).toHaveProperty('type');
          expect(pattern).toHaveProperty('confidence');
          expectAnalyticsScore(pattern.confidence, 0, 1, 'pattern confidence');
        });
      }
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle very long conversations efficiently', async () => {
      // Generate a long conversation
      const longMessages: Message[] = [];
      for (let i = 0; i < 200; i++) {
        longMessages.push(
          {
            id: `msg-user-${i}`,
            conversationId: 'conv-long',
            role: 'user',
            content: `This is user message number ${i} about various topics including technology, science, and general questions.`,
            createdAt: Date.now() + (i * 2000)
          },
          {
            id: `msg-assistant-${i}`,
            conversationId: 'conv-long',
            role: 'assistant',
            content: `This is assistant response number ${i} providing helpful information and detailed explanations about the topics discussed.`,
            createdAt: Date.now() + (i * 2000) + 1000
          }
        );
      }

      const timer = new AnalyticsPerformanceTimer();
      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, longMessages);
      timer.expectAnalyticsPerformance('analyzeFlow-long', 3000);

      expect(metrics).toBeDefined();
      expect(metrics.topicCount).toBeGreaterThan(0);
      expectAnalyticsScore(metrics.depthScore, 0, 100, 'depth score for long conversation');
    });

    test('should handle empty conversation gracefully', async () => {
      const emptyMessages: Message[] = [];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} };
      
      try {
        await analyzer.analyzeFlow(conversation, emptyMessages);
        fail('Should have thrown error for empty messages');
      } catch (error: any) {
        expect(error.message).toContain('empty conversation');
        return;
      }
      // This code won't be reached
    });

    test('should handle single message conversation', async () => {
      const singleMessage: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Hello, can you help me with programming?',
          createdAt: Date.now()
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} };
      const metrics = await analyzer.analyzeFlow(conversation, singleMessage);

      expect(metrics).toBeDefined();
      expect(metrics.topicCount).toBeGreaterThanOrEqual(0);
      expect(metrics.topicTransitions).toBe(0);
      expectAnalyticsScore(metrics.depthScore, 0, 100, 'single message depth score');
    });

    test('should handle messages with special characters and formatting', async () => {
      const specialMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Can you explain this code?\n```javascript\nconst fn = (x) => x * 2;\n```',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'This is an arrow function that takes parameter `x` and returns `x * 2`. It\'s equivalent to:\n```javascript\nfunction fn(x) {\n  return x * 2;\n}\n```',
          createdAt: Date.now() + 1000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 2000, updatedAt: Date.now(), metadata: {} };
      expect(async () => {
        await analyzer.analyzeFlow(conversation, specialMessages);
      }).not.toThrow();

      const metrics = await analyzer.analyzeFlow(conversation, specialMessages);
      expect(metrics).toBeDefined();
    });

    test('should handle concurrent analysis requests', async () => {
      const messages1 = createAnalyticsTestData().conversations[0].messages.map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant' | 'system'
      }));

      const messages2 = createAnalyticsTestData().conversations[1].messages.map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant' | 'system'
      }));

      const messages3 = createAnalyticsTestData().conversations[2].messages.map(msg => ({
        ...msg,
        role: msg.role as 'user' | 'assistant' | 'system'
      }));

      // Run analyses concurrently
      const timer = new AnalyticsPerformanceTimer();
      const [metrics1, metrics2, metrics3] = await Promise.all([
        analyzer.analyzeFlow({ id: 'conv-1', title: 'Test 1', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} }, messages1),
        analyzer.analyzeFlow({ id: 'conv-2', title: 'Test 2', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} }, messages2),
        analyzer.analyzeFlow({ id: 'conv-3', title: 'Test 3', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} }, messages3)
      ]);
      timer.expectAnalyticsPerformance('concurrent-analysis', 2000);

      expect(metrics1).toBeDefined();
      expect(metrics2).toBeDefined();
      expect(metrics3).toBeDefined();

      // Each should have unique results
      expect(metrics1.topicCount).not.toBe(metrics2.topicCount);
      expect(metrics2.depthScore).not.toBe(metrics3.depthScore);
    });
  });

  describe('Algorithm Accuracy and Consistency', () => {
    test('should produce consistent results for identical inputs', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Explain machine learning concepts',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Machine learning involves algorithms that can learn and make predictions from data without being explicitly programmed.',
          createdAt: Date.now() + 1000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 1000, updatedAt: Date.now(), metadata: {} };
      const metrics1 = await analyzer.analyzeFlow(conversation, messages);
      const metrics2 = await analyzer.analyzeFlow(conversation, messages);

      expect(metrics1.topicCount).toBe(metrics2.topicCount);
      expect(metrics1.depthScore).toBe(metrics2.depthScore);
      expect(metrics1.circularityIndex).toBe(metrics2.circularityIndex);
      expect(metrics1.topics).toEqual(metrics2.topics);
    });

    test('should scale depth scores appropriately with conversation length', async () => {
      const shortConversation: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What is Python?',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Python is a programming language.',
          createdAt: Date.now() + 1000
        }
      ];

      const longConversation: Message[] = [
        ...shortConversation,
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Can you explain Python\'s object-oriented programming features?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Python supports object-oriented programming with classes, inheritance, polymorphism, and encapsulation.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'How does multiple inheritance work in Python?',
          createdAt: Date.now() + 4000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Python uses C3 linearization for method resolution order in multiple inheritance, following a specific algorithm to determine which method to call.',
          createdAt: Date.now() + 5000
        }
      ];

      const shortConv = { id: 'conv-short', title: 'Short Conversation', createdAt: Date.now() - 2000, updatedAt: Date.now(), metadata: {} };
      const longConv = { id: 'conv-long', title: 'Long Conversation', createdAt: Date.now() - 6000, updatedAt: Date.now(), metadata: {} };
      const shortMetrics = await analyzer.analyzeFlow(shortConv, shortConversation);
      const longMetrics = await analyzer.analyzeFlow(longConv, longConversation);

      // Longer conversation should generally have higher depth score
      expect(longMetrics.depthScore).toBeGreaterThan(shortMetrics.depthScore);
    });

    test('should handle edge cases in circularity calculation', async () => {
      // Test with conversation that has exact topic repetition
      const exactRepetitionMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Explain React hooks',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'React hooks let you use state in functional components',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Explain React hooks',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'React hooks let you use state in functional components',
          createdAt: Date.now() + 3000
        }
      ];

      const circularityIndex = await analyzer.calculateCircularityIndex(exactRepetitionMessages);

      expectAnalyticsScore(circularityIndex, 0.7, 1, 'circularity for exact repetition');
    });
  });
});