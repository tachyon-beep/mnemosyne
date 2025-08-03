# MCP Persistence Server

A Model Context Protocol (MCP) compliant server that provides conversation persistence capabilities for Claude Desktop.

## Features

- 📝 **Conversation Storage**: Save and retrieve conversation history
- 🔍 **Full-Text Search**: Search through messages using SQLite FTS5
- 🏠 **Local-First**: All data stored locally in SQLite
- 🔒 **Privacy-Focused**: No cloud dependencies, optional encryption
- ⚡ **High Performance**: Optimized queries and indexes
- 🛠️ **MCP Compliant**: Follows MCP protocol specifications

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Add to Claude Desktop configuration:
   ```json
   {
     "mcpServers": {
       "persistence": {
         "command": "node",
         "args": ["path/to/dist/index.js"]
       }
     }
   }
   ```

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Lint code
npm run lint

# Type check
npm run typecheck
```

## Architecture

The server implements stateless MCP tools that interact with a local SQLite database:

- **MCP Server**: Handles protocol communication via stdio
- **Tool Handler**: Processes tool requests (save_message, search_messages, etc.)
- **Storage Manager**: Manages SQLite database operations
- **Search Engine**: Provides full-text search using FTS5

## Documentation

- [Architecture Design](HLD.md) - Detailed system design
- [API Documentation](docs/human-docs/README.md) - Tool usage and configuration
- [Development Guide](CLAUDE.md) - Guide for Claude Code instances

## License

MIT