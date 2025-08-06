#!/bin/bash

# MCP Persistence Server Startup Script

# Set environment variables
export NODE_ENV=production
export DB_PATH="${DB_PATH:-./conversations.db}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export ENABLE_EMBEDDINGS=true
export EMBEDDING_MODEL="Xenova/all-MiniLM-L6-v2"
export EMBEDDING_CACHE_DIR="${HOME}/.cache/mcp-persistence/embeddings"

# Create necessary directories
mkdir -p "$(dirname "$DB_PATH")"
mkdir -p "$EMBEDDING_CACHE_DIR"

# Change to server directory
cd "$(dirname "$0")"

# Check if built
if [ ! -f "dist/index.js" ]; then
    echo "❌ Server not built. Running build..."
    npm run build
fi

# Start the server
echo "🚀 Starting MCP Persistence Server..."
echo "📁 Database: $DB_PATH"
echo "📊 Log Level: $LOG_LEVEL"
echo "🧠 Embeddings: $ENABLE_EMBEDDINGS"

# Run the server
exec node dist/index.js "$@"