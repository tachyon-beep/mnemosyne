# MCP Persistence Server

[![MCP Protocol](https://img.shields.io/badge/MCP-1.0-blue)](https://modelcontextprotocol.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/mcp-persistence-server.svg)](https://www.npmjs.com/package/mcp-persistence-server)

A production-ready, high-performance MCP-compliant persistence server for Claude Desktop. Features conversation history storage, advanced search capabilities, knowledge graph relationships, and intelligent context management.

## 🌟 Features

### Core Persistence & Search
- **📝 Conversation History**: Complete conversation storage with message threading and metadata
- **🔍 Full-Text Search**: Lightning-fast keyword search across all conversations using SQLite FTS5
- **🧠 Semantic Search**: AI-powered similarity search using local embeddings (privacy-first)
- **🔀 Hybrid Search**: Combined keyword + semantic search for optimal results
- **🗂️ Advanced Management**: List, filter, tag, and organize conversations with rich metadata

### Knowledge & Intelligence
- **🕸️ Knowledge Graph**: Entity extraction and relationship mapping across conversations
- **📊 Context Summarization**: Multi-level summaries (brief/standard/detailed) with quality scoring
- **🎯 Smart Snippets**: Relevance-based snippet retrieval with token budget management
- **🔄 Progressive Detail**: Dynamically load conversation context based on current needs
- **🏷️ Auto-Tagging**: Intelligent conversation categorization and classification

### Enterprise Features
- **🛡️ Privacy-First**: 100% local storage, no external API calls, your data never leaves your machine
- **🔒 Security Hardened**: Input sanitization, SQL injection protection, secure error handling
- **⚡ High Performance**: Sub-100ms response times with intelligent caching and optimization
- **🎯 MCP Compliant**: Fully stateless tools following Model Context Protocol standards
- **🔧 Configurable**: Flexible LLM provider support (Ollama, OpenAI) with graceful degradation

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or later
- Claude Desktop application
- 500MB free disk space (for models and data)

### Installation

#### Option 1: NPM Install (Recommended)
```bash
# Install globally via npm
npm install -g mcp-persistence-server

# Verify installation
mcp-persistence-server --version
```

#### Option 2: From Source
```bash
# Clone the repository
git clone https://github.com/mcp-community/mcp-persistence-server.git
cd mcp-persistence-server

# Install dependencies and build
npm install && npm run build

# (Optional) Initialize embedding models for semantic search
npm run init:models
```

### Configuration

#### NPM Installation Configuration
Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "mcp-persistence": {
      "command": "mcp-persistence-server",
      "env": {
        "PERSISTENCE_DB_PATH": "~/.claude/conversations.db",
        "PERSISTENCE_LOG_LEVEL": "info"
      }
    }
  }
}
```

#### Source Installation Configuration
```json
{
  "mcpServers": {
    "mcp-persistence": {
      "command": "node",
      "args": ["/path/to/mcp-persistence-server/dist/index.js"],
      "env": {
        "PERSISTENCE_DB_PATH": "~/.claude/conversations.db",
        "PERSISTENCE_LOG_LEVEL": "info"
      }
    }
  }
}
```

## 📖 Available Tools

The server provides 14 MCP-compliant tools organized into logical groups:

### 📝 Core Persistence Tools
- **`save_message`**: Save messages to conversation history with threading support
- **`get_conversation`**: Retrieve conversations with full message history
- **`get_conversations`**: List and filter conversations with metadata
- **`delete_conversation`**: Remove conversations (soft or permanent deletion)

### 🔍 Search & Discovery Tools
- **`search_messages`**: Lightning-fast full-text search across all messages
- **`semantic_search`**: AI-powered similarity search using local embeddings
- **`hybrid_search`**: Combined keyword + semantic search for optimal results
- **`get_relevant_snippets`**: Context-aware snippet retrieval with relevance scoring

### 🧠 Intelligence & Context Tools
- **`get_context_summary`**: Generate conversation summaries at multiple detail levels
- **`get_progressive_detail`**: Dynamically load conversation context based on needs
- **`get_proactive_insights`**: Extract insights, patterns, and trends from conversations
- **`configure_llm_provider`**: Configure AI providers (Ollama, OpenAI) for enhanced features

### 🕸️ Knowledge Graph Tools
- **`find_related_conversations`**: Discover conversations related to specific entities
- **`get_entity_history`**: Track how entities are discussed over time
- **`get_knowledge_graph`**: Explore entity relationships and connections across conversations

### Example Usage

```typescript
// Save a message
await save_message({
  role: "user",
  content: "What's the weather like today?",
  metadata: { timestamp: new Date().toISOString() }
});

// Search for messages
await search_messages({
  query: "weather",
  matchType: "fuzzy",
  limit: 10
});

// Semantic search (if enhanced features enabled)
await semantic_search({
  query: "climate conditions",
  threshold: 0.7
});
```

### 🔍 Semantic Search Demo

The semantic search feature uses AI-powered embeddings to find conceptually related messages, even when they don't share exact keywords.

#### How It Works

Semantic search converts text into numerical vectors (embeddings) that capture meaning. Similar concepts have similar vectors, allowing the system to find related content based on meaning rather than just matching words.

#### Example: Weather Discussion

Let's say you've had these conversations:

```typescript
// Past conversations stored in the system:
// 1. "What's the weather forecast for tomorrow?"
// 2. "It's been raining heavily all week"
// 3. "The climate has been unusually warm this year"
// 4. "I need to check if I should bring an umbrella"
// 5. "The atmospheric pressure is dropping rapidly"
```

#### Comparing Search Approaches

| Search Query | Keyword Search Results | Semantic Search Results |
|--------------|----------------------|------------------------|
| "weather" | ✅ Message 1<br>❌ Messages 2-5 | ✅ Messages 1-5 (all related) |
| "precipitation" | ❌ No results | ✅ Messages 2, 4 (rain concepts) |
| "meteorology" | ❌ No results | ✅ Messages 1, 3, 5 (weather science) |
| "should I wear a raincoat?" | ❌ No results | ✅ Messages 2, 4 (rain protection) |

#### Real-World Example

```typescript
// Scenario: Finding discussions about programming difficulties
// even when users expressed it differently

// Saved messages over time:
await save_message({
  content: "I'm struggling with this recursive function",
  role: "user"
});

await save_message({
  content: "The algorithm complexity is overwhelming",
  role: "user"  
});

await save_message({
  content: "Debugging this code is driving me crazy",
  role: "user"
});

// Semantic search finds all related messages
const results = await semantic_search({
  query: "coding challenges and difficulties",
  threshold: 0.7,
  explainResults: true
});

// Results would include all three messages with explanations:
// 1. "struggling with recursive function" - similarity: 0.82
//    Explanation: Related to programming difficulties
// 2. "algorithm complexity overwhelming" - similarity: 0.79
//    Explanation: Expresses coding challenges
// 3. "Debugging code driving me crazy" - similarity: 0.85
//    Explanation: Describes programming frustration
```

#### Advanced Features

**1. Similarity Threshold Control**
```typescript
// High threshold (0.9) - Only very similar results
await semantic_search({
  query: "machine learning neural networks",
  threshold: 0.9  // Strict matching
});

// Lower threshold (0.6) - Broader results
await semantic_search({
  query: "machine learning neural networks",
  threshold: 0.6  // More inclusive
});
```

**2. Contextual Time Filtering**
```typescript
// Find recent discussions about a concept
await semantic_search({
  query: "project deadlines and time management",
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  threshold: 0.75
});
```

**3. Explanation Mode**
```typescript
// Get explanations for why results matched
const explained = await semantic_search({
  query: "data privacy and security concerns",
  explainResults: true,
  limit: 5
});

// Each result includes:
// - similarity: 0.78
// - explanation: "Discusses security implications of data handling"
```

#### Performance Characteristics

- **Speed**: 200-500ms for typical queries
- **Accuracy**: High precision for conceptual matching
- **Model**: Uses all-MiniLM-L6-v2 (efficient, multilingual)
- **Local Processing**: No external API calls, preserving privacy

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PERSISTENCE_DB_PATH` | Database file location | `./conversations.db` |
| `PERSISTENCE_MAX_DB_SIZE_MB` | Maximum database size | `1000` |
| `PERSISTENCE_LOG_LEVEL` | Logging level | `info` |
| `PERSISTENCE_LOG_FILE` | Log file path | `./mcp-persistence.log` |
| `PERSISTENCE_EMBEDDINGS_ENABLED` | Enable semantic search | `true` |
| `PERSISTENCE_EMBEDDINGS_BATCH_SIZE` | Batch size for embeddings | `100` |

## 🏗️ Architecture

The system follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Desktop                         │
├─────────────────────────────────────────────────────────┤
│                    MCP Client                            │
└────────────────────┬───────────────────────────────────┘
                     │ stdio (JSON-RPC 2.0)
┌────────────────────┴───────────────────────────────────┐
│              MCP Persistence Server                      │
├─────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │   Tool      │  │   Storage    │  │   Enhanced    │ │
│  │  Handler    │  │   Manager    │  │   Search      │ │
│  └─────────────┘  └──────────────┘  └───────────────┘ │
├─────────────────────────────────────────────────────────┤
│                 SQLite Database (Local)                  │
└─────────────────────────────────────────────────────────┘
```

## 🧪 Development

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:enhanced-search
npm run test:integration
npm run test:performance
```

### Development Mode

```bash
# Watch mode with auto-reload
npm run dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix
```

### Building

```bash
# Clean and build
npm run clean
npm run build
```

## 📊 Performance

Optimized for production workloads with consistently fast response times:

| Operation | Typical Response Time | Optimized For |
|-----------|----------------------|---------------|
| **Message Save** | < 50ms | Conversation storage |
| **Full-Text Search** | < 100ms | Keyword queries |
| **Semantic Search** | < 300ms | Similarity matching |
| **Hybrid Search** | < 400ms | Best-of-both search |
| **Conversation Retrieval** | < 75ms | Thread reconstruction |
| **Knowledge Graph Queries** | < 200ms | Entity relationships |
| **Context Summarization** | < 2s | LLM-generated summaries |

*Performance tested on modern hardware with typical conversation datasets (10K+ messages)*

## 🔒 Security & Privacy

### Security Measures
- **Input Sanitization**: All user inputs validated against strict schemas
- **SQL Injection Protection**: Parameterized queries and prepared statements throughout
- **Secure Error Handling**: No sensitive information exposed in error messages
- **Model Validation**: Embedding model names validated to prevent arbitrary code execution

### Privacy Guarantees  
- **100% Local Storage**: All data remains on your machine, never transmitted externally
- **No Telemetry**: Zero usage data collection or analytics
- **No External APIs**: Core functionality works entirely offline
- **Encryption Ready**: Database encryption support for sensitive data

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the [Model Context Protocol](https://modelcontextprotocol.org) ecosystem
- Powered by [SQLite](https://www.sqlite.org/) and [better-sqlite3](https://github.com/WiseLibs/better-sqlite3)
- Enhanced search using [Transformers.js](https://github.com/xenova/transformers.js)

## 📚 Documentation

- [Quick Start Guide](QUICKSTART.md)
- [Architecture Overview](docs/architecture/HLD.md)
- [Enhanced Search Design](docs/architecture/HLD-Search.md)
- [Development Roadmap](ROADMAP.md)
- [Release Notes](RELEASE_NOTES.md)

## 🐛 Troubleshooting

### Installation Issues

**"Command not found" after npm install**
```bash
# Ensure npm global bin is in PATH
echo $PATH | grep -q "$(npm config get prefix)/bin" || echo "Add $(npm config get prefix)/bin to PATH"

# Or install locally
npm install mcp-persistence-server
npx mcp-persistence-server
```

**Permission denied errors**
```bash
# On macOS/Linux, may need sudo for global install
sudo npm install -g mcp-persistence-server

# Or use npm prefix to avoid sudo
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
npm install -g mcp-persistence-server
```

### Runtime Issues

**Claude Desktop can't connect to server**
- Verify the command path in your Claude Desktop MCP configuration
- Check that the server starts without errors: `mcp-persistence-server --version`
- Review logs in the specified log file location

**Search features not working**
- Full-text search requires database initialization (automatic on first run)
- Semantic search requires model download: `npm run init:models`
- Check available disk space (models require ~200MB)

**Performance degradation**
- Database size may be large - check `PERSISTENCE_MAX_DB_SIZE_MB` setting
- Consider running periodic cleanup of old conversations
- Monitor memory usage and adjust cache settings if needed

## 📞 Support

- 🐛 **Report Issues**: Submit bug reports and feature requests via GitHub Issues
- 💬 **Community**: Join discussions about MCP persistence implementations  
- 📖 **Documentation**: Comprehensive guides and API documentation included

---

Built with ❤️ for the Claude Desktop community