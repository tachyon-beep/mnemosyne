/**
 * Relevance Scorer - Multi-factor relevance scoring for context assembly
 * 
 * This module provides:
 * - Semantic similarity scoring using embeddings
 * - Temporal relevance with decay functions
 * - Entity overlap scoring
 * - Structural relevance (conversation position)
 * - Query-specific weighting
 */

import { EmbeddingManager } from '../../search/EmbeddingManager.js';
import { ContextAssemblyRequest } from '../ContextAssembler.js';

/**
 * Item to be scored for relevance
 */
export interface ScoredItem {
  id: string;
  type: 'summary' | 'message';
  content: string;
  relevanceScore: number;
  tokenCount: number;
  createdAt: number;
  conversationId: string;
  metadata?: Record<string, any>;
  originalItem?: any; // Reference to original ConversationSummary or Message
}

/**
 * Item input for scoring
 */
export interface ItemToScore {
  id: string;
  type: 'summary' | 'message';
  content: string;
  createdAt: number;
  conversationId: string;
  metadata?: Record<string, any>;
}

/**
 * Relevance scoring configuration
 */
export interface RelevanceScorerConfig {
  /** Weight for semantic similarity (0-1) */
  semanticWeight: number;
  /** Weight for temporal relevance (0-1) */
  temporalWeight: number;
  /** Weight for entity overlap (0-1) */
  entityWeight: number;
  /** Weight for structural relevance (0-1) */
  structuralWeight: number;
  /** Temporal decay half-life in milliseconds */
  temporalDecayHalfLife: number;
  /** Minimum semantic similarity threshold */
  minSemanticSimilarity: number;
  /** Entity extraction patterns */
  entityPatterns: RegExp[];
}

/**
 * Default scoring configuration
 */
const DEFAULT_CONFIG: RelevanceScorerConfig = {
  semanticWeight: 0.4,
  temporalWeight: 0.2,
  entityWeight: 0.2,
  structuralWeight: 0.2,
  temporalDecayHalfLife: 7 * 24 * 60 * 60 * 1000, // 7 days
  minSemanticSimilarity: 0.1,
  entityPatterns: [
    /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, // Person names
    /\b[A-Z][a-zA-Z]+(?:\.[a-zA-Z]+)+\b/g, // Domain names
    /\b[A-Z]{2,}\b/g, // Acronyms
    /@\w+/g, // Mentions
    /#\w+/g, // Hashtags
    /\b\d{4}-\d{2}-\d{2}\b/g, // Dates
    /\$[A-Z]{3,4}\b/g // Currency codes
  ]
};

/**
 * Relevance Scorer for context items
 */
export class RelevanceScorer {
  private config: RelevanceScorerConfig;
  private embeddingManager: EmbeddingManager;
  private queryEmbeddingCache: Map<string, number[]>;

  constructor(
    embeddingManager: EmbeddingManager,
    config?: Partial<RelevanceScorerConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.embeddingManager = embeddingManager;
    this.queryEmbeddingCache = new Map();
    
    // Validate weights sum approximately to 1
    const totalWeight = this.config.semanticWeight + this.config.temporalWeight + 
                       this.config.entityWeight + this.config.structuralWeight;
    if (Math.abs(totalWeight - 1.0) > 0.1) {
      console.warn(`Relevance scorer weights sum to ${totalWeight}, should be close to 1.0`);
    }
  }

  /**
   * Score an item for relevance to a query
   */
  async scoreItem(
    item: ItemToScore,
    request: ContextAssemblyRequest
  ): Promise<number> {
    try {
      // Calculate individual scores
      const semanticScore = await this.calculateSemanticScore(item, request);
      const temporalScore = this.calculateTemporalScore(item, request);
      const entityScore = this.calculateEntityScore(item, request);
      const structuralScore = this.calculateStructuralScore(item, request);

      // Apply weights and combine scores
      const totalScore = 
        (semanticScore * this.config.semanticWeight) +
        (temporalScore * this.config.temporalWeight) +
        (entityScore * this.config.entityWeight) +
        (structuralScore * this.config.structuralWeight);

      // Apply query-specific boosting
      const boostedScore = this.applyQuerySpecificBoosting(
        totalScore,
        item,
        request
      );

      // Clamp to [0, 1] range
      return Math.max(0, Math.min(1, boostedScore));

    } catch (error) {
      console.error(`Failed to score item ${item.id}:`, error);
      return 0; // Return minimum score on error
    }
  }

  /**
   * Calculate semantic similarity score using embeddings
   */
  private async calculateSemanticScore(
    item: ItemToScore,
    request: ContextAssemblyRequest
  ): Promise<number> {
    try {
      // Get or generate query embedding
      let queryEmbedding = this.queryEmbeddingCache.get(request.query);
      if (!queryEmbedding) {
        queryEmbedding = await this.embeddingManager.generateEmbedding(request.query);
        this.queryEmbeddingCache.set(request.query, queryEmbedding);
      }

      // Generate content embedding
      const contentEmbedding = await this.embeddingManager.generateEmbedding(item.content);

      // Calculate cosine similarity
      const similarity = this.embeddingManager.cosineSimilarity(queryEmbedding, contentEmbedding);

      // Apply minimum threshold
      if (similarity < this.config.minSemanticSimilarity) {
        return 0;
      }

      // Normalize to [0, 1] range
      return Math.max(0, Math.min(1, similarity));

    } catch (error) {
      console.warn(`Failed to calculate semantic score for item ${item.id}:`, error);
      return 0;
    }
  }

  /**
   * Calculate temporal relevance score with decay
   */
  private calculateTemporalScore(
    item: ItemToScore,
    _request: ContextAssemblyRequest
  ): number {
    const now = Date.now();
    const age = now - item.createdAt;

    // Handle negative ages (future items)
    if (age < 0) {
      return 1.0; // Future items get maximum temporal score
    }

    // Apply exponential decay with configurable half-life
    const decayConstant = Math.log(2) / this.config.temporalDecayHalfLife;
    const decayScore = Math.exp(-decayConstant * age);

    // Recent items get boosted score
    const recentBoost = age < (24 * 60 * 60 * 1000) ? 1.2 : 1.0; // 24 hours

    return Math.max(0, Math.min(1, decayScore * recentBoost));
  }

  /**
   * Calculate entity overlap score
   */
  private calculateEntityScore(
    item: ItemToScore,
    request: ContextAssemblyRequest
  ): number {
    const queryEntities = this.extractEntities(request.query);
    const contentEntities = this.extractEntities(item.content);

    // Add focus entities from request
    if (request.focusEntities && request.focusEntities.length > 0) {
      queryEntities.push(...request.focusEntities.map(e => e.toLowerCase()));
    }

    if (queryEntities.length === 0) {
      return 0.5; // Neutral score when no entities to compare
    }

    // Calculate Jaccard similarity for entity overlap
    const querySet = new Set(queryEntities);
    const contentSet = new Set(contentEntities);
    
    const intersection = new Set([...querySet].filter(e => contentSet.has(e)));
    const union = new Set([...querySet, ...contentSet]);

    const jaccardSimilarity = union.size > 0 ? intersection.size / union.size : 0;

    // Boost score for exact entity matches
    const exactMatches = [...intersection].length;
    const exactBoost = exactMatches > 0 ? 1 + (exactMatches * 0.1) : 1;

    return Math.max(0, Math.min(1, jaccardSimilarity * exactBoost));
  }

  /**
   * Calculate structural relevance score
   */
  private calculateStructuralScore(
    item: ItemToScore,
    request: ContextAssemblyRequest
  ): number {
    let structuralScore = 0.5; // Base score

    // Boost summaries as they provide high-level context
    if (item.type === 'summary') {
      structuralScore += 0.2;
    }

    // Boost items in the target conversation
    if (request.conversationId && item.conversationId === request.conversationId) {
      structuralScore += 0.3;
    }

    // Boost items with rich metadata
    if (item.metadata && Object.keys(item.metadata).length > 0) {
      structuralScore += 0.1;
    }

    // Consider message role for messages
    if (item.type === 'message' && item.metadata?.role) {
      const role = item.metadata.role;
      if (role === 'assistant') {
        structuralScore += 0.1; // Assistant responses often contain valuable info
      } else if (role === 'system') {
        structuralScore += 0.05; // System messages provide context
      }
    }

    return Math.max(0, Math.min(1, structuralScore));
  }

  /**
   * Apply query-specific boosting rules
   */
  private applyQuerySpecificBoosting(
    baseScore: number,
    item: ItemToScore,
    request: ContextAssemblyRequest
  ): number {
    let boostedScore = baseScore;

    // Boost for question words in query
    const questionWords = ['what', 'how', 'why', 'when', 'where', 'who', 'which'];
    const queryLower = request.query.toLowerCase();
    const hasQuestionWord = questionWords.some(word => queryLower.includes(word));

    if (hasQuestionWord) {
      // Look for answers or explanations in content
      const contentLower = item.content.toLowerCase();
      const answerIndicators = ['because', 'therefore', 'due to', 'result', 'answer', 'solution'];
      const hasAnswerIndicator = answerIndicators.some(indicator => 
        contentLower.includes(indicator)
      );

      if (hasAnswerIndicator) {
        boostedScore *= 1.15; // 15% boost for potential answers
      }
    }

    // Boost for code-related queries
    if (this.isCodeRelatedQuery(request.query)) {
      const hasCodeContent = this.hasCodeContent(item.content);
      if (hasCodeContent) {
        boostedScore *= 1.2; // 20% boost for code content
      }
    }

    // Boost for error-related queries
    if (this.isErrorRelatedQuery(request.query)) {
      const hasErrorContent = this.hasErrorContent(item.content);
      if (hasErrorContent) {
        boostedScore *= 1.25; // 25% boost for error-related content
      }
    }

    // Boost recent items for time-sensitive queries
    if (request.includeRecent && this.isTimeSensitiveQuery(request.query)) {
      const age = Date.now() - item.createdAt;
      const isRecent = age < (24 * 60 * 60 * 1000); // 24 hours
      
      if (isRecent) {
        boostedScore *= 1.1; // 10% boost for recent items
      }
    }

    return boostedScore;
  }

  /**
   * Extract entities from text using patterns
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];

    for (const pattern of this.config.entityPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        entities.push(...matches.map(match => match.toLowerCase().trim()));
      }
    }

    // Remove duplicates and empty strings
    return [...new Set(entities)].filter(entity => entity.length > 1);
  }

  /**
   * Check if query is code-related
   */
  private isCodeRelatedQuery(query: string): boolean {
    const codeKeywords = [
      'function', 'class', 'method', 'variable', 'algorithm', 'code', 'programming',
      'debug', 'error', 'exception', 'api', 'database', 'sql', 'javascript',
      'python', 'typescript', 'react', 'node', 'npm', 'git', 'repository'
    ];

    const queryLower = query.toLowerCase();
    return codeKeywords.some(keyword => queryLower.includes(keyword));
  }

  /**
   * Check if content contains code
   */
  private hasCodeContent(content: string): boolean {
    // Look for code indicators
    const codeIndicators = [
      /```[\s\S]*?```/g, // Code blocks
      /`[^`]+`/g, // Inline code
      /\b(function|class|const|let|var|import|export)\b/g, // JS keywords
      /\b(def|class|import|from)\b/g, // Python keywords
      /[{}();]/g, // Programming punctuation
      /\b\w+\(\)/g, // Function calls
      /\b[a-zA-Z_]\w*\.[a-zA-Z_]\w*/g // Object property access
    ];

    return codeIndicators.some(pattern => pattern.test(content));
  }

  /**
   * Check if query is error-related
   */
  private isErrorRelatedQuery(query: string): boolean {
    const errorKeywords = [
      'error', 'exception', 'bug', 'issue', 'problem', 'fail', 'crash',
      'broken', 'fix', 'resolve', 'troubleshoot', 'debug'
    ];

    const queryLower = query.toLowerCase();
    return errorKeywords.some(keyword => queryLower.includes(keyword));
  }

  /**
   * Check if content contains error information
   */
  private hasErrorContent(content: string): boolean {
    const errorIndicators = [
      /error|exception|stack trace|traceback/gi,
      /\b\d{3}\s*(error|status)/gi, // HTTP status codes
      /failed|crashed|broken/gi,
      /at line \d+/gi // Line number references
    ];

    return errorIndicators.some(pattern => pattern.test(content));
  }

  /**
   * Check if query is time-sensitive
   */
  private isTimeSensitiveQuery(query: string): boolean {
    const timeKeywords = [
      'recent', 'latest', 'new', 'current', 'today', 'yesterday',
      'this week', 'last', 'now', 'updated', 'changed'
    ];

    const queryLower = query.toLowerCase();
    return timeKeywords.some(keyword => queryLower.includes(keyword));
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RelevanceScorerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): RelevanceScorerConfig {
    return { ...this.config };
  }

  /**
   * Clear query embedding cache
   */
  clearCache(): void {
    this.queryEmbeddingCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.queryEmbeddingCache.size,
      keys: Array.from(this.queryEmbeddingCache.keys())
    };
  }
}