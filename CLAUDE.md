# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository contains the design documentation for the MCP (Model Context Protocol) Persistence System - a system designed to add conversation persistence capabilities to Claude Desktop using MCP-compliant tools and SQLite storage.

## Repository Structure

- `HLD.md` - High Level Design document containing the complete system architecture, implementation details, and deployment guide
- `.claude/settings.local.json` - Claude configuration settings

## Project Context

This is a design documentation repository for implementing conversation persistence in Claude Desktop. The design follows these key principles:

- **Local-first**: SQLite as primary storage with optional cloud sync
- **MCP-compliant**: Stateless tools with proper JSON-RPC 2.0 implementation  
- **Progressive enhancement**: Start simple, add features based on proven need
- **Desktop-optimized**: Designed for single-user desktop application constraints
- **Privacy by default**: Local storage with explicit opt-in for any cloud features

## Architecture Overview

The system consists of:

1. **MCP Persistence Server** - A Node.js server implementing the MCP protocol
2. **SQLite Database** - Local storage for conversations and messages
3. **Tool Handler** - Stateless MCP tools for saving, retrieving, and searching conversations
4. **Search Engine** - Full-text search using SQLite FTS5
5. **Storage Manager** - Handles database operations and lifecycle

## Key Design Decisions

1. **SQLite with FTS5** for storage and search (no external dependencies)
2. **Stateless tools** per MCP specification - each tool completes in a single request/response
3. **Transaction-based operations** for data consistency
4. **Progressive enhancement** - basic features first, advanced features when proven necessary

## Implementation Technologies

Based on the HLD, the implementation will use:
- **Language**: TypeScript/JavaScript (Node.js)
- **Database**: SQLite with better-sqlite3
- **Protocol**: MCP (Model Context Protocol) with JSON-RPC 2.0
- **Validation**: Zod schemas
- **Testing**: Jest for unit/integration tests

## Database Schema

The core tables as defined in HLD.md:
- `conversations` - Stores conversation metadata
- `messages` - Stores individual messages with foreign key to conversations
- `messages_fts` - Full-text search index using FTS5
- `persistence_state` - Key-value store for preferences and state

## MCP Tools

The system implements these stateless tools:
- `save_message` - Save a message to conversation history
- `search_messages` - Search messages using full-text search
- `get_conversation` - Retrieve a conversation with its messages
- Additional tools for conversation management and export

## Development Notes

This is currently a design documentation repository. When implementing:

1. Follow the MCP protocol specification strictly
2. Use the SQLite schema exactly as defined in HLD.md
3. Implement proper error handling for all database operations
4. Ensure all tools are stateless and complete within single request/response
5. Use transactions for data consistency
6. Follow the security practices outlined in the Security and Privacy section

## Development Agents

When implementing specific parts of the system, use the Task tool with specialized agents defined in `AGENTS.md`:

- **MCP Implementation Specialist** - Core server and protocol work
- **Database Architect** - Schema and database operations
- **Tool Implementation Expert** - Individual tool implementations
- **Search Implementation Expert** - FTS5 and search features
- **Test Engineering Specialist** - Test suite development

Refer to `AGENTS.md` for detailed agent definitions and usage examples.

## Future Implementation Phases

**Phase 1** (Current design):
- Basic conversation storage and retrieval
- Full-text search
- MCP protocol compliance

**Phase 2** (3-6 months):
- Local embedding generation for semantic search
- Automatic conversation summarization
- Export to multiple formats

**Phase 3** (6-12 months):
- Optional cloud sync with end-to-end encryption
- Conversation branching
- Plugin system for custom analyzers