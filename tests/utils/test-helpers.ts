/**
 * Test Helper Utilities for Enhanced Search Testing
 * 
 * Provides utilities for creating test data, mocking dependencies,
 * and setting up search engine tests with realistic data.
 */

import { DatabaseManager } from '../../src/storage/Database';
import { EmbeddingManager } from '../../src/search/EmbeddingManager';
import { SearchEngine } from '../../src/search/SearchEngine';
import { MessageRepository } from '../../src/storage/repositories/MessageRepository';
import { EnhancedSearchEngine } from '../../src/search/EnhancedSearchEngine';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface TestMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface TestConversation {
  id: string;
  title?: string;
  messages: TestMessage[];
}

/**
 * Create in-memory database with complete schema
 */
export async function createTestDatabase(): Promise<DatabaseManager> {
  const dbManager = new DatabaseManager({ databasePath: ':memory:' });
  await dbManager.initialize();
  
  const db = dbManager.getConnection();
  
  // Create full schema including enhanced search tables
  db.exec(`
    -- Basic tables
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

    -- FTS5 table for full-text search
    CREATE VIRTUAL TABLE IF NOT EXISTS messages_fts USING fts5(
      content,
      content='messages',
      content_rowid='rowid',
      tokenize='porter unicode61 remove_diacritics 1'
    );

    -- Enhanced search tables
    CREATE TABLE IF NOT EXISTS search_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_type TEXT NOT NULL,
      query_text TEXT NOT NULL,
      result_count INTEGER NOT NULL,
      execution_time_ms INTEGER NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
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

    -- Triggers to maintain FTS index
    CREATE TRIGGER IF NOT EXISTS messages_fts_insert AFTER INSERT ON messages BEGIN
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_fts_delete AFTER DELETE ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
    END;

    CREATE TRIGGER IF NOT EXISTS messages_fts_update AFTER UPDATE OF content ON messages BEGIN
      INSERT INTO messages_fts(messages_fts, rowid, content) VALUES('delete', old.rowid, old.content);
      INSERT INTO messages_fts(rowid, content) VALUES (new.rowid, new.content);
    END;
  `);
  
  return dbManager;
}

/**
 * Create realistic test conversations with varied content
 */
export function createTestConversations(): TestConversation[] {
  const now = Date.now();
  
  return [
    {
      id: 'conv-tech-1',
      title: 'Web Development Discussion',
      messages: [
        {
          id: 'msg-tech-1',
          conversationId: 'conv-tech-1',
          role: 'user',
          content: 'I need help with React components and state management. How should I structure my application?',
          createdAt: now - 3600000
        },
        {
          id: 'msg-tech-2',
          conversationId: 'conv-tech-1',
          role: 'assistant',
          content: 'For React state management, I recommend starting with built-in useState and useEffect hooks. For complex applications, consider Redux or Zustand. Structure your components hierarchically with clear data flow.',
          createdAt: now - 3540000
        },
        {
          id: 'msg-tech-3',
          conversationId: 'conv-tech-1',
          role: 'user',
          content: 'What about TypeScript integration? Should I use it with React?',
          createdAt: now - 3480000
        },
        {
          id: 'msg-tech-4',
          conversationId: 'conv-tech-1',
          role: 'assistant',
          content: 'TypeScript with React is excellent for type safety and development experience. Define interfaces for props, use generic types for hooks, and leverage TypeScript\'s strict mode for better code quality.',
          createdAt: now - 3420000
        }
      ]
    },
    {
      id: 'conv-cooking-1',
      title: 'Cooking and Recipes',
      messages: [
        {
          id: 'msg-cooking-1',
          conversationId: 'conv-cooking-1',
          role: 'user',
          content: 'Can you share a good recipe for pasta carbonara? I want something authentic.',
          createdAt: now - 7200000
        },
        {
          id: 'msg-cooking-2',
          conversationId: 'conv-cooking-1',
          role: 'assistant',
          content: 'Authentic carbonara uses eggs, pecorino romano cheese, guanciale, and black pepper. No cream! Cook pasta al dente, crisp the guanciale, mix eggs with cheese, then combine off heat to create a silky sauce.',
          createdAt: now - 7140000
        },
        {
          id: 'msg-cooking-3',
          conversationId: 'conv-cooking-1',
          role: 'user',
          content: 'What techniques work best for making the sauce creamy without scrambling the eggs?',
          createdAt: now - 7080000
        },
        {
          id: 'msg-cooking-4',
          conversationId: 'conv-cooking-1',
          role: 'assistant',
          content: 'The key is temperature control. Remove the pan from heat, add a splash of pasta water to cool it down, then slowly whisk in the egg mixture. The residual heat and starchy pasta water create the perfect creamy texture.',
          createdAt: now - 7020000
        }
      ]
    },
    {
      id: 'conv-science-1',
      title: 'Machine Learning Concepts',
      messages: [
        {
          id: 'msg-science-1',
          conversationId: 'conv-science-1',
          role: 'user',
          content: 'Explain neural networks and deep learning in simple terms. How do they work?',
          createdAt: now - 10800000
        },
        {
          id: 'msg-science-2',
          conversationId: 'conv-science-1',
          role: 'assistant',
          content: 'Neural networks are inspired by how brain neurons work. They have layers of interconnected nodes that process information. Deep learning uses many layers to learn complex patterns. Each layer extracts different features, from simple to abstract.',
          createdAt: now - 10740000
        },
        {
          id: 'msg-science-3',
          conversationId: 'conv-science-1',
          role: 'user',
          content: 'What about backpropagation? How does the network learn from mistakes?',
          createdAt: now - 10680000
        },
        {
          id: 'msg-science-4',
          conversationId: 'conv-science-1',
          role: 'assistant',
          content: 'Backpropagation is how neural networks learn. It calculates how much each connection contributed to the error, then adjusts weights to reduce future errors. Think of it as working backwards through the network to assign blame and fix problems.',
          createdAt: now - 10620000
        }
      ]
    },
    {
      id: 'conv-travel-1',
      title: 'Travel Planning',
      messages: [
        {
          id: 'msg-travel-1',
          conversationId: 'conv-travel-1',
          role: 'user',
          content: 'Planning a trip to Japan. What are the must-see places in Tokyo?',
          createdAt: now - 14400000
        },
        {
          id: 'msg-travel-2',
          conversationId: 'conv-travel-1',
          role: 'assistant',
          content: 'Tokyo highlights include Senso-ji Temple in Asakusa, the bustling Shibuya crossing, peaceful Meiji Shrine, trendy Harajuku district, and the fish market in Tsukiji. Don\'t miss the view from Tokyo Skytree or traditional gardens like Shinjuku Gyoen.',
          createdAt: now - 14340000
        },
        {
          id: 'msg-travel-3',
          conversationId: 'conv-travel-1',
          role: 'user',
          content: 'How about food? What should I try? I love authentic local cuisine.',
          createdAt: now - 14280000
        },
        {
          id: 'msg-travel-4',
          conversationId: 'conv-travel-1',
          role: 'assistant',
          content: 'Try authentic sushi at Tsukiji, ramen in Shibuya, tempura in traditional restaurants, and visit a convenience store for unique snacks. Don\'t miss yakitori under railway bridges, authentic izakayas, and traditional kaiseki dining for a complete culinary experience.',
          createdAt: now - 14220000
        }
      ]
    },
    {
      id: 'conv-philosophy-1',
      title: 'Philosophy Discussion',
      messages: [
        {
          id: 'msg-philosophy-1',
          conversationId: 'conv-philosophy-1',
          role: 'user',
          content: 'What\'s the meaning of life according to different philosophical traditions?',
          createdAt: now - 18000000
        },
        {
          id: 'msg-philosophy-2',
          conversationId: 'conv-philosophy-1',
          role: 'assistant',
          content: 'Different traditions offer various perspectives: Existentialists say we create meaning through choices, Buddhists focus on reducing suffering and achieving enlightenment, Stoics emphasize virtue and accepting what we cannot control, while Utilitarians seek the greatest happiness for the greatest number.',
          createdAt: now - 17940000
        }
      ]
    }
  ];
}

/**
 * Insert test conversations into database
 */
export async function insertTestData(dbManager: DatabaseManager, conversations: TestConversation[]): Promise<void> {
  const db = dbManager.getConnection();
  
  const insertConv = db.prepare(`
    INSERT INTO conversations (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);
  
  const insertMsg = db.prepare(`
    INSERT INTO messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const transaction = db.transaction(() => {
    for (const conv of conversations) {
      const createdAt = conv.messages[0]?.createdAt || Date.now();
      const updatedAt = conv.messages[conv.messages.length - 1]?.createdAt || Date.now();
      
      insertConv.run(conv.id, conv.title, createdAt, updatedAt);
      
      for (const msg of conv.messages) {
        insertMsg.run(msg.id, msg.conversationId, msg.role, msg.content, msg.createdAt);
      }
    }
  });
  
  transaction();
}

/**
 * Create and initialize embedding manager for testing
 * Falls back to mock if initialization fails (e.g., no network access)
 */
export async function createTestEmbeddingManager(dbManager: DatabaseManager): Promise<EmbeddingManager> {
  // Use mock if explicitly disabled or in CI without real embeddings enabled
  if (process.env.DISABLE_REAL_EMBEDDINGS === 'true' || 
      (process.env.CI === 'true' && process.env.USE_REAL_EMBEDDINGS !== 'true')) {
    const { MockEmbeddingManager } = await import('../mocks/MockEmbeddingManager');
    const mockManager = new MockEmbeddingManager(dbManager);
    await mockManager.initialize();
    return mockManager;
  }
  
  const testCacheDir = join(process.cwd(), '.test-cache-enhanced');
  if (!existsSync(testCacheDir)) {
    mkdirSync(testCacheDir, { recursive: true });
  }
  
  const embeddingManager = new EmbeddingManager(dbManager, {
    cacheDir: testCacheDir,
    performanceTarget: 500, // More lenient for tests
    enableCache: true,
    maxCacheSize: 5
  });
  
  // Try to initialize, but fall back to mock if network access fails
  try {
    await embeddingManager.initialize();
    return embeddingManager;
  } catch (error) {
    console.warn('Failed to initialize real embedding manager, using mock:', error instanceof Error ? error.message : 'Unknown error');
    const { MockEmbeddingManager } = await import('../mocks/MockEmbeddingManager');
    const mockManager = new MockEmbeddingManager(dbManager);
    await mockManager.initialize();
    return mockManager;
  }
}

/**
 * Create a mock embedding manager for testing without network access
 */
export function createMockEmbeddingManager(dbManager: DatabaseManager): EmbeddingManager {
  const embeddingManager = new EmbeddingManager(dbManager, {
    cacheDir: './.test-cache',
    performanceTarget: 500,
    enableCache: true,
    maxCacheSize: 5
  });
  
  // Mock the core methods
  (embeddingManager as any).initialize = async () => {
    console.log('Mock embedding manager initialized');
  };
  
  (embeddingManager as any).generateEmbedding = async (text: string): Promise<number[]> => {
    // Generate a deterministic mock embedding based on text content
    const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return new Array(384).fill(0).map((_, i) => Math.sin(hash + i) * 0.1);
  };
  
  (embeddingManager as any).generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
    return Promise.all(texts.map(text => (embeddingManager as any).generateEmbedding(text)));
  };
  
  (embeddingManager as any).generateBatchEmbeddings = async (texts: string[]): Promise<number[][]> => {
    return Promise.all(texts.map(text => (embeddingManager as any).generateEmbedding(text)));
  };
  
  (embeddingManager as any).isInitialized = () => true;
  
  (embeddingManager as any).cleanup = async () => {
    console.log('Mock embedding manager cleaned up');
  };
  
  return embeddingManager;
}

/**
 * Create complete enhanced search engine setup
 */
export async function createTestSearchEngine(): Promise<{
  dbManager: DatabaseManager;
  embeddingManager: EmbeddingManager;
  ftsEngine: SearchEngine;
  enhancedEngine: EnhancedSearchEngine;
}> {
  const dbManager = await createTestDatabase();
  const embeddingManager = await createTestEmbeddingManager(dbManager);
  const messageRepository = new MessageRepository(dbManager);
  const ftsEngine = new SearchEngine(messageRepository);
  const enhancedEngine = new EnhancedSearchEngine(dbManager, embeddingManager, ftsEngine);
  
  return { dbManager, embeddingManager, ftsEngine, enhancedEngine };
}

/**
 * Generate and store embeddings for all test messages
 */
export async function generateTestEmbeddings(
  embeddingManager: EmbeddingManager,
  conversations: TestConversation[]
): Promise<void> {
  console.log('Generating embeddings for test data...');
  
  const messages = conversations.flatMap(conv => conv.messages);
  const texts = messages.map(msg => msg.content);
  const messageIds = messages.map(msg => msg.id);
  
  // Generate embeddings in batch for efficiency
  const embeddings = await embeddingManager.generateBatchEmbeddings(texts);
  
  // Store embeddings
  for (let i = 0; i < embeddings.length; i++) {
    await embeddingManager.storeEmbedding(messageIds[i], embeddings[i]);
  }
  
  console.log(`Generated embeddings for ${embeddings.length} messages`);
}

/**
 * Performance timing helper
 */
export class PerformanceTimer {
  private startTime: number;
  
  constructor() {
    this.startTime = Date.now();
  }
  
  elapsed(): number {
    return Date.now() - this.startTime;
  }
  
  reset(): void {
    this.startTime = Date.now();
  }
  
  expectUnder(maxMs: number, operation: string): void {
    const elapsed = this.elapsed();
    if (elapsed > maxMs) {
      throw new Error(`${operation} took ${elapsed}ms, expected under ${maxMs}ms`);
    }
  }
}

/**
 * Mock transport for MCP testing
 */
export class MockTransport {
  private responses: any[] = [];
  private requests: any[] = [];
  
  async send(message: any): Promise<void> {
    this.requests.push(message);
    
    // Generate mock response based on request
    const response = {
      jsonrpc: '2.0',
      id: message.id,
      result: this.generateMockResponse(message)
    };
    
    this.responses.push(response);
  }
  
  async receive(): Promise<any> {
    return this.responses.shift();
  }
  
  getRequests(): any[] {
    return [...this.requests];
  }
  
  getLastRequest(): any {
    return this.requests[this.requests.length - 1];
  }
  
  private generateMockResponse(request: any): any {
    switch (request.method) {
      case 'tools/call':
        return {
          content: [{ type: 'text', text: JSON.stringify({ success: true, results: [] }) }]
        };
      case 'tools/list':
        return {
          tools: [
            { name: 'semantic_search', description: 'Semantic search' },
            { name: 'hybrid_search', description: 'Hybrid search' }
          ]
        };
      default:
        return {};
    }
  }
}

/**
 * Create mock time environment for consistent testing
 */
export function setupMockTime(fixedTime: number = Date.now()): void {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(fixedTime));
}

/**
 * Restore real timers
 */
export function restoreTime(): void {
  jest.useRealTimers();
}

/**
 * Utility to wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Assert array similarity within tolerance
 */
export function expectArraySimilarity(
  actual: number[],
  expected: number[],
  tolerance: number = 0.1
): void {
  expect(actual).toHaveLength(expected.length);
  
  for (let i = 0; i < actual.length; i++) {
    expect(Math.abs(actual[i] - expected[i])).toBeLessThanOrEqual(tolerance);
  }
}

/**
 * Create test search query variations
 */
export function createTestQueries(): Array<{
  query: string;
  expectedResults: string[];
  searchType: 'semantic' | 'fts' | 'hybrid';
  description: string;
}> {
  return [
    {
      query: 'React components state management',
      expectedResults: ['msg-tech-1', 'msg-tech-2'],
      searchType: 'semantic',
      description: 'Semantic search for React concepts'
    },
    {
      query: '"TypeScript integration"',
      expectedResults: ['msg-tech-3'],
      searchType: 'fts',
      description: 'Exact phrase search'
    },
    {
      query: 'cooking pasta recipe',
      expectedResults: ['msg-cooking-1', 'msg-cooking-2'],
      searchType: 'hybrid',
      description: 'Hybrid search for cooking content'
    },
    {
      query: 'neural networks learning',
      expectedResults: ['msg-science-1', 'msg-science-2'],
      searchType: 'semantic',
      description: 'Technical concept search'
    },
    {
      query: 'Japan Tokyo travel',
      expectedResults: ['msg-travel-1', 'msg-travel-2'],
      searchType: 'semantic',
      description: 'Travel planning search'
    }
  ];
}

/**
 * Validation helper for search results
 */
export function validateSearchResult(result: any, expectedFields: string[]): void {
  for (const field of expectedFields) {
    expect(result).toHaveProperty(field);
  }
  
  if (result.score !== undefined) {
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
  }
  
  if (result.messageId) {
    expect(typeof result.messageId).toBe('string');
    expect(result.messageId.length).toBeGreaterThan(0);
  }
}