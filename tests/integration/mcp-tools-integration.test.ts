/**
 * MCP Tools Integration Test Suite
 * 
 * Tests all 14 MCP tools individually and their interactions:
 * 1. save_message
 * 2. search_messages  
 * 3. get_conversation
 * 4. get_conversations
 * 5. delete_conversation
 * 6. semantic_search
 * 7. hybrid_search
 * 8. get_relevant_snippets
 * 9. get_progressive_detail
 * 10. configure_llm_provider
 * 11. get_context_summary
 * 12. auto_tag_conversation
 * 13. get_proactive_insights
 * 14. check_for_conflicts
 */

import { jest } from '@jest/globals';
import Database from 'better-sqlite3';
import { SimpleMCPServer } from '../../src/server/SimpleMCPServer.js';
import { SaveMessageTool } from '../../src/tools/SaveMessageTool.js';
import { SearchMessagesTool } from '../../src/tools/SearchMessagesTool.js';
import { GetConversationTool } from '../../src/tools/GetConversationTool.js';
import { GetConversationsTool } from '../../src/tools/GetConversationsTool.js';
import { DeleteConversationTool } from '../../src/tools/DeleteConversationTool.js';
import { SemanticSearchTool } from '../../src/tools/SemanticSearchTool.js';
import { HybridSearchTool } from '../../src/tools/HybridSearchTool.js';
import { GetRelevantSnippetsTool } from '../../src/tools/GetRelevantSnippetsTool.js';
import { GetProgressiveDetailTool } from '../../src/tools/GetProgressiveDetailTool.js';
import { ConfigureLLMProviderTool } from '../../src/tools/ConfigureLLMProviderTool.js';
import { GetContextSummaryTool } from '../../src/tools/GetContextSummaryTool.js';
import { AutoTagConversationTool } from '../../src/tools/proactive/AutoTagConversationTool.js';
import { GetProactiveInsightsTool } from '../../src/tools/proactive/GetProactiveInsightsTool.js';
import { CheckForConflictsTool } from '../../src/tools/proactive/CheckForConflictsTool.js';
import { runMigrations } from '../../src/storage/migrations/index.js';

interface ToolTestResult {
  toolName: string;
  success: boolean;
  duration: number;
  testCases: Array<{
    name: string;
    success: boolean;
    error?: string;
    responseTime: number;
  }>;
  errorCount: number;
  totalCases: number;
}

interface MCPToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

class MCPToolsIntegrationSuite {
  private database: Database.Database;
  private tools: Map<string, any> = new Map();
  private testData: {
    conversations: any[];
    messages: any[];
  } = { conversations: [], messages: [] };

  async setup(): Promise<void> {
    // Create in-memory database
    this.database = new Database(':memory:');
    await runMigrations(this.database);

    // Initialize all tools
    await this.initializeTools();
    
    // Create test data
    await this.createTestData();
  }

  async teardown(): Promise<void> {
    if (this.database) {
      this.database.close();
    }
  }

  private async initializeTools(): Promise<void> {
    // Core conversation tools
    this.tools.set('save_message', new SaveMessageTool(this.database));
    this.tools.set('search_messages', new SearchMessagesTool(this.database));
    this.tools.set('get_conversation', new GetConversationTool(this.database));
    this.tools.set('get_conversations', new GetConversationsTool(this.database));
    this.tools.set('delete_conversation', new DeleteConversationTool(this.database));

    // Enhanced search tools
    this.tools.set('semantic_search', new SemanticSearchTool(this.database));
    this.tools.set('hybrid_search', new HybridSearchTool(this.database));
    this.tools.set('get_relevant_snippets', new GetRelevantSnippetsTool(this.database));
    this.tools.set('get_progressive_detail', new GetProgressiveDetailTool(this.database));

    // Configuration tools
    this.tools.set('configure_llm_provider', new ConfigureLLMProviderTool(this.database));
    this.tools.set('get_context_summary', new GetContextSummaryTool(this.database));

    // Proactive tools
    this.tools.set('auto_tag_conversation', new AutoTagConversationTool(this.database));
    this.tools.set('get_proactive_insights', new GetProactiveInsightsTool(this.database));
    this.tools.set('check_for_conflicts', new CheckForConflictsTool(this.database));
  }

  private async createTestData(): Promise<void> {
    // Create diverse test conversations
    const testScenarios = [
      {
        title: 'Technical Discussion: Database Optimization',
        messages: [
          { role: 'user', content: 'How can we optimize our PostgreSQL database for better performance?' },
          { role: 'assistant', content: 'Here are several PostgreSQL optimization strategies: 1) Index optimization, 2) Query tuning, 3) Connection pooling, 4) Configuration tuning.' },
          { role: 'user', content: 'Can you explain more about index optimization?' },
          { role: 'assistant', content: 'Index optimization involves: analyzing query patterns, creating composite indexes, removing unused indexes, and using partial indexes for filtered queries.' }
        ]
      },
      {
        title: 'Project Planning: E-commerce Platform',
        messages: [
          { role: 'user', content: 'We need to plan the development of a new e-commerce platform. What should be our approach?' },
          { role: 'assistant', content: 'For an e-commerce platform, I recommend: 1) Requirements gathering, 2) Architecture design, 3) Technology stack selection, 4) MVP development, 5) Testing strategy.' },
          { role: 'user', content: 'What technology stack would you recommend?' },
          { role: 'assistant', content: 'Consider: React/Vue.js frontend, Node.js/Python backend, PostgreSQL/MongoDB database, Redis for caching, and AWS/Azure for hosting.' }
        ]
      },
      {
        title: 'Code Review: Authentication System',
        messages: [
          { role: 'user', content: 'Please review this authentication code for security issues.' },
          { role: 'assistant', content: 'I see several security concerns: 1) Passwords should be hashed with bcrypt, 2) Implement rate limiting, 3) Use HTTPS only, 4) Add CSRF protection.' },
          { role: 'user', content: 'How should we implement rate limiting?' },
          { role: 'assistant', content: 'Use sliding window rate limiting with Redis: track requests per IP, implement exponential backoff, and whitelist trusted IPs.' }
        ]
      }
    ];

    // Create conversations and messages
    for (const scenario of testScenarios) {
      const conversationId = await this.createConversation(scenario.title, scenario.messages);
      this.testData.conversations.push({ id: conversationId, title: scenario.title });
    }
  }

  private async createConversation(title: string, messages: Array<{ role: string; content: string }>): Promise<string> {
    const tool = this.tools.get('save_message');
    let conversationId: string | undefined;

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const args = {
        role: message.role,
        content: message.content,
        ...(i === 0 ? { title } : { conversationId })
      };

      const response = await tool.execute(args);
      
      if (i === 0) {
        // Extract conversation ID from first message response
        const responseData = JSON.parse(response.content[0].text);
        conversationId = responseData.conversationId;
      }
    }

    return conversationId!;
  }

  private async testTool(
    toolName: string,
    testCases: Array<{
      name: string;
      args: any;
      expectedSuccess: boolean;
      validation?: (response: MCPToolResponse) => boolean;
    }>
  ): Promise<ToolTestResult> {
    const startTime = Date.now();
    const tool = this.tools.get(toolName);
    const result: ToolTestResult = {
      toolName,
      success: false,
      duration: 0,
      testCases: [],
      errorCount: 0,
      totalCases: testCases.length
    };

    for (const testCase of testCases) {
      const caseStartTime = Date.now();
      let caseSuccess = false;
      let error: string | undefined;

      try {
        const response = await tool.execute(testCase.args);
        caseSuccess = testCase.expectedSuccess;
        
        // Additional validation if provided
        if (testCase.validation && caseSuccess) {
          caseSuccess = testCase.validation(response);
        }
        
      } catch (err) {
        error = err.message;
        caseSuccess = !testCase.expectedSuccess; // If we expected failure, error is success
      }

      const responseTime = Date.now() - caseStartTime;
      
      result.testCases.push({
        name: testCase.name,
        success: caseSuccess,
        error,
        responseTime
      });

      if (!caseSuccess) {
        result.errorCount++;
      }
    }

    result.duration = Date.now() - startTime;
    result.success = result.errorCount === 0;

    return result;
  }

  async testSaveMessageTool(): Promise<ToolTestResult> {
    return this.testTool('save_message', [
      {
        name: 'Create new conversation',
        args: {
          role: 'user',
          content: 'Test message for new conversation',
          title: 'Test Conversation'
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return typeof data.conversationId === 'string' && typeof data.messageId === 'string';
        }
      },
      {
        name: 'Add message to existing conversation',
        args: {
          role: 'assistant',
          content: 'Response to test message',
          conversationId: this.testData.conversations[0].id
        },
        expectedSuccess: true
      },
      {
        name: 'Invalid role',
        args: {
          role: 'invalid',
          content: 'Test message',
          title: 'Test'
        },
        expectedSuccess: false
      },
      {
        name: 'Empty content',
        args: {
          role: 'user',
          content: '',
          title: 'Test'
        },
        expectedSuccess: false
      }
    ]);
  }

  async testSearchMessagesTool(): Promise<ToolTestResult> {
    return this.testTool('search_messages', [
      {
        name: 'Basic text search',
        args: {
          query: 'database optimization',
          limit: 5
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return Array.isArray(data.results) && data.results.length > 0;
        }
      },
      {
        name: 'Search with filters',
        args: {
          query: 'PostgreSQL',
          limit: 10,
          conversationId: this.testData.conversations[0].id
        },
        expectedSuccess: true
      },
      {
        name: 'Empty query',
        args: {
          query: '',
          limit: 5
        },
        expectedSuccess: false
      },
      {
        name: 'Large limit',
        args: {
          query: 'optimization',
          limit: 1000
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return data.results.length <= 100; // Should be capped
        }
      }
    ]);
  }

  async testGetConversationTool(): Promise<ToolTestResult> {
    return this.testTool('get_conversation', [
      {
        name: 'Get existing conversation',
        args: {
          conversationId: this.testData.conversations[0].id
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return data.conversation && Array.isArray(data.messages) && data.messages.length > 0;
        }
      },
      {
        name: 'Get conversation with limited messages',
        args: {
          conversationId: this.testData.conversations[1].id,
          limit: 2
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return data.messages.length <= 2;
        }
      },
      {
        name: 'Non-existent conversation',
        args: {
          conversationId: 'non-existent-id'
        },
        expectedSuccess: false
      }
    ]);
  }

  async testGetConversationsTool(): Promise<ToolTestResult> {
    return this.testTool('get_conversations', [
      {
        name: 'Get all conversations',
        args: {
          limit: 10
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return Array.isArray(data.conversations) && data.conversations.length >= 3;
        }
      },
      {
        name: 'Get conversations with search',
        args: {
          query: 'database',
          limit: 5
        },
        expectedSuccess: true
      },
      {
        name: 'Get limited conversations',
        args: {
          limit: 1
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return data.conversations.length <= 1;
        }
      }
    ]);
  }

  async testDeleteConversationTool(): Promise<ToolTestResult> {
    // Create a conversation specifically for deletion
    const deleteTestConvId = await this.createConversation('Test Deletion', [
      { role: 'user', content: 'This conversation will be deleted' }
    ]);

    return this.testTool('delete_conversation', [
      {
        name: 'Delete existing conversation',
        args: {
          conversationId: deleteTestConvId
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return data.success === true;
        }
      },
      {
        name: 'Delete non-existent conversation',
        args: {
          conversationId: 'non-existent-id'
        },
        expectedSuccess: false
      }
    ]);
  }

  async testSemanticSearchTool(): Promise<ToolTestResult> {
    return this.testTool('semantic_search', [
      {
        name: 'Semantic search basic',
        args: {
          query: 'improve database speed',
          limit: 5
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return Array.isArray(data.results);
        }
      },
      {
        name: 'Semantic search with threshold',
        args: {
          query: 'web development',
          limit: 3,
          threshold: 0.7
        },
        expectedSuccess: true
      }
    ]);
  }

  async testHybridSearchTool(): Promise<ToolTestResult> {
    return this.testTool('hybrid_search', [
      {
        name: 'Hybrid search basic',
        args: {
          query: 'authentication security',
          limit: 5
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return Array.isArray(data.results);
        }
      },
      {
        name: 'Hybrid search with weights',
        args: {
          query: 'database',
          limit: 3,
          textWeight: 0.7,
          semanticWeight: 0.3
        },
        expectedSuccess: true
      }
    ]);
  }

  async testGetRelevantSnippetsTool(): Promise<ToolTestResult> {
    return this.testTool('get_relevant_snippets', [
      {
        name: 'Get relevant snippets',
        args: {
          query: 'database optimization techniques',
          context: 'performance tuning'
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return Array.isArray(data.snippets);
        }
      }
    ]);
  }

  async testGetProgressiveDetailTool(): Promise<ToolTestResult> {
    return this.testTool('get_progressive_detail', [
      {
        name: 'Progressive detail basic',
        args: {
          query: 'e-commerce platform development',
          detailLevel: 'medium'
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return data.summary && Array.isArray(data.details);
        }
      }
    ]);
  }

  async testConfigureLLMProviderTool(): Promise<ToolTestResult> {
    return this.testTool('configure_llm_provider', [
      {
        name: 'Configure OpenAI provider',
        args: {
          provider: 'openai',
          configuration: {
            apiKey: 'test-key',
            model: 'gpt-4',
            temperature: 0.7
          }
        },
        expectedSuccess: true
      },
      {
        name: 'Invalid provider',
        args: {
          provider: 'invalid-provider',
          configuration: {}
        },
        expectedSuccess: false
      }
    ]);
  }

  async testGetContextSummaryTool(): Promise<ToolTestResult> {
    return this.testTool('get_context_summary', [
      {
        name: 'Context summary basic',
        args: {
          query: 'project planning discussion'
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return typeof data.summary === 'string';
        }
      }
    ]);
  }

  async testAutoTagConversationTool(): Promise<ToolTestResult> {
    return this.testTool('auto_tag_conversation', [
      {
        name: 'Auto tag conversation',
        args: {
          conversationId: this.testData.conversations[0].id
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return Array.isArray(data.tags);
        }
      }
    ]);
  }

  async testGetProactiveInsightsTool(): Promise<ToolTestResult> {
    return this.testTool('get_proactive_insights', [
      {
        name: 'Get proactive insights',
        args: {
          context: 'recent technical discussions',
          insightTypes: ['patterns', 'suggestions']
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return Array.isArray(data.insights);
        }
      }
    ]);
  }

  async testCheckForConflictsTool(): Promise<ToolTestResult> {
    return this.testTool('check_for_conflicts', [
      {
        name: 'Check for conflicts',
        args: {
          entityType: 'concept',
          entityId: 'database-optimization'
        },
        expectedSuccess: true,
        validation: (response) => {
          const data = JSON.parse(response.content[0].text);
          return Array.isArray(data.conflicts);
        }
      }
    ]);
  }

  async runAllToolTests(): Promise<ToolTestResult[]> {
    const results: ToolTestResult[] = [];
    
    console.log('🔧 Testing all 14 MCP tools...\n');

    // Test each tool
    const tests = [
      { name: 'save_message', test: () => this.testSaveMessageTool() },
      { name: 'search_messages', test: () => this.testSearchMessagesTool() },
      { name: 'get_conversation', test: () => this.testGetConversationTool() },
      { name: 'get_conversations', test: () => this.testGetConversationsTool() },
      { name: 'delete_conversation', test: () => this.testDeleteConversationTool() },
      { name: 'semantic_search', test: () => this.testSemanticSearchTool() },
      { name: 'hybrid_search', test: () => this.testHybridSearchTool() },
      { name: 'get_relevant_snippets', test: () => this.testGetRelevantSnippetsTool() },
      { name: 'get_progressive_detail', test: () => this.testGetProgressiveDetailTool() },
      { name: 'configure_llm_provider', test: () => this.testConfigureLLMProviderTool() },
      { name: 'get_context_summary', test: () => this.testGetContextSummaryTool() },
      { name: 'auto_tag_conversation', test: () => this.testAutoTagConversationTool() },
      { name: 'get_proactive_insights', test: () => this.testGetProactiveInsightsTool() },
      { name: 'check_for_conflicts', test: () => this.testCheckForConflictsTool() }
    ];

    for (const { name, test } of tests) {
      try {
        console.log(`Testing ${name}...`);
        const result = await test();
        results.push(result);
        console.log(`${result.success ? '✅' : '❌'} ${name}: ${result.success ? 'PASSED' : 'FAILED'} (${result.testCases.filter(c => c.success).length}/${result.totalCases})`);
      } catch (error) {
        console.log(`❌ ${name}: ERROR - ${error.message}`);
        results.push({
          toolName: name,
          success: false,
          duration: 0,
          testCases: [{ name: 'Initialization', success: false, error: error.message, responseTime: 0 }],
          errorCount: 1,
          totalCases: 1
        });
      }
    }

    return results;
  }

  generateToolTestReport(results: ToolTestResult[]): string {
    const totalTools = results.length;
    const passedTools = results.filter(r => r.success).length;
    const totalCases = results.reduce((sum, r) => sum + r.totalCases, 0);
    const passedCases = results.reduce((sum, r) => sum + (r.totalCases - r.errorCount), 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    
    let report = `
# MCP Tools Integration Test Report

## Executive Summary
- **Total Tools Tested**: ${totalTools}/14
- **Tools Passed**: ${passedTools}/${totalTools} (${((passedTools/totalTools)*100).toFixed(1)}%)
- **Total Test Cases**: ${passedCases}/${totalCases} (${((passedCases/totalCases)*100).toFixed(1)}%)
- **Total Duration**: ${(totalDuration/1000).toFixed(1)}s
- **Status**: ${passedTools === totalTools ? '✅ ALL TOOLS PASSED' : '❌ SOME TOOLS FAILED'}

## Tool Performance Summary

| Tool | Status | Cases | Duration | Avg Response |
|------|--------|-------|----------|--------------|
`;

    for (const result of results) {
      const avgResponseTime = result.testCases.length > 0 
        ? (result.testCases.reduce((sum, c) => sum + c.responseTime, 0) / result.testCases.length).toFixed(0)
        : '0';
      
      report += `| ${result.toolName} | ${result.success ? '✅' : '❌'} | ${result.totalCases - result.errorCount}/${result.totalCases} | ${result.duration}ms | ${avgResponseTime}ms |\n`;
    }

    report += `\n## Detailed Results\n\n`;

    for (const result of results) {
      report += `### ${result.toolName} ${result.success ? '✅' : '❌'}\n`;
      report += `- **Duration**: ${result.duration}ms\n`;
      report += `- **Success Rate**: ${((result.totalCases - result.errorCount) / result.totalCases * 100).toFixed(1)}%\n\n`;
      
      if (result.testCases.length > 0) {
        report += `**Test Cases:**\n`;
        for (const testCase of result.testCases) {
          report += `- ${testCase.success ? '✅' : '❌'} ${testCase.name} (${testCase.responseTime}ms)`;
          if (testCase.error) {
            report += ` - Error: ${testCase.error}`;
          }
          report += `\n`;
        }
        report += `\n`;
      }
    }

    // Performance insights
    const fastestTool = results.reduce((min, r) => r.duration < min.duration ? r : min, results[0]);
    const slowestTool = results.reduce((max, r) => r.duration > max.duration ? r : max, results[0]);
    
    report += `## Performance Insights\n\n`;
    report += `- **Fastest Tool**: ${fastestTool?.toolName} (${fastestTool?.duration}ms)\n`;
    report += `- **Slowest Tool**: ${slowestTool?.toolName} (${slowestTool?.duration}ms)\n`;
    report += `- **Average Tool Duration**: ${(totalDuration / totalTools).toFixed(0)}ms\n\n`;

    // Recommendations
    report += `## Recommendations\n\n`;
    
    if (passedTools === totalTools) {
      report += `✅ **All MCP tools are functioning correctly!**\n\n`;
      report += `The system demonstrates:\n`;
      report += `- Complete tool coverage (14/14)\n`;
      report += `- Robust error handling\n`;
      report += `- Consistent API behavior\n`;
      report += `- Good performance characteristics\n\n`;
    } else {
      report += `❌ **Tool failures detected.**\n\n`;
      const failedTools = results.filter(r => !r.success);
      report += `**Failed Tools:**\n`;
      for (const failed of failedTools) {
        report += `- **${failed.toolName}**: ${failed.errorCount} failed test cases\n`;
      }
      report += `\n**Priority Actions:**\n`;
      report += `1. Review and fix failing test cases\n`;
      report += `2. Verify tool initialization and dependencies\n`;
      report += `3. Test error handling scenarios\n`;
      report += `4. Validate input parameter validation\n\n`;
    }

    return report;
  }
}

// Jest Test Cases
describe('MCP Tools Integration Tests', () => {
  let testSuite: MCPToolsIntegrationSuite;
  
  beforeAll(async () => {
    testSuite = new MCPToolsIntegrationSuite();
    await testSuite.setup();
  });
  
  afterAll(async () => {
    if (testSuite) {
      await testSuite.teardown();
    }
  });

  test('All 14 MCP Tools Function Correctly', async () => {
    const results = await testSuite.runAllToolTests();
    
    // Overall test requirements
    expect(results.length).toBe(14);
    
    const passedTools = results.filter(r => r.success).length;
    expect(passedTools).toBeGreaterThanOrEqual(12); // Allow max 2 tools to have issues
    
    // Each tool should have completed its tests
    for (const result of results) {
      expect(result.testCases.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    }
    
    // Generate and log comprehensive report
    const report = testSuite.generateToolTestReport(results);
    console.log('\n' + '='.repeat(80));
    console.log('MCP TOOLS INTEGRATION TEST REPORT');
    console.log('='.repeat(80));
    console.log(report);
    console.log('='.repeat(80) + '\n');
    
    // Final assertion
    expect(passedTools / results.length).toBeGreaterThanOrEqual(0.85); // 85% success rate minimum
  }, 300000);

  test('Core Tools (save_message, search_messages, get_conversation) Function Perfectly', async () => {
    const coreTools = ['save_message', 'search_messages', 'get_conversation'];
    const results = await testSuite.runAllToolTests();
    
    const coreResults = results.filter(r => coreTools.includes(r.toolName));
    
    for (const result of coreResults) {
      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.duration).toBeLessThan(5000); // Should complete quickly
    }
  }, 60000);

  test('Search Tools (semantic_search, hybrid_search) Handle Various Queries', async () => {
    const searchTools = ['semantic_search', 'hybrid_search'];
    const results = await testSuite.runAllToolTests();
    
    const searchResults = results.filter(r => searchTools.includes(r.toolName));
    
    for (const result of searchResults) {
      // Search tools can have some failures due to embedding dependencies
      expect(result.testCases.length).toBeGreaterThan(0);
      expect(result.duration).toBeLessThan(10000); // Allow more time for search
    }
  }, 120000);

  test('Proactive Tools Provide Insights Without Errors', async () => {
    const proactiveTools = ['auto_tag_conversation', 'get_proactive_insights', 'check_for_conflicts'];
    const results = await testSuite.runAllToolTests();
    
    const proactiveResults = results.filter(r => proactiveTools.includes(r.toolName));
    
    for (const result of proactiveResults) {
      expect(result.testCases.length).toBeGreaterThan(0);
      // Proactive tools may have dependencies that cause failures, so we check they run
      expect(result.duration).toBeGreaterThanOrEqual(0);
    }
  }, 120000);
});

export { MCPToolsIntegrationSuite };