/**
 * Get Conversation Analytics Tool Implementation
 *
 * This tool retrieves comprehensive analytics for a specific conversation including:
 * - Flow metrics (topics, transitions, depth, circularity)
 * - Productivity metrics (effectiveness, engagement, insights)
 * - Knowledge gap analysis (unresolved questions, information needs)
 * - Decision tracking (decisions made, outcomes, quality)
 */
import { GetConversationAnalyticsToolDef as GetConversationAnalyticsToolDef } from '../types/mcp.js';
import { GetConversationAnalyticsSchema } from '../types/schemas.js';
import { BaseTool, NotFoundError, wrapDatabaseOperation } from './BaseTool.js';
import { validateConversationId, ValidationError, formatValidationError, withEnhancedValidation } from '../utils/validation.js';
/**
 * Implementation of the get_conversation_analytics MCP tool
 */
export class GetConversationAnalyticsTool extends BaseTool {
    analyticsEngine;
    conversationRepository;
    messageRepository;
    conversationFlowAnalyzer;
    productivityAnalyzer;
    knowledgeGapDetector;
    decisionTracker;
    constructor(dependencies) {
        super(GetConversationAnalyticsToolDef, GetConversationAnalyticsSchema);
        this.analyticsEngine = dependencies.analyticsEngine;
        this.conversationRepository = dependencies.conversationRepository;
        this.messageRepository = dependencies.messageRepository;
        this.conversationFlowAnalyzer = dependencies.conversationFlowAnalyzer;
        this.productivityAnalyzer = dependencies.productivityAnalyzer;
        this.knowledgeGapDetector = dependencies.knowledgeGapDetector;
        this.decisionTracker = dependencies.decisionTracker;
    }
    /**
     * Execute the get_conversation_analytics tool
     */
    async executeImpl(input, _context) {
        const startTime = Date.now();
        const componentsIncluded = [];
        try {
            // Step 1: Enhanced validation with comprehensive input checking
            const validatedInput = withEnhancedValidation(() => {
                // Validate conversation ID format and constraints
                const conversationId = validateConversationId(input.conversationId, 'conversationId', true);
                return {
                    conversationId,
                    includeFlowMetrics: input.includeFlowMetrics,
                    includeProductivityMetrics: input.includeProductivityMetrics,
                    includeKnowledgeGaps: input.includeKnowledgeGaps,
                    includeDecisionTracking: input.includeDecisionTracking
                };
            }, 'conversation analytics input validation');
            // Step 2: Validate conversation exists and get conversation data
            const conversation = await this.getConversation(validatedInput.conversationId);
            const messages = await this.getMessages(validatedInput.conversationId);
            if (messages.length === 0) {
                throw new NotFoundError(`No messages found for conversation ${validatedInput.conversationId}`);
            }
            // Step 3: Run analytics components based on input flags
            const [flowMetrics, productivityMetrics, knowledgeGaps, decisions] = await Promise.all([
                validatedInput.includeFlowMetrics ? this.analyzeFlowMetrics(conversation, messages, componentsIncluded) : Promise.resolve(undefined),
                validatedInput.includeProductivityMetrics ? this.analyzeProductivityMetrics(conversation, messages, componentsIncluded) : Promise.resolve(undefined),
                validatedInput.includeKnowledgeGaps ? this.analyzeKnowledgeGaps(conversation, messages, componentsIncluded) : Promise.resolve(undefined),
                validatedInput.includeDecisionTracking ? this.analyzeDecisions(conversation, messages, componentsIncluded) : Promise.resolve(undefined)
            ]);
            // Step 4: Generate insights
            const insights = this.generateInsights(flowMetrics, productivityMetrics, knowledgeGaps, decisions);
            // Step 5: Build response metadata
            const analysisDuration = Date.now() - startTime;
            const metadata = {
                messageCount: messages.length,
                analysisDuration,
                componentsIncluded,
                conversationTitle: conversation.title
            };
            return {
                conversationId: validatedInput.conversationId,
                analyzedAt: Date.now(),
                flowMetrics,
                productivityMetrics,
                knowledgeGaps,
                decisions,
                insights,
                metadata
            };
        }
        catch (error) {
            // Enhanced error handling with user-friendly messages
            if (error instanceof ValidationError) {
                throw new Error(JSON.stringify(formatValidationError(error)));
            }
            // Re-throw other errors with context
            throw new Error(`Conversation analytics failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get conversation from database
     */
    async getConversation(conversationId) {
        return wrapDatabaseOperation(async () => {
            const conversation = await this.conversationRepository.findById(conversationId);
            if (!conversation) {
                throw new NotFoundError(`Conversation ${conversationId} not found`);
            }
            return conversation;
        }, 'Failed to retrieve conversation');
    }
    /**
     * Get messages for conversation
     */
    async getMessages(conversationId) {
        return wrapDatabaseOperation(async () => {
            const messages = await this.messageRepository.findByConversationId(conversationId);
            return messages;
        }, 'Failed to retrieve messages');
    }
    /**
     * Analyze conversation flow metrics
     */
    async analyzeFlowMetrics(conversation, messages, componentsIncluded) {
        componentsIncluded.push('flow_metrics');
        return wrapDatabaseOperation(async () => {
            return await this.conversationFlowAnalyzer.analyzeFlow(conversation, messages);
        }, 'Failed to analyze conversation flow metrics');
    }
    /**
     * Analyze productivity metrics
     */
    async analyzeProductivityMetrics(conversation, messages, componentsIncluded) {
        componentsIncluded.push('productivity_metrics');
        return wrapDatabaseOperation(async () => {
            return await this.productivityAnalyzer.analyzeConversationProductivity(conversation, messages);
        }, 'Failed to analyze productivity metrics');
    }
    /**
     * Analyze knowledge gaps
     */
    async analyzeKnowledgeGaps(conversation, messages, componentsIncluded) {
        componentsIncluded.push('knowledge_gaps');
        return wrapDatabaseOperation(async () => {
            return await this.knowledgeGapDetector.detectGaps([{ conversation, messages }]);
        }, 'Failed to analyze knowledge gaps');
    }
    /**
     * Analyze decisions
     */
    async analyzeDecisions(conversation, messages, componentsIncluded) {
        componentsIncluded.push('decision_tracking');
        return wrapDatabaseOperation(async () => {
            return await this.decisionTracker.trackDecisions(conversation, messages);
        }, 'Failed to track decisions');
    }
    /**
     * Generate insights from analysis results
     */
    generateInsights(flowMetrics, productivityMetrics, knowledgeGaps, decisions) {
        const strengths = [];
        const improvements = [];
        const patterns = [];
        let qualityScore = 0;
        let scoreComponents = 0;
        // Flow insights
        if (flowMetrics) {
            qualityScore += flowMetrics.coherenceScore;
            scoreComponents++;
            if (flowMetrics.depthScore > 75) {
                strengths.push('Deep, thorough exploration of topics');
            }
            if (flowMetrics.circularityIndex < 0.3) {
                strengths.push('Good logical progression with minimal repetition');
            }
            else if (flowMetrics.circularityIndex > 0.6) {
                improvements.push('Reduce circular discussions and topic repetition');
            }
            if (flowMetrics.topicCount > 5) {
                patterns.push(`Wide-ranging discussion covering ${flowMetrics.topicCount} distinct topics`);
            }
        }
        // Productivity insights
        if (productivityMetrics) {
            qualityScore += productivityMetrics.overallProductivityScore;
            scoreComponents++;
            if (productivityMetrics.effectivenessScore > 80) {
                strengths.push('High effectiveness in achieving outcomes');
            }
            if (productivityMetrics.questionMetrics.questionQualityScore > 75) {
                strengths.push('Well-crafted, insightful questions');
            }
            else if (productivityMetrics.questionMetrics.questionQualityScore < 50) {
                improvements.push('Improve question quality and specificity');
            }
            if (productivityMetrics.outputMetrics.insightCount > 0) {
                patterns.push(`Generated ${productivityMetrics.outputMetrics.insightCount} valuable insights`);
            }
        }
        // Knowledge gap insights
        if (knowledgeGaps && knowledgeGaps.length > 0) {
            const unresolvedGaps = knowledgeGaps.filter(gap => gap.frequency && gap.frequency > 1); // Using frequency as proxy for unresolved
            if (unresolvedGaps.length > 0) {
                improvements.push(`Address ${unresolvedGaps.length} unresolved knowledge gaps`);
                patterns.push(`Identified ${knowledgeGaps.length} knowledge gaps, ${unresolvedGaps.length} unresolved`);
            }
            else {
                strengths.push('All identified knowledge gaps were resolved');
            }
        }
        // Decision insights
        if (decisions && decisions.length > 0) {
            const highQualityDecisions = decisions.filter(d => d.clarityScore && d.clarityScore > 75);
            if (highQualityDecisions.length > 0) {
                strengths.push(`Made ${highQualityDecisions.length} high-quality decisions`);
            }
            patterns.push(`${decisions.length} decisions identified in conversation`);
        }
        // Calculate final quality score
        const finalQualityScore = scoreComponents > 0 ? Math.round(qualityScore / scoreComponents) : 50;
        // Add general insights based on overall quality
        if (finalQualityScore > 80) {
            strengths.push('Exceptional overall conversation quality');
        }
        else if (finalQualityScore < 40) {
            improvements.push('Focus on increasing conversation depth and engagement');
        }
        return {
            qualityScore: finalQualityScore,
            strengths: strengths.length > 0 ? strengths : ['Conversation completed successfully'],
            improvements: improvements.length > 0 ? improvements : ['Continue current approach'],
            patterns: patterns.length > 0 ? patterns : ['Standard conversation pattern observed']
        };
    }
    /**
     * Static factory method to create a GetConversationAnalyticsTool instance
     */
    static create(dependencies) {
        return new GetConversationAnalyticsTool(dependencies);
    }
}
//# sourceMappingURL=GetConversationAnalyticsTool.js.map