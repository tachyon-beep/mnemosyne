/**
 * Initial Schema Migration
 *
 * Creates the core database schema for the MCP Persistence System:
 * - conversations table for conversation metadata
 * - messages table for message storage with foreign key constraints
 * - messages_fts virtual table for full-text search
 * - persistence_state table for key-value state storage
 * - Indexes for optimal query performance
 */
export const initialSchemaMigration = {
    version: 1,
    description: 'Create initial database schema with conversations, messages, FTS, and indexes',
    up: [
        // Create conversations table
        `CREATE TABLE conversations (
      id TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      title TEXT,
      metadata TEXT DEFAULT '{}'
    )`,
        // Create messages table with foreign key constraints
        `CREATE TABLE messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      parent_message_id TEXT,
      metadata TEXT DEFAULT '{}',
      embedding BLOB,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_message_id) REFERENCES messages(id)
    )`,
        // Create FTS5 virtual table for full-text search
        // Using content=messages means it's an external content FTS table
        // content_rowid=rowid links to the messages table rowid
        `CREATE VIRTUAL TABLE messages_fts USING fts5(
      content,
      content=messages,
      content_rowid=rowid
    )`,
        // Create indexes for optimal query performance
        // Index for conversation messages ordered by time (most common query)
        `CREATE INDEX idx_messages_conversation_time 
     ON messages(conversation_id, created_at DESC)`,
        // Index for parent message lookups (for threaded conversations)
        `CREATE INDEX idx_messages_parent 
     ON messages(parent_message_id) 
     WHERE parent_message_id IS NOT NULL`,
        // Index for conversations by update time (for recent conversations)
        `CREATE INDEX idx_conversations_updated 
     ON conversations(updated_at DESC)`,
        // Index for conversations by creation time
        `CREATE INDEX idx_conversations_created 
     ON conversations(created_at DESC)`,
        // Index for messages by role and time (for filtering by role)
        `CREATE INDEX idx_messages_role_time 
     ON messages(role, created_at DESC)`,
        // Create triggers to maintain FTS index
        // Trigger to update FTS when messages are inserted
        `CREATE TRIGGER messages_fts_insert AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END`,
        // Trigger to update FTS when messages are updated (specifically when content changes)
        `CREATE TRIGGER messages_fts_update AFTER UPDATE OF content ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END`,
        // Trigger to update FTS when messages are deleted
        `CREATE TRIGGER messages_fts_delete AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    END`,
        // Trigger to update conversation updated_at when messages are inserted
        `CREATE TRIGGER update_conversation_timestamp_insert 
     AFTER INSERT ON messages 
     BEGIN
       UPDATE conversations 
       SET updated_at = NEW.created_at 
       WHERE id = NEW.conversation_id;
     END`,
        // Trigger to update conversation updated_at when messages are updated
        `CREATE TRIGGER update_conversation_timestamp_update 
     AFTER UPDATE ON messages 
     BEGIN
       UPDATE conversations 
       SET updated_at = NEW.created_at 
       WHERE id = NEW.conversation_id;
     END`,
        // Note: persistence_state table is created by the migration runner itself
        // We don't need to create it here as it's needed for migration tracking
    ],
    down: [
        // Drop triggers first
        'DROP TRIGGER IF EXISTS update_conversation_timestamp_update',
        'DROP TRIGGER IF EXISTS update_conversation_timestamp_insert',
        'DROP TRIGGER IF EXISTS messages_fts_delete',
        'DROP TRIGGER IF EXISTS messages_fts_update',
        'DROP TRIGGER IF EXISTS messages_fts_insert',
        // Drop indexes
        'DROP INDEX IF EXISTS idx_messages_role_time',
        'DROP INDEX IF EXISTS idx_conversations_created',
        'DROP INDEX IF EXISTS idx_conversations_updated',
        'DROP INDEX IF EXISTS idx_messages_parent',
        'DROP INDEX IF EXISTS idx_messages_conversation_time',
        // Drop tables (FTS first due to dependency)
        'DROP TABLE IF EXISTS messages_fts',
        'DROP TABLE IF EXISTS messages',
        'DROP TABLE IF EXISTS conversations'
        // Note: We don't drop persistence_state as it's needed for migration tracking
    ]
};
//# sourceMappingURL=001_initial_schema.js.map