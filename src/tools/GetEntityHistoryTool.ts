/**
 * Get Entity History Tool
 * 
 * MCP tool to retrieve the complete history of an entity across all conversations,
 * including mentions, relationships, and evolution over time.
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import { ToolResult } from '../types/mcp.js';
import { KnowledgeGraphService } from '../knowledge-graph/KnowledgeGraphService.js';

/**
 * Schema for get entity history arguments
 */
export const GetEntityHistoryArgsSchema = z.object({
  entity_name: z.string()
    .min(1, 'Entity name must not be empty')
    .max(200, 'Entity name must not exceed 200 characters')
    .describe('Name of the entity to get history for'),
  
  include_relationships: z.boolean()
    .optional()
    .default(true)
    .describe('Whether to include entity relationships in the response'),
  
  include_evolution: z.boolean()
    .optional()
    .default(true)
    .describe('Whether to include entity evolution history'),
  
  max_mentions: z.number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .default(100)
    .describe('Maximum number of mentions to return'),
  
  time_range: z.object({
    start: z.number().int().positive().describe('Start timestamp (Unix milliseconds)'),
    end: z.number().int().positive().describe('End timestamp (Unix milliseconds)')
  }).optional().describe('Optional time range to filter mentions and relationships')
});

export type GetEntityHistoryArgs = z.infer<typeof GetEntityHistoryArgsSchema>;

/**
 * Get Entity History tool implementation
 */
export class GetEntityHistoryTool extends BaseTool<GetEntityHistoryArgs> {
  readonly name = 'get_entity_history';
  readonly description = 'Get complete history of an entity across all conversations including mentions, relationships, and evolution';
  readonly inputSchema = GetEntityHistoryArgsSchema;

  private knowledgeGraphService: KnowledgeGraphService;

  constructor(knowledgeGraphService: KnowledgeGraphService) {
    super();
    this.knowledgeGraphService = knowledgeGraphService;
  }

  /**
   * Handle the get entity history request
   */
  async handle(args: GetEntityHistoryArgs): Promise<ToolResult> {
    try {
      // Get entity history
      const history = await this.knowledgeGraphService.getEntityHistory(args.entity_name);
      
      if (!history) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Entity '${args.entity_name}' not found in knowledge graph`,
              suggestions: [
                'Check the spelling of the entity name',
                'Try searching for similar entities',
                'The entity might not have been mentioned in any processed conversations'
              ]
            }, null, 2)
          }],
          isError: false
        };
      }

      // Filter mentions by time range if specified
      let filteredMentions = history.mentions;
      if (args.time_range) {
        filteredMentions = history.mentions.filter(mention => 
          mention.createdAt >= args.time_range!.start && 
          mention.createdAt <= args.time_range!.end
        );
      }

      // Limit mentions
      filteredMentions = filteredMentions
        .sort((a, b) => b.createdAt - a.createdAt) // Most recent first
        .slice(0, args.max_mentions);

      // Filter relationships by time range if specified
      let filteredRelationships = history.relationships;
      if (args.time_range) {
        filteredRelationships = history.relationships.filter(rel => 
          rel.firstMentioned >= args.time_range!.start && 
          rel.firstMentioned <= args.time_range!.end
        );
      }

      // Prepare response
      const response = {
        success: true,
        entity: {
          id: history.entity.id,
          name: history.entity.name,
          type: history.entity.type,
          confidence_score: history.entity.confidence_score,
          mention_count: history.entity.mention_count,
          created_at: history.entity.created_at,
          updated_at: history.entity.updated_at,
          last_mentioned_at: history.entity.last_mentioned_at,
          metadata: history.entity.metadata
        },
        mentions: {
          total_count: history.mentions.length,
          filtered_count: filteredMentions.length,
          items: filteredMentions.map(mention => ({
            message_id: mention.messageId,
            conversation_id: mention.conversationId,
            conversation_title: mention.conversationTitle,
            mention_text: mention.mentionText,
            context: mention.content.length > 200 
              ? mention.content.substring(0, 200) + '...'
              : mention.content,
            created_at: mention.createdAt,
            confidence: mention.confidence,
            created_at_formatted: new Date(mention.createdAt).toISOString()
          }))
        },
        relationships: args.include_relationships ? {
          total_count: history.relationships.length,
          filtered_count: filteredRelationships.length,
          items: filteredRelationships
            .sort((a, b) => b.strength - a.strength) // Strongest relationships first
            .map(rel => ({
              related_entity: {
                id: rel.relatedEntity.id,
                name: rel.relatedEntity.name
              },
              relationship_type: rel.relationshipType,
              strength: rel.strength,
              first_mentioned: rel.firstMentioned,
              last_mentioned: rel.lastMentioned,
              first_mentioned_formatted: new Date(rel.firstMentioned).toISOString(),
              last_mentioned_formatted: new Date(rel.lastMentioned).toISOString()
            }))
        } : undefined,
        evolution: args.include_evolution ? {
          total_count: history.evolution.length,
          items: history.evolution.map(evo => ({
            evolution_type: evo.evolutionType,
            previous_value: evo.previousValue,
            new_value: evo.newValue,
            conversation_id: evo.conversationId,
            created_at: evo.createdAt,
            created_at_formatted: new Date(evo.createdAt).toISOString()
          }))
        } : undefined,
        analysis: {
          conversation_span: filteredMentions.length > 0 ? {
            earliest_mention: Math.min(...filteredMentions.map(m => m.createdAt)),
            latest_mention: Math.max(...filteredMentions.map(m => m.createdAt)),
            conversation_count: new Set(filteredMentions.map(m => m.conversationId)).size,
            average_confidence: filteredMentions.reduce((sum, m) => sum + m.confidence, 0) / filteredMentions.length
          } : null,
          relationship_summary: args.include_relationships ? {
            total_relationships: filteredRelationships.length,
            relationship_types: Array.from(new Set(filteredRelationships.map(r => r.relationshipType))),
            strongest_relationship: filteredRelationships.length > 0 
              ? filteredRelationships.reduce((strongest, current) => 
                  current.strength > strongest.strength ? current : strongest
                )
              : null
          } : null
        },
        query_info: {
          entity_name: args.entity_name,
          time_range_applied: !!args.time_range,
          mentions_limit_applied: filteredMentions.length === args.max_mentions,
          generated_at: new Date().toISOString()
        }
      };

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }],
        isError: false
      };

    } catch (error) {
      console.error('Error in GetEntityHistoryTool:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Failed to retrieve entity history',
            details: error instanceof Error ? error.message : 'Unknown error',
            entity_name: args.entity_name
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Get tool information for MCP registration
   */
  getToolInfo() {
    return {
      name: this.name,
      description: this.description,
      inputSchema: {
        type: 'object',
        properties: {
          entity_name: {
            type: 'string',
            description: 'Name of the entity to get history for',
            minLength: 1,
            maxLength: 200
          },
          include_relationships: {
            type: 'boolean',
            description: 'Whether to include entity relationships in the response',
            default: true
          },
          include_evolution: {
            type: 'boolean',
            description: 'Whether to include entity evolution history',
            default: true
          },
          max_mentions: {
            type: 'integer',
            description: 'Maximum number of mentions to return',
            minimum: 1,
            maximum: 500,
            default: 100
          },
          time_range: {
            type: 'object',
            description: 'Optional time range to filter mentions and relationships',
            properties: {
              start: {
                type: 'integer',
                description: 'Start timestamp (Unix milliseconds)',
                minimum: 1
              },
              end: {
                type: 'integer', 
                description: 'End timestamp (Unix milliseconds)',
                minimum: 1
              }
            },
            required: ['start', 'end']
          }
        },
        required: ['entity_name']
      }
    };
  }
}