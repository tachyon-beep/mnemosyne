#!/usr/bin/env node

/**
 * Phase 4 Integration Test - Proactive Assistance Features
 * Tests all Phase 4 components working together end-to-end
 */

const { MCPServer } = require('./dist/server/MCPServer');
const { MCPToolError } = require('./dist/utils/errors');
const { promises: fs } = require('fs');
const path = require('path');

class Phase4IntegrationTest {
  constructor() {
    this.server = null;
    this.dbPath = ':memory:'; // Use in-memory database for testing
    this.testResults = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      errors: []
    };
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const prefix = level === 'ERROR' ? '❌' : level === 'SUCCESS' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runTest(testName, testFunction) {
    this.testResults.totalTests++;
    try {
      this.log(`Running test: ${testName}`, 'INFO');
      await testFunction();
      this.testResults.passedTests++;
      this.log(`✅ PASSED: ${testName}`, 'SUCCESS');
    } catch (error) {
      this.testResults.failedTests++;
      this.testResults.errors.push({ test: testName, error: error.message });
      this.log(`❌ FAILED: ${testName} - ${error.message}`, 'ERROR');
    }
  }

  async setup() {
    this.log('Setting up Phase 4 Integration Test Environment...', 'INFO');
    
    // Initialize MCP Server with in-memory database
    this.server = new MCPServer({ 
      dbPath: this.dbPath,
      logLevel: 'error' // Minimize noise during testing
    });
    
    await this.server.start();
    this.log('✅ MCP Server initialized', 'SUCCESS');
    
    // Create test data
    await this.setupTestData();
    this.log('✅ Test data created', 'SUCCESS');
  }

  async setupTestData() {
    // Create conversations with rich content for proactive testing
    const conversations = [
      {
        messages: [
          { role: 'user', content: 'We need to decide on the React vs Vue framework for our new project. Let me check the performance benchmarks.' },
          { role: 'assistant', content: 'I\'ll help you compare React and Vue. What specific aspects are most important for your project?' },
          { role: 'user', content: 'Performance and team familiarity are key. I need to follow up with Sarah about team experience by Friday.' },
          { role: 'assistant', content: 'React has excellent performance with its virtual DOM, and Vue is known for its gentle learning curve.' }
        ]
      },
      {
        messages: [
          { role: 'user', content: 'Urgent: The deployment pipeline is broken again. Can you help debug this immediately?' },
          { role: 'assistant', content: 'Let\'s investigate the deployment issue. What error messages are you seeing?' },
          { role: 'user', content: 'The Docker build is failing on the authentication step. This is blocking our release.' },
          { role: 'assistant', content: 'I\'ll look into Docker authentication issues. This might be related to the recent credential rotation.' }
        ]
      },
      {
        messages: [
          { role: 'user', content: 'Planning our Q4 roadmap. We should include the AI integration project and database migration.' },
          { role: 'assistant', content: 'Good strategic thinking. What\'s the timeline for the AI integration?' },
          { role: 'user', content: 'The AI project should start in November. Let me schedule a meeting with the ML team next week.' },
          { role: 'assistant', content: 'That sounds like a solid plan. Database migration will need careful coordination with the AI project timeline.' }
        ]
      }
    ];

    this.conversationIds = [];
    
    for (let i = 0; i < conversations.length; i++) {
      const conversation = conversations[i];
      let conversationId = null;
      
      for (const message of conversation.messages) {
        const result = await this.executeTool('save_message', {
          role: message.role,
          content: message.content,
          conversationId: conversationId
        });
        
        if (!conversationId) {
          conversationId = result.result.conversation.id;
        }
      }
      
      this.conversationIds.push(conversationId);
    }
  }

  async executeTool(toolName, args) {
    try {
      const registry = this.server.getToolRegistry();
      if (!registry) {
        throw new Error('Tool registry not available');
      }
      const result = await registry.executeTool(toolName, args);
      return result;
    } catch (error) {
      this.log(`Tool execution error for ${toolName}: ${error.message}`, 'ERROR');
      throw error;
    }
  }

  async testProactiveInsights() {
    const conversationId = this.conversationIds[0];
    
    const result = await this.executeTool('get_proactive_insights', {
      conversationId: conversationId,
      includeCommitments: true,
      includeKnowledgeGaps: true
    });

    if (!result.success) {
      throw new Error(`Tool failed: ${result.error}`);
    }

    const insights = result.result;
    
    // Verify insights structure
    if (!insights.unresolvedActions || !Array.isArray(insights.unresolvedActions)) {
      throw new Error('Missing unresolved actions in insights');
    }
    
    if (!insights.commitments || !Array.isArray(insights.commitments)) {
      throw new Error('Missing commitments in insights');
    }
    
    this.log(`Found ${insights.unresolvedActions.length} unresolved actions and ${insights.commitments.length} commitments`, 'INFO');
    
    // Verify we found the commitment about checking with Sarah
    const hasFollowUpCommitment = insights.commitments.some(c => 
      c.commitmentText && c.commitmentText.toLowerCase().includes('follow up') && 
      c.commitmentText.toLowerCase().includes('sarah')
    );
    
    if (!hasFollowUpCommitment) {
      throw new Error('Expected to find Sarah follow-up commitment');
    }
  }

  async testConflictDetection() {
    const conversationId = this.conversationIds[1]; // Deployment conversation
    
    const result = await this.executeTool('check_for_conflicts', {
      conversationId: conversationId,
      entityNames: ['Docker', 'deployment', 'authentication']
    });

    if (!result.success) {
      throw new Error(`Tool failed: ${result.error}`);
    }

    const conflicts = result.result;
    
    // Verify conflicts structure
    if (!conflicts.conflicts || !Array.isArray(conflicts.conflicts)) {
      throw new Error('Missing conflicts array in result');
    }
    
    this.log(`Found ${conflicts.conflicts.length} potential conflicts`, 'INFO');
  }

  async testContextSuggestions() {
    const conversationId = this.conversationIds[2]; // Planning conversation
    
    const result = await this.executeTool('suggest_relevant_context', {
      currentConversation: conversationId,
      maxSuggestions: 5
    });

    if (!result.success) {
      throw new Error(`Tool failed: ${result.error}`);
    }

    const context = result.result;
    
    // Verify context structure
    if (!context.suggestions || !Array.isArray(context.suggestions)) {
      throw new Error('Missing suggestions array in result');
    }
    
    this.log(`Found ${context.suggestions.length} context suggestions`, 'INFO');
  }

  async testAutoTagging() {
    const conversationId = this.conversationIds[1]; // Urgent deployment conversation
    
    const result = await this.executeTool('auto_tag_conversation', {
      conversationId: conversationId,
      storeTags: false // Don't persist during testing
    });

    if (!result.success) {
      throw new Error(`Tool failed: ${result.error}`);
    }

    const tagging = result.result;
    
    // Verify tagging structure
    if (!tagging.topicTags || !Array.isArray(tagging.topicTags)) {
      throw new Error('Missing topicTags array in result');
    }
    
    if (!tagging.activity || !tagging.activity.type) {
      throw new Error('Missing activity classification');
    }
    
    if (!tagging.urgency || !tagging.urgency.level) {
      throw new Error('Missing urgency analysis');
    }
    
    this.log(`Generated ${tagging.topicTags.length} topic tags`, 'INFO');
    this.log(`Activity: ${tagging.activity.type} (confidence: ${tagging.activity.confidence})`, 'INFO');
    this.log(`Urgency: ${tagging.urgency.level} (score: ${tagging.urgency.score})`, 'INFO');
    
    // Verify urgency detection for the "urgent" conversation
    if (tagging.urgency.level === 'none') {
      throw new Error('Expected to detect urgency in urgent conversation');
    }
  }

  async testToolPerformance() {
    const startTime = Date.now();
    
    // Run all tools sequentially to test performance
    for (const conversationId of this.conversationIds) {
      await this.executeTool('get_proactive_insights', { conversationId });
      await this.executeTool('check_for_conflicts', { conversationId });
      await this.executeTool('suggest_relevant_context', { currentConversation: conversationId });
      await this.executeTool('auto_tag_conversation', { conversationId, storeTags: false });
    }
    
    const totalTime = Date.now() - startTime;
    this.log(`All tools completed in ${totalTime}ms`, 'INFO');
    
    // Performance threshold: 10 seconds for all operations
    if (totalTime > 10000) {
      throw new Error(`Performance test failed: ${totalTime}ms exceeds 10 second threshold`);
    }
  }

  async testErrorHandling() {
    // Test with non-existent conversation
    const result = await this.executeTool('get_proactive_insights', {
      conversationId: 'non-existent-conversation'
    });

    // Should handle gracefully without throwing
    if (!result.success && !result.error) {
      throw new Error('Expected error response for non-existent conversation');
    }
    
    this.log('Error handling test passed - non-existent conversation handled gracefully', 'INFO');
  }

  async cleanup() {
    if (this.server) {
      await this.server.stop();
      this.log('✅ MCP Server shut down', 'SUCCESS');
    }
  }

  async run() {
    console.log('\n🚀 Starting Phase 4 Proactive Assistance Integration Test\n');
    
    try {
      await this.setup();
      
      // Run all test cases
      await this.runTest('Proactive Insights Detection', () => this.testProactiveInsights());
      await this.runTest('Conflict Detection', () => this.testConflictDetection());
      await this.runTest('Context Suggestions', () => this.testContextSuggestions());
      await this.runTest('Auto-Tagging', () => this.testAutoTagging());
      await this.runTest('Performance Testing', () => this.testToolPerformance());
      await this.runTest('Error Handling', () => this.testErrorHandling());
      
    } catch (error) {
      this.log(`Setup or execution error: ${error.message}`, 'ERROR');
      this.testResults.failedTests++;
    } finally {
      await this.cleanup();
    }

    // Print final results
    this.printResults();
    
    // Exit with appropriate code
    process.exit(this.testResults.failedTests > 0 ? 1 : 0);
  }

  printResults() {
    console.log('\n📊 Phase 4 Integration Test Results');
    console.log('=====================================');
    console.log(`Total Tests: ${this.testResults.totalTests}`);
    console.log(`✅ Passed: ${this.testResults.passedTests}`);
    console.log(`❌ Failed: ${this.testResults.failedTests}`);
    console.log(`📈 Success Rate: ${((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n🔍 Failure Details:');
      this.testResults.errors.forEach(error => {
        console.log(`  • ${error.test}: ${error.error}`);
      });
    }
    
    if (this.testResults.failedTests === 0) {
      console.log('\n🎉 All Phase 4 integration tests passed!');
    } else {
      console.log(`\n⚠️  ${this.testResults.failedTests} test(s) failed`);
    }
  }
}

// Run the integration test
const test = new Phase4IntegrationTest();
test.run().catch(error => {
  console.error('❌ Integration test crashed:', error.message);
  process.exit(1);
});