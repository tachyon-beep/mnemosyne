# 🚀 MCP Persistence Server Installation Guide

## Overview
This guide explains how to install and configure the MCP Persistence Server with Claude Desktop.

## Prerequisites
- Claude Desktop application installed
- Node.js 18+ installed
- The MCP Persistence Server built and ready (`npm run build` completed)

## Installation Steps

### 1. Build the Server (Already Complete)
```bash
cd /home/john/mnemosyne
npm install
npm run build
```

### 2. Create MCP Configuration

Add the following to your Claude Desktop configuration file. The location varies by OS:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mcp-persistence": {
      "command": "node",
      "args": ["/home/john/mnemosyne/dist/index.js"],
      "env": {
        "NODE_ENV": "production",
        "DB_PATH": "/home/john/.claude/conversations.db",
        "LOG_LEVEL": "info",
        "ENABLE_EMBEDDINGS": "true",
        "EMBEDDING_CACHE_DIR": "/home/john/.claude/.cache/embeddings",
        "EMBEDDING_MODEL": "Xenova/all-MiniLM-L6-v2"
      }
    }
  }
}
```

### 3. Create Required Directories
```bash
mkdir -p ~/.claude/.cache/embeddings
```

### 4. Initialize the Database
```bash
# Run the health check to initialize the database
cd /home/john/mnemosyne
node dist/index.js --health-check
```

### 5. Restart Claude Desktop
After adding the configuration, restart Claude Desktop for the changes to take effect.

## Verify Installation

Once Claude Desktop restarts, the MCP Persistence Server should be available. You can verify by:

1. Using any of the persistence tools in Claude:
   - `save_message` - Save conversation messages
   - `search_messages` - Search through conversation history
   - `get_conversation` - Retrieve specific conversations
   - `get_conversations` - List all conversations

2. Check the logs:
```bash
# The server logs will be available in Claude's log directory
tail -f ~/.claude/logs/mcp-persistence.log
```

## Available Tools

The MCP Persistence Server provides 14 tools:

### Core Tools
- `save_message` - Save messages to conversation history
- `search_messages` - Search messages with full-text search
- `get_conversation` - Get a specific conversation
- `get_conversations` - List conversations
- `delete_conversation` - Delete a conversation

### Enhanced Search Tools
- `semantic_search` - Search using semantic similarity
- `hybrid_search` - Combined keyword and semantic search

### Context Management Tools
- `get_context_summary` - Get intelligent summaries
- `get_relevant_snippets` - Get relevant conversation snippets
- `configure_llm_provider` - Configure LLM providers
- `get_progressive_detail` - Get conversation details progressively

### Knowledge Graph Tools
- `get_entity_history` - Get history of entities
- `find_related_conversations` - Find related conversations
- `get_knowledge_graph` - Explore knowledge graph

## Configuration Options

### Environment Variables
- `DB_PATH` - Database file location (default: `./conversations.db`)
- `LOG_LEVEL` - Logging level: debug, info, warn, error (default: `info`)
- `ENABLE_EMBEDDINGS` - Enable semantic search (default: `true`)
- `EMBEDDING_MODEL` - Model for embeddings (default: `Xenova/all-MiniLM-L6-v2`)
- `EMBEDDING_CACHE_DIR` - Cache directory for embeddings
- `MAX_EMBEDDING_BATCH_SIZE` - Batch size for embedding generation (default: `50`)

### Performance Tuning
- `SQLITE_CACHE_SIZE` - SQLite cache size in KB (default: `2000`)
- `SQLITE_PAGE_SIZE` - SQLite page size (default: `4096`)
- `FTS_TOKENIZER` - Full-text search tokenizer (default: `porter`)

## Troubleshooting

### Server Not Starting
1. Check Node.js version: `node --version` (should be 18+)
2. Verify build completed: `ls dist/index.js`
3. Check permissions on database directory
4. Look for errors in Claude logs

### Search Not Working
1. Verify FTS5 is enabled in SQLite
2. Check if embeddings are being generated
3. Ensure embedding model is downloaded

### Performance Issues
1. Increase SQLite cache size
2. Enable WAL mode for better concurrency
3. Use SSD for database storage

## Next Steps

Once installed, you can:
1. Start saving conversations with `save_message`
2. Search through history with `search_messages`
3. Use knowledge graph features to explore relationships
4. Enable proactive assistance features (Phase 4)

For more details, see the main README.md and HLD.md documentation.