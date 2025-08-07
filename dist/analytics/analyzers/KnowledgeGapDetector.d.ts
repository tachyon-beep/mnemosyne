/**
 * Knowledge Gap Detector
 *
 * Identifies and analyzes knowledge gaps in conversations:
 * - Question clustering and gap identification
 * - Topic coverage analysis
 * - Learning curve tracking
 * - Expertise mapping
 * - Gap resolution monitoring
 * - Personalized learning recommendations
 */
import { Message, Conversation } from '../../types/interfaces.js';
export interface DetectedKnowledgeGap {
    id: string;
    type: 'question' | 'topic' | 'skill' | 'concept';
    content: string;
    normalizedContent: string;
    frequency: number;
    firstOccurrence: number;
    lastOccurrence: number;
    explorationDepth: number;
    sourceConversations: string[];
    relatedQuestions: string[];
    relatedTopics: string[];
    urgency: 'critical' | 'high' | 'medium' | 'low';
    resolutionComplexity: number;
    learningPath: string[];
    suggestedActions: string[];
    recommendedResources: string[];
    estimatedLearningTime: number;
}
export interface QuestionCluster {
    clusterId: string;
    centerQuestion: string;
    questions: Array<{
        content: string;
        conversationId: string;
        timestamp: number;
        similarity: number;
    }>;
    frequency: number;
    averageSimilarity: number;
    resolved: boolean;
    resolutionConfidence: number;
}
export interface TopicCoverageAnalysis {
    topic: string;
    normalizedTopic: string;
    mentionFrequency: number;
    explorationDepth: number;
    coverageCompleteness: number;
    firstMention: number;
    lastMention: number;
    developmentTrajectory: Array<{
        timestamp: number;
        understandingLevel: number;
    }>;
    identifiedGaps: string[];
    missingConcepts: string[];
    unclarifiedAspects: string[];
    relatedTopics: string[];
    prerequisiteTopics: string[];
    dependentTopics: string[];
}
export interface LearningCurve {
    topic: string;
    dataPoints: Array<{
        timestamp: number;
        understandingLevel: number;
        conversationId: string;
        evidence: string[];
    }>;
    gradient: number;
    plateauLevel: number;
    timeToMastery: number;
    currentLevel: number;
    learningPattern: 'rapid' | 'steady' | 'slow' | 'plateaued' | 'declining';
    challenges: string[];
    accelerators: string[];
    nextSteps: string[];
}
export interface ExpertiseDomain {
    domain: string;
    knowledgeLevel: number;
    confidenceLevel: number;
    applicationLevel: number;
    strongAreas: string[];
    weakAreas: string[];
    gapAreas: string[];
    growthPotential: number;
    learningVelocity: number;
    priorityScore: number;
}
/**
 * Detects and analyzes knowledge gaps using NLP and clustering techniques
 */
export declare class KnowledgeGapDetector {
    private readonly MIN_CLUSTER_SIZE;
    private readonly SIMILARITY_THRESHOLD;
    private readonly EXPLORATION_THRESHOLD;
    private readonly LEARNING_CURVE_MIN_POINTS;
    /**
     * Detect knowledge gaps in a set of conversations
     */
    detectGaps(conversations: Array<{
        conversation: Conversation;
        messages: Message[];
    }>): Promise<DetectedKnowledgeGap[]>;
    /**
     * Safe wrapper methods for error handling
     */
    private safeClusterQuestions;
    private safeProcessQuestionClusters;
    private safeAnalyzeTopicCoverage;
    private safeProcessTopicCoverage;
    private safeIdentifySkillGaps;
    private safeFindConceptualGaps;
    private safeEnrichGapAnalysis;
    private safePrioritizeGaps;
    /**
     * Cluster similar questions using content similarity
     */
    clusterQuestions(messages: Array<Message & {
        conversationId: string;
    }>): Promise<QuestionCluster[]>;
    private safeExtractQuestions;
    private safeCalculateQuestionSimilarity;
    private safeGenerateClusterId;
    private safeFindCenterQuestion;
    private safeCalculateAverageSimilarity;
    private safeAssessClusterResolution;
    private safeCalculateResolutionConfidence;
    /**
     * Analyze topic coverage and identify gaps
     */
    analyzeTopicCoverage(messages: Array<Message & {
        conversationId: string;
    }>): Promise<TopicCoverageAnalysis[]>;
    private safeExtractTopicMentions;
    private safeAnalyzeTopicEvolution;
    /**
     * Generate learning curves for topics
     */
    generateLearningCurves(conversations: Array<{
        conversation: Conversation;
        messages: Message[];
    }>, topics?: string[]): Promise<LearningCurve[]>;
    private safeBuildLearningCurve;
    /**
     * Map expertise domains
     */
    mapExpertiseDomains(conversations: Array<{
        conversation: Conversation;
        messages: Message[];
    }>): Promise<ExpertiseDomain[]>;
    private safeIdentifyDomains;
    private safeFilterMessagesByDomain;
    private safeAssessDomainExpertise;
    /**
     * Private helper methods
     */
    private extractQuestions;
    private calculateQuestionSimilarity;
    private safeTokenizeQuestion;
    private safeCalculateStructuralSimilarity;
    private tokenizeQuestion;
    private isStopWord;
    private isQuestionWord;
    private calculateStructuralSimilarity;
    private extractQuestionStructure;
    private generateClusterId;
    private findCenterQuestion;
    private calculateAverageSimilarity;
    private assessClusterResolution;
    private calculateResolutionConfidence;
    private containsResolutionIndicators;
    private containsUnderstandingIndicators;
    private extractTopicMentions;
    private extractMessageTopics;
    private isSignificantBigram;
    private isSignificantTopic;
    private analyzeTopicEvolution;
    private calculateTopicExplorationDepth;
    private buildDevelopmentTrajectory;
    private assessMessageComplexity;
    private identifyTopicGaps;
    private getCommonTopicAspects;
    private extractDiscussedAspects;
    private identifyMissingConcepts;
    private getRelatedConcepts;
    private extractMentionedConcepts;
    private identifyUnclarifiedAspects;
    private containsUncertaintyIndicators;
    private extractUncertainAspects;
    private buildLearningCurve;
    private identifyDomains;
    private filterMessagesByDomain;
    private assessDomainExpertise;
    private clustersToGaps;
    private topicsToGaps;
    private identifySkillGaps;
    private findConceptualGaps;
    private enrichGapAnalysis;
    private prioritizeGaps;
    private calculateGapPriorityScore;
    private calculateRecencyWeight;
    private normalizeContent;
    private determineUrgency;
    private determineTopicUrgency;
    private estimateComplexity;
    private estimateTopicComplexity;
    private generateLearningPath;
    private generateTopicLearningPath;
    private generateActions;
    private generateTopicActions;
    private generateTopicResources;
    private estimateLearningTime;
    private estimateTopicLearningTime;
    private normalizeTopicName;
    private calculateCoverageCompleteness;
    private findRelatedTopics;
    private identifyPrerequisites;
    private identifyDependentTopics;
}
//# sourceMappingURL=KnowledgeGapDetector.d.ts.map