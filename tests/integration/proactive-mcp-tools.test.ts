/**
 * Integration tests for Proactive MCP Tools
 * 
 * Tests the four proactive MCP tools:
 * - get_proactive_insights
 * - check_for_conflicts
 * - suggest_relevant_context
 * - auto_tag_conversation
 */

import { DatabaseManager } from '../../src/storage/Database.js';
import { GetProactiveInsightsTool } from '../../src/tools/proactive/GetProactiveInsightsTool.js';
import { CheckForConflictsTool } from '../../src/tools/proactive/CheckForConflictsTool.js';
import { SuggestRelevantContextTool } from '../../src/tools/proactive/SuggestRelevantContextTool.js';
import { AutoTagConversationTool } from '../../src/tools/proactive/AutoTagConversationTool.js';
import { createTestDatabase, insertTestData, MockTransport, setupMockTime, restoreTime } from '../utils/test-helpers.js';

describe('Proactive MCP Tools Integration', () => {
  let dbManager: DatabaseManager;
  let mockTransport: MockTransport;
  let testConversations: any[];
  let mockTime: number;

  // Tool instances
  let getProactiveInsightsTool: GetProactiveInsightsTool;
  let checkForConflictsTool: CheckForConflictsTool;
  let suggestRelevantContextTool: SuggestRelevantContextTool;
  let autoTagConversationTool: AutoTagConversationTool;

  beforeEach(async () => {
    dbManager = await createTestDatabase();
    mockTransport = new MockTransport();
    
    // Set consistent time for testing
    mockTime = Date.now();
    setupMockTime(mockTime);
    
    // Create comprehensive test data
    testConversations = createProactiveMCPTestData(mockTime);
    await insertTestData(dbManager, testConversations);
    await setupProactiveEntityData(dbManager);

    // Initialize tools
    getProactiveInsightsTool = new GetProactiveInsightsTool({ databaseManager: dbManager });
    checkForConflictsTool = new CheckForConflictsTool({ databaseManager: dbManager });
    suggestRelevantContextTool = new SuggestRelevantContextTool({ databaseManager: dbManager });
    autoTagConversationTool = new AutoTagConversationTool({ databaseManager: dbManager });
  });

  afterEach(async () => {
    restoreTime();
    await dbManager.close();
  });

  describe('GetProactiveInsightsTool', () => {
    it('should retrieve unresolved actions successfully', async () => {
      const result = await getProactiveInsightsTool.handle({
        includeTypes: ['unresolved_actions'],
        daysSince: 30,
        minConfidence: 0.6,
        limit: 10
      });

      expect(result.isError).toBe(false);
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const response = JSON.parse(result.content[0].text);
      expect(response.insights.unresolvedActions).toBeDefined();
      expect(Array.isArray(response.insights.unresolvedActions)).toBe(true);
      expect(response.summary.totalInsights).toBeGreaterThanOrEqual(0);
      expect(response.summary.analysisScope.daysSince).toBe(30);
      expect(response.summary.analysisScope.minConfidence).toBe(0.6);
    });

    it('should retrieve recurring questions', async () => {
      const result = await getProactiveInsightsTool.handle({
        includeTypes: ['recurring_questions'],
        daysSince: 30,
        limit: 5
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.insights.recurringQuestions).toBeDefined();
      expect(Array.isArray(response.insights.recurringQuestions)).toBe(true);
      
      response.insights.recurringQuestions.forEach((question: any) => {
        expect(question.frequency).toBeGreaterThanOrEqual(2);
        expect(question.questionText).toBeTruthy();
        expect(question.instances).toBeDefined();
        expect(question.conversationIds).toBeDefined();
      });
    });

    it('should identify knowledge gaps', async () => {
      const result = await getProactiveInsightsTool.handle({
        includeTypes: ['knowledge_gaps'],
        daysSince: 30
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.insights.knowledgeGaps).toBeDefined();
      expect(Array.isArray(response.insights.knowledgeGaps)).toBe(true);
      
      response.insights.knowledgeGaps.forEach((gap: any) => {
        expect(gap.topic).toBeTruthy();
        expect(gap.gapRatio).toBeGreaterThanOrEqual(1.5);
        expect(gap.questionCount).toBeGreaterThan(0);
        expect(gap.relatedMessages).toBeDefined();
      });
    });

    it('should track stale commitments', async () => {
      // Move time forward to make commitments stale
      const futureTime = mockTime + (10 * 24 * 60 * 60 * 1000);
      setupMockTime(futureTime);

      const result = await getProactiveInsightsTool.handle({
        includeTypes: ['stale_commitments'],
        daysSince: 7
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.insights.staleCommitments).toBeDefined();
      expect(Array.isArray(response.insights.staleCommitments)).toBe(true);
      
      response.insights.staleCommitments.forEach((commitment: any) => {
        expect(commitment.status).toMatch(/pending|overdue/);
        expect(commitment.daysSinceCommitment).toBeGreaterThanOrEqual(7);
        expect(commitment.commitmentText).toBeTruthy();
      });
    });

    it('should handle all insight types together', async () => {
      const result = await getProactiveInsightsTool.handle({
        includeTypes: ['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments'],
        daysSince: 30,
        limit: 5
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.insights).toBeDefined();
      expect(response.summary.totalInsights).toBeGreaterThanOrEqual(0);
      
      // Should have all requested insight types
      expect(response.insights.unresolvedActions).toBeDefined();
      expect(response.insights.recurringQuestions).toBeDefined();
      expect(response.insights.knowledgeGaps).toBeDefined();
      expect(response.insights.staleCommitments).toBeDefined();
    });

    it('should filter by conversation ID', async () => {
      const result = await getProactiveInsightsTool.handle({
        conversationId: 'conv-proactive-test-1',
        includeTypes: ['unresolved_actions'],
        daysSince: 30
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.summary.analysisScope.conversationId).toBe('conv-proactive-test-1');
      
      // All unresolved actions should be from the specified conversation
      response.insights.unresolvedActions?.forEach((action: any) => {
        expect(action.conversationId).toBe('conv-proactive-test-1');
      });
    });

    it('should handle validation errors', async () => {
      const result = await getProactiveInsightsTool.handle({
        daysSince: -1, // Invalid
        minConfidence: 2, // Invalid
        limit: 0 // Invalid
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Validation error');
    });
  });

  describe('CheckForConflictsTool', () => {
    it('should detect scheduling conflicts', async () => {
      const result = await checkForConflictsTool.handle({
        conversationId: 'conv-conflict-test',
        conflictTypes: ['schedule'],
        timeWindowDays: 30
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.conflicts).toBeDefined();
      expect(response.summary.totalConflicts).toBeGreaterThanOrEqual(0);
      expect(response.summary.conflictTypes).toContain('schedule');
    });

    it('should detect commitment conflicts', async () => {
      const result = await checkForConflictsTool.handle({
        conversationId: 'conv-conflict-test',
        conflictTypes: ['commitment'],
        minSeverity: 'medium'
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.conflicts).toBeDefined();
      expect(Array.isArray(response.conflicts)).toBe(true);
      
      response.conflicts.forEach((conflict: any) => {
        expect(['low', 'medium', 'high', 'critical']).toContain(conflict.severity);
        expect(conflict.conflictType).toBe('commitment');
        expect(conflict.description).toBeTruthy();
      });
    });

    it('should detect resource conflicts', async () => {
      const result = await checkForConflictsTool.handle({
        conflictTypes: ['resource'],
        timeWindowDays: 14
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      const resourceConflicts = response.conflicts.filter((c: any) => c.conflictType === 'resource');
      resourceConflicts.forEach((conflict: any) => {
        expect(conflict.involvedEntities).toBeDefined();
        expect(conflict.suggestedResolution).toBeTruthy();
      });
    });

    it('should filter by severity level', async () => {
      const highSeverityResult = await checkForConflictsTool.handle({
        minSeverity: 'high'
      });

      expect(highSeverityResult.isError).toBe(false);
      const highResponse = JSON.parse(highSeverityResult.content[0].text);
      
      highResponse.conflicts.forEach((conflict: any) => {
        expect(['high', 'critical']).toContain(conflict.severity);
      });
    });

    it('should provide resolution suggestions', async () => {
      const result = await checkForConflictsTool.handle({
        conflictTypes: ['schedule', 'commitment', 'resource']
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      response.conflicts.forEach((conflict: any) => {
        expect(conflict.suggestedResolution).toBeTruthy();
        expect(typeof conflict.suggestedResolution).toBe('string');
      });
    });

    it('should handle empty conflict results', async () => {
      const result = await checkForConflictsTool.handle({
        conversationId: 'conv-no-conflicts',
        conflictTypes: ['schedule']
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.conflicts).toEqual([]);
      expect(response.summary.totalConflicts).toBe(0);
    });
  });

  describe('SuggestRelevantContextTool', () => {
    it('should suggest related conversations', async () => {
      const result = await suggestRelevantContextTool.handle({
        currentConversationId: 'conv-proactive-test-1',
        contextTypes: ['related_conversations'],
        maxSuggestions: 5
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.contextSuggestions.relatedConversations).toBeDefined();
      expect(Array.isArray(response.contextSuggestions.relatedConversations)).toBe(true);
      
      response.contextSuggestions.relatedConversations.forEach((suggestion: any) => {
        expect(suggestion.conversationId).toBeTruthy();
        expect(suggestion.relevanceScore).toBeGreaterThan(0);
        expect(suggestion.reasonForRelevance).toBeTruthy();
      });
    });

    it('should suggest relevant entities', async () => {
      const result = await suggestRelevantContextTool.handle({
        currentConversationId: 'conv-proactive-test-1',
        contextTypes: ['relevant_entities'],
        maxSuggestions: 10
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.contextSuggestions.relevantEntities).toBeDefined();
      expect(Array.isArray(response.contextSuggestions.relevantEntities)).toBe(true);
      
      response.contextSuggestions.relevantEntities.forEach((entity: any) => {
        expect(entity.name).toBeTruthy();
        expect(entity.type).toBeTruthy();
        expect(entity.relevanceScore).toBeGreaterThan(0);
      });
    });

    it('should suggest historical patterns', async () => {
      const result = await suggestRelevantContextTool.handle({
        currentConversationId: 'conv-proactive-test-1',
        contextTypes: ['historical_patterns'],
        timeWindowDays: 60
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.contextSuggestions.historicalPatterns).toBeDefined();
      expect(Array.isArray(response.contextSuggestions.historicalPatterns)).toBe(true);
    });

    it('should filter by minimum relevance score', async () => {
      const result = await suggestRelevantContextTool.handle({
        currentConversationId: 'conv-proactive-test-1',
        contextTypes: ['related_conversations'],
        minRelevanceScore: 0.7
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      response.contextSuggestions.relatedConversations?.forEach((suggestion: any) => {
        expect(suggestion.relevanceScore).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('should respect maxSuggestions limit', async () => {
      const result = await suggestRelevantContextTool.handle({
        currentConversationId: 'conv-proactive-test-1',
        contextTypes: ['related_conversations', 'relevant_entities'],
        maxSuggestions: 3
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      const totalSuggestions = (response.contextSuggestions.relatedConversations?.length || 0) +
                               (response.contextSuggestions.relevantEntities?.length || 0);
      
      expect(totalSuggestions).toBeLessThanOrEqual(6); // 3 per type
    });

    it('should handle non-existent conversation gracefully', async () => {
      const result = await suggestRelevantContextTool.handle({
        currentConversationId: 'non-existent-conversation',
        contextTypes: ['related_conversations']
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.contextSuggestions.relatedConversations).toEqual([]);
      expect(response.summary.totalSuggestions).toBe(0);
    });
  });

  describe('AutoTagConversationTool', () => {
    it('should auto-tag conversation with all tag types', async () => {
      const result = await autoTagConversationTool.handle({
        conversationId: 'conv-proactive-test-1',
        includeTypes: ['topic_tags', 'activity_classification', 'urgency_detection', 'project_context']
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult).toBeDefined();
      expect(response.taggingResult.conversationId).toBe('conv-proactive-test-1');
      expect(response.taggingResult.topicTags).toBeDefined();
      expect(response.taggingResult.activity).toBeDefined();
      expect(response.taggingResult.urgency).toBeDefined();
      expect(response.taggingResult.projectContexts).toBeDefined();
      expect(response.taggingResult.generatedAt).toBeTruthy();
    });

    it('should generate topic tags', async () => {
      const result = await autoTagConversationTool.handle({
        conversationId: 'conv-proactive-test-1',
        includeTypes: ['topic_tags'],
        maxTopicTags: 5
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.topicTags).toBeDefined();
      expect(Array.isArray(response.taggingResult.topicTags)).toBe(true);
      expect(response.taggingResult.topicTags.length).toBeLessThanOrEqual(5);
      
      response.taggingResult.topicTags.forEach((tag: any) => {
        expect(['entity', 'theme', 'domain']).toContain(tag.type);
        expect(tag.name).toBeTruthy();
        expect(tag.relevance).toBeGreaterThan(0);
      });
    });

    it('should classify activity type', async () => {
      const result = await autoTagConversationTool.handle({
        conversationId: 'conv-proactive-test-1',
        includeTypes: ['activity_classification']
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.activity).toBeDefined();
      expect(['discussion', 'decision', 'planning', 'problem_solving', 'learning', 'review', 'brainstorming'])
        .toContain(response.taggingResult.activity.type);
      expect(response.taggingResult.activity.confidence).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.taggingResult.activity.indicators)).toBe(true);
    });

    it('should detect urgency levels', async () => {
      const result = await autoTagConversationTool.handle({
        conversationId: 'conv-urgent-test',
        includeTypes: ['urgency_detection']
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.urgency).toBeDefined();
      expect(['none', 'low', 'medium', 'high', 'critical'])
        .toContain(response.taggingResult.urgency.level);
      expect(response.taggingResult.urgency.score).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(response.taggingResult.urgency.signals)).toBe(true);
    });

    it('should identify project contexts', async () => {
      const result = await autoTagConversationTool.handle({
        conversationId: 'conv-project-test',
        includeTypes: ['project_context']
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.projectContexts).toBeDefined();
      expect(Array.isArray(response.taggingResult.projectContexts)).toBe(true);
      
      response.taggingResult.projectContexts.forEach((project: any) => {
        expect(project.name).toBeTruthy();
        expect(project.confidence).toBeGreaterThan(0);
        expect(['ongoing', 'new', 'completed']).toContain(project.type);
      });
    });

    it('should store tagging results when requested', async () => {
      const result = await autoTagConversationTool.handle({
        conversationId: 'conv-proactive-test-1',
        includeTypes: ['topic_tags', 'activity_classification'],
        storeTags: true
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult).toBeDefined();
      expect(response.summary.tagsStored).toBe(true);
      expect(response.summary.totalTags).toBeGreaterThan(0);
    });

    it('should apply custom configuration', async () => {
      const result = await autoTagConversationTool.handle({
        conversationId: 'conv-proactive-test-1',
        includeTypes: ['topic_tags'],
        maxTopicTags: 2,
        minEntityRelevance: 0.8
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      expect(response.taggingResult.topicTags.length).toBeLessThanOrEqual(2);
      
      const entityTags = response.taggingResult.topicTags.filter((tag: any) => tag.type === 'entity');
      entityTags.forEach((tag: any) => {
        expect(tag.relevance).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should validate conversation exists', async () => {
      const result = await autoTagConversationTool.handle({
        conversationId: 'non-existent-conversation',
        includeTypes: ['topic_tags']
      });

      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      
      // Should return empty results for non-existent conversation
      expect(response.taggingResult.topicTags).toEqual([]);
      expect(response.summary.totalTags).toBe(0);
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('should return proper MCP response format for all tools', async () => {
      const tools = [
        { tool: getProactiveInsightsTool, input: { includeTypes: ['unresolved_actions'] } },
        { tool: checkForConflictsTool, input: { conflictTypes: ['schedule'] } },
        { tool: suggestRelevantContextTool, input: { currentConversationId: 'conv-proactive-test-1', contextTypes: ['related_conversations'] } },
        { tool: autoTagConversationTool, input: { conversationId: 'conv-proactive-test-1', includeTypes: ['topic_tags'] } }
      ];

      for (const { tool, input } of tools) {
        const result = await tool.handle(input);
        
        expect(result).toBeDefined();
        expect(typeof result.isError).toBe('boolean');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content.length).toBeGreaterThan(0);
        expect(result.content[0]).toHaveProperty('type');
        expect(result.content[0]).toHaveProperty('text');
      }
    });

    it('should handle validation errors consistently', async () => {
      const tools = [
        { tool: getProactiveInsightsTool, input: { daysSince: -1 } },
        { tool: checkForConflictsTool, input: { timeWindowDays: 0 } },
        { tool: suggestRelevantContextTool, input: { maxSuggestions: -1 } },
        { tool: autoTagConversationTool, input: { conversationId: '', includeTypes: [] } }
      ];

      for (const { tool, input } of tools) {
        const result = await tool.handle(input);
        
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation error');
      }
    });

    it('should handle database errors gracefully', async () => {
      await dbManager.close();

      const tools = [
        { tool: getProactiveInsightsTool, input: { includeTypes: ['unresolved_actions'] } },
        { tool: checkForConflictsTool, input: { conflictTypes: ['schedule'] } },
        { tool: suggestRelevantContextTool, input: { currentConversationId: 'test', contextTypes: ['related_conversations'] } },
        { tool: autoTagConversationTool, input: { conversationId: 'test', includeTypes: ['topic_tags'] } }
      ];

      for (const { tool, input } of tools) {
        const result = await tool.handle(input);
        
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Database error');
      }
    });
  });

  describe('Performance', () => {
    it('should complete proactive insights analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      const result = await getProactiveInsightsTool.handle({
        includeTypes: ['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments'],
        daysSince: 30,
        limit: 20
      });
      
      const duration = Date.now() - startTime;
      
      expect(result.isError).toBe(false);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle large result sets efficiently', async () => {
      const result = await getProactiveInsightsTool.handle({
        includeTypes: ['unresolved_actions', 'recurring_questions'],
        daysSince: 365,
        limit: 100
      });
      
      expect(result.isError).toBe(false);
      const response = JSON.parse(result.content[0].text);
      expect(response.summary.totalInsights).toBeLessThanOrEqual(200); // 100 per type
    });
  });
});

/**
 * Create comprehensive test data for proactive MCP tools
 */
function createProactiveMCPTestData(baseTime: number) {
  return [
    {
      id: 'conv-proactive-test-1',
      title: 'React Development Discussion',
      messages: [
        {
          id: 'msg-proactive-1',
          conversationId: 'conv-proactive-test-1',
          role: 'user',
          content: 'How do React hooks work with TypeScript?',
          createdAt: baseTime - (10 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-proactive-2',
          conversationId: 'conv-proactive-test-1',
          role: 'assistant',
          content: "I'll check the latest TypeScript documentation and get back to you with detailed examples.",
          createdAt: baseTime - (9 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-proactive-3',
          conversationId: 'conv-proactive-test-1',
          role: 'user',
          content: 'How do React hooks work with TypeScript? I still need help with this.',
          createdAt: baseTime - (5 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 'conv-conflict-test',
      title: 'Scheduling and Resource Conflicts',
      messages: [
        {
          id: 'msg-conflict-1',
          conversationId: 'conv-conflict-test',
          role: 'assistant',
          content: "I'll review the database schema by Friday and also complete the API documentation by Friday.",
          createdAt: baseTime - (3 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-conflict-2',
          conversationId: 'conv-conflict-test',
          role: 'assistant',
          content: "I'll also need to work on the React components this week - that's a lot of commitments!",
          createdAt: baseTime - (2 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 'conv-urgent-test',
      title: 'Urgent Production Issue',
      messages: [
        {
          id: 'msg-urgent-1',
          conversationId: 'conv-urgent-test',
          role: 'user',
          content: 'URGENT: The production system is down and we need an immediate fix!',
          createdAt: baseTime - (2 * 60 * 60 * 1000)
        },
        {
          id: 'msg-urgent-2',
          conversationId: 'conv-urgent-test',
          role: 'assistant',
          content: 'This is critical - I\'ll investigate the emergency ASAP and restore the system.',
          createdAt: baseTime - (1 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 'conv-project-test',
      title: 'Project Alpha Development',
      messages: [
        {
          id: 'msg-project-1',
          conversationId: 'conv-project-test',
          role: 'user',
          content: 'Let\'s plan the Project Alpha development with React and TypeScript integration.',
          createdAt: baseTime - (7 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-project-2',
          conversationId: 'conv-project-test',
          role: 'assistant',
          content: 'Great! I\'ll coordinate with the team and schedule the development milestones for Project Alpha.',
          createdAt: baseTime - (6 * 24 * 60 * 60 * 1000)
        }
      ]
    },
    {
      id: 'conv-related-test',
      title: 'TypeScript Best Practices',
      messages: [
        {
          id: 'msg-related-1',
          conversationId: 'conv-related-test',
          role: 'user',
          content: 'What are the best practices for TypeScript with React hooks?',
          createdAt: baseTime - (4 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'msg-related-2',
          conversationId: 'conv-related-test',
          role: 'assistant',
          content: 'For TypeScript with React hooks, focus on proper type definitions and generic constraints.',
          createdAt: baseTime - (4 * 24 * 60 * 60 * 1000)
        }
      ]
    }
  ];
}

/**
 * Set up entity data for proactive testing
 */
async function setupProactiveEntityData(dbManager: DatabaseManager) {
  const db = dbManager.getConnection();
  
  // Create entities
  const entities = [
    { id: 'entity-react-hooks', name: 'React Hooks', type: 'technical', created_at: Date.now() - 10000 },
    { id: 'entity-typescript', name: 'TypeScript', type: 'technical', created_at: Date.now() - 10000 },
    { id: 'entity-project-alpha', name: 'Project Alpha', type: 'product', created_at: Date.now() - 7000 },
    { id: 'entity-production-system', name: 'Production System', type: 'technical', created_at: Date.now() - 3000 },
    { id: 'entity-database', name: 'Database Schema', type: 'technical', created_at: Date.now() - 5000 },
    { id: 'entity-api-docs', name: 'API Documentation', type: 'concept', created_at: Date.now() - 5000 }
  ];

  const insertEntity = db.prepare(`
    INSERT OR REPLACE INTO entities (id, name, type, created_at)
    VALUES (?, ?, ?, ?)
  `);

  entities.forEach(entity => {
    insertEntity.run(entity.id, entity.name, entity.type, entity.created_at);
  });

  // Create entity mentions
  const mentions = [
    { id: 'mention-proactive-1', entity_id: 'entity-react-hooks', message_id: 'msg-proactive-1', conversation_id: 'conv-proactive-test-1', mention_text: 'React hooks', confidence: 0.9 },
    { id: 'mention-proactive-2', entity_id: 'entity-typescript', message_id: 'msg-proactive-1', conversation_id: 'conv-proactive-test-1', mention_text: 'TypeScript', confidence: 0.9 },
    { id: 'mention-proactive-3', entity_id: 'entity-typescript', message_id: 'msg-proactive-2', conversation_id: 'conv-proactive-test-1', mention_text: 'TypeScript', confidence: 0.9 },
    { id: 'mention-project-1', entity_id: 'entity-project-alpha', message_id: 'msg-project-1', conversation_id: 'conv-project-test', mention_text: 'Project Alpha', confidence: 0.9 },
    { id: 'mention-urgent-1', entity_id: 'entity-production-system', message_id: 'msg-urgent-1', conversation_id: 'conv-urgent-test', mention_text: 'production system', confidence: 0.8 },
    { id: 'mention-conflict-1', entity_id: 'entity-database', message_id: 'msg-conflict-1', conversation_id: 'conv-conflict-test', mention_text: 'database schema', confidence: 0.8 },
    { id: 'mention-conflict-2', entity_id: 'entity-api-docs', message_id: 'msg-conflict-1', conversation_id: 'conv-conflict-test', mention_text: 'API documentation', confidence: 0.8 }
  ];

  const insertMention = db.prepare(`
    INSERT OR REPLACE INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, confidence)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  mentions.forEach(mention => {
    insertMention.run(mention.id, mention.entity_id, mention.message_id, mention.conversation_id, mention.mention_text, mention.confidence);
  });
}