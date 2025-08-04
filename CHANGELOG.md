# Changelog

All notable changes to the MCP Persistence Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-08-04

### 🎉 Major Release: Enhanced Search & Discovery

This release introduces powerful semantic search capabilities, comprehensive security improvements, and performance optimizations.

### Added
- **Semantic Search**: AI-powered similarity search using local embeddings
- **Hybrid Search**: Combined keyword and semantic search for best results
- **Enhanced Security**: Comprehensive input sanitization and SQL injection protection
- **Performance Monitoring**: Built-in metrics tracking and optimization
- **LRU Cache**: Memory-efficient caching for embeddings
- **Circuit Breaker**: Resilient error handling for model failures
- **Thread Safety**: Operation locking for concurrent access
- **Query Analysis**: Intelligent search strategy selection

### Changed
- **Database Schema**: Enhanced with embedding storage and search configuration
- **Migration System**: Improved with SQLite version checks and safe rollback
- **Error Handling**: Standardized error responses without information leakage
- **Search Engine**: Complete rewrite with modular architecture
- **Build System**: Full ES module support with proper import resolution

### Fixed
- **Memory Management**: Fixed cache eviction and memory leaks
- **FTS Indexing**: Corrected trigger patterns and automatic indexing
- **SQL Injection**: Comprehensive query sanitization
- **Race Conditions**: Fixed concurrent operation conflicts
- **Module Resolution**: ES module import paths corrected

### Security
- Input validation for all user inputs
- Query sanitization to prevent injection attacks
- Secure error messages without stack traces
- Model name validation to prevent arbitrary loading

### Performance
- Chunked processing for large datasets
- Optimized vector similarity calculations
- Efficient database indexing strategies
- Smart caching with memory limits

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
- Phase 2: Intelligent Context Management
- Phase 3: Cross-Conversation Intelligence
- Phase 4: Proactive Assistance

---

For detailed release notes, see [RELEASE_NOTES.md](RELEASE_NOTES.md)