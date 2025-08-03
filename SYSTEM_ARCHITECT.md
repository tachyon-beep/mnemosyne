# System Architect Agent Specification

## Overview

This agent is designed to comprehensively document the current MCP Persistence System and plan detailed Phase 1 implementation focused on "Enhanced Search & Discovery" with semantic embeddings. The agent operates autonomously to create technical specifications, architecture designs, and implementation plans.

## Agent Definition

**Role**: Senior System Architect for MCP Persistence System
**Scope**: System documentation, Phase 1 planning, and technical decision-making
**Expertise**: Local-first architecture, semantic search, MCP protocol, SQLite optimization

## Core Responsibilities

### 1. System Documentation
- Analyze current codebase and create comprehensive architectural documentation
- Document existing MCP tools, database schema, and system components
- Identify technical debt and improvement opportunities
- Create visual architecture diagrams (ASCII/text format)

### 2. Phase 1 Planning
- Design enhanced search system with semantic embeddings
- Plan new MCP tools and database schema modifications
- Create detailed implementation specifications
- Define success metrics and testing strategies

### 3. Technical Decision Making
- Apply gold plating analysis principles from ROADMAP.md
- Make informed trade-offs between complexity and value
- Ensure MCP compliance and local-first architecture
- Prioritize privacy, performance, and maintainability

## Key Constraints and Guidelines

### Architecture Principles
- **Local-first**: All processing must remain on user's machine
- **MCP-compliant**: All features delivered through stateless MCP tools
- **Privacy by default**: No external dependencies or cloud services
- **Progressive enhancement**: Build incrementally on solid foundation
- **Performance focused**: Sub-second response times maintained

### Technical Constraints
- Use existing SQLite database with minimal schema changes
- Integrate local embedding models (< 100MB)
- Maintain backward compatibility with current tools
- Follow established error handling patterns
- Preserve stateless tool design

### Gold Plating Guidelines (from ROADMAP.md)
- **Local Embeddings**: HIGH priority - essential for privacy and offline capability
- **Vector Storage**: MEDIUM priority - SQLite JSON arrays adequate for desktop use
- **Search Ranking**: LOW priority - basic cosine similarity sufficient initially
- **FTS Configuration**: MEDIUM priority - some customization worthwhile

## Detailed Specifications

### Phase 1 Features to Design

#### 1. Semantic Embeddings System
**Requirements**:
- Local embedding generation using sentence-transformers
- Privacy-preserving (no external API calls)
- Efficient storage in SQLite database
- Support for batch processing of existing messages

**Technical Specifications**:
- Model: all-MiniLM-L6-v2 (384 dimensions, ~23MB)
- Storage: JSON arrays in existing messages.embedding column
- Processing: Asynchronous background embedding generation
- API: New embedding service class with caching

#### 2. Vector Similarity Search
**Requirements**:
- Cosine similarity calculation using SQLite functions
- Integration with existing FTS search
- Hybrid ranking combining text and semantic similarity
- Performance optimization for large message sets

**Technical Specifications**:
- Custom SQLite function for cosine similarity
- Vector normalization for faster similarity calculation
- Composite scoring algorithm (FTS rank + semantic similarity)
- Indexed access patterns for conversation-scoped search

#### 3. Enhanced Search Tools
**Requirements**:
- New `semantic_search` MCP tool
- Enhanced `search_messages` with hybrid search
- Backward compatibility with existing tools
- Consistent response formats

**Technical Specifications**:
- Zod schemas for new tool parameters
- Relevance scoring with configurable weights
- Context-aware snippet extraction
- Cross-conversation result aggregation

#### 4. Database Schema Enhancements
**Requirements**:
- Minimal changes to existing schema
- Support for embedding storage and indexing
- Migration path for existing data
- Performance optimization

**Technical Specifications**:
```sql
-- Enhanced messages table (already has embedding BLOB column)
CREATE INDEX IF NOT EXISTS idx_messages_embedding 
    ON messages(conversation_id) 
    WHERE embedding IS NOT NULL;

-- New configuration table for embedding settings
CREATE TABLE IF NOT EXISTS embedding_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Track embedding processing status
CREATE TABLE IF NOT EXISTS embedding_queue (
    message_id TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at INTEGER NOT NULL,
    processed_at INTEGER,
    error_message TEXT,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);
```

## Implementation Plan

### Phase 1.1: Foundation (Week 1)
1. **Embedding Service Implementation**
   - Install and configure sentence-transformers
   - Create EmbeddingService class with local model loading
   - Implement batch processing for existing messages
   - Add configuration management for embedding settings

2. **Database Enhancements**
   - Add embedding configuration and queue tables
   - Implement migration scripts for schema updates
   - Create SQLite functions for vector operations
   - Add background processing for embedding generation

### Phase 1.2: Search Enhancement (Week 2)
1. **Vector Search Implementation**
   - Implement cosine similarity SQLite function
   - Create VectorSearchEngine class
   - Design hybrid search ranking algorithm
   - Add performance monitoring and optimization

2. **FTS Improvements**
   - Fix automatic FTS indexing issues identified in current system
   - Enhance query parsing with boolean operators
   - Improve relevance scoring and snippet generation
   - Add phrase search support

### Phase 1.3: Tool Integration (Week 3)
1. **New MCP Tools**
   - Implement `semantic_search` tool
   - Enhance `search_messages` with hybrid capability
   - Add `get_embedding_status` for monitoring
   - Create `reprocess_embeddings` for maintenance

2. **Tool Enhancement**
   - Update existing tools for compatibility
   - Implement consistent error handling
   - Add comprehensive input validation
   - Ensure stateless operation compliance

### Phase 1.4: Testing and Optimization (Week 4)
1. **Testing Suite**
   - Unit tests for embedding service
   - Integration tests for enhanced search
   - Performance benchmarks for large datasets
   - MCP protocol compliance verification

2. **Performance Optimization**
   - Query optimization for vector search
   - Memory management for embedding processing
   - Caching strategies for frequent searches
   - Background processing optimization

## Architectural Diagrams

### Current System Architecture
```
┌─────────────────────────────────────────────────────────┐
│                   Claude Desktop                         │
├─────────────────────────────────────────────────────────┤
│                    MCP Client                            │
└────────────────────┬───────────────────────────────────┘
                     │ stdio (JSON-RPC 2.0)
┌────────────────────┴───────────────────────────────────┐
│              MCP Persistence Server                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   Tool      │  │   Storage    │  │    Search     │ │
│  │  Handler    │  │   Manager    │  │    Engine     │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │          SQLite Database (Local)                 │   │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────┐ │   │
│  │  │Conversations│ │  Messages  │ │   FTS5      │ │   │
│  │  │            │ │            │ │   Index     │ │   │
│  │  └────────────┘ └────────────┘ └─────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Enhanced Phase 1 Architecture
```
┌─────────────────────────────────────────────────────────┐
│                   Claude Desktop                         │
├─────────────────────────────────────────────────────────┤
│                    MCP Client                            │
└────────────────────┬───────────────────────────────────┘
                     │ stdio (JSON-RPC 2.0)
┌────────────────────┴───────────────────────────────────┐
│              MCP Persistence Server                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   Tool      │  │   Storage    │  │   Enhanced    │ │
│  │  Handler    │  │   Manager    │  │    Search     │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │ Embedding   │  │   Vector     │  │    Hybrid     │ │
│  │  Service    │  │   Search     │  │   Ranking     │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │          SQLite Database (Enhanced)              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────┐ │   │
│  │  │Convos    │ │Messages  │ │  FTS5   │ │Vector│ │   │
│  │  │          │ │+Embedding│ │ Enhanced│ │Search│ │   │
│  │  └──────────┘ └──────────┘ └─────────┘ └──────┘ │   │
│  │  ┌──────────┐ ┌──────────┐                      │   │
│  │  │Embed     │ │Embed     │                      │   │
│  │  │Config    │ │Queue     │                      │   │
│  │  └──────────┘ └──────────┘                      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Search Flow Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   User Query    │───▶│  Query Parser   │───▶│ Search Strategy │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┬─────────────┴─────────────┬─────────────────┐
                       ▼                 ▼                           ▼                 ▼
               ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
               │  FTS5 Search  │ │Vector Search  │ │Context Filter │ │Time Filter    │
               └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
                       │                 │                           │                 │
                       └─────────────────┼─────────────┬─────────────┴─────────────────┘
                                         ▼             ▼
                                ┌─────────────────┐ ┌─────────────────┐
                                │ Result Merger   │ │Relevance Ranker │
                                └─────────────────┘ └─────────────────┘
                                         │             │
                                         └──────┬──────┘
                                                ▼
                                    ┌─────────────────┐
                                    │ Final Results   │
                                    │ with Snippets   │
                                    └─────────────────┘
```

## New MCP Tools Specifications

### 1. `semantic_search` Tool
**Purpose**: Pure semantic search using embeddings
**Input Schema**:
```typescript
const SemanticSearchSchema = z.object({
    query: z.string().min(1),
    conversationId: z.string().optional(),
    limit: z.number().min(1).max(50).default(10),
    threshold: z.number().min(0).max(1).default(0.3),
    includeSnippets: z.boolean().default(true)
});
```

**Response Format**:
```typescript
interface SemanticSearchResult {
    success: true;
    results: Array<{
        messageId: string;
        conversationId: string;
        content: string;
        similarity: number;
        snippet?: string;
        createdAt: number;
    }>;
    processingTime: number;
}
```

### 2. `hybrid_search` Tool
**Purpose**: Combined FTS and semantic search with weighted scoring
**Input Schema**:
```typescript
const HybridSearchSchema = z.object({
    query: z.string().min(1),
    conversationId: z.string().optional(),
    limit: z.number().min(1).max(50).default(20),
    ftsWeight: z.number().min(0).max(1).default(0.6),
    semanticWeight: z.number().min(0).max(1).default(0.4),
    matchType: z.enum(['fuzzy', 'exact', 'prefix']).default('fuzzy')
});
```

### 3. `get_embedding_status` Tool
**Purpose**: Monitor embedding processing status
**Input Schema**:
```typescript
const EmbeddingStatusSchema = z.object({
    conversationId: z.string().optional(),
    includeQueue: z.boolean().default(false)
});
```

**Response Format**:
```typescript
interface EmbeddingStatus {
    success: true;
    totalMessages: number;
    embeddedMessages: number;
    pendingQueue: number;
    processingQueue: number;
    failedQueue: number;
    lastProcessed?: number;
    estimatedCompletion?: number;
}
```

### 4. `reprocess_embeddings` Tool
**Purpose**: Trigger reprocessing of embeddings for messages
**Input Schema**:
```typescript
const ReprocessEmbeddingsSchema = z.object({
    conversationId: z.string().optional(),
    messageIds: z.array(z.string()).optional(),
    force: z.boolean().default(false)
});
```

## Success Metrics and Testing

### Performance Targets
- **Search Response Time**: < 500ms for semantic search on 10,000+ messages
- **Embedding Generation**: < 100ms per message
- **Hybrid Search**: < 800ms combining FTS and semantic results
- **Memory Usage**: < 200MB additional for embedding service

### Quality Metrics
- **Semantic Relevance**: Semantic search finds conceptually related content
- **Hybrid Accuracy**: Combined search outperforms individual methods
- **Coverage**: 95%+ of messages successfully embedded
- **Consistency**: Identical queries return consistent result rankings

### Testing Strategy
```typescript
// Performance test suite
describe('Phase 1 Performance Tests', () => {
    it('semantic search under 500ms', async () => {
        // Test with 10,000+ message dataset
    });
    
    it('embedding generation under 100ms/message', async () => {
        // Batch processing performance
    });
    
    it('hybrid search ranking quality', async () => {
        // Compare against ground truth relevance
    });
});

// Integration test suite
describe('Phase 1 Integration Tests', () => {
    it('end-to-end semantic search flow', async () => {
        // Save message -> embed -> search -> verify results
    });
    
    it('concurrent embedding processing', async () => {
        // Test thread safety and queue management
    });
    
    it('MCP protocol compliance', async () => {
        // Verify all new tools follow MCP specification
    });
});
```

## Risk Analysis and Mitigation

### Technical Risks
1. **Embedding Model Size**: Risk of large model impacting performance
   - **Mitigation**: Use lightweight model (all-MiniLM-L6-v2, ~23MB)
   - **Fallback**: Graceful degradation to FTS-only search

2. **SQLite Performance**: Vector operations may slow database
   - **Mitigation**: Implement efficient indexing and caching
   - **Monitoring**: Track query performance and optimize bottlenecks

3. **Memory Usage**: Embedding service consuming excessive memory
   - **Mitigation**: Lazy loading, batch processing, and garbage collection
   - **Limits**: Configure maximum concurrent embeddings

### Integration Risks
1. **MCP Compatibility**: New tools breaking existing workflows
   - **Mitigation**: Extensive backward compatibility testing
   - **Versioning**: Clear API versioning for tool evolution

2. **Data Migration**: Existing conversations needing embeddings
   - **Mitigation**: Background processing with progress tracking
   - **Recovery**: Rollback capability for failed migrations

## Future Phase Integration

### Phase 2 Preparation
- **Context Management**: Embedding quality affects summarization
- **Token Optimization**: Semantic search improves context selection
- **Performance Baseline**: Establish metrics for intelligent features

### Phase 3 Enablement
- **Entity Recognition**: Embeddings support semantic entity matching
- **Cross-Conversation**: Vector similarity enables knowledge graphs
- **Pattern Detection**: Semantic clusters reveal conversation themes

## Configuration and Deployment

### Environment Variables
```bash
# Embedding configuration
PERSISTENCE_ENABLE_EMBEDDINGS=true
PERSISTENCE_EMBEDDING_MODEL=all-MiniLM-L6-v2
PERSISTENCE_EMBEDDING_BATCH_SIZE=50
PERSISTENCE_EMBEDDING_CONCURRENT_LIMIT=2

# Search configuration
PERSISTENCE_HYBRID_FTS_WEIGHT=0.6
PERSISTENCE_HYBRID_SEMANTIC_WEIGHT=0.4
PERSISTENCE_SEMANTIC_THRESHOLD=0.3

# Performance tuning
PERSISTENCE_VECTOR_CACHE_SIZE=1000
PERSISTENCE_EMBEDDING_QUEUE_SIZE=500
```

### Claude Desktop Integration
```json
{
  "mcpServers": {
    "persistence": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "PERSISTENCE_DB_PATH": "~/Documents/Claude/conversations.db",
        "PERSISTENCE_ENABLE_EMBEDDINGS": "true",
        "PERSISTENCE_EMBEDDING_MODEL": "all-MiniLM-L6-v2",
        "PERSISTENCE_LOG_LEVEL": "info"
      }
    }
  }
}
```

## Agent Usage Instructions

This system architect agent should be used when:

1. **Planning major system enhancements** requiring architectural decisions
2. **Integrating multiple system components** with complex interactions
3. **Making technical trade-offs** between performance, complexity, and maintainability
4. **Designing new features** that span multiple layers of the system
5. **Creating implementation roadmaps** with detailed technical specifications

The agent provides comprehensive analysis covering architecture, implementation details, testing strategies, risk assessment, and deployment considerations while maintaining alignment with the project's local-first, privacy-focused, and MCP-compliant principles.