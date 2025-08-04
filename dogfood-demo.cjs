#!/usr/bin/env node

/**
 * Dogfooding Demo - Using MCP Persistence Server
 * 
 * This demonstrates real-world usage of the persistence server
 * by saving and retrieving conversations.
 */

const { execSync } = require('child_process');
const fs = require('fs');

// Create a separate dogfood database
const DOGFOOD_DB = './dogfood-demo.db';

// Remove existing dogfood database
if (fs.existsSync(DOGFOOD_DB)) {
  fs.unlinkSync(DOGFOOD_DB);
  console.log('🗑️  Removed existing dogfood database');
}

console.log('🐕 MCP Persistence Server Dogfooding Demo');
console.log('==========================================\n');

// Set environment to use dogfood database
process.env.DATABASE_PATH = DOGFOOD_DB;

// Function to run server command
function runServerCommand(command) {
  try {
    const output = execSync(`node dist/index.js ${command}`, {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_PATH: DOGFOOD_DB }
    });
    return output;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    return null;
  }
}

// Initialize the database
console.log('📦 Initializing dogfood database...');
runServerCommand('--health-check');
console.log('✅ Database initialized\n');

// Now let's interact with it using SQLite directly to simulate tool usage
console.log('🔧 Simulating tool usage...\n');

// Import necessary modules
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

// Open the database
const db = new Database(DOGFOOD_DB);

// Helper to create timestamps
const now = () => Date.now();

// Scenario 1: Create a conversation about MCP features
console.log('📝 Scenario 1: Creating a conversation about MCP features');
const conv1Id = uuidv4();
const conv1 = {
  id: conv1Id,
  created_at: now(),
  updated_at: now(),
  title: 'Understanding MCP Persistence Server',
  metadata: JSON.stringify({
    source: 'dogfood-demo',
    topic: 'mcp-features'
  })
};

db.prepare(`
  INSERT INTO conversations (id, created_at, updated_at, title, metadata)
  VALUES (?, ?, ?, ?, ?)
`).run(conv1.id, conv1.created_at, conv1.updated_at, conv1.title, conv1.metadata);

// Add messages to the conversation
const messages = [
  { role: 'user', content: 'What are the key features of the MCP Persistence Server?' },
  { role: 'assistant', content: 'The MCP Persistence Server provides several key features:\n\n1. **Message Storage**: Store conversation history in SQLite\n2. **Full-Text Search**: Search through message history with FTS5\n3. **Conversation Management**: Create, retrieve, and delete conversations\n4. **Phase 2 Features**:\n   - Hierarchical Summarization\n   - Smart Context Assembly\n   - Progressive Detail Retrieval\n   - LLM Provider Management' },
  { role: 'user', content: 'How does the hierarchical summarization work?' },
  { role: 'assistant', content: 'Hierarchical summarization works at three levels:\n\n**Brief** (50-100 tokens): High-level overview\n**Standard** (200-500 tokens): Key points and decisions\n**Detailed** (500-1000 tokens): Comprehensive summary with context\n\nThe system automatically generates summaries based on conversation age and importance.' }
];

messages.forEach((msg, index) => {
  const msgId = uuidv4();
  const timestamp = now() + (index * 1000); // Stagger timestamps
  
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, created_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(msgId, conv1Id, msg.role, msg.content, timestamp, JSON.stringify({}));
  
  // Also insert into FTS index
  db.prepare(`
    INSERT INTO messages_fts (id, conversation_id, content)
    VALUES (?, ?, ?)
  `).run(msgId, conv1Id, msg.content);
});

console.log(`✅ Created conversation with ${messages.length} messages\n`);

// Scenario 2: Create a technical conversation
console.log('📝 Scenario 2: Creating a technical conversation');
const conv2Id = uuidv4();
const conv2 = {
  id: conv2Id,
  created_at: now() + 5000,
  updated_at: now() + 5000,
  title: 'Implementing Embedding Search',
  metadata: JSON.stringify({
    source: 'dogfood-demo',
    topic: 'technical-implementation'
  })
};

db.prepare(`
  INSERT INTO conversations (id, created_at, updated_at, title, metadata)
  VALUES (?, ?, ?, ?, ?)
`).run(conv2.id, conv2.created_at, conv2.updated_at, conv2.title, conv2.metadata);

const technicalMessages = [
  { role: 'user', content: 'How do I implement semantic search using embeddings?' },
  { role: 'assistant', content: 'To implement semantic search with embeddings:\n\n```javascript\n// 1. Initialize the embedding manager\nconst embeddingManager = new EmbeddingManager(database);\nawait embeddingManager.initialize();\n\n// 2. Generate embeddings for messages\nconst embedding = await embeddingManager.generateEmbedding(messageContent);\n\n// 3. Store in embedding_cache table\nawait embeddingManager.cacheEmbedding(messageId, embedding);\n\n// 4. Search using cosine similarity\nconst results = await embeddingManager.findSimilar(queryEmbedding, limit);\n```' },
  { role: 'user', content: 'What model does it use for embeddings?' },
  { role: 'assistant', content: 'The system uses **Xenova/all-MiniLM-L6-v2** model which:\n- Generates 384-dimensional embeddings\n- Runs locally via ONNX\n- Optimized for semantic similarity\n- Fast inference (~100ms per embedding)\n- Good balance of quality and performance' }
];

technicalMessages.forEach((msg, index) => {
  const msgId = uuidv4();
  const timestamp = now() + 10000 + (index * 1000);
  
  db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, created_at, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(msgId, conv2Id, msg.role, msg.content, timestamp, JSON.stringify({}));
  
  db.prepare(`
    INSERT INTO messages_fts (id, conversation_id, content)
    VALUES (?, ?, ?)
  `).run(msgId, conv2Id, msg.content);
});

console.log(`✅ Created technical conversation with ${technicalMessages.length} messages\n`);

// Scenario 3: Test search functionality
console.log('🔍 Scenario 3: Testing search functionality');

const searchQueries = [
  'hierarchical summarization',
  'embeddings semantic search',
  'MCP features',
  'Xenova model'
];

searchQueries.forEach(query => {
  const results = db.prepare(`
    SELECT m.id, m.conversation_id, m.role, 
           snippet(messages_fts, 2, '<mark>', '</mark>', '...', 20) as snippet,
           rank
    FROM messages_fts
    JOIN messages m ON messages_fts.id = m.id
    WHERE messages_fts MATCH ?
    ORDER BY rank
    LIMIT 3
  `).all(query);
  
  console.log(`\nQuery: "${query}"`);
  console.log(`Found ${results.length} results`);
  results.forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.snippet}`);
  });
});

// Scenario 4: Add an LLM provider configuration
console.log('\n\n⚙️  Scenario 4: Configuring LLM providers');

const providerId = uuidv4();
db.prepare(`
  INSERT INTO llm_providers (
    id, name, type, endpoint, model_name, max_tokens, 
    temperature, is_active, priority, metadata, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  providerId,
  'Local Ollama Instance',
  'local',
  'http://localhost:11434',
  'llama2:13b',
  8192,
  0.7,
  1, // active
  100, // high priority
  JSON.stringify({ configured_by: 'dogfood-demo' }),
  now()
);

console.log('✅ Added LLM provider configuration\n');

// Scenario 5: Create a summary
console.log('📊 Scenario 5: Creating conversation summaries');

const summaryId = uuidv4();
db.prepare(`
  INSERT INTO conversation_summaries (
    id, conversation_id, level, summary_text, token_count,
    provider, model, generated_at, message_count, metadata
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  summaryId,
  conv1Id,
  'brief',
  'Discussion about MCP Persistence Server features including storage, search, and Phase 2 capabilities like hierarchical summarization.',
  25,
  'mock-provider',
  'mock-model',
  now(),
  4,
  JSON.stringify({})
);

console.log('✅ Created brief summary for conversation\n');

// Display statistics
console.log('📈 Database Statistics:');
const stats = {
  conversations: db.prepare('SELECT COUNT(*) as count FROM conversations').get().count,
  messages: db.prepare('SELECT COUNT(*) as count FROM messages').get().count,
  providers: db.prepare('SELECT COUNT(*) as count FROM llm_providers').get().count,
  summaries: db.prepare('SELECT COUNT(*) as count FROM conversation_summaries').get().count
};

console.log(`  - Conversations: ${stats.conversations}`);
console.log(`  - Messages: ${stats.messages}`);
console.log(`  - LLM Providers: ${stats.providers}`);
console.log(`  - Summaries: ${stats.summaries}`);

// Close the database
db.close();

console.log('\n✨ Dogfooding demo completed!');
console.log(`📁 Database created at: ${DOGFOOD_DB}`);
console.log('\nYou can now use the MCP server with this database:');
console.log(`  DATABASE_PATH=${DOGFOOD_DB} node dist/index.js`);