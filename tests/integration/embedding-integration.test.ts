/**
 * Integration tests for embedding functionality
 * 
 * Tests the complete embedding workflow from model initialization
 * to semantic search integration
 */

import { EmbeddingManager } from '../../src/search/EmbeddingManager';
import { MockEmbeddingManager } from '../utils/MockEmbeddingManager';
import { DatabaseManager } from '../../src/storage/Database';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Embedding Integration Tests', () => {
  let embeddingManager: EmbeddingManager;
  let dbManager: DatabaseManager;
  let testCacheDir: string;

  beforeAll(async () => {
    // Set up test environment
    testCacheDir = join(process.cwd(), '.integration-test-cache');
    if (!existsSync(testCacheDir)) {
      mkdirSync(testCacheDir, { recursive: true });
    }

    // Initialize database manager with in-memory database
    dbManager = new DatabaseManager({ databasePath: ':memory:' });
    await dbManager.initialize();
  });

  beforeEach(async () => {
    // Set up enhanced search schema for each test
    const db = dbManager.getConnection();
    
    // Drop and recreate enhanced search components
    try {
      db.exec('DROP TRIGGER IF EXISTS messages_fts_insert');
      db.exec('DROP TRIGGER IF EXISTS messages_fts_delete');
      db.exec('DROP TRIGGER IF EXISTS messages_fts_update');
      db.exec('DROP INDEX IF EXISTS idx_messages_conversation_time');
      db.exec('DROP INDEX IF EXISTS idx_messages_embedding');
      db.exec('DROP INDEX IF EXISTS idx_search_metrics_time');
      db.exec('DROP TABLE IF EXISTS messages_fts');
      db.exec('DROP TABLE IF EXISTS search_metrics');
    } catch (e) {
      // Ignore errors if they don't exist
    }
    
    db.exec(`
      -- Core tables (may already exist from DatabaseManager.initialize)
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        embedding TEXT, -- JSON array of floats
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      -- Search configuration and metadata
      CREATE TABLE IF NOT EXISTS search_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Enhanced FTS configuration
      CREATE VIRTUAL TABLE messages_fts USING fts5(
        content,
        content=messages,
        content_rowid=rowid,
        tokenize='porter unicode61 remove_diacritics 1'
      );

      -- FTS triggers
      CREATE TRIGGER messages_fts_insert AFTER INSERT ON messages BEGIN
        INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
      END;

      CREATE TRIGGER messages_fts_delete AFTER DELETE ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      END;

      CREATE TRIGGER messages_fts_update AFTER UPDATE OF content ON messages BEGIN
        INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
        INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
      END;

      -- Persistence state
      CREATE TABLE IF NOT EXISTS persistence_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Performance tracking
      CREATE TABLE search_metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_type TEXT NOT NULL CHECK (query_type IN ('fts', 'semantic', 'hybrid')),
        query_text TEXT NOT NULL,
        result_count INTEGER NOT NULL,
        execution_time_ms INTEGER NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      );

      -- Indexes
      CREATE INDEX idx_messages_conversation_time ON messages(conversation_id, created_at DESC);
      CREATE INDEX idx_messages_embedding ON messages(conversation_id, created_at DESC) WHERE embedding IS NOT NULL;
      CREATE INDEX idx_search_metrics_time ON search_metrics(created_at DESC);

      -- Default configuration
      INSERT OR REPLACE INTO search_config (key, value, updated_at) VALUES
        ('embedding_model', '"Xenova/all-MiniLM-L6-v2"', unixepoch()),
        ('embedding_dimensions', '384', unixepoch()),
        ('fts_tokenizer', 'porter unicode61', unixepoch()),
        ('hybrid_search_weights', '{"semantic": 0.6, "fts": 0.4}', unixepoch());
    `);

    console.log('✅ Test database schema initialized');
  });

  afterAll(async () => {
    // Clean up resources
    if (embeddingManager) {
      embeddingManager.destroy();
    }
    
    if (dbManager) {
      dbManager.close();
    }
    
    // Clean up test cache directory
    if (existsSync(testCacheDir)) {
      rmSync(testCacheDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    // Create fresh embedding manager for each test
    const config = {
      cacheDir: testCacheDir,
      performanceTarget: 200, // More lenient for integration tests
      enableCache: true,
      maxCacheSize: 50
    };

    // Use mock embedding manager if configured to avoid network issues
    if (process.env.USE_MOCK_EMBEDDINGS === 'true') {
      embeddingManager = new MockEmbeddingManager(dbManager, config);
    } else {
      embeddingManager = new EmbeddingManager(dbManager, config);
    }
  });

  afterEach(() => {
    if (embeddingManager) {
      embeddingManager.destroy();
    }
  });

  describe('End-to-End Workflow', () => {
    test('should complete full embedding workflow', async () => {
      console.log('🚀 Starting full embedding workflow test...');

      // Step 1: Initialize embedding manager
      console.log('📥 Initializing embedding manager...');
      await embeddingManager.initialize();
      
      const stats1 = await embeddingManager.getEmbeddingStats();
      expect(stats1.modelInfo.isInitialized).toBe(true);
      console.log(`✅ Model initialized: ${stats1.modelInfo.modelName}`);

      // Step 2: Create test conversation with messages
      console.log('💬 Creating test conversation...');
      const db = dbManager.getConnection();
      const conversationId = 'integration-test-conv';
      const timestamp = Date.now();

      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run(conversationId, 'Integration Test Conversation', timestamp, timestamp);

      const testMessages = [
        { id: 'msg-1', role: 'user', content: 'What is machine learning and how does it work?' },
        { id: 'msg-2', role: 'assistant', content: 'Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed.' },
        { id: 'msg-3', role: 'user', content: 'Can you explain neural networks?' },
        { id: 'msg-4', role: 'assistant', content: 'Neural networks are computing systems inspired by biological neural networks. They consist of interconnected nodes (neurons) that process information.' },
        { id: 'msg-5', role: 'user', content: 'What about deep learning?' },
        { id: 'msg-6', role: 'assistant', content: 'Deep learning is a subset of machine learning that uses neural networks with multiple layers to model and understand complex patterns in data.' },
        { id: 'msg-7', role: 'user', content: 'How do I bake a chocolate cake?' },
        { id: 'msg-8', role: 'assistant', content: 'To bake a chocolate cake, you will need flour, cocoa powder, sugar, eggs, butter, and baking powder. Mix the dry ingredients, then combine with wet ingredients and bake at 350°F.' }
      ];

      // Insert messages
      const insertStmt = db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < testMessages.length; i++) {
        const msg = testMessages[i];
        insertStmt.run(msg.id, conversationId, msg.role, msg.content, timestamp + i);
      }

      console.log(`✅ Created ${testMessages.length} test messages`);

      // Step 3: Generate embeddings for all messages
      console.log('🧠 Generating embeddings...');
      const result = await embeddingManager.processUnembeddedMessages(20);
      
      expect(result.processed).toBe(testMessages.length);
      expect(result.errors).toBe(0);
      console.log(`✅ Generated embeddings for ${result.processed} messages`);

      // Step 4: Verify embeddings were stored
      console.log('🔍 Verifying embeddings...');
      for (const msg of testMessages) {
        const embedding = await embeddingManager.getEmbedding(msg.id);
        expect(embedding).not.toBeNull();
        expect(embedding).toHaveLength(384);
      }
      console.log('✅ All embeddings verified');

      // Step 5: Test semantic similarity search
      console.log('🔎 Testing semantic search...');
      
      // Search for AI/ML related content
      const aiQuery = 'artificial intelligence algorithms';
      const aiQueryEmbedding = await embeddingManager.generateEmbedding(aiQuery);
      const aiResults = await embeddingManager.findSimilarMessages(aiQueryEmbedding, {
        limit: 5,
        threshold: 0.3
      });

      expect(aiResults.length).toBeGreaterThan(0);
      
      // AI-related messages should be at the top
      const topAiResult = aiResults[0];
      expect(topAiResult.similarity).toBeGreaterThan(0.4);
      console.log(`✅ AI search found ${aiResults.length} results (top similarity: ${topAiResult.similarity.toFixed(3)})`);

      // Search for cooking content
      const cookingQuery = 'recipe ingredients baking';
      const cookingQueryEmbedding = await embeddingManager.generateEmbedding(cookingQuery);
      const cookingResults = await embeddingManager.findSimilarMessages(cookingQueryEmbedding, {
        limit: 5,
        threshold: 0.3
      });

      expect(cookingResults.length).toBeGreaterThan(0);
      const topCookingResult = cookingResults[0];
      expect(topCookingResult.content).toContain('cake');
      console.log(`✅ Cooking search found ${cookingResults.length} results`);

      // Step 6: Test cross-topic similarity
      console.log('🔀 Testing cross-topic similarity...');
      const mlEmbedding = await embeddingManager.getEmbedding('msg-2'); // ML definition
      const nnEmbedding = await embeddingManager.getEmbedding('msg-4'); // Neural networks
      const dlEmbedding = await embeddingManager.getEmbedding('msg-6'); // Deep learning
      const cakeEmbedding = await embeddingManager.getEmbedding('msg-8'); // Cake recipe

      // ML topics should be similar to each other
      const mlNnSimilarity = embeddingManager.cosineSimilarity(mlEmbedding!, nnEmbedding!);
      const mlDlSimilarity = embeddingManager.cosineSimilarity(mlEmbedding!, dlEmbedding!);
      
      // ML topics should be dissimilar to cake recipe
      const mlCakeSimilarity = embeddingManager.cosineSimilarity(mlEmbedding!, cakeEmbedding!);

      expect(mlNnSimilarity).toBeGreaterThan(0.5);
      expect(mlDlSimilarity).toBeGreaterThan(0.5);
      expect(mlCakeSimilarity).toBeLessThan(0.3);

      console.log(`✅ Cross-topic similarity verified:`);
      console.log(`   ML ↔ Neural Networks: ${mlNnSimilarity.toFixed(3)}`);
      console.log(`   ML ↔ Deep Learning: ${mlDlSimilarity.toFixed(3)}`);
      console.log(`   ML ↔ Cake Recipe: ${mlCakeSimilarity.toFixed(3)}`);

      // Step 7: Performance validation
      console.log('⚡ Validating performance...');
      const stats2 = await embeddingManager.getEmbeddingStats();
      
      expect(stats2.embeddedMessages).toBe(testMessages.length);
      expect(stats2.embeddingCoverage).toBe(1.0);
      expect(stats2.performanceMetrics.averageTime).toBeGreaterThan(0);
      
      console.log(`✅ Performance metrics:`);
      console.log(`   Coverage: ${(stats2.embeddingCoverage * 100).toFixed(1)}%`);
      console.log(`   Average time: ${stats2.performanceMetrics.averageTime.toFixed(1)}ms`);
      console.log(`   Cache size: ${stats2.cacheSize}`);

      console.log('🎉 Full embedding workflow completed successfully!');
    }, 60000); // Allow 60 seconds for full workflow

    test('should handle batch processing efficiently', async () => {
      console.log('📦 Testing batch processing efficiency...');

      await embeddingManager.initialize();

      // Create larger dataset for batch testing
      const batchTexts = [
        'The quick brown fox jumps over the lazy dog.',
        'Artificial intelligence is transforming many industries.',
        'Climate change is one of the biggest challenges of our time.',
        'Quantum computing promises to revolutionize computation.',
        'Renewable energy sources are becoming more cost-effective.',
        'Machine learning algorithms can process vast amounts of data.',
        'Blockchain technology enables decentralized systems.',
        'Virtual reality creates immersive digital experiences.',
        'Internet of Things connects everyday objects to the web.',
        'Cybersecurity is crucial in our digital age.'
      ];

      // Test individual vs batch processing
      console.log('⏱️  Testing individual processing...');
      const individualStart = Date.now();
      const individualEmbeddings = [];
      for (const text of batchTexts) {
        individualEmbeddings.push(await embeddingManager.generateEmbedding(text));
      }
      const individualTime = Date.now() - individualStart;

      // Clear cache for fair comparison
      embeddingManager.clearCache();

      console.log('⏱️  Testing batch processing...');
      const batchStart = Date.now();
      const batchEmbeddings = await embeddingManager.generateBatchEmbeddings(batchTexts);
      const batchTime = Date.now() - batchStart;

      // Verify results are identical
      expect(batchEmbeddings).toEqual(individualEmbeddings);

      console.log(`✅ Batch processing results:`);
      console.log(`   Individual: ${individualTime}ms (${Math.round(individualTime / batchTexts.length)}ms per text)`);
      console.log(`   Batch: ${batchTime}ms (${Math.round(batchTime / batchTexts.length)}ms per text)`);
      console.log(`   Efficiency gain: ${((individualTime - batchTime) / individualTime * 100).toFixed(1)}%`);

      // Batch should be at least as fast as individual processing
      expect(batchTime).toBeLessThanOrEqual(individualTime * 1.2); // Allow 20% margin
    }, 45000);

    test('should recover from errors gracefully', async () => {
      console.log('🛠️  Testing error recovery...');

      await embeddingManager.initialize();

      // Test model health check
      expect(embeddingManager.isModelHealthy()).toBe(true);

      // Test model functionality
      const testResult = await embeddingManager.testModel();
      expect(testResult.success).toBe(true);
      expect(testResult.dimensions).toBe(384);

      // Test fallback embedding generation
      const embedding = await embeddingManager.generateEmbeddingWithFallback(
        'Error recovery test sentence'
      );
      expect(embedding).toHaveLength(384);

      console.log('✅ Error recovery mechanisms working correctly');
    }, 30000);

    test('should maintain performance under load', async () => {
      console.log('🏋️  Testing performance under load...');

      await embeddingManager.initialize();

      const loadTestTexts = Array.from({ length: 50 }, (_, i) => 
        `Load test sentence number ${i + 1}. This sentence is designed to test the system under moderate load conditions.`
      );

      const startTime = Date.now();
      const embeddings = await embeddingManager.generateBatchEmbeddings(loadTestTexts);
      const totalTime = Date.now() - startTime;

      expect(embeddings).toHaveLength(50);
      expect(embeddings.every(emb => emb.length === 384)).toBe(true);

      const avgTime = totalTime / loadTestTexts.length;
      console.log(`✅ Load test completed:`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Average per text: ${avgTime.toFixed(1)}ms`);
      console.log(`   Throughput: ${(loadTestTexts.length / (totalTime / 1000)).toFixed(1)} texts/second`);

      // Performance should remain reasonable under load
      expect(avgTime).toBeLessThan(1000); // Max 1 second per text
    }, 60000);
  });

  describe('Real-world Scenarios', () => {
    test('should handle diverse content types', async () => {
      console.log('🌍 Testing diverse content types...');

      await embeddingManager.initialize();

      const diverseContent = [
        // Technical content
        'The algorithm optimizes for both time complexity O(n log n) and space efficiency.',
        
        // Conversational content
        'Hey, how are you doing today? I hope everything is going well!',
        
        // Code-like content
        'function calculateDistance(x1, y1, x2, y2) { return Math.sqrt((x2-x1)**2 + (y2-y1)**2); }',
        
        // Long-form content
        'In the rapidly evolving landscape of modern technology, artificial intelligence has emerged as a transformative force that is reshaping industries, redefining human-machine interactions, and challenging our understanding of what machines can accomplish.',
        
        // Short content
        'Yes.',
        
        // Non-English content (but using English alphabet)
        'Bonjour comment allez-vous aujourd\'hui?',
        
        // Numbers and special characters
        'Price: $299.99 (was $399.99) - Save 25%! Order #12345-ABC',
        
        // Mixed content
        'TODO: Implement the /api/v1/search endpoint with pagination (limit=20, offset=0) and filtering capabilities.'
      ];

      const embeddings = await embeddingManager.generateBatchEmbeddings(diverseContent);

      expect(embeddings).toHaveLength(diverseContent.length);
      expect(embeddings.every(emb => emb.length === 384)).toBe(true);

      // Each embedding should be normalized
      for (let i = 0; i < embeddings.length; i++) {
        const embedding = embeddings[i];
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
        expect(magnitude).toBeCloseTo(1.0, 1);
      }

      console.log('✅ All diverse content types processed successfully');
    }, 30000);

    test('should support conversation-based similarity search', async () => {
      console.log('💬 Testing conversation-based similarity...');

      await embeddingManager.initialize();
      const db = dbManager.getConnection();

      // Create multiple conversations
      const conversations = [
        {
          id: 'conv-tech',
          title: 'Technology Discussion',
          messages: [
            'What are the latest trends in web development?',
            'React, Vue, and Svelte are popular frontend frameworks. Server-side rendering is making a comeback.',
            'How about backend technologies?',
            'Node.js, Python with FastAPI, and Go are trending for backend development.'
          ]
        },
        {
          id: 'conv-cooking',
          title: 'Cooking Tips',
          messages: [
            'How do I make pasta from scratch?',
            'You need flour, eggs, and a bit of salt. Knead the dough until smooth.',
            'What about sauce recommendations?',
            'A simple tomato basil sauce or creamy alfredo both work great with fresh pasta.'
          ]
        }
      ];

      // Insert conversations and messages
      let messageCounter = 1;
      for (const conv of conversations) {
        db.prepare(`
          INSERT INTO conversations (id, title, created_at, updated_at)
          VALUES (?, ?, ?, ?)
        `).run(conv.id, conv.title, Date.now(), Date.now());

        for (let i = 0; i < conv.messages.length; i++) {
          const messageId = `msg-${conv.id}-${i + 1}`;
          const role = i % 2 === 0 ? 'user' : 'assistant';
          
          db.prepare(`
            INSERT INTO messages (id, conversation_id, role, content, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(messageId, conv.id, role, conv.messages[i], Date.now() + messageCounter++);

          // Generate and store embedding
          const embedding = await embeddingManager.generateEmbedding(conv.messages[i]);
          await embeddingManager.storeEmbedding(messageId, embedding);
        }
      }

      // Test conversation-specific search
      const techQuery = 'programming frameworks';
      const techEmbedding = await embeddingManager.generateEmbedding(techQuery);
      
      const techResults = await embeddingManager.findSimilarMessages(techEmbedding, {
        conversationId: 'conv-tech',
        limit: 10,
        threshold: 0.2
      });

      const cookingResults = await embeddingManager.findSimilarMessages(techEmbedding, {
        conversationId: 'conv-cooking',
        limit: 10,
        threshold: 0.2
      });

      // Tech query should find more relevant results in tech conversation
      expect(techResults.length).toBeGreaterThan(0);
      expect(techResults[0].similarity).toBeGreaterThan(cookingResults[0]?.similarity || 0);

      console.log(`✅ Conversation-based search working:`);
      console.log(`   Tech conversation results: ${techResults.length}`);
      console.log(`   Cooking conversation results: ${cookingResults.length}`);
      console.log(`   Top tech similarity: ${techResults[0]?.similarity.toFixed(3)}`);
      console.log(`   Top cooking similarity: ${cookingResults[0]?.similarity.toFixed(3) || 'N/A'}`);
    }, 45000);
  });
});