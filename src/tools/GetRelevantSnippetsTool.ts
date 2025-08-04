/**
 * Get Relevant Snippets Tool
 * 
 * MCP tool for retrieving context-aware snippets based on queries using intelligent
 * context assembly. This tool provides the core context retrieval functionality for Phase 2.
 */

import { BaseTool, ToolContext, wrapDatabaseOperation } from './BaseTool.js';
import { MCPTool } from '../types/mcp.js';
import { GetRelevantSnippetsSchema, GetRelevantSnippetsInput } from '../types/schemas.js';
import { ContextAssembler, ContextAssemblyRequest, AssembledContext } from '../context/ContextAssembler.js';
import { EmbeddingManager } from '../search/EmbeddingManager.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { SummaryRepository } from '../storage/repositories/SummaryRepository.js';

/**
 * Dependencies required by GetRelevantSnippetsTool
 */
export interface GetRelevantSnippetsDependencies {
  contextAssembler: ContextAssembler;
  embeddingManager: EmbeddingManager;
  messageRepository: MessageRepository;
  summaryRepository: SummaryRepository;
}

/**
 * Response format for get_relevant_snippets tool
 */
export interface GetRelevantSnippetsResponse {
  /** The assembled context text */
  contextText: string;
  /** Total token count of the assembled context */
  tokenCount: number;
  /** Breakdown of token usage by category */
  tokenBreakdown: {
    query: number;
    summaries: number;
    messages: number;
    metadata: number;
    buffer: number;
  };
  /** Array of included snippets with metadata */
  snippets: Array<{
    /** Unique identifier of the snippet */
    id: string;
    /** Type of snippet (summary or message) */
    type: 'summary' | 'message';
    /** Relevance score (0-1) */
    relevanceScore: number;
    /** Token count of this snippet */
    tokenCount: number;
    /** Position in the assembled context */
    position: number;
    /** Source conversation ID */
    conversationId: string;
    /** Creation timestamp */
    createdAt: number;
    /** Preview of the content */
    preview: string;
  }>;
  /** Assembly strategy used */
  strategy: string;
  /** Total number of candidates evaluated */
  candidatesEvaluated: number;
  /** Average relevance score of included snippets */
  averageRelevance: number;
  /** Token efficiency (used tokens / max tokens) */
  tokenEfficiency: number;
  /** Processing time in milliseconds */
  processingTime: number;
}

/**
 * Get Relevant Snippets Tool implementation
 */
export class GetRelevantSnippetsTool extends BaseTool<GetRelevantSnippetsInput, GetRelevantSnippetsResponse> {
  private contextAssembler: ContextAssembler;
  // Note: These dependencies are stored for potential future enhancements but currently unused
  // as the ContextAssembler handles the heavy lifting
  // private _embeddingManager: EmbeddingManager;
  // private _messageRepository: MessageRepository;
  // private _summaryRepository: SummaryRepository;

  constructor(dependencies: GetRelevantSnippetsDependencies) {
    const tool: MCPTool = {
      name: 'get_relevant_snippets',
      description: 'Retrieve context-aware snippets based on queries using intelligent context assembly.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Query to find relevant snippets for',
            minLength: 1
          },
          maxTokens: {
            type: 'number',
            description: 'Maximum token budget for selected snippets',
            minimum: 50,
            maximum: 16000,
            default: 4000
          },
          strategy: {
            type: 'string',
            enum: ['temporal', 'topical', 'entity-centric', 'hybrid'],
            default: 'hybrid',
            description: 'Assembly strategy to use for context selection'
          },
          conversationIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Optional conversation IDs to limit search scope'
          },
          minRelevance: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            default: 0.3,
            description: 'Minimum relevance threshold (0-1)'
          },
          includeRecent: {
            type: 'boolean',
            default: true,
            description: 'Include recent messages regardless of relevance'
          },
          focusEntities: {
            type: 'array',
            items: { type: 'string' },
            description: 'Entity names to focus on'
          },
          timeWindow: {
            type: 'number',
            minimum: 0,
            description: 'Time window for context in milliseconds'
          },
          model: {
            type: 'string',
            default: 'gpt-3.5-turbo',
            description: 'Model name for token counting'
          }
        },
        required: ['query'],
        additionalProperties: false
      }
    };

    super(tool, GetRelevantSnippetsSchema);
    this.contextAssembler = dependencies.contextAssembler;
    // Store dependencies for potential future use
    // this._embeddingManager = dependencies.embeddingManager;
    // this._messageRepository = dependencies.messageRepository;
    // this._summaryRepository = dependencies.summaryRepository;
  }

  /**
   * Execute the tool implementation
   */
  protected async executeImpl(
    params: GetRelevantSnippetsInput, 
    _context: ToolContext
  ): Promise<GetRelevantSnippetsResponse> {
    return await wrapDatabaseOperation(async () => {
      const startTime = Date.now();

      // Build context assembly request
      const assemblyRequest: ContextAssemblyRequest = {
        query: params.query,
        maxTokens: params.maxTokens,
        strategy: params.strategy,
        conversationId: params.conversationIds?.[0], // Use first conversation as primary
        minRelevance: params.minRelevance,
        includeRecent: params.includeRecent,
        focusEntities: params.focusEntities || [],
        timeWindow: params.timeWindow,
        model: params.model
      };

      // If multiple conversation IDs provided, we need to handle them specially
      if (params.conversationIds && params.conversationIds.length > 1) {
        // For now, we'll assemble context for each conversation and merge
        // This could be optimized in the future
        const contexts: AssembledContext[] = [];
        
        for (const conversationId of params.conversationIds.slice(0, 5)) { // Limit to 5 conversations
          const contextRequest = { ...assemblyRequest, conversationId };
          try {
            const context = await this.contextAssembler.assembleContext(contextRequest);
            contexts.push(context);
          } catch (error) {
            console.warn(`Failed to assemble context for conversation ${conversationId}:`, error);
            // Continue with other conversations
          }
        }

        if (contexts.length === 0) {
          throw new Error('Failed to assemble context for any of the specified conversations');
        }

        // Merge contexts (simplified approach - could be enhanced)
        return this.mergeContexts(contexts, params, Date.now() - startTime);
      }

      // Single conversation or no conversation filter
      const assembledContext = await this.contextAssembler.assembleContext(assemblyRequest);
      
      return this.formatResponse(assembledContext, Date.now() - startTime);

    }, 'Failed to retrieve relevant snippets');
  }

  /**
   * Format the assembled context into tool response format
   */
  private formatResponse(
    context: AssembledContext, 
    processingTime: number
  ): GetRelevantSnippetsResponse {
    return {
      contextText: context.text,
      tokenCount: context.tokenCount,
      tokenBreakdown: context.tokenBreakdown,
      snippets: context.includedItems.map(item => ({
        id: item.id,
        type: item.type,
        relevanceScore: item.relevanceScore,
        tokenCount: item.tokenCount,
        position: item.position,
        conversationId: '', // Will be filled in enhanced versions
        createdAt: 0, // Will be filled in enhanced versions
        preview: this.generatePreview(context.text, item.position, 150)
      })),
      strategy: context.strategy,
      candidatesEvaluated: context.metrics.itemsEvaluated,
      averageRelevance: context.metrics.averageRelevance,
      tokenEfficiency: context.metrics.tokenEfficiency,
      processingTime: processingTime
    };
  }

  /**
   * Merge multiple contexts into a single response
   */
  private mergeContexts(
    contexts: AssembledContext[], 
    params: GetRelevantSnippetsInput,
    processingTime: number
  ): GetRelevantSnippetsResponse {
    // Sort contexts by average relevance (best first)
    contexts.sort((a, b) => b.metrics.averageRelevance - a.metrics.averageRelevance);

    let totalTokens = 0;
    const mergedSnippets: GetRelevantSnippetsResponse['snippets'] = [];
    const mergedText: string[] = [];
    let position = 0;

    // Merge contexts up to the token limit
    for (const context of contexts) {
      if (totalTokens + context.tokenCount <= params.maxTokens) {
        mergedText.push(context.text);
        
        // Add snippets from this context
        for (const item of context.includedItems) {
          mergedSnippets.push({
            id: item.id,
            type: item.type,
            relevanceScore: item.relevanceScore,
            tokenCount: item.tokenCount,
            position: position++,
            conversationId: '',
            createdAt: 0,
            preview: this.generatePreview(context.text, item.position, 150)
          });
        }
        
        totalTokens += context.tokenCount;
      }
    }

    // Calculate aggregate metrics
    const totalCandidates = contexts.reduce((sum, ctx) => sum + ctx.metrics.itemsEvaluated, 0);
    const totalRelevance = mergedSnippets.reduce((sum, snippet) => sum + snippet.relevanceScore, 0);
    const averageRelevance = mergedSnippets.length > 0 ? totalRelevance / mergedSnippets.length : 0;

    return {
      contextText: mergedText.join('\n\n---\n\n'),
      tokenCount: totalTokens,
      tokenBreakdown: {
        query: contexts[0]?.tokenBreakdown.query || 0,
        summaries: contexts.reduce((sum, ctx) => sum + ctx.tokenBreakdown.summaries, 0),
        messages: contexts.reduce((sum, ctx) => sum + ctx.tokenBreakdown.messages, 0),
        metadata: contexts.reduce((sum, ctx) => sum + ctx.tokenBreakdown.metadata, 0),
        buffer: contexts.reduce((sum, ctx) => sum + ctx.tokenBreakdown.buffer, 0)
      },
      snippets: mergedSnippets,
      strategy: contexts[0]?.strategy || 'hybrid',
      candidatesEvaluated: totalCandidates,
      averageRelevance,
      tokenEfficiency: totalTokens / params.maxTokens,
      processingTime
    };
  }

  /**
   * Generate a preview of content around a specific position
   */
  private generatePreview(text: string, position: number, maxLength: number): string {
    const lines = text.split('\n');
    if (position >= lines.length) {
      return text.substring(0, maxLength) + (text.length > maxLength ? '...' : '');
    }
    
    const line = lines[position];
    if (line.length <= maxLength) {
      return line;
    }
    
    return line.substring(0, maxLength - 3) + '...';
  }

  /**
   * Factory method to create the tool
   */
  static create(dependencies: GetRelevantSnippetsDependencies): GetRelevantSnippetsTool {
    return new GetRelevantSnippetsTool(dependencies);
  }
}