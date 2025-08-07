/**
 * Decision Tracker
 *
 * Tracks and analyzes decision-making patterns in conversations:
 * - Decision identification and extraction
 * - Timeline tracking (problem -> decision -> outcome)
 * - Quality assessment and factor analysis
 * - Outcome tracking and effectiveness measurement
 * - Decision pattern recognition
 * - Recommendation generation for improvement
 */
import { Message, Conversation } from '../../types/interfaces.js';
export type Decision = TrackedDecision;
export interface DecisionOutcome {
    id: string;
    decisionId: string;
    score: number;
    timestamp: number;
    description: string;
    reversals: number;
    modifications: number;
}
export interface TrackedDecision {
    id: string;
    conversationId: string;
    decisionSummary: string;
    decisionType: 'strategic' | 'tactical' | 'operational' | 'personal';
    context: string;
    problemIdentifiedAt?: number;
    optionsConsideredAt?: number;
    decisionMadeAt: number;
    implementationStartedAt?: number;
    outcomeAssessedAt?: number;
    clarityScore: number;
    confidenceLevel: number;
    consensusLevel: number;
    informationCompleteness: number;
    alternativesConsidered: number;
    stakeholderCount: number;
    riskAssessment: boolean;
    timeConstraints: boolean;
    resourceConstraints: boolean;
    outcomeScore?: number;
    reversalCount: number;
    modificationCount: number;
    successFactors: string[];
    failureFactors: string[];
    lessonsLearned: string;
    qualityScore?: number;
    outcome?: number;
    reversed?: boolean;
    processingTime?: number;
    description?: string;
    metadata?: Record<string, any>;
    timestamp?: number;
    tags: string[];
    priority: 'critical' | 'high' | 'medium' | 'low';
    complexity: number;
}
export interface DecisionPattern {
    pattern: string;
    description: string;
    frequency: number;
    successRate: number;
    averageQuality: number;
    averageOutcome?: number;
    commonFactors: string[];
    successIndicators: string[];
    riskFactors: string[];
    typicalContext: string;
    optimalConditions: string[];
    confidence: number;
}
export interface DecisionQualityMetrics {
    conversationId: string;
    totalDecisions: number;
    averageClarityScore: number;
    averageConfidenceLevel: number;
    averageInformationCompleteness: number;
    averageDecisionTime: number;
    averageImplementationTime: number;
    successRate: number;
    reversalRate: number;
    modificationRate: number;
    mostImportantFactors: string[];
    biggestRiskFactors: string[];
}
export interface DecisionTimeline {
    decisionId: string;
    phases: Array<{
        phase: 'problem_identification' | 'option_consideration' | 'decision_making' | 'implementation' | 'outcome_assessment';
        timestamp: number;
        duration?: number;
        quality: number;
        evidence: string[];
    }>;
    totalDuration: number;
    efficiency: number;
    completeness: number;
}
/**
 * Tracks decisions and analyzes decision-making effectiveness
 */
export declare class DecisionTracker {
    private readonly DECISION_KEYWORDS;
    private readonly PROBLEM_KEYWORDS;
    private readonly OPTION_KEYWORDS;
    private readonly OUTCOME_KEYWORDS;
    /**
     * Track decisions in a conversation
     */
    trackDecisions(conversation: Conversation, messages: Message[]): Promise<TrackedDecision[]>;
    /**
     * Analyze decision quality for a conversation
     */
    analyzeDecisionQuality(conversation: Conversation, messages: Message[], decisions?: TrackedDecision[]): Promise<DecisionQualityMetrics>;
    /**
     * Detect decision patterns across conversations
     */
    detectDecisionPatterns(conversationsWithDecisions: Array<{
        conversation: Conversation;
        messages: Message[];
        decisions: TrackedDecision[];
    }>): Promise<DecisionPattern[]>;
    /**
     * Generate decision timeline analysis
     */
    generateDecisionTimeline(conversation: Conversation, messages: Message[], decision: TrackedDecision): Promise<DecisionTimeline>;
    /**
     * Safe wrapper methods for error handling
     */
    private safeTrackDecisions;
    private safeIdentifyDecisionCandidates;
    private safeAnalyzeDecision;
    private safeCalculateAverage;
    private safeCalculateDecisionTimes;
    private safeCalculateImplementationTimes;
    private safeCalculateSuccessRate;
    private safeCalculateReversalRate;
    private safeCalculateModificationRate;
    private safeAnalyzeDecisionFactors;
    private safeGroupDecisionsByPattern;
    private safeAnalyzeDecisionPattern;
    private safeMapMessagesToPhases;
    private safeAnalyzeDecisionPhase;
    private safeCalculateTotalDuration;
    private safeCalculateTimelineEfficiency;
    private safeCalculateTimelineCompleteness;
    private createEmptyDecisionTimeline;
    /**
     * Private helper methods
     */
    private identifyDecisionCandidates;
    private safeFindDecisionIndicators;
    private findDecisionIndicators;
    private analyzeDecision;
    private extractDecisionSummary;
    private classifyDecisionType;
    private extractDecisionTimeline;
    private assessDecisionClarity;
    private assessConfidenceLevel;
    private assessInformationCompleteness;
    private analyzeDecisionContext;
    private findDecisionOutcome;
    private generateDecisionId;
    private extractContext;
    private extractSuccessFactors;
    private extractFailureFactors;
    private extractLessonsLearned;
    private generateDecisionTags;
    private assessDecisionPriority;
    private assessDecisionComplexity;
    private assessContextualClarity;
    private createEmptyQualityMetrics;
    private calculateAverage;
    private calculateDecisionTimes;
    private calculateImplementationTimes;
    private calculateSuccessRate;
    private calculateReversalRate;
    private calculateModificationRate;
    private analyzeDecisionFactors;
    private groupDecisionsByPattern;
    private extractDecisionPattern;
    private analyzeDecisionPattern;
    private generatePatternDescription;
    private identifySuccessIndicators;
    private identifyRiskFactors;
    private extractTypicalContext;
    private identifyOptimalConditions;
    private mapMessagesToPhases;
    private analyzeDecisionPhase;
    private calculateTimelineEfficiency;
    private calculateTimelineCompleteness;
}
//# sourceMappingURL=DecisionTracker.d.ts.map