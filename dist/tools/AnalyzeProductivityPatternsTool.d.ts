/**
 * Analyze Productivity Patterns Tool Implementation
 *
 * This tool analyzes productivity patterns across conversations to identify:
 * - Peak productivity hours and time-based patterns
 * - Optimal session length and timing
 * - Most effective question patterns and types
 * - Productivity trends over time
 * - Correlation between conversation characteristics and outcomes
 */
import { AnalyzeProductivityPatternsInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
import { ProductivityAnalyzer } from '../analytics/analyzers/ProductivityAnalyzer.js';
import { ConversationRepository } from '../storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { ProductivityPatternsRepository } from '../analytics/repositories/ProductivityPatternsRepository.js';
import { TimeRange } from '../analytics/repositories/AnalyticsRepository.js';
/**
 * Productivity pattern analysis result
 */
export interface ProductivityPattern {
    /** Pattern identifier */
    id: string;
    /** Pattern type */
    type: 'peak_hour' | 'session_length' | 'question_type' | 'temporal_trend';
    /** Pattern description */
    description: string;
    /** Pattern strength/confidence (0-1) */
    confidence: number;
    /** Supporting data */
    data: any;
    /** Pattern impact score (0-100) */
    impact: number;
}
/**
 * Session analysis result
 */
export interface SessionAnalysis {
    /** Optimal session length in minutes */
    optimalLength: number;
    /** Average session length */
    averageLength: number;
    /** Session length distribution */
    lengthDistribution: {
        [range: string]: number;
    };
    /** Productivity by session length */
    productivityByLength: {
        length: number;
        productivity: number;
    }[];
}
/**
 * Question pattern analysis result
 */
export interface QuestionPatternAnalysis {
    /** Top question patterns by effectiveness */
    topPatterns: Array<{
        pattern: string;
        frequency: number;
        effectiveness: number;
        examples: string[];
    }>;
    /** Question types analysis */
    questionTypes: Array<{
        type: string;
        count: number;
        avgProductivity: number;
    }>;
    /** Best practices identified */
    bestPractices: string[];
}
/**
 * Response interface for analyze_productivity_patterns tool
 */
export interface AnalyzeProductivityPatternsResponse {
    /** Time range analyzed */
    timeRange: TimeRange;
    /** When the analysis was performed */
    analyzedAt: number;
    /** Peak productivity hours (0-23) */
    peakHours: number[];
    /** Session analysis results */
    sessionAnalysis: SessionAnalysis;
    /** Question pattern analysis */
    questionPatterns: QuestionPatternAnalysis;
    /** Identified productivity patterns */
    patterns: ProductivityPattern[];
    /** Temporal trends */
    trends: {
        /** Weekly productivity trend (positive = improving) */
        weeklyTrend: number;
        /** Monthly productivity trend */
        monthlyTrend: number;
        /** Productivity by day of week */
        byDayOfWeek: {
            [day: string]: number;
        };
        /** Productivity by hour of day */
        byHourOfDay: {
            [hour: number]: number;
        };
    };
    /** Insights and recommendations */
    insights: {
        /** Key insights discovered */
        keyInsights: string[];
        /** Actionable recommendations */
        recommendations: string[];
        /** Areas of concern */
        concerns: string[];
    };
    /** Analysis metadata */
    metadata: {
        /** Number of conversations analyzed */
        conversationCount: number;
        /** Total messages analyzed */
        messageCount: number;
        /** Analysis duration in milliseconds */
        analysisDuration: number;
        /** Granularity used */
        granularity: string;
        /** Components included */
        componentsIncluded: string[];
    };
}
/**
 * Dependencies required by AnalyzeProductivityPatternsTool
 */
export interface AnalyzeProductivityPatternsDependencies {
    analyticsEngine: AnalyticsEngine;
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
    productivityAnalyzer: ProductivityAnalyzer;
    productivityPatternsRepository: ProductivityPatternsRepository;
}
/**
 * Implementation of the analyze_productivity_patterns MCP tool
 */
export declare class AnalyzeProductivityPatternsTool extends BaseTool<AnalyzeProductivityPatternsInput, AnalyzeProductivityPatternsResponse> {
    private readonly analyticsEngine;
    private readonly conversationRepository;
    private readonly messageRepository;
    private readonly productivityAnalyzer;
    private readonly productivityPatternsRepository;
    constructor(dependencies: AnalyzeProductivityPatternsDependencies);
    /**
     * Execute the analyze_productivity_patterns tool
     */
    protected executeImpl(input: AnalyzeProductivityPatternsInput, _context: ToolContext): Promise<AnalyzeProductivityPatternsResponse>;
    /**
     * Get conversations and messages for analysis
     */
    private getAnalysisData;
    /**
     * Analyze peak productivity hours
     */
    private analyzePeakHours;
    /**
     * Analyze session patterns and optimal lengths
     */
    private analyzeSessionPatterns;
    /**
     * Analyze question patterns and effectiveness
     */
    private analyzeQuestionPatterns;
    /**
     * Identify productivity patterns
     */
    private identifyProductivityPatterns;
    /**
     * Analyze temporal trends
     */
    private analyzeTrends;
    /**
     * Generate insights and recommendations
     */
    private generateInsights;
    private calculateSessionMetrics;
    private findOptimalSessionLength;
    private calculateLengthDistribution;
    private calculateProductivityByLength;
    private groupSessionsByLength;
    private extractQuestionPatterns;
    private categorizeQuestions;
    private identifyQuestionBestPractices;
    private estimateConversationProductivity;
    private calculateHourlyProductivity;
    private calculateEngagementScore;
    private calculateSessionLengthCorrelation;
    private calculateWeeklyTrend;
    private calculateWeeklyProductivityData;
    private calculateMonthlyTrend;
    private calculateMonthlyProductivityData;
    private calculateProductivityByDayOfWeek;
    private calculateProductivityByHourOfDay;
    private createEmptyResponse;
    private createEmptySessionAnalysis;
    private createEmptyQuestionPatterns;
    /**
     * Static factory method to create an AnalyzeProductivityPatternsTool instance
     */
    static create(dependencies: AnalyzeProductivityPatternsDependencies): AnalyzeProductivityPatternsTool;
}
//# sourceMappingURL=AnalyzeProductivityPatternsTool.d.ts.map