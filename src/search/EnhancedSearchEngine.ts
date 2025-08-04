/**
 * Enhanced Search Engine - Hybrid semantic and FTS search
 * 
 * This module provides:
 * - Hybrid search combining FTS and semantic similarity
 * - Intelligent query routing based on query characteristics
 * - Result ranking and merging algorithms
 * - Performance tracking and metrics
 * - Search configuration management
 */

import { DatabaseManager } from '../storage/Database.js';
import { EmbeddingManager, SimilarityResult } from './EmbeddingManager.js';
import { SearchEngine } from './SearchEngine.js';
import type { SearchResult } from '../types/interfaces.js';
import { SearchOptions } from '../types/interfaces.js';

export interface HybridSearchOptions extends SearchOptions {
  /** Search strategy */
  strategy?: 'auto' | 'semantic' | 'fts' | 'hybrid';
  /** Weights for hybrid search */
  weights?: {
    semantic: number;
    fts: number;
  };
  /** Minimum semantic similarity threshold */
  semanticThreshold?: number;
  /** Enable result explanation */
  explainResults?: boolean;
}

export interface HybridSearchResult {
  /** Message ID */
  messageId: string;
  /** Conversation ID */
  conversationId: string;
  /** Message content */
  content: string;
  /** Combined score */
  score: number;
  /** Result type */
  matchType: 'semantic' | 'fts' | 'hybrid';
  /** Individual scores */
  scores: {
    semantic?: number;
    fts?: number;
    combined: number;
  };
  /** Highlighted snippets */
  highlights: string[];
  /** Conversation title */
  conversationTitle?: string;
  /** Created timestamp */
  createdAt: number;
  /** Explanation of why this result was selected */
  explanation?: string;
}

export interface SearchMetrics {
  /** Query ID for tracking */
  queryId: string;
  /** Query text */
  query: string;
  /** Search strategy used */
  strategy: string;
  /** Number of results returned */
  resultCount: number;
  /** Total execution time */
  totalTime: number;
  /** Time breakdown */
  timing: {
    queryAnalysis: number;
    semanticSearch?: number;
    ftsSearch?: number;
    resultMerging?: number;
    formatting: number;
  };
  /** Query characteristics */
  queryAnalysis: {
    termCount: number;
    hasOperators: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
    suggestedStrategy: string;
  };
}

/**
 * Enhanced search engine with hybrid semantic and FTS capabilities
 */
export class EnhancedSearchEngine {
  private dbManager: DatabaseManager;
  private embeddingManager: EmbeddingManager;
  private ftsEngine: SearchEngine;
  private defaultWeights: { semantic: number; fts: number };
  private metricsEnabled: boolean;

  constructor(
    dbManager: DatabaseManager,
    embeddingManager: EmbeddingManager,
    ftsEngine: SearchEngine
  ) {
    this.dbManager = dbManager;
    this.embeddingManager = embeddingManager;
    this.ftsEngine = ftsEngine;
    this.defaultWeights = { semantic: 0.6, fts: 0.4 };
    this.metricsEnabled = true;
  }

  /**
   * Perform enhanced search with automatic strategy selection
   */
  async search(options: HybridSearchOptions): Promise<{
    results: HybridSearchResult[];
    metrics: SearchMetrics;
    hasMore: boolean;
  }> {
    const queryId = this.generateQueryId();
    const startTime = Date.now();
    const timing = {
      queryAnalysis: 0,
      semanticSearch: 0,
      ftsSearch: 0,
      resultMerging: 0,
      formatting: 0
    };

    try {
      // Step 1: Analyze query
      const analysisStart = Date.now();
      const queryAnalysis = this.analyzeQuery(options.query);
      timing.queryAnalysis = Date.now() - analysisStart;

      // Step 2: Determine search strategy
      const strategy = options.strategy || this.selectStrategy(queryAnalysis, options);

      // Step 3: Execute search based on strategy
      let results: HybridSearchResult[] = [];

      switch (strategy) {
        case 'semantic':
          results = await this.semanticSearch(options, timing);
          break;
        case 'fts':
          results = await this.ftsSearch(options, timing);
          break;
        case 'hybrid':
          results = await this.hybridSearch(options, timing);
          break;
        default:
          throw new Error(`Unknown search strategy: ${strategy}`);
      }

      // Step 4: Format and explain results if requested
      const formatStart = Date.now();
      if (options.explainResults) {
        results = this.addExplanations(results, queryAnalysis, strategy);
      }
      timing.formatting = Date.now() - formatStart;

      // Step 5: Create metrics
      const metrics: SearchMetrics = {
        queryId,
        query: options.query,
        strategy,
        resultCount: results.length,
        totalTime: Date.now() - startTime,
        timing,
        queryAnalysis
      };

      // Step 6: Store metrics if enabled
      if (this.metricsEnabled) {
        await this.storeMetrics(metrics);
      }

      return {
        results,
        metrics,
        hasMore: results.length === (options.limit || 20)
      };

    } catch (error) {
      console.error('Enhanced search failed:', error);
      
      // Return empty results with error metrics
      return {
        results: [],
        metrics: {
          queryId,
          query: options.query,
          strategy: 'error',
          resultCount: 0,
          totalTime: Date.now() - startTime,
          timing,
          queryAnalysis: {
            termCount: 0,
            hasOperators: false,
            complexity: 'simple',
            suggestedStrategy: 'fts'
          }
        },
        hasMore: false
      };
    }
  }

  /**
   * Perform semantic-only search
   */
  private async semanticSearch(
    options: HybridSearchOptions,
    timing: any
  ): Promise<HybridSearchResult[]> {
    const start = Date.now();

    try {
      // Generate query embedding
      const queryEmbedding = await this.embeddingManager.generateEmbedding(options.query);

      // Find similar messages
      const similarMessages = await this.embeddingManager.findSimilarMessages(queryEmbedding, {
        limit: options.limit || 20,
        threshold: options.semanticThreshold || 0.7,
        conversationId: options.conversationId
      });

      timing.semanticSearch = Date.now() - start;

      // Convert to hybrid search results
      return this.convertSimilarityResults(similarMessages, 'semantic');

    } catch (error) {
      timing.semanticSearch = Date.now() - start;
      console.error('Semantic search failed:', error);
      return [];
    }
  }

  /**
   * Perform FTS-only search
   */
  private async ftsSearch(
    options: HybridSearchOptions,
    timing: any
  ): Promise<HybridSearchResult[]> {
    const start = Date.now();

    try {
      // Use existing FTS engine
      const ftsResults = await this.ftsEngine.simpleSearch(
        options.query,
        options.limit || 20,
        options.conversationId
      );

      timing.ftsSearch = Date.now() - start;

      // Convert to hybrid search results
      return this.convertFTSResults(ftsResults, 'fts');

    } catch (error) {
      timing.ftsSearch = Date.now() - start;
      console.error('FTS search failed:', error);
      return [];
    }
  }

  /**
   * Perform hybrid search combining semantic and FTS
   */
  private async hybridSearch(
    options: HybridSearchOptions,
    timing: any
  ): Promise<HybridSearchResult[]> {
    const mergeStart = Date.now();

    try {
      // Get results from both search methods in parallel
      const [semanticResults, ftsResults] = await Promise.all([
        this.semanticSearch({ ...options, limit: 50 }, timing),
        this.ftsSearch({ ...options, limit: 50 }, timing)
      ]);

      // Merge and rank results
      const weights = options.weights || this.defaultWeights;
      const mergedResults = this.mergeResults(semanticResults, ftsResults, weights);

      timing.resultMerging = Date.now() - mergeStart;

      // Apply final limit
      return mergedResults.slice(0, options.limit || 20);

    } catch (error) {
      timing.resultMerging = Date.now() - mergeStart;
      console.error('Hybrid search failed:', error);
      return [];
    }
  }

  /**
   * Merge semantic and FTS results with intelligent ranking
   */
  private mergeResults(
    semanticResults: HybridSearchResult[],
    ftsResults: HybridSearchResult[],
    weights: { semantic: number; fts: number }
  ): HybridSearchResult[] {
    const resultMap = new Map<string, HybridSearchResult>();

    // Process semantic results
    for (const result of semanticResults) {
      resultMap.set(result.messageId, {
        ...result,
        matchType: 'hybrid',
        score: result.score * weights.semantic,
        scores: {
          semantic: result.score,
          combined: result.score * weights.semantic
        }
      });
    }

    // Merge FTS results
    for (const result of ftsResults) {
      const existing = resultMap.get(result.messageId);
      if (existing) {
        // Combine scores
        const combinedScore = existing.scores.combined + (result.score * weights.fts);
        existing.score = combinedScore;
        existing.scores.fts = result.score;
        existing.scores.combined = combinedScore;
        
        // Merge highlights
        existing.highlights = [...new Set([...existing.highlights, ...result.highlights])];
      } else {
        // Add as FTS-only result
        resultMap.set(result.messageId, {
          ...result,
          matchType: 'hybrid',
          score: result.score * weights.fts,
          scores: {
            fts: result.score,
            combined: result.score * weights.fts
          }
        });
      }
    }

    // Sort by combined score
    return Array.from(resultMap.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Analyze query to determine characteristics
   */
  private analyzeQuery(query: string): {
    termCount: number;
    hasOperators: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
    suggestedStrategy: string;
  } {
    const terms = query.split(/\s+/).filter(term => term.length > 0);
    const hasOperators = /["()\-+*]/.test(query);
    
    let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (terms.length > 5 || hasOperators) {
      complexity = 'complex';
    } else if (terms.length > 2) {
      complexity = 'moderate';
    }

    // Suggest strategy based on query characteristics
    let suggestedStrategy = 'hybrid';
    if (terms.length === 1 && !hasOperators) {
      suggestedStrategy = 'semantic';
    } else if (hasOperators || terms.length > 5) {
      suggestedStrategy = 'fts';
    }

    return {
      termCount: terms.length,
      hasOperators,
      complexity,
      suggestedStrategy
    };
  }

  /**
   * Select optimal search strategy
   */
  private selectStrategy(
    queryAnalysis: any,
    options: HybridSearchOptions
  ): 'semantic' | 'fts' | 'hybrid' {
    // Use suggested strategy unless overridden
    if (options.strategy && options.strategy !== 'auto') {
      return options.strategy as 'semantic' | 'fts' | 'hybrid';
    }

    // Auto-selection logic
    if (queryAnalysis.complexity === 'simple' && !queryAnalysis.hasOperators) {
      return 'semantic';
    } else if (queryAnalysis.hasOperators || queryAnalysis.termCount > 5) {
      return 'fts';
    } else {
      return 'hybrid';
    }
  }

  /**
   * Convert similarity results to hybrid search results
   */
  private convertSimilarityResults(
    results: SimilarityResult[],
    matchType: 'semantic' | 'fts' | 'hybrid'
  ): HybridSearchResult[] {
    return results.map(result => ({
      messageId: result.messageId,
      conversationId: result.conversationId,
      content: result.content,
      score: result.similarity,
      matchType,
      scores: {
        semantic: matchType === 'semantic' ? result.similarity : undefined,
        fts: matchType === 'fts' ? result.similarity : undefined,
        combined: result.similarity
      },
      highlights: this.generateSemanticHighlights(result.content),
      createdAt: result.createdAt
    }));
  }

  /**
   * Convert FTS results to hybrid search results
   */
  private convertFTSResults(
    results: SearchResult[],
    matchType: 'semantic' | 'fts' | 'hybrid'
  ): HybridSearchResult[] {
    return results.map(result => ({
      messageId: result.message.id,
      conversationId: result.message.conversationId,
      content: result.message.content,
      score: result.score,
      matchType,
      scores: {
        semantic: matchType === 'semantic' ? result.score : undefined,
        fts: matchType === 'fts' ? result.score : undefined,
        combined: result.score
      },
      highlights: [result.snippet],
      conversationTitle: result.conversationTitle,
      createdAt: result.message.createdAt
    }));
  }

  /**
   * Generate semantic highlights (placeholder implementation)
   */
  private generateSemanticHighlights(content: string): string[] {
    // In a real implementation, this would use attention weights or other methods
    // to identify semantically important parts of the text
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
    return sentences.slice(0, 2).map(s => s.trim());
  }

  /**
   * Add explanations to results
   */
  private addExplanations(
    results: HybridSearchResult[],
    queryAnalysis: any,
    strategy: string
  ): HybridSearchResult[] {
    return results.map(result => ({
      ...result,
      explanation: this.generateExplanation(result, queryAnalysis, strategy)
    }));
  }

  /**
   * Generate explanation for why a result was selected
   */
  private generateExplanation(
    result: HybridSearchResult,
    queryAnalysis: any,
    strategy: string
  ): string {
    const explanations: string[] = [];

    if (result.matchType === 'semantic' || result.scores.semantic) {
      explanations.push(`Semantic similarity: ${(result.scores.semantic! * 100).toFixed(1)}%`);
    }

    if (result.matchType === 'fts' || result.scores.fts) {
      explanations.push(`Text match score: ${(result.scores.fts! * 100).toFixed(1)}%`);
    }

    if (result.matchType === 'hybrid') {
      explanations.push('Combined semantic and text matching');
    }

    explanations.push(`Strategy: ${strategy}`);
    explanations.push(`Query complexity: ${queryAnalysis.complexity}`);

    return explanations.join('; ');
  }

  /**
   * Store search metrics in database
   */
  private async storeMetrics(metrics: SearchMetrics): Promise<void> {
    try {
      const db = this.dbManager.getConnection();
      
      const stmt = db.prepare(`
        INSERT INTO search_metrics (query_type, query_text, result_count, execution_time_ms)
        VALUES (?, ?, ?, ?)
      `);
      
      stmt.run(metrics.strategy, metrics.query, metrics.resultCount, metrics.totalTime);
    } catch (error) {
      console.error('Failed to store search metrics:', error);
    }
  }

  /**
   * Get search performance metrics
   */
  async getSearchMetrics(options: {
    startDate?: number;
    endDate?: number;
    queryType?: string;
    limit?: number;
  } = {}): Promise<Array<{
    queryType: string;
    avgExecutionTime: number;
    avgResultCount: number;
    totalQueries: number;
    date: string;
  }>> {
    const db = this.dbManager.getConnection();
    
    let query = `
      SELECT 
        query_type,
        AVG(execution_time_ms) as avg_execution_time,
        AVG(result_count) as avg_result_count,
        COUNT(*) as total_queries,
        DATE(created_at, 'unixepoch') as date
      FROM search_metrics
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (options.startDate) {
      query += ' AND created_at >= ?';
      params.push(options.startDate);
    }
    
    if (options.endDate) {
      query += ' AND created_at <= ?';
      params.push(options.endDate);
    }
    
    if (options.queryType) {
      query += ' AND query_type = ?';
      params.push(options.queryType);
    }
    
    query += ' GROUP BY query_type, DATE(created_at, \'unixepoch\') ORDER BY date DESC';
    
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }
    
    return db.prepare(query).all(...params) as any[];
  }

  /**
   * Configure search weights and settings
   */
  async updateConfiguration(config: {
    defaultWeights?: { semantic: number; fts: number };
    metricsEnabled?: boolean;
    semanticThreshold?: number;
  }): Promise<void> {
    if (config.defaultWeights) {
      this.defaultWeights = config.defaultWeights;
      
      // Store in database
      const db = this.dbManager.getConnection();
      const stmt = db.prepare(`
        INSERT INTO search_config (key, value, updated_at)
        VALUES ('hybrid_search_weights', ?, ?)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `);
      stmt.run(JSON.stringify(config.defaultWeights), Date.now());
    }

    if (config.metricsEnabled !== undefined) {
      this.metricsEnabled = config.metricsEnabled;
    }
  }

  /**
   * Generate unique query ID for tracking
   */
  private generateQueryId(): string {
    return `query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Optimize search performance
   */
  async optimize(): Promise<void> {
    // Process unembedded messages
    await this.embeddingManager.processUnembeddedMessages(100);
    
    // Optimize FTS index
    const db = this.dbManager.getConnection();
    db.prepare("INSERT INTO messages_fts(messages_fts) VALUES('optimize')").run();
    
    // Update database statistics
    db.prepare('ANALYZE').run();
  }

  /**
   * Get current search configuration
   */
  getConfiguration(): {
    defaultWeights: { semantic: number; fts: number };
    metricsEnabled: boolean;
  } {
    return {
      defaultWeights: { ...this.defaultWeights },
      metricsEnabled: this.metricsEnabled
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.embeddingManager.destroy();
    this.ftsEngine.destroy();
  }
}