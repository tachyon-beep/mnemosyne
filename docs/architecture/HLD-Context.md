# High Level Design: Intelligent Context Management

## Overview

This document outlines the design for Phase 2 of the MCP Persistence System: Intelligent Context Management. The primary goal is to solve the "context dumping" problem by intelligently managing what information Claude receives through conversation summarization, smart context assembly, and progressive detail retrieval.

## 1. Executive Summary

### 1.1 Purpose
Transform raw conversation history into intelligently managed context that:
- Provides hierarchical summaries (overview → details)
- Manages token budgets effectively
- Enables progressive detail retrieval
- Supports both local and external LLM providers

### 1.2 Key Features
1. **Conversation Summarization** - Multi-level summaries with temporal compression
2. **Smart Context Assembly** - Token-aware context optimization
3. **Progressive Detail Retrieval** - Drill-down from summaries to specifics
4. **Provider Flexibility** - Support for local LLMs and external APIs

### 1.3 Success Criteria
- Context stays within token budgets while maintaining relevance
- Users can work with large conversation histories efficiently
- Summaries capture key information accurately
- Sub-second response times for context retrieval

## 2. System Architecture

### 2.1 Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                   MCP Client (Claude)                    │
└────────────────────┬───────────────────────────────────┘
                     │ MCP Protocol
┌────────────────────┴───────────────────────────────────┐
│              Context Management Layer                    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Summarizer  │  │   Context    │  │   Provider    │ │
│  │   Engine    │  │  Assembler   │  │   Manager     │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   Summary   │  │    Token     │  │  Cache Layer  │ │
│  │   Storage   │  │   Counter    │  │               │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
├─────────────────────────────────────────────────────────┤
│                 SQLite Database                          │
└─────────────────────────────────────────────────────────┘
```

### 2.2 New Components

#### 2.2.1 Summarizer Engine
- Generates hierarchical summaries at multiple levels
- Supports both local and external LLM providers
- Implements retry logic and fallback strategies
- Manages summary generation queues

#### 2.2.2 Context Assembler
- Optimizes context based on token budgets
- Implements relevance scoring for snippet selection
- Manages context hierarchy (summary → detail)
- Handles progressive detail expansion

#### 2.2.3 Provider Manager
- Abstracts LLM provider interfaces
- Supports multiple providers:
  - Local: Ollama, llama.cpp, transformers
  - External: OpenAI, Anthropic, Google
- Handles authentication and rate limiting
- Implements cost tracking for external providers

#### 2.2.4 Summary Storage
- Stores summaries with metadata
- Manages summary versioning
- Implements summary invalidation logic
- Tracks summary quality metrics

#### 2.2.5 Token Counter
- Accurate token counting for different models
- Supports multiple tokenizer formats
- Provides token budget calculations
- Implements chunking strategies

## 3. Database Schema Extensions

### 3.1 New Tables

```sql
-- Summary storage table
CREATE TABLE IF NOT EXISTS conversation_summaries (
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
  metadata TEXT, -- JSON with additional data
  quality_score REAL, -- 0.0 to 1.0
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
  FOREIGN KEY (start_message_id) REFERENCES messages(id),
  FOREIGN KEY (end_message_id) REFERENCES messages(id)
);

-- Summary cache for performance
CREATE TABLE IF NOT EXISTS summary_cache (
  id TEXT PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  summary_ids TEXT NOT NULL, -- JSON array of summary IDs
  assembled_context TEXT NOT NULL,
  token_count INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  accessed_at INTEGER NOT NULL,
  access_count INTEGER DEFAULT 1
);

-- Provider configuration
CREATE TABLE IF NOT EXISTS llm_providers (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('local', 'external')),
  endpoint TEXT,
  api_key_env TEXT, -- Environment variable name
  model_name TEXT NOT NULL,
  max_tokens INTEGER NOT NULL,
  temperature REAL DEFAULT 0.7,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,
  cost_per_1k_tokens REAL, -- For external providers
  metadata TEXT -- JSON configuration
);

-- Summary generation history
CREATE TABLE IF NOT EXISTS summary_history (
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
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_summaries_conversation ON conversation_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_summaries_level ON conversation_summaries(level);
CREATE INDEX IF NOT EXISTS idx_summaries_generated ON conversation_summaries(generated_at);
CREATE INDEX IF NOT EXISTS idx_cache_key ON summary_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_accessed ON summary_cache(accessed_at);
```

### 3.2 Configuration in persistence_state

```sql
-- Default provider settings
INSERT OR REPLACE INTO persistence_state (key, value) VALUES
  ('summarization.default_provider', 'local_ollama'),
  ('summarization.fallback_provider', 'external_openai'),
  ('summarization.max_retries', '3'),
  ('summarization.cache_ttl_hours', '24'),
  ('context.max_tokens', '4000'),
  ('context.summary_ratio', '0.3'); -- 30% summary, 70% details
```

## 4. Summarization Engine Design

### 4.1 Provider Interface

```typescript
interface LLMProvider {
  id: string;
  name: string;
  type: 'local' | 'external';
  
  // Core methods
  initialize(): Promise<void>;
  isAvailable(): Promise<boolean>;
  generateSummary(input: SummaryRequest): Promise<SummaryResponse>;
  countTokens(text: string): Promise<number>;
  getMaxTokens(): number;
  
  // Optional methods
  estimateCost?(tokens: number): number;
  getModelInfo?(): ModelInfo;
}

interface SummaryRequest {
  messages: Message[];
  level: 'brief' | 'standard' | 'detailed';
  maxTokens: number;
  focusTopics?: string[];
  previousSummary?: string; // For incremental updates
}

interface SummaryResponse {
  summary: string;
  tokenCount: number;
  inputTokens: number;
  outputTokens: number;
  cost?: number;
  metadata?: Record<string, any>;
}
```

### 4.2 Provider Implementations

#### 4.2.1 Local Provider (Ollama)
```typescript
class OllamaProvider implements LLMProvider {
  // Uses Ollama API for local model inference
  // Supports models like Llama 2, Mistral, Phi-2
  // No API costs, privacy-preserving
}
```

#### 4.2.2 External Provider (OpenAI)
```typescript
class OpenAIProvider implements LLMProvider {
  // Uses OpenAI API (GPT-3.5-turbo, GPT-4)
  // Requires API key, tracks costs
  // Higher quality summaries
}
```

#### 4.2.3 Provider Factory
```typescript
class ProviderFactory {
  static async createProvider(config: ProviderConfig): Promise<LLMProvider> {
    switch (config.type) {
      case 'ollama':
        return new OllamaProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      case 'anthropic':
        return new AnthropicProvider(config);
      // Additional providers...
    }
  }
}
```

### 4.3 Summarization Strategies

#### 4.3.1 Hierarchical Summarization
```
Level 1 (Brief): 1-2 sentences, key outcome
Level 2 (Standard): 1 paragraph, main points
Level 3 (Detailed): Multiple paragraphs, preserving nuance
```

#### 4.3.2 Temporal Compression
- Recent conversations: More detail
- Older conversations: Higher compression
- Configurable aging curves

#### 4.3.3 Topic-Based Summarization
- Extract and group by topics
- Maintain topic continuity
- Cross-reference related discussions

### 4.4 Summary Generation Process

```
1. Check cache for existing summary
2. If not cached or stale:
   a. Select appropriate provider
   b. Prepare messages with token budget
   c. Generate summary with retry logic
   d. Validate summary quality
   e. Store in database and cache
3. Return summary with metadata
```

## 5. Context Assembly Design

### 5.1 Context Assembly Algorithm

```typescript
interface ContextRequest {
  query: string;
  maxTokens: number;
  conversationIds?: string[];
  timeRange?: { start: Date; end: Date };
  includeLevel: 'summary' | 'mixed' | 'full';
}

class ContextAssembler {
  async assembleContext(request: ContextRequest): Promise<AssembledContext> {
    // 1. Analyze query to determine relevant topics
    const topics = await this.extractTopics(request.query);
    
    // 2. Score conversations by relevance
    const scoredConversations = await this.scoreConversations(topics);
    
    // 3. Allocate token budget
    const tokenAllocation = this.allocateTokens(
      scoredConversations,
      request.maxTokens
    );
    
    // 4. Retrieve appropriate content mix
    const content = await this.retrieveContent(tokenAllocation);
    
    // 5. Assemble final context
    return this.assembleContent(content);
  }
}
```

### 5.2 Token Budget Management

```typescript
interface TokenAllocation {
  summaries: {
    brief: number;
    standard: number;
    detailed: number;
  };
  messages: {
    recent: number;
    relevant: number;
  };
  metadata: number;
}

class TokenBudgetManager {
  allocateTokens(
    conversations: ScoredConversation[],
    maxTokens: number
  ): TokenAllocation {
    // Smart allocation based on:
    // - Conversation relevance scores
    // - Recency
    // - User preferences
    // - Query complexity
  }
}
```

### 5.3 Progressive Detail Retrieval

```typescript
interface ProgressiveContext {
  currentLevel: number;
  availableLevels: number[];
  
  async expandDetail(area: string): Promise<ExpandedContext>;
  async collapseDetail(area: string): Promise<CollapsedContext>;
  async focusOn(topic: string): Promise<FocusedContext>;
}
```

## 6. MCP Tool Specifications

### 6.1 get_context_summary

```typescript
{
  name: "get_context_summary",
  description: "Get intelligent summary of conversations with context management",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Query to contextualize the summary"
      },
      conversationIds: {
        type: "array",
        items: { type: "string" },
        description: "Specific conversations to summarize"
      },
      timeRange: {
        type: "object",
        properties: {
          start: { type: "string", format: "date-time" },
          end: { type: "string", format: "date-time" }
        }
      },
      maxTokens: {
        type: "number",
        default: 2000,
        description: "Maximum tokens for the summary"
      },
      level: {
        type: "string",
        enum: ["brief", "standard", "detailed"],
        default: "standard"
      }
    },
    required: ["query"]
  }
}
```

### 6.2 get_relevant_snippets

```typescript
{
  name: "get_relevant_snippets",
  description: "Get relevant conversation snippets optimized for token budget",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Query to find relevant snippets"
      },
      maxTokens: {
        type: "number",
        default: 1000,
        description: "Maximum tokens to return"
      },
      strategy: {
        type: "string",
        enum: ["relevance", "recency", "mixed"],
        default: "mixed"
      },
      expandContext: {
        type: "boolean",
        default: true,
        description: "Include surrounding context"
      }
    },
    required: ["query"]
  }
}
```

### 6.3 configure_llm_provider

```typescript
{
  name: "configure_llm_provider",
  description: "Configure LLM provider for summarization",
  inputSchema: {
    type: "object",
    properties: {
      provider: {
        type: "string",
        enum: ["ollama", "openai", "anthropic", "google"],
        description: "Provider type"
      },
      config: {
        type: "object",
        properties: {
          endpoint: { type: "string" },
          model: { type: "string" },
          apiKeyEnv: { type: "string" },
          maxTokens: { type: "number" },
          temperature: { type: "number" }
        }
      },
      setAsDefault: {
        type: "boolean",
        default: false
      }
    },
    required: ["provider", "config"]
  }
}
```

## 7. Implementation Plan

### 7.1 Phase 1: Core Infrastructure (Week 1)
- [ ] Database schema and migrations
- [ ] Provider interface and base classes
- [ ] Token counting utilities
- [ ] Basic cache implementation

### 7.2 Phase 2: Provider Implementation (Week 2)
- [ ] Ollama provider for local inference
- [ ] OpenAI provider with cost tracking
- [ ] Provider factory and configuration
- [ ] Fallback and retry logic

### 7.3 Phase 3: Summarization Engine (Week 3)
- [ ] Hierarchical summary generation
- [ ] Summary storage and retrieval
- [ ] Quality validation
- [ ] Incremental updates

### 7.4 Phase 4: Context Assembly (Week 4)
- [ ] Token budget algorithms
- [ ] Context optimization
- [ ] Progressive detail retrieval
- [ ] Performance optimization

### 7.5 Phase 5: MCP Tools & Testing (Week 5)
- [ ] Implement MCP tools
- [ ] Comprehensive testing
- [ ] Performance benchmarking
- [ ] Documentation

## 8. Configuration

### 8.1 Environment Variables
```bash
# Provider Configuration
PERSISTENCE_SUMMARIZATION_PROVIDER=ollama
PERSISTENCE_OLLAMA_ENDPOINT=http://localhost:11434
PERSISTENCE_OLLAMA_MODEL=llama2:7b

# External Provider (optional)
PERSISTENCE_OPENAI_API_KEY=sk-...
PERSISTENCE_OPENAI_MODEL=gpt-3.5-turbo

# Context Management
PERSISTENCE_CONTEXT_MAX_TOKENS=4000
PERSISTENCE_CONTEXT_CACHE_TTL=86400
PERSISTENCE_SUMMARY_UPDATE_INTERVAL=3600
```

### 8.2 Provider Priority
1. Use configured default provider
2. Fall back to secondary provider on failure
3. Use basic extraction if all providers fail

## 9. Security Considerations

### 9.1 API Key Management
- Store API keys in environment variables only
- Never log or persist API keys
- Implement key rotation support

### 9.2 Data Privacy
- Local providers preserve full privacy
- External providers: implement data minimization
- Allow users to opt-out of external providers
- Clear disclosure of data sent to external services

### 9.3 Cost Controls
- Track and display costs for external providers
- Implement spending limits
- Provide cost estimates before operations
- Allow provider-specific budgets

## 10. Performance Optimization

### 10.1 Caching Strategy
- Cache summaries with TTL
- Implement smart invalidation
- Memory-bounded cache size
- Persistent cache for offline access

### 10.2 Batch Processing
- Queue summary generation
- Process in background
- Prioritize user-requested summaries
- Implement rate limiting

### 10.3 Incremental Updates
- Update summaries incrementally
- Detect significant changes
- Reuse existing summaries when possible
- Implement summary versioning

## 11. Testing Strategy

### 11.1 Unit Tests
- Provider implementations
- Token counting accuracy
- Summary quality validation
- Context assembly logic

### 11.2 Integration Tests
- Multi-provider failover
- Cache effectiveness
- Database operations
- MCP tool functionality

### 11.3 Performance Tests
- Summary generation speed
- Token counting performance
- Cache hit rates
- Context assembly optimization

## 12. Success Metrics

### 12.1 Functional Metrics
- Summary quality scores > 0.8
- Context relevance scores > 0.85
- Token budget adherence 100%
- Cache hit rate > 60%

### 12.2 Performance Metrics
- Summary generation < 5s (local) / < 10s (external)
- Context assembly < 500ms
- Token counting < 100ms
- Cache lookup < 10ms

### 12.3 User Experience Metrics
- Reduced context switching
- Faster information retrieval
- Improved conversation continuity
- Lower cognitive load

## 13. Future Enhancements

### 13.1 Advanced Summarization
- Multi-lingual support
- Domain-specific summarization
- Sentiment preservation
- Action item extraction

### 13.2 Smart Caching
- Predictive cache warming
- User-specific cache strategies
- Distributed caching support
- Offline-first caching

### 13.3 Enhanced Providers
- Support for more local models
- Custom model fine-tuning
- Provider health monitoring
- Automatic provider selection

## 14. Conclusion

The Intelligent Context Management system transforms raw conversation history into intelligently managed, token-optimized context. By supporting both local and external LLM providers, it offers flexibility while maintaining privacy options. The hierarchical summarization and smart context assembly ensure users can work efficiently with large conversation histories while staying within token budgets.