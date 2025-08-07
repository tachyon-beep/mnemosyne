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
import { createTokenCounter } from './TokenCounter.js';
import { RelevanceScorer } from './scoring/RelevanceScorer.js';
import { TokenOptimizer } from './optimization/TokenOptimizer.js';
import { TemporalStrategy } from './strategies/TemporalStrategy.js';
import { TopicalStrategy } from './strategies/TopicalStrategy.js';
import { EntityCentricStrategy } from './strategies/EntityCentricStrategy.js';
import { HybridStrategy } from './strategies/HybridStrategy.js';
/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
    defaultMaxTokens: 4000,
    defaultStrategy: 'hybrid',
    defaultMinRelevance: 0.3,
    tokenAllocation: {
        query: 0.05, // 5% for query context
        summaries: 0.30, // 30% for summaries
        messages: 0.50, // 50% for message details
        metadata: 0.10, // 10% for metadata
        buffer: 0.05 // 5% buffer
    },
    performance: {
        maxProcessingTimeMs: 5000, // 5 second timeout
        maxItemsToEvaluate: 1000 // Limit evaluation for performance
    }
};
/**
 * Context Assembler - Main service for intelligent context assembly
 */
export class ContextAssembler {
    config;
    embeddingManager;
    messageRepository;
    summaryRepository;
    relevanceScorer;
    tokenOptimizer;
    strategies;
    constructor(embeddingManager, messageRepository, summaryRepository, config) {
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
    async assembleContext(request) {
        const startTime = Date.now();
        try {
            // Validate and normalize parameters
            const normalizedRequest = this.normalizeRequest(request);
            // Create token counter for the specified model
            const tokenCounter = createTokenCounter(normalizedRequest.model || 'default');
            // Calculate token budget
            const tokenBudget = this.calculateTokenBudget(normalizedRequest, tokenCounter);
            // Get assembly strategy
            const strategy = this.strategies.get(normalizedRequest.strategy);
            // Collect and score candidate items
            const candidates = await this.collectCandidates(normalizedRequest);
            const scoredItems = await this.scoreItems(candidates, normalizedRequest);
            // Apply strategy-specific selection and ordering
            const selectedItems = await strategy.selectItems(scoredItems, normalizedRequest, tokenBudget);
            // Optimize token usage and assemble final context
            const optimizedItems = this.tokenOptimizer.optimizeSelection(selectedItems, tokenBudget, tokenCounter);
            // Build the final context text
            const contextText = await this.buildContextText(optimizedItems, normalizedRequest, tokenCounter);
            // Calculate metrics
            const processingTime = Date.now() - startTime;
            const metrics = this.calculateMetrics(candidates, optimizedItems, processingTime, tokenBudget.total);
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
                strategy: normalizedRequest.strategy,
                metrics
            };
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            console.error('Context assembly failed:', error);
            // Return minimal fallback context
            return this.createFallbackContext(request, processingTime);
        }
    }
    /**
     * Normalize and validate request parameters
     */
    normalizeRequest(request) {
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
    calculateTokenBudget(request, tokenCounter) {
        const maxTokens = request.maxTokens;
        const allocation = this.config.tokenAllocation;
        // Calculate query tokens
        const queryTokens = Math.min(Math.ceil(maxTokens * allocation.query), tokenCounter.countText(request.query).count + 50 // Query + some context
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
    async collectCandidates(request) {
        const candidates = [];
        // Collect summaries
        const summaryResult = await this.summaryRepository.findRecent(Math.min(100, this.config.performance.maxItemsToEvaluate / 2), 0.5 // Minimum quality score
        );
        for (const summary of summaryResult) {
            if (!request.conversationId || summary.conversationId === request.conversationId) {
                candidates.push({ type: 'summary', item: summary });
            }
        }
        // Collect messages
        const messageLimit = Math.min(200, this.config.performance.maxItemsToEvaluate - candidates.length);
        let messageResult;
        if (request.conversationId) {
            messageResult = await this.messageRepository.findByConversation(request.conversationId, messageLimit, 0, 'created_at', 'DESC');
        }
        else {
            // Find recent messages across all conversations
            messageResult = await this.messageRepository.findWithEmbeddings(undefined, messageLimit, 0);
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
    async scoreItems(candidates, request) {
        const scoredItems = [];
        for (const candidate of candidates) {
            const item = candidate.item;
            const content = candidate.type === 'summary'
                ? item.summaryText
                : item.content;
            // Score the item
            const relevanceScore = await this.relevanceScorer.scoreItem({
                id: item.id,
                type: candidate.type,
                content,
                createdAt: candidate.type === 'summary'
                    ? item.generatedAt
                    : item.createdAt,
                conversationId: candidate.type === 'summary'
                    ? item.conversationId
                    : item.conversationId,
                metadata: candidate.type === 'summary'
                    ? item.metadata
                    : item.metadata
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
                    ? item.generatedAt
                    : item.createdAt,
                conversationId: candidate.type === 'summary'
                    ? item.conversationId
                    : item.conversationId,
                metadata: candidate.type === 'summary'
                    ? item.metadata
                    : item.metadata,
                originalItem: item
            });
        }
        return scoredItems;
    }
    /**
     * Build the final context text from selected items
     */
    async buildContextText(items, request, _tokenCounter) {
        const sections = [];
        // Add query context
        sections.push(`Query: ${request.query}\n`);
        // Group items by type
        const summaries = items.filter(item => item.type === 'summary');
        const messages = items.filter(item => item.type === 'message');
        // Add conversation summaries
        if (summaries.length > 0) {
            sections.push('## Conversation Summaries\n');
            for (const summary of summaries) {
                const summaryObj = summary.originalItem;
                sections.push(`### ${summaryObj.level} Summary (${summaryObj.messageCount} messages)\n` +
                    `${summary.content}\n`);
            }
        }
        // Add detailed messages
        if (messages.length > 0) {
            sections.push('## Detailed Messages\n');
            // Group messages by conversation
            const messagesByConversation = new Map();
            for (const message of messages) {
                const convId = message.conversationId;
                if (!messagesByConversation.has(convId)) {
                    messagesByConversation.set(convId, []);
                }
                messagesByConversation.get(convId).push(message);
            }
            for (const [conversationId, convMessages] of messagesByConversation) {
                if (messagesByConversation.size > 1) {
                    sections.push(`### Conversation ${conversationId.slice(0, 8)}\n`);
                }
                // Sort messages by timestamp
                convMessages.sort((a, b) => a.createdAt - b.createdAt);
                for (const message of convMessages) {
                    const messageObj = message.originalItem;
                    const timestamp = new Date(messageObj.createdAt).toISOString();
                    sections.push(`**${messageObj.role}** (${timestamp}):\n${message.content}\n`);
                }
            }
        }
        return sections.join('\n');
    }
    /**
     * Calculate performance metrics
     */
    calculateMetrics(totalCandidates, includedItems, processingTime, maxTokens) {
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
    createFallbackContext(request, processingTime) {
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
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get available strategies
     */
    getAvailableStrategies() {
        return Array.from(this.strategies.keys());
    }
    /**
     * Get embedding manager instance
     */
    getEmbeddingManager() {
        return this.embeddingManager;
    }
}
//# sourceMappingURL=ContextAssembler.js.map