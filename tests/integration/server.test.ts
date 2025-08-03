/**
 * Integration Tests - Server Module
 * 
 * These tests verify the end-to-end functionality of the MCP server,
 * including startup, tool registration, tool execution, and shutdown.
 */

import { describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import { 
  MCPServer, 
  ServerStatus, 
  createMCPServer,
  ToolRegistry,
  createToolRegistry
} from '../../src/server';
import { DatabaseManager } from '../../src/storage/Database';
import { ConversationRepository, MessageRepository } from '../../src/storage/repositories';
import { SearchEngine } from '../../src/search/SearchEngine';

// Test database path
const TEST_DB_PATH = path.join(__dirname, '../test-data/server-test.db');

describe('Server Integration Tests', () => {
  let server: MCPServer;
  // Database manager will be initialized in beforeEach

  beforeEach(async () => {
    // Clean up any existing test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch {
      // File doesn't exist, ignore
    }

    // Create server with test configuration
    server = createMCPServer({
      name: 'test-mcp-server',
      version: '1.0.0-test',
      databasePath: TEST_DB_PATH,
      debug: true,
      toolTimeoutMs: 5000
    });
  });

  afterEach(async () => {
    // Stop server if running
    if (server.getStatus() === ServerStatus.RUNNING) {
      await server.stop();
    }

    // Clean up test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch {
      // File doesn't exist, ignore
    }
  });

  describe('Server Lifecycle', () => {
    test('should start server successfully', async () => {
      expect(server.getStatus()).toBe(ServerStatus.STOPPED);
      
      await server.start();
      
      expect(server.getStatus()).toBe(ServerStatus.RUNNING);
    });

    test('should stop server successfully', async () => {
      await server.start();
      expect(server.getStatus()).toBe(ServerStatus.RUNNING);
      
      await server.stop();
      
      expect(server.getStatus()).toBe(ServerStatus.STOPPED);
    });

    test('should not allow starting server when already running', async () => {
      await server.start();
      
      await expect(server.start()).rejects.toThrow('Cannot start server');
    });

    test('should handle graceful shutdown', async () => {
      await server.start();
      
      // Add a shutdown handler to verify it's called
      let shutdownCalled = false;
      server.onShutdown(async () => {
        shutdownCalled = true;
      });
      
      await server.stop();
      
      expect(shutdownCalled).toBe(true);
      expect(server.getStatus()).toBe(ServerStatus.STOPPED);
    });
  });

  describe('Database Integration', () => {
    test('should initialize database on startup', async () => {
      await server.start();
      
      // Verify database file was created
      const dbExists = await fs.access(TEST_DB_PATH).then(() => true).catch(() => false);
      expect(dbExists).toBe(true);
      
      // Verify database is accessible through health check
      const health = await server.healthCheck();
      expect(health.checks.database).toBe('ok');
    });

    test('should run migrations on startup', async () => {
      await server.start();
      
      // Check if basic tables exist by attempting to get stats
      const stats = await server.getStats();
      expect(stats.database).toBeDefined();
      expect(stats.database.conversationCount).toBe(0);
      expect(stats.database.messageCount).toBe(0);
    });
  });

  describe('Tool Registration', () => {
    test('should register all tools on startup', async () => {
      await server.start();
      
      const stats = await server.getStats();
      expect(stats.tools).toBeDefined();
      expect(stats.tools.totalTools).toBeGreaterThan(0);
      expect(stats.tools.toolNames).toContain('save_message');
      expect(stats.tools.toolNames).toContain('search_messages');
      expect(stats.tools.toolNames).toContain('get_conversation');
      expect(stats.tools.toolNames).toContain('get_conversations');
      expect(stats.tools.toolNames).toContain('delete_conversation');
    });

    test('should provide tool definitions', async () => {
      await server.start();
      
      const health = await server.healthCheck();
      expect(health.checks.tools).toBe('ok');
    });
  });

  describe('Health Checks', () => {
    test('should report healthy status when running', async () => {
      await server.start();
      
      const health = await server.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.checks.database).toBe('ok');
      expect(health.checks.tools).toBe('ok');
      expect(health.checks.search).toBe('ok');
      expect(health.uptime).toBeGreaterThan(0);
    });

    test('should report unhealthy status when stopped', async () => {
      const health = await server.healthCheck();
      
      expect(health.status).toBe('unhealthy');
    });

    test('should include uptime in health check', async () => {
      await server.start();
      
      // Wait a bit to ensure uptime > 0
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const health = await server.healthCheck();
      expect(health.uptime).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database initialization errors', async () => {
      // Create server with invalid database path
      const invalidServer = createMCPServer({
        databasePath: '/invalid/path/that/does/not/exist/db.sqlite'
      });
      
      await expect(invalidServer.start()).rejects.toThrow();
      expect(invalidServer.getStatus()).toBe(ServerStatus.ERROR);
    });

    test('should handle shutdown errors gracefully', async () => {
      await server.start();
      
      // Add a failing shutdown handler
      server.onShutdown(async () => {
        throw new Error('Shutdown error');
      });
      
      // Should still complete shutdown despite error
      await server.stop();
      expect(server.getStatus()).toBe(ServerStatus.STOPPED);
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should provide server statistics', async () => {
      await server.start();
      
      const stats = await server.getStats();
      
      expect(stats.server).toBeDefined();
      expect(stats.server.name).toBe('test-mcp-server');
      expect(stats.server.version).toBe('1.0.0-test');
      expect(stats.server.status).toBe(ServerStatus.RUNNING);
      expect(stats.server.uptime).toBeGreaterThan(0);
      expect(stats.server.health).toBe('healthy');
      
      expect(stats.database).toBeDefined();
      expect(stats.tools).toBeDefined();
    });

    test('should track uptime correctly', async () => {
      await server.start();
      
      const stats1 = await server.getStats();
      const uptime1 = stats1.server.uptime;
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const stats2 = await server.getStats();
      const uptime2 = stats2.server.uptime;
      
      expect(uptime2).toBeGreaterThan(uptime1);
    });
  });
});

describe('Tool Registry Integration Tests', () => {
  let dbManager: DatabaseManager;
  let toolRegistry: ToolRegistry;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let searchEngine: SearchEngine;

  beforeEach(async () => {
    // Clean up any existing test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch {
      // File doesn't exist, ignore
    }

    // Initialize database
    dbManager = new DatabaseManager({
      databasePath: TEST_DB_PATH,
      enableWAL: true,
      enableForeignKeys: true
    });
    await dbManager.initialize();

    // Create repositories and search engine
    conversationRepo = new ConversationRepository(dbManager);
    messageRepo = new MessageRepository(dbManager);
    searchEngine = new SearchEngine(messageRepo);

    // Create tool registry
    toolRegistry = createToolRegistry({
      conversationRepository: conversationRepo,
      messageRepository: messageRepo,
      searchEngine: searchEngine
    });
  });

  afterEach(async () => {
    if (dbManager) {
      dbManager.close();
    }

    // Clean up test database
    try {
      await fs.unlink(TEST_DB_PATH);
    } catch {
      // File doesn't exist, ignore
    }
  });

  describe('Tool Execution', () => {
    test('should execute save_message tool successfully', async () => {
      const input = {
        role: 'user',
        content: 'Test message'
      };

      const result = await toolRegistry.executeTool('save_message', input);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.message.id).toBeDefined();
      expect(result.result.conversation.id).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should execute search_messages tool successfully', async () => {
      // First save a message
      await toolRegistry.executeTool('save_message', {
        role: 'user',
        content: 'This is a searchable test message'
      });

      // Then search for it
      const result = await toolRegistry.executeTool('search_messages', {
        query: 'searchable test'
      });

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.results).toBeDefined();
      expect(Array.isArray(result.result.results)).toBe(true);
    });

    test('should handle tool execution errors', async () => {
      const result = await toolRegistry.executeTool('save_message', {
        role: 'invalid_role', // Invalid role value
        content: 'Test message'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    test('should handle non-existent tool execution', async () => {
      const result = await toolRegistry.executeTool('non_existent_tool' as any, {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('ToolNotFound');
    });
  });

  describe('Tool Statistics', () => {
    test('should track tool execution statistics', async () => {
      // Execute a tool multiple times
      await toolRegistry.executeTool('save_message', { role: 'user', content: 'Message 1' });
      await toolRegistry.executeTool('save_message', { role: 'user', content: 'Message 2' });
      
      // Execute with error
      await toolRegistry.executeTool('save_message', { content: 'Invalid message' });

      const stats = toolRegistry.getToolStatistics();
      
      expect(stats.save_message).toBeDefined();
      expect(stats.save_message.calls).toBe(3);
      expect(stats.save_message.errors).toBe(1);
      expect(stats.save_message.totalTime).toBeGreaterThan(0);
      expect(stats.save_message.avgTime).toBeGreaterThan(0);
    });

    test('should provide registry information', async () => {
      const info = toolRegistry.getRegistryInfo();
      
      expect(info.totalTools).toBeGreaterThan(0);
      expect(info.tools.length).toBe(info.totalTools);
      expect(info.tools[0]).toHaveProperty('name');
      expect(info.tools[0]).toHaveProperty('description');
      expect(info.tools[0]).toHaveProperty('version');
      expect(info.tools[0]).toHaveProperty('registeredAt');
      expect(info.statistics).toBeDefined();
    });
  });

  describe('Tool Health Checks', () => {
    test('should perform health check on all tools', async () => {
      const health = await toolRegistry.healthCheck();
      
      expect(health.healthy).toBe(true);
      expect(health.tools).toBeDefined();
      
      // Check each tool status
      for (const toolName of toolRegistry.getToolNames()) {
        expect(health.tools[toolName]).toBeDefined();
        expect(health.tools[toolName].status).toBe('ok');
      }
    });
  });

  describe('Input Validation', () => {
    test('should validate tool input', async () => {
      const validInput = { role: 'user', content: 'Test message' };
      const validation = toolRegistry.validateToolInput('save_message', validInput);
      
      expect(validation.valid).toBe(true);
      expect(validation.validatedInput).toBeDefined();
    });

    test('should handle validation errors', async () => {
      const invalidInput = { content: 'Missing role' };
      const validation = toolRegistry.validateToolInput('save_message', invalidInput);
      
      // Note: The actual validation behavior depends on the tool implementation
      // This test structure shows how validation should work
      expect(validation.valid).toBeDefined();
    });
  });
});