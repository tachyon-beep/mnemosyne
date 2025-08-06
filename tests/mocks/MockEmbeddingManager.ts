/**
 * Mock Embedding Manager for Testing
 * 
 * Provides a realistic mock that simulates the behavior of the real
 * embedding manager without requiring network access or ONNX runtime
 */

import { EmbeddingManager } from '../../src/search/EmbeddingManager';
import { DatabaseManager } from '../../src/storage/Database';
import { TEST_CONFIG } from '../config/test.config';

export class MockEmbeddingManager extends EmbeddingManager {
  private mockInitialized = false;
  private mockCache = new Map<string, Float32Array>();
  
  constructor(dbManager: DatabaseManager, config?: any) {
    super(dbManager, config);
  }
  
  async initialize(): Promise<void> {
    // Simulate initialization delay
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.embeddings.mockDelay));
    
    this.mockInitialized = true;
    (this as any).initialized = true;
    
    // Mock model
    (this as any).model = {
      embed: this.mockEmbed.bind(this)
    };
    
    console.log('Mock embedding manager initialized');
  }
  
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.mockInitialized) {
      throw new Error('Mock embedding manager not initialized');
    }
    
    // Check cache first
    const cached = this.mockCache.get(text);
    if (cached) {
      return Array.from(cached);
    }
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.embeddings.mockDelay));
    
    // Generate deterministic but realistic embedding
    const embedding = this.generateMockEmbedding(text);
    this.mockCache.set(text, embedding);
    
    return Array.from(embedding);
  }
  
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    if (!this.mockInitialized) {
      throw new Error('Mock embedding manager not initialized');
    }
    
    // Simulate batch processing time
    await new Promise(resolve => 
      setTimeout(resolve, TEST_CONFIG.embeddings.mockDelay * Math.log(texts.length + 1))
    );
    
    return Promise.all(texts.map(text => this.generateEmbedding(text)));
  }

  async generateBatchEmbeddings(texts: string[]): Promise<number[][]> {
    // generateBatchEmbeddings is an alias for generateEmbeddings in the base class
    return this.generateEmbeddings(texts);
  }
  
  async findSimilarMessages(
    queryEmbedding: number[],
    options?: any
  ): Promise<any[]> {
    // Simulate search time
    await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.embeddings.mockDelay));
    
    // Return mock similar messages
    const mockResults = [
      {
        id: 'mock-msg-1',
        content: 'Mock similar message 1',
        embedding: JSON.stringify(Array.from(queryEmbedding).map(v => v * 0.95)),
        similarity: 0.95
      },
      {
        id: 'mock-msg-2', 
        content: 'Mock similar message 2',
        embedding: JSON.stringify(Array.from(queryEmbedding).map(v => v * 0.85)),
        similarity: 0.85
      }
    ];
    
    const limit = options?.limit || 10;
    const threshold = options?.threshold || 0.5;
    
    return mockResults
      .filter(r => r.similarity >= threshold)
      .slice(0, limit);
  }
  
  private mockEmbed(texts: string[]): Float32Array[] {
    return texts.map(text => this.generateMockEmbedding(text));
  }
  
  private generateMockEmbedding(text: string): Float32Array {
    const embedding = new Float32Array(384);
    
    // Generate deterministic embedding based on text
    const hash = this.hashCode(text);
    const seed = Math.abs(hash);
    
    // Use multiple hash variations for more realistic distribution
    for (let i = 0; i < 384; i++) {
      const component1 = Math.sin((seed + i) * 0.1) * 0.5;
      const component2 = Math.cos((seed * i) * 0.01) * 0.3;
      const component3 = Math.sin((seed / (i + 1)) * 0.1) * 0.2;
      
      embedding[i] = component1 + component2 + component3;
      
      // Add some noise based on text length
      embedding[i] += (Math.sin(text.length * i) * 0.1);
      
      // Normalize to typical embedding range
      embedding[i] = embedding[i] / 2;
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] /= magnitude;
      }
    }
    
    return embedding;
  }
  
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
  
  // Override other methods as needed
  async saveEmbedding(messageId: string, embedding: number[]): Promise<void> {
    // Mock save - do nothing
    await new Promise(resolve => setTimeout(resolve, 1));
  }
  
  async storeEmbedding(messageId: string, embedding: number[]): Promise<void> {
    // Alias for saveEmbedding
    return this.saveEmbedding(messageId, embedding);
  }
  
  async getEmbedding(messageId: string): Promise<number[] | null> {
    // Mock retrieval
    await new Promise(resolve => setTimeout(resolve, 1));
    return null;
  }
  
  async getEmbeddingStats(): Promise<any> {
    return {
      cacheSize: this.mockCache.size,
      totalEmbeddings: this.mockCache.size,
      avgProcessingTime: TEST_CONFIG.embeddings.mockDelay
    };
  }
  
  clearCache(): void {
    this.mockCache.clear();
  }
  
  async optimize(): Promise<void> {
    // Mock optimization
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  destroy(): void {
    this.mockCache.clear();
    this.mockInitialized = false;
  }
}