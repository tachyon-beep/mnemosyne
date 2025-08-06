/**
 * Suggest Relevant Context Tool Implementation
 * 
 * This tool provides past conversations and insights relevant to current discussion
 * using the Context Change Detector and Knowledge Synthesizer services.
 */

import { z } from 'zod';
import { BaseTool, ToolContext, wrapDatabaseOperation } from '../BaseTool.js';
import { MCPTool, MCPToolResult } from '../../types/mcp.js';
import { ContextChangeDetector, RelevantHistory, ContextWindow } from '../../services/proactive/intelligence/ContextChangeDetector.js';
import { KnowledgeSynthesizer, ContextSuggestion, ExpertRecommendation } from '../../services/proactive/synthesis/KnowledgeSynthesizer.js';
import { DatabaseManager } from '../../storage/Database.js';
import { EntityRepository } from '../../storage/repositories/EntityRepository.js';
import { KnowledgeGraphRepository } from '../../storage/repositories/KnowledgeGraphRepository.js';
import { Message, Conversation } from '../../types/interfaces.js';

/**
 * Tool definition for suggest_relevant_context
 */
export const SuggestRelevantContextToolDef: MCPTool = {
  name: 'suggest_relevant_context',
  description: 'Provides past conversations and insights relevant to current discussion by analyzing entity relationships and conversation patterns.',
  inputSchema: {
    type: 'object',
    properties: {
      currentConversationId: {
        type: 'string',
        description: 'ID of the current conversation to find relevant context for'
      },
      currentEntities: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of entity names or IDs currently being discussed'
      },
      contextTypes: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['related_conversation', 'expert_insight', 'similar_context', 'temporal_connection', 'relationship_network', 'follow_up_needed', 'missing_information', 'contradiction_alert']
        },
        description: 'Types of context suggestions to include',
        default: ['related_conversation', 'expert_insight', 'similar_context', 'contradiction_alert']
      },
      maxHistoryAge: {
        type: 'number',
        minimum: 1,
        maximum: 365,
        default: 90,
        description: 'Maximum age in days of historical context to consider'
      },
      minRelevanceScore: {
        type: 'number',
        minimum: 0,
        maximum: 1,
        default: 0.4,
        description: 'Minimum relevance threshold for suggestions'
      },
      maxTokens: {
        type: 'number',
        minimum: 100,
        maximum: 16000,
        default: 4000,
        description: 'Maximum token budget for context window optimization'
      },
      includeExperts: {
        type: 'boolean',
        default: true,
        description: 'Whether to include expert recommendations'
      },
      includeMessages: {
        type: 'boolean',
        default: true,
        description: 'Whether to include relevant message excerpts in suggestions'
      },
      limit: {
        type: 'number',
        minimum: 1,
        maximum: 50,
        default: 10,
        description: 'Maximum number of context suggestions to return'
      }
    },
    required: [],
    additionalProperties: false
  }
};

/**
 * Input validation schema
 */
export const SuggestRelevantContextSchema = z.object({
  currentConversationId: z.string().optional(),
  currentEntities: z.array(z.string()).optional(),
  contextTypes: z.array(z.enum([
    'related_conversation', 
    'expert_insight', 
    'similar_context', 
    'temporal_connection', 
    'relationship_network', 
    'follow_up_needed', 
    'missing_information', 
    'contradiction_alert'
  ])).default(['related_conversation', 'expert_insight', 'similar_context', 'contradiction_alert']),
  maxHistoryAge: z.number().min(1).max(365).default(90),
  minRelevanceScore: z.number().min(0).max(1).default(0.4),
  maxTokens: z.number().min(100).max(16000).default(4000),
  includeExperts: z.boolean().default(true),
  includeMessages: z.boolean().default(true),
  limit: z.number().min(1).max(50).default(10)
});

export type SuggestRelevantContextInput = z.infer<typeof SuggestRelevantContextSchema>;

/**
 * Response interface
 */
export interface SuggestRelevantContextResponse {
  suggestions: ContextSuggestion[];
  contextWindow?: ContextWindow;
  expertRecommendations?: ExpertRecommendation[];
  summary: {
    totalSuggestions: number;
    suggestionTypeBreakdown: Record<string, number>;
    relevanceScoreRange: {
      min: number;
      max: number;
      average: number;
    };
    analysisScope: {
      currentConversationId?: string;
      entityCount: number;
      maxHistoryAge: number;
      minRelevanceScore: number;
    };
    contextOptimization?: {
      estimatedTokens: number;
      contextRelevance: number;
      freshness: number;
    };
  };
  analysisTimestamp: number;
}

/**
 * Dependencies required by SuggestRelevantContextTool
 */
export interface SuggestRelevantContextDependencies {
  databaseManager: DatabaseManager;
  entityRepository: EntityRepository;
  knowledgeGraphRepository: KnowledgeGraphRepository;
}

/**
 * Implementation of the suggest_relevant_context MCP tool
 */
export class SuggestRelevantContextTool extends BaseTool<SuggestRelevantContextInput, SuggestRelevantContextResponse> {
  private readonly contextDetector: ContextChangeDetector;
  private readonly knowledgeSynthesizer: KnowledgeSynthesizer;

  constructor(dependencies: SuggestRelevantContextDependencies) {
    super(SuggestRelevantContextToolDef, SuggestRelevantContextSchema);
    
    this.contextDetector = new ContextChangeDetector(
      dependencies.databaseManager,
      dependencies.entityRepository,
      dependencies.knowledgeGraphRepository,
      {
        maxHistoryAgeDays: 90, // Will be overridden by input
        minRelevanceScore: 0.4,
        maxContextTokens: 4000
      }
    );
    
    this.knowledgeSynthesizer = new KnowledgeSynthesizer(dependencies.databaseManager);
  }

  /**
   * Execute the suggest_relevant_context tool
   */
  protected async executeImpl(
    input: SuggestRelevantContextInput, 
    context: ToolContext
  ): Promise<SuggestRelevantContextResponse> {
    
    // Get entity IDs from entity names if needed
    const entityIds = await this.resolveEntityIds(input.currentEntities || []);
    
    // Generate context suggestions using Knowledge Synthesizer
    const suggestions = await wrapDatabaseOperation(
      async () => await this.knowledgeSynthesizer.suggestRelevantContext(
        entityIds,
        input.currentConversationId || '',
        input.limit
      ),
      'Failed to generate context suggestions'
    );

    // Filter suggestions by requested types and relevance
    const filteredSuggestions = suggestions
      .filter(suggestion => 
        input.contextTypes.includes(suggestion.type) &&
        suggestion.relevanceScore >= input.minRelevanceScore
      )
      .slice(0, input.limit);

    // Get context window optimization if current conversation is provided
    let contextWindow: ContextWindow | undefined;
    if (input.currentConversationId) {
      contextWindow = await wrapDatabaseOperation(
        async () => await this.contextDetector.analyzeContextWindow(
          input.currentConversationId!,
          {
            maxTokens: input.maxTokens,
            includeHistory: true
          }
        ),
        'Failed to analyze context window'
      );
    }

    // Get expert recommendations if requested
    let expertRecommendations: ExpertRecommendation[] | undefined;
    if (input.includeExperts && entityIds.length > 0) {
      expertRecommendations = await wrapDatabaseOperation(
        async () => await this.knowledgeSynthesizer.recommendExperts(
          entityIds,
          undefined, // topic - could be inferred from context
          Math.min(5, Math.ceil(input.limit / 2)) // Limit expert recommendations
        ),
        'Failed to get expert recommendations'
      );
    }

    // Remove message content if not requested
    if (!input.includeMessages) {
      filteredSuggestions.forEach(suggestion => {
        suggestion.messages = [];
      });
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(
      filteredSuggestions,
      contextWindow,
      input,
      entityIds.length
    );

    return {
      suggestions: filteredSuggestions,
      contextWindow,
      expertRecommendations,
      summary,
      analysisTimestamp: Date.now()
    };
  }

  /**
   * Resolve entity names to IDs
   */
  private async resolveEntityIds(entityNames: string[]): Promise<string[]> {
    if (entityNames.length === 0) return [];

    const entityIds: string[] = [];
    
    for (const entityName of entityNames) {
      // Check if it's already an ID (UUID format)
      if (this.isUUID(entityName)) {
        entityIds.push(entityName);
      } else {
        // Search for entity by name
        try {
          const searchResult = await this.knowledgeSynthesizer['entityRepository'].search({
            query: entityName,
            limit: 1
          });
          
          if (searchResult.entities.length > 0) {
            entityIds.push(searchResult.entities[0].id);
          }
        } catch (error) {
          console.warn(`Failed to resolve entity name '${entityName}' to ID:`, error);
        }
      }
    }

    return entityIds;
  }

  /**
   * Check if string is a UUID
   */
  private isUUID(str: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(
    suggestions: ContextSuggestion[],
    contextWindow: ContextWindow | undefined,
    input: SuggestRelevantContextInput,
    entityCount: number
  ) {
    const suggestionTypeBreakdown: Record<string, number> = {};
    let totalRelevance = 0;
    let minRelevance = 1;
    let maxRelevance = 0;

    for (const suggestion of suggestions) {
      suggestionTypeBreakdown[suggestion.type] = 
        (suggestionTypeBreakdown[suggestion.type] || 0) + 1;
      
      totalRelevance += suggestion.relevanceScore;
      minRelevance = Math.min(minRelevance, suggestion.relevanceScore);
      maxRelevance = Math.max(maxRelevance, suggestion.relevanceScore);
    }

    const averageRelevance = suggestions.length > 0 ? totalRelevance / suggestions.length : 0;

    return {
      totalSuggestions: suggestions.length,
      suggestionTypeBreakdown,
      relevanceScoreRange: {
        min: suggestions.length > 0 ? minRelevance : 0,
        max: maxRelevance,
        average: averageRelevance
      },
      analysisScope: {
        currentConversationId: input.currentConversationId,
        entityCount,
        maxHistoryAge: input.maxHistoryAge,
        minRelevanceScore: input.minRelevanceScore
      },
      contextOptimization: contextWindow ? {
        estimatedTokens: contextWindow.estimatedTokens,
        contextRelevance: contextWindow.contextRelevance,
        freshness: contextWindow.freshness
      } : undefined
    };
  }

  /**
   * Static factory method to create a SuggestRelevantContextTool instance
   */
  static create(dependencies: SuggestRelevantContextDependencies): SuggestRelevantContextTool {
    return new SuggestRelevantContextTool(dependencies);
  }
}