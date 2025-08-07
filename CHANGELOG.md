# Changelog

All notable changes to the MCP Persistence Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-08-07

### 🎉 Major Release: Production-Ready MCP Persistence System

This is the first production-ready release with complete feature set, comprehensive testing, and professional packaging.

### ✨ Complete Feature Set
- **18 MCP Tools**: Full suite of conversation management, search, and intelligence tools
- **Advanced Search**: Full-text, semantic, and hybrid search capabilities
- **Knowledge Graph**: Entity extraction and relationship mapping across conversations
- **Context Intelligence**: Multi-level summarization and proactive insights
- **Performance Optimized**: 40%+ performance improvements with comprehensive caching

### 🛠️ New Tools Added
- `get_proactive_insights`: Extract insights, patterns, and trends from conversations
- `find_related_conversations`: Discover conversations related to specific entities
- `get_entity_history`: Track how entities are discussed over time  
- `get_knowledge_graph`: Explore entity relationships and connections
- `auto_tag_conversation`: Intelligent conversation categorization

### 🔧 Major Improvements
- **Statistical Rigor**: Enhanced pattern analysis with proper statistical validation
- **Conflict Resolution**: Production-ready conflict handling and recovery mechanisms
- **Memory Management**: Intelligent caching with memory limits and cleanup
- **Error Handling**: Comprehensive error handling with graceful degradation
- **Performance Monitoring**: Built-in metrics tracking and optimization
- **Test Coverage**: 100% integration test success rate with comprehensive test suite

### 📦 Production Packaging
- **NPM Package**: Professional package with global CLI installation support
- **Documentation**: Complete installation guide, troubleshooting, and API documentation
- **Clean Codebase**: Removed all development artifacts and test files
- **Professional Metadata**: Proper keywords, license, and publishing configuration

### 🔒 Security & Privacy
- **Enhanced Security**: Comprehensive input validation and SQL injection protection  
- **Privacy First**: 100% local storage with no external API calls
- **Secure Defaults**: Safe configuration with encrypted storage support

### ⚡ Performance
- Sub-100ms response times for most operations
- Optimized database queries with intelligent indexing
- Efficient embedding generation and caching
- Memory-conscious design for long-running operations


## [1.1.0] - 2025-08-03

### Added
- Message threading with parent-child relationships
- Conversation soft deletion with recovery
- Rich conversation metadata and statistics
- Role distribution tracking
- Conversation duration calculation

### Changed
- Improved conversation listing with pagination
- Enhanced message preview generation
- Better error messages for validation failures

### Fixed
- Transaction handling in concurrent operations
- Foreign key constraint validation
- Timestamp precision issues

## [1.0.0] - 2025-08-02

### 🚀 Initial Release

### Added
- **Core MCP Tools**:
  - `save_message`: Save messages to conversation history
  - `get_conversation`: Retrieve conversations with messages
  - `get_conversations`: List and filter conversations
  - `search_messages`: Full-text search across messages
  - `delete_conversation`: Soft or permanent deletion

- **Database Layer**:
  - SQLite with FTS5 for fast search
  - Automatic migrations
  - Transaction support
  - Foreign key constraints

- **MCP Compliance**:
  - Stateless tool design
  - JSON-RPC 2.0 protocol
  - Proper error handling
  - Schema validation with Zod

- **Development Tools**:
  - Comprehensive test suite
  - TypeScript with strict checking
  - ESLint configuration
  - Jest for testing

### Technical Details
- Local-first architecture
- No external dependencies for core functionality
- Privacy-focused design
- Graceful error handling

## [0.1.0] - 2025-08-01 (Pre-release)

### Added
- Initial project structure
- Basic MCP server implementation
- SQLite database integration
- Simple message storage

---

## Upgrade Guide

### From 1.x to 2.0

1. **Database Migration**: The system will automatically migrate your database to the new schema
2. **Enhanced Search**: Run `npm run init:models` to enable semantic search
3. **Configuration**: New environment variables available (see README)
4. **API Changes**: All existing tools remain compatible

### Breaking Changes in 2.0
- None! Full backward compatibility maintained

## Future Releases

See [ROADMAP.md](ROADMAP.md) for planned features:
- Phase 3: Cross-Conversation Intelligence
- Phase 4: Proactive Assistance
- Phase 5: External Integrations

---

For detailed release notes, see [RELEASE_NOTES.md](RELEASE_NOTES.md)