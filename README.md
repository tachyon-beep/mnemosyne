# MCP Persistence Server

[![MCP Protocol](https://img.shields.io/badge/MCP-1.0-blue)](https://modelcontextprotocol.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A high-performance, MCP-compliant persistence server for Claude Desktop that provides conversation history storage, advanced search capabilities, and intelligent context management.

## 🌟 Features

### Core Capabilities (Phase 1)
- **📝 Conversation Persistence**: Store and retrieve conversation history with full message threading
- **🔍 Full-Text Search**: Fast keyword search across all conversations using SQLite FTS5
- **🧠 Semantic Search** *(Enhanced)*: AI-powered similarity search using local embeddings
- **🔀 Hybrid Search** *(Enhanced)*: Combines keyword and semantic search for best results
- **🗂️ Conversation Management**: List, filter, and manage conversations with rich metadata
- **🛡️ Privacy-First**: All data stored locally, no external API calls

### Intelligent Context Management (Phase 2)
- **📊 Hierarchical Summarization**: Multi-level summaries (brief/standard/detailed) for conversations
- **🎯 Smart Context Assembly**: Relevance-based snippet selection with token budget management
- **🔄 Progressive Detail Retrieval**: Dynamically load conversation context based on needs
- **🤖 LLM Provider Support**: Flexible provider system (Ollama local, OpenAI API) for summarization
- **⚡ Context Caching**: Intelligent caching system for fast context retrieval
- **📈 Quality Scoring**: Automated quality assessment for generated summaries

### Technical Excellence
- **⚡ High Performance**: Sub-second response times with optimized database operations
- **🔒 Enterprise Security**: Input sanitization, SQL injection protection, secure error handling
- **🎯 MCP Compliant**: Fully stateless tools following Model Context Protocol standards
- **📊 Rich Analytics**: Conversation statistics, message counts, role distribution
- **♻️ Graceful Degradation**: Falls back to basic features if enhanced capabilities unavailable

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or later
- npm or yarn
- Claude Desktop application

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/mcp-persistence-server.git
cd mcp-persistence-server

# Install dependencies
npm install

# Build the project
npm run build

# (Optional) Initialize embedding models for enhanced search
npm run init:models
```

### Configuration

Add to your Claude Desktop configuration:

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

## 📖 Usage

Once configured, the following MCP tools are available in Claude Desktop:

### Basic Tools
- **`save_message`**: Save a message to conversation history
- **`get_conversation`**: Retrieve a conversation with its messages
- **`get_conversations`**: List conversations with filtering options
- **`search_messages`**: Search messages using full-text search
- **`delete_conversation`**: Delete a conversation (soft or permanent)

### Enhanced Search Tools (with embedding model)
- **`semantic_search`**: Search using AI-powered similarity matching
- **`hybrid_search`**: Combine keyword and semantic search for best results

### Context Management Tools (Phase 2)
- **`get_relevant_snippets`**: Retrieve contextually relevant message snippets
- **`get_progressive_detail`**: Get conversation summaries at different detail levels
- **`configure_llm_provider`**: Configure LLM providers for summarization

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

The system is designed for high performance with:
- **Message Save**: < 50ms
- **FTS Search**: < 100ms
- **Semantic Search**: < 500ms
- **Hybrid Search**: < 750ms
- **Conversation Retrieval**: < 100ms

## 🔒 Security

- **Input Sanitization**: All user inputs are validated and sanitized
- **SQL Injection Protection**: Parameterized queries throughout
- **Error Handling**: No sensitive information in error messages
- **Local Storage**: All data remains on the user's machine
- **No Telemetry**: No usage data collection

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

### Common Issues

**FTS Search Not Working**
- Ensure database migrations have run: `npm run build && npm start`
- Check database permissions

**Enhanced Search Not Available**
- Run `npm run init:models` to download embedding models
- Ensure you have internet access for initial model download

**Performance Issues**
- Check database size with `PERSISTENCE_MAX_DB_SIZE_MB`
- Run database optimization: included in startup routine

## 📞 Support

- 🐛 [Report Issues](https://github.com/yourusername/mcp-persistence-server/issues)
- 💬 [Discussions](https://github.com/yourusername/mcp-persistence-server/discussions)
- 📖 [Wiki](https://github.com/yourusername/mcp-persistence-server/wiki)

---

Built with ❤️ for the Claude Desktop community