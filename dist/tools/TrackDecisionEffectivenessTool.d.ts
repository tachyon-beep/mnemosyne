/**
 * Track Decision Effectiveness Tool Implementation
 *
 * This tool tracks decision-making patterns and effectiveness by analyzing:
 * - Decisions made in conversations and their quality
 * - Decision outcomes and follow-up actions
 * - Decision reversal patterns and rates
 * - Decision-making process effectiveness
 * - Factors that influence decision quality
 */
import { TrackDecisionEffectivenessInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
import { DecisionTracker, Decision } from '../analytics/analyzers/DecisionTracker.js';
import { ConversationRepository } from '../storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { DecisionTrackingRepository } from '../analytics/repositories/DecisionTrackingRepository.js';
import { TimeRange } from '../analytics/repositories/AnalyticsRepository.js';
/**
 * Decision quality analysis
 */
export interface DecisionQualityAnalysis {
    /** Average decision quality score (0-100) */
    averageQuality: number;
    /** Quality distribution */
    qualityDistribution: {
        excellent: number;
        good: number;
        fair: number;
        poor: number;
    };
    /** Factors affecting quality */
    qualityFactors: Array<{
        factor: string;
        impact: number;
        frequency: number;
    }>;
    /** Quality trends over time */
    trends: Array<{
        period: string;
        averageQuality: number;
        decisionCount: number;
    }>;
}
/**
 * Decision outcome tracking
 */
export interface DecisionOutcomeAnalysis {
    /** Average outcome score (0-100) */
    averageOutcome: number;
    /** Outcome distribution */
    outcomeDistribution: {
        successful: number;
        partial: number;
        unsuccessful: number;
        unknown: number;
    };
    /** Time to outcome measurement */
    timeToOutcome: {
        average: number;
        median: number;
        range: {
            min: number;
            max: number;
        };
    };
    /** Success factors */
    successFactors: string[];
    /** Common failure patterns */
    failurePatterns: string[];
}
/**
 * Decision reversal analysis
 */
export interface DecisionReversalAnalysis {
    /** Overall reversal rate (0-1) */
    reversalRate: number;
    /** Time to reversal statistics */
    timeToReversal: {
        average: number;
        median: number;
        range: {
            min: number;
            max: number;
        };
    };
    /** Reversal patterns by decision type */
    reversalsByType: Array<{
        decisionType: string;
        reversalRate: number;
        count: number;
    }>;
    /** Common reversal reasons */
    reversalReasons: Array<{
        reason: string;
        frequency: number;
        impact: number;
    }>;
    /** Prevention strategies */
    preventionStrategies: string[];
}
/**
 * Decision type analysis
 */
export interface DecisionTypeAnalysis {
    /** Analysis by decision type */
    byType: Array<{
        type: string;
        count: number;
        averageQuality: number;
        averageOutcome: number;
        reversalRate: number;
        characteristics: string[];
    }>;
    /** Most common decision types */
    mostCommon: Array<{
        type: string;
        frequency: number;
        percentage: number;
    }>;
    /** Best performing decision types */
    bestPerforming: Array<{
        type: string;
        performanceScore: number;
        qualityScore: number;
        outcomeScore: number;
    }>;
}
/**
 * Response interface for track_decision_effectiveness tool
 */
export interface TrackDecisionEffectivenessResponse {
    /** Time range analyzed */
    timeRange: TimeRange;
    /** When the analysis was performed */
    analyzedAt: number;
    /** All decisions tracked in the period */
    decisions: Decision[];
    /** Decision quality analysis */
    qualityAnalysis: DecisionQualityAnalysis;
    /** Decision outcome tracking (if requested) */
    outcomeAnalysis?: DecisionOutcomeAnalysis;
    /** Decision reversal analysis (if requested) */
    reversalAnalysis?: DecisionReversalAnalysis;
    /** Decision type analysis */
    typeAnalysis: DecisionTypeAnalysis;
    /** Decision-making process insights */
    processInsights: {
        /** Average time spent on decision */
        averageDecisionTime: number;
        /** Information gathering effectiveness */
        informationGathering: {
            score: number;
            commonSources: string[];
            gaps: string[];
        };
        /** Consultation patterns */
        consultationPatterns: {
            frequency: number;
            effectiveness: number;
            types: string[];
        };
        /** Follow-up adherence */
        followUpAdherence: {
            rate: number;
            averageDelay: number;
            completionRate: number;
        };
    };
    /** Recommendations for improvement */
    recommendations: {
        /** Quality improvement suggestions */
        qualityImprovements: string[];
        /** Process improvements */
        processImprovements: string[];
        /** Risk mitigation strategies */
        riskMitigation: string[];
        /** Best practices to adopt */
        bestPractices: string[];
    };
    /** Key insights and patterns */
    insights: {
        /** Most significant insights */
        keyInsights: string[];
        /** Warning signals */
        warnings: string[];
        /** Positive trends */
        positives: string[];
        /** Areas needing attention */
        concerns: string[];
    };
    /** Analysis metadata */
    metadata: {
        /** Number of conversations analyzed */
        conversationCount: number;
        /** Total decisions tracked */
        totalDecisions: number;
        /** Decisions with quality scores */
        qualityScored: number;
        /** Decisions with outcome data */
        outcomeTracked: number;
        /** Analysis duration in milliseconds */
        analysisDuration: number;
        /** Decision types included */
        decisionTypesIncluded: string[];
    };
}
/**
 * Dependencies required by TrackDecisionEffectivenessTool
 */
export interface TrackDecisionEffectivenessDependencies {
    analyticsEngine: AnalyticsEngine;
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
    decisionTracker: DecisionTracker;
    decisionTrackingRepository: DecisionTrackingRepository;
}
/**
 * Implementation of the track_decision_effectiveness MCP tool
 */
export declare class TrackDecisionEffectivenessTool extends BaseTool<TrackDecisionEffectivenessInput, TrackDecisionEffectivenessResponse> {
    private readonly analyticsEngine;
    private readonly conversationRepository;
    private readonly messageRepository;
    private readonly decisionTracker;
    private readonly decisionTrackingRepository;
    constructor(dependencies: TrackDecisionEffectivenessDependencies);
    /**
     * Execute the track_decision_effectiveness tool
     */
    protected executeImpl(input: TrackDecisionEffectivenessInput, _context: ToolContext): Promise<TrackDecisionEffectivenessResponse>;
    /**
     * Get conversations and messages for analysis
     */
    private getAnalysisData;
    /**
     * Track decisions in conversations
     */
    private trackDecisions;
    /**
     * Analyze decision quality
     */
    private analyzeDecisionQuality;
    /**
     * Analyze decision outcomes
     */
    private analyzeDecisionOutcomes;
    /**
     * Analyze decision reversals
     */
    private analyzeDecisionReversals;
    /**
     * Analyze decision types
     */
    private analyzeDecisionTypes;
    /**
     * Analyze decision-making process
     */
    private analyzeDecisionProcess;
    /**
     * Generate recommendations
     */
    private generateRecommendations;
    /**
     * Generate insights
     */
    private generateInsights;
    private analyzeQualityFactors;
    private calculateQualityTrends;
    private formatPeriodName;
    private calculateTimeToOutcome;
    private calculateMedian;
    private identifySuccessFactors;
    private incrementFactor;
    private identifyFailurePatterns;
    private calculateTimeToReversal;
    private calculateReversalsByType;
    private identifyReversalReasons;
    private addReversalReason;
    private generatePreventionStrategies;
    private groupDecisionsByType;
    private calculateAverageQuality;
    private calculateAverageOutcome;
    private identifyTypeCharacteristics;
    private calculateAverageDecisionTime;
    private analyzeInformationGathering;
    private analyzeConsultationPatterns;
    private analyzeFollowUpAdherence;
    private createEmptyQualityAnalysis;
    private createEmptyOutcomeAnalysis;
    private createEmptyResponse;
    /**
     * Static factory method to create a TrackDecisionEffectivenessTool instance
     */
    static create(dependencies: TrackDecisionEffectivenessDependencies): TrackDecisionEffectivenessTool;
}
//# sourceMappingURL=TrackDecisionEffectivenessTool.d.ts.map