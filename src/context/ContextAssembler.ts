/**
 * Context Assembler - Intelligent context assembly for queries
 * 
 * This module provides:
 * - Multi-factor relevance scoring
 * - Token budget management
 * - Progressive context building
 * - Different assembly strategies
 * - Optimal context selection
 */

import { Message, ConversationSummary } from '../types/interfaces.js';
import { EmbeddingManager } from '../search/EmbeddingManager.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { SummaryRepository } from '../storage/repositories/SummaryRepository.js';
import { TokenCounter, createTokenCounter } from './TokenCounter.js';
import { RelevanceScorer, ScoredItem } from './scoring/RelevanceScorer.js';
import { TokenOptimizer, TokenBudget } from './optimization/TokenOptimizer.js';
import { AssemblyStrategy, StrategyType } from './strategies/AssemblyStrategy.js';
import { TemporalStrategy } from './strategies/TemporalStrategy.js';
import { TopicalStrategy } from './strategies/TopicalStrategy.js';
import { EntityCentricStrategy } from './strategies/EntityCentricStrategy.js';
import { HybridStrategy } from './strategies/HybridStrategy.js';

/**
 * Context assembly request parameters
 */
export interface ContextAssemblyRequest {
  /** The user's query */
  query: string;
  /** Optional conversation ID to limit scope */
  conversationId?: string;
  /** Maximum token budget for assembled context */
  maxTokens?: number;
  /** Assembly strategy to use */
  strategy?: StrategyType;
  /** Minimum relevance threshold */
  minRelevance?: number;
  /** Include recent messages regardless of relevance */
  includeRecent?: boolean;
  /** Entity names to focus on */
  focusEntities?: string[];
  /** Time window for context (in milliseconds) */
  timeWindow?: number;
  /** Model name for token counting */
  model?: string;
}

/**
 * Normalized request with all required fields filled
 */
type NormalizedRequest = ContextAssemblyRequest & {
  query: string;
  maxTokens: number;
  strategy: StrategyType;
  minRelevance: number;
  includeRecent: boolean;
  focusEntities: string[];
  timeWindow: number;
  model: string;
};

/**
 * Assembled context result
 */
export interface AssembledContext {
  /** The assembled context text */
  text: string;
  /** Token count of the assembled context */
  tokenCount: number;
  /** Breakdown of token usage */
  tokenBreakdown: {
    query: number;
    summaries: number;
    messages: number;
    metadata: number;
    buffer: number;
  };
  /** Items included in the context */
  includedItems: Array<{
    type: 'summary' | 'message';
    id: string;
    relevanceScore: number;
    tokenCount: number;
    position: number;
  }>;
  /** Assembly strategy used */
  strategy: StrategyType;
  /** Performance metrics */
  metrics: {
    processingTimeMs: number;
    itemsEvaluated: number;
    itemsIncluded: number;
    averageRelevance: number;
    tokenEfficiency: number; // tokens used / max tokens
  };
}

/**
 * Context assembly configuration
 */
export interface ContextAssemblerConfig {
  /** Default maximum token budget */
  defaultMaxTokens: number;
  /** Default assembly strategy */
  defaultStrategy: StrategyType;
  /** Default minimum relevance threshold */
  defaultMinRelevance: number;
  /** Token allocation ratios */
  tokenAllocation: {
    query: number;
    summaries: number;
    messages: number;
    metadata: number;
    buffer: number;
  };
  /** Performance thresholds */
  performance: {
    maxProcessingTimeMs: number;
    maxItemsToEvaluate: number;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ContextAssemblerConfig = {
  defaultMaxTokens: 4000,
  defaultStrategy: 'hybrid',
  defaultMinRelevance: 0.3,
  tokenAllocation: {
    query: 0.05,      // 5% for query context
    summaries: 0.30,  // 30% for summaries
    messages: 0.50,   // 50% for message details
    metadata: 0.10,   // 10% for metadata
    buffer: 0.05      // 5% buffer
  },
  performance: {
    maxProcessingTimeMs: 5000, // 5 second timeout
    maxItemsToEvaluate: 1000   // Limit evaluation for performance
  }
};

/**
 * Context Assembler - Main service for intelligent context assembly
 */
export class ContextAssembler {
  private config: ContextAssemblerConfig;
  private embeddingManager: EmbeddingManager;
  private messageRepository: MessageRepository;
  private summaryRepository: SummaryRepository;
  private relevanceScorer: RelevanceScorer;
  private tokenOptimizer: TokenOptimizer;
  private strategies: Map<StrategyType, AssemblyStrategy>;

  constructor(
    embeddingManager: EmbeddingManager,
    messageRepository: MessageRepository,
    summaryRepository: SummaryRepository,
    config?: Partial<ContextAssemblerConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.embeddingManager = embeddingManager;
    this.messageRepository = messageRepository;
    this.summaryRepository = summaryRepository;
    
    // Initialize components
    this.relevanceScorer = new RelevanceScorer(embeddingManager);
    this.tokenOptimizer = new TokenOptimizer();
    
    // Initialize strategies
    this.strategies = new Map();
    this.strategies.set('temporal', new TemporalStrategy());
    this.strategies.set('topical', new TopicalStrategy());
    this.strategies.set('entity-centric', new EntityCentricStrategy());
    this.strategies.set('hybrid', new HybridStrategy());
  }

  /**
   * Assemble optimal context for a query
   */
  async assembleContext(request: ContextAssemblyRequest): Promise<AssembledContext> {
    const startTime = Date.now();
    
    try {
      // Validate and normalize parameters
      const normalizedRequest = this.normalizeRequest(request);
      
      // Create token counter for the specified model
      const tokenCounter = createTokenCounter(normalizedRequest.model || 'default');
      
      // Calculate token budget
      const tokenBudget = this.calculateTokenBudget(normalizedRequest, tokenCounter);
      
      // Get assembly strategy
      const strategy = this.strategies.get(normalizedRequest.strategy!)!;
      
      // Collect and score candidate items
      const candidates = await this.collectCandidates(normalizedRequest);
      const scoredItems = await this.scoreItems(candidates, normalizedRequest);
      
      // Apply strategy-specific selection and ordering
      const selectedItems = await strategy.selectItems(
        scoredItems,
        normalizedRequest,
        tokenBudget
      );
      
      // Optimize token usage and assemble final context
      const optimizedItems = this.tokenOptimizer.optimizeSelection(
        selectedItems,
        tokenBudget,
        tokenCounter
      );
      
      // Build the final context text
      const contextText = await this.buildContextText(
        optimizedItems,
        normalizedRequest,
        tokenCounter
      );
      
      // Calculate metrics
      const processingTime = Date.now() - startTime;
      const metrics = this.calculateMetrics(
        candidates,
        optimizedItems,
        processingTime,
        tokenBudget.total
      );
      
      return {
        text: contextText,
        tokenCount: tokenCounter.countText(contextText).count,
        tokenBreakdown: {
          query: tokenBudget.query,
          summaries: tokenBudget.summaries,
          messages: tokenBudget.messages,
          metadata: tokenBudget.metadata,
          buffer: tokenBudget.buffer
        },
        includedItems: optimizedItems.map((item, index) => ({
          type: item.type,
          id: item.id,
          relevanceScore: item.relevanceScore,
          tokenCount: item.tokenCount,
          position: index
        })),
        strategy: normalizedRequest.strategy!,
        metrics
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('Context assembly failed:', error);
      
      // Return minimal fallback context
      return this.createFallbackContext(request, processingTime);
    }
  }

  /**
   * Normalize and validate request parameters
   */
  private normalizeRequest(request: ContextAssemblyRequest): NormalizedRequest {
    return {
      query: request.query.trim(),
      conversationId: request.conversationId,
      maxTokens: request.maxTokens || this.config.defaultMaxTokens,
      strategy: request.strategy || this.config.defaultStrategy,
      minRelevance: request.minRelevance || this.config.defaultMinRelevance,
      includeRecent: request.includeRecent ?? true,
      focusEntities: request.focusEntities || [],
      timeWindow: request.timeWindow || (7 * 24 * 60 * 60 * 1000), // 7 days default
      model: request.model || 'default'
    };
  }

  /**
   * Calculate token budget allocation
   */
  private calculateTokenBudget(
    request: NormalizedRequest,
    tokenCounter: TokenCounter
  ): TokenBudget {
    const maxTokens = request.maxTokens;
    const allocation = this.config.tokenAllocation;
    
    // Calculate query tokens
    const queryTokens = Math.min(
      Math.ceil(maxTokens * allocation.query),
      tokenCounter.countText(request.query).count + 50 // Query + some context
    );
    
    // Allocate remaining tokens
    const remainingTokens = maxTokens - queryTokens;
    
    return {
      total: maxTokens,
      query: queryTokens,
      summaries: Math.ceil(remainingTokens * allocation.summaries),
      messages: Math.ceil(remainingTokens * allocation.messages),
      metadata: Math.ceil(remainingTokens * allocation.metadata),
      buffer: Math.ceil(remainingTokens * allocation.buffer)
    };
  }

  /**
   * Collect candidate summaries and messages
   */
  private async collectCandidates(
    request: NormalizedRequest
  ): Promise<Array<{ type: 'summary' | 'message'; item: ConversationSummary | Message }>> {
    const candidates: Array<{ type: 'summary' | 'message'; item: ConversationSummary | Message }> = [];
    
    // Collect summaries
    const summaryResult = await this.summaryRepository.findRecent(
      Math.min(100, this.config.performance.maxItemsToEvaluate / 2),
      0.5 // Minimum quality score
    );
    
    for (const summary of summaryResult) {
      if (!request.conversationId || summary.conversationId === request.conversationId) {
        candidates.push({ type: 'summary', item: summary });
      }
    }
    
    // Collect messages
    const messageLimit = Math.min(
      200,
      this.config.performance.maxItemsToEvaluate - candidates.length
    );
    
    let messageResult;
    if (request.conversationId) {
      messageResult = await this.messageRepository.findByConversation(
        request.conversationId,
        messageLimit,
        0,
        'created_at',
        'DESC'
      );
    } else {
      // Find recent messages across all conversations
      messageResult = await this.messageRepository.findWithEmbeddings(
        undefined,
        messageLimit,
        0
      );
    }
    
    for (const message of messageResult.data) {
      // Apply time window filter
      if (request.timeWindow && 
          Date.now() - message.createdAt > request.timeWindow) {
        continue;
      }
      
      candidates.push({ type: 'message', item: message });
    }
    
    return candidates;
  }

  /**
   * Score items for relevance using multi-factor scoring
   */
  private async scoreItems(
    candidates: Array<{ type: 'summary' | 'message'; item: ConversationSummary | Message }>,
    request: NormalizedRequest
  ): Promise<ScoredItem[]> {
    const scoredItems: ScoredItem[] = [];
    
    for (const candidate of candidates) {
      const item = candidate.item;
      const content = candidate.type === 'summary' 
        ? (item as ConversationSummary).summaryText
        : (item as Message).content;
      
      // Score the item
      const relevanceScore = await this.relevanceScorer.scoreItem({
        id: item.id,
        type: candidate.type,
        content,
        createdAt: candidate.type === 'summary' 
          ? (item as ConversationSummary).generatedAt
          : (item as Message).createdAt,
        conversationId: candidate.type === 'summary'
          ? (item as ConversationSummary).conversationId
          : (item as Message).conversationId,
        metadata: candidate.type === 'summary'
          ? (item as ConversationSummary).metadata
          : (item as Message).metadata
      }, request);
      
      // Skip items below relevance threshold
      if (relevanceScore < request.minRelevance) {
        continue;
      }
      
      scoredItems.push({
        id: item.id,
        type: candidate.type,
        content,
        relevanceScore,
        tokenCount: 0, // Will be calculated by token optimizer
        createdAt: candidate.type === 'summary' 
          ? (item as ConversationSummary).generatedAt
          : (item as Message).createdAt,
        conversationId: candidate.type === 'summary'
          ? (item as ConversationSummary).conversationId
          : (item as Message).conversationId,
        metadata: candidate.type === 'summary'
          ? (item as ConversationSummary).metadata
          : (item as Message).metadata,
        originalItem: item
      });
    }
    
    return scoredItems;
  }

  /**
   * Build the final context text from selected items
   */
  private async buildContextText(
    items: ScoredItem[],
    request: NormalizedRequest,
    _tokenCounter: TokenCounter
  ): Promise<string> {
    const sections: string[] = [];
    
    // Add query context
    sections.push(`Query: ${request.query}\n`);
    
    // Group items by type
    const summaries = items.filter(item => item.type === 'summary');
    const messages = items.filter(item => item.type === 'message');
    
    // Add conversation summaries
    if (summaries.length > 0) {
      sections.push('## Conversation Summaries\n');
      
      for (const summary of summaries) {
        const summaryObj = summary.originalItem as ConversationSummary;
        sections.push(
          `### ${summaryObj.level} Summary (${summaryObj.messageCount} messages)\n` +
          `${summary.content}\n`
        );
      }
    }
    
    // Add detailed messages
    if (messages.length > 0) {
      sections.push('## Detailed Messages\n');
      
      // Group messages by conversation
      const messagesByConversation = new Map<string, ScoredItem[]>();
      for (const message of messages) {
        const convId = message.conversationId;
        if (!messagesByConversation.has(convId)) {
          messagesByConversation.set(convId, []);
        }
        messagesByConversation.get(convId)!.push(message);
      }
      
      for (const [conversationId, convMessages] of messagesByConversation) {
        if (messagesByConversation.size > 1) {
          sections.push(`### Conversation ${conversationId.slice(0, 8)}\n`);
        }
        
        // Sort messages by timestamp
        convMessages.sort((a, b) => a.createdAt - b.createdAt);
        
        for (const message of convMessages) {
          const messageObj = message.originalItem as Message;
          const timestamp = new Date(messageObj.createdAt).toISOString();
          sections.push(
            `**${messageObj.role}** (${timestamp}):\n${message.content}\n`
          );
        }
      }
    }
    
    return sections.join('\n');
  }

  /**
   * Calculate performance metrics
   */
  private calculateMetrics(
    totalCandidates: any[],
    includedItems: ScoredItem[],
    processingTime: number,
    maxTokens: number
  ): AssembledContext['metrics'] {
    const averageRelevance = includedItems.length > 0
      ? includedItems.reduce((sum, item) => sum + item.relevanceScore, 0) / includedItems.length
      : 0;
    
    const totalTokensUsed = includedItems.reduce((sum, item) => sum + item.tokenCount, 0);
    const tokenEfficiency = totalTokensUsed / maxTokens;
    
    return {
      processingTimeMs: processingTime,
      itemsEvaluated: totalCandidates.length,
      itemsIncluded: includedItems.length,
      averageRelevance,
      tokenEfficiency
    };
  }

  /**
   * Create fallback context when assembly fails
   */
  private createFallbackContext(
    request: ContextAssemblyRequest,
    processingTime: number
  ): AssembledContext {
    const fallbackText = `Query: ${request.query}\n\n[Context assembly failed - using minimal context]`;
    const tokenCounter = createTokenCounter(request.model || 'default');
    const tokenCount = tokenCounter.countText(fallbackText).count;
    
    return {
      text: fallbackText,
      tokenCount,
      tokenBreakdown: {
        query: tokenCount,
        summaries: 0,
        messages: 0,
        metadata: 0,
        buffer: 0
      },
      includedItems: [],
      strategy: request.strategy || 'hybrid',
      metrics: {
        processingTimeMs: processingTime,
        itemsEvaluated: 0,
        itemsIncluded: 0,
        averageRelevance: 0,
        tokenEfficiency: 0
      }
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ContextAssemblerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextAssemblerConfig {
    return { ...this.config };
  }

  /**
   * Get available strategies
   */
  getAvailableStrategies(): StrategyType[] {
    return Array.from(this.strategies.keys());
  }

  /**
   * Get embedding manager instance
   */
  getEmbeddingManager(): EmbeddingManager {
    return this.embeddingManager;
  }
}