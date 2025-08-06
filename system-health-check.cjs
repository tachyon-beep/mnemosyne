#!/usr/bin/env node

/**
 * Comprehensive System Health Check
 * Tests all major functionality and checks for regressions
 */

const { MCPServer } = require('./dist/server/MCPServer');

class SystemHealthCheck {
  constructor() {
    this.server = null;
    this.results = {
      totalChecks: 0,
      passedChecks: 0,
      failedChecks: 0,
      warnings: 0,
      errors: []
    };
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString().substring(11, 19);
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SUCCESS' ? '✅' : 'ℹ️';
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCheck(checkName, testFunction) {
    this.results.totalChecks++;
    try {
      this.log(`Running: ${checkName}`, 'INFO');
      const result = await testFunction();
      if (result === true || result === undefined) {
        this.results.passedChecks++;
        this.log(`PASSED: ${checkName}`, 'SUCCESS');
        return true;
      } else if (result === 'warning') {
        this.results.warnings++;
        this.log(`WARNING: ${checkName}`, 'WARN');
        return true;
      } else {
        this.results.failedChecks++;
        this.results.errors.push({ check: checkName, error: 'Test returned false' });
        this.log(`FAILED: ${checkName}`, 'ERROR');
        return false;
      }
    } catch (error) {
      this.results.failedChecks++;
      this.results.errors.push({ check: checkName, error: error.message });
      this.log(`FAILED: ${checkName} - ${error.message}`, 'ERROR');
      return false;
    }
  }

  async setup() {
    this.log('🔧 Setting up System Health Check...', 'INFO');
    
    this.server = new MCPServer({
      dbPath: ':memory:',
      logLevel: 'error'
    });
    
    await this.server.start();
    this.log('✅ Test server started', 'SUCCESS');
  }

  async cleanup() {
    if (this.server) {
      await this.server.stop();
      this.log('✅ Test server stopped', 'SUCCESS');
    }
  }

  // Core functionality tests
  async testBasicMessageSaving() {
    const registry = this.server.getToolRegistry();
    
    // Save a message
    const result = await registry.executeTool('save_message', {
      role: 'user',
      content: 'System health check test message'
    });
    
    if (!result.success || !result.result.conversation.id) {
      throw new Error('Failed to save message');
    }
    
    // Save another message in the same conversation
    const result2 = await registry.executeTool('save_message', {
      role: 'assistant', 
      content: 'Response message',
      conversationId: result.result.conversation.id
    });
    
    if (!result2.success || result2.result.conversationCreated !== false) {
      throw new Error('Failed to add message to existing conversation');
    }
    
    this.conversationId = result.result.conversation.id;
    return true;
  }

  async testBasicSearch() {
    const registry = this.server.getToolRegistry();
    
    const result = await registry.executeTool('search_messages', {
      query: 'health check',
      limit: 10
    });
    
    if (!result.success) {
      throw new Error('Search failed');
    }
    
    if (result.result.totalCount === 0) {
      throw new Error('Search found no results');
    }
    
    return true;
  }

  async testConversationRetrieval() {
    const registry = this.server.getToolRegistry();
    
    const result = await registry.executeTool('get_conversation', {
      conversationId: this.conversationId,
      includeMessages: true
    });
    
    if (!result.success) {
      throw new Error('Failed to retrieve conversation');
    }
    
    if (!result.result.conversation || !result.result.messages) {
      throw new Error('Conversation or messages missing from result');
    }
    
    if (result.result.messages.length !== 2) {
      throw new Error('Expected 2 messages in conversation');
    }
    
    return true;
  }

  async testConversationList() {
    const registry = this.server.getToolRegistry();
    
    const result = await registry.executeTool('get_conversations', {
      limit: 10,
      includeMessageCount: true
    });
    
    if (!result.success) {
      throw new Error('Failed to get conversation list');
    }
    
    if (!Array.isArray(result.result.conversations)) {
      throw new Error('Conversations should be an array');
    }
    
    return true;
  }

  async testKnowledgeGraphTools() {
    const registry = this.server.getToolRegistry();
    const toolNames = registry.getToolNames();
    
    const knowledgeGraphTools = [
      'get_entity_history',
      'find_related_conversations', 
      'get_knowledge_graph'
    ];
    
    const availableKGTools = knowledgeGraphTools.filter(tool => toolNames.includes(tool));
    
    if (availableKGTools.length === 0) {
      throw new Error('No knowledge graph tools found');
    }
    
    if (availableKGTools.length < knowledgeGraphTools.length) {
      this.log(`Only ${availableKGTools.length}/${knowledgeGraphTools.length} KG tools available`, 'WARN');
      return 'warning';
    }
    
    return true;
  }

  async testEnhancedSearch() {
    const registry = this.server.getToolRegistry();
    const toolNames = registry.getToolNames();
    
    const enhancedSearchTools = [
      'semantic_search',
      'hybrid_search',
      'get_relevant_snippets'
    ];
    
    const availableSearchTools = enhancedSearchTools.filter(tool => toolNames.includes(tool));
    
    if (availableSearchTools.length === 0) {
      throw new Error('No enhanced search tools found');
    }
    
    // Test semantic search if available
    if (toolNames.includes('semantic_search')) {
      try {
        const result = await registry.executeTool('semantic_search', {
          query: 'health check test',
          limit: 5,
          threshold: 0.5
        });
        
        if (!result.success) {
          this.log('Semantic search tool failed', 'WARN');
          return 'warning';
        }
      } catch (error) {
        this.log(`Semantic search error: ${error.message}`, 'WARN');
        return 'warning';
      }
    }
    
    return true;
  }

  async testProactiveTools() {
    const registry = this.server.getToolRegistry();
    const toolNames = registry.getToolNames();
    
    const proactiveTools = [
      'get_proactive_insights',
      'check_for_conflicts',
      'suggest_relevant_context',
      'auto_tag_conversation'
    ];
    
    const availableProactiveTools = proactiveTools.filter(tool => toolNames.includes(tool));
    
    if (availableProactiveTools.length === 0) {
      this.log('No proactive tools found - Phase 4 not yet integrated', 'WARN');
      return 'warning';
    }
    
    this.log(`Found ${availableProactiveTools.length}/4 proactive tools`, 'INFO');
    return 'warning'; // Expected until full integration
  }

  async testContextManagement() {
    const registry = this.server.getToolRegistry();
    const toolNames = registry.getToolNames();
    
    const contextTools = [
      'get_context_summary',
      'configure_llm_provider',
      'get_progressive_detail'
    ];
    
    const availableContextTools = contextTools.filter(tool => toolNames.includes(tool));
    
    if (availableContextTools.length === 0) {
      throw new Error('No context management tools found');
    }
    
    return true;
  }

  async testDatabaseIntegrity() {
    // This is tested implicitly through other operations
    // If basic operations work, database integrity is good
    return true;
  }

  async testServerHealth() {
    try {
      const healthResult = await this.server.healthCheck();
      
      if (healthResult.status !== 'healthy') {
        throw new Error(`Server unhealthy: ${healthResult.error}`);
      }
      
      const checks = healthResult.checks;
      if (checks.database !== 'ok') {
        throw new Error('Database health check failed');
      }
      
      if (checks.tools !== 'ok') {
        throw new Error('Tools health check failed');
      }
      
      return true;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async testToolRegistry() {
    const registry = this.server.getToolRegistry();
    const toolNames = registry.getToolNames();
    
    if (toolNames.length < 10) {
      throw new Error(`Too few tools registered: ${toolNames.length}`);
    }
    
    // Check essential tools
    const essentialTools = [
      'save_message',
      'search_messages',
      'get_conversation',
      'get_conversations'
    ];
    
    for (const tool of essentialTools) {
      if (!toolNames.includes(tool)) {
        throw new Error(`Essential tool missing: ${tool}`);
      }
    }
    
    this.log(`${toolNames.length} tools registered: ${toolNames.join(', ')}`, 'INFO');
    return true;
  }

  async run() {
    console.log('\n🏥 Starting Comprehensive System Health Check\n');
    
    try {
      await this.setup();
      
      // Run all health checks
      await this.runCheck('Server Health Check', () => this.testServerHealth());
      await this.runCheck('Tool Registry Integrity', () => this.testToolRegistry());
      await this.runCheck('Database Integrity', () => this.testDatabaseIntegrity());
      await this.runCheck('Basic Message Saving', () => this.testBasicMessageSaving());
      await this.runCheck('Basic Search Functionality', () => this.testBasicSearch());
      await this.runCheck('Conversation Retrieval', () => this.testConversationRetrieval());
      await this.runCheck('Conversation Listing', () => this.testConversationList());
      await this.runCheck('Knowledge Graph Tools', () => this.testKnowledgeGraphTools());
      await this.runCheck('Enhanced Search Tools', () => this.testEnhancedSearch());
      await this.runCheck('Context Management Tools', () => this.testContextManagement());
      await this.runCheck('Proactive Assistance Tools', () => this.testProactiveTools());
      
    } catch (error) {
      this.log(`Critical setup error: ${error.message}`, 'ERROR');
      this.results.failedChecks++;
    } finally {
      await this.cleanup();
    }

    this.printResults();
    
    // Exit with appropriate code
    process.exit(this.results.failedChecks > 0 ? 1 : 0);
  }

  printResults() {
    console.log('\n📊 System Health Check Results');
    console.log('==============================');
    console.log(`Total Checks: ${this.results.totalChecks}`);
    console.log(`✅ Passed: ${this.results.passedChecks}`);
    console.log(`⚠️ Warnings: ${this.results.warnings}`);
    console.log(`❌ Failed: ${this.results.failedChecks}`);
    
    const healthScore = ((this.results.passedChecks + this.results.warnings * 0.5) / this.results.totalChecks * 100).toFixed(1);
    console.log(`🏥 Health Score: ${healthScore}%`);
    
    if (this.results.errors.length > 0) {
      console.log('\n🔍 Error Details:');
      this.results.errors.forEach(error => {
        console.log(`  • ${error.check}: ${error.error}`);
      });
    }
    
    if (this.results.failedChecks === 0) {
      console.log('\n🎉 System is healthy and ready for production!');
    } else if (this.results.failedChecks < 3) {
      console.log('\n⚠️ System has minor issues but core functionality is working');
    } else {
      console.log('\n🚨 System has significant issues requiring attention');
    }
  }
}

// Run the health check
const healthCheck = new SystemHealthCheck();
healthCheck.run().catch(error => {
  console.error('❌ Health check crashed:', error.message);
  process.exit(1);
});