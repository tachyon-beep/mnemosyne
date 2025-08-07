/**
 * Check for Conflicts Tool Implementation
 *
 * This tool detects contradictions in entity information across conversations
 * using the Context Change Detector and Knowledge Synthesizer services.
 */
import { z } from 'zod';
import { BaseTool, wrapDatabaseOperation } from '../BaseTool.js';
import { ContextChangeDetector } from '../../services/proactive/intelligence/ContextChangeDetector.js';
import { KnowledgeSynthesizer } from '../../services/proactive/synthesis/KnowledgeSynthesizer.js';
/**
 * Tool definition for check_for_conflicts
 */
export const CheckForConflictsToolDef = {
    name: 'check_for_conflicts',
    description: 'Detects contradictions in entity information across conversations, identifying conflicting statements and data inconsistencies.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                description: 'Optional conversation ID to focus analysis on specific conversation entities'
            },
            entityIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of specific entity IDs to check for conflicts'
            },
            conflictTypes: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['property_contradiction', 'status_inconsistency', 'temporal_impossibility', 'relationship_conflict', 'existence_dispute', 'identity_confusion', 'authority_disagreement']
                },
                description: 'Types of conflicts to detect',
                default: ['property_contradiction', 'status_inconsistency', 'temporal_impossibility', 'relationship_conflict']
            },
            minSeverity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                default: 'medium',
                description: 'Minimum severity level of conflicts to return'
            },
            maxAge: {
                type: 'number',
                minimum: 1,
                maximum: 365,
                default: 90,
                description: 'Maximum age in days of information to consider for conflicts'
            },
            includeResolutions: {
                type: 'boolean',
                default: true,
                description: 'Whether to include suggested resolutions for detected conflicts'
            },
            limit: {
                type: 'number',
                minimum: 1,
                maximum: 100,
                default: 20,
                description: 'Maximum number of conflicts to return'
            }
        },
        required: [],
        additionalProperties: false
    }
};
/**
 * Input validation schema
 */
export const CheckForConflictsSchema = z.object({
    conversationId: z.string().optional(),
    entityIds: z.array(z.string()).optional(),
    conflictTypes: z.array(z.enum([
        'property_contradiction',
        'status_inconsistency',
        'temporal_impossibility',
        'relationship_conflict',
        'existence_dispute',
        'identity_confusion',
        'authority_disagreement'
    ])).default(['property_contradiction', 'status_inconsistency', 'temporal_impossibility', 'relationship_conflict']),
    minSeverity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
    maxAge: z.number().min(1).max(365).default(90),
    includeResolutions: z.boolean().default(true),
    limit: z.number().min(1).max(100).default(20)
});
/**
 * Implementation of the check_for_conflicts MCP tool
 */
export class CheckForConflictsTool extends BaseTool {
    contextDetector;
    knowledgeSynthesizer;
    constructor(dependencies) {
        super(CheckForConflictsToolDef, CheckForConflictsSchema);
        this.contextDetector = new ContextChangeDetector(dependencies.databaseManager, dependencies.entityRepository, dependencies.knowledgeGraphRepository, {
            maxHistoryAgeDays: 90, // Will be overridden by input
            minConflictSeverity: 0.5
        });
        this.knowledgeSynthesizer = new KnowledgeSynthesizer(dependencies.databaseManager);
    }
    /**
     * Execute the check_for_conflicts tool
     */
    async executeImpl(input, context) {
        const conflictDetectionOptions = {
            conversationId: input.conversationId,
            entityIds: input.entityIds,
            minSeverity: this.mapSeverityToNumeric(input.minSeverity),
            limit: input.limit
        };
        // Detect context-level conflicts using ContextChangeDetector
        const contextConflicts = await wrapDatabaseOperation(async () => await this.contextDetector.findConflictingInformation(conflictDetectionOptions), 'Failed to detect context conflicts');
        // Detect entity-level conflicts using KnowledgeSynthesizer
        let entityConflicts = [];
        if (input.entityIds && input.entityIds.length > 0) {
            // Check specific entities
            for (const entityId of input.entityIds) {
                const entitySpecificConflicts = await wrapDatabaseOperation(async () => await this.knowledgeSynthesizer.detectConflictingStatements(entityId), `Failed to detect conflicts for entity ${entityId}`);
                entityConflicts.push(...entitySpecificConflicts);
            }
        }
        else {
            // Check all entities with sufficient mentions
            entityConflicts = await wrapDatabaseOperation(async () => await this.knowledgeSynthesizer.detectConflictingStatements(), 'Failed to detect entity conflicts');
        }
        // Filter conflicts by type and severity
        const filteredContextConflicts = contextConflicts.filter(conflict => input.conflictTypes.includes(conflict.conflictType) &&
            this.meetsSeverityThreshold(conflict.conflictSeverity, input.minSeverity));
        const filteredEntityConflicts = entityConflicts.filter(conflict => input.conflictTypes.includes(conflict.conflictType) &&
            this.meetsSeverityThreshold(conflict.severity, input.minSeverity));
        // Calculate summary statistics
        const allConflicts = [...filteredContextConflicts, ...filteredEntityConflicts];
        const totalConflicts = allConflicts.length;
        const severityBreakdown = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };
        const conflictTypeBreakdown = {};
        const entitiesWithConflicts = new Set();
        // Count severity and types for context conflicts
        for (const conflict of filteredContextConflicts) {
            const severity = this.mapNumericToSeverity(conflict.conflictSeverity);
            severityBreakdown[severity]++;
            conflictTypeBreakdown[conflict.conflictType] =
                (conflictTypeBreakdown[conflict.conflictType] || 0) + 1;
            entitiesWithConflicts.add(conflict.entity.id);
        }
        // Count severity and types for entity conflicts
        for (const conflict of filteredEntityConflicts) {
            severityBreakdown[conflict.severity]++;
            conflictTypeBreakdown[conflict.conflictType] =
                (conflictTypeBreakdown[conflict.conflictType] || 0) + 1;
            entitiesWithConflicts.add(conflict.entityId);
        }
        return {
            conflicts: {
                contextConflicts: filteredContextConflicts.slice(0, input.limit),
                entityConflicts: filteredEntityConflicts.slice(0, input.limit)
            },
            summary: {
                totalConflicts,
                severityBreakdown,
                conflictTypeBreakdown,
                entitiesWithConflicts: entitiesWithConflicts.size,
                analysisScope: {
                    conversationId: input.conversationId,
                    entityIds: input.entityIds,
                    maxAge: input.maxAge,
                    minSeverity: input.minSeverity
                }
            },
            analysisTimestamp: Date.now()
        };
    }
    /**
     * Map string severity to numeric value for filtering
     */
    mapSeverityToNumeric(severity) {
        const severityMap = {
            'low': 0.3,
            'medium': 0.5,
            'high': 0.7,
            'critical': 0.9
        };
        return severityMap[severity] || 0.5;
    }
    /**
     * Map numeric severity to string
     */
    mapNumericToSeverity(numericSeverity) {
        if (numericSeverity >= 0.9)
            return 'critical';
        if (numericSeverity >= 0.7)
            return 'high';
        if (numericSeverity >= 0.5)
            return 'medium';
        return 'low';
    }
    /**
     * Check if conflict meets severity threshold
     */
    meetsSeverityThreshold(conflictSeverity, minSeverity) {
        const numericSeverity = typeof conflictSeverity === 'number'
            ? conflictSeverity
            : this.mapSeverityToNumeric(conflictSeverity);
        return numericSeverity >= this.mapSeverityToNumeric(minSeverity);
    }
    /**
     * Static factory method to create a CheckForConflictsTool instance
     */
    static create(dependencies) {
        return new CheckForConflictsTool(dependencies);
    }
}
//# sourceMappingURL=CheckForConflictsTool.js.map