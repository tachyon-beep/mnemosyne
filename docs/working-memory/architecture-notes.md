# Architecture Implementation Notes

## Core Design Principles

1. **Stateless Tools**: Each MCP tool must complete within a single request/response cycle
2. **Transaction Safety**: All database operations that modify data use transactions
3. **Error Boundaries**: Each tool has comprehensive error handling that doesn't expose internals
4. **Type Safety**: Zod schemas validate all inputs at runtime

## Module Structure

```
src/
├── index.ts              # Entry point, server initialization
├── server/
│   ├── MCPServer.ts     # Main MCP server class
│   └── transport.ts     # stdio transport setup
├── tools/
│   ├── index.ts         # Tool registration
│   ├── SaveMessage.ts   # save_message tool
│   ├── SearchMessages.ts # search_messages tool
│   └── GetConversation.ts # get_conversation tool
├── storage/
│   ├── Database.ts      # Database connection and setup
│   ├── migrations/      # Schema migrations
│   └── repositories/    # Data access patterns
├── search/
│   ├── SearchEngine.ts  # FTS5 search implementation
│   └── QueryBuilder.ts  # Search query construction
└── types/
    ├── schemas.ts       # Zod schemas
    └── interfaces.ts    # TypeScript interfaces
```

## Implementation Order

1. **Phase 1 - Core Infrastructure**
   - Set up MCP server with stdio transport
   - Create database connection and schema
   - Implement basic tool registration

2. **Phase 2 - Basic Tools**
   - save_message tool with conversation creation
   - get_conversation tool for retrieval
   - Basic error handling

3. **Phase 3 - Search**
   - FTS5 setup and configuration
   - search_messages tool implementation
   - Query optimization

4. **Phase 4 - Enhanced Features**
   - Message threading (parent_message_id)
   - Conversation metadata
   - State management

## Critical Implementation Details

### Database Connection
- Use better-sqlite3 for synchronous API
- Enable WAL mode for concurrency
- Set pragmas in constructor

### Tool Response Format
All tools return standardized responses:
```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      success: boolean,
      data?: any,
      error?: string
    })
  }]
}
```

### Transaction Pattern
```typescript
const result = db.transaction(() => {
  // All operations here are atomic
})();
```

### Error Categories
1. Validation errors (Zod)
2. Database errors (constraints, disk full)
3. Protocol errors (malformed requests)
4. Unknown errors (catch-all)