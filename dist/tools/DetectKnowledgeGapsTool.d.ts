/**
 * Detect Knowledge Gaps Tool Implementation
 *
 * This tool identifies knowledge gaps in conversations by analyzing:
 * - Unresolved questions and information needs
 * - Recurring topics that lack depth or resolution
 * - Areas where additional learning or research is needed
 * - Pattern recognition in knowledge-seeking behavior
 * - Topic coverage analysis and gaps in understanding
 */
import { DetectKnowledgeGapsInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
import { KnowledgeGapDetector, DetectedKnowledgeGap } from '../analytics/analyzers/KnowledgeGapDetector.js';
import { ConversationRepository } from '../storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { KnowledgeGapsRepository } from '../analytics/repositories/KnowledgeGapsRepository.js';
import { TimeRange } from '../analytics/repositories/AnalyticsRepository.js';
/**
 * Knowledge gap category classification
 */
export interface KnowledgeGapCategory {
    /** Category identifier */
    category: string;
    /** Category display name */
    name: string;
    /** Number of gaps in this category */
    gapCount: number;
    /** Average frequency of gaps in category */
    averageFrequency: number;
    /** Resolution rate for this category (0-1) */
    resolutionRate: number;
    /** Priority level (1-5, 5 being highest) */
    priority: number;
}
/**
 * Topic coverage analysis result
 */
export interface TopicCoverage {
    /** Topic identifier */
    topic: string;
    /** Number of times discussed */
    frequency: number;
    /** Depth of coverage (0-100) */
    coverageDepth: number;
    /** Whether topic has unresolved aspects */
    hasGaps: boolean;
    /** List of specific gaps in this topic */
    gaps: string[];
    /** Suggested learning resources */
    suggestedResources: string[];
}
/**
 * Resolution suggestion
 */
export interface ResolutionSuggestion {
    /** Gap ID this suggestion addresses */
    gapId: string;
    /** Suggestion type */
    type: 'research' | 'practice' | 'consultation' | 'experimentation';
    /** Suggested action */
    action: string;
    /** Priority level (1-5) */
    priority: number;
    /** Estimated effort level (1-5) */
    effort: number;
    /** Expected impact (1-5) */
    impact: number;
    /** Suggested resources or next steps */
    resources: string[];
}
/**
 * Response interface for detect_knowledge_gaps tool
 */
export interface DetectKnowledgeGapsResponse {
    /** Time range analyzed */
    timeRange: TimeRange;
    /** When the analysis was performed */
    analyzedAt: number;
    /** Identified knowledge gaps */
    knowledgeGaps: DetectedKnowledgeGap[];
    /** Knowledge gap categories */
    categories: KnowledgeGapCategory[];
    /** Topic coverage analysis */
    topicCoverage: TopicCoverage[];
    /** Resolution suggestions (if requested) */
    resolutionSuggestions?: ResolutionSuggestion[];
    /** Gap frequency analysis */
    frequencyAnalysis: {
        /** Most frequent unresolved topics */
        mostFrequent: Array<{
            topic: string;
            frequency: number;
            lastSeen: number;
        }>;
        /** Trending topics with increasing gaps */
        trending: Array<{
            topic: string;
            trend: number;
            currentFrequency: number;
        }>;
        /** Topics with declining gaps (being resolved) */
        improving: Array<{
            topic: string;
            trend: number;
            resolutionRate: number;
        }>;
    };
    /** Learning recommendations */
    learningRecommendations: {
        /** High priority learning areas */
        highPriority: string[];
        /** Suggested learning paths */
        learningPaths: Array<{
            path: string;
            topics: string[];
            estimatedEffort: string;
            expectedImpact: string;
        }>;
        /** Recommended resources */
        resources: Array<{
            type: 'book' | 'course' | 'documentation' | 'practice';
            title: string;
            relevance: string;
            topics: string[];
        }>;
    };
    /** Insights and analysis */
    insights: {
        /** Key insights about knowledge gaps */
        keyInsights: string[];
        /** Areas of concern */
        concerns: string[];
        /** Progress indicators */
        progress: string[];
        /** Actionable next steps */
        nextSteps: string[];
    };
    /** Analysis metadata */
    metadata: {
        /** Number of conversations analyzed */
        conversationCount: number;
        /** Total messages analyzed */
        messageCount: number;
        /** Total gaps identified */
        totalGaps: number;
        /** Unresolved gap count */
        unresolvedGaps: number;
        /** Analysis duration in milliseconds */
        analysisDuration: number;
        /** Minimum frequency threshold used */
        minFrequency: number;
        /** Whether resolved gaps were included */
        includedResolved: boolean;
    };
}
/**
 * Dependencies required by DetectKnowledgeGapsTool
 */
export interface DetectKnowledgeGapsDependencies {
    analyticsEngine: AnalyticsEngine;
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
    knowledgeGapDetector: KnowledgeGapDetector;
    knowledgeGapsRepository: KnowledgeGapsRepository;
}
/**
 * Implementation of the detect_knowledge_gaps MCP tool
 */
export declare class DetectKnowledgeGapsTool extends BaseTool<DetectKnowledgeGapsInput, DetectKnowledgeGapsResponse> {
    private readonly analyticsEngine;
    private readonly conversationRepository;
    private readonly messageRepository;
    private readonly knowledgeGapDetector;
    private readonly knowledgeGapsRepository;
    constructor(dependencies: DetectKnowledgeGapsDependencies);
    /**
     * Execute the detect_knowledge_gaps tool
     */
    protected executeImpl(input: DetectKnowledgeGapsInput, _context: ToolContext): Promise<DetectKnowledgeGapsResponse>;
    /**
     * Get conversations and messages for analysis
     */
    private getAnalysisData;
    /**
     * Detect knowledge gaps in conversations
     */
    private detectGaps;
    /**
     * Analyze knowledge gap categories
     */
    private analyzeGapCategories;
    /**
     * Analyze topic coverage
     */
    private analyzeTopicCoverage;
    /**
     * Analyze gap frequency patterns
     */
    private analyzeGapFrequency;
    /**
     * Generate resolution suggestions
     */
    private generateResolutionSuggestions;
    /**
     * Generate learning recommendations
     */
    private generateLearningRecommendations;
    /**
     * Generate insights and analysis
     */
    private generateInsights;
    private deduplicateGaps;
    private formatCategoryName;
    private calculateCategoryPriority;
    private extractTopicsFromMessages;
    private cleanWord;
    private isMeaningfulTopicWord;
    private isMeaningfulPhrase;
    private isTechnicalPhrase;
    private addTopicCandidate;
    private extractDomainSpecificTopics;
    private rankTopics;
    private isTechnicalTerm;
    private isStopWord;
    private isCommonWord;
    private calculateCoverageDepth;
    private analyzeQuestionDepth;
    private calculateTopicBreadth;
    private analyzeFollowUpPatterns;
    private hasTopicContinuity;
    private analyzeTechnicalDepth;
    private suggestResourcesForTopic;
    private calculateTrendingGaps;
    private calculateImprovingTopics;
    private calculateTrend;
    private determineSuggestionType;
    private generateActionSuggestion;
    private estimateEffort;
    private estimateImpact;
    private suggestResources;
    private generateLearningPaths;
    private generateResourceRecommendations;
    private createEmptyResponse;
    /**
     * Static factory method to create a DetectKnowledgeGapsTool instance
     */
    static create(dependencies: DetectKnowledgeGapsDependencies): DetectKnowledgeGapsTool;
}
//# sourceMappingURL=DetectKnowledgeGapsTool.d.ts.map