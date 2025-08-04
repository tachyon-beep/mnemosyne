#!/bin/bash

# Dogfooding Script - Real usage of MCP Persistence Server
echo "🐕 MCP Persistence Server Dogfooding Test"
echo "=========================================="
echo ""
echo "Creating a separate dogfood database for testing..."

# Set up environment
export DATABASE_PATH="./dogfood-test.db"
export LOG_LEVEL="info"

# Remove old dogfood database if exists
rm -f $DATABASE_PATH

echo "📁 Database: $DATABASE_PATH"
echo ""

# Run the persistence server with test commands
echo "🚀 Starting server and running test scenarios..."
echo ""

# Test 1: Save messages using the actual MCP tools
echo "📝 Test 1: Creating a conversation about persistence"
node dist/cli.js save-message \
  --role user \
  --content "I'm testing the MCP Persistence Server dogfood style! This is amazing." \
  --metadata '{"test": "dogfood", "scenario": 1}'

echo ""

# Get the conversation ID from the output (we'll simulate for now)
CONV_ID=$(sqlite3 $DATABASE_PATH "SELECT id FROM conversations ORDER BY created_at DESC LIMIT 1")

echo "📝 Adding assistant response..."
node dist/cli.js save-message \
  --conversationId "$CONV_ID" \
  --role assistant \
  --content "Great to hear you're testing the system! The MCP Persistence Server is designed to handle conversation storage with advanced features like hierarchical summarization, semantic search, and progressive detail retrieval."

echo ""

# Test 2: Search functionality
echo "🔍 Test 2: Searching for messages"
node dist/cli.js search \
  --query "MCP Persistence" \
  --limit 5

echo ""

# Test 3: Get conversation
echo "📖 Test 3: Retrieving conversation"
node dist/cli.js get-conversation \
  --conversationId "$CONV_ID" \
  --includeMessages true

echo ""

# Test 4: Database stats
echo "📊 Test 4: Database statistics"
sqlite3 $DATABASE_PATH <<EOF
SELECT 'Conversations:', COUNT(*) FROM conversations
UNION ALL
SELECT 'Messages:', COUNT(*) FROM messages
UNION ALL
SELECT 'FTS Entries:', COUNT(*) FROM messages_fts
UNION ALL
SELECT 'LLM Providers:', COUNT(*) FROM llm_providers
UNION ALL
SELECT 'Summaries:', COUNT(*) FROM conversation_summaries;
EOF

echo ""
echo "✨ Dogfooding test completed!"
echo "📁 Database saved at: $DATABASE_PATH"