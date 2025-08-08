/**
 * Migration: Intelligent Context Management
 * 
 * Adds support for conversation summarization, LLM provider management,
 * and intelligent context assembly.
 */

import { Migration } from './Migration.js';

export const migration_003_intelligent_context: Migration = {
  version: 3,
  description: 'Add intelligent context management with conversation summaries, LLM providers, and context assembly',
  
  up: [
    // Create conversation summaries table
    `CREATE TABLE IF NOT EXISTS conversation_summaries (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      level TEXT NOT NULL CHECK (level IN ('brief', 'standard', 'detailed')),
      summary_text TEXT NOT NULL,
      token_count INTEGER NOT NULL,
      provider TEXT NOT NULL,
      model TEXT NOT NULL,
      generated_at INTEGER NOT NULL,
      message_count INTEGER NOT NULL,
      start_message_id TEXT,
      end_message_id TEXT,
      metadata TEXT,
      quality_score REAL,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (start_message_id) REFERENCES messages(id),
      FOREIGN KEY (end_message_id) REFERENCES messages(id)
    )`,

    // Create summary cache table
    `CREATE TABLE IF NOT EXISTS summary_cache (
      id TEXT PRIMARY KEY,
      cache_key TEXT UNIQUE NOT NULL,
      summary_ids TEXT NOT NULL,
      assembled_context TEXT NOT NULL,
      token_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      accessed_at INTEGER NOT NULL,
      access_count INTEGER DEFAULT 1
    )`,

    // Create LLM providers table
    `CREATE TABLE IF NOT EXISTS llm_providers (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('local', 'external')),
      endpoint TEXT,
      api_key_env TEXT,
      model_name TEXT NOT NULL,
      max_tokens INTEGER NOT NULL,
      temperature REAL DEFAULT 0.7,
      is_active BOOLEAN DEFAULT TRUE,
      priority INTEGER DEFAULT 0,
      cost_per_1k_tokens REAL,
      metadata TEXT
    )`,

    // Create summary generation history table
    `CREATE TABLE IF NOT EXISTS summary_history (
      id TEXT PRIMARY KEY,
      summary_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      completed_at INTEGER,
      status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
      error_message TEXT,
      input_tokens INTEGER,
      output_tokens INTEGER,
      cost REAL,
      FOREIGN KEY (summary_id) REFERENCES conversation_summaries(id),
      FOREIGN KEY (provider_id) REFERENCES llm_providers(id)
    )`,

    // Create indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_summaries_conversation ON conversation_summaries(conversation_id)`,
    `CREATE INDEX IF NOT EXISTS idx_summaries_level ON conversation_summaries(level)`,
    `CREATE INDEX IF NOT EXISTS idx_summaries_generated ON conversation_summaries(generated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_cache_key ON summary_cache(cache_key)`,
    `CREATE INDEX IF NOT EXISTS idx_cache_accessed ON summary_cache(accessed_at)`,
    `CREATE INDEX IF NOT EXISTS idx_history_summary ON summary_history(summary_id)`,
    `CREATE INDEX IF NOT EXISTS idx_history_status ON summary_history(status)`,

    // Insert default Ollama provider (local)
    `INSERT OR IGNORE INTO llm_providers (
      id, name, type, endpoint, model_name, max_tokens, temperature, is_active, priority
    ) VALUES (
      'provider_ollama_llama2',
      'Ollama Llama 2',
      'local',
      'http://localhost:11434',
      'llama2:7b',
      4096,
      0.7,
      1,
      1
    )`,

    // Insert default OpenAI provider (external)
    `INSERT OR IGNORE INTO llm_providers (
      id, name, type, endpoint, model_name, max_tokens, temperature, is_active, priority
    ) VALUES (
      'provider_openai_gpt35',
      'OpenAI GPT-3.5',
      'external',
      'https://api.openai.com/v1',
      'gpt-3.5-turbo',
      4096,
      0.7,
      0,
      2
    )`,

    // Insert default configuration
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES ('summarization.default_provider', 'provider_ollama_llama2', ` + Date.now() + `)`,
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES ('summarization.fallback_provider', 'provider_openai_gpt35', ` + Date.now() + `)`,
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES ('summarization.max_retries', '3', ` + Date.now() + `)`,
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES ('summarization.cache_ttl_hours', '24', ` + Date.now() + `)`,
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES ('context.max_tokens', '4000', ` + Date.now() + `)`,
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES ('context.summary_ratio', '0.3', ` + Date.now() + `)`,
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES ('context.min_summary_length', '50', ` + Date.now() + `)`,
    `INSERT OR REPLACE INTO persistence_state (key, value, updated_at) VALUES ('context.max_summary_length', '2000', ` + Date.now() + `)`
  ],

  down: [
    // Remove configuration
    `DELETE FROM persistence_state 
     WHERE key LIKE 'summarization.%' 
        OR key LIKE 'context.%'`,

    // Drop indexes
    'DROP INDEX IF EXISTS idx_history_status',
    'DROP INDEX IF EXISTS idx_history_summary',
    'DROP INDEX IF EXISTS idx_cache_accessed',
    'DROP INDEX IF EXISTS idx_cache_key',
    'DROP INDEX IF EXISTS idx_summaries_generated',
    'DROP INDEX IF EXISTS idx_summaries_level',
    'DROP INDEX IF EXISTS idx_summaries_conversation',

    // Drop tables in correct order (respecting foreign keys)
    'DROP TABLE IF EXISTS summary_history',
    'DROP TABLE IF EXISTS summary_cache',
    'DROP TABLE IF EXISTS conversation_summaries',
    'DROP TABLE IF EXISTS llm_providers'
  ]
};

// Export for migration system
export default migration_003_intelligent_context;