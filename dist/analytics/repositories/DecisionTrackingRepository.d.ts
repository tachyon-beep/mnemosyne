/**
 * Decision Tracking Repository
 *
 * Handles database operations for decision quality analytics:
 * - Decision identification and classification
 * - Timeline tracking (problem -> decision -> outcome)
 * - Quality metrics and factor analysis
 * - Outcome assessment and learning
 * - Decision pattern recognition
 */
import { AnalyticsRepository, TimeRange, PaginationOptions } from './AnalyticsRepository.js';
import { DatabaseManager } from '../../storage/Database.js';
export interface DecisionTracking {
    id: string;
    decisionSummary: string;
    decisionType?: 'strategic' | 'tactical' | 'operational' | 'personal';
    conversationIds: string[];
    problemIdentifiedAt?: number;
    optionsConsideredAt?: number;
    decisionMadeAt: number;
    implementationStartedAt?: number;
    outcomeAssessedAt?: number;
    clarityScore: number;
    confidenceLevel: number;
    consensusLevel: number;
    reversalCount: number;
    modificationCount: number;
    outcomeScore?: number;
    outcomeAssessment: Record<string, any>;
    informationCompleteness: number;
    stakeholderCount: number;
    alternativesConsidered: number;
    riskAssessed: boolean;
    successFactors: string[];
    failureFactors: string[];
    lessonsLearned: string;
    tags: string[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'pending' | 'decided' | 'implemented' | 'assessed' | 'reversed';
    createdAt: number;
    updatedAt: number;
}
export interface DecisionInput {
    decisionSummary: string;
    decisionType?: 'strategic' | 'tactical' | 'operational' | 'personal';
    conversationIds: string[];
    problemIdentifiedAt?: number;
    optionsConsideredAt?: number;
    decisionMadeAt?: number;
    clarityScore?: number;
    confidenceLevel?: number;
    informationCompleteness?: number;
    stakeholderCount?: number;
    alternativesConsidered?: number;
    riskAssessed?: boolean;
    tags?: string[];
    priority?: 'critical' | 'high' | 'medium' | 'low';
}
export interface DecisionOutcome {
    decisionId: string;
    outcomeScore: number;
    implementationStartedAt?: number;
    outcomeAssessedAt: number;
    successFactors: string[];
    failureFactors: string[];
    lessonsLearned: string;
    modifications: string[];
}
export interface DecisionAnalysis {
    totalDecisions: number;
    averageQuality: number;
    averageOutcome: number;
    averageTimeToDecision: number;
    averageTimeToImplementation: number;
    reversalRate: number;
    topSuccessFactors: Array<{
        factor: string;
        frequency: number;
        successRate: number;
    }>;
    commonPitfalls: Array<{
        pitfall: string;
        frequency: number;
        impactScore: number;
    }>;
    decisionVelocityTrend: number;
}
export interface DecisionPattern {
    pattern: string;
    frequency: number;
    averageQuality: number;
    averageOutcome: number;
    confidence: number;
}
/**
 * Repository for decision tracking and quality analytics
 */
export declare class DecisionTrackingRepository extends AnalyticsRepository {
    constructor(databaseManager: DatabaseManager);
    /**
     * Save a new decision
     */
    saveDecision(input: DecisionInput): Promise<string>;
    /**
     * Update decision outcome
     */
    updateOutcome(outcome: DecisionOutcome): Promise<void>;
    /**
     * Mark decision as reversed
     */
    markReversed(decisionId: string, reason: string): Promise<void>;
    /**
     * Get decisions for analysis
     */
    getDecisions(status?: 'pending' | 'decided' | 'implemented' | 'assessed' | 'reversed', timeRange?: TimeRange, options?: PaginationOptions): Promise<DecisionTracking[]>;
    /**
     * Get decision analysis summary
     */
    getDecisionAnalysis(timeRange?: TimeRange): Promise<DecisionAnalysis>;
    /**
     * Get decision patterns
     */
    getDecisionPatterns(timeRange?: TimeRange): Promise<DecisionPattern[]>;
    /**
     * Get decisions needing follow-up
     */
    getDecisionsNeedingFollowUp(daysOld?: number): Promise<DecisionTracking[]>;
    /**
     * Get decision by ID
     */
    getDecision(decisionId: string): Promise<DecisionTracking | null>;
    /**
     * Delete decision
     */
    deleteDecision(decisionId: string): Promise<number>;
    /**
     * Get top success factors
     */
    private getTopSuccessFactors;
    /**
     * Get common pitfalls
     */
    private getCommonPitfalls;
    /**
     * Map database row to DecisionTracking interface
     */
    private mapRowToDecision;
    /**
     * Parse JSON array safely
     */
    private parseJSONArray;
    /**
     * Batch save decisions with optimized performance
     */
    batchSaveDecisions(decisionInputs: DecisionInput[], options?: {
        batchSize?: number;
        conflictResolution?: 'IGNORE' | 'REPLACE' | 'UPDATE';
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        inserted: number;
        updated: number;
        failed: number;
        errors: Error[];
    }>;
    /**
     * Batch update decision outcomes
     */
    batchUpdateOutcomes(outcomes: DecisionOutcome[], options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        updated: number;
        failed: number;
    }>;
    /**
     * Batch mark decisions as reversed
     */
    batchMarkReversed(reversals: Array<{
        decisionId: string;
        reason: string;
    }>, options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        updated: number;
        failed: number;
    }>;
    /**
     * Batch delete decisions
     */
    batchDeleteDecisions(decisionIds: string[], options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        deleted: number;
        failed: number;
    }>;
    /**
     * Batch track decisions from conversation analysis
     */
    batchTrackDecisions(conversationDecisions: Array<{
        conversationId: string;
        decisions: any[];
        conversationMetadata?: any;
    }>, options?: {
        batchSize?: number;
        onProgress?: (processed: number, total: number) => void;
    }): Promise<{
        tracked: number;
        failed: number;
    }>;
    /**
     * Estimate decision clarity from content
     */
    private estimateDecisionClarity;
    /**
     * Estimate confidence level from content
     */
    private estimateConfidenceLevel;
    /**
     * Estimate information completeness
     */
    private estimateInformationCompleteness;
    /**
     * Count alternatives mentioned in decision
     */
    private countAlternatives;
    /**
     * Detect if risk was assessed
     */
    private detectRiskAssessment;
    /**
     * Extract decision tags from content
     */
    private extractDecisionTags;
    /**
     * Assess decision priority
     */
    private assessDecisionPriority;
}
//# sourceMappingURL=DecisionTrackingRepository.d.ts.map