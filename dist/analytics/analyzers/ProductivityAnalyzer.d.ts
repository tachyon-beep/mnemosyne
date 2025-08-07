/**
 * Productivity Analyzer
 *
 * Analyzes productivity patterns and effectiveness:
 * - Time-based productivity analysis
 * - Peak hour detection with statistical significance
 * - Question effectiveness assessment
 * - Breakthrough pattern identification
 * - Session length optimization
 * - Engagement quality measurement
 */
import { Message, Conversation } from '../../types/interfaces.js';
import { ConversationFlowMetrics } from './ConversationFlowAnalyzer.js';
export interface ProductivityMetrics {
    conversationId: string;
    analyzedAt: number;
    overallProductivityScore: number;
    efficiencyScore: number;
    effectivenessScore: number;
    engagementScore: number;
    sessionDuration: number;
    activeTime: number;
    responseLatency: number;
    peakProductivityPeriod?: {
        start: number;
        end: number;
        score: number;
    };
    questionMetrics: {
        total: number;
        effectiveQuestions: number;
        questionQualityScore: number;
        insightGeneratingQuestions: number;
    };
    outputMetrics: {
        insightCount: number;
        breakthroughCount: number;
        resolutionCount: number;
        actionableOutputs: number;
    };
    patterns: {
        breakthroughTriggers: string[];
        effectiveApproaches: string[];
        productivityKillers: string[];
        optimalFlowState: boolean;
    };
}
export interface HourlyProductivityData {
    hour: number;
    productivity: {
        score: number;
        conversationCount: number;
        averageQuality: number;
        insightRate: number;
        confidenceLevel: number;
    };
    patterns: {
        commonApproaches: string[];
        successRate: number;
        averageSessionLength: number;
    };
}
export interface QuestionEffectivenessAnalysis {
    questionPattern: string;
    examples: string[];
    metrics: {
        frequency: number;
        averageInsightScore: number;
        breakthroughProbability: number;
        averageResponseLength: number;
        followupRate: number;
    };
    effectiveness: {
        score: number;
        confidence: number;
        recommendation: string;
    };
}
export interface BreakthroughPattern {
    pattern: string;
    description: string;
    frequency: number;
    successRate: number;
    preconditions: string[];
    examples: Array<{
        conversationId: string;
        context: string;
        outcome: string;
        timestamp: number;
    }>;
    confidence: number;
}
export interface SessionOptimization {
    currentAverage: number;
    optimalLength: number;
    efficiency: {
        shortSessions: number;
        mediumSessions: number;
        longSessions: number;
        optimalRange: {
            min: number;
            max: number;
        };
    };
    recommendations: string[];
}
/**
 * Analyzes productivity patterns and provides optimization insights
 */
export declare class ProductivityAnalyzer {
    private readonly INSIGHT_KEYWORDS;
    private readonly BREAKTHROUGH_KEYWORDS;
    private readonly QUESTION_PATTERNS;
    /**
     * Analyze productivity for a single conversation
     */
    analyzeConversationProductivity(conversation: Conversation, messages: Message[], flowMetrics?: ConversationFlowMetrics): Promise<ProductivityMetrics>;
    /**
     * Analyze hourly productivity patterns
     */
    analyzeHourlyPatterns(conversationsWithMetrics: Array<{
        conversation: Conversation;
        messages: Message[];
        productivity: ProductivityMetrics;
    }>): Promise<HourlyProductivityData[]>;
    /**
     * Analyze question effectiveness patterns
     */
    analyzeQuestionEffectiveness(conversationsWithMetrics: Array<{
        conversation: Conversation;
        messages: Message[];
        productivity: ProductivityMetrics;
    }>): Promise<QuestionEffectivenessAnalysis[]>;
    /**
     * Identify breakthrough patterns
     */
    identifyBreakthroughPatterns(conversationsWithMetrics: Array<{
        conversation: Conversation;
        messages: Message[];
        productivity: ProductivityMetrics;
    }>): Promise<BreakthroughPattern[]>;
    /**
     * Analyze session length optimization
     */
    analyzeSessionOptimization(conversationsWithMetrics: Array<{
        conversation: Conversation;
        messages: Message[];
        productivity: ProductivityMetrics;
    }>): Promise<SessionOptimization>;
    /**
     * Safe wrapper methods for error handling
     */
    private createDefaultProductivityMetrics;
    private safeCalculateSessionDuration;
    private safeCalculateActiveTime;
    private safeCalculateResponseLatency;
    private safeAnalyzeQuestions;
    private safeMeasureOutputQuality;
    private safeCalculateEfficiencyScore;
    private safeCalculateEffectivenessScore;
    private safeCalculateEngagementScore;
    private safeCalculateOverallScore;
    private safeDetectProductivityPatterns;
    private safeDetectPeakPeriod;
    private safeCalculateHourlyProductivity;
    private safeDetectHourlyPatterns;
    private safeExtractQuestions;
    private safeClassifyQuestionPattern;
    private safeCalculateQuestionInsightScore;
    private safeGetResponseLength;
    private safeHasFollowupQuestions;
    private safeIsBreakthroughQuestion;
    private safeCalculateAverage;
    private safeCalculateQuestionEffectivenessScore;
    private safeGenerateQuestionRecommendation;
    private safeDetectBreakthroughs;
    private safeExtractBreakthroughPattern;
    private safeGetBreakthroughContext;
    private safeGetBreakthroughOutcome;
    private safeIdentifyPreconditions;
    private safeAssessBreakthroughSuccess;
    private safeGeneratePatternDescription;
    private safeCalculateSessionAverage;
    private safeCalculateCategoryEfficiency;
    private safeFindOptimalSessionLength;
    private safeCalculateOptimalRange;
    private safeGenerateSessionRecommendations;
    /**
     * Private helper methods
     */
    private calculateSessionDuration;
    private calculateActiveTime;
    private calculateResponseLatency;
    private analyzeQuestions;
    private measureOutputQuality;
    private calculateEfficiencyScore;
    private calculateEffectivenessScore;
    private calculateEngagementScore;
    private detectProductivityPatterns;
    private detectPeakPeriod;
    private createEmptyHourlyData;
    private calculateHourlyProductivity;
    private detectHourlyPatterns;
    private extractQuestions;
    private classifyQuestionPattern;
    private calculateQuestionInsightScore;
    private getResponseLength;
    private hasFollowupQuestions;
    private isBreakthroughQuestion;
    private calculateQuestionEffectivenessScore;
    private generateQuestionRecommendation;
    private detectBreakthroughs;
    private extractBreakthroughPattern;
    private getBreakthroughContext;
    private getBreakthroughOutcome;
    private identifyPreconditions;
    private assessBreakthroughSuccess;
    private generatePatternDescription;
    private createDefaultSessionOptimization;
    private calculateCategoryEfficiency;
    private findOptimalSessionLength;
    private calculateOptimalRange;
    private generateSessionRecommendations;
    private assessQuestionQuality;
    private extractTriggerPattern;
    private extractApproachPattern;
    private detectRepetitivePatterns;
    private assessFlowState;
    private calculateWindowProductivityScore;
}
//# sourceMappingURL=ProductivityAnalyzer.d.ts.map