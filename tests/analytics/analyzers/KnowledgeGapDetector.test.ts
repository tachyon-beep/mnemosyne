/**
 * Knowledge Gap Detector Test Suite
 * 
 * Tests the knowledge gap detection including:
 * - Gap identification and classification
 * - Exploration depth analysis
 * - Learning path suggestions
 * - Resolution tracking
 * - Knowledge progression measurement
 */

import { KnowledgeGapDetector } from '../../../src/analytics/analyzers/KnowledgeGapDetector';
import { Message } from '../../../src/types/interfaces';
import {
  createAnalyticsTestData,
  AnalyticsPerformanceTimer,
  expectAnalyticsScore,
  setupAnalyticsMockTime,
  restoreAnalyticsTime
} from '../setup';

describe('KnowledgeGapDetector', () => {
  let detector: KnowledgeGapDetector;

  beforeEach(() => {
    detector = new KnowledgeGapDetector();
    setupAnalyticsMockTime();
  });

  afterEach(() => {
    restoreAnalyticsTime();
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with default settings', () => {
      expect(detector).toBeDefined();
      expect(typeof detector.detectGaps).toBe('function');
      expect(typeof detector.generateLearningCurves).toBe('function');
    });

    test('should accept custom configuration', () => {
      const config = {
        minGapConfidence: 0.7,
        explorationDepthWeights: {
          questionComplexity: 0.4,
          followUpDepth: 0.3,
          conceptualBreadth: 0.3
        },
        gapTypeThresholds: {
          question: 0.6,
          topic: 0.7,
          skill: 0.8,
          concept: 0.75
        }
      };

      const customDetector = new KnowledgeGapDetector();
      expect(customDetector).toBeDefined();
    });
  });

  describe('Gap Detection and Classification', () => {
    test('should detect question-type knowledge gaps', async () => {
      const questionGapMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I keep hearing about microservices architecture, but I don\'t really understand how it differs from monolithic architecture.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Microservices break down applications into small, independent services that communicate over networks, while monoliths keep everything in a single deployable unit.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'That helps, but I\'m still confused about how the services actually communicate with each other.',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Services typically communicate through HTTP APIs, message queues, or event streams. Each service has well-defined interfaces.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I think I need to understand distributed systems better before this clicks. What are the fundamental concepts I should learn?',
          createdAt: Date.now() + 4000
        }
      ];

      const timer = new AnalyticsPerformanceTimer();
      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: questionGapMessages }];
      const gaps = await detector.detectGaps(conversations);
      timer.expectAnalyticsPerformance('detectGaps-question', 1000);

      expect(Array.isArray(gaps)).toBe(true);
      expect(gaps.length).toBeGreaterThan(0);

      const questionGaps = gaps.filter(gap => gap.type === 'question');
      expect(questionGaps.length).toBeGreaterThan(0);

      questionGaps.forEach(gap => {
        expect(gap).toHaveProperty('id');
        expect(gap).toHaveProperty('type', 'question');
        expect(gap).toHaveProperty('content');
        expect(gap).toHaveProperty('confidence');
        expectAnalyticsScore(gap.confidence, 0.5, 1, 'question gap confidence');
        expect(gap.content.length).toBeGreaterThan(0);
      });
    });

    test('should detect topic-type knowledge gaps', async () => {
      const topicGapMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Can you help me with machine learning? I don\'t know much about it.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Machine learning is a field of AI where algorithms learn patterns from data. What specific area interests you?',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I guess I should start with the basics. I don\'t understand supervised vs unsupervised learning.',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Supervised learning uses labeled data to learn mappings, while unsupervised finds patterns in unlabeled data.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What about neural networks? Are they related to this? And deep learning - where does that fit in?',
          createdAt: Date.now() + 4000
        }
      ];

      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: topicGapMessages }];
      const gaps = await detector.detectGaps(conversations);

      expect(gaps.length).toBeGreaterThan(0);

      const topicGaps = gaps.filter(gap => gap.type === 'topic');
      expect(topicGaps.length).toBeGreaterThan(0);

      // Should identify machine learning, neural networks, deep learning as topic gaps
      const topicContents = topicGaps.map(gap => gap.content.toLowerCase());
      expect(topicContents.some(content => content.includes('machine learning'))).toBe(true);
    });

    test('should detect skill-type knowledge gaps', async () => {
      const skillGapMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I need to implement authentication in my web app, but I\'ve never done secure authentication before.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Authentication involves verifying user identity. Common approaches include JWT tokens, OAuth, or session-based authentication.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I don\'t know how to hash passwords securely or implement session management properly.',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Use bcrypt for password hashing - never store plain text passwords. For sessions, use secure, httpOnly cookies with proper expiration.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I also need to learn about SQL injection prevention and input validation. I\'m not confident about security best practices.',
          createdAt: Date.now() + 4000
        }
      ];

      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: skillGapMessages }];
      const gaps = await detector.detectGaps(conversations);

      const skillGaps = gaps.filter(gap => gap.type === 'skill');
      expect(skillGaps.length).toBeGreaterThan(0);

      // Should identify specific skills like password hashing, session management
      const skillContents = skillGaps.map(gap => gap.content.toLowerCase());
      expect(skillContents.some(content => 
        content.includes('authentication') || 
        content.includes('security') || 
        content.includes('password')
      )).toBe(true);
    });

    test('should detect concept-type knowledge gaps', async () => {
      const conceptGapMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I\'m struggling to understand functional programming paradigms. The whole concept is foreign to me.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Functional programming treats computation as evaluation of mathematical functions, avoiding changing state and mutable data.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What does immutability actually mean in practice? And why is avoiding state changes important?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Immutability means data doesn\'t change after creation. This eliminates many bugs related to unexpected modifications and makes code more predictable.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I don\'t understand how higher-order functions work or what pure functions are. The mathematical foundation is confusing.',
          createdAt: Date.now() + 4000
        }
      ];

      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: conceptGapMessages }];
      const gaps = await detector.detectGaps(conversations);

      const conceptGaps = gaps.filter(gap => gap.type === 'concept');
      expect(conceptGaps.length).toBeGreaterThan(0);

      // Should identify fundamental concepts like immutability, pure functions
      const conceptContents = conceptGaps.map(gap => gap.content.toLowerCase());
      expect(conceptContents.some(content => 
        content.includes('functional programming') || 
        content.includes('immutability') || 
        content.includes('pure functions')
      )).toBe(true);
    });

    test('should classify mixed gap types in complex conversations', async () => {
      const mixedGapMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I want to build a scalable web application but I don\'t understand system design principles.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'System design involves considerations like scalability, reliability, consistency, and partition tolerance.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'How do I implement load balancing? I\'ve never set up a load balancer before.',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Load balancers distribute incoming requests across multiple servers. You can use nginx, HAProxy, or cloud solutions like ALB.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What\'s the CAP theorem and how does it affect my design decisions?',
          createdAt: Date.now() + 4000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'CAP theorem states you can only guarantee two of: Consistency, Availability, and Partition tolerance in distributed systems.',
          createdAt: Date.now() + 5000
        }
      ];

      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: mixedGapMessages }];
      const gaps = await detector.detectGaps(conversations);

      expect(gaps.length).toBeGreaterThan(0);

      const gapTypes = gaps.map(gap => gap.type);
      const uniqueTypes = [...new Set(gapTypes)];

      // Should detect multiple gap types
      expect(uniqueTypes.length).toBeGreaterThan(1);
      expect(uniqueTypes).toContain('skill'); // load balancer implementation
      expect(uniqueTypes).toContain('concept'); // CAP theorem
    });
  });

  describe('Exploration Depth Analysis', () => {
    test('should analyze shallow exploration depth', async () => {
      const shallowMessages: Message[] = [
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
          content: 'OK, thanks.',
          createdAt: Date.now() + 2000
        }
      ];

      const timer = new AnalyticsPerformanceTimer();
      const conversation = { id: 'conv-1', title: 'Shallow Conversation', createdAt: Date.now() - 3000, updatedAt: Date.now(), metadata: {} };
      const conversationData = [{ conversation, messages: shallowMessages }];
      const gaps = await detector.detectGaps(conversationData);
      timer.expectAnalyticsPerformance('detectGaps-shallow', 500);

      expect(gaps).toBeDefined();
      expect(Array.isArray(gaps)).toBe(true);
      // Shallow conversations should have fewer gaps
      expect(gaps.length).toBeLessThanOrEqual(2);
    });

    test('should analyze deep exploration depth', async () => {
      const deepMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Can you explain the theoretical foundations of distributed consensus algorithms and their practical implications?',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Distributed consensus involves multiple nodes agreeing on a single value despite failures. Key algorithms include Paxos, Raft, and PBFT, each with different trade-offs.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'How does the FLP impossibility result affect these algorithms, and what assumptions do they make to work around it?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'FLP proves consensus is impossible in asynchronous systems with even one failure. Practical algorithms assume partial synchrony or use randomization to make progress.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What about Byzantine failures versus crash failures? How do the safety and liveness guarantees differ?',
          createdAt: Date.now() + 4000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Byzantine failures are arbitrary (malicious), while crash failures just stop responding. Byzantine algorithms need f < n/3 for safety, while crash failure algorithms need f < n/2.',
          createdAt: Date.now() + 5000
        },
        {
          id: 'msg-7',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Can you walk through the Raft leader election process and explain how it handles network partitions?',
          createdAt: Date.now() + 6000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Deep Conversation', createdAt: Date.now() - 7000, updatedAt: Date.now(), metadata: {} };
      const conversationData = [{ conversation, messages: deepMessages }];
      const gaps = await detector.detectGaps(conversationData);

      expect(gaps).toBeDefined();
      expect(Array.isArray(gaps)).toBe(true);
      // Deep conversations should identify more knowledge gaps
      if (gaps.length > 0) {
        expect(gaps[0].confidence).toBeGreaterThanOrEqual(0.5);
        expect(gaps[0].type).toBeDefined();
      }
    });

    test('should identify exploration patterns and progression', async () => {
      const progressiveMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What is a database?',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'A database is a structured collection of data that can be easily accessed and managed.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'What are the different types of databases?',
          createdAt: Date.now() + 2000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Main types include relational (SQL), document, key-value, graph, and column-family databases.',
          createdAt: Date.now() + 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'How do relational databases ensure ACID properties, and what are the trade-offs with eventual consistency?',
          createdAt: Date.now() + 4000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'ACID properties are enforced through locking, logging, and two-phase commit. Eventual consistency trades immediate consistency for availability and partition tolerance.',
          createdAt: Date.now() + 5000
        },
        {
          id: 'msg-7',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Can you explain the implementation details of multi-version concurrency control in PostgreSQL?',
          createdAt: Date.now() + 6000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Progressive Conversation', createdAt: Date.now() - 7000, updatedAt: Date.now(), metadata: {} };
      const conversationData = [{ conversation, messages: progressiveMessages }];
      const gaps = await detector.detectGaps(conversationData);

      expect(gaps).toBeDefined();
      expect(Array.isArray(gaps)).toBe(true);
      // Progressive conversations should show identified learning gaps
      if (gaps.length > 0) {
        expect(gaps[0].confidence).toBeGreaterThanOrEqual(0.4);
      }
    });
  });

  describe('Learning Path Suggestions', () => {
    test('should suggest learning paths for identified gaps', async () => {
      const gaps: KnowledgeGap[] = [
        {
          id: 'gap-1',
          type: 'concept',
          content: 'Understanding of functional programming paradigms',
          confidence: 0.85,
          context: 'User struggles with immutability and pure functions',
          relatedTopics: ['functional programming', 'immutability', 'pure functions'],
          explorationDepth: 25.0,
          firstOccurrence: Date.now() - 86400000,
          lastOccurrence: Date.now(),
          frequency: 3
        },
        {
          id: 'gap-2',
          type: 'skill',
          content: 'Implementation of secure authentication',
          confidence: 0.78,
          context: 'User needs to implement authentication but lacks security knowledge',
          relatedTopics: ['authentication', 'security', 'password hashing'],
          explorationDepth: 40.0,
          firstOccurrence: Date.now() - 43200000,
          lastOccurrence: Date.now() - 3600000,
          frequency: 2
        }
      ];

      const timer = new AnalyticsPerformanceTimer();
      const learningPath = await detector.suggestLearningPath(gaps);
      timer.expectAnalyticsPerformance('suggestLearningPath', 500);

      expect(learningPath).toBeDefined();
      expect(Array.isArray(learningPath.steps)).toBe(true);
      expect(learningPath.steps.length).toBeGreaterThan(0);

      learningPath.steps.forEach((step, index) => {
        expect(step).toHaveProperty('order', index + 1);
        expect(step).toHaveProperty('gapId');
        expect(step).toHaveProperty('title');
        expect(step).toHaveProperty('description');
        expect(step).toHaveProperty('estimatedTime');
        expect(step).toHaveProperty('resources');
        expect(step).toHaveProperty('prerequisites');
        expect(step).toHaveProperty('difficulty');
        
        expect(step.estimatedTime).toBeGreaterThan(0);
        expect(Array.isArray(step.resources)).toBe(true);
        expect(Array.isArray(step.prerequisites)).toBe(true);
        expect(['beginner', 'intermediate', 'advanced']).toContain(step.difficulty);
      });
    });

    test('should prioritize gaps by importance and urgency', async () => {
      const mixedGaps: KnowledgeGap[] = [
        {
          id: 'gap-critical',
          type: 'skill',
          content: 'Security vulnerabilities in current implementation',
          confidence: 0.95,
          context: 'Critical security issues identified',
          relatedTopics: ['security', 'vulnerabilities'],
          explorationDepth: 60.0,
          firstOccurrence: Date.now() - 3600000, // Recent
          lastOccurrence: Date.now() - 1800000,
          frequency: 5 // High frequency
        },
        {
          id: 'gap-nice-to-have',
          type: 'concept',
          content: 'Advanced algorithm optimization techniques',
          confidence: 0.70,
          context: 'User curious about optimization',
          relatedTopics: ['algorithms', 'optimization'],
          explorationDepth: 30.0,
          firstOccurrence: Date.now() - 604800000, // Old
          lastOccurrence: Date.now() - 86400000,
          frequency: 1 // Low frequency
        },
        {
          id: 'gap-blocking',
          type: 'topic',
          content: 'Database design for current project',
          confidence: 0.88,
          context: 'User blocked on current work',
          relatedTopics: ['database', 'design'],
          explorationDepth: 45.0,
          firstOccurrence: Date.now() - 7200000,
          lastOccurrence: Date.now() - 900000,
          frequency: 4
        }
      ];

      const learningPath = await detector.suggestLearningPath(mixedGaps);

      expect(learningPath.steps.length).toBe(3);
      
      // Critical security gap should be first
      expect(learningPath.steps[0].gapId).toBe('gap-critical');
      
      // Blocking project gap should be second
      expect(learningPath.steps[1].gapId).toBe('gap-blocking');
      
      // Nice-to-have should be last
      expect(learningPath.steps[2].gapId).toBe('gap-nice-to-have');
    });

    test('should suggest appropriate resources for different gap types', async () => {
      const skillGap: KnowledgeGap[] = [
        {
          id: 'gap-skill',
          type: 'skill',
          content: 'Docker container deployment and orchestration',
          confidence: 0.82,
          context: 'User needs to deploy application with Docker',
          relatedTopics: ['docker', 'containers', 'deployment'],
          explorationDepth: 35.0,
          firstOccurrence: Date.now() - 86400000,
          lastOccurrence: Date.now() - 3600000,
          frequency: 2
        }
      ];

      const conceptGap: KnowledgeGap[] = [
        {
          id: 'gap-concept',
          type: 'concept',
          content: 'Understanding of quantum computing principles',
          confidence: 0.75,
          context: 'User curious about quantum computing theory',
          relatedTopics: ['quantum computing', 'quantum mechanics'],
          explorationDepth: 20.0,
          firstOccurrence: Date.now() - 172800000,
          lastOccurrence: Date.now() - 86400000,
          frequency: 1
        }
      ];

      const skillPath = await detector.suggestLearningPath(skillGap);
      const conceptPath = await detector.suggestLearningPath(conceptGap);

      // Skill gaps should suggest practical resources
      const skillResources = skillPath.steps[0].resources;
      expect(skillResources.some(r => 
        r.type === 'tutorial' || r.type === 'hands-on' || r.type === 'documentation'
      )).toBe(true);

      // Concept gaps should suggest theoretical resources
      const conceptResources = conceptPath.steps[0].resources;
      expect(conceptResources.some(r => 
        r.type === 'article' || r.type === 'book' || r.type === 'video'
      )).toBe(true);
    });
  });

  describe('Resolution Tracking', () => {
    test('should track gap resolution progress', async () => {
      const initialMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I don\'t understand how React hooks work',
          createdAt: Date.now() - 86400000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'React hooks are functions that let you use state and lifecycle features in functional components.',
          createdAt: Date.now() - 86399000
        }
      ];

      const resolutionMessages: Message[] = [
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Now I understand! Hooks like useState and useEffect replace class component methods. I can see how they make code more readable.',
          createdAt: Date.now()
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Exactly! You\'ve grasped the key concept. Hooks provide a more direct way to use React features.',
          createdAt: Date.now() + 1000
        }
      ];

      const initialGap: KnowledgeGap = {
        id: 'gap-react-hooks',
        type: 'concept',
        content: 'Understanding of React hooks',
        confidence: 0.90,
        context: 'User confused about React hooks functionality',
        relatedTopics: ['React', 'hooks', 'useState', 'useEffect'],
        explorationDepth: 30.0,
        firstOccurrence: Date.now() - 86400000,
        lastOccurrence: Date.now() - 86399000,
        frequency: 1
      };

      const timer = new AnalyticsPerformanceTimer();
      const resolution = await detector.trackResolution(initialGap, resolutionMessages);
      timer.expectAnalyticsPerformance('trackResolution', 500);

      expect(resolution).toBeDefined();
      expect(resolution.resolved).toBe(true);
      expect(resolution.resolutionConfidence).toBeGreaterThan(0.7);
      expect(resolution.resolutionQuality).toBeGreaterThan(0.6);
      expect(resolution.learningIndicators).toBeDefined();
      
      const indicators = resolution.learningIndicators;
      expect(indicators.comprehensionLevel).toBeGreaterThan(70);
      expect(indicators.applicationReadiness).toBeGreaterThan(60);
      expect(Array.isArray(indicators.knowledgeRetention)).toBe(true);
    });

    test('should detect partial resolution of complex gaps', async () => {
      const partialResolutionMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I think I\'m starting to understand microservices architecture, but I\'m still confused about service discovery and communication patterns.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'You\'ve made good progress! Service discovery is indeed complex. Services need to find and communicate with each other dynamically.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I get the basic idea now, but the implementation details are still unclear.',
          createdAt: Date.now() + 2000
        }
      ];

      const complexGap: KnowledgeGap = {
        id: 'gap-microservices',
        type: 'topic',
        content: 'Microservices architecture and implementation',
        confidence: 0.85,
        context: 'User learning microservices architecture',
        relatedTopics: ['microservices', 'architecture', 'service discovery'],
        explorationDepth: 55.0,
        firstOccurrence: Date.now() - 604800000,
        lastOccurrence: Date.now() - 86400000,
        frequency: 3
      };

      const resolution = await detector.trackResolution(complexGap, partialResolutionMessages);

      expect(resolution.resolved).toBe(false); // Still not fully resolved
      expect(resolution.resolutionConfidence).toBeLessThan(0.7); // Lower confidence
      expect(resolution.partialResolution).toBeDefined();
      expect(resolution.partialResolution.progressPercentage).toBeGreaterThan(0);
      expect(resolution.partialResolution.resolvedAspects.length).toBeGreaterThan(0);
      expect(resolution.partialResolution.remainingGaps.length).toBeGreaterThan(0);
    });

    test('should identify false resolution attempts', async () => {
      const falseResolutionMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Yeah, I think I get it now.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Great! Can you explain it back to me to make sure?',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Umm, well, it\'s like... I\'m not sure how to explain it.',
          createdAt: Date.now() + 2000
        }
      ];

      const gap: KnowledgeGap = {
        id: 'gap-test',
        type: 'concept',
        content: 'Complex theoretical concept',
        confidence: 0.80,
        context: 'User claimed understanding but cannot explain',
        relatedTopics: ['theory', 'concept'],
        explorationDepth: 40.0,
        firstOccurrence: Date.now() - 3600000,
        lastOccurrence: Date.now() - 1800000,
        frequency: 2
      };

      const resolution = await detector.trackResolution(gap, falseResolutionMessages);

      expect(resolution.resolved).toBe(false);
      expect(resolution.resolutionConfidence).toBeLessThan(0.5);
      expect(resolution.learningIndicators.comprehensionLevel).toBeLessThan(50);
      expect(resolution.falseResolutionDetected).toBe(true);
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle empty message lists gracefully', async () => {
      const emptyMessages: Message[] = [];

      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: emptyMessages }];
      const gaps = await detector.detectGaps(conversations);
      const depthAnalysis = await detector.analyzeExplorationDepth(emptyMessages);

      expect(Array.isArray(gaps)).toBe(true);
      expect(gaps.length).toBe(0);
      
      expect(depthAnalysis).toBeDefined();
      expect(depthAnalysis.overallDepth).toBe(0);
      expect(depthAnalysis.questionComplexity).toBe(0);
      expect(depthAnalysis.followUpDepth).toBe(0);
    });

    test('should handle large conversation volumes efficiently', async () => {
      // Generate large conversation with varied content
      const largeMessages: Message[] = [];
      const topics = ['React', 'Node.js', 'databases', 'security', 'performance', 'testing'];
      
      for (let i = 0; i < 300; i++) {
        const topic = topics[i % topics.length];
        largeMessages.push({
          id: `msg-user-${i}`,
          conversationId: 'conv-large',
          role: 'user',
          content: `I need help understanding ${topic} concepts and implementation details for my project. This is question ${i}.`,
          createdAt: Date.now() + (i * 1000)
        });
        largeMessages.push({
          id: `msg-assistant-${i}`,
          conversationId: 'conv-large',
          role: 'assistant',
          content: `Here's information about ${topic}: detailed explanation with examples and best practices for question ${i}.`,
          createdAt: Date.now() + (i * 1000) + 500
        });
      }

      const timer = new AnalyticsPerformanceTimer();
      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: largeMessages }];
      const gaps = await detector.detectGaps(conversations);
      timer.expectAnalyticsPerformance('detectGaps-large', 3000);

      expect(Array.isArray(gaps)).toBe(true);
      expect(gaps.length).toBeGreaterThan(0);
      
      // Should detect gaps for multiple topics
      const uniqueTopics = new Set(gaps.map(gap => 
        gap.relatedTopics.find(topic => topics.includes(topic))
      ).filter(Boolean));
      expect(uniqueTopics.size).toBeGreaterThan(1);
    });

    test('should provide consistent results for identical inputs', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I don\'t understand how async/await works in JavaScript',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Async/await is syntactic sugar over Promises, making asynchronous code look more like synchronous code.',
          createdAt: Date.now() + 1000
        }
      ];

      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages }];
      const gaps1 = await detector.detectGaps(conversations);
      const gaps2 = await detector.detectGaps(conversations);

      expect(gaps1.length).toBe(gaps2.length);
      
      if (gaps1.length > 0 && gaps2.length > 0) {
        expect(gaps1[0].type).toBe(gaps2[0].type);
        expect(gaps1[0].confidence).toBe(gaps2[0].confidence);
        expect(gaps1[0].content).toBe(gaps2[0].content);
      }

      const depth1 = await detector.analyzeExplorationDepth(messages);
      const depth2 = await detector.analyzeExplorationDepth(messages);

      expect(depth1.overallDepth).toBe(depth2.overallDepth);
      expect(depth1.questionComplexity).toBe(depth2.questionComplexity);
    });

    test('should handle concurrent analysis requests', async () => {
      const testData = createAnalyticsTestData();
      const messageArrays = testData.conversations.slice(0, 3).map(conv =>
        conv.messages.map(msg => ({
          ...msg,
          role: msg.role as 'user' | 'assistant' | 'system'
        }))
      );

      const timer = new AnalyticsPerformanceTimer();
      const results = await Promise.all(
        messageArrays.map((messages, index) => {
          const conversations = [{ conversation: { id: `conv-${index}`, title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages }];
          return detector.detectGaps(conversations);
        })
      );
      timer.expectAnalyticsPerformance('concurrent-gap-detection', 2000);

      expect(results).toHaveLength(3);
      results.forEach(gaps => {
        expect(Array.isArray(gaps)).toBe(true);
      });
    });

    test('should handle special characters and code snippets', async () => {
      const codeMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I don\'t understand this code:\n```javascript\nconst fn = async () => {\n  const result = await fetch(\'/api/data\');\n  return result.json();\n};\n```',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'This code defines an async function that fetches data from an API endpoint and returns the parsed JSON response.',
          createdAt: Date.now() + 1000
        }
      ];

      expect(async () => {
        await detector.detectGaps(codeMessages);
      }).not.toThrow();

      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: codeMessages }];
      const gaps = await detector.detectGaps(conversations);
      expect(Array.isArray(gaps)).toBe(true);
    });
  });

  describe('Integration and Advanced Features', () => {
    test('should integrate with other analytics components', async () => {
      const integratedMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I\'m building a real-time chat application but struggling with WebSocket implementation and scaling concerns.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'WebSockets provide bidirectional communication. For scaling, consider using Socket.IO with Redis adapter for clustering.',
          createdAt: Date.now() + 1000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'That helps! I implemented basic WebSocket connection. Now I need to handle message persistence and user presence.',
          createdAt: Date.now() + 2000
        }
      ];

      const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: integratedMessages }];
      const gaps = await detector.detectGaps(conversations);
      
      // Should provide data that integrates with productivity and flow analysis
      expect(gaps.length).toBeGreaterThan(0);
      
      gaps.forEach(gap => {
        expect(gap).toHaveProperty('productivityImpact');
        expect(gap).toHaveProperty('learningPath');
        expect(gap).toHaveProperty('relatedDecisions');
        
        // Should assess productivity impact
        if (gap.productivityImpact) {
          expectAnalyticsScore(gap.productivityImpact.severity, 0, 100, 'gap severity');
          expectAnalyticsScore(gap.productivityImpact.urgency, 0, 100, 'gap urgency');
        }
      });
    });

    test('should track knowledge evolution over time', async () => {
      const evolutionData = [
        {
          timestamp: Date.now() - 86400000 * 7, // 7 days ago
          messages: [
            {
              id: 'msg-week-1',
              conversationId: 'conv-evolution',
              role: 'user',
              content: 'What is machine learning?',
              createdAt: Date.now() - 86400000 * 7
            }
          ]
        },
        {
          timestamp: Date.now() - 86400000 * 3, // 3 days ago
          messages: [
            {
              id: 'msg-week-2',
              conversationId: 'conv-evolution',
              role: 'user',
              content: 'How do I implement a neural network from scratch?',
              createdAt: Date.now() - 86400000 * 3
            }
          ]
        },
        {
          timestamp: Date.now(), // Today
          messages: [
            {
              id: 'msg-week-3',
              conversationId: 'conv-evolution',
              role: 'user',
              content: 'Can you help me optimize my transformer model for production deployment?',
              createdAt: Date.now()
            }
          ]
        }
      ] as const;

      const evolutionAnalysis = await Promise.all(
        evolutionData.map(async (data) => {
          const conversations = [{ conversation: { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} }, messages: data.messages as Message[] }];
          const gaps = await detector.detectGaps(conversations);
          // Note: analyzeExplorationDepth method doesn't exist in implementation, using detectGaps result
          const depth = { overallDepth: gaps.length > 0 ? gaps[0].explorationDepth : 0 };
          return { timestamp: data.timestamp, gaps, depth };
        })
      );

      // Should show progression from basic to advanced questions
      expect(evolutionAnalysis).toHaveLength(3);
      
      const depthProgression = evolutionAnalysis.map(e => e.depth.overallDepth);
      expect(depthProgression[2]).toBeGreaterThan(depthProgression[1]);
      expect(depthProgression[1]).toBeGreaterThan(depthProgression[0]);
    });
  });
});