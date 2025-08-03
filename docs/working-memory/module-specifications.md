# Module Specifications

## Module 1: Database Layer

### Files to Create:
- `src/storage/Database.ts` - Main database class
- `src/storage/migrations/index.ts` - Migration runner
- `src/storage/migrations/001_initial_schema.ts` - Initial schema
- `tests/unit/storage/Database.test.ts` - Database tests

### Key Functions:
```typescript
class Database {
  constructor(dbPath: string)
  async initialize(): Promise<void>
  async runMigrations(): Promise<void>
  getConnection(): Database.Database
  close(): void
}
```

## Module 2: Type Definitions & Schemas

### Files to Create:
- `src/types/schemas.ts` - Zod schemas for tools
- `src/types/interfaces.ts` - TypeScript interfaces
- `src/types/mcp.ts` - MCP protocol types
- `tests/unit/types/schemas.test.ts` - Schema validation tests

### Key Schemas:
- SaveMessageSchema
- SearchMessagesSchema
- GetConversationSchema
- Message interface
- Conversation interface

## Module 3: Storage Repositories

### Files to Create:
- `src/storage/repositories/BaseRepository.ts`
- `src/storage/repositories/ConversationRepository.ts`
- `src/storage/repositories/MessageRepository.ts`
- `src/storage/repositories/StateRepository.ts`
- `tests/unit/storage/repositories/*.test.ts`

### Key Methods:
- create, findById, update, delete
- Transaction support
- Bulk operations

## Module 4: Search Engine

### Files to Create:
- `src/search/SearchEngine.ts` - Main search class
- `src/search/QueryParser.ts` - Query parsing/sanitization
- `src/search/SearchResult.ts` - Result formatting
- `tests/unit/search/*.test.ts`

### Key Functions:
- search(query, options)
- parseQuery(raw)
- formatResults(rows)

## Module 5: Tool Implementations

### Files to Create:
- `src/tools/SaveMessageTool.ts`
- `src/tools/SearchMessagesTool.ts`
- `src/tools/GetConversationTool.ts`
- `src/tools/BaseTool.ts`
- `tests/unit/tools/*.test.ts`

### Pattern:
Each tool extends BaseTool and implements handle(args) method

## Module 6: MCP Server

### Files to Create:
- `src/server/MCPServer.ts` - Main server class
- `src/server/ToolRegistry.ts` - Tool registration
- `src/index.ts` - Entry point
- `tests/integration/server.test.ts`

### Key Components:
- Server initialization
- Tool registration
- Request handling