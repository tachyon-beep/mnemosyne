/**
 * Get Proactive Insights Tool Implementation
 *
 * This tool returns unresolved actions, recurring questions, knowledge gaps,
 * and stale commitments by leveraging the Pattern Detection Service.
 */
import { z } from 'zod';
import { BaseTool, wrapDatabaseOperation } from '../BaseTool.js';
import { PatternDetectionService } from '../../services/proactive/patterns/PatternDetectionService.js';
/**
 * Tool definition for get_proactive_insights
 */
export const GetProactiveInsightsToolDef = {
    name: 'get_proactive_insights',
    description: 'Returns unresolved actions, recurring questions, knowledge gaps, and stale commitments to provide proactive assistance.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                description: 'Optional conversation ID to limit analysis scope'
            },
            includeTypes: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments']
                },
                description: 'Types of insights to include',
                default: ['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments']
            },
            daysSince: {
                type: 'number',
                minimum: 1,
                maximum: 365,
                default: 30,
                description: 'Number of days to look back for patterns'
            },
            minConfidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                default: 0.6,
                description: 'Minimum confidence threshold for insights'
            },
            limit: {
                type: 'number',
                minimum: 1,
                maximum: 100,
                default: 20,
                description: 'Maximum number of insights per type to return'
            }
        },
        required: [],
        additionalProperties: false
    }
};
/**
 * Input validation schema
 */
export const GetProactiveInsightsSchema = z.object({
    conversationId: z.string().optional(),
    includeTypes: z.array(z.enum(['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments']))
        .default(['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments']),
    daysSince: z.number().min(1).max(365).default(30),
    minConfidence: z.number().min(0).max(1).default(0.6),
    limit: z.number().min(1).max(100).default(20)
});
/**
 * Implementation of the get_proactive_insights MCP tool
 */
export class GetProactiveInsightsTool extends BaseTool {
    patternService;
    constructor(dependencies) {
        super(GetProactiveInsightsToolDef, GetProactiveInsightsSchema);
        this.patternService = new PatternDetectionService(dependencies.databaseManager);
    }
    /**
     * Execute the get_proactive_insights tool
     */
    async executeImpl(input, context) {
        const insights = {};
        let totalInsights = 0;
        const analysisOptions = {
            conversationId: input.conversationId,
            daysSince: input.daysSince,
            minConfidence: input.minConfidence,
            limit: input.limit
        };
        // Detect unresolved actions
        if (input.includeTypes.includes('unresolved_actions')) {
            insights.unresolvedActions = await wrapDatabaseOperation(async () => await this.patternService.detectUnresolvedActions(analysisOptions), 'Failed to detect unresolved actions');
            totalInsights += insights.unresolvedActions.length;
        }
        // Find recurring questions
        if (input.includeTypes.includes('recurring_questions')) {
            insights.recurringQuestions = await wrapDatabaseOperation(async () => await this.patternService.findRecurringQuestions({
                conversationId: input.conversationId,
                minFrequency: 2,
                minDaysBetween: 1,
                limit: input.limit
            }), 'Failed to find recurring questions');
            totalInsights += insights.recurringQuestions.length;
        }
        // Identify knowledge gaps
        if (input.includeTypes.includes('knowledge_gaps')) {
            insights.knowledgeGaps = await wrapDatabaseOperation(async () => await this.patternService.identifyKnowledgeGaps({
                conversationId: input.conversationId,
                minGapRatio: 1.5,
                limit: input.limit
            }), 'Failed to identify knowledge gaps');
            totalInsights += insights.knowledgeGaps.length;
        }
        // Track stale commitments
        if (input.includeTypes.includes('stale_commitments')) {
            const allCommitments = await wrapDatabaseOperation(async () => await this.patternService.trackCommitments({
                conversationId: input.conversationId,
                includeResolved: false,
                limit: input.limit * 2 // Get more to filter for stale ones
            }), 'Failed to track commitments');
            // Filter for stale commitments (pending/overdue for more than specified days)
            insights.staleCommitments = allCommitments.filter(commitment => (commitment.status === 'pending' || commitment.status === 'overdue') &&
                commitment.daysSinceCommitment >= Math.min(input.daysSince, 7) // At least a week old
            ).slice(0, input.limit);
            totalInsights += insights.staleCommitments.length;
        }
        return {
            insights,
            summary: {
                totalInsights,
                analysisScope: {
                    conversationId: input.conversationId,
                    daysSince: input.daysSince,
                    minConfidence: input.minConfidence
                },
                detectionTimestamp: Date.now()
            }
        };
    }
    /**
     * Static factory method to create a GetProactiveInsightsTool instance
     */
    static create(dependencies) {
        return new GetProactiveInsightsTool(dependencies);
    }
}
//# sourceMappingURL=GetProactiveInsightsTool.js.map