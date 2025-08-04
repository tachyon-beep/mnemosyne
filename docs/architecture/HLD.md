# MCP Persistence System Design - Revised Architecture

## Executive Summary

This document presents a pragmatic, implementation-ready design for adding conversation persistence to Claude Desktop using the Model Context Protocol (MCP). The design prioritizes simplicity, local-first operation, and incremental enhancement while maintaining full MCP compliance.

**Implementation Status**: Phase 1 ✅ Complete | Phase 2 ✅ Complete

Key principles:

- **Local-first**: SQLite as primary storage with optional cloud sync
- **MCP-compliant**: Stateless tools with proper JSON-RPC 2.0 implementation
- **Progressive enhancement**: Start simple, add features based on proven need
- **Desktop-optimized**: Designed for single-user desktop application constraints
- **Privacy by default**: Local storage with explicit opt-in for any cloud features

## System Architecture Overview

### Core Components

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
│  │  │Conversations│ │  Messages  │ │   Search    │ │   │
│  │  │            │ │            │ │   Indexes   │ │   │
│  │  └────────────┘ └────────────┘ └─────────────┘ │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Simplified Storage Design

The revised architecture uses a single SQLite database with carefully designed schemas optimized for conversation persistence:

```sql
-- Core conversation storage
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    title TEXT,
    metadata TEXT -- JSON
);

CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    parent_message_id TEXT,
    metadata TEXT, -- JSON
    embedding BLOB, -- Optional: stored as bytes
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_message_id) REFERENCES messages(id)
);

-- Full-text search support
CREATE VIRTUAL TABLE messages_fts USING fts5(
    content,
    content=messages,
    content_rowid=rowid
);

-- Indexes for common queries
CREATE INDEX idx_messages_conversation_time 
    ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_parent 
    ON messages(parent_message_id) 
    WHERE parent_message_id IS NOT NULL;

-- Key-value store for preferences and state
CREATE TABLE persistence_state (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Phase 2: Context Management Tables
CREATE TABLE conversation_summaries (
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
    metadata TEXT, -- JSON
    quality_score REAL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    UNIQUE(conversation_id, level)
);

CREATE TABLE llm_providers (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('ollama', 'openai', 'claude')),
    name TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    api_key TEXT,
    model_name TEXT NOT NULL,
    max_tokens INTEGER NOT NULL DEFAULT 4096,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    priority INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    last_used_at INTEGER,
    metadata TEXT -- JSON
);

-- Indexes for Phase 2
CREATE INDEX idx_summaries_conversation 
    ON conversation_summaries(conversation_id);
CREATE INDEX idx_summaries_level 
    ON conversation_summaries(level);
CREATE INDEX idx_providers_active 
    ON llm_providers(is_active, priority DESC);
```

## MCP Protocol Implementation

### Server Initialization

The persistence server strictly follows MCP protocol specifications:

```typescript
interface PersistenceServerConfig {
    databasePath: string;
    maxDatabaseSizeMB: number;
    enableEmbeddings: boolean;
    embeddingModel?: string;
}

class MCPPersistenceServer {
    private server: Server;
    private db: Database;
    private config: PersistenceServerConfig;

    async initialize(): Promise<void> {
        // Initialize SQLite with proper settings
        this.db = await this.initializeDatabase();
        
        // Create MCP server with stdio transport
        this.server = new Server({
            name: "claude-persistence",
            version: "1.0.0"
        }, {
            capabilities: {
                tools: {}  // Tools are stateless per MCP spec
            }
        });

        // Register all tools
        this.registerTools();

        // Start server
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
    }

    private async initializeDatabase(): Promise<Database> {
        const db = new Database(this.config.databasePath);
        
        // Enable WAL mode for better concurrency
        db.pragma('journal_mode = WAL');
        
        // Set reasonable cache size (default 2MB)
        db.pragma('cache_size = -2000');
        
        // Enable foreign keys
        db.pragma('foreign_keys = ON');
        
        // Run migrations
        await this.runMigrations(db);
        
        return db;
    }
}
```

### Tool Definitions

All tools are stateless functions that complete within a single request-response cycle:

```typescript
private registerTools(): void {
    // Save a message to conversation history
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        if (request.params.name === "save_message") {
            return this.handleSaveMessage(request.params.arguments);
        }
        // ... other tools
    });
}

// Tool schemas using Zod for validation
const SaveMessageSchema = z.object({
    conversationId: z.string().optional(),
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
    parentMessageId: z.string().optional(),
    metadata: z.record(z.any()).optional()
});

const SearchMessagesSchema = z.object({
    query: z.string(),
    conversationId: z.string().optional(),
    limit: z.number().min(1).max(100).default(20),
    offset: z.number().min(0).default(0),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
});

const GetConversationSchema = z.object({
    conversationId: z.string(),
    includeMessages: z.boolean().default(true),
    messageLimit: z.number().min(1).max(1000).default(100),
    beforeMessageId: z.string().optional()
});
```

### Tool Implementations

Each tool implementation follows a consistent pattern with proper error handling:

```typescript
async handleSaveMessage(args: unknown): Promise<ToolResult> {
    try {
        const params = SaveMessageSchema.parse(args);
        
        // Start transaction for consistency
        const tx = this.db.transaction(() => {
            // Create or verify conversation exists
            let conversationId = params.conversationId;
            if (!conversationId) {
                conversationId = this.generateId();
                this.db.prepare(`
                    INSERT INTO conversations (id, created_at, updated_at, metadata)
                    VALUES (?, ?, ?, ?)
                `).run(
                    conversationId,
                    Date.now(),
                    Date.now(),
                    JSON.stringify({})
                );
            }
            
            // Insert message
            const messageId = this.generateId();
            this.db.prepare(`
                INSERT INTO messages (
                    id, conversation_id, role, content, 
                    created_at, parent_message_id, metadata
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
                messageId,
                conversationId,
                params.role,
                params.content,
                Date.now(),
                params.parentMessageId || null,
                JSON.stringify(params.metadata || {})
            );
            
            // Update FTS index
            this.db.prepare(`
                INSERT INTO messages_fts (rowid, content)
                VALUES (last_insert_rowid(), ?)
            `).run(params.content);
            
            // Update conversation timestamp
            this.db.prepare(`
                UPDATE conversations 
                SET updated_at = ? 
                WHERE id = ?
            `).run(Date.now(), conversationId);
            
            return { conversationId, messageId };
        });
        
        const result = tx();
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    success: true,
                    conversationId: result.conversationId,
                    messageId: result.messageId
                })
            }]
        };
        
    } catch (error) {
        return this.handleError(error);
    }
}

async handleSearchMessages(args: unknown): Promise<ToolResult> {
    try {
        const params = SearchMessagesSchema.parse(args);
        
        // Build query dynamically based on parameters
        let query = `
            SELECT 
                m.id,
                m.conversation_id,
                m.role,
                m.content,
                m.created_at,
                m.metadata,
                c.title as conversation_title,
                snippet(messages_fts, -1, '<mark>', '</mark>', '...', 32) as snippet
            FROM messages m
            JOIN conversations c ON m.conversation_id = c.id
            JOIN messages_fts ON messages_fts.rowid = m.rowid
            WHERE messages_fts MATCH ?
        `;
        
        const queryParams: any[] = [params.query];
        
        if (params.conversationId) {
            query += ' AND m.conversation_id = ?';
            queryParams.push(params.conversationId);
        }
        
        if (params.startDate) {
            query += ' AND m.created_at >= ?';
            queryParams.push(new Date(params.startDate).getTime());
        }
        
        if (params.endDate) {
            query += ' AND m.created_at <= ?';
            queryParams.push(new Date(params.endDate).getTime());
        }
        
        query += ' ORDER BY rank, m.created_at DESC LIMIT ? OFFSET ?';
        queryParams.push(params.limit, params.offset);
        
        const results = this.db.prepare(query).all(...queryParams);
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    success: true,
                    results: results.map(r => ({
                        ...r,
                        metadata: JSON.parse(r.metadata || '{}')
                    })),
                    total: results.length
                })
            }]
        };
        
    } catch (error) {
        return this.handleError(error);
    }
}
```

## Search Implementation

### Full-Text Search with FTS5

SQLite's FTS5 provides powerful search capabilities without external dependencies:

```typescript
class SearchEngine {
    private db: Database;
    
    // Configure FTS5 for optimal conversation search
    async initialize() {
        // Create custom tokenizer for better conversation matching
        this.db.prepare(`
            INSERT INTO messages_fts(messages_fts, rank) 
            VALUES('rank', 'bm25(1.0, 0.75)')
        `).run();
    }
    
    // Enhanced search with query expansion
    async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
        // Escape special FTS5 characters
        const sanitizedQuery = this.sanitizeFTSQuery(query);
        
        // Build FTS5 query with proximity search
        const ftsQuery = this.buildFTSQuery(sanitizedQuery, options);
        
        // Execute search with ranking
        const results = this.db.prepare(`
            SELECT 
                m.*,
                snippet(messages_fts, -1, ?, ?, '...', 32) as snippet,
                rank
            FROM messages m
            JOIN messages_fts ON messages_fts.rowid = m.rowid
            WHERE messages_fts MATCH ?
            ORDER BY rank
            LIMIT ? OFFSET ?
        `).all(
            options.highlightStart || '<mark>',
            options.highlightEnd || '</mark>',
            ftsQuery,
            options.limit || 20,
            options.offset || 0
        );
        
        return this.processResults(results);
    }
    
    private sanitizeFTSQuery(query: string): string {
        // Escape special characters: " ^ * ( )
        return query.replace(/["\^\*\(\)]/g, ' ');
    }
    
    private buildFTSQuery(query: string, options: SearchOptions): string {
        const terms = query.split(/\s+/).filter(t => t.length > 0);
        
        if (options.matchType === 'exact') {
            return `"${terms.join(' ')}"`;
        } else if (options.matchType === 'prefix') {
            return terms.map(t => `${t}*`).join(' ');
        } else {
            // Default: all terms with OR
            return terms.join(' OR ');
        }
    }
}
```

### Optional Vector Search Enhancement

For users who need semantic search, embeddings can be stored in SQLite and searched efficiently:

```typescript
class VectorSearchEngine {
    private db: Database;
    private embedder?: EmbeddingGenerator;
    
    async initialize(enableEmbeddings: boolean, model?: string) {
        if (enableEmbeddings) {
            this.embedder = new LocalEmbeddingGenerator(model);
            await this.createVectorIndex();
        }
    }
    
    private async createVectorIndex() {
        // Create vector similarity search using SQLite's JSON functions
        // Vectors stored as JSON arrays in embedding column
        this.db.function('cosine_similarity', (a: string, b: string) => {
            const vecA = JSON.parse(a);
            const vecB = JSON.parse(b);
            return this.cosineSimilarity(vecA, vecB);
        });
    }
    
    async searchSemantic(query: string, limit: number = 20): Promise<SearchResult[]> {
        if (!this.embedder) {
            throw new Error('Embeddings not enabled');
        }
        
        const queryEmbedding = await this.embedder.embed(query);
        
        // Find similar messages using cosine similarity
        const results = this.db.prepare(`
            SELECT 
                id,
                conversation_id,
                content,
                cosine_similarity(embedding, ?) as similarity
            FROM messages
            WHERE embedding IS NOT NULL
            ORDER BY similarity DESC
            LIMIT ?
        `).all(JSON.stringify(queryEmbedding), limit);
        
        return results;
    }
}
```

## Memory Management

### Conversation Lifecycle

```typescript
class ConversationManager {
    private db: Database;
    private readonly MAX_DB_SIZE_MB = 1000; // 1GB default limit
    
    async createConversation(title?: string): Promise<string> {
        const id = this.generateId();
        const now = Date.now();
        
        this.db.prepare(`
            INSERT INTO conversations (id, created_at, updated_at, title, metadata)
            VALUES (?, ?, ?, ?, ?)
        `).run(id, now, now, title || null, JSON.stringify({}));
        
        return id;
    }
    
    async pruneOldConversations(): Promise<number> {
        // Check database size
        const dbSize = await this.getDatabaseSize();
        if (dbSize < this.MAX_DB_SIZE_MB * 0.8) {
            return 0; // Only prune at 80% capacity
        }
        
        // Delete conversations older than retention period
        const retentionDays = await this.getRetentionDays();
        const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
        
        const result = this.db.prepare(`
            DELETE FROM conversations
            WHERE updated_at < ?
            AND id NOT IN (
                SELECT conversation_id 
                FROM persistence_state 
                WHERE key = 'pinned_conversations'
            )
        `).run(cutoffTime);
        
        // Vacuum to reclaim space
        this.db.prepare('VACUUM').run();
        
        return result.changes;
    }
}
```

### State Management

The system maintains conversation state without violating MCP's stateless tool requirement:

```typescript
class StateManager {
    private db: Database;
    
    // Store active conversation ID for context
    async setActiveConversation(conversationId: string): Promise<void> {
        this.upsertState('active_conversation', conversationId);
    }
    
    async getActiveConversation(): Promise<string | null> {
        const row = this.db.prepare(`
            SELECT value FROM persistence_state WHERE key = ?
        `).get('active_conversation');
        
        return row?.value || null;
    }
    
    // Window size for context inclusion
    async setContextWindow(messages: number): Promise<void> {
        this.upsertState('context_window', messages.toString());
    }
    
    private upsertState(key: string, value: string): void {
        this.db.prepare(`
            INSERT INTO persistence_state (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
        `).run(key, value, Date.now());
    }
}
```

## Error Handling and Recovery

### Comprehensive Error Management

```typescript
class ErrorHandler {
    // Categorize errors for appropriate handling
    handleError(error: unknown): ToolResult {
        if (error instanceof z.ZodError) {
            return this.validationError(error);
        } else if (this.isDatabaseError(error)) {
            return this.databaseError(error);
        } else if (this.isQuotaError(error)) {
            return this.quotaError(error);
        } else {
            return this.unknownError(error);
        }
    }
    
    private validationError(error: z.ZodError): ToolResult {
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    success: false,
                    error: "Validation error",
                    details: error.errors
                })
            }]
        };
    }
    
    private databaseError(error: any): ToolResult {
        // Log for debugging but don't expose internals
        console.error('Database error:', error);
        
        if (error.code === 'SQLITE_FULL') {
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify({
                        success: false,
                        error: "Storage full",
                        message: "The conversation database is full. Please export old conversations."
                    })
                }]
            };
        }
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    success: false,
                    error: "Database error",
                    message: "Failed to access conversation history"
                })
            }]
        };
    }
}
```

### Graceful Degradation

```typescript
class DegradationHandler {
    async handleDatabaseUnavailable(): Promise<void> {
        // Switch to in-memory mode
        this.db = new Database(':memory:');
        await this.initializeDatabase();
        
        // Notify user
        this.notifyUser('Conversation history temporarily unavailable. Using memory mode.');
    }
    
    async handleCorruptedDatabase(): Promise<void> {
        // Attempt recovery
        const backupPath = `${this.dbPath}.backup`;
        const recoveryPath = `${this.dbPath}.recovery`;
        
        try {
            // Try to dump what we can
            await this.dumpRecoverableData(recoveryPath);
            
            // Move corrupted DB
            await fs.rename(this.dbPath, backupPath);
            
            // Create fresh database
            await this.initializeDatabase();
            
            // Import recovered data
            await this.importRecoveredData(recoveryPath);
            
        } catch (error) {
            // Last resort: start fresh
            await this.startFresh();
        }
    }
}
```

## Security and Privacy

### Local-First Security

```typescript
class SecurityManager {
    private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';
    
    // Optional encryption for sensitive conversations
    async encryptContent(content: string, userId: string): Promise<EncryptedData> {
        // Derive key from user credentials (stored in OS keychain)
        const key = await this.deriveKey(userId);
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.ENCRYPTION_ALGORITHM, key, iv);
        
        const encrypted = Buffer.concat([
            cipher.update(content, 'utf8'),
            cipher.final()
        ]);
        
        const tag = cipher.getAuthTag();
        
        return {
            encrypted: encrypted.toString('base64'),
            iv: iv.toString('base64'),
            tag: tag.toString('base64')
        };
    }
    
    // File permissions
    async secureDatabase(dbPath: string): Promise<void> {
        // Set restrictive permissions (owner read/write only)
        await fs.chmod(dbPath, 0o600);
        
        // Ensure parent directory is also secure
        const dbDir = path.dirname(dbPath);
        await fs.chmod(dbDir, 0o700);
    }
}
```

### Data Retention and Privacy

```typescript
class PrivacyManager {
    private db: Database;
    
    // User-controlled data retention
    async setRetentionDays(days: number): Promise<void> {
        this.db.prepare(`
            INSERT INTO persistence_state (key, value, updated_at)
            VALUES ('retention_days', ?, ?)
            ON CONFLICT(key) DO UPDATE SET
                value = excluded.value,
                updated_at = excluded.updated_at
        `).run(days.toString(), Date.now());
    }
    
    // Complete conversation removal
    async deleteConversation(conversationId: string): Promise<void> {
        // Use CASCADE to remove all messages
        this.db.prepare(`
            DELETE FROM conversations WHERE id = ?
        `).run(conversationId);
        
        // Clean up FTS index
        this.db.prepare(`
            INSERT INTO messages_fts(messages_fts) VALUES('optimize')
        `).run();
    }
    
    // Export for data portability
    async exportConversations(format: 'json' | 'markdown'): Promise<string> {
        const conversations = this.db.prepare(`
            SELECT c.*, 
                   json_group_array(
                       json_object(
                           'id', m.id,
                           'role', m.role,
                           'content', m.content,
                           'created_at', m.created_at
                       )
                   ) as messages
            FROM conversations c
            LEFT JOIN messages m ON c.id = m.conversation_id
            GROUP BY c.id
            ORDER BY c.updated_at DESC
        `).all();
        
        if (format === 'json') {
            return JSON.stringify(conversations, null, 2);
        } else {
            return this.convertToMarkdown(conversations);
        }
    }
}
```

## Configuration

### Claude Desktop Integration

```json
{
  "mcpServers": {
    "persistence": {
      "command": "node",
      "args": ["./mcp-persistence-server/index.js"],
      "env": {
        "PERSISTENCE_DB_PATH": "~/Documents/Claude/conversations.db",
        "PERSISTENCE_MAX_DB_SIZE_MB": "1000",
        "PERSISTENCE_ENABLE_EMBEDDINGS": "false",
        "PERSISTENCE_LOG_LEVEL": "info"
      }
    }
  }
}
```

### Server Configuration Options

```typescript
interface ServerConfig {
    // Required
    databasePath: string;
    
    // Storage limits
    maxDatabaseSizeMB: number;         // Default: 1000
    maxConversationAgeDays: number;    // Default: 365
    maxMessagesPerConversation: number; // Default: 10000
    
    // Features
    enableEmbeddings: boolean;         // Default: false
    embeddingModel?: string;           // Default: "all-MiniLM-L6-v2"
    enableAutoSummarization: boolean;  // Default: false
    
    // Performance
    vacuumInterval: number;            // Default: 86400000 (daily)
    checkpointInterval: number;        // Default: 300000 (5 min)
    
    // Privacy
    encryptionEnabled: boolean;        // Default: false
    defaultRetentionDays: number;      // Default: 90
}
```

## Performance Optimization

### Database Optimization

```typescript
class PerformanceOptimizer {
    private db: Database;
    
    async optimizeDatabase(): Promise<void> {
        // Run ANALYZE to update query planner statistics
        this.db.prepare('ANALYZE').run();
        
        // Optimize FTS index
        this.db.prepare(`
            INSERT INTO messages_fts(messages_fts) VALUES('optimize')
        `).run();
        
        // Check and rebuild indexes if needed
        const integrityCheck = this.db.prepare('PRAGMA integrity_check').get();
        if (integrityCheck.integrity_check !== 'ok') {
            await this.rebuildIndexes();
        }
    }
    
    // Implement connection pooling for concurrent access
    createConnectionPool(size: number = 5): ConnectionPool {
        return new ConnectionPool({
            path: this.dbPath,
            max: size,
            idleTimeoutMillis: 30000,
            acquireTimeoutMillis: 1000
        });
    }
    
    // Batch operations for bulk inserts
    async batchInsertMessages(messages: Message[]): Promise<void> {
        const insert = this.db.prepare(`
            INSERT INTO messages (
                id, conversation_id, role, content, 
                created_at, parent_message_id, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const insertFTS = this.db.prepare(`
            INSERT INTO messages_fts (rowid, content) VALUES (?, ?)
        `);
        
        const transaction = this.db.transaction((messages) => {
            for (const msg of messages) {
                const result = insert.run(
                    msg.id,
                    msg.conversationId,
                    msg.role,
                    msg.content,
                    msg.createdAt,
                    msg.parentMessageId,
                    JSON.stringify(msg.metadata || {})
                );
                
                insertFTS.run(result.lastInsertRowid, msg.content);
            }
        });
        
        transaction(messages);
    }
}
```

### Query Performance

```typescript
class QueryOptimizer {
    // Use prepared statements with caching
    private statements = new Map<string, Statement>();
    
    getStatement(key: string, sql: string): Statement {
        if (!this.statements.has(key)) {
            this.statements.set(key, this.db.prepare(sql));
        }
        return this.statements.get(key)!;
    }
    
    // Pagination with cursor-based approach for large datasets
    async getMessagesCursor(
        conversationId: string, 
        cursor?: string, 
        limit: number = 50
    ): Promise<PaginatedResult<Message>> {
        const stmt = this.getStatement('messages-cursor', `
            SELECT * FROM messages
            WHERE conversation_id = ?
            ${cursor ? 'AND id < ?' : ''}
            ORDER BY created_at DESC, id DESC
            LIMIT ?
        `);
        
        const params = cursor 
            ? [conversationId, cursor, limit + 1]
            : [conversationId, limit + 1];
            
        const rows = stmt.all(...params);
        
        const hasMore = rows.length > limit;
        const messages = rows.slice(0, limit);
        const nextCursor = hasMore ? messages[messages.length - 1].id : null;
        
        return {
            data: messages,
            hasMore,
            nextCursor
        };
    }
}
```

## Testing Strategy

### Unit Testing

```typescript
describe('MCP Persistence Server', () => {
    let server: MCPPersistenceServer;
    let testDb: string;
    
    beforeEach(async () => {
        testDb = path.join(os.tmpdir(), `test-${Date.now()}.db`);
        server = new MCPPersistenceServer({
            databasePath: testDb,
            maxDatabaseSizeMB: 10
        });
        await server.initialize();
    });
    
    afterEach(async () => {
        await server.shutdown();
        await fs.unlink(testDb);
    });
    
    describe('save_message tool', () => {
        it('should create conversation if not exists', async () => {
            const result = await server.handleTool('save_message', {
                role: 'user',
                content: 'Hello, Claude!'
            });
            
            expect(result.success).toBe(true);
            expect(result.conversationId).toBeDefined();
            expect(result.messageId).toBeDefined();
        });
        
        it('should handle concurrent saves', async () => {
            const promises = Array(10).fill(0).map((_, i) => 
                server.handleTool('save_message', {
                    conversationId: 'test-convo',
                    role: 'user',
                    content: `Message ${i}`
                })
            );
            
            const results = await Promise.all(promises);
            expect(results.every(r => r.success)).toBe(true);
        });
    });
});
```

### Integration Testing

```typescript
describe('Claude Desktop Integration', () => {
    it('should handle full conversation flow', async () => {
        // Start MCP server
        const serverProcess = spawn('node', ['./index.js'], {
            env: { ...process.env, PERSISTENCE_DB_PATH: ':memory:' }
        });
        
        // Simulate Claude Desktop client
        const client = new MCPClient();
        await client.connect(serverProcess.stdout, serverProcess.stdin);
        
        // Save conversation
        const saveResult = await client.callTool('save_message', {
            role: 'user',
            content: 'What is the capital of France?'
        });
        
        const conversationId = JSON.parse(saveResult.content[0].text).conversationId;
        
        // Search for message
        const searchResult = await client.callTool('search_messages', {
            query: 'capital France'
        });
        
        expect(searchResult.results).toHaveLength(1);
        expect(searchResult.results[0].conversationId).toBe(conversationId);
    });
});
```

## Migration Path

### From Existing Systems

```typescript
class MigrationManager {
    async migrateFromFlatFiles(directory: string): Promise<void> {
        const files = await fs.readdir(directory);
        const jsonFiles = files.filter(f => f.endsWith('.json'));
        
        for (const file of jsonFiles) {
            const content = await fs.readFile(
                path.join(directory, file), 
                'utf-8'
            );
            const conversation = JSON.parse(content);
            
            await this.importConversation(conversation);
        }
    }
    
    async migrateFromVersion1(oldDbPath: string): Promise<void> {
        const oldDb = new Database(oldDbPath, { readonly: true });
        
        // Read old schema
        const conversations = oldDb.prepare(
            'SELECT * FROM conversations'
        ).all();
        
        // Transform and insert into new schema
        for (const conv of conversations) {
            await this.transformAndInsert(conv);
        }
    }
}
```

## Deployment Guide

### Local Installation

```bash
# Install dependencies
npm install better-sqlite3 zod

# Build the server
npm run build

# Configure Claude Desktop (add to config.json)
{
  "mcpServers": {
    "persistence": {
      "command": "node",
      "args": ["./path/to/mcp-persistence-server/dist/index.js"]
    }
  }
}
```

### Production Considerations

1. **Backup Strategy**: Automated daily backups of SQLite database
2. **Monitoring**: Log rotation and error tracking
3. **Updates**: Version checking and migration on startup
4. **Performance**: Vacuum scheduling during low usage
5. **Security**: File permission verification on startup

## Future Enhancements

### Phase 1 (Complete)

- ✅ Basic conversation storage and retrieval
- ✅ Full-text search with SQLite FTS5
- ✅ MCP protocol compliance
- ✅ Semantic search with local embeddings
- ✅ Hybrid search combining keyword and semantic

### Phase 2 (Complete)

- ✅ Hierarchical conversation summarization (brief/standard/detailed)
- ✅ Smart context assembly with relevance scoring
- ✅ Progressive detail retrieval
- ✅ LLM provider abstraction (Ollama/OpenAI)
- ✅ Context caching for performance
- ✅ Export to multiple formats (JSON/Markdown)

### Phase 3 (Future - 6-12 months)

- [ ] Optional cloud sync with end-to-end encryption
- [ ] Conversation branching and versioning
- [ ] Plugin system for custom analyzers
- [ ] Advanced analytics and insights

## Conclusion

This revised design provides a solid foundation for conversation persistence in Claude Desktop while avoiding the complexity pitfalls of the original design. By focusing on local-first SQLite storage with MCP-compliant stateless tools, the system remains simple to implement, easy to maintain, and performant for desktop use cases.

The architecture allows for progressive enhancement - starting with basic persistence and search, then adding advanced features only when proven necessary. This approach ensures a working system can be delivered quickly while maintaining flexibility for future improvements.
