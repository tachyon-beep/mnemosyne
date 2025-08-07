/**
 * Auto Tag Conversation Tool Implementation
 *
 * This tool automatically generates tags, classifications, and urgency levels
 * for conversations using the Auto Tagging Service.
 */
import { z } from 'zod';
import { BaseTool, wrapDatabaseOperation, NotFoundError } from '../BaseTool.js';
import { AutoTaggingService } from '../../services/proactive/intelligence/AutoTaggingService.js';
/**
 * Tool definition for auto_tag_conversation
 */
export const AutoTagConversationToolDef = {
    name: 'auto_tag_conversation',
    description: 'Automatically generates tags, classifications, and urgency levels for conversations based on content analysis and entity patterns.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                description: 'ID of the conversation to analyze and tag'
            },
            analysisTypes: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['topic_tags', 'activity_classification', 'urgency_analysis', 'project_contexts']
                },
                description: 'Types of analysis to perform',
                default: ['topic_tags', 'activity_classification', 'urgency_analysis', 'project_contexts']
            },
            config: {
                type: 'object',
                properties: {
                    minEntityRelevance: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        default: 0.3,
                        description: 'Minimum relevance threshold for entity-based topic tags'
                    },
                    maxTopicTags: {
                        type: 'number',
                        minimum: 1,
                        maximum: 20,
                        default: 5,
                        description: 'Maximum number of topic tags to generate'
                    },
                    minProjectConfidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        default: 0.6,
                        description: 'Minimum confidence threshold for project context detection'
                    },
                    urgencyKeywords: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Additional custom keywords that indicate urgency'
                    }
                },
                additionalProperties: false,
                description: 'Optional configuration overrides for auto-tagging behavior'
            },
            updateConversation: {
                type: 'boolean',
                default: false,
                description: 'Whether to update the conversation metadata with generated tags'
            },
            returnAnalysis: {
                type: 'boolean',
                default: true,
                description: 'Whether to return detailed analysis results'
            }
        },
        required: ['conversationId'],
        additionalProperties: false
    }
};
/**
 * Input validation schema
 */
export const AutoTagConversationSchema = z.object({
    conversationId: z.string().min(1, 'Conversation ID cannot be empty'),
    analysisTypes: z.array(z.enum(['topic_tags', 'activity_classification', 'urgency_analysis', 'project_contexts']))
        .default(['topic_tags', 'activity_classification', 'urgency_analysis', 'project_contexts']),
    config: z.object({
        minEntityRelevance: z.number().min(0).max(1).default(0.3),
        maxTopicTags: z.number().min(1).max(20).default(5),
        minProjectConfidence: z.number().min(0).max(1).default(0.6),
        urgencyKeywords: z.array(z.string()).optional()
    }).optional(),
    updateConversation: z.boolean().default(false),
    returnAnalysis: z.boolean().default(true)
});
/**
 * Implementation of the auto_tag_conversation MCP tool
 */
export class AutoTagConversationTool extends BaseTool {
    autoTaggingService;
    databaseManager;
    constructor(dependencies) {
        super(AutoTagConversationToolDef, AutoTagConversationSchema);
        this.databaseManager = dependencies.databaseManager;
        // Initialize auto-tagging service with any custom configuration
        this.autoTaggingService = new AutoTaggingService(dependencies.databaseManager);
    }
    /**
     * Execute the auto_tag_conversation tool
     */
    async executeImpl(input, context) {
        const startTime = Date.now();
        // Verify conversation exists
        await this.verifyConversationExists(input.conversationId);
        // Create a new service instance with custom config if provided
        const serviceConfig = input.config ? {
            minEntityRelevance: input.config.minEntityRelevance,
            maxTopicTags: input.config.maxTopicTags,
            minProjectConfidence: input.config.minProjectConfidence,
            urgencyKeywords: input.config.urgencyKeywords || []
        } : {};
        const taggingService = new AutoTaggingService(this.databaseManager, serviceConfig);
        // Perform the requested analyses
        let taggingResult;
        if (input.returnAnalysis) {
            taggingResult = await wrapDatabaseOperation(async () => await taggingService.autoTagConversation(input.conversationId), `Failed to perform auto-tagging analysis for conversation ${input.conversationId}`);
        }
        // Generate individual components if full analysis wasn't requested
        const [topicTags, activity, urgency, projectContexts] = await Promise.all([
            input.analysisTypes.includes('topic_tags')
                ? wrapDatabaseOperation(async () => await taggingService.generateTopicTags(input.conversationId), 'Failed to generate topic tags')
                : [],
            input.analysisTypes.includes('activity_classification')
                ? wrapDatabaseOperation(async () => await taggingService.classifyActivity(input.conversationId), 'Failed to classify activity')
                : { type: 'discussion', confidence: 0, indicators: [] },
            input.analysisTypes.includes('urgency_analysis')
                ? wrapDatabaseOperation(async () => await taggingService.detectUrgencySignals(input.conversationId), 'Failed to detect urgency signals')
                : { level: 'none', score: 0, signals: [] },
            input.analysisTypes.includes('project_contexts')
                ? wrapDatabaseOperation(async () => await taggingService.identifyProjectContexts(input.conversationId), 'Failed to identify project contexts')
                : []
        ]);
        // Use results from individual analyses if full analysis wasn't performed
        const finalResult = taggingResult || {
            conversationId: input.conversationId,
            topicTags,
            activity,
            urgency,
            projectContexts,
            generatedAt: new Date()
        };
        // Extract applied tags for easy consumption
        const appliedTags = {
            topicTags: finalResult.topicTags.map(tag => tag.name),
            activityType: finalResult.activity.type,
            urgencyLevel: finalResult.urgency.level,
            projectNames: finalResult.projectContexts.map(project => project.name)
        };
        // Update conversation metadata if requested
        let conversationUpdated = false;
        if (input.updateConversation) {
            conversationUpdated = await this.updateConversationMetadata(input.conversationId, appliedTags, finalResult);
        }
        const processingTime = Date.now() - startTime;
        return {
            conversationId: input.conversationId,
            taggingResult: input.returnAnalysis ? finalResult : undefined,
            appliedTags,
            metadata: {
                analysisTimestamp: Date.now(),
                analysisTypes: input.analysisTypes,
                configUsed: {
                    minEntityRelevance: input.config?.minEntityRelevance || 0.3,
                    maxTopicTags: input.config?.maxTopicTags || 5,
                    minProjectConfidence: input.config?.minProjectConfidence || 0.6,
                    customUrgencyKeywords: input.config?.urgencyKeywords?.length || 0
                },
                conversationUpdated
            },
            summary: {
                topicTagsGenerated: finalResult.topicTags.length,
                activityConfidence: finalResult.activity.confidence,
                urgencyScore: finalResult.urgency.score,
                projectContextsFound: finalResult.projectContexts.length,
                processingTimeMs: processingTime
            }
        };
    }
    /**
     * Verify that the conversation exists
     */
    async verifyConversationExists(conversationId) {
        const db = this.databaseManager.getConnection();
        const query = 'SELECT id FROM conversations WHERE id = ?';
        const conversation = db.prepare(query).get(conversationId);
        if (!conversation) {
            throw new NotFoundError(`Conversation with ID '${conversationId}' not found`);
        }
    }
    /**
     * Update conversation metadata with generated tags
     */
    async updateConversationMetadata(conversationId, appliedTags, taggingResult) {
        try {
            const db = this.databaseManager.getConnection();
            // Get current metadata
            const currentMetadata = db.prepare('SELECT metadata FROM conversations WHERE id = ?').get(conversationId);
            let metadata = {};
            if (currentMetadata) {
                try {
                    metadata = JSON.parse(currentMetadata.metadata || '{}');
                }
                catch {
                    metadata = {};
                }
            }
            // Add auto-generated tags to metadata
            const updatedMetadata = {
                ...metadata,
                autoTags: {
                    topicTags: appliedTags.topicTags,
                    activityType: appliedTags.activityType,
                    urgencyLevel: appliedTags.urgencyLevel,
                    projectNames: appliedTags.projectNames,
                    generatedAt: taggingResult.generatedAt.toISOString(),
                    confidence: {
                        activity: taggingResult.activity.confidence,
                        urgency: taggingResult.urgency.score
                    }
                },
                lastAutoTagged: new Date().toISOString()
            };
            // Update the conversation
            const updateQuery = `
        UPDATE conversations 
        SET metadata = ?, updated_at = ?
        WHERE id = ?
      `;
            db.prepare(updateQuery).run(JSON.stringify(updatedMetadata), Date.now(), conversationId);
            return true;
        }
        catch (error) {
            console.warn(`Failed to update conversation metadata for ${conversationId}:`, error);
            return false;
        }
    }
    /**
     * Static factory method to create an AutoTagConversationTool instance
     */
    static create(dependencies) {
        return new AutoTagConversationTool(dependencies);
    }
}
//# sourceMappingURL=AutoTagConversationTool.js.map