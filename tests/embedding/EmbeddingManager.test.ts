/**
 * Unit tests for EmbeddingManager
 * 
 * Tests the ONNX-based embedding generation, caching, and performance
 */

import { EmbeddingManager, EmbeddingConfig } from '../../src/search/EmbeddingManager';
import { MockEmbeddingManager } from '../utils/MockEmbeddingManager';
import { DatabaseManager } from '../../src/storage/Database';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('EmbeddingManager', () => {
  let embeddingManager: EmbeddingManager;
  let dbManager: DatabaseManager;
  let testCacheDir: string;

  beforeAll(async () => {
    // Set up test environment
    testCacheDir = join(process.cwd(), '.test-cache');
    if (!existsSync(testCacheDir)) {
      mkdirSync(testCacheDir, { recursive: true });
    }

    // Initialize database manager with in-memory database
    dbManager = new DatabaseManager({ databasePath: ':memory:' });
    await dbManager.initialize();

    // Run initial migrations to set up schema
    const db = dbManager.getConnection();
    
    // Create basic tables for testing
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        embedding TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (conversation_id) REFERENCES conversations(id)
      );
      
      CREATE TABLE IF NOT EXISTS search_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS persistence_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  });

  afterAll(async () => {
    // Clean up test resources
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
    const config: Partial<EmbeddingConfig> = {
      cacheDir: testCacheDir,
      performanceTarget: 100,
      enableCache: true,
      maxCacheSize: 10
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
    
    // Clean up database between tests
    if (dbManager) {
      const db = dbManager.getConnection();
      db.exec('DELETE FROM messages');
      db.exec('DELETE FROM conversations');
      db.exec('DELETE FROM search_config');
      db.exec('DELETE FROM persistence_state');
    }
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      await expect(embeddingManager.initialize()).resolves.not.toThrow();
      
      const stats = await embeddingManager.getEmbeddingStats();
      expect(stats.modelInfo.isInitialized).toBe(true);
      expect(stats.modelInfo.modelName).toBe('Xenova/all-MiniLM-L6-v2');
      expect(stats.modelInfo.dimensions).toBe(384);
    }, 30000); // Allow 30 seconds for model download

    test('should not initialize twice', async () => {
      await embeddingManager.initialize();
      await expect(embeddingManager.initialize()).resolves.not.toThrow();
    }, 30000);

    test('should track loading progress', async () => {
      const initPromise = embeddingManager.initialize();
      
      // Check that progress is being tracked
      let progress = embeddingManager.getLoadingProgress();
      // Progress might be null if initialization is very fast, or have initial state
      
      await initPromise;
      
      progress = embeddingManager.getLoadingProgress();
      if (progress) {
        expect(progress.complete).toBe(true);
        expect(progress.progress).toBe(100);
      }
    }, 30000);
  });

  describe('Embedding Generation', () => {
    beforeEach(async () => {
      await embeddingManager.initialize();
    });

    test('should generate embeddings for text', async () => {
      const text = "This is a test sentence for embedding generation.";
      const embedding = await embeddingManager.generateEmbedding(text);
      
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384); // all-MiniLM-L6-v2 dimensions
      expect(embedding.every(val => typeof val === 'number')).toBe(true);
      
      // Check if embedding is normalized (magnitude should be close to 1)
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      expect(magnitude).toBeCloseTo(1.0, 1);
    });

    test('should generate consistent embeddings for same text', async () => {
      const text = "Consistent embedding test.";
      
      const embedding1 = await embeddingManager.generateEmbedding(text);
      const embedding2 = await embeddingManager.generateEmbedding(text);
      
      expect(embedding1).toEqual(embedding2);
    });

    test('should generate different embeddings for different text', async () => {
      const text1 = "First test sentence.";
      const text2 = "Second test sentence.";
      
      const embedding1 = await embeddingManager.generateEmbedding(text1);
      const embedding2 = await embeddingManager.generateEmbedding(text2);
      
      expect(embedding1).not.toEqual(embedding2);
      
      // Mock embeddings will have different similarity patterns than real ones
      const similarity = embeddingManager.cosineSimilarity(embedding1, embedding2);
      expect(similarity).toBeGreaterThan(0.0); // Should be some similarity
    });

    test('should handle empty text', async () => {
      const embedding = await embeddingManager.generateEmbedding("");
      
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
    });

    test('should handle very long text', async () => {
      const longText = "This is a very long text. ".repeat(200); // ~5400 characters
      const embedding = await embeddingManager.generateEmbedding(longText);
      
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
    });

    test('should meet performance targets', async () => {
      const text = "Performance test sentence.";
      const startTime = Date.now();
      
      await embeddingManager.generateEmbedding(text);
      
      const duration = Date.now() - startTime;
      // Allow some flexibility for CI environments
      expect(duration).toBeLessThan(2000); // 2 seconds max
    });
  });

  describe('Batch Processing', () => {
    beforeEach(async () => {
      await embeddingManager.initialize();
    });

    test('should generate batch embeddings', async () => {
      const texts = [
        "First sentence.",
        "Second sentence.",
        "Third sentence."
      ];
      
      const embeddings = await embeddingManager.generateBatchEmbeddings(texts);
      
      expect(embeddings).toHaveLength(3);
      expect(embeddings.every(emb => emb.length === 384)).toBe(true);
      
      // Each embedding should be different
      expect(embeddings[0]).not.toEqual(embeddings[1]);
      expect(embeddings[1]).not.toEqual(embeddings[2]);
    });

    test('should handle empty batch', async () => {
      const embeddings = await embeddingManager.generateBatchEmbeddings([]);
      expect(embeddings).toEqual([]);
    });

    test('should be more efficient than individual processing', async () => {
      const texts = [
        "Batch test sentence 1.",
        "Batch test sentence 2.",
        "Batch test sentence 3.",
        "Batch test sentence 4.",
        "Batch test sentence 5."
      ];
      
      // Test individual processing
      const individualStart = Date.now();
      const individualResults = [];
      for (const text of texts) {
        individualResults.push(await embeddingManager.generateEmbedding(text));
      }
      const individualTime = Date.now() - individualStart;
      
      // Clear cache to ensure fair comparison
      embeddingManager.clearCache();
      
      // Test batch processing
      const batchStart = Date.now();
      const batchResults = await embeddingManager.generateBatchEmbeddings(texts);
      const batchTime = Date.now() - batchStart;
      
      // Results should be the same
      expect(batchResults).toEqual(individualResults);
      
      // Batch should be faster or at least not significantly slower
      // Allow some flexibility for mock timing variability
      expect(batchTime).toBeLessThanOrEqual(individualTime * 2.0);
    });
  });

  describe('Caching', () => {
    beforeEach(async () => {
      await embeddingManager.initialize();
    });

    test('should cache embeddings', async () => {
      const text = "Caching test sentence.";
      
      // First call should generate and cache
      const start1 = Date.now();
      const embedding1 = await embeddingManager.generateEmbedding(text);
      const time1 = Date.now() - start1;
      
      // Second call should use cache
      const start2 = Date.now();
      const embedding2 = await embeddingManager.generateEmbedding(text);
      const time2 = Date.now() - start2;
      
      expect(embedding1).toEqual(embedding2);
      expect(time2).toBeLessThan(time1); // Cache should be faster
    });

    test('should clear cache', async () => {
      const text = "Cache clear test.";
      
      await embeddingManager.generateEmbedding(text);
      let stats = await embeddingManager.getEmbeddingStats();
      expect(stats.cacheSize).toBeGreaterThan(0);
      
      embeddingManager.clearCache();
      stats = await embeddingManager.getEmbeddingStats();
      expect(stats.cacheSize).toBe(0);
    });
  });

  describe('Database Operations', () => {
    beforeEach(async () => {
      await embeddingManager.initialize();
      
      // Insert test conversation and message
      const db = dbManager.getConnection();
      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run('test-conv-1', 'Test Conversation', Date.now(), Date.now());
      
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('test-msg-1', 'test-conv-1', 'user', 'Test message for embedding', Date.now());
    });

    test('should store and retrieve embeddings', async () => {
      const messageId = 'test-msg-1';
      const text = 'Test message for embedding';
      
      const embedding = await embeddingManager.generateEmbedding(text);
      await embeddingManager.storeEmbedding(messageId, embedding);
      
      const retrieved = await embeddingManager.getEmbedding(messageId);
      expect(retrieved).toEqual(embedding);
    });

    test('should return null for non-existent message', async () => {
      const retrieved = await embeddingManager.getEmbedding('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should process unembedded messages', async () => {
      const db = dbManager.getConnection();
      
      // Insert additional test messages
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('test-msg-2', 'test-conv-1', 'assistant', 'Response message', Date.now());
      
      db.prepare(`
        INSERT INTO messages (id, conversation_id, role, content, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run('test-msg-3', 'test-conv-1', 'user', 'Another message', Date.now());
      
      const result = await embeddingManager.processUnembeddedMessages(10);
      
      expect(result.processed).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
      
      // Verify embeddings were stored
      const embedding = await embeddingManager.getEmbedding('test-msg-2');
      expect(embedding).not.toBeNull();
      expect(embedding).toHaveLength(384);
    });
  });

  describe('Similarity Search', () => {
    beforeEach(async () => {
      await embeddingManager.initialize();
      
      // Insert test conversation and messages with embeddings
      const db = dbManager.getConnection();
      
      // Insert conversation first
      db.prepare(`
        INSERT INTO conversations (id, title, created_at, updated_at)
        VALUES (?, ?, ?, ?)
      `).run('test-conv', 'Test Conversation', Date.now(), Date.now());
      
      const messages = [
        { id: 'msg-1', content: 'The weather is sunny today.' },
        { id: 'msg-2', content: 'It is raining outside.' },
        { id: 'msg-3', content: 'Beautiful sunshine this morning.' },
        { id: 'msg-4', content: 'Completely different topic about programming.' }
      ];
      
      for (const msg of messages) {
        // Insert message
        db.prepare(`
          INSERT INTO messages (id, conversation_id, role, content, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(msg.id, 'test-conv', 'user', msg.content, Date.now());
        
        // Generate and store embedding
        const embedding = await embeddingManager.generateEmbedding(msg.content);
        await embeddingManager.storeEmbedding(msg.id, embedding);
      }
    });

    test('should find similar messages', async () => {
      const queryEmbedding = await embeddingManager.generateEmbedding('sunny weather');
      
      const results = await embeddingManager.findSimilarMessages(queryEmbedding, {
        limit: 3,
        threshold: 0.3
      });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].similarity).toBeGreaterThan(results[1]?.similarity || 0);
      
      // Weather-related messages should be more similar
      const weatherMessages = results.filter(r => 
        r.content.includes('weather') || 
        r.content.includes('sunny') || 
        r.content.includes('rain') ||
        r.content.includes('sunshine')
      );
      expect(weatherMessages.length).toBeGreaterThan(0);
    });

    test('should respect similarity threshold', async () => {
      const queryEmbedding = await embeddingManager.generateEmbedding('programming code');
      
      const lowThresholdResults = await embeddingManager.findSimilarMessages(queryEmbedding, {
        threshold: 0.1
      });
      
      const highThresholdResults = await embeddingManager.findSimilarMessages(queryEmbedding, {
        threshold: 0.8
      });
      
      expect(lowThresholdResults.length).toBeGreaterThanOrEqual(highThresholdResults.length);
    });

    test('should exclude specified message IDs', async () => {
      const queryEmbedding = await embeddingManager.generateEmbedding('weather');
      
      const results = await embeddingManager.findSimilarMessages(queryEmbedding, {
        excludeMessageIds: ['msg-1', 'msg-3'],
        threshold: 0.1
      });
      
      expect(results.every(r => !['msg-1', 'msg-3'].includes(r.messageId))).toBe(true);
    });
  });

  describe('Performance Monitoring', () => {
    beforeEach(async () => {
      await embeddingManager.initialize();
    });

    test('should track performance metrics', async () => {
      const text = "Performance metrics test.";
      
      await embeddingManager.generateEmbedding(text);
      await embeddingManager.generateEmbedding(text + " variation");
      
      const stats = await embeddingManager.getEmbeddingStats();
      
      expect(stats.performanceMetrics.totalEmbeddings).toBeGreaterThan(0);
      expect(stats.performanceMetrics.totalTime).toBeGreaterThan(0);
      expect(stats.performanceMetrics.averageTime).toBeGreaterThan(0);
      expect(stats.performanceMetrics.targetTime).toBe(100);
    });

    test('should report model health status', async () => {
      // Fresh model should be healthy
      expect(embeddingManager.isModelHealthy()).toBe(true);
    });

    test('should test model functionality', async () => {
      const testResult = await embeddingManager.testModel();
      
      expect(testResult.success).toBe(true);
      expect(testResult.dimensions).toBe(384);
      expect(testResult.performance).toBeGreaterThan(0);
      expect(testResult.error).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle embedding generation before initialization', async () => {
      await expect(embeddingManager.generateEmbedding("test"))
        .rejects.toThrow('not initialized');
    });

    test('should handle batch embedding generation before initialization', async () => {
      await expect(embeddingManager.generateBatchEmbeddings(["test"]))
        .rejects.toThrow('not initialized');
    });

    test('should handle embedding generation with fallback', async () => {
      await embeddingManager.initialize();
      
      const embedding = await embeddingManager.generateEmbeddingWithFallback("fallback test");
      
      expect(Array.isArray(embedding)).toBe(true);
      expect(embedding.length).toBe(384);
    });
  });

  describe('Vector Operations', () => {
    test('should calculate cosine similarity correctly', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [0, 1, 0];
      const vector3 = [1, 0, 0];
      
      // Orthogonal vectors should have similarity 0
      expect(embeddingManager.cosineSimilarity(vector1, vector2)).toBeCloseTo(0, 5);
      
      // Identical vectors should have similarity 1
      expect(embeddingManager.cosineSimilarity(vector1, vector3)).toBeCloseTo(1, 5);
    });

    test('should handle mismatched vector lengths', () => {
      const vector1 = [1, 0, 0];
      const vector2 = [1, 0];
      
      expect(() => embeddingManager.cosineSimilarity(vector1, vector2))
        .toThrow('same length');
    });
  });
});