/**
 * Get Conversation Analytics Tool Implementation
 *
 * This tool retrieves comprehensive analytics for a specific conversation including:
 * - Flow metrics (topics, transitions, depth, circularity)
 * - Productivity metrics (effectiveness, engagement, insights)
 * - Knowledge gap analysis (unresolved questions, information needs)
 * - Decision tracking (decisions made, outcomes, quality)
 */
import { GetConversationAnalyticsInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
import { ConversationFlowAnalyzer, ConversationFlowMetrics } from '../analytics/analyzers/ConversationFlowAnalyzer.js';
import { ProductivityAnalyzer, ProductivityMetrics } from '../analytics/analyzers/ProductivityAnalyzer.js';
import { KnowledgeGapDetector, DetectedKnowledgeGap } from '../analytics/analyzers/KnowledgeGapDetector.js';
import { DecisionTracker, Decision } from '../analytics/analyzers/DecisionTracker.js';
import { ConversationRepository } from '../storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
/**
 * Response interface for get_conversation_analytics tool
 */
export interface GetConversationAnalyticsResponse {
    /** Conversation ID that was analyzed */
    conversationId: string;
    /** When the analysis was performed */
    analyzedAt: number;
    /** Flow metrics (optional based on input) */
    flowMetrics?: ConversationFlowMetrics;
    /** Productivity metrics (optional based on input) */
    productivityMetrics?: ProductivityMetrics;
    /** Knowledge gaps identified (optional based on input) */
    knowledgeGaps?: DetectedKnowledgeGap[];
    /** Decisions tracked (optional based on input) */
    decisions?: Decision[];
    /** Summary insights */
    insights: {
        /** Overall conversation quality score (0-100) */
        qualityScore: number;
        /** Key strengths identified */
        strengths: string[];
        /** Areas for improvement */
        improvements: string[];
        /** Notable patterns */
        patterns: string[];
    };
    /** Metadata about the analysis */
    metadata: {
        /** Number of messages analyzed */
        messageCount: number;
        /** Analysis duration in milliseconds */
        analysisDuration: number;
        /** Components included in analysis */
        componentsIncluded: string[];
        /** Conversation title */
        conversationTitle?: string;
    };
}
/**
 * Dependencies required by GetConversationAnalyticsTool
 */
export interface GetConversationAnalyticsDependencies {
    analyticsEngine: AnalyticsEngine;
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
    conversationFlowAnalyzer: ConversationFlowAnalyzer;
    productivityAnalyzer: ProductivityAnalyzer;
    knowledgeGapDetector: KnowledgeGapDetector;
    decisionTracker: DecisionTracker;
}
/**
 * Implementation of the get_conversation_analytics MCP tool
 */
export declare class GetConversationAnalyticsTool extends BaseTool<GetConversationAnalyticsInput, GetConversationAnalyticsResponse> {
    private readonly analyticsEngine;
    private readonly conversationRepository;
    private readonly messageRepository;
    private readonly conversationFlowAnalyzer;
    private readonly productivityAnalyzer;
    private readonly knowledgeGapDetector;
    private readonly decisionTracker;
    constructor(dependencies: GetConversationAnalyticsDependencies);
    /**
     * Execute the get_conversation_analytics tool
     */
    protected executeImpl(input: GetConversationAnalyticsInput, _context: ToolContext): Promise<GetConversationAnalyticsResponse>;
    /**
     * Get conversation from database
     */
    private getConversation;
    /**
     * Get messages for conversation
     */
    private getMessages;
    /**
     * Analyze conversation flow metrics
     */
    private analyzeFlowMetrics;
    /**
     * Analyze productivity metrics
     */
    private analyzeProductivityMetrics;
    /**
     * Analyze knowledge gaps
     */
    private analyzeKnowledgeGaps;
    /**
     * Analyze decisions
     */
    private analyzeDecisions;
    /**
     * Generate insights from analysis results
     */
    private generateInsights;
    /**
     * Static factory method to create a GetConversationAnalyticsTool instance
     */
    static create(dependencies: GetConversationAnalyticsDependencies): GetConversationAnalyticsTool;
}
//# sourceMappingURL=GetConversationAnalyticsTool.d.ts.map