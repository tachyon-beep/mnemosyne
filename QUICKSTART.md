# MCP Persistence Server - Quick Start Guide

## 🚀 Prerequisites

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should show v18.x.x or higher
   ```

2. **Claude Desktop** installed on your system

## 📦 Installation

```bash
# Clone the repository
git clone <your-repo-url> mcp-persistence
cd mcp-persistence

# Install dependencies
npm install

# Build the project
npm run build

# Test the installation
node dist/index.js --help
```

## 🔧 Configuration

### 1. Find your Claude Desktop config file:

**macOS:**
```bash
open ~/Library/Application\ Support/Claude
# Config file: ~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```
# Open File Explorer and navigate to:
%APPDATA%\Claude\
# Config file: claude_desktop_config.json
```

### 2. Edit the configuration file:

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "persistence": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-persistence/dist/index.js"],
      "env": {
        "PERSISTENCE_DB_PATH": "~/Documents/Claude/conversations.db",
        "PERSISTENCE_LOG_LEVEL": "info"
      }
    }
  }
}
```

**Important:** Replace `/absolute/path/to/mcp-persistence` with the actual path where you cloned the repository.

### 3. Create the database directory:

**macOS/Linux:**
```bash
mkdir -p ~/Documents/Claude
```

**Windows:**
```cmd
mkdir %USERPROFILE%\Documents\Claude
```

## 🎯 Testing the Server

### 1. Test standalone (without Claude):

```bash
# Run the server directly
PERSISTENCE_DB_PATH=./test.db node dist/index.js

# In another terminal, check if the database was created
ls -la test.db
```

### 2. Enable in Claude Desktop:

1. **Quit Claude Desktop completely**
2. **Start Claude Desktop again**
3. Look for the MCP icon in the bottom-right of the input box
4. Click it to see available tools:
   - `save_message`
   - `search_messages`
   - `get_conversation`
   - `get_conversations`
   - `delete_conversation`

## 📝 First Test

Once Claude Desktop is running with the MCP server:

1. Type: "Save this message: Hello MCP Persistence Server!"
2. Claude should use the `save_message` tool
3. Then type: "Search for messages containing 'Hello'"
4. Claude should use the `search_messages` tool and find your message

## 🔍 Troubleshooting

### Check logs:

**macOS:**
```bash
tail -f ~/Library/Logs/Claude/mcp*.log
```

**Windows:**
```cmd
type "%APPDATA%\Claude\logs\mcp*.log"
```

### Common issues:

1. **"Command not found"** - Make sure to use full absolute paths in the config
2. **"Database locked"** - Ensure only one instance is running
3. **"Permission denied"** - Check file permissions on the database directory

### Manual test:

```bash
# Test if the server starts correctly
node dist/index.js 2>&1 | head -20

# Should show:
# Starting MCP Persistence Server...
# Database initialized at: <path>
# Server ready for MCP communication
```

## 📊 Verify Database

After using the persistence features:

```bash
# Check database contents (requires sqlite3)
sqlite3 ~/Documents/Claude/conversations.db ".tables"
# Should show: conversations messages messages_fts persistence_state

# Count messages
sqlite3 ~/Documents/Claude/conversations.db "SELECT COUNT(*) FROM messages;"
```

## 🎉 Success!

If you can see the MCP tools in Claude Desktop and successfully save/search messages, the persistence server is working correctly!

## 📖 Next Steps

- Read the [full documentation](README.md)
- Explore the [available tools](docs/human-docs/README.md)
- Check the [architecture](HLD.md) for advanced usage