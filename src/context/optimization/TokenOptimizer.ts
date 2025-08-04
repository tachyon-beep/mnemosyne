/**
 * Token Optimizer - Smart token budget allocation and optimization
 * 
 * This module provides:
 * - Allocate token budget across different content types
 * - Smart truncation that preserves meaning
 * - Handle boundary conditions gracefully
 * - Provide fallback strategies
 */

import { TokenCounter } from '../TokenCounter.js';
import { ScoredItem } from '../scoring/RelevanceScorer.js';

/**
 * Token budget allocation
 */
export interface TokenBudget {
  total: number;
  query: number;
  summaries: number;
  messages: number;
  metadata: number;
  buffer: number;
}

/**
 * Token optimization configuration
 */
export interface TokenOptimizerConfig {
  /** Minimum tokens to preserve per item */
  minTokensPerItem: number;
  /** Maximum tokens allowed per item */
  maxTokensPerItem: number;
  /** Truncation strategy */
  truncationStrategy: 'end' | 'middle' | 'smart';
  /** Preserve important sentences when truncating */
  preserveImportantSentences: boolean;
  /** Token counting safety margin */
  safetyMargin: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: TokenOptimizerConfig = {
  minTokensPerItem: 20,
  maxTokensPerItem: 500,
  truncationStrategy: 'smart',
  preserveImportantSentences: true,
  safetyMargin: 0.05 // 5% safety margin
};

/**
 * Optimization result
 */
export interface OptimizationResult {
  optimizedItems: ScoredItem[];
  tokenUsage: {
    allocated: number;
    used: number;
    remaining: number;
    efficiency: number;
  };
  modifications: Array<{
    itemId: string;
    action: 'included' | 'truncated' | 'excluded';
    originalTokens: number;
    finalTokens: number;
    reason: string;
  }>;
}

/**
 * Token Optimizer for context assembly
 */
export class TokenOptimizer {
  private config: TokenOptimizerConfig;

  constructor(config?: Partial<TokenOptimizerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Optimize item selection to fit within token budget
   */
  optimizeSelection(
    items: ScoredItem[],
    budget: TokenBudget,
    tokenCounter: TokenCounter
  ): ScoredItem[] {
    const result = this.optimizeItems(items, budget, tokenCounter);
    return result.optimizedItems;
  }

  /**
   * Optimize items with detailed result information
   */
  optimizeItems(
    items: ScoredItem[],
    budget: TokenBudget,
    tokenCounter: TokenCounter
  ): OptimizationResult {
    // Sort items by relevance score (highest first)
    const sortedItems = [...items].sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Calculate token counts for all items
    const itemsWithTokens = sortedItems.map(item => ({
      ...item,
      tokenCount: tokenCounter.countText(item.content).count
    }));

    // Separate items by type
    const summaries = itemsWithTokens.filter(item => item.type === 'summary');
    const messages = itemsWithTokens.filter(item => item.type === 'message');

    // Optimize each category separately
    const optimizedSummaries = this.optimizeCategory(
      summaries,
      budget.summaries,
      tokenCounter,
      'summaries'
    );

    const optimizedMessages = this.optimizeCategory(
      messages,
      budget.messages,
      tokenCounter,
      'messages'
    );

    // Combine results
    const allOptimized = [...optimizedSummaries.items, ...optimizedMessages.items];
    const allModifications = [...optimizedSummaries.modifications, ...optimizedMessages.modifications];

    // Calculate final statistics
    const totalUsed = allOptimized.reduce((sum, item) => sum + item.tokenCount, 0);
    const totalAllocated = budget.summaries + budget.messages;
    const efficiency = totalAllocated > 0 ? totalUsed / totalAllocated : 0;

    return {
      optimizedItems: allOptimized,
      tokenUsage: {
        allocated: totalAllocated,
        used: totalUsed,
        remaining: totalAllocated - totalUsed,
        efficiency
      },
      modifications: allModifications
    };
  }

  /**
   * Optimize a category of items (summaries or messages)
   */
  private optimizeCategory(
    items: ScoredItem[],
    budgetTokens: number,
    tokenCounter: TokenCounter,
    _category: string
  ): {
    items: ScoredItem[];
    modifications: OptimizationResult['modifications'];
  } {
    const optimizedItems: ScoredItem[] = [];
    const modifications: OptimizationResult['modifications'] = [];
    
    // Apply safety margin
    const effectiveBudget = Math.floor(budgetTokens * (1 - this.config.safetyMargin));
    let remainingTokens = effectiveBudget;

    for (const item of items) {
      const originalTokens = item.tokenCount;

      // Skip if item is too small or we're out of budget for minimum items
      if (originalTokens < this.config.minTokensPerItem || 
          remainingTokens < this.config.minTokensPerItem) {
        modifications.push({
          itemId: item.id,
          action: 'excluded',
          originalTokens,
          finalTokens: 0,
          reason: originalTokens < this.config.minTokensPerItem 
            ? 'Item too small' 
            : 'Insufficient budget remaining'
        });
        continue;
      }

      // Check if item fits as-is
      if (originalTokens <= remainingTokens) {
        optimizedItems.push(item);
        remainingTokens -= originalTokens;
        
        modifications.push({
          itemId: item.id,
          action: 'included',
          originalTokens,
          finalTokens: originalTokens,
          reason: 'Fits within budget'
        });
        continue;
      }

      // Try to truncate if we have enough space for a meaningful portion
      const maxAllowedTokens = Math.min(
        remainingTokens,
        this.config.maxTokensPerItem
      );

      if (maxAllowedTokens >= this.config.minTokensPerItem) {
        const truncatedItem = this.truncateItem(
          item,
          maxAllowedTokens,
          tokenCounter
        );

        optimizedItems.push(truncatedItem);
        remainingTokens -= truncatedItem.tokenCount;

        modifications.push({
          itemId: item.id,
          action: 'truncated',
          originalTokens,
          finalTokens: truncatedItem.tokenCount,
          reason: `Truncated to fit ${maxAllowedTokens} token limit`
        });
      } else {
        modifications.push({
          itemId: item.id,
          action: 'excluded',
          originalTokens,
          finalTokens: 0,
          reason: 'Cannot truncate to meaningful size'
        });
      }
    }

    return { items: optimizedItems, modifications };
  }

  /**
   * Truncate an item to fit within token limit
   */
  private truncateItem(
    item: ScoredItem,
    maxTokens: number,
    tokenCounter: TokenCounter
  ): ScoredItem {
    const originalContent = item.content;
    let truncatedContent: string;

    switch (this.config.truncationStrategy) {
      case 'end':
        truncatedContent = this.truncateFromEnd(originalContent, maxTokens, tokenCounter);
        break;
      case 'middle':
        truncatedContent = this.truncateFromMiddle(originalContent, maxTokens, tokenCounter);
        break;
      case 'smart':
      default:
        truncatedContent = this.smartTruncate(originalContent, maxTokens, tokenCounter);
        break;
    }

    return {
      ...item,
      content: truncatedContent,
      tokenCount: tokenCounter.countText(truncatedContent).count
    };
  }

  /**
   * Truncate from the end, preserving the beginning
   */
  private truncateFromEnd(
    content: string,
    maxTokens: number,
    tokenCounter: TokenCounter
  ): string {
    const targetChars = Math.floor(maxTokens * tokenCounter.getModelConfig().avgCharsPerToken);
    
    if (content.length <= targetChars) {
      return content;
    }

    let truncated = content.substring(0, targetChars);
    
    // Try to break at sentence boundary
    const lastSentence = truncated.lastIndexOf('.');
    if (lastSentence > targetChars * 0.7) {
      truncated = truncated.substring(0, lastSentence + 1);
    } else {
      // Break at word boundary
      const lastSpace = truncated.lastIndexOf(' ');
      if (lastSpace > targetChars * 0.8) {
        truncated = truncated.substring(0, lastSpace);
      }
    }

    return truncated + (truncated.length < content.length ? '...' : '');
  }

  /**
   * Truncate from the middle, preserving beginning and end
   */
  private truncateFromMiddle(
    content: string,
    maxTokens: number,
    tokenCounter: TokenCounter
  ): string {
    const targetChars = Math.floor(maxTokens * tokenCounter.getModelConfig().avgCharsPerToken);
    
    if (content.length <= targetChars) {
      return content;
    }

    const keepChars = targetChars - 10; // Account for ellipsis
    const startChars = Math.floor(keepChars * 0.6); // 60% at start
    const endChars = keepChars - startChars; // 40% at end

    const start = content.substring(0, startChars);
    const end = content.substring(content.length - endChars);

    return start + ' [...] ' + end;
  }

  /**
   * Smart truncation preserving important sentences
   */
  private smartTruncate(
    content: string,
    maxTokens: number,
    tokenCounter: TokenCounter
  ): string {
    const targetChars = Math.floor(maxTokens * tokenCounter.getModelConfig().avgCharsPerToken);
    
    if (content.length <= targetChars) {
      return content;
    }

    if (!this.config.preserveImportantSentences) {
      return this.truncateFromEnd(content, maxTokens, tokenCounter);
    }

    // Split into sentences
    const sentences = this.splitIntoSentences(content);
    
    if (sentences.length <= 1) {
      return this.truncateFromEnd(content, maxTokens, tokenCounter);
    }

    // Score sentences by importance
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence,
      index,
      score: this.scoreSentenceImportance(sentence, index, sentences.length),
      length: sentence.length
    }));

    // Sort by importance, keeping original order for ties
    scoredSentences.sort((a, b) => {
      if (Math.abs(a.score - b.score) < 0.01) {
        return a.index - b.index; // Preserve order for similar scores
      }
      return b.score - a.score; // Higher scores first
    });

    // Select sentences that fit within budget
    const selectedSentences: typeof scoredSentences = [];
    let currentLength = 0;

    for (const scoredSent of scoredSentences) {
      if (currentLength + scoredSent.length <= targetChars) {
        selectedSentences.push(scoredSent);
        currentLength += scoredSent.length;
      }
    }

    // If no sentences fit, fall back to end truncation
    if (selectedSentences.length === 0) {
      return this.truncateFromEnd(content, maxTokens, tokenCounter);
    }

    // Sort selected sentences back to original order
    selectedSentences.sort((a, b) => a.index - b.index);

    const result = selectedSentences.map(s => s.sentence).join(' ');
    return result + (selectedSentences.length < sentences.length ? '...' : '');
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - could be enhanced with more sophisticated NLP
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s + '.'); // Add back the period
  }

  /**
   * Score sentence importance
   */
  private scoreSentenceImportance(
    sentence: string,
    index: number,
    totalSentences: number
  ): number {
    let score = 0.5; // Base score

    // First and last sentences are often important
    if (index === 0) {
      score += 0.3; // First sentence boost
    } else if (index === totalSentences - 1) {
      score += 0.2; // Last sentence boost
    }

    // Longer sentences often contain more information
    const length = sentence.length;
    if (length > 100) {
      score += 0.1;
    } else if (length < 20) {
      score -= 0.1; // Very short sentences are less likely to be important
    }

    // Look for important indicators
    const importantWords = [
      'important', 'significant', 'key', 'main', 'primary', 'essential',
      'critical', 'note', 'remember', 'conclusion', 'result', 'because',
      'therefore', 'however', 'but', 'although'
    ];

    const sentenceLower = sentence.toLowerCase();
    const importantWordCount = importantWords.filter(word => 
      sentenceLower.includes(word)
    ).length;

    score += importantWordCount * 0.1;

    // Boost sentences with numbers or specific data
    if (/\d+/.test(sentence)) {
      score += 0.05;
    }

    // Boost sentences with quoted text
    if (sentence.includes('"') || sentence.includes("'")) {
      score += 0.05;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Estimate token count without full calculation
   */
  estimateTokenCount(text: string, tokenCounter: TokenCounter): number {
    const avgCharsPerToken = tokenCounter.getModelConfig().avgCharsPerToken;
    return Math.ceil(text.length / avgCharsPerToken);
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<TokenOptimizerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): TokenOptimizerConfig {
    return { ...this.config };
  }
}