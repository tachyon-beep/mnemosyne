#!/bin/bash

# MCP Persistence Server - Claude Desktop Setup Script
# This script configures Claude Desktop to use the Phase 5 MCP Persistence Server

set -e

echo "🚀 MCP Persistence Server - Claude Desktop Setup"
echo "================================================"

# Detect OS
if [[ "$OSTYPE" == "darwin"* ]]; then
    CONFIG_DIR="$HOME/Library/Application Support/Claude"
    PLATFORM="macOS"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "win32" ]]; then
    CONFIG_DIR="$APPDATA/Claude"
    PLATFORM="Windows"
else
    CONFIG_DIR="$HOME/.config/claude"
    PLATFORM="Linux"
fi

echo "📍 Platform detected: $PLATFORM"
echo "📁 Config directory: $CONFIG_DIR"

# Get the absolute path to the project
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📦 Project directory: $PROJECT_DIR"

# Create config directory if it doesn't exist
mkdir -p "$CONFIG_DIR"
mkdir -p "$HOME/.claude/persistence"

# Build the project if needed
if [ ! -d "$PROJECT_DIR/dist" ]; then
    echo "🔨 Building project..."
    cd "$PROJECT_DIR"
    npm install
    npm run build
else
    echo "✅ Build directory exists"
fi

# Run health check
echo "🏥 Running health check..."
if node "$PROJECT_DIR/dist/index.js" --health-check > /dev/null 2>&1; then
    echo "✅ Health check passed"
else
    echo "⚠️  Health check failed, but continuing setup..."
fi

# Create MCP configuration
CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"

# Backup existing config if it exists
if [ -f "$CONFIG_FILE" ]; then
    echo "📋 Backing up existing configuration..."
    cp "$CONFIG_FILE" "$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Create or update configuration
echo "📝 Creating MCP configuration..."

# Check if config exists and has mcpServers
if [ -f "$CONFIG_FILE" ] && grep -q "mcpServers" "$CONFIG_FILE"; then
    # Update existing config using Node.js
    node -e "
    const fs = require('fs');
    const config = JSON.parse(fs.readFileSync('$CONFIG_FILE', 'utf8'));
    config.mcpServers = config.mcpServers || {};
    config.mcpServers['mcp-persistence'] = {
        command: 'node',
        args: ['$PROJECT_DIR/dist/index.js'],
        env: {
            PERSISTENCE_DB_PATH: '$HOME/.claude/persistence/conversations.db',
            PERSISTENCE_LOG_LEVEL: 'info',
            PERSISTENCE_MAX_DB_SIZE_MB: '5000',
            PERSISTENCE_DEBUG: 'false',
            ENABLE_ANALYTICS: 'true',
            ENABLE_INCREMENTAL_PROCESSING: 'true',
            CACHE_EXPIRATION_MINUTES: '60',
            BATCH_PROCESSING_SIZE: '50',
            MAX_PROCESSING_TIME_MS: '30000'
        }
    };
    fs.writeFileSync('$CONFIG_FILE', JSON.stringify(config, null, 2));
    console.log('✅ Configuration updated');
    "
else
    # Create new config
    cat > "$CONFIG_FILE" << EOF
{
  "mcpServers": {
    "mcp-persistence": {
      "command": "node",
      "args": ["$PROJECT_DIR/dist/index.js"],
      "env": {
        "PERSISTENCE_DB_PATH": "$HOME/.claude/persistence/conversations.db",
        "PERSISTENCE_LOG_LEVEL": "info",
        "PERSISTENCE_MAX_DB_SIZE_MB": "5000",
        "PERSISTENCE_DEBUG": "false",
        "ENABLE_ANALYTICS": "true",
        "ENABLE_INCREMENTAL_PROCESSING": "true",
        "CACHE_EXPIRATION_MINUTES": "60",
        "BATCH_PROCESSING_SIZE": "50",
        "MAX_PROCESSING_TIME_MS": "30000"
      }
    }
  }
}
EOF
    echo "✅ Configuration created"
fi

# Create convenience scripts
echo "📜 Creating convenience scripts..."

# Create start script
cat > "$PROJECT_DIR/start-mcp-server.sh" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Starting MCP Persistence Server..."
node "$DIR/dist/index.js"
EOF
chmod +x "$PROJECT_DIR/start-mcp-server.sh"

# Create test script
cat > "$PROJECT_DIR/test-mcp-tools.sh" << 'EOF'
#!/bin/bash
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Testing MCP Persistence Server tools..."
node "$DIR/dist/index.js" --health-check
echo ""
echo "Available tools:"
echo "- Core: save_message, search_messages, get_conversation, get_conversations, delete_conversation"
echo "- Search: semantic_search, hybrid_search"
echo "- Knowledge: get_entity_history, find_related_conversations, get_knowledge_graph"
echo "- Intelligence: get_proactive_insights, check_for_conflicts, suggest_relevant_context, auto_tag_conversation"
echo "- Analytics: get_conversation_analytics, analyze_productivity_patterns, detect_knowledge_gaps"
echo "- Analytics: track_decision_effectiveness, generate_analytics_report, manage_index_optimization"
echo "- Metrics: get_index_performance_report, get_context_summary, get_relevant_snippets"
echo ""
echo "Total: 23 tools available"
EOF
chmod +x "$PROJECT_DIR/test-mcp-tools.sh"

echo ""
echo "✅ Setup Complete!"
echo ""
echo "📋 Configuration Details:"
echo "   - Config file: $CONFIG_FILE"
echo "   - Database: $HOME/.claude/persistence/conversations.db"
echo "   - Server: $PROJECT_DIR/dist/index.js"
echo "   - Tools: 23 MCP tools available"
echo ""
echo "🎯 Next Steps:"
echo "   1. Restart Claude Desktop"
echo "   2. The MCP server will start automatically"
echo "   3. All 23 tools will be available in conversations"
echo ""
echo "📊 Phase 5 Analytics Features:"
echo "   - Conversation flow analysis"
echo "   - Productivity pattern tracking"
echo "   - Knowledge gap detection"
echo "   - Decision quality monitoring"
echo "   - Comprehensive reporting"
echo ""
echo "🧪 Test the integration:"
echo "   ./test-mcp-tools.sh"
echo ""
echo "📖 For more information:"
echo "   See docs/MCP_INTEGRATION.md"