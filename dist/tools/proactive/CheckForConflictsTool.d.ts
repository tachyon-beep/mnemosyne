/**
 * Check for Conflicts Tool Implementation
 *
 * This tool detects contradictions in entity information across conversations
 * using the Context Change Detector and Knowledge Synthesizer services.
 */
import { z } from 'zod';
import { BaseTool, ToolContext } from '../BaseTool.js';
import { MCPTool } from '../../types/mcp.js';
import { ConflictingInformation } from '../../services/proactive/intelligence/ContextChangeDetector.js';
import { EntityConflict } from '../../services/proactive/synthesis/KnowledgeSynthesizer.js';
import { DatabaseManager } from '../../storage/Database.js';
import { EntityRepository } from '../../storage/repositories/EntityRepository.js';
import { KnowledgeGraphRepository } from '../../storage/repositories/KnowledgeGraphRepository.js';
/**
 * Tool definition for check_for_conflicts
 */
export declare const CheckForConflictsToolDef: MCPTool;
/**
 * Input validation schema
 */
export declare const CheckForConflictsSchema: z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    entityIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    conflictTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["property_contradiction", "status_inconsistency", "temporal_impossibility", "relationship_conflict", "existence_dispute", "identity_confusion", "authority_disagreement"]>, "many">>;
    minSeverity: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    maxAge: z.ZodDefault<z.ZodNumber>;
    includeResolutions: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    conflictTypes: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[];
    minSeverity: "low" | "medium" | "high" | "critical";
    maxAge: number;
    includeResolutions: boolean;
    conversationId?: string | undefined;
    entityIds?: string[] | undefined;
}, {
    conversationId?: string | undefined;
    limit?: number | undefined;
    entityIds?: string[] | undefined;
    conflictTypes?: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[] | undefined;
    minSeverity?: "low" | "medium" | "high" | "critical" | undefined;
    maxAge?: number | undefined;
    includeResolutions?: boolean | undefined;
}>;
export type CheckForConflictsInput = z.infer<typeof CheckForConflictsSchema>;
/**
 * Response interface
 */
export interface CheckForConflictsResponse {
    conflicts: {
        contextConflicts: ConflictingInformation[];
        entityConflicts: EntityConflict[];
    };
    summary: {
        totalConflicts: number;
        severityBreakdown: {
            low: number;
            medium: number;
            high: number;
            critical: number;
        };
        conflictTypeBreakdown: Record<string, number>;
        entitiesWithConflicts: number;
        analysisScope: {
            conversationId?: string;
            entityIds?: string[];
            maxAge: number;
            minSeverity: string;
        };
    };
    analysisTimestamp: number;
}
/**
 * Dependencies required by CheckForConflictsTool
 */
export interface CheckForConflictsDependencies {
    databaseManager: DatabaseManager;
    entityRepository: EntityRepository;
    knowledgeGraphRepository: KnowledgeGraphRepository;
}
/**
 * Implementation of the check_for_conflicts MCP tool
 */
export declare class CheckForConflictsTool extends BaseTool<CheckForConflictsInput, CheckForConflictsResponse> {
    private readonly contextDetector;
    private readonly knowledgeSynthesizer;
    constructor(dependencies: CheckForConflictsDependencies);
    /**
     * Execute the check_for_conflicts tool
     */
    protected executeImpl(input: CheckForConflictsInput, context: ToolContext): Promise<CheckForConflictsResponse>;
    /**
     * Map string severity to numeric value for filtering
     */
    private mapSeverityToNumeric;
    /**
     * Map numeric severity to string
     */
    private mapNumericToSeverity;
    /**
     * Check if conflict meets severity threshold
     */
    private meetsSeverityThreshold;
    /**
     * Static factory method to create a CheckForConflictsTool instance
     */
    static create(dependencies: CheckForConflictsDependencies): CheckForConflictsTool;
}
//# sourceMappingURL=CheckForConflictsTool.d.ts.map