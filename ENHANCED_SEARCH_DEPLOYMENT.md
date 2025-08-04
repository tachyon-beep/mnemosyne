# Enhanced Search & Discovery - Deployment Guide

This guide covers the deployment of the Enhanced Search & Discovery features for the MCP Persistence Server.

## Overview

The Enhanced Search & Discovery implementation adds semantic search capabilities to the MCP Persistence Server, allowing users to find messages based on conceptual similarity rather than just keyword matching.

## Features Added

### New MCP Tools
- `semantic_search` - Find messages based on semantic similarity
- `hybrid_search` - Combine semantic and traditional keyword search for optimal results

### Enhanced Infrastructure
- **EmbeddingManager** - Local sentence embedding generation using Transformers.js
- **EnhancedSearchEngine** - Hybrid search combining FTS and semantic similarity
- **Automatic Migrations** - Database schema updated with embedding support
- **Performance Monitoring** - Search metrics and performance logging

## Prerequisites

### System Requirements
- Node.js 18+ 
- Sufficient disk space for embeddings (approximately 50MB for the model)
- 512MB+ RAM recommended for embedding processing

### Dependencies
All required dependencies are included in package.json:
- `@huggingface/transformers` - For local embedding generation
- `better-sqlite3` - Database with FTS5 support
- SQLite with FTS5 extension enabled

## Installation & Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Project
```bash
npm run build
```

### 3. Environment Configuration

The enhanced search features support additional environment variables:

```bash
# Basic Configuration
PERSISTENCE_DB_PATH=./conversations.db
PERSISTENCE_LOG_LEVEL=info
PERSISTENCE_DEBUG=false

# Enhanced Search Configuration
PERSISTENCE_EMBEDDINGS_ENABLED=true       # Enable/disable semantic search
PERSISTENCE_EMBEDDINGS_BATCH_SIZE=100     # Batch size for embedding generation
```

### 4. First-Time Setup

On first startup, the server will:
1. Run database migrations to add embedding support
2. Initialize the embedding model (downloads ~50MB)
3. Register all MCP tools including enhanced search tools

```bash
# Start the server
node dist/index.js

# Or with debug logging
PERSISTENCE_DEBUG=true node dist/index.js
```

## Database Migrations

The enhanced search features require database schema changes that are applied automatically:

### Migration 002: Enhanced Search Schema
- Adds `message_embeddings` table for storing vector embeddings
- Creates indexes for efficient similarity search
- Adds configuration to `persistence_state` table

**Migration is applied automatically** on server startup. No manual intervention required.

## Performance Optimization

### Embedding Generation
- Embeddings are generated asynchronously in batches
- Progress is tracked in the database
- Failed embeddings are retried automatically

### Search Performance
- Semantic search results are cached temporarily
- FTS search is optimized with proper indexing
- Hybrid search balances speed vs. accuracy

### Memory Management
- Embedding model is loaded once on startup
- Vector operations use efficient Float32Arrays
- Database connections are pooled and reused

## Monitoring & Logging

### Health Checks
The server provides comprehensive health checks:

```bash
# Check server health
node dist/index.js --health-check
```

Health check covers:
- Database connectivity
- Tool registration status
- Enhanced search availability
- Embedding model status

### Performance Metrics
Enhanced search operations are logged with performance metrics:

```
[INFO] Search tool 'semantic_search' completed in 245ms, returned 15 results
[DEBUG] Enhanced search metrics: strategy=semantic, embeddings=enabled
```

### Server Statistics
Get detailed server statistics via the internal API:

```javascript
const stats = await server.getStats();
console.log(stats.search);          // Search engine status
console.log(stats.embeddings);      // Embedding system status
console.log(stats.tools);           // Tool execution statistics
```

## Graceful Degradation

The enhanced search implementation is designed for graceful degradation:

### When Embedding Initialization Fails
- Server continues with basic search functionality
- Warning logged but startup continues
- Only traditional FTS search tools are available
- `semantic_search` and `hybrid_search` tools are not registered

### When Enhanced Search is Disabled
Set `PERSISTENCE_EMBEDDINGS_ENABLED=false` to disable enhanced features:
- Faster startup (no model download)
- Lower memory usage
- Only traditional search available

## Tool Usage

### Semantic Search Tool
```json
{
  "tool": "semantic_search",
  "arguments": {
    "query": "How to implement user authentication",
    "limit": 20,
    "threshold": 0.7,
    "explainResults": true
  }
}
```

### Hybrid Search Tool
```json
{
  "tool": "hybrid_search",
  "arguments": {
    "query": "database connection errors",
    "strategy": "auto",
    "weights": {
      "semantic": 0.6,
      "fts": 0.4
    },
    "limit": 15
  }
}
```

## Troubleshooting

### Common Issues

**1. Embedding Model Download Fails**
```
Error: Failed to download embedding model
```
Solution: Check internet connectivity, firewall settings, or use offline setup.

**2. Insufficient Memory**
```
Error: Cannot allocate tensor
```
Solution: Increase available RAM or reduce `PERSISTENCE_EMBEDDINGS_BATCH_SIZE`.

**3. Database Migration Fails**
```
Error: Migration 002 failed
```
Solution: Check database permissions, ensure SQLite supports FTS5.

### Debug Mode
Enable debug logging for detailed troubleshooting:

```bash
PERSISTENCE_DEBUG=true PERSISTENCE_LOG_LEVEL=debug node dist/index.js
```

### Health Check
Use the built-in health check to diagnose issues:

```bash
node dist/index.js --health-check
```

## Performance Tuning

### For Large Datasets
- Increase `PERSISTENCE_EMBEDDINGS_BATCH_SIZE` for faster processing
- Consider running embedding generation during off-peak hours
- Monitor database size and optimize periodically

### For Resource-Constrained Environments
- Disable embeddings: `PERSISTENCE_EMBEDDINGS_ENABLED=false`
- Reduce batch size: `PERSISTENCE_EMBEDDINGS_BATCH_SIZE=50`
- Use smaller database cache size

## Backup & Recovery

### Database Backup
The database includes embedding data, so ensure backups capture:
- Main SQLite database file
- WAL files (if using WAL mode)
- Configuration in `persistence_state` table

### Embedding Regeneration
If embeddings are corrupted or lost:
1. Clear the `message_embeddings` table
2. Reset `last_embedding_index` in `persistence_state`
3. Restart server to regenerate embeddings

## Security Considerations

### Local Processing
- All embedding generation happens locally
- No data sent to external APIs
- Embedding model cached locally

### Data Privacy
- Message content processed locally only
- Embeddings stored in local database
- No external dependencies for search functionality

## Support & Maintenance

### Regular Maintenance
- Monitor database size growth
- Run VACUUM periodically for optimization
- Check embedding generation progress
- Review search performance logs

### Updates
When updating the MCP Persistence Server:
1. Stop the server gracefully
2. Update the codebase
3. Run migrations (automatic on restart)
4. Restart server

## Configuration Reference

### Complete Environment Variable List

```bash
# Basic Server Configuration
PERSISTENCE_DB_PATH=./conversations.db
PERSISTENCE_LOG_LEVEL=info
PERSISTENCE_MAX_DB_SIZE_MB=1000
PERSISTENCE_DEBUG=false
PERSISTENCE_TOOL_TIMEOUT_MS=30000

# Enhanced Search Configuration
PERSISTENCE_EMBEDDINGS_ENABLED=true
PERSISTENCE_EMBEDDINGS_BATCH_SIZE=100
```

### Default Values
- Database path: `./conversations.db`
- Log level: `info`
- Embeddings enabled: `true`
- Batch size: `100`
- Tool timeout: `30000ms`

## Conclusion

The Enhanced Search & Discovery features provide powerful semantic search capabilities while maintaining backward compatibility and graceful degradation. The implementation is designed for production use with comprehensive monitoring, error handling, and performance optimization.

For additional support or questions, refer to the main project documentation or open an issue in the project repository.