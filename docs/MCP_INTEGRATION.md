# MCP Persistence Server - Claude Desktop Integration Guide

## Overview

This guide explains how to integrate the Phase 5 MCP Persistence Server with Claude Desktop to enable conversation persistence and advanced analytics.

## How Claude Desktop Uses MCP Servers

Claude Desktop uses the Model Context Protocol (MCP) to communicate with external tools and services. MCP servers are configured in Claude Desktop's configuration file and provide tools that Claude can invoke during conversations.

### MCP Architecture in Claude Desktop

```
Claude Desktop <-> MCP Protocol <-> MCP Server (this project)
                                        |
                                        v
                                  SQLite Database
                                  Analytics Engine
                                  23 Available Tools
```

## Installation Steps

### 1. Build the MCP Persistence Server

```bash
cd /home/john/mnemosyne
npm install
npm run build
npm run health-check  # Verify everything works
```

### 2. Configure Claude Desktop

Claude Desktop looks for MCP server configurations in platform-specific locations:

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```
~/.config/claude/claude_desktop_config.json
```

### 3. Add MCP Persistence Server Configuration

Edit or create the `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "mcp-persistence": {
      "command": "node",
      "args": ["/home/john/mnemosyne/dist/index.js"],
      "env": {
        "PERSISTENCE_DB_PATH": "/home/john/.claude/conversations.db",
        "PERSISTENCE_LOG_LEVEL": "info",
        "PERSISTENCE_MAX_DB_SIZE_MB": "2000",
        "ENABLE_ANALYTICS": "true",
        "ENABLE_INCREMENTAL_PROCESSING": "true"
      }
    }
  }
}
```

### 4. Alternative: Using NPX (if published to NPM)

```json
{
  "mcpServers": {
    "mcp-persistence": {
      "command": "npx",
      "args": ["mcp-persistence-server"],
      "env": {
        "PERSISTENCE_DB_PATH": "~/.claude/conversations.db"
      }
    }
  }
}
```

## Configuration Options

### Environment Variables

All configuration is done through environment variables in the MCP config:

| Variable | Default | Description |
|----------|---------|-------------|
| `PERSISTENCE_DB_PATH` | `./conversations.db` | Database file location |
| `PERSISTENCE_LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `PERSISTENCE_MAX_DB_SIZE_MB` | `1000` | Maximum database size in MB |
| `PERSISTENCE_DEBUG` | `false` | Enable debug mode |
| `ENABLE_ANALYTICS` | `true` | Enable Phase 5 analytics features |
| `ENABLE_INCREMENTAL_PROCESSING` | `true` | Enable background analytics processing |
| `CACHE_EXPIRATION_MINUTES` | `60` | Analytics cache expiration time |
| `BATCH_PROCESSING_SIZE` | `50` | Batch size for analytics processing |

### Recommended Production Configuration

```json
{
  "mcpServers": {
    "mcp-persistence": {
      "command": "node",
      "args": ["/home/john/mnemosyne/dist/index.js"],
      "env": {
        "PERSISTENCE_DB_PATH": "/home/john/.claude/persistence/conversations.db",
        "PERSISTENCE_LOG_LEVEL": "info",
        "PERSISTENCE_MAX_DB_SIZE_MB": "5000",
        "PERSISTENCE_DEBUG": "false",
        "ENABLE_ANALYTICS": "true",
        "ENABLE_INCREMENTAL_PROCESSING": "true",
        "CACHE_EXPIRATION_MINUTES": "30",
        "BATCH_PROCESSING_SIZE": "100",
        "MAX_PROCESSING_TIME_MS": "60000"
      }
    }
  }
}
```

## Available Tools (Phase 5 Complete)

Once configured, Claude will have access to all 23 MCP tools:

### Core Persistence (5 tools)
- `save_message` - Save conversation messages
- `search_messages` - Search message history
- `get_conversation` - Retrieve conversations
- `get_conversations` - List all conversations
- `delete_conversation` - Delete conversations

### Enhanced Search (2 tools)
- `semantic_search` - AI-powered similarity search
- `hybrid_search` - Combined search strategies

### Knowledge Graph (3 tools)
- `get_entity_history` - Track entity mentions
- `find_related_conversations` - Find related content
- `get_knowledge_graph` - Explore knowledge networks

### Proactive Intelligence (4 tools)
- `get_proactive_insights` - Surface actionable insights
- `check_for_conflicts` - Detect inconsistencies
- `suggest_relevant_context` - Context recommendations
- `auto_tag_conversation` - Automatic tagging

### Analytics & Reporting (7 tools) - NEW IN PHASE 5
- `get_conversation_analytics` - Detailed conversation metrics
- `analyze_productivity_patterns` - Productivity analysis
- `detect_knowledge_gaps` - Identify knowledge gaps
- `track_decision_effectiveness` - Decision tracking
- `generate_analytics_report` - Comprehensive reports
- `manage_index_optimization` - Database optimization
- `get_index_performance_report` - Performance metrics

### Context Management (2 tools)
- `get_context_summary` - Intelligent summaries
- `get_relevant_snippets` - Context-aware snippets

## Verifying the Integration

### 1. Check MCP Server Status

After configuring, restart Claude Desktop and check if the MCP server is running:

```bash
# Check if the server process is running
ps aux | grep mcp-persistence

# Check the database file was created
ls -la ~/.claude/conversations.db

# View server logs
tail -f ~/.claude/mcp-persistence.log  # If logging to file
```

### 2. Test Basic Operations

In Claude Desktop, try these commands to verify the integration:

```
"Save this conversation for later reference"
"Search for our previous discussions about TypeScript"
"Show me my conversation analytics"
"Generate a productivity report for this week"
```

### 3. Monitor Analytics

The Phase 5 analytics will automatically:
- Track conversation patterns
- Identify knowledge gaps
- Monitor decision quality
- Generate productivity insights

## Troubleshooting

### Server Not Starting

1. Check the path in the configuration is absolute
2. Verify Node.js is in PATH
3. Check file permissions on the database directory
4. Review logs for initialization errors

### Tools Not Available

1. Restart Claude Desktop after configuration changes
2. Verify the server health check passes:
   ```bash
   node /home/john/mnemosyne/dist/index.js --health-check
   ```
3. Check that all 23 tools are registered in the logs

### Database Issues

1. Ensure write permissions in the database directory
2. Check available disk space (minimum 100MB required)
3. Verify SQLite version compatibility (3.35+)

### Performance Issues

1. Adjust batch processing size for your system:
   ```json
   "BATCH_PROCESSING_SIZE": "25"  // Lower for limited resources
   ```
2. Increase cache expiration for better performance:
   ```json
   "CACHE_EXPIRATION_MINUTES": "120"
   ```
3. Monitor database size and run optimization:
   ```bash
   sqlite3 ~/.claude/conversations.db "VACUUM; ANALYZE;"
   ```

## Advanced Configuration

### Custom Database Location

Store the database in a specific location:

```json
"PERSISTENCE_DB_PATH": "/path/to/your/database/conversations.db"
```

### High-Volume Usage

For heavy usage, optimize settings:

```json
{
  "env": {
    "BATCH_PROCESSING_SIZE": "200",
    "MAX_PROCESSING_TIME_MS": "120000",
    "CACHE_EXPIRATION_MINUTES": "15",
    "PERSISTENCE_MAX_DB_SIZE_MB": "10000"
  }
}
```

### Development Mode

For development and debugging:

```json
{
  "env": {
    "PERSISTENCE_DEBUG": "true",
    "PERSISTENCE_LOG_LEVEL": "debug",
    "CACHE_EXPIRATION_MINUTES": "5"
  }
}
```

## Security Considerations

1. **Database Location**: Store in user home directory with appropriate permissions
2. **No Network Access**: The server operates entirely locally
3. **Data Privacy**: All conversation data remains on your machine
4. **Access Control**: File system permissions control database access

## Monitoring & Maintenance

### Regular Maintenance

```bash
# Weekly: Optimize database
sqlite3 ~/.claude/conversations.db "VACUUM; ANALYZE;"

# Monthly: Backup database
cp ~/.claude/conversations.db ~/.claude/conversations.backup.db

# Check database size
du -h ~/.claude/conversations.db

# View analytics summary
sqlite3 ~/.claude/conversations.db "SELECT * FROM v_productivity_dashboard;"
```

### Performance Monitoring

The system includes built-in performance monitoring:

```bash
# View performance metrics
node /home/john/mnemosyne/dist/index.js --health-check

# Check index performance
sqlite3 ~/.claude/conversations.db "SELECT * FROM index_usage_monitoring;"
```

## Support

For issues or questions:
1. Run health check: `npm run health-check`
2. Check logs for errors
3. Refer to `/docs/production/DEPLOYMENT.md` for detailed troubleshooting
4. Review test results: `npm test`

---

**Note**: After configuration, all 23 MCP tools will be available in Claude Desktop, providing comprehensive conversation persistence, search, knowledge graph, and Phase 5 analytics capabilities.