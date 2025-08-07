/**
 * Decision Tracker Test Suite
 * 
 * Tests the decision tracking and analysis including:
 * - Decision extraction and identification
 * - Quality assessment and scoring
 * - Outcome tracking and evaluation
 * - Decision pattern recognition
 * - Effectiveness measurement
 */

import { DecisionTracker, Decision, DecisionType } from '../../../src/analytics/analyzers/DecisionTracker';
import { Message } from '../../../src/types/interfaces';
import {
  createAnalyticsTestData,
  AnalyticsPerformanceTimer,
  expectAnalyticsScore,
  setupAnalyticsMockTime,
  restoreAnalyticsTime
} from '../setup';

describe('DecisionTracker', () => {
  let tracker: DecisionTracker;

  beforeEach(() => {
    tracker = new DecisionTracker();
    setupAnalyticsMockTime();
  });

  afterEach(() => {
    restoreAnalyticsTime();
  });

  describe('Initialization and Configuration', () => {
    test('should initialize with default settings', () => {
      expect(tracker).toBeDefined();
      expect(typeof tracker.trackDecisions).toBe('function');
      expect(typeof tracker.analyzeDecisionQuality).toBe('function');
      expect(typeof tracker.detectDecisionPatterns).toBe('function');
    });

    test('should accept custom configuration', () => {
      const config = {
        minDecisionConfidence: 0.75,
        qualityWeights: {
          clarity: 0.3,
          information: 0.25,
          stakeholders: 0.2,
          alternatives: 0.25
        },
        outcomeTrackingWindow: 30 * 24 * 60 * 60 * 1000, // 30 days
        decisionTypeClassifiers: {
          strategic: 0.8,
          tactical: 0.7,
          operational: 0.6
        }
      };

      const customTracker = new DecisionTracker(config);
      expect(customTracker).toBeDefined();
    });
  });

  describe('Decision Extraction and Identification', () => {
    test('should extract strategic decisions from conversations', async () => {
      const strategicMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We need to decide on the overall architecture for our new platform. Should we go with microservices or stick with a monolithic approach?',
          createdAt: Date.now() - 10000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'This is a critical architectural decision. Let\'s consider factors like team size, scalability requirements, operational complexity, and development velocity.',
          createdAt: Date.now() - 9000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Our team is currently small (5 developers), but we expect rapid growth. We prioritize speed to market but also need long-term scalability.',
          createdAt: Date.now() - 8000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Given those constraints, I\'d recommend starting with a modular monolith. You can extract services later as the team grows and you identify clear service boundaries.',
          createdAt: Date.now() - 7000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'That makes sense. We\'ll go with the modular monolith approach. This decision will shape our entire development strategy going forward.',
          createdAt: Date.now() - 6000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Excellent choice! This decision balances your current needs with future flexibility. Document the decision rationale for future reference.',
          createdAt: Date.now() - 5000
        }
      ];

      const timer = new AnalyticsPerformanceTimer();
      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, strategicMessages);
      timer.expectAnalyticsPerformance('trackDecisions-strategic', 1000);

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);

      const strategicDecision = decisions.find(d => d.type === 'strategic');
      expect(strategicDecision).toBeDefined();
      
      if (strategicDecision) {
        expect(strategicDecision.summary).toContain('architecture');
        expect(strategicDecision.summary.toLowerCase()).toMatch(/monolith|microservice/);
        expectAnalyticsScore(strategicDecision.confidence, 0.7, 1, 'strategic decision confidence');
        expect(strategicDecision.context).toBeDefined();
        expect(Array.isArray(strategicDecision.alternativesConsidered)).toBe(true);
        expect(strategicDecision.alternativesConsidered.length).toBeGreaterThan(0);
        expect(strategicDecision.stakeholders).toContain('development team');
      }
    });

    test('should extract tactical decisions from conversations', async () => {
      const tacticalMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'For our user authentication system, should we use JWT tokens or session-based authentication?',
          createdAt: Date.now() - 8000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Both have trade-offs. JWT tokens are stateless and good for distributed systems, while sessions provide better security control and easier revocation.',
          createdAt: Date.now() - 7000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We need to support mobile apps and have multiple backend services. Security is important but so is performance.',
          createdAt: Date.now() - 6000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Given those requirements, JWT tokens would be better. You can implement proper security measures like short expiration times and refresh token rotation.',
          createdAt: Date.now() - 5000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Decided: We\'ll implement JWT-based authentication with refresh tokens. I\'ll start implementing this next sprint.',
          createdAt: Date.now() - 4000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, tacticalMessages);

      expect(decisions.length).toBeGreaterThan(0);

      const tacticalDecision = decisions.find(d => d.type === 'tactical');
      expect(tacticalDecision).toBeDefined();
      
      if (tacticalDecision) {
        expect(tacticalDecision.summary).toContain('authentication');
        expect(tacticalDecision.summary.toLowerCase()).toMatch(/jwt|token/);
        expect(tacticalDecision.implementationTimeframe).toBeDefined();
        expect(tacticalDecision.implementationTimeframe).toContain('sprint');
      }
    });

    test('should extract operational decisions from conversations', async () => {
      const operationalMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Our deployment pipeline is too slow. Should we optimize our current Jenkins setup or switch to GitHub Actions?',
          createdAt: Date.now() - 6000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'What\'s causing the slowness? Is it build times, test execution, or deployment steps?',
          createdAt: Date.now() - 5000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Mainly test execution - they take 15 minutes. The team wants faster feedback.',
          createdAt: Date.now() - 4000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'You could parallelize tests or switch to GitHub Actions which has better caching. Quick win would be test parallelization first.',
          createdAt: Date.now() - 3000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Let\'s implement test parallelization this week. If that doesn\'t help enough, we\'ll consider GitHub Actions.',
          createdAt: Date.now() - 2000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, operationalMessages);

      const operationalDecision = decisions.find(d => d.type === 'operational');
      expect(operationalDecision).toBeDefined();
      
      if (operationalDecision) {
        expect(operationalDecision.summary.toLowerCase()).toMatch(/test|deployment|pipeline/);
        expect(operationalDecision.urgency).toBeGreaterThan(0.6); // Should be marked as urgent
        expect(operationalDecision.implementationTimeframe).toContain('week');
      }
    });

    test('should extract personal decisions from conversations', async () => {
      const personalMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I need to decide which programming language to learn next. I\'m considering Go, Rust, or TypeScript.',
          createdAt: Date.now() - 7000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'What\'s your current background and career goals? Each language serves different purposes.',
          createdAt: Date.now() - 6000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I\'m primarily a JavaScript developer wanting to expand into backend development. I value type safety and performance.',
          createdAt: Date.now() - 5000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'TypeScript would be the easiest transition and gives you full-stack capabilities. Go is great for backend services, Rust for systems programming.',
          createdAt: Date.now() - 4000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I\'ve decided to focus on TypeScript first, then learn Go. This aligns with my career progression plan.',
          createdAt: Date.now() - 3000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, personalMessages);

      const personalDecision = decisions.find(d => d.type === 'personal');
      expect(personalDecision).toBeDefined();
      
      if (personalDecision) {
        expect(personalDecision.summary.toLowerCase()).toMatch(/learn|typescript|language/);
        expect(personalDecision.personalContext).toBeDefined();
        expect(personalDecision.personalContext?.careerImpact).toBeDefined();
      }
    });

    test('should handle conversations with multiple decisions', async () => {
      const multiDecisionMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We need to make several decisions for our new project. First, the tech stack: React or Vue for frontend?',
          createdAt: Date.now() - 10000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'What\'s your team\'s experience? React has a larger ecosystem, Vue has a gentler learning curve.',
          createdAt: Date.now() - 9000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Team knows React better. Let\'s go with React. Second decision: should we use a CSS framework like Tailwind?',
          createdAt: Date.now() - 8000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Tailwind can speed up development and ensure consistency. Consider your design system needs.',
          createdAt: Date.now() - 7000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Yes to Tailwind too. Finally, what about state management - Redux, Zustand, or just Context API?',
          createdAt: Date.now() - 6000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Depends on complexity. Context API for simple state, Zustand for medium complexity, Redux for complex apps with time travel debugging needs.',
          createdAt: Date.now() - 5000
        },
        {
          id: 'msg-7',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We\'ll start with Context API and migrate to Zustand if needed. All three decisions are finalized.',
          createdAt: Date.now() - 4000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, multiDecisionMessages);

      expect(decisions.length).toBeGreaterThanOrEqual(3);
      
      const decisionSummaries = decisions.map(d => d.summary.toLowerCase());
      expect(decisionSummaries.some(s => s.includes('react'))).toBe(true);
      expect(decisionSummaries.some(s => s.includes('tailwind'))).toBe(true);
      expect(decisionSummaries.some(s => s.includes('state') || s.includes('context'))).toBe(true);
    });

    test('should identify decision reversal patterns', async () => {
      const reversalMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We decided to use MongoDB for our new application last week.',
          createdAt: Date.now() - 604800000 // 1 week ago
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'MongoDB is good for document-based data. How\'s the implementation going?',
          createdAt: Date.now() - 604799000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We\'re running into issues with complex queries and transactions. I\'m thinking we should switch back to PostgreSQL.',
          createdAt: Date.now() - 86400000 // 1 day ago
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'That\'s a significant change. What specific problems are you facing that PostgreSQL would solve?',
          createdAt: Date.now() - 86399000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We need ACID transactions and complex joins. I\'ve decided to reverse our database decision and go with PostgreSQL.',
          createdAt: Date.now() - 3600000 // 1 hour ago
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, reversalMessages);

      expect(decisions.length).toBeGreaterThan(0);
      
      const reversalDecision = decisions.find(d => d.isReversal || d.reversesDecisionId);
      expect(reversalDecision).toBeDefined();
      
      if (reversalDecision) {
        expect(reversalDecision.reversalReason).toBeDefined();
        expect(reversalDecision.reversalReason).toContain('ACID');
        expect(reversalDecision.originalDecisionDate).toBeDefined();
        expect(reversalDecision.reversalImpact).toBeDefined();
      }
    });
  });

  describe('Decision Quality Assessment', () => {
    test('should assess high-quality decision making', async () => {
      const highQualityMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We need to choose between AWS and Google Cloud for our infrastructure. I\'ve prepared a detailed comparison matrix.',
          createdAt: Date.now() - 12000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Great approach! What criteria are you comparing? Consider costs, services needed, team expertise, and compliance requirements.',
          createdAt: Date.now() - 11000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I\'ve analyzed costs for our expected load, evaluated both platforms\' ML services, considered our team\'s AWS experience, and reviewed compliance certifications. I\'ve also consulted with our DevOps team and security team.',
          createdAt: Date.now() - 10000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Excellent thoroughness! You\'ve covered all key stakeholders and criteria. What does your analysis show?',
          createdAt: Date.now() - 9000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'AWS wins on team expertise and ecosystem maturity. GCP is slightly cheaper and has better ML tools. Given our timeline constraints and the value of reduced learning curve, we\'ll go with AWS. We\'ll document this decision and review it in 6 months.',
          createdAt: Date.now() - 8000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Solid decision process! You\'ve balanced quantitative analysis with practical constraints. The review timeline shows good decision governance.',
          createdAt: Date.now() - 7000
        }
      ];

      const timer = new AnalyticsPerformanceTimer();
      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const quality = await tracker.analyzeDecisionQuality(conversation, highQualityMessages);
      timer.expectAnalyticsPerformance('analyzeDecisionQuality-high', 800);

      expect(quality).toBeDefined();
      expectAnalyticsScore(quality.overallScore, 80, 100, 'high-quality decision score');
      expectAnalyticsScore(quality.clarityScore, 85, 100, 'clarity score');
      expectAnalyticsScore(quality.informationCompletenessScore, 85, 100, 'information completeness');
      expectAnalyticsScore(quality.stakeholderEngagementScore, 80, 100, 'stakeholder engagement');
      expectAnalyticsScore(quality.alternativeConsiderationScore, 85, 100, 'alternative consideration');

      expect(quality.qualityIndicators).toBeDefined();
      expect(quality.qualityIndicators.thoroughAnalysis).toBe(true);
      expect(quality.qualityIndicators.stakeholderConsultation).toBe(true);
      expect(quality.qualityIndicators.documentedRationale).toBe(true);
      expect(quality.qualityIndicators.reviewMechanism).toBe(true);
    });

    test('should assess low-quality decision making', async () => {
      const lowQualityMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Should we use React or Angular?',
          createdAt: Date.now() - 5000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Both are good frameworks. What are your specific needs? Team experience? Project requirements?',
          createdAt: Date.now() - 4000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I don\'t know, just pick one. Let\'s go with React I guess.',
          createdAt: Date.now() - 3000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'It might be worth considering your team\'s background and project complexity before deciding.',
          createdAt: Date.now() - 2000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'No time for analysis. React it is. We start tomorrow.',
          createdAt: Date.now() - 1000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const quality = await tracker.analyzeDecisionQuality(conversation, lowQualityMessages);

      expect(quality).toBeDefined();
      expectAnalyticsScore(quality.overallScore, 0, 40, 'low-quality decision score');
      expectAnalyticsScore(quality.clarityScore, 0, 30, 'poor clarity score');
      expectAnalyticsScore(quality.informationCompletenessScore, 0, 20, 'poor information completeness');
      expectAnalyticsScore(quality.alternativeConsiderationScore, 0, 25, 'poor alternative consideration');

      expect(quality.qualityIndicators.hastyDecision).toBe(true);
      expect(quality.qualityIndicators.lackOfAnalysis).toBe(true);
      expect(quality.qualityIndicators.insufficientInformation).toBe(true);
    });

    test('should identify decision quality factors', async () => {
      const factorMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Our customer support team needs a new ticketing system. I\'ve researched Zendesk, Freshdesk, and Intercom.',
          createdAt: Date.now() - 10000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Good start! What criteria matter most to your support team?',
          createdAt: Date.now() - 9000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'I surveyed the support team. They want automation features, good reporting, and easy integration with our CRM. I also got budget approval from finance.',
          createdAt: Date.now() - 8000
        },
        {
          id: 'msg-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Excellent stakeholder involvement! How do the options compare on these criteria?',
          createdAt: Date.now() - 7000
        },
        {
          id: 'msg-5',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Zendesk has the best automation but is expensive. Freshdesk is good value with decent features. Intercom lacks some reporting we need. However, I realized we didn\'t consider data migration effort.',
          createdAt: Date.now() - 6000
        },
        {
          id: 'msg-6',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Good catch on migration! That\'s often overlooked. You might want to factor in implementation timeline and training needs too.',
          createdAt: Date.now() - 5000
        },
        {
          id: 'msg-7',
          conversationId: 'conv-1',
          role: 'user',
          content: 'After considering migration complexity and training time, Freshdesk offers the best balance. The decision is made, and I\'ll start the procurement process.',
          createdAt: Date.now() - 4000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const quality = await tracker.analyzeDecisionQuality(conversation, factorMessages);

      expect(quality.decisionFactors).toBeDefined();
      expect(quality.decisionFactors.length).toBeGreaterThan(0);

      const factors = quality.decisionFactors;
      expect(factors.some(f => f.category === 'stakeholder_input')).toBe(true);
      expect(factors.some(f => f.category === 'criteria_definition')).toBe(true);
      expect(factors.some(f => f.category === 'alternative_evaluation')).toBe(true);
      expect(factors.some(f => f.category === 'risk_consideration')).toBe(true);

      // Should identify both positive and negative factors
      const positiveFactors = factors.filter(f => f.impact === 'positive');
      const negativeFactors = factors.filter(f => f.impact === 'negative');
      expect(positiveFactors.length).toBeGreaterThan(0);
      expect(negativeFactors.length).toBeGreaterThan(0);
    });
  });

  describe('Outcome Tracking and Evaluation', () => {
    test('should track successful decision outcomes', async () => {
      const decision: Decision = {
        id: 'decision-1',
        summary: 'Implement automated testing pipeline',
        type: 'operational',
        conversationIds: ['conv-1'],
        decisionMadeAt: Date.now() - 2592000000, // 30 days ago
        confidence: 0.85,
        clarity: 0.90,
        context: 'Team wanted to reduce manual testing overhead',
        alternativesConsidered: ['Manual testing', 'Partial automation'],
        stakeholders: ['development team', 'QA team'],
        implementationStarted: Date.now() - 2419200000, // 28 days ago
        status: 'implemented'
      };

      const outcomeMessages: Message[] = [
        {
          id: 'msg-outcome-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Our automated testing pipeline has been running for a month now. The results are impressive!',
          createdAt: Date.now() - 86400000 // 1 day ago
        },
        {
          id: 'msg-outcome-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'That\'s great to hear! What specific improvements have you noticed?',
          createdAt: Date.now() - 86399000
        },
        {
          id: 'msg-outcome-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We\'ve reduced testing time by 70%, caught 15 bugs that would have reached production, and the team is much more confident in deployments. The investment in automation was definitely worth it.',
          createdAt: Date.now() - 86398000
        },
        {
          id: 'msg-outcome-4',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Excellent outcomes! Quantifiable benefits like 70% time reduction show the decision\'s value.',
          createdAt: Date.now() - 86397000
        }
      ];

      const timer = new AnalyticsPerformanceTimer();
      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const allMessages = [...decisionMessages, ...outcomeMessages];
      const decisions = await tracker.trackDecisions(conversation, allMessages);
      timer.expectAnalyticsPerformance('trackDecisions-with-outcomes', 800);

      expect(decisions).toBeDefined();
      expect(decisions.length).toBeGreaterThan(0);
      const decision = decisions[0];
      expect(decision.outcomeScore).toBeDefined();
      if (decision.outcomeScore !== undefined) {
        expectAnalyticsScore(decision.outcomeScore, 60, 100, 'positive outcome score');
      }
      expect(decision.reversalCount).toBeDefined();
      expect(decision.modificationCount).toBeDefined();
      expect(decision.successFactors).toBeDefined();
      expect(Array.isArray(decision.successFactors)).toBe(true);

      expect(decision.lessonsLearned).toBeDefined();
    });

    test('should track problematic decision outcomes', async () => {
      const decision: Decision = {
        id: 'decision-2',
        summary: 'Migrate to new cloud provider',
        type: 'strategic',
        conversationIds: ['conv-2'],
        decisionMadeAt: Date.now() - 5184000000, // 60 days ago
        confidence: 0.75,
        clarity: 0.80,
        context: 'Cost reduction initiative',
        alternativesConsidered: ['Stay with current provider', 'Hybrid approach'],
        stakeholders: ['engineering', 'finance', 'operations'],
        implementationStarted: Date.now() - 4320000000, // 50 days ago
        status: 'implemented'
      };

      const problematicMessages: Message[] = [
        {
          id: 'msg-problem-1',
          conversationId: 'conv-2',
          role: 'user',
          content: 'We\'re having major issues with the cloud migration. The new provider\'s API is less reliable than expected.',
          createdAt: Date.now() - 1209600000 // 14 days ago
        },
        {
          id: 'msg-problem-2',
          conversationId: 'conv-2',
          role: 'assistant',
          content: 'What specific reliability issues are you encountering? Are they affecting customers?',
          createdAt: Date.now() - 1209599000
        },
        {
          id: 'msg-problem-3',
          conversationId: 'conv-2',
          role: 'user',
          content: 'We\'ve had 3 outages in 2 weeks, each lasting 2-3 hours. Customer complaints have increased 400%. The cost savings aren\'t worth this reliability hit.',
          createdAt: Date.now() - 1209598000
        },
        {
          id: 'msg-problem-4',
          conversationId: 'conv-2',
          role: 'assistant',
          content: 'That\'s a serious impact. Are you considering rolling back or implementing additional redundancy?',
          createdAt: Date.now() - 1209597000
        },
        {
          id: 'msg-problem-5',
          conversationId: 'conv-2',
          role: 'user',
          content: 'We might need to revert to the previous provider. This migration decision is looking like a mistake.',
          createdAt: Date.now() - 604800000 // 7 days ago
        }
      ];

      const conversation = { id: 'conv-2', title: 'Migration Decision', createdAt: Date.now() - 5184000000, updatedAt: Date.now(), metadata: {} };
      const allMessages = [...decisionMessages, ...problematicMessages];
      const decisions = await tracker.trackDecisions(conversation, allMessages);

      expect(decisions).toBeDefined();
      expect(decisions.length).toBeGreaterThan(0);
      const trackedDecision = decisions[0];
      
      expect(trackedDecision.outcomeScore).toBeDefined();
      if (trackedDecision.outcomeScore !== undefined) {
        expectAnalyticsScore(trackedDecision.outcomeScore, 0, 40, 'poor outcome score');
      }
      expect(trackedDecision.reversalCount).toBeGreaterThan(0);
      expect(trackedDecision.failureFactors).toBeDefined();
      expect(trackedDecision.failureFactors.length).toBeGreaterThan(0);

      expect(trackedDecision.lessonsLearned).toBeDefined();

      expect(trackedDecision.modificationCount).toBeGreaterThanOrEqual(0);
    });

    test('should handle mixed or uncertain outcomes', async () => {
      const decision: Decision = {
        id: 'decision-3',
        summary: 'Adopt React Native for mobile development',
        type: 'tactical',
        conversationIds: ['conv-3'],
        decisionMadeAt: Date.now() - 7776000000, // 90 days ago
        confidence: 0.70,
        clarity: 0.75,
        context: 'Cross-platform mobile app development',
        alternativesConsidered: ['Native iOS/Android', 'Flutter', 'Progressive Web App'],
        stakeholders: ['mobile team', 'product team'],
        implementationStarted: Date.now() - 6912000000, // 80 days ago
        status: 'implemented'
      };

      const mixedMessages: Message[] = [
        {
          id: 'msg-mixed-1',
          conversationId: 'conv-3',
          role: 'user',
          content: 'React Native has been a mixed bag for us. Development speed is good, but we\'re hitting some performance issues.',
          createdAt: Date.now() - 2592000000 // 30 days ago
        },
        {
          id: 'msg-mixed-2',
          conversationId: 'conv-3',
          role: 'assistant',
          content: 'What kind of performance issues? Are they solvable with optimization?',
          createdAt: Date.now() - 2591999000
        },
        {
          id: 'msg-mixed-3',
          conversationId: 'conv-3',
          role: 'user',
          content: 'Mostly animation jank and slower list scrolling compared to native. But we shipped to both platforms 3 months faster than planned, and the team loves the developer experience.',
          createdAt: Date.now() - 2591998000
        },
        {
          id: 'msg-mixed-4',
          conversationId: 'conv-3',
          role: 'assistant',
          content: 'Classic trade-offs. Fast delivery vs native performance. Are the performance issues deal-breakers for users?',
          createdAt: Date.now() - 2591997000
        },
        {
          id: 'msg-mixed-5',
          conversationId: 'conv-3',
          role: 'user',
          content: 'User ratings are okay (4.2/5) but not as high as our previous native app (4.6/5). It\'s not terrible, but not optimal either.',
          createdAt: Date.now() - 1296000000 // 15 days ago
        }
      ];

      const conversation = { id: 'conv-3', title: 'Cross-platform Decision', createdAt: Date.now() - 7776000000, updatedAt: Date.now(), metadata: {} };
      const allMessages = [...decisionMessages, ...mixedMessages];
      const decisions = await tracker.trackDecisions(conversation, allMessages);

      expect(decisions).toBeDefined();
      expect(decisions.length).toBeGreaterThan(0);
      const trackedDecision = decisions[0];
      
      expect(trackedDecision.outcomeScore).toBeDefined();
      if (trackedDecision.outcomeScore !== undefined) {
        expectAnalyticsScore(trackedDecision.outcomeScore, 40, 70, 'mixed outcome score');
      }

      expect(trackedDecision.successFactors).toBeDefined();
      expect(trackedDecision.failureFactors).toBeDefined();
      expect(trackedDecision.successFactors.length).toBeGreaterThanOrEqual(0);
      expect(trackedDecision.failureFactors.length).toBeGreaterThanOrEqual(0);

      expect(trackedDecision.lessonsLearned).toBeDefined();
      expect(trackedDecision.priority).toBeDefined();
    });
  });

  describe('Decision Pattern Recognition', () => {
    test('should identify decision-making patterns over time', async () => {
      const patternDecisions: Decision[] = [
        {
          id: 'pattern-1',
          summary: 'Choose React for frontend',
          type: 'tactical',
          conversationIds: ['conv-1'],
          decisionMadeAt: Date.now() - 7776000000, // 90 days ago
          confidence: 0.60,
          clarity: 0.55,
          hastyDecision: true,
          alternativesConsidered: ['Vue'],
          status: 'implemented'
        },
        {
          id: 'pattern-2',
          summary: 'Select MongoDB for database',
          type: 'tactical', 
          conversationIds: ['conv-2'],
          decisionMadeAt: Date.now() - 6048000000, // 70 days ago
          confidence: 0.55,
          clarity: 0.50,
          hastyDecision: true,
          alternativesConsidered: [],
          status: 'reversed'
        },
        {
          id: 'pattern-3',
          summary: 'Implement microservices architecture',
          type: 'strategic',
          conversationIds: ['conv-3'],
          decisionMadeAt: Date.now() - 4320000000, // 50 days ago
          confidence: 0.65,
          clarity: 0.60,
          hastyDecision: true,
          alternativesConsidered: ['Monolith'],
          status: 'problematic'
        },
        {
          id: 'pattern-4',
          summary: 'Adopt comprehensive testing strategy',
          type: 'operational',
          conversationIds: ['conv-4'],
          decisionMadeAt: Date.now() - 2592000000, // 30 days ago
          confidence: 0.90,
          clarity: 0.95,
          thoroughAnalysis: true,
          alternativesConsidered: ['Minimal testing', 'Manual testing only', 'Automated unit tests only'],
          stakeholdersConsulted: ['development', 'QA', 'product'],
          status: 'successful'
        }
      ];

      const timer = new AnalyticsPerformanceTimer();
      const patterns = await tracker.detectDecisionPatterns(patternDecisions);
      timer.expectAnalyticsPerformance('detectDecisionPatterns', 1000);

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns.patterns)).toBe(true);
      expect(patterns.patterns.length).toBeGreaterThan(0);

      // Should identify hasty decision pattern
      const hastyPattern = patterns.patterns.find(p => 
        p.type === 'hasty_decisions' || p.name.includes('hasty')
      );
      expect(hastyPattern).toBeDefined();
      
      if (hastyPattern) {
        expect(hastyPattern.frequency).toBeGreaterThan(2);
        expectAnalyticsScore(hastyPattern.confidence, 0.7, 1, 'hasty pattern confidence');
        expect(hastyPattern.impactOnOutcomes).toBeDefined();
      }

      // Should identify improvement pattern
      const improvementPattern = patterns.patterns.find(p => 
        p.type === 'decision_quality_improvement' || p.trend === 'improving'
      );
      expect(improvementPattern).toBeDefined();

      expect(patterns.overallTrends).toBeDefined();
      expect(patterns.recommendations).toBeDefined();
      expect(patterns.recommendations.length).toBeGreaterThan(0);
    });

    test('should identify domain-specific decision patterns', async () => {
      const techDecisions: Decision[] = [
        {
          id: 'tech-1',
          summary: 'Choose JavaScript framework',
          type: 'tactical',
          conversationIds: ['conv-1'],
          decisionMadeAt: Date.now() - 8640000000,
          domain: 'technology',
          tags: ['frontend', 'framework'],
          alternativesConsidered: ['React', 'Vue', 'Angular'],
          status: 'successful'
        },
        {
          id: 'tech-2',
          summary: 'Select database technology',
          type: 'tactical',
          conversationIds: ['conv-2'],
          decisionMadeAt: Date.now() - 7776000000,
          domain: 'technology',
          tags: ['database', 'backend'],
          alternativesConsidered: ['PostgreSQL', 'MongoDB', 'MySQL'],
          status: 'successful'
        },
        {
          id: 'tech-3',
          summary: 'Pick cloud provider',
          type: 'strategic',
          conversationIds: ['conv-3'],
          decisionMadeAt: Date.now() - 6912000000,
          domain: 'technology',
          tags: ['infrastructure', 'cloud'],
          alternativesConsidered: ['AWS', 'Google Cloud', 'Azure'],
          status: 'mixed'
        }
      ];

      const patterns = await tracker.detectDecisionPatterns(techDecisions);

      expect(patterns.domainSpecificPatterns).toBeDefined();
      const techPatterns = patterns.domainSpecificPatterns['technology'];
      expect(techPatterns).toBeDefined();
      
      if (techPatterns) {
        expect(techPatterns.commonDecisionTypes).toContain('framework_selection');
        expect(techPatterns.successRate).toBeDefined();
        expectAnalyticsScore(techPatterns.successRate, 50, 100, 'tech decision success rate');
      }
    });

    test('should detect decision quality evolution over time', async () => {
      const evolutionDecisions: Decision[] = [];
      const baseTime = Date.now() - 31536000000; // 1 year ago
      const monthMs = 2592000000; // 30 days in ms

      // Generate decisions with improving quality over time
      for (let i = 0; i < 12; i++) {
        const qualityScore = Math.min(0.3 + (i * 0.05), 0.9); // Gradually improving
        evolutionDecisions.push({
          id: `evolution-${i}`,
          summary: `Monthly decision ${i + 1}`,
          type: 'tactical',
          conversationIds: [`conv-${i}`],
          decisionMadeAt: baseTime + (i * monthMs),
          confidence: qualityScore,
          clarity: qualityScore,
          alternativesConsidered: i < 6 ? ['Option A'] : ['Option A', 'Option B', 'Option C'],
          thoroughAnalysis: i >= 6,
          status: i < 4 ? 'problematic' : i < 8 ? 'mixed' : 'successful'
        });
      }

      const patterns = await tracker.detectDecisionPatterns(evolutionDecisions);

      expect(patterns.evolutionTrends).toBeDefined();
      expect(patterns.evolutionTrends.qualityTrend).toBe('improving');
      expect(patterns.evolutionTrends.trendStrength).toBeGreaterThan(0.7);
      
      expect(patterns.recommendations).toBeDefined();
      const improvementRec = patterns.recommendations.find(r => 
        r.type === 'maintain_improvement' || r.priority === 'high'
      );
      expect(improvementRec).toBeDefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    test('should handle empty message lists gracefully', async () => {
      const emptyMessages: Message[] = [];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, emptyMessages);
      const quality = await tracker.analyzeDecisionQuality(conversation, emptyMessages, decisions);

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBe(0);
      
      expect(quality).toBeDefined();
      expect(quality.overallScore).toBe(0);
      expect(quality.decisionFactors).toEqual([]);
    });

    test('should handle large conversation volumes efficiently', async () => {
      // Generate large conversation with decision content
      const largeMessages: Message[] = [];
      for (let i = 0; i < 200; i++) {
        largeMessages.push({
          id: `msg-large-${i}`,
          conversationId: 'conv-large',
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: i % 2 === 0 
            ? `Decision point ${i}: Should we implement feature X or Y? I think we should go with option ${i % 2 === 0 ? 'X' : 'Y'}.`
            : `That sounds reasonable. Consider factors A, B, and C when making this decision.`,
          createdAt: Date.now() + (i * 1000)
        });
      }

      const timer = new AnalyticsPerformanceTimer();
      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, largeMessages);
      timer.expectAnalyticsPerformance('trackDecisions-large', 3000);

      expect(Array.isArray(decisions)).toBe(true);
      expect(decisions.length).toBeGreaterThan(0);
    });

    test('should provide consistent results for identical inputs', async () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'We need to decide between TypeScript and JavaScript for our new project. After reviewing our team\'s skills and project requirements, I think TypeScript is the better choice.',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Good analysis! TypeScript provides better tooling and type safety for larger projects.',
          createdAt: Date.now() + 1000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} };
      const decisions1 = await tracker.trackDecisions(conversation, messages);
      const decisions2 = await tracker.trackDecisions(conversation, messages);

      expect(decisions1.length).toBe(decisions2.length);
      
      if (decisions1.length > 0 && decisions2.length > 0) {
        expect(decisions1[0].summary).toBe(decisions2[0].summary);
        expect(decisions1[0].confidence).toBe(decisions2[0].confidence);
        expect(decisions1[0].type).toBe(decisions2[0].type);
      }

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, messages);
      const quality1 = await tracker.analyzeDecisionQuality(conversation, messages, decisions);
      const quality2 = await tracker.analyzeDecisionQuality(conversation, messages, decisions);

      expect(quality1.overallScore).toBe(quality2.overallScore);
      expect(quality1.clarityScore).toBe(quality2.clarityScore);
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
          const conversation = { id: `conv-${index}`, title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
          return tracker.trackDecisions(conversation, messages);
        })
      );
      timer.expectAnalyticsPerformance('concurrent-decision-tracking', 2000);

      expect(results).toHaveLength(3);
      results.forEach(decisions => {
        expect(Array.isArray(decisions)).toBe(true);
      });
    });

    test('should handle special characters and formatting', async () => {
      const specialMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'Decision: We\'ll use this config:\n```json\n{\n  "framework": "React",\n  "testing": "Jest",\n  "linting": "ESLint"\n}\n```\nThis is our final choice!',
          createdAt: Date.now()
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Excellent configuration choices! This setup will provide good developer experience.',
          createdAt: Date.now() + 1000
        }
      ];

      expect(async () => {
        const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} };
        await tracker.trackDecisions(conversation, specialMessages);
      }).not.toThrow();

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, specialMessages);
      expect(Array.isArray(decisions)).toBe(true);
    });
  });

  describe('Integration Features', () => {
    test('should provide integration data for other analytics components', async () => {
      const integrationMessages: Message[] = [
        {
          id: 'msg-1',
          conversationId: 'conv-1',
          role: 'user',
          content: 'After extensive research on authentication methods, I\'ve decided we should implement OAuth 2.0 with PKCE for our mobile app.',
          createdAt: Date.now() - 5000
        },
        {
          id: 'msg-2',
          conversationId: 'conv-1',
          role: 'assistant',
          content: 'Excellent choice for mobile security! PKCE addresses the security concerns with OAuth in mobile apps.',
          createdAt: Date.now() - 4000
        },
        {
          id: 'msg-3',
          conversationId: 'conv-1',
          role: 'user',
          content: 'This decision required learning about OAuth flows and mobile security best practices. I feel much more confident about security now.',
          createdAt: Date.now() - 3000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now() - 5000, updatedAt: Date.now(), metadata: {} };
      const decisions = await tracker.trackDecisions(conversation, integrationMessages);

      expect(decisions.length).toBeGreaterThan(0);
      
      const decision = decisions[0];
      
      // Should provide data useful for knowledge gap analysis
      expect(decision.learningRequired).toBeDefined();
      expect(decision.knowledgeAcquired).toBeDefined();
      expect(decision.skillsApplied).toBeDefined();
      
      // Should provide data useful for productivity analysis
      expect(decision.productivityImpact).toBeDefined();
      expect(decision.complexityLevel).toBeDefined();
      
      // Should provide data useful for flow analysis
      expect(decision.contextSwitching).toBeDefined();
      expect(decision.decisionDepth).toBeDefined();
    });

    test('should track decision implementation timeline for productivity correlation', async () => {
      const decision: Decision = {
        id: 'timeline-decision',
        summary: 'Implement CI/CD pipeline',
        type: 'operational',
        conversationIds: ['conv-timeline'],
        decisionMadeAt: Date.now() - 1209600000, // 14 days ago
        confidence: 0.85,
        clarity: 0.90,
        plannedImplementationTime: 7 * 24 * 60 * 60 * 1000, // 7 days planned
        implementationStarted: Date.now() - 1036800000, // 12 days ago
        status: 'in_progress'
      };

      const timelineMessages: Message[] = [
        {
          id: 'timeline-1',
          conversationId: 'conv-timeline',
          role: 'user',
          content: 'The CI/CD implementation is taking longer than expected. We\'re 10 days in and still working on it.',
          createdAt: Date.now() - 345600000 // 4 days ago
        },
        {
          id: 'timeline-2',
          conversationId: 'conv-timeline',
          role: 'assistant',
          content: 'What\'s causing the delay? Is it technical complexity or unforeseen requirements?',
          createdAt: Date.now() - 345599000
        },
        {
          id: 'timeline-3',
          conversationId: 'conv-timeline',
          role: 'user',
          content: 'Mostly integration challenges we didn\'t anticipate. But we\'re making good progress now.',
          createdAt: Date.now() - 345598000
        }
      ];

      const conversation = { id: 'conv-1', title: 'Test Conversation', createdAt: Date.now(), updatedAt: Date.now(), metadata: {} };
      const timeline = await tracker.generateDecisionTimeline(conversation, timelineMessages, decision);

      expect(timeline).toBeDefined();
      expect(timeline.phases).toBeDefined();
      expect(Array.isArray(timeline.phases)).toBe(true);
      expect(timeline.efficiency).toBeDefined();
      expect(timeline.completeness).toBeDefined();
    });
  });
});