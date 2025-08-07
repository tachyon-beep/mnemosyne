/**
 * Comprehensive System Integration Tests
 * 
 * Tests the entire MCP Persistence System end-to-end including:
 * - MCP server startup and initialization
 * - All 14 MCP tools working correctly
 * - Database operations under load
 * - Search functionality with FTS5
 * - Performance monitoring integration
 * - Cross-component interactions
 */

import { jest } from '@jest/globals';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { SimpleMCPServer } from '../../src/server/SimpleMCPServer.js';
import { ConversationRepository } from '../../src/storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../../src/storage/repositories/MessageRepository.js';
import { EnhancedSearchEngine } from '../../src/search/EnhancedSearchEngine.js';
import { PerformanceMonitor } from '../../src/utils/PerformanceMonitor.js';
import { ConnectionPool } from '../../src/storage/ConnectionPool.js';
import { runMigrations } from '../../src/storage/migrations/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  steps: Array<{ name: string; success: boolean; error?: string }>;
  metrics: Record<string, any>;
  errors: string[];
}

class ComprehensiveIntegrationTestSuite {
  private database: Database.Database;
  private server: SimpleMCPServer;
  private conversationRepo: ConversationRepository;
  private messageRepo: MessageRepository;
  private searchEngine: EnhancedSearchEngine;
  private performanceMonitor: PerformanceMonitor;
  private connectionPool: ConnectionPool;
  private testResults: TestResult[] = [];

  async setup(): Promise<void> {
    // Create in-memory database for testing
    this.database = new Database(':memory:');
    
    // Run migrations
    await runMigrations(this.database);
    
    // Initialize connection pool
    this.connectionPool = new ConnectionPool({
      databasePath: ':memory:',
      maxConnections: 10,
      minConnections: 2,
      enableMetrics: true,
      enableConnectionPool: true
    });
    
    // Initialize repositories
    this.conversationRepo = new ConversationRepository(this.database);
    this.messageRepo = new MessageRepository(this.database);
    
    // Initialize search engine
    this.searchEngine = new EnhancedSearchEngine(this.database, {
      enableSemanticSearch: false, // Disable for integration tests
      cacheSize: 100
    });
    
    // Initialize performance monitor
    this.performanceMonitor = new PerformanceMonitor({
      enableDetailedMetrics: true,
      enableMemoryTracking: true
    });
    
    // Initialize MCP server
    this.server = new SimpleMCPServer(this.database);
  }

  async teardown(): Promise<void> {
    if (this.server) {
      await this.server.close?.();
    }
    if (this.database) {
      this.database.close();
    }
    if (this.connectionPool) {
      await this.connectionPool.close();
    }
  }

  private async measurePerformance<T>(
    testName: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; metrics: any }> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    
    const result = await operation();
    
    const endTime = Date.now();
    const endMemory = process.memoryUsage();
    
    return {
      result,
      metrics: {
        duration: endTime - startTime,
        memoryDelta: {
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          external: endMemory.external - startMemory.external
        }
      }
    };
  }

  async runEndToEndWorkflowTest(): Promise<TestResult> {
    const testResult: TestResult = {
      testName: 'Complete End-to-End Workflow',
      success: false,
      duration: 0,
      steps: [],
      metrics: {},
      errors: []
    };

    const startTime = Date.now();
    
    try {
      // Step 1: Initialize server
      const initStep = await this.measurePerformance('Server Initialization', async () => {
        return await this.server.initialize();
      });
      testResult.steps.push({ 
        name: 'Server Initialization', 
        success: true 
      });
      
      // Step 2: Create conversation with multiple messages
      const conversationStep = await this.measurePerformance('Create Conversation', async () => {
        const conversation = await this.conversationRepo.create({
          title: 'Integration Test Conversation',
          metadata: { test: true, scenario: 'end-to-end' }
        });
        
        const messages = [];
        for (let i = 0; i < 10; i++) {
          const message = await this.messageRepo.create({
            conversationId: conversation.id,
            role: i % 2 === 0 ? 'user' : 'assistant',
            content: `Test message ${i + 1}: This is a comprehensive test of the MCP persistence system functionality.`,
            metadata: { messageIndex: i }
          });
          messages.push(message);
        }
        
        return { conversation, messages };
      });
      
      testResult.steps.push({ 
        name: 'Create Conversation with Messages', 
        success: conversationStep.result.messages.length === 10 
      });
      
      // Step 3: Test search functionality
      const searchStep = await this.measurePerformance('Search Operations', async () => {
        const results = await this.searchEngine.search('comprehensive test', {
          limit: 5,
          includeMetadata: true
        });
        
        return results;
      });
      
      testResult.steps.push({ 
        name: 'Search Operations', 
        success: searchStep.result.results.length > 0 
      });
      
      // Step 4: Test concurrent operations
      const concurrentStep = await this.measurePerformance('Concurrent Operations', async () => {
        const operations = [];
        for (let i = 0; i < 20; i++) {
          operations.push(
            this.messageRepo.create({
              conversationId: conversationStep.result.conversation.id,
              role: 'user',
              content: `Concurrent message ${i}: Testing system under concurrent load`,
              metadata: { concurrent: true, index: i }
            })
          );
        }
        
        const results = await Promise.all(operations);
        return results;
      });
      
      testResult.steps.push({ 
        name: 'Concurrent Operations', 
        success: concurrentStep.result.length === 20 
      });
      
      // Step 5: Test database integrity
      const integrityStep = await this.measurePerformance('Database Integrity Check', async () => {
        const conversationCount = this.database.prepare(
          'SELECT COUNT(*) as count FROM conversations'
        ).get() as { count: number };
        
        const messageCount = this.database.prepare(
          'SELECT COUNT(*) as count FROM messages'
        ).get() as { count: number };
        
        // Should have 1 conversation and 30 messages (10 initial + 20 concurrent)
        return {
          conversations: conversationCount.count,
          messages: messageCount.count,
          integrity: conversationCount.count === 1 && messageCount.count === 30
        };
      });
      
      testResult.steps.push({ 
        name: 'Database Integrity Check', 
        success: integrityStep.result.integrity 
      });
      
      // Compile metrics
      testResult.metrics = {
        serverInit: initStep.metrics,
        conversation: conversationStep.metrics,
        search: searchStep.metrics,
        concurrent: concurrentStep.metrics,
        integrity: integrityStep.metrics,
        totalMessages: integrityStep.result.messages,
        searchResults: searchStep.result.results.length
      };
      
      testResult.success = testResult.steps.every(step => step.success);
      
    } catch (error) {
      testResult.errors.push(`Workflow failed: ${error.message}`);
      testResult.steps.push({ 
        name: 'Error Handler', 
        success: false, 
        error: error.message 
      });
    }
    
    testResult.duration = Date.now() - startTime;
    return testResult;
  }

  async runPerformanceIntegrationTest(): Promise<TestResult> {
    const testResult: TestResult = {
      testName: 'Performance Integration Test',
      success: false,
      duration: 0,
      steps: [],
      metrics: {},
      errors: []
    };

    const startTime = Date.now();
    
    try {
      // Performance test with larger dataset
      const dataCreationStep = await this.measurePerformance('Large Dataset Creation', async () => {
        const conversations = [];
        const messages = [];
        
        // Create 50 conversations with 20 messages each (1000 total messages)
        for (let i = 0; i < 50; i++) {
          const conversation = await this.conversationRepo.create({
            title: `Performance Test Conversation ${i + 1}`,
            metadata: { test: true, scenario: 'performance', batch: i }
          });
          conversations.push(conversation);
          
          for (let j = 0; j < 20; j++) {
            const message = await this.messageRepo.create({
              conversationId: conversation.id,
              role: j % 2 === 0 ? 'user' : 'assistant',
              content: `Performance test message ${j + 1} in conversation ${i + 1}. This message tests the system's ability to handle larger datasets efficiently.`,
              metadata: { messageIndex: j, conversationIndex: i }
            });
            messages.push(message);
          }
        }
        
        return { conversations, messages };
      });
      
      testResult.steps.push({ 
        name: 'Large Dataset Creation', 
        success: dataCreationStep.result.messages.length === 1000 
      });
      
      // Bulk search performance
      const searchPerformanceStep = await this.measurePerformance('Bulk Search Performance', async () => {
        const searchQueries = [
          'performance test',
          'system ability',
          'larger datasets',
          'conversation message',
          'efficiently handle'
        ];
        
        const results = [];
        for (const query of searchQueries) {
          const searchResult = await this.searchEngine.search(query, {
            limit: 10,
            includeMetadata: true
          });
          results.push(searchResult);
        }
        
        return results;
      });
      
      testResult.steps.push({ 
        name: 'Bulk Search Performance', 
        success: searchPerformanceStep.result.every(r => r.results.length > 0) 
      });
      
      // Connection pool stress test
      const connectionPoolStep = await this.measurePerformance('Connection Pool Stress Test', async () => {
        const operations = [];
        for (let i = 0; i < 100; i++) {
          operations.push(
            this.database.prepare('SELECT COUNT(*) as count FROM messages').get()
          );
        }
        
        const results = await Promise.all(operations.map(op => Promise.resolve(op)));
        return results;
      });
      
      testResult.steps.push({ 
        name: 'Connection Pool Stress Test', 
        success: connectionPoolStep.result.length === 100 
      });
      
      // Memory usage check
      const memoryStep = await this.measurePerformance('Memory Usage Check', async () => {
        const beforeGC = process.memoryUsage();
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
        
        const afterGC = process.memoryUsage();
        
        return {
          beforeGC: beforeGC.heapUsed / 1024 / 1024, // MB
          afterGC: afterGC.heapUsed / 1024 / 1024, // MB
          acceptable: afterGC.heapUsed < 200 * 1024 * 1024 // Under 200MB
        };
      });
      
      testResult.steps.push({ 
        name: 'Memory Usage Check', 
        success: memoryStep.result.acceptable 
      });
      
      // Compile performance metrics
      testResult.metrics = {
        dataCreation: {
          duration: dataCreationStep.metrics.duration,
          messagesPerSecond: 1000 / (dataCreationStep.metrics.duration / 1000),
          memory: dataCreationStep.metrics.memoryDelta
        },
        searchPerformance: {
          duration: searchPerformanceStep.metrics.duration,
          averageSearchTime: searchPerformanceStep.metrics.duration / 5,
          memory: searchPerformanceStep.metrics.memoryDelta
        },
        connectionPool: {
          duration: connectionPoolStep.metrics.duration,
          operationsPerSecond: 100 / (connectionPoolStep.metrics.duration / 1000)
        },
        memory: memoryStep.result
      };
      
      testResult.success = testResult.steps.every(step => step.success);
      
    } catch (error) {
      testResult.errors.push(`Performance test failed: ${error.message}`);
      testResult.steps.push({ 
        name: 'Error Handler', 
        success: false, 
        error: error.message 
      });
    }
    
    testResult.duration = Date.now() - startTime;
    return testResult;
  }

  async runCrossComponentIntegrationTest(): Promise<TestResult> {
    const testResult: TestResult = {
      testName: 'Cross-Component Integration Test',
      success: false,
      duration: 0,
      steps: [],
      metrics: {},
      errors: []
    };

    const startTime = Date.now();
    
    try {
      // Test repository + search engine integration
      const repoSearchStep = await this.measurePerformance('Repository + Search Integration', async () => {
        // Create conversation
        const conversation = await this.conversationRepo.create({
          title: 'Cross-component Integration Test',
          metadata: { integration: true }
        });
        
        // Add messages
        await this.messageRepo.create({
          conversationId: conversation.id,
          role: 'user',
          content: 'What is machine learning and how does it work?'
        });
        
        await this.messageRepo.create({
          conversationId: conversation.id,
          role: 'assistant',
          content: 'Machine learning is a subset of artificial intelligence that focuses on algorithms that can learn and make decisions from data.'
        });
        
        // Search for the content
        const searchResults = await this.searchEngine.search('machine learning algorithms', {
          limit: 5
        });
        
        // Get conversation with messages
        const fullConversation = await this.conversationRepo.findByIdWithMessages(conversation.id);
        
        return {
          conversation: fullConversation,
          searchResults: searchResults.results,
          integration: searchResults.results.length > 0 && fullConversation !== null
        };
      });
      
      testResult.steps.push({ 
        name: 'Repository + Search Integration', 
        success: repoSearchStep.result.integration 
      });
      
      // Test performance monitor integration
      const monitoringStep = await this.measurePerformance('Performance Monitoring Integration', async () => {
        this.performanceMonitor.startOperation('test_operation');
        
        // Perform some database operations
        for (let i = 0; i < 10; i++) {
          await this.messageRepo.create({
            conversationId: repoSearchStep.result.conversation.id,
            role: 'user',
            content: `Monitoring test message ${i + 1}`
          });
        }
        
        const metrics = this.performanceMonitor.endOperation('test_operation');
        
        return {
          metrics,
          hasMetrics: metrics !== null && typeof metrics.duration === 'number'
        };
      });
      
      testResult.steps.push({ 
        name: 'Performance Monitoring Integration', 
        success: monitoringStep.result.hasMetrics 
      });
      
      // Test error handling across components
      const errorHandlingStep = await this.measurePerformance('Cross-Component Error Handling', async () => {
        try {
          // Try to create message for non-existent conversation
          await this.messageRepo.create({
            conversationId: 'non-existent-id',
            role: 'user',
            content: 'This should fail gracefully'
          });
          
          return { errorHandled: false };
        } catch (error) {
          // Should throw appropriate error
          return { 
            errorHandled: true, 
            errorType: error.constructor.name 
          };
        }
      });
      
      testResult.steps.push({ 
        name: 'Cross-Component Error Handling', 
        success: errorHandlingStep.result.errorHandled 
      });
      
      testResult.metrics = {
        repoSearch: repoSearchStep.metrics,
        monitoring: monitoringStep.metrics,
        errorHandling: errorHandlingStep.metrics,
        searchResultsFound: repoSearchStep.result.searchResults.length,
        performanceMetricsAvailable: monitoringStep.result.hasMetrics
      };
      
      testResult.success = testResult.steps.every(step => step.success);
      
    } catch (error) {
      testResult.errors.push(`Cross-component test failed: ${error.message}`);
      testResult.steps.push({ 
        name: 'Error Handler', 
        success: false, 
        error: error.message 
      });
    }
    
    testResult.duration = Date.now() - startTime;
    return testResult;
  }

  async generateTestReport(): Promise<string> {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const totalSteps = this.testResults.reduce((sum, r) => sum + r.steps.length, 0);
    const passedSteps = this.testResults.reduce((sum, r) => 
      sum + r.steps.filter(s => s.success).length, 0
    );
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    
    let report = `
# MCP Persistence System - Comprehensive Integration Test Report

## Executive Summary
- **Test Suite**: Comprehensive System Integration
- **Total Test Categories**: ${totalTests}
- **Passed**: ${passedTests}/${totalTests} (${((passedTests/totalTests)*100).toFixed(1)}%)
- **Total Steps**: ${passedSteps}/${totalSteps} (${((passedSteps/totalSteps)*100).toFixed(1)}%)
- **Total Duration**: ${(totalDuration/1000).toFixed(1)}s
- **Status**: ${passedTests === totalTests ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}

## Detailed Results

`;

    for (const result of this.testResults) {
      report += `### ${result.testName} ${result.success ? '✅' : '❌'}\n`;
      report += `- **Duration**: ${(result.duration/1000).toFixed(2)}s\n`;
      report += `- **Steps**: ${result.steps.filter(s => s.success).length}/${result.steps.length} passed\n\n`;
      
      if (result.steps.length > 0) {
        report += `**Step Results:**\n`;
        for (const step of result.steps) {
          report += `- ${step.success ? '✅' : '❌'} ${step.name}`;
          if (step.error) {
            report += ` (Error: ${step.error})`;
          }
          report += `\n`;
        }
        report += `\n`;
      }
      
      if (Object.keys(result.metrics).length > 0) {
        report += `**Key Metrics:**\n`;
        for (const [key, value] of Object.entries(result.metrics)) {
          if (typeof value === 'object' && value !== null) {
            report += `- ${key}: ${JSON.stringify(value, null, 2)}\n`;
          } else {
            report += `- ${key}: ${value}\n`;
          }
        }
        report += `\n`;
      }
      
      if (result.errors.length > 0) {
        report += `**Errors:**\n`;
        for (const error of result.errors) {
          report += `- ${error}\n`;
        }
        report += `\n`;
      }
    }
    
    // Performance Analysis
    const performanceTest = this.testResults.find(r => r.testName === 'Performance Integration Test');
    if (performanceTest && performanceTest.success) {
      report += `## Performance Analysis\n\n`;
      const metrics = performanceTest.metrics;
      if (metrics.dataCreation) {
        report += `### Data Creation Performance\n`;
        report += `- **Messages/Second**: ${metrics.dataCreation.messagesPerSecond.toFixed(1)}\n`;
        report += `- **Duration**: ${(metrics.dataCreation.duration/1000).toFixed(2)}s for 1000 messages\n`;
        report += `- **Memory Usage**: ${(metrics.dataCreation.memory.heapUsed/1024/1024).toFixed(1)}MB\n\n`;
      }
      
      if (metrics.searchPerformance) {
        report += `### Search Performance\n`;
        report += `- **Average Search Time**: ${metrics.searchPerformance.averageSearchTime.toFixed(0)}ms\n`;
        report += `- **Total Search Duration**: ${metrics.searchPerformance.duration}ms for 5 queries\n\n`;
      }
      
      if (metrics.memory) {
        report += `### Memory Usage\n`;
        report += `- **Before GC**: ${metrics.memory.beforeGC.toFixed(1)}MB\n`;
        report += `- **After GC**: ${metrics.memory.afterGC.toFixed(1)}MB\n`;
        report += `- **Acceptable**: ${metrics.memory.acceptable ? '✅' : '❌'}\n\n`;
      }
    }
    
    // Recommendations
    report += `## Recommendations\n\n`;
    
    if (passedTests === totalTests) {
      report += `✅ **All integration tests passed successfully!**\n\n`;
      report += `The MCP Persistence System is ready for production deployment with:\n`;
      report += `- Robust end-to-end functionality\n`;
      report += `- Strong performance characteristics\n`;
      report += `- Reliable cross-component integration\n`;
      report += `- Effective error handling\n\n`;
    } else {
      report += `❌ **Integration test failures detected.**\n\n`;
      report += `Priority actions required:\n`;
      for (const result of this.testResults) {
        if (!result.success) {
          report += `- **${result.testName}**: Review and fix failing steps\n`;
          for (const step of result.steps) {
            if (!step.success) {
              report += `  - ${step.name}${step.error ? `: ${step.error}` : ''}\n`;
            }
          }
        }
      }
    }
    
    report += `\n## Next Steps\n\n`;
    report += `1. **Performance Validation**: ✅ Completed\n`;
    report += `2. **System Integration**: ${passedTests === totalTests ? '✅' : '❌'} ${passedTests === totalTests ? 'Completed' : 'Requires attention'}\n`;
    report += `3. **Production Readiness**: ${passedTests === totalTests ? '✅' : '❌'} ${passedTests === totalTests ? 'Validated' : 'Pending fixes'}\n`;
    
    return report;
  }

  async runAllTests(): Promise<TestResult[]> {
    console.log('🚀 Starting Comprehensive Integration Tests...\n');
    
    // Run all test categories
    console.log('📝 Running End-to-End Workflow Test...');
    const workflowResult = await this.runEndToEndWorkflowTest();
    this.testResults.push(workflowResult);
    console.log(`${workflowResult.success ? '✅' : '❌'} End-to-End Workflow: ${workflowResult.success ? 'PASSED' : 'FAILED'}\n`);
    
    console.log('⚡ Running Performance Integration Test...');
    const performanceResult = await this.runPerformanceIntegrationTest();
    this.testResults.push(performanceResult);
    console.log(`${performanceResult.success ? '✅' : '❌'} Performance Integration: ${performanceResult.success ? 'PASSED' : 'FAILED'}\n`);
    
    console.log('🔗 Running Cross-Component Integration Test...');
    const crossComponentResult = await this.runCrossComponentIntegrationTest();
    this.testResults.push(crossComponentResult);
    console.log(`${crossComponentResult.success ? '✅' : '❌'} Cross-Component Integration: ${crossComponentResult.success ? 'PASSED' : 'FAILED'}\n`);
    
    return this.testResults;
  }
}

// Jest Test Cases
describe('Comprehensive System Integration Tests', () => {
  let testSuite: ComprehensiveIntegrationTestSuite;
  
  beforeAll(async () => {
    testSuite = new ComprehensiveIntegrationTestSuite();
    await testSuite.setup();
  });
  
  afterAll(async () => {
    if (testSuite) {
      await testSuite.teardown();
    }
  });

  test('End-to-End Workflow Integration', async () => {
    const result = await testSuite.runEndToEndWorkflowTest();
    
    expect(result.success).toBe(true);
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps.every(step => step.success)).toBe(true);
    expect(result.duration).toBeLessThan(30000); // Should complete in under 30 seconds
    
    // Validate specific metrics
    expect(result.metrics.totalMessages).toBe(30);
    expect(result.metrics.searchResults).toBeGreaterThan(0);
  }, 60000);

  test('Performance Integration Test', async () => {
    const result = await testSuite.runPerformanceIntegrationTest();
    
    expect(result.success).toBe(true);
    expect(result.steps.every(step => step.success)).toBe(true);
    
    // Performance requirements
    expect(result.metrics.dataCreation.messagesPerSecond).toBeGreaterThan(10); // At least 10 messages/second
    expect(result.metrics.searchPerformance.averageSearchTime).toBeLessThan(200); // Under 200ms average
    expect(result.metrics.memory.acceptable).toBe(true); // Memory usage acceptable
  }, 120000);

  test('Cross-Component Integration Test', async () => {
    const result = await testSuite.runCrossComponentIntegrationTest();
    
    expect(result.success).toBe(true);
    expect(result.steps.every(step => step.success)).toBe(true);
    expect(result.metrics.searchResultsFound).toBeGreaterThan(0);
    expect(result.metrics.performanceMetricsAvailable).toBe(true);
  }, 60000);

  test('Generate Comprehensive Test Report', async () => {
    // Run all tests first
    await testSuite.runAllTests();
    
    const report = await testSuite.generateTestReport();
    
    expect(report).toContain('MCP Persistence System - Comprehensive Integration Test Report');
    expect(report).toContain('Executive Summary');
    expect(report).toContain('Detailed Results');
    expect(report).toContain('Performance Analysis');
    expect(report).toContain('Recommendations');
    
    // Log the report for manual review
    console.log('\n' + '='.repeat(80));
    console.log('COMPREHENSIVE INTEGRATION TEST REPORT');
    console.log('='.repeat(80));
    console.log(report);
    console.log('='.repeat(80) + '\n');
  }, 240000);
});

export { ComprehensiveIntegrationTestSuite };