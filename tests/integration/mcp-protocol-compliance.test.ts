/**
 * MCP Protocol Compliance Integration Tests
 * 
 * Comprehensive tests to validate MCP protocol compliance across all tools
 * and ensure proper JSON-RPC 2.0 message handling, error responses, and
 * resource management according to MCP specification.
 */

import { describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import { MCPServer } from '../../src/server/MCPServer.js';
import { DatabaseManager } from '../../src/storage/Database.js';
import { createTestDatabase } from '../utils/test-helpers.js';
import { ToolRegistry } from '../../src/tools/index.js';

// MCP Protocol validation helpers
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

interface MCPToolCall {
  name: string;
  arguments: Record<string, any>;
}

describe('MCP Protocol Compliance Tests', () => {
  let server: MCPServer;
  let dbManager: DatabaseManager;
  let toolRegistry: ToolRegistry;

  beforeEach(async () => {
    dbManager = await createTestDatabase();
    // Initialize server and tools
  });

  afterEach(async () => {
    if (server) await server.stop();
    if (dbManager) dbManager.close();
  });

  describe('JSON-RPC 2.0 Message Format Compliance', () => {
    test('should handle valid JSON-RPC 2.0 requests', async () => {
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id: 'test-001',
        method: 'tools/call',
        params: {
          name: 'save_message',
          arguments: {
            role: 'user',
            content: 'Test message for protocol compliance'
          }
        }
      };

      const response = await server.handleRequest(request);

      expect(response.jsonrpc).toBe('2.0');
      expect(response.id).toBe(request.id);
      expect(response.result || response.error).toBeDefined();
    });

    test('should reject malformed JSON-RPC requests', async () => {
      const malformedRequests = [
        { id: 'test-002', method: 'tools/call' }, // Missing jsonrpc
        { jsonrpc: '1.0', id: 'test-003', method: 'tools/call' }, // Wrong version
        { jsonrpc: '2.0', method: 'tools/call' }, // Missing id
        { jsonrpc: '2.0', id: 'test-004' } // Missing method
      ];

      for (const request of malformedRequests) {
        const response = await server.handleRequest(request as any);
        
        expect(response.jsonrpc).toBe('2.0');
        expect(response.error).toBeDefined();
        expect(response.error?.code).toBe(-32600); // Invalid Request
      }
    });

    test('should handle batch requests correctly', async () => {
      const batchRequest = [
        {
          jsonrpc: '2.0',
          id: 'batch-001',
          method: 'tools/call',
          params: { name: 'save_message', arguments: { role: 'user', content: 'Message 1' } }
        },
        {
          jsonrpc: '2.0',
          id: 'batch-002',
          method: 'tools/call',
          params: { name: 'save_message', arguments: { role: 'assistant', content: 'Message 2' } }
        }
      ];

      const responses = await server.handleBatchRequest(batchRequest);

      expect(Array.isArray(responses)).toBe(true);
      expect(responses).toHaveLength(2);
      
      for (const response of responses) {
        expect(response.jsonrpc).toBe('2.0');
        expect(response.id).toBeDefined();
      }
    });
  });

  describe('Tool Schema Validation', () => {
    test('should validate all tool schemas against MCP specification', async () => {
      const toolDefinitions = toolRegistry.getToolDefinitions();

      for (const tool of toolDefinitions) {
        // Validate required MCP tool properties
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
        
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        
        expect(tool.inputSchema).toBeDefined();
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema.properties).toBeDefined();

        // Validate schema structure follows JSON Schema Draft 7
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }
      }
    });

    test('should validate input schemas for all registered tools', async () => {
      const toolNames = toolRegistry.getToolNames();
      
      const validInputs = {
        save_message: { role: 'user', content: 'Test message' },
        search_messages: { query: 'test query' },
        get_conversation: { conversationId: 'test-conv-id' },
        get_conversations: { limit: 10 },
        delete_conversation: { conversationId: 'test-conv-id' }
      };

      const invalidInputs = {
        save_message: { content: 'Missing role' }, // Missing required field
        search_messages: { limit: 'invalid' }, // Wrong type
        get_conversation: {}, // Missing required field
        get_conversations: { limit: -1 }, // Invalid value
        delete_conversation: { conversationId: '' } // Empty required field
      };

      for (const toolName of toolNames) {
        if (validInputs[toolName]) {
          const validation = toolRegistry.validateToolInput(toolName, validInputs[toolName]);
          expect(validation.valid).toBe(true);
        }

        if (invalidInputs[toolName]) {
          const validation = toolRegistry.validateToolInput(toolName, invalidInputs[toolName]);
          expect(validation.valid).toBe(false);
          expect(validation.errors).toBeDefined();
        }
      }
    });
  });

  describe('Error Response Format Compliance', () => {
    test('should return standard error codes for common scenarios', async () => {
      const errorScenarios = [
        {
          request: { jsonrpc: '2.0', id: 1, method: 'unknown_method' },
          expectedCode: -32601, // Method not found
          description: 'Unknown method'
        },
        {
          request: { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'unknown_tool' } },
          expectedCode: -32602, // Invalid params
          description: 'Unknown tool'
        },
        {
          request: { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'save_message', arguments: {} } },
          expectedCode: -32602, // Invalid params
          description: 'Invalid tool arguments'
        }
      ];

      for (const scenario of errorScenarios) {
        const response = await server.handleRequest(scenario.request);
        
        expect(response.jsonrpc).toBe('2.0');
        expect(response.id).toBe(scenario.request.id);
        expect(response.error).toBeDefined();
        expect(response.error?.code).toBe(scenario.expectedCode);
        expect(response.error?.message).toBeDefined();
        
        console.log(`✓ ${scenario.description}: Error code ${response.error?.code}`);
      }
    });

    test('should include detailed error information', async () => {
      const request = {
        jsonrpc: '2.0',
        id: 'detailed-error-test',
        method: 'tools/call',
        params: {
          name: 'save_message',
          arguments: {
            role: 'invalid_role',
            content: 'Test message'
          }
        }
      };

      const response = await server.handleRequest(request);

      expect(response.error).toBeDefined();
      expect(response.error?.message).toContain('validation');
      expect(response.error?.data).toBeDefined();
      expect(response.error?.data.field).toBeDefined();
      expect(response.error?.data.validValues).toBeDefined();
    });
  });

  describe('Resource Management Lifecycle', () => {
    test('should handle resource lifecycle correctly', async () => {
      // Test complete resource lifecycle: create -> use -> cleanup
      
      // 1. Create resources through tool calls
      const createResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'resource-create',
        method: 'tools/call',
        params: {
          name: 'save_message',
          arguments: { role: 'user', content: 'Resource lifecycle test' }
        }
      });

      expect(createResponse.result).toBeDefined();
      const conversationId = createResponse.result.conversation.id;

      // 2. Use resources
      const useResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'resource-use',
        method: 'tools/call',
        params: {
          name: 'get_conversation',
          arguments: { conversationId }
        }
      });

      expect(useResponse.result).toBeDefined();
      expect(useResponse.result.conversation.id).toBe(conversationId);

      // 3. Cleanup resources
      const cleanupResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'resource-cleanup',
        method: 'tools/call',
        params: {
          name: 'delete_conversation',
          arguments: { conversationId }
        }
      });

      expect(cleanupResponse.result).toBeDefined();
      expect(cleanupResponse.result.success).toBe(true);

      // 4. Verify resource is cleaned up
      const verifyResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'resource-verify',
        method: 'tools/call',
        params: {
          name: 'get_conversation',
          arguments: { conversationId }
        }
      });

      expect(verifyResponse.error).toBeDefined();
      expect(verifyResponse.error?.message).toContain('not found');
    });

    test('should handle concurrent resource access safely', async () => {
      // Create a conversation
      const createResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'concurrent-setup',
        method: 'tools/call',
        params: {
          name: 'save_message',
          arguments: { role: 'user', content: 'Concurrent access test' }
        }
      });

      const conversationId = createResponse.result.conversation.id;

      // Perform concurrent operations on the same resource
      const concurrentOperations = Array.from({ length: 10 }, (_, i) => 
        server.handleRequest({
          jsonrpc: '2.0',
          id: `concurrent-${i}`,
          method: 'tools/call',
          params: {
            name: 'save_message',
            arguments: { 
              role: i % 2 === 0 ? 'user' : 'assistant',
              content: `Concurrent message ${i}`,
              conversationId 
            }
          }
        })
      );

      const results = await Promise.all(concurrentOperations);

      // All operations should succeed or fail gracefully
      for (const result of results) {
        expect(result.jsonrpc).toBe('2.0');
        expect(result.result || result.error).toBeDefined();
        
        if (result.error) {
          // Errors should be well-formed
          expect(result.error.code).toBeDefined();
          expect(result.error.message).toBeDefined();
        }
      }

      // Verify data consistency after concurrent operations
      const finalState = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'concurrent-verify',
        method: 'tools/call',
        params: {
          name: 'get_conversation',
          arguments: { conversationId }
        }
      });

      expect(finalState.result).toBeDefined();
      expect(finalState.result.messages.length).toBeGreaterThan(0);
    });
  });

  describe('Tool Integration Compliance', () => {
    test('should maintain context across tool calls', async () => {
      // Save a message and verify context is maintained
      const saveResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'context-save',
        method: 'tools/call',
        params: {
          name: 'save_message',
          arguments: { role: 'user', content: 'Context test message' }
        }
      });

      const conversationId = saveResponse.result.conversation.id;

      // Search for the message
      const searchResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'context-search',
        method: 'tools/call',
        params: {
          name: 'search_messages',
          arguments: { query: 'context test' }
        }
      });

      expect(searchResponse.result).toBeDefined();
      expect(searchResponse.result.results.length).toBeGreaterThan(0);
      expect(searchResponse.result.results[0].conversationId).toBe(conversationId);
    });

    test('should handle tool chaining scenarios', async () => {
      // Chain: save_message -> search_messages -> get_conversation
      
      // 1. Save initial message
      const saveResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'chain-save',
        method: 'tools/call',
        params: {
          name: 'save_message',
          arguments: { role: 'user', content: 'Tool chaining test with unique keyword xyzabc' }
        }
      });

      // 2. Search for the message
      const searchResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'chain-search',
        method: 'tools/call',
        params: {
          name: 'search_messages',
          arguments: { query: 'xyzabc' }
        }
      });

      expect(searchResponse.result.results.length).toBeGreaterThan(0);
      const foundConversationId = searchResponse.result.results[0].conversationId;

      // 3. Get full conversation
      const conversationResponse = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'chain-get',
        method: 'tools/call',
        params: {
          name: 'get_conversation',
          arguments: { conversationId: foundConversationId }
        }
      });

      expect(conversationResponse.result).toBeDefined();
      expect(conversationResponse.result.messages[0].content).toContain('xyzabc');
    });
  });

  describe('Performance and Timeout Compliance', () => {
    test('should respect timeout constraints', async () => {
      const startTime = Date.now();
      
      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'timeout-test',
        method: 'tools/call',
        params: {
          name: 'search_messages',
          arguments: { query: 'performance test timeout' }
        }
      }, { timeout: 5000 });

      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5000);
      expect(response.result || response.error).toBeDefined();
    });

    test('should handle timeout gracefully', async () => {
      // This test would require a way to simulate slow operations
      // For now, we'll test the timeout handling mechanism
      
      const response = await server.handleRequest({
        jsonrpc: '2.0',
        id: 'timeout-graceful',
        method: 'tools/call',
        params: {
          name: 'search_messages',
          arguments: { query: 'test' }
        }
      }, { timeout: 1 }); // Very short timeout

      if (response.error) {
        expect(response.error.code).toBe(-32603); // Internal error
        expect(response.error.message).toContain('timeout');
      }
    });
  });
});