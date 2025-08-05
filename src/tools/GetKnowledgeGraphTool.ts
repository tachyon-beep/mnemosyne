/**
 * Get Knowledge Graph Tool
 * 
 * MCP tool to explore the knowledge graph around a specific entity,
 * finding connected entities and their relationships within N degrees.
 */

import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import { ToolResult } from '../types/mcp.js';
import { KnowledgeGraphService } from '../knowledge-graph/KnowledgeGraphService.js';

/**
 * Schema for get knowledge graph arguments
 */
export const GetKnowledgeGraphArgsSchema = z.object({
  center_entity: z.string()
    .min(1, 'Center entity name must not be empty')
    .max(200, 'Center entity name must not exceed 200 characters')
    .describe('Name of the entity to center the knowledge graph around'),
  
  max_degrees: z.number()
    .int()
    .min(1)
    .max(4)
    .optional()
    .default(2)
    .describe('Maximum degrees of separation to explore (1-4)'),
  
  min_strength: z.number()
    .min(0.0)
    .max(1.0)
    .optional()
    .default(0.3)
    .describe('Minimum relationship strength threshold (0.0 to 1.0)'),
  
  entity_types: z.array(z.enum([
    'person', 'organization', 'product', 'concept', 
    'location', 'technical', 'event', 'decision'
  ]))
    .optional()
    .describe('Filter connected entities by specific types'),
  
  relationship_types: z.array(z.enum([
    'works_for', 'created_by', 'discussed_with', 'related_to',
    'part_of', 'mentioned_with', 'temporal_sequence', 'cause_effect'
  ]))
    .optional()
    .describe('Filter relationships by specific types'),
  
  include_clusters: z.boolean()
    .optional()
    .default(false)
    .describe('Whether to include entity cluster analysis'),
  
  include_paths: z.boolean()
    .optional()
    .default(true)
    .describe('Whether to include shortest paths to connected entities'),
  
  max_entities: z.number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .default(50)
    .describe('Maximum number of connected entities to return')
});

export type GetKnowledgeGraphArgs = z.infer<typeof GetKnowledgeGraphArgsSchema>;

/**
 * Get Knowledge Graph tool implementation
 */
export class GetKnowledgeGraphTool extends BaseTool<GetKnowledgeGraphArgs> {
  readonly name = 'get_knowledge_graph';
  readonly description = 'Explore the knowledge graph around a specific entity, finding connected entities and relationships';
  readonly inputSchema = GetKnowledgeGraphArgsSchema;

  private knowledgeGraphService: KnowledgeGraphService;

  constructor(knowledgeGraphService: KnowledgeGraphService) {
    super();
    this.knowledgeGraphService = knowledgeGraphService;
  }

  /**
   * Handle the get knowledge graph request
   */
  async handle(args: GetKnowledgeGraphArgs): Promise<ToolResult> {
    try {
      // Get the center entity history to verify it exists
      const centerEntityHistory = await this.knowledgeGraphService.getEntityHistory(args.center_entity);
      
      if (!centerEntityHistory) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: `Center entity '${args.center_entity}' not found in knowledge graph`,
              suggestions: [
                'Check the spelling of the entity name',
                'Try searching for the entity first',
                'The entity might not have been mentioned in any processed conversations'
              ]
            }, null, 2)
          }],
          isError: false
        };
      }

      // Search the knowledge graph around this entity
      const searchResults = await this.knowledgeGraphService.searchKnowledgeGraph(
        args.center_entity,
        {
          includeEntities: true,
          includeRelationships: true,
          maxDegrees: args.max_degrees,
          minStrength: args.min_strength,
          limit: args.max_entities
        }
      );

      // Filter by entity types if specified
      let connectedEntities = searchResults.connectedEntities;
      if (args.entity_types && args.entity_types.length > 0) {
        connectedEntities = connectedEntities.filter(entity => 
          args.entity_types!.includes(entity.entity_type)
        );
      }

      // Filter by relationship types if specified
      if (args.relationship_types && args.relationship_types.length > 0) {
        connectedEntities = connectedEntities.filter(entity => 
          args.relationship_types!.includes(entity.relationship_type)
        );
      }

      // Limit results
      connectedEntities = connectedEntities.slice(0, args.max_entities);

      // Group entities by degree
      const entitiesByDegree: Record<number, typeof connectedEntities> = {};
      for (const entity of connectedEntities) {
        if (!entitiesByDegree[entity.degree]) {
          entitiesByDegree[entity.degree] = [];
        }
        entitiesByDegree[entity.degree].push(entity);
      }

      // Get entity clusters if requested
      let clusters: any[] = [];
      if (args.include_clusters) {
        try {
          clusters = await this.knowledgeGraphService.getCrossConversationAnalysis()
            .then(analysis => analysis.entityClusters)
            .catch(() => []); // Fail gracefully if clustering isn't available
        } catch {
          // Clustering feature might not be fully implemented
        }
      }

      // Generate paths if requested
      const pathAnalysis = args.include_paths ? this.analyzeEntityPaths(connectedEntities) : null;

      // Prepare response
      const response = {
        success: true,
        center_entity: {
          id: centerEntityHistory.entity.id,
          name: centerEntityHistory.entity.name,
          type: centerEntityHistory.entity.type,
          confidence_score: centerEntityHistory.entity.confidence_score,
          mention_count: centerEntityHistory.entity.mention_count,
          relationship_count: centerEntityHistory.relationships.length
        },
        graph: {
          total_connected_entities: connectedEntities.length,
          max_degrees_explored: args.max_degrees,
          min_strength_applied: args.min_strength,
          entities_by_degree: Object.keys(entitiesByDegree).map(degree => ({
            degree: parseInt(degree),
            count: entitiesByDegree[parseInt(degree)].length,
            entities: entitiesByDegree[parseInt(degree)].map(entity => ({
              id: entity.entity_id,
              name: entity.entity_name,
              type: entity.entity_type,
              relationship_type: entity.relationship_type,
              strength: entity.strength,
              path: entity.path
            }))
          })).sort((a, b) => a.degree - b.degree),
          relationship_summary: this.summarizeRelationships(connectedEntities),
          entity_type_distribution: this.analyzeEntityTypes(connectedEntities)
        },
        clusters: args.include_clusters ? {
          total_clusters: clusters.length,
          relevant_clusters: clusters.filter(cluster => 
            cluster.cluster_members.some((member: any) => 
              member.name.toLowerCase().includes(args.center_entity.toLowerCase())
            )
          ).map(cluster => ({
            center_entity: cluster.entity_name,
            center_type: cluster.entity_type,
            connection_count: cluster.connection_count,
            avg_strength: cluster.avg_strength,
            members: cluster.cluster_members
          }))
        } : undefined,
        path_analysis: pathAnalysis,
        insights: this.generateInsights(centerEntityHistory.entity, connectedEntities),
        query_info: {
          center_entity: args.center_entity,
          max_degrees: args.max_degrees,
          min_strength: args.min_strength,
          filters_applied: {
            entity_types: args.entity_types,
            relationship_types: args.relationship_types
          },
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
      console.error('Error in GetKnowledgeGraphTool:', error);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: 'Failed to retrieve knowledge graph',
            details: error instanceof Error ? error.message : 'Unknown error',
            center_entity: args.center_entity
          }, null, 2)
        }],
        isError: true
      };
    }
  }

  /**
   * Summarize relationship types and strengths
   */
  private summarizeRelationships(entities: any[]): {
    total_relationships: number;
    relationship_types: Record<string, number>;
    strength_distribution: {
      strong: number; // > 0.7
      medium: number; // 0.4 - 0.7
      weak: number; // < 0.4
    };
    average_strength: number;
  } {
    const relationshipTypes: Record<string, number> = {};
    let strongCount = 0;
    let mediumCount = 0;
    let weakCount = 0;
    let totalStrength = 0;

    for (const entity of entities) {
      relationshipTypes[entity.relationship_type] = (relationshipTypes[entity.relationship_type] || 0) + 1;
      
      if (entity.strength > 0.7) strongCount++;
      else if (entity.strength >= 0.4) mediumCount++;
      else weakCount++;
      
      totalStrength += entity.strength;
    }

    return {
      total_relationships: entities.length,
      relationship_types: relationshipTypes,
      strength_distribution: {
        strong: strongCount,
        medium: mediumCount,
        weak: weakCount
      },
      average_strength: entities.length > 0 ? totalStrength / entities.length : 0
    };
  }

  /**
   * Analyze entity type distribution
   */
  private analyzeEntityTypes(entities: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const entity of entities) {
      distribution[entity.entity_type] = (distribution[entity.entity_type] || 0) + 1;
    }
    
    return distribution;
  }

  /**
   * Analyze entity paths for interesting patterns
   */
  private analyzeEntityPaths(entities: any[]): {
    shortest_paths: Array<{
      target_entity: string;
      path_length: number;
      path: string[];
      strength: number;
    }>;
    longest_paths: Array<{
      target_entity: string;
      path_length: number;
      path: string[];
      strength: number;
    }>;
    path_statistics: {
      average_path_length: number;
      max_path_length: number;
      min_path_length: number;
    };
  } {
    const pathData = entities.map(entity => ({
      target_entity: entity.entity_name,
      path_length: entity.path.length,
      path: entity.path,
      strength: entity.strength
    }));

    const sortedByLength = [...pathData].sort((a, b) => a.path_length - b.path_length);
    
    return {
      shortest_paths: sortedByLength.slice(0, 5),
      longest_paths: sortedByLength.slice(-5).reverse(),
      path_statistics: {
        average_path_length: pathData.reduce((sum, p) => sum + p.path_length, 0) / pathData.length,
        max_path_length: Math.max(...pathData.map(p => p.path_length)),
        min_path_length: Math.min(...pathData.map(p => p.path_length))
      }
    };
  }

  /**
   * Generate insights about the knowledge graph structure
   */
  private generateInsights(centerEntity: any, connectedEntities: any[]): string[] {
    const insights: string[] = [];

    // Connection density insight
    if (connectedEntities.length > 20) {
      insights.push(`${centerEntity.name} is highly connected with ${connectedEntities.length} related entities, suggesting it's a central concept in your conversations.`);
    } else if (connectedEntities.length > 5) {
      insights.push(`${centerEntity.name} has moderate connectivity with ${connectedEntities.length} related entities.`);
    } else if (connectedEntities.length > 0) {
      insights.push(`${centerEntity.name} has limited connections with only ${connectedEntities.length} related entities.`);
    } else {
      insights.push(`${centerEntity.name} appears to be isolated with no strong relationships to other entities.`);
    }

    // Relationship strength insight
    const strongRelationships = connectedEntities.filter(e => e.strength > 0.7).length;
    const weakRelationships = connectedEntities.filter(e => e.strength < 0.4).length;
    
    if (strongRelationships > weakRelationships) {
      insights.push('Most relationships are strong, indicating clear and frequent associations.');
    } else if (weakRelationships > strongRelationships) {
      insights.push('Many relationships are weak, suggesting indirect or infrequent associations.');
    }

    // Entity type diversity
    const entityTypes = new Set(connectedEntities.map(e => e.entity_type));
    if (entityTypes.size > 4) {
      insights.push(`${centerEntity.name} spans multiple domains with connections across ${entityTypes.size} different entity types.`);
    }

    // Relationship type patterns
    const relationshipTypes = connectedEntities.reduce((acc, e) => {
      acc[e.relationship_type] = (acc[e.relationship_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostCommonRelType = Object.entries(relationshipTypes)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommonRelType) {
      insights.push(`Most common relationship type is '${mostCommonRelType[0]}' (${mostCommonRelType[1]} occurrences).`);
    }

    return insights;
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
          center_entity: {
            type: 'string',
            description: 'Name of the entity to center the knowledge graph around',
            minLength: 1,
            maxLength: 200
          },
          max_degrees: {
            type: 'integer',
            description: 'Maximum degrees of separation to explore (1-4)',
            minimum: 1,
            maximum: 4,
            default: 2
          },
          min_strength: {
            type: 'number',
            description: 'Minimum relationship strength threshold (0.0 to 1.0)',
            minimum: 0.0,
            maximum: 1.0,
            default: 0.3
          },
          entity_types: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'person', 'organization', 'product', 'concept',
                'location', 'technical', 'event', 'decision'
              ]
            },
            description: 'Filter connected entities by specific types'
          },
          relationship_types: {
            type: 'array',
            items: {
              type: 'string',
              enum: [
                'works_for', 'created_by', 'discussed_with', 'related_to',
                'part_of', 'mentioned_with', 'temporal_sequence', 'cause_effect'
              ]
            },
            description: 'Filter relationships by specific types'
          },
          include_clusters: {
            type: 'boolean',
            description: 'Whether to include entity cluster analysis',
            default: false
          },
          include_paths: {
            type: 'boolean',
            description: 'Whether to include shortest paths to connected entities',
            default: true
          },
          max_entities: {
            type: 'integer',
            description: 'Maximum number of connected entities to return',
            minimum: 1,
            maximum: 200,
            default: 50
          }
        },
        required: ['center_entity']
      }
    };
  }
}