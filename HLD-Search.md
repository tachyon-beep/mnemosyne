# MCP Persistence System - Enhanced Search & Discovery Design

## Executive Summary

This document presents the detailed design for Phase 1 of the MCP Persistence System enhancement, focusing on transforming basic keyword search into intelligent semantic content discovery. The design maintains the core principles of local-first operation, MCP compliance, and progressive enhancement while adding sophisticated search capabilities.

Key enhancements:

- **Semantic Understanding**: Local embedding generation for privacy-preserving semantic search
- **Hybrid Search**: Combined FTS and semantic search with intelligent ranking
- **Performance Optimization**: Sub-second search across large conversation histories
- **Enhanced FTS**: Fixed indexing issues and improved tokenization
- **MCP-Compliant Tools**: New stateless tools for semantic and hybrid search

## System Architecture Evolution

### Enhanced Architecture

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
│  │  Handler    │  │   Manager    │  │   Search      │ │
│  │             │  │              │  │   Engine      │ │
│  └─────────────┘  └──────────────┘  └───────┬───────┘ │
│                                              │          │
│  ┌─────────────────────────────────────────┴────────┐  │
│  │          Search Subsystem Components              │  │
│  │  ┌──────────────┐  ┌─────────────┐  ┌──────────┐ │  │
│  │  │  Embedding   │  │    FTS      │  │  Hybrid  │ │  │
│  │  │   Manager    │  │  Enhanced   │  │  Ranker  │ │  │
│  │  └──────────────┘  └─────────────┘  └──────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────┐   │
│  │          SQLite Database (Local)                 │   │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────┐ │   │
│  │  │Conversations│ │  Messages  │ │   Search    │ │   │
│  │  │            │ │ +Embeddings│ │  Indexes    │ │   │
│  │  └────────────┘ └────────────┘ └─────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Component Interactions

```
User Query → MCP Tool Handler → Enhanced Search Engine
                                        ↓
                    ┌──────────────────────────────────┐
                    │  Query Analysis & Routing        │
                    └────────┬─────────────┬───────────┘
                             ↓             ↓
                    ┌────────────┐  ┌──────────────┐
                    │    FTS     │  │  Embedding   │
                    │   Search   │  │   Search     │
                    └────────────┘  └──────────────┘
                             ↓             ↓
                    ┌──────────────────────────────────┐
                    │     Hybrid Result Ranking        │
                    └──────────────────────────────────┘
                                        ↓
                              Ranked Results → Client
```

## Enhanced Database Schema

### Schema Modifications

```sql
-- Enhanced messages table with embedding support
ALTER TABLE messages ADD COLUMN embedding TEXT; -- JSON array of floats

-- Search configuration and metadata
CREATE TABLE IF NOT EXISTS search_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Insert default configuration
INSERT OR REPLACE INTO search_config (key, value, updated_at) VALUES
    ('embedding_model', '"all-MiniLM-L6-v2"', unixepoch()),
    ('embedding_dimensions', '384', unixepoch()),
    ('fts_tokenizer', 'porter unicode61', unixepoch()),
    ('hybrid_search_weights', '{"semantic": 0.6, "fts": 0.4}', unixepoch());

-- Enhanced FTS configuration with better tokenization
DROP TABLE IF EXISTS messages_fts;
CREATE VIRTUAL TABLE messages_fts USING fts5(
    content,
    content=messages,
    content_rowid=rowid,
    tokenize='porter unicode61 remove_diacritics 1'
);

-- Automatic FTS indexing triggers
CREATE TRIGGER messages_fts_insert AFTER INSERT ON messages BEGIN
    INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
END;

CREATE TRIGGER messages_fts_delete AFTER DELETE ON messages BEGIN
    DELETE FROM messages_fts WHERE rowid = old.rowid;
END;

CREATE TRIGGER messages_fts_update AFTER UPDATE OF content ON messages BEGIN
    UPDATE messages_fts SET content = new.content WHERE rowid = new.rowid;
END;

-- Indexes for embedding queries
CREATE INDEX idx_messages_embedding 
    ON messages(conversation_id, created_at DESC) 
    WHERE embedding IS NOT NULL;

-- Performance tracking
CREATE TABLE IF NOT EXISTS search_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_type TEXT NOT NULL CHECK (query_type IN ('fts', 'semantic', 'hybrid')),
    query_text TEXT NOT NULL,
    result_count INTEGER NOT NULL,
    execution_time_ms INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_search_metrics_time ON search_metrics(created_at DESC);
```

## Component Specifications

### Embedding Manager

The EmbeddingManager handles all embedding generation and storage operations:

```typescript
interface EmbeddingManager {
    // Initialize with local model
    initialize(modelPath: string): Promise<void>;
    
    // Generate embeddings for text
    generateEmbedding(text: string): Promise<number[]>;
    
    // Batch processing for efficiency
    generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
    
    // Store embeddings in database
    storeEmbedding(messageId: string, embedding: number[]): Promise<void>;
    
    // Retrieve embeddings
    getEmbedding(messageId: string): Promise<number[] | null>;
    
    // Compute similarity
    cosineSimilarity(embedding1: number[], embedding2: number[]): number;
}

class LocalEmbeddingManager implements EmbeddingManager {
    private model: any; // sentence-transformers model
    private readonly modelName = 'all-MiniLM-L6-v2';
    private readonly dimensions = 384;
    private embeddingCache = new Map<string, number[]>();
    
    async initialize(modelPath: string): Promise<void> {
        // Load model from local path
        // Use ONNX runtime for performance
        this.model = await loadONNXModel(modelPath);
    }
    
    async generateEmbedding(text: string): Promise<number[]> {
        // Normalize and truncate text
        const normalized = this.normalizeText(text);
        
        // Generate embedding
        const embedding = await this.model.encode(normalized);
        
        // L2 normalize for cosine similarity
        return this.normalizeVector(embedding);
    }
    
    cosineSimilarity(a: number[], b: number[]): number {
        // Vectors are pre-normalized, so dot product = cosine similarity
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }
    
    private normalizeText(text: string): string {
        // Remove excessive whitespace
        // Truncate to model's max length (256 tokens)
        return text.trim().substring(0, 1024);
    }
    
    private normalizeVector(vector: number[]): number[] {
        const magnitude = Math.sqrt(
            vector.reduce((sum, val) => sum + val * val, 0)
        );
        return vector.map(val => val / magnitude);
    }
}
```

### Enhanced Search Engine

The search engine orchestrates different search strategies:

```typescript
interface SearchResult {
    messageId: string;
    conversationId: string;
    content: string;
    score: number;
    highlights: string[];
    metadata: {
        matchType: 'fts' | 'semantic' | 'hybrid';
        subScores?: {
            fts?: number;
            semantic?: number;
        };
    };
}

interface SearchOptions {
    query: string;
    limit?: number;
    offset?: number;
    conversationId?: string;
    startDate?: number;
    endDate?: number;
    matchType?: 'fuzzy' | 'exact' | 'prefix';
    hybridWeights?: {
        semantic: number;
        fts: number;
    };
}

class EnhancedSearchEngine {
    constructor(
        private db: Database,
        private embeddingManager: EmbeddingManager
    ) {}
    
    async search(options: SearchOptions): Promise<SearchResult[]> {
        const startTime = Date.now();
        
        // Analyze query to determine search strategy
        const strategy = this.analyzeQuery(options.query);
        
        let results: SearchResult[];
        
        switch (strategy) {
            case 'semantic_only':
                results = await this.semanticSearch(options);
                break;
            case 'fts_only':
                results = await this.ftsSearch(options);
                break;
            case 'hybrid':
            default:
                results = await this.hybridSearch(options);
        }
        
        // Track metrics
        await this.trackSearchMetrics(
            strategy,
            options.query,
            results.length,
            Date.now() - startTime
        );
        
        return results;
    }
    
    private async semanticSearch(options: SearchOptions): Promise<SearchResult[]> {
        // Generate query embedding
        const queryEmbedding = await this.embeddingManager.generateEmbedding(
            options.query
        );
        
        // Build SQL query
        const sql = `
            SELECT 
                m.id,
                m.conversation_id,
                m.content,
                m.embedding,
                m.created_at
            FROM messages m
            WHERE m.embedding IS NOT NULL
            ${options.conversationId ? 'AND m.conversation_id = ?' : ''}
            ${options.startDate ? 'AND m.created_at >= ?' : ''}
            ${options.endDate ? 'AND m.created_at <= ?' : ''}
            ORDER BY m.created_at DESC
            LIMIT 1000
        `;
        
        // Execute query and compute similarities
        const messages = await this.db.all(sql, ...this.buildParams(options));
        
        // Score and rank by similarity
        const scored = messages.map(msg => {
            const msgEmbedding = JSON.parse(msg.embedding);
            const similarity = this.embeddingManager.cosineSimilarity(
                queryEmbedding,
                msgEmbedding
            );
            
            return {
                messageId: msg.id,
                conversationId: msg.conversation_id,
                content: msg.content,
                score: similarity,
                highlights: this.generateSemanticHighlights(
                    msg.content,
                    options.query
                ),
                metadata: {
                    matchType: 'semantic' as const
                }
            };
        });
        
        // Sort by score and apply limit
        return scored
            .sort((a, b) => b.score - a.score)
            .slice(options.offset || 0, (options.offset || 0) + (options.limit || 20));
    }
    
    private async ftsSearch(options: SearchOptions): Promise<SearchResult[]> {
        // Prepare FTS query
        const ftsQuery = this.prepareFTSQuery(options.query, options.matchType);
        
        const sql = `
            SELECT 
                m.id,
                m.conversation_id,
                m.content,
                highlight(messages_fts, 0, '<mark>', '</mark>') as highlighted,
                rank
            FROM messages m
            JOIN messages_fts ON m.rowid = messages_fts.rowid
            WHERE messages_fts MATCH ?
            ${options.conversationId ? 'AND m.conversation_id = ?' : ''}
            ${options.startDate ? 'AND m.created_at >= ?' : ''}
            ${options.endDate ? 'AND m.created_at <= ?' : ''}
            ORDER BY rank
            LIMIT ? OFFSET ?
        `;
        
        const results = await this.db.all(
            sql,
            ftsQuery,
            ...this.buildParams(options),
            options.limit || 20,
            options.offset || 0
        );
        
        return results.map(row => ({
            messageId: row.id,
            conversationId: row.conversation_id,
            content: row.content,
            score: -row.rank, // FTS rank is negative
            highlights: this.extractHighlights(row.highlighted),
            metadata: {
                matchType: 'fts' as const
            }
        }));
    }
    
    private async hybridSearch(options: SearchOptions): Promise<SearchResult[]> {
        // Get both result sets in parallel
        const [semanticResults, ftsResults] = await Promise.all([
            this.semanticSearch({ ...options, limit: 50 }),
            this.ftsSearch({ ...options, limit: 50 })
        ]);
        
        // Merge and re-rank
        const weights = options.hybridWeights || { semantic: 0.6, fts: 0.4 };
        const merged = this.mergeResults(
            semanticResults,
            ftsResults,
            weights
        );
        
        // Apply final limit
        return merged.slice(
            options.offset || 0,
            (options.offset || 0) + (options.limit || 20)
        );
    }
    
    private mergeResults(
        semantic: SearchResult[],
        fts: SearchResult[],
        weights: { semantic: number; fts: number }
    ): SearchResult[] {
        const resultMap = new Map<string, SearchResult>();
        
        // Process semantic results
        for (const result of semantic) {
            resultMap.set(result.messageId, {
                ...result,
                score: result.score * weights.semantic,
                metadata: {
                    matchType: 'hybrid',
                    subScores: {
                        semantic: result.score
                    }
                }
            });
        }
        
        // Merge FTS results
        for (const result of fts) {
            const existing = resultMap.get(result.messageId);
            if (existing) {
                // Combine scores
                existing.score += result.score * weights.fts;
                existing.metadata.subScores!.fts = result.score;
                // Merge highlights
                existing.highlights = [
                    ...new Set([...existing.highlights, ...result.highlights])
                ];
            } else {
                resultMap.set(result.messageId, {
                    ...result,
                    score: result.score * weights.fts,
                    metadata: {
                        matchType: 'hybrid',
                        subScores: {
                            fts: result.score
                        }
                    }
                });
            }
        }
        
        // Sort by combined score
        return Array.from(resultMap.values())
            .sort((a, b) => b.score - a.score);
    }
}
```

## Tool Definitions

### semantic_search Tool

```typescript
const semanticSearchTool: Tool = {
    name: 'semantic_search',
    description: 'Search messages using semantic similarity',
    inputSchema: z.object({
        query: z.string().min(1).describe('Search query for semantic matching'),
        limit: z.number().min(1).max(100).default(20)
            .describe('Maximum results to return'),
        offset: z.number().min(0).default(0)
            .describe('Number of results to skip'),
        conversationId: z.string().optional()
            .describe('Limit search to specific conversation'),
        startDate: z.string().datetime().optional()
            .describe('Filter by start date (ISO 8601)'),
        endDate: z.string().datetime().optional()
            .describe('Filter by end date (ISO 8601)'),
        threshold: z.number().min(0).max(1).default(0.7)
            .describe('Minimum similarity threshold')
    }),
    
    handler: async (params, context) => {
        const searchEngine = context.searchEngine as EnhancedSearchEngine;
        
        try {
            // Validate date parameters
            const startTimestamp = params.startDate 
                ? new Date(params.startDate).getTime() 
                : undefined;
            const endTimestamp = params.endDate 
                ? new Date(params.endDate).getTime() 
                : undefined;
            
            // Perform semantic search
            const results = await searchEngine.search({
                query: params.query,
                limit: params.limit,
                offset: params.offset,
                conversationId: params.conversationId,
                startDate: startTimestamp,
                endDate: endTimestamp
            });
            
            // Filter by threshold
            const filtered = results.filter(r => r.score >= params.threshold);
            
            return {
                results: filtered.map(r => ({
                    messageId: r.messageId,
                    conversationId: r.conversationId,
                    content: r.content,
                    similarity: r.score,
                    preview: this.createPreview(r.content, r.highlights)
                })),
                totalCount: filtered.length,
                hasMore: filtered.length === params.limit,
                metadata: {
                    model: 'all-MiniLM-L6-v2',
                    threshold: params.threshold,
                    searchDuration: context.searchDuration
                }
            };
        } catch (error) {
            throw new ToolError('SemanticSearchError', error.message);
        }
    }
};
```

### hybrid_search Tool

```typescript
const hybridSearchTool: Tool = {
    name: 'hybrid_search',
    description: 'Search using combined semantic and keyword matching',
    inputSchema: z.object({
        query: z.string().min(1).describe('Search query'),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
        conversationId: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        matchType: z.enum(['fuzzy', 'exact', 'prefix']).default('fuzzy'),
        weights: z.object({
            semantic: z.number().min(0).max(1).default(0.6),
            fts: z.number().min(0).max(1).default(0.4)
        }).refine(w => Math.abs(w.semantic + w.fts - 1) < 0.01, {
            message: 'Weights must sum to 1'
        }).optional()
    }),
    
    handler: async (params, context) => {
        const searchEngine = context.searchEngine as EnhancedSearchEngine;
        
        try {
            const results = await searchEngine.search({
                query: params.query,
                limit: params.limit,
                offset: params.offset,
                conversationId: params.conversationId,
                startDate: params.startDate ? new Date(params.startDate).getTime() : undefined,
                endDate: params.endDate ? new Date(params.endDate).getTime() : undefined,
                matchType: params.matchType,
                hybridWeights: params.weights
            });
            
            return {
                results: results.map(r => ({
                    messageId: r.messageId,
                    conversationId: r.conversationId,
                    content: r.content,
                    score: r.score,
                    highlights: r.highlights,
                    matchType: r.metadata.matchType,
                    subScores: r.metadata.subScores
                })),
                totalCount: results.length,
                hasMore: results.length === params.limit,
                metadata: {
                    queryType: 'hybrid',
                    weights: params.weights || { semantic: 0.6, fts: 0.4 },
                    searchDuration: context.searchDuration
                },
                pagination: {
                    offset: params.offset,
                    limit: params.limit
                }
            };
        } catch (error) {
            throw new ToolError('HybridSearchError', error.message);
        }
    }
};
```

## Implementation Strategy

### Phase 1.1: Foundation (Week 1)

**Objectives**:
- Set up embedding infrastructure
- Fix FTS indexing issues
- Create database schema changes

**Deliverables**:
1. **Embedding Service Setup**
   - Download and integrate all-MiniLM-L6-v2 model
   - Implement ONNX runtime for performance
   - Create embedding generation pipeline
   - Unit tests for embedding generation

2. **Database Schema Updates**
   - Apply schema modifications
   - Implement FTS triggers
   - Create migration scripts
   - Verify backward compatibility

3. **Basic Embedding Storage**
   - Implement embedding storage in messages table
   - Create batch processing for existing messages
   - Add embedding cache layer

### Phase 1.2: Search Implementation (Week 2)

**Objectives**:
- Implement semantic search
- Enhance FTS capabilities
- Create search infrastructure

**Deliverables**:
1. **Semantic Search Engine**
   - Implement vector similarity search
   - Create efficient scoring algorithms
   - Add result ranking logic
   - Performance optimization

2. **Enhanced FTS Implementation**
   - Fix automatic indexing
   - Implement advanced tokenization
   - Add query parsing improvements
   - Create highlight extraction

3. **Search Metrics & Monitoring**
   - Implement performance tracking
   - Create search analytics
   - Add debugging capabilities

### Phase 1.3: Tool Integration (Week 3)

**Objectives**:
- Implement new MCP tools
- Create hybrid search
- Integrate with existing system

**Deliverables**:
1. **MCP Tool Implementation**
   - Implement semantic_search tool
   - Implement hybrid_search tool
   - Add comprehensive error handling
   - Create tool documentation

2. **Hybrid Search Algorithm**
   - Implement result merging
   - Create intelligent ranking
   - Add weight optimization
   - Test edge cases

3. **Integration Testing**
   - End-to-end search workflows
   - Performance benchmarking
   - Error scenario testing

### Phase 1.4: Optimization & Polish (Week 4)

**Objectives**:
- Performance optimization
- User experience improvements
- Documentation and deployment

**Deliverables**:
1. **Performance Optimization**
   - Implement caching strategies
   - Optimize database queries
   - Add connection pooling
   - Profile and fix bottlenecks

2. **User Experience**
   - Improve result relevance
   - Add search suggestions
   - Enhance error messages
   - Create usage examples

3. **Documentation & Deployment**
   - Update user documentation
   - Create deployment guide
   - Add configuration examples
   - Release notes

## Performance Targets

### Embedding Generation
- **Single message**: < 100ms
- **Batch (100 messages)**: < 5 seconds
- **Model loading**: < 2 seconds on startup

### Search Performance
- **Semantic search (1000 messages)**: < 500ms
- **FTS search**: < 100ms
- **Hybrid search**: < 750ms
- **Result ranking**: < 50ms

### Resource Usage
- **Memory**: < 500MB for model + embeddings cache
- **CPU**: < 50% during search operations
- **Storage**: ~1.5KB per message (including embedding)

## Testing Strategy

### Unit Tests
- Embedding generation accuracy
- Vector similarity calculations
- FTS query parsing
- Result ranking algorithms
- Error handling paths

### Integration Tests
- End-to-end search workflows
- Database transaction handling
- MCP protocol compliance
- Tool parameter validation
- Concurrent search operations

### Performance Tests
- Load testing with 10k+ messages
- Concurrent user simulations
- Memory leak detection
- CPU profiling
- Query optimization validation

### Acceptance Tests
- Semantic search finds related concepts
- Hybrid search balances both approaches
- Performance meets targets
- Backward compatibility maintained
- Error messages are helpful

## Security and Privacy Considerations

### Local-Only Processing
- All embeddings generated locally
- No external API calls for search
- Model files stored securely
- No telemetry or usage tracking

### Data Protection
- Embeddings stored in local SQLite only
- No embedding export functionality
- Secure model file handling
- Memory cleared after processing

### Access Control
- Same permissions as base system
- No additional authentication
- Audit logging for searches
- Rate limiting for resource protection

## Migration and Rollback

### Migration Process
1. Backup existing database
2. Apply schema modifications
3. Generate embeddings for existing messages (background process)
4. Enable new search tools
5. Verify functionality

### Rollback Strategy
1. Disable new search tools
2. Revert to original search_messages tool
3. Drop embedding column (optional)
4. Restore from backup if needed

### Data Compatibility
- New fields are optional
- Existing tools continue to work
- Gradual migration supported
- No data loss on rollback

## Future Considerations

### Phase 2 Preparation
- Context management APIs
- Summarization infrastructure
- Token counting utilities
- Conversation analytics

### Scalability Path
- Incremental embedding updates
- Partitioned search indexes
- Distributed processing option
- Cloud sync preparation

### Enhancement Opportunities
- Multi-language support
- Custom embedding models
- Query expansion techniques
- Learning from user feedback

## Conclusion

This enhanced search design transforms the MCP Persistence System from basic keyword matching to intelligent semantic understanding while maintaining the core principles of privacy, local operation, and MCP compliance. The implementation provides immediate value through better search results while laying the foundation for future phases of cross-conversation intelligence and proactive assistance.