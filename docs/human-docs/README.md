# MCP Persistence Server Documentation

## Overview

The MCP Persistence Server provides conversation history capabilities for Claude Desktop using the Model Context Protocol (MCP). It stores conversations locally using SQLite and provides tools for saving, searching, and retrieving conversation history.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the project:
   ```bash
   npm run build
   ```

## Configuration

Add the persistence server to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "persistence": {
      "command": "node",
      "args": ["/path/to/mcp-persistence-server/dist/index.js"],
      "env": {
        "PERSISTENCE_DB_PATH": "~/Documents/Claude/conversations.db",
        "PERSISTENCE_MAX_DB_SIZE_MB": "1000",
        "PERSISTENCE_LOG_LEVEL": "info"
      }
    }
  }
}
```

## Available Tools

### save_message
Saves a message to conversation history.

Parameters:
- `conversationId` (optional): ID of existing conversation
- `role`: Message role (user/assistant/system)
- `content`: Message content
- `parentMessageId` (optional): For branching conversations
- `metadata` (optional): Additional metadata

### search_messages
Search through conversation history using full-text search.

Parameters:
- `query`: Search query
- `conversationId` (optional): Limit to specific conversation
- `limit`: Maximum results (default: 20)
- `offset`: Pagination offset
- `startDate` (optional): Filter by date range
- `endDate` (optional): Filter by date range

### get_conversation
Retrieve a conversation with its messages.

Parameters:
- `conversationId`: Conversation ID
- `includeMessages`: Include messages (default: true)
- `messageLimit`: Maximum messages to return
- `beforeMessageId` (optional): Pagination cursor

## Development

### Running in development mode:
```bash
npm run dev
```

### Running tests:
```bash
npm test
```

### Linting:
```bash
npm run lint
```

## Architecture

The server implements the MCP protocol with stateless tools that interact with a local SQLite database. Key components:

- **MCP Server**: Handles protocol communication
- **Tool Handler**: Processes tool requests
- **Storage Manager**: Manages SQLite database operations
- **Search Engine**: Provides full-text search using FTS5

## Security

- All data is stored locally
- Database file permissions are restricted to owner only
- No network communication or cloud sync by default
- Optional encryption for sensitive conversations