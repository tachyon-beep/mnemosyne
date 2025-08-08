# MCP Persistence Server - Production Deployment Guide

## Overview

The MCP Persistence Server is a production-ready conversation history and analytics system for Claude Desktop. This guide covers deployment, configuration, and monitoring for production environments.

## Production Readiness Status

✅ **System is READY for production deployment**
- 100% production readiness score
- All TypeScript compilation errors resolved
- Health checks passing
- 23 tools registered and operational
- Complete Phase 5 analytics implementation

## Quick Start

### Prerequisites

- Node.js 18+ (recommended: Node.js 20)
- NPM or Yarn package manager
- SQLite 3.35+ (included with Node.js)
- 500MB+ available disk space

### Installation

```bash
# Clone repository
git clone <repository-url>
cd mnemosyne

# Install dependencies
npm install

# Build production files
npm run build

# Run health check
npm run health-check
```

### Verification

```bash
# Run production readiness check
node scripts/quick-check.cjs

# Expected output:
# 📊 Production Readiness: 6/6 (100%)
# ✅ System is READY for production!
```

## Production Configuration

### Environment Variables

Create a `.env` file for production settings:

```bash
# Database Configuration
DATABASE_PATH=./conversations.db
MAX_DATABASE_SIZE_MB=1000
DATABASE_TIMEOUT_MS=30000

# Performance Settings
CACHE_EXPIRATION_MINUTES=60
BATCH_PROCESSING_SIZE=50
MAX_PROCESSING_TIME_MS=30000

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/mcp-server.log

# Analytics
ENABLE_ANALYTICS=true
ENABLE_INCREMENTAL_PROCESSING=true

# Security
ENABLE_CORS=false
ALLOWED_ORIGINS=localhost

# Monitoring
PERFORMANCE_MONITORING_INTERVAL=30000
ENABLE_HEALTH_CHECKS=true
```

### Claude Desktop Integration

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "mcp-persistence-server": {
      "command": "node",
      "args": ["/path/to/mnemosyne/dist/index.js"],
      "env": {
        "DATABASE_PATH": "/path/to/conversations.db"
      }
    }
  }
}
```

## Deployment Options

### Option 1: Local Deployment (Recommended)

For single-user Claude Desktop integration:

```bash
# 1. Build and verify
npm run build
node scripts/quick-check.cjs

# 2. Create production directory
mkdir -p ~/mcp-servers/persistence
cp -r dist/ ~/mcp-servers/persistence/
cp package.json ~/mcp-servers/persistence/
cp .env ~/mcp-servers/persistence/

# 3. Update Claude Desktop config
# Point to ~/mcp-servers/persistence/index.js
```

### Option 2: Service Deployment

For system-wide deployment with service management:

```bash
# 1. Install as global service
sudo npm install -g .
sudo systemctl enable mcp-persistence-server
sudo systemctl start mcp-persistence-server

# 2. Configure systemd service
sudo nano /etc/systemd/system/mcp-persistence-server.service
```

Example systemd service file:

```ini
[Unit]
Description=MCP Persistence Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/mcp-persistence-server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=/opt/mcp-persistence-server/.env

[Install]
WantedBy=multi-user.target
```

### Option 3: Docker Deployment

```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env .env

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

```bash
# Build and run
docker build -t mcp-persistence-server .
docker run -d --name mcp-server \
  -v ./data:/app/data \
  -v ./logs:/app/logs \
  mcp-persistence-server
```

## Configuration Management

### Database Settings

```typescript
// Production database configuration
const dbConfig = {
  path: process.env.DATABASE_PATH || './conversations.db',
  maxSize: parseInt(process.env.MAX_DATABASE_SIZE_MB || '1000'),
  timeout: parseInt(process.env.DATABASE_TIMEOUT_MS || '30000'),
  walMode: true,
  foreignKeys: true,
  synchronous: 'NORMAL'
};
```

### Performance Tuning

```bash
# For high-volume usage
BATCH_PROCESSING_SIZE=100
MAX_PROCESSING_TIME_MS=60000
CACHE_EXPIRATION_MINUTES=30

# For memory-constrained environments
BATCH_PROCESSING_SIZE=25
CACHE_EXPIRATION_MINUTES=120
MAX_PROCESSING_TIME_MS=15000
```

## Monitoring & Health Checks

### Built-in Health Checks

```bash
# Basic health check
npm run health-check

# Detailed system status
node dist/index.js --health-check --verbose

# Component-specific checks
curl http://localhost:3000/health/database
curl http://localhost:3000/health/search
curl http://localhost:3000/health/analytics
```

### Performance Monitoring

The system includes built-in performance monitoring:

- Database query performance tracking
- Memory usage monitoring  
- Search operation latency
- Analytics processing times
- Alert system for threshold breaches

### Logging

Production logs are written to:
- Console (structured JSON in production)
- File system (configurable path)
- System journals (when deployed as service)

Log levels: `error`, `warn`, `info`, `debug`

## Security Considerations

### Data Protection
- Local SQLite database (no network exposure)
- No sensitive data transmitted over network
- Conversation data encrypted at rest (optional)

### Access Control
- File system permissions for database access
- Process isolation when run as service
- Optional authentication for MCP protocol

### Privacy
- All data processing occurs locally
- No telemetry or external data transmission
- User controls data retention policies

## Backup & Recovery

### Database Backup

```bash
# Automatic backup script
#!/bin/bash
DB_PATH="./conversations.db"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
sqlite3 $DB_PATH ".backup $BACKUP_DIR/conversations_$DATE.db"

# Keep only last 30 days
find $BACKUP_DIR -name "conversations_*.db" -mtime +30 -delete
```

### System Recovery

1. **Database Corruption**: Automatic integrity checks and repair
2. **Migration Failures**: Rollback mechanisms in place
3. **Performance Degradation**: Automatic optimization triggers

## Troubleshooting

### Common Issues

1. **Migration Errors**
   ```bash
   # Check migration status
   node dist/scripts/migration-status.js
   
   # Force migration reset (caution: data loss)
   rm conversations.db && npm run health-check
   ```

2. **Performance Issues**
   ```bash
   # Check index usage
   node dist/scripts/analyze-performance.js
   
   # Optimize database
   sqlite3 conversations.db "VACUUM; ANALYZE;"
   ```

3. **Memory Usage**
   ```bash
   # Monitor memory
   node --max-old-space-size=4096 dist/index.js
   
   # Reduce cache size
   export CACHE_EXPIRATION_MINUTES=30
   ```

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=debug
export NODE_ENV=development
node dist/index.js --health-check
```

## Performance Benchmarks

Expected performance characteristics:

- **Startup Time**: < 2 seconds
- **Message Save**: < 10ms average
- **Search Queries**: < 50ms average
- **Analytics Generation**: < 500ms for 1000 conversations
- **Memory Usage**: 50-200MB typical

## Support & Maintenance

### Regular Maintenance

1. **Weekly**: Database optimization (`VACUUM; ANALYZE;`)
2. **Monthly**: Log rotation and cleanup
3. **Quarterly**: Full system backup verification
4. **Annually**: Security audit and dependency updates

### Version Updates

```bash
# Safe update process
npm run backup
npm install
npm run build
npm test
npm run health-check
```

## Integration Examples

### Custom Tools

```typescript
// Example custom analytics tool
import { BaseTool } from './dist/tools/BaseTool.js';

export class CustomAnalyticsTool extends BaseTool {
  async execute(params) {
    // Custom analytics logic
    return { insights: [] };
  }
}
```

### API Integration

```javascript
// Example API wrapper
const express = require('express');
const { MCPServer } = require('./dist/server/MCPServer.js');

const app = express();
const mcpServer = new MCPServer();

app.get('/api/conversations', async (req, res) => {
  const conversations = await mcpServer.getConversations();
  res.json(conversations);
});
```

---

**Note**: This system is designed for local deployment with Claude Desktop. For enterprise deployments, contact the development team for additional configuration options and support.