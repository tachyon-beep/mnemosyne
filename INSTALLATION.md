# Installation Guide

## System Requirements

### Minimum Requirements
- Node.js 20.0.0 or later
- 256MB available RAM
- 500MB free disk space (for models and database)
- Operating System: Windows 10+, macOS 10.15+, or Linux (Ubuntu 18.04+)

### Recommended Requirements  
- Node.js 20.x LTS
- 512MB available RAM
- 1GB free disk space
- SSD storage for optimal performance

## Installation Options

### Option 1: NPM Global Installation (Recommended)

This is the easiest method for most users:

```bash
# Install globally from npm
npm install -g mcp-persistence-server

# Verify installation
mcp-persistence-server --version
mcp-persistence-server --health-check
```

### Option 2: Local NPM Installation

For project-specific installations:

```bash
# Create project directory
mkdir my-mcp-project
cd my-mcp-project

# Initialize and install locally
npm init -y
npm install mcp-persistence-server

# Run with npx
npx mcp-persistence-server --version
```

### Option 3: From Source (Developers)

For development or customization:

```bash
# Clone repository
git clone https://github.com/yourusername/mcp-persistence-server.git
cd mcp-persistence-server

# Install dependencies
npm install

# Build the project
npm run build

# Run from source
npm start

# Or run directly with development watch
npm run dev
```

## Claude Desktop Configuration

### Step 1: Locate Claude Desktop Settings

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

### Step 2: Add MCP Server Configuration

#### For NPM Global Installation:
```json
{
  "mcpServers": {
    "mcp-persistence": {
      "command": "mcp-persistence-server",
      "env": {
        "PERSISTENCE_DB_PATH": "~/.claude/conversations.db",
        "PERSISTENCE_LOG_LEVEL": "info",
        "PERSISTENCE_MAX_DB_SIZE_MB": "1000"
      }
    }
  }
}
```

#### For Source Installation:
```json
{
  "mcpServers": {
    "mcp-persistence": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-persistence-server/dist/index.js"],
      "env": {
        "PERSISTENCE_DB_PATH": "~/.claude/conversations.db",
        "PERSISTENCE_LOG_LEVEL": "info",
        "PERSISTENCE_MAX_DB_SIZE_MB": "1000"
      }
    }
  }
}
```

### Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the new MCP server configuration.

## Advanced Configuration

### Environment Variables

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `PERSISTENCE_DB_PATH` | Database file location | `./conversations.db` |
| `PERSISTENCE_LOG_LEVEL` | Log level (debug, info, warn, error) | `info` |
| `PERSISTENCE_LOG_FILE` | Log file path | `./mcp-persistence.log` |
| `PERSISTENCE_MAX_DB_SIZE_MB` | Maximum database size in MB | `1000` |
| `PERSISTENCE_EMBEDDINGS_ENABLED` | Enable semantic search | `true` |
| `PERSISTENCE_EMBEDDINGS_BATCH_SIZE` | Batch size for embeddings | `100` |

### Model Configuration

To enable semantic search capabilities:

```bash
# Download embedding models (one-time setup)
npm run init:models

# Or if installed globally:
cd $(npm root -g)/mcp-persistence-server && npm run init:models
```

This will download approximately 200MB of AI models for semantic search functionality.

## Verification

### Test Basic Installation
```bash
# Check version
mcp-persistence-server --version

# Run health check
mcp-persistence-server --health-check

# Test with sample data (optional)
mcp-persistence-server --test-mode
```

### Test Claude Desktop Integration
1. Open Claude Desktop
2. Start a conversation
3. Try using these commands:
   - "Save this message to persistence"
   - "Search my previous conversations for [topic]"
   - "Show me my conversation history"

### Expected Output

When properly configured, you should see:
- Server startup message in logs
- 14 MCP tools registered
- Database initialization complete
- No error messages in Claude Desktop

## Troubleshooting

### Common Installation Issues

#### "Command not found: mcp-persistence-server"
```bash
# Check if npm global bin is in PATH
echo $PATH | grep -o $(npm config get prefix)/bin

# Add to PATH if missing (bash/zsh)
echo 'export PATH="$(npm config get prefix)/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

#### Permission Denied Errors
```bash
# On Linux/macOS, may need sudo for global install
sudo npm install -g mcp-persistence-server

# Alternative: configure npm to use different directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH="$HOME/.npm-global/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
npm install -g mcp-persistence-server
```

#### Module Resolution Errors
```bash
# Clear npm cache and reinstall
npm cache clean --force
npm uninstall -g mcp-persistence-server
npm install -g mcp-persistence-server
```

### Runtime Issues

#### Claude Desktop Cannot Connect
1. Verify the command path in your MCP configuration
2. Check server starts manually: `mcp-persistence-server --version`
3. Review logs for error messages
4. Ensure Node.js version compatibility (20.x+)

#### Database Issues
```bash
# Check database file permissions
ls -la ~/.claude/conversations.db

# Reset database (will lose data)
rm ~/.claude/conversations.db
# Server will recreate on next startup
```

#### Performance Issues
- Ensure sufficient disk space (models require ~200MB)
- Monitor memory usage during operation
- Consider adjusting `PERSISTENCE_MAX_DB_SIZE_MB`
- Use SSD storage for better performance

### Getting Help

If you encounter issues:

1. Check the [FAQ](https://github.com/yourusername/mcp-persistence-server/wiki/FAQ)
2. Search [existing issues](https://github.com/yourusername/mcp-persistence-server/issues)
3. Create a new issue with:
   - Your operating system and version
   - Node.js version (`node --version`)
   - Installation method used
   - Complete error messages
   - Steps to reproduce the problem

## Updating

### Update NPM Installation
```bash
# Check current version
mcp-persistence-server --version

# Update to latest version
npm update -g mcp-persistence-server

# Verify update
mcp-persistence-server --version
```

### Update Source Installation
```bash
cd /path/to/mcp-persistence-server
git pull origin main
npm install
npm run build
```

## Uninstallation

### Remove NPM Installation
```bash
npm uninstall -g mcp-persistence-server
```

### Remove Configuration
```bash
# Remove from Claude Desktop configuration
# Edit your claude_desktop_config.json file

# Optionally remove database and logs
rm ~/.claude/conversations.db
rm ./mcp-persistence.log
```

The server is now ready for use with Claude Desktop!