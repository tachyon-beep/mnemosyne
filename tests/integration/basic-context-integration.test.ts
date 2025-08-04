/**
 * Basic Context Management Integration Test
 * Tests core functionality without external dependencies
 */

import Database from 'better-sqlite3';
import { createTestDatabase } from '../utils/test-helpers.js';
import { DatabaseManager } from '../../src/storage/Database.js';

describe('Basic Context Management Integration', () => {
  let db: Database.Database;
  let dbManager: DatabaseManager;

  beforeEach(async () => {
    dbManager = await createTestDatabase();
    db = dbManager.getConnection();
  });

  afterEach(async () => {
    await dbManager.close();
  });

  describe('Database Schema Verification', () => {
    it('should have all context management tables after migration', () => {
      // Check that migration 003 created the required tables
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN (
          'conversation_summaries',
          'summary_cache', 
          'llm_providers',
          'summary_history'
        )
      `).all();

      expect(tables).toHaveLength(4);
      
      const tableNames = tables.map((t: any) => t.name);
      expect(tableNames).toContain('conversation_summaries');
      expect(tableNames).toContain('summary_cache');
      expect(tableNames).toContain('llm_providers');
      expect(tableNames).toContain('summary_history');
    });

    it('should have default LLM providers configured', () => {
      const providers = db.prepare('SELECT * FROM llm_providers').all();
      
      expect(providers.length).toBeGreaterThan(0);
      
      // Check for Ollama provider
      const ollamaProvider = providers.find((p: any) => p.id === 'provider_ollama_llama2');
      expect(ollamaProvider).toBeDefined();
      expect((ollamaProvider as any).type).toBe('local');
      expect((ollamaProvider as any).is_active).toBe(1);
      
      // Check for OpenAI provider
      const openaiProvider = providers.find((p: any) => p.id === 'provider_openai_gpt35');
      expect(openaiProvider).toBeDefined();
      expect((openaiProvider as any).type).toBe('external');
    });

    it('should have default configuration values', () => {
      const configs = db.prepare(`
        SELECT key, value FROM persistence_state 
        WHERE key LIKE 'summarization.%' OR key LIKE 'context.%'
      `).all();

      expect(configs.length).toBeGreaterThan(0);
      
      const configMap = configs.reduce((acc: any, config: any) => {
        acc[config.key] = config.value;
        return acc;
      }, {});

      // Check summarization config
      expect((configMap as any)['summarization.default_provider']).toBe('provider_ollama_llama2');
      expect((configMap as any)['summarization.fallback_provider']).toBe('provider_openai_gpt35');
      expect((configMap as any)['summarization.max_retries']).toBe('3');
      
      // Check context config
      expect((configMap as any)['context.max_tokens']).toBe('4000');
      expect((configMap as any)['context.summary_ratio']).toBe('0.3');
    });
  });

  describe('Context Management Features', () => {
    it('should verify context management migration is applied', () => {
      // Simple verification that the migration has been applied
      const schemaVersion = db.prepare(`
        SELECT value FROM persistence_state WHERE key = 'schema_version'
      `).get();
      
      expect(schemaVersion).toBeDefined();
      expect(parseInt((schemaVersion as any).value)).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Database Operations', () => {
    it('should support conversation summary storage', () => {
      // Insert a test conversation
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at, title)
        VALUES (?, ?, ?, ?)
      `).run('test-conv', Date.now(), Date.now(), 'Test Conversation');
      
      // Insert a summary
      const summaryId = 'summary-' + Date.now();
      db.prepare(`
        INSERT INTO conversation_summaries (
          id, conversation_id, level, summary_text, token_count, 
          provider, model, generated_at, message_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        summaryId,
        'test-conv',
        'standard',
        'This is a test conversation summary.',
        25,
        'test-provider',
        'test-model',
        Date.now(),
        5
      );
      
      // Verify retrieval
      const summary = db.prepare(`
        SELECT * FROM conversation_summaries WHERE id = ?
      `).get(summaryId);
      
      expect(summary).toBeDefined();
      expect((summary as any).conversation_id).toBe('test-conv');
      expect((summary as any).level).toBe('standard');
      expect((summary as any).summary_text).toBe('This is a test conversation summary.');
    });

    it('should support summary caching', () => {
      const cacheId = 'cache-' + Date.now();
      const cacheKey = 'test-cache-key';
      
      // Insert cache entry
      db.prepare(`
        INSERT INTO summary_cache (
          id, cache_key, summary_ids, assembled_context, 
          token_count, created_at, accessed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        cacheId,
        cacheKey,
        JSON.stringify(['summary1', 'summary2']),
        'Assembled context from multiple summaries',
        150,
        Date.now(),
        Date.now()
      );
      
      // Verify retrieval
      const cached = db.prepare(`
        SELECT * FROM summary_cache WHERE cache_key = ?
      `).get(cacheKey);
      
      expect(cached).toBeDefined();
      expect((cached as any).cache_key).toBe(cacheKey);
      expect(JSON.parse((cached as any).summary_ids)).toEqual(['summary1', 'summary2']);
    });

    it('should track summary generation history', () => {
      // Insert provider first
      db.prepare(`
        INSERT INTO llm_providers (id, name, type, model_name, max_tokens)
        VALUES (?, ?, ?, ?, ?)
      `).run('test-provider', 'Test Provider', 'local', 'test-model', 4000);
      
      // Insert conversation and summary
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES (?, ?, ?)
      `).run('test-conv', Date.now(), Date.now());
      
      db.prepare(`
        INSERT INTO conversation_summaries (
          id, conversation_id, level, summary_text, token_count,
          provider, model, generated_at, message_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        'test-summary',
        'test-conv',
        'brief',
        'Test summary',
        20,
        'test-provider',
        'test-model',
        Date.now(),
        3
      );
      
      // Insert history record
      const historyId = 'history-' + Date.now();
      db.prepare(`
        INSERT INTO summary_history (
          id, summary_id, provider_id, started_at, completed_at,
          status, input_tokens, output_tokens, cost
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        historyId,
        'test-summary',
        'test-provider',
        Date.now() - 5000,
        Date.now(),
        'completed',
        100,
        25,
        0.001
      );
      
      // Verify history tracking
      const history = db.prepare(`
        SELECT h.*, s.level, p.name as provider_name
        FROM summary_history h
        JOIN conversation_summaries s ON h.summary_id = s.id
        JOIN llm_providers p ON h.provider_id = p.id
        WHERE h.id = ?
      `).get(historyId);
      
      expect(history).toBeDefined();
      expect((history as any).status).toBe('completed');
      expect((history as any).level).toBe('brief');
      expect((history as any).provider_name).toBe('Test Provider');
    });
  });

  describe('Configuration Management', () => {
    it('should allow updating provider configuration', () => {
      // Update provider settings
      db.prepare(`
        UPDATE llm_providers 
        SET temperature = ?, max_tokens = ?, is_active = ?
        WHERE id = ?
      `).run(0.9, 8192, 0, 'provider_ollama_llama2');
      
      // Verify update
      const provider = db.prepare(`
        SELECT * FROM llm_providers WHERE id = ?
      `).get('provider_ollama_llama2');
      
      expect((provider as any).temperature).toBe(0.9);
      expect((provider as any).max_tokens).toBe(8192);
      expect((provider as any).is_active).toBe(0);
    });

    it('should allow updating system configuration', () => {
      // Update configuration
      const now = Date.now();
      db.prepare(`
        UPDATE persistence_state 
        SET value = ?, updated_at = ?
        WHERE key = ?
      `).run('5', now, 'summarization.max_retries');
      
      // Verify update
      const config = db.prepare(`
        SELECT * FROM persistence_state WHERE key = ?
      `).get('summarization.max_retries');
      
      expect((config as any).value).toBe('5');
      expect((config as any).updated_at).toBe(now);
    });
  });

  describe('Performance and Constraints', () => {
    it('should enforce foreign key constraints', () => {
      // Try to insert summary with non-existent conversation
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_summaries (
            id, conversation_id, level, summary_text, token_count,
            provider, model, generated_at, message_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'bad-summary',
          'non-existent-conv',
          'brief',
          'Test',
          10,
          'test-provider',
          'test-model',
          Date.now(),
          1
        );
      }).toThrow();
    });

    it('should enforce check constraints', () => {
      // Insert conversation first
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES (?, ?, ?)
      `).run('test-conv', Date.now(), Date.now());
      
      // Try to insert summary with invalid level
      expect(() => {
        db.prepare(`
          INSERT INTO conversation_summaries (
            id, conversation_id, level, summary_text, token_count,
            provider, model, generated_at, message_count
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'bad-level-summary',
          'test-conv',
          'invalid-level',
          'Test',
          10,
          'test-provider',
          'test-model',
          Date.now(),
          1
        );
      }).toThrow();
    });

    it('should handle concurrent operations', () => {
      const conversationId = 'concurrent-test';
      
      // Insert conversation
      db.prepare(`
        INSERT INTO conversations (id, created_at, updated_at)
        VALUES (?, ?, ?)
      `).run(conversationId, Date.now(), Date.now());
      
      // Simulate concurrent summary insertions
      const transaction = db.transaction(() => {
        for (let i = 0; i < 10; i++) {
          db.prepare(`
            INSERT INTO conversation_summaries (
              id, conversation_id, level, summary_text, token_count,
              provider, model, generated_at, message_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(
            `concurrent-summary-${i}`,
            conversationId,
            'brief',
            `Summary ${i}`,
            15,
            'test-provider',
            'test-model',
            Date.now(),
            2
          );
        }
      });
      
      transaction();
      
      // Verify all summaries were inserted
      const summaries = db.prepare(`
        SELECT COUNT(*) as count FROM conversation_summaries 
        WHERE conversation_id = ?
      `).get(conversationId);
      
      expect((summaries as any).count).toBe(10);
    });
  });
});