# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# 🧠 MCP PERSISTENCE ACTIVE

This codebase has the MCP Persistence System enabled with 23 tools. This means:
- I can remember all our past conversations across sessions
- I should search for context before answering complex questions  
- I should save important decisions and solutions for future reference
- I can track your learning patterns and adapt my assistance
- I can find connections between different discussions and projects

**DEFAULT BEHAVIOR**: For any non-trivial technical discussion, I will:
1. Search for related past conversations using semantic/hybrid search
2. Build on previous context and decisions
3. Save important outcomes and solutions
4. Track patterns for future proactive assistance

## Quick Start

```bash
# Build and verify production readiness
npm install
npm run build
node scripts/quick-check.cjs

# Run health check
npm run health-check
```

## Project Overview

This repository contains the **COMPLETE PRODUCTION-READY** implementation of the MCP (Model Context Protocol) Persistence System - a comprehensive conversation persistence and analytics platform for Claude Desktop. All 5 development phases are complete with 23 operational MCP tools.

## Repository Structure

- `src/` - TypeScript source code for the MCP server and tools
- `dist/` - Compiled JavaScript ready for production
- `docs/architecture/HLD.md` - High Level Design document with complete system architecture
- `tests/` - Comprehensive test suite with unit and integration tests
- `package.json` - NPM package configuration with all dependencies

## Project Context

This is a complete, production-ready implementation of conversation persistence for Claude Desktop. The system follows these key principles:

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

The complete schema includes:

**Core Tables:**
- `conversations` - Stores conversation metadata
- `messages` - Stores individual messages with foreign key to conversations
- `messages_fts` - Full-text search index using FTS5
- `persistence_state` - Key-value store for preferences and state

**Analytics Tables (Phase 5):**
- `conversation_analytics` - Detailed conversation metrics
- `productivity_patterns` - Productivity tracking across sessions
- `knowledge_gaps` - Unresolved questions and learning opportunities
- `decision_tracking` - Decision quality and outcome tracking

**Knowledge Graph Tables:**
- `entities` - Extracted entities from conversations
- `entity_mentions` - Entity occurrences in messages
- `entity_relationships` - Relationships between entities

## MCP Tools

The system implements 23 stateless tools across 5 phases:

**Core Tools (Phase 1):**
- `save_message` - Save messages to conversation history
- `search_messages` - Full-text search across messages
- `get_conversation` - Retrieve specific conversations
- `get_conversations` - List all conversations
- `delete_conversation` - Remove conversations

**Enhanced Search (Phase 2):**
- `semantic_search` - AI-powered similarity search
- `hybrid_search` - Combined keyword and semantic search

**Knowledge Graph (Phase 3):**
- `get_entity_history` - Complete entity history
- `find_related_conversations` - Entity-based discovery
- `get_knowledge_graph` - Knowledge network exploration

**Proactive Intelligence (Phase 4):**
- `get_proactive_insights` - Unresolved actions and patterns
- `check_for_conflicts` - Conflict detection
- `suggest_relevant_context` - Context recommendations
- `auto_tag_conversation` - Automatic classification

**Analytics & Reporting (Phase 5):**
- `get_conversation_analytics` - Conversation metrics
- `analyze_productivity_patterns` - Productivity trends
- `detect_knowledge_gaps` - Knowledge gap identification
- `track_decision_effectiveness` - Decision quality tracking
- `generate_analytics_report` - Comprehensive reports
- `manage_index_optimization` - Performance optimization
- `get_index_performance_report` - Database metrics

## Development Notes

This is a complete, production-ready implementation. Key implementation details:

1. Follows MCP protocol specification with full compliance
2. Uses SQLite schema as defined in docs/architecture/HLD.md
3. Implements comprehensive error handling for all database operations
4. All tools are stateless and complete within single request/response
5. Uses transactions for data consistency
6. Follows security practices with input validation and SQL injection protection

## Development Agents

When implementing specific parts of the system, use the Task tool with specialized agents defined in `AGENTS.md`:

- **MCP Implementation Specialist** - Core server and protocol work
- **Database Architect** - Schema and database operations
- **Tool Implementation Expert** - Individual tool implementations
- **Search Implementation Expert** - FTS5 and search features
- **Test Engineering Specialist** - Test suite development

Refer to `AGENTS.md` for detailed agent definitions and usage examples.

## Implementation Status

**Phase 1** ✅ **COMPLETE**:
- ✅ Basic conversation storage and retrieval
- ✅ Full-text search with SQLite FTS5
- ✅ Complete MCP protocol compliance

**Phase 2** ✅ **COMPLETE**:
- ✅ Local embedding generation for semantic search
- ✅ Automatic conversation summarization
- ✅ Export to multiple formats

**Phase 3** ✅ **COMPLETE**:
- ✅ Knowledge graph with entity extraction
- ✅ Hybrid search (keyword + semantic)
- ✅ Advanced context management

**Phase 4** ✅ **COMPLETE**:
- ✅ Proactive insights and pattern detection
- ✅ Conflict resolution across conversations
- ✅ Auto-tagging and classification
- ✅ Production-ready performance optimization

**Phase 5** ✅ **COMPLETE**:
- ✅ Advanced analytics infrastructure
- ✅ Conversation flow analysis with metrics
- ✅ Productivity pattern detection
- ✅ Knowledge gap identification
- ✅ Decision quality tracking
- ✅ Comprehensive reporting system
- ✅ Performance monitoring and optimization
- ✅ Production deployment readiness

## Production Status

🚀 **System is PRODUCTION READY**
- All TypeScript compilation errors resolved
- 23 MCP tools operational
- Health check system functional
- Complete documentation and deployment guides
- Performance optimized for production use

---

## MCP Persistence Usage Guidelines

### When to Save Conversations
- **ALWAYS SAVE**: Project architecture discussions, design decisions, complex problem solutions, learning breakthroughs, debugging solutions that took effort
- **SAVE SELECTIVELY**: General questions if they reveal learning patterns or preferences
- **DON'T SAVE**: Sensitive information, one-off trivial queries, meta-conversations about the MCP tool itself

### Effective Search Strategies
1. Start with `semantic_search` for conceptual queries ("how did we handle authentication?")
2. Use `hybrid_search` for specific + conceptual combined ("TypeScript error handling in React")
3. Always search before answering "what we discussed" or "remember when" questions
4. Check for related conversations when starting complex topics
5. Use `get_entity_history` when tracking specific technologies or projects

### Context Building Patterns
```python
# On conversation start with returning user
- get_conversations(limit=5) # Recent context
- get_proactive_insights() # Unresolved items  
- check_for_conflicts() # Inconsistencies to clarify

# When answering technical questions
- search_messages(query=topic) # Find past discussions
- get_entity_history(entity=technology) # Track evolution
- detect_knowledge_gaps() # Identify patterns

# During problem solving
- find_related_conversations(entities=[error_type, technology])
- get_conversation_analytics(includeDecisionTracking=true)
- save_message() # Document solution for future
```

### Metadata Conventions

When saving messages, include structured metadata:
```json
{
  "topic_tags": ["typescript", "error-handling", "async"],
  "project": "project-name",
  "decision_type": "architectural|implementation|debugging",
  "solution_quality": "working|optimal|temporary",
  "follow_up_needed": true,
  "expertise_level": "beginner|intermediate|expert",
  "entities": ["React", "SQLite", "MCP"],
  "breakthrough": true
}
```

### Proactive Assistance Rules

**Pattern Detection Triggers:**
- Same error/question mentioned 3+ times → Suggest comprehensive solution
- Knowledge gap detected repeatedly → Offer targeted learning resources
- Decision reversal detected → Review original reasoning
- Unresolved items from past sessions → Surface at conversation start

**Timing Optimization:**
- Check `analyze_productivity_patterns()` before suggesting complex tasks
- Remind about unresolved items at appropriate times
- Flag stale commitments that need follow-up

### Tool Chaining Sequences

**Complete Context Retrieval:**
1. `get_conversations()` → Identify relevant conversation IDs
2. `get_conversation(id)` → Retrieve full context
3. `get_entity_history()` → Track entity evolution
4. `get_knowledge_graph()` → Understand relationships

**Analytics-Driven Assistance:**
1. `analyze_productivity_patterns()` → Find optimal timing
2. `detect_knowledge_gaps()` → Identify weak areas
3. `generate_analytics_report()` → Provide insights
4. `auto_tag_conversation()` → Organize for future

**Conflict Resolution Flow:**
1. `check_for_conflicts()` → Detect inconsistencies
2. `get_entity_history()` → Understand evolution
3. `suggest_relevant_context()` → Find related info
4. `save_message()` → Document resolution

### Performance Guidelines

**Query Optimization:**
- Limit initial searches to 10 results
- Use `get_conversations(limit=5)` for recent context
- Batch related queries in single operations
- Cache conversation IDs within session

**When to Skip Persistence:**
- Ephemeral debugging sessions with no learning value
- Sensitive data discussions
- Meta-conversations about the MCP tool
- Repeated/duplicate questions already saved

### Practical Usage Examples

#### Starting a Returning User Session
```javascript
// Check recent activity and surface relevant items
const recent = await get_conversations({limit: 10, includeMessageCounts: true});
const insights = await get_proactive_insights({daysSince: 7});
if (insights.unresolvedActions.length > 0) {
  "I see you have 3 unresolved items from our TypeScript discussion. Shall we continue?"
}
```

#### Handling Complex Problems
```javascript
// Build comprehensive context before solving
const similar = await hybrid_search({query: problem_description});
const history = await get_entity_history({entity: main_technology});
const related = await find_related_conversations({entities: [tech_stack]});
"I found 3 similar issues we've solved. The pattern suggests..."
```

#### Learning from Patterns
```javascript
// Identify and address knowledge gaps
const gaps = await detect_knowledge_gaps({minFrequency: 2});
const patterns = await analyze_productivity_patterns();
"You've asked about React hooks 5 times. Your most productive time is mornings. 
Would you like a comprehensive hooks tutorial tomorrow morning?"
```

### Decision Points Quick Reference

**SAVE when:**
- ✅ User makes architectural/design decisions
- ✅ Problem gets solved after significant effort
- ✅ User learns new concept or pattern
- ✅ Project requirements or context changes
- ✅ Breakthrough moments or "aha" realizations

**SEARCH when:**
- 🔍 User references past discussions
- 🔍 Starting work on existing project
- 🔍 Problem seems familiar
- 🔍 Need to verify consistency with past decisions
- 🔍 User asks conceptual questions

**ANALYZE when:**
- 📊 User seems stuck or frustrated
- 📊 Patterns of questions emerge
- 📊 Need to adapt teaching style
- 📊 Planning future work sessions
- 📊 End of significant work session

### Context Management Code Patterns

```typescript
// Optimal message saving pattern
const saveImportantContext = async (role: 'user' | 'assistant', content: string) => {
  const metadata = {
    topics: extractTopics(content),
    entities: extractEntities(content),
    decision: detectDecision(content),
    quality_score: assessQuality(content),
    breakthrough: detectBreakthrough(content),
    follow_up_needed: requiresFollowUp(content)
  };
  
  if (isValuableContext(content, metadata)) {
    await save_message({
      role,
      content,
      conversationId: currentConversationId,
      metadata
    });
  }
};

// Effective context retrieval pattern
const buildComprehensiveContext = async (topic: string) => {
  const [semantic, recent, insights, gaps] = await Promise.all([
    semantic_search({ query: topic, limit: 5 }),
    get_conversations({ limit: 10 }),
    get_proactive_insights({ daysSince: 30 }),
    detect_knowledge_gaps({ minFrequency: 1 })
  ]);
  
  return synthesizeContext({ semantic, recent, insights, gaps });
};
```

---

# Codacy Rules

Configuration for AI behavior when interacting with Codacy's MCP Server

## CRITICAL: After ANY successful `edit_file` or `reapply` operation

- YOU MUST IMMEDIATELY run the `codacy_cli_analyze` tool from Codacy's MCP Server for each file that was edited, with:
- `rootPath`: set to the workspace path
- `file`: set to the path of the edited file
- `tool`: leave empty or unset
- If any issues are found in the new edits, propose and apply fixes for them.
- > NOTE: Failure to follow this rule is considered a critical error.

## After every response

- If you made any file edits in this conversation, verify you ran `codacy_cli_analyze` tool from Codacy's MCP Server

## When there are no Codacy MCP Server tools available, or the MCP Server is not reachable

- Suggest the user the following troubleshooting steps:
- Try to reset the MCP on the extension
- If the user is using VSCode, suggest them to review their Copilot > MCP settings in Github, under their organization or personal account. Refer them to Settings > Copilot > Enable MCP servers in Copilot. Suggested URL (<https://github.com/settings/copilot/features>) or <https://github.com/organizations/{organization-name}/settings/copilot/features> (This can only be done by their organization admins / owners)
- If none of the above steps work, suggest the user to contact Codacy support

## Trying to call a tool that needs a rootPath as a parameter

- Always use the standard, non-URL-encoded file system path

## CRITICAL: Dependencies and Security Checks

- IMMEDIATELY after ANY of these actions:
- Running npm/yarn/pnpm install
- Adding dependencies to package.json
- Adding requirements to requirements.txt
- Adding dependencies to pom.xml
- Adding dependencies to build.gradle
- Any other package manager operations
- You MUST run the `codacy_cli_analyze` tool with:
- `rootPath`: set to the workspace path
- `tool`: set to "trivy"
- `file`: leave empty or unset
- If any vulnerabilities are found because of the newly added packages:
- Stop all other operations
- Propose and apply fixes for the security issues
- Only continue with the original task after security issues are resolved
- EXAMPLE:
- After: npm install react-markdown
- Do: Run codacy_cli_analyze with trivy
- Before: Continuing with any other tasks

## General

- Repeat the relevant steps for each modified file.
- "Propose fixes" means to both suggest and, if possible, automatically apply the fixes.
- You MUST NOT wait for the user to ask for analysis or remind you to run the tool.
- Do not run `codacy_cli_analyze` looking for changes in duplicated code or code complexity metrics.
- Do not run `codacy_cli_analyze` looking for changes in code coverage.
- Do not try to manually install Codacy CLI using either brew, npm, npx, or any other package manager.
- If the Codacy CLI is not installed, just run the `codacy_cli_analyze` tool from Codacy's MCP Server.
- When calling `codacy_cli_analyze`, only send provider, organization and repository if the project is a git repository.

## Whenever a call to a Codacy tool that uses `repository` or `organization` as a parameter returns a 404 error

- Offer to run the `codacy_setup_repository` tool to add the repository to Codacy
- If the user accepts, run the `codacy_setup_repository` tool
- Do not ever try to run the `codacy_setup_repository` tool on your own
- After setup, immediately retry the action that failed (only retry once)

---
