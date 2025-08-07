/**
 * Conversation Flow Analyzer
 *
 * Analyzes conversation flow patterns and dynamics:
 * - Topic extraction from messages
 * - Topic transition analysis
 * - Conversation depth measurement
 * - Circularity detection using graph algorithms
 * - Resolution velocity tracking
 * - Discussion quality assessment
 */
import { Message, Conversation } from '../../types/interfaces.js';
export interface Topic {
    id: string;
    content: string;
    normalizedContent: string;
    timestamp: number;
    messageId: string;
    confidence: number;
    weight: number;
    embedding?: number[];
}
export interface TopicTransition {
    fromTopic: string;
    toTopic: string;
    timestamp: number;
    transitionType: 'natural' | 'abrupt' | 'return' | 'tangent';
    confidence: number;
    timeGap: number;
}
export interface ConversationFlowMetrics {
    conversationId: string;
    analyzedAt: number;
    topics: Topic[];
    topicTransitions: TopicTransition[];
    topicCount: number;
    transitionCount: number;
    depthScore: number;
    circularityIndex: number;
    coherenceScore: number;
    progressionScore: number;
    resolutionTime?: number;
    averageTopicDuration: number;
    fastestTransition: number;
    slowestTransition: number;
    questionDensity: number;
    insightDensity: number;
    participationBalance: number;
    messageCount: number;
    averageMessageLength: number;
    vocabularyRichness: number;
}
export interface CircularityAnalysis {
    stronglyConnectedComponents: string[][];
    cycleCount: number;
    averageCycleLength: number;
    maxCycleLength: number;
    nodesInCycles: number;
    circularityIndex: number;
}
/**
 * Analyzes conversation flow patterns using NLP and graph algorithms
 */
export declare class ConversationFlowAnalyzer {
    private readonly MIN_TOPIC_LENGTH;
    private readonly MAX_TOPIC_LENGTH;
    private readonly TOPIC_CONFIDENCE_THRESHOLD;
    private readonly TRANSITION_TIME_THRESHOLD;
    /**
     * Analyze complete conversation flow
     */
    analyzeFlow(conversation: Conversation, messages: Message[]): Promise<ConversationFlowMetrics>;
    /**
     * Safe wrapper methods for error handling
     */
    private createDefaultFlowMetrics;
    private safeExtractTopics;
    private safeBuildTransitionGraph;
    private safeCalculateDepthScore;
    private safeAnalyzeCircularity;
    private safeCalculateCoherence;
    private safeCalculateProgression;
    private safeAnalyzeTimingPatterns;
    private safeCalculateEngagementMetrics;
    private safeCalculateContentMetrics;
    private safeDetectResolutionTime;
    /**
     * Extract topics from messages using NLP techniques
     */
    private extractTopics;
    private safeExtractMessageTopics;
    /**
     * Extract topics from a single message
     */
    private extractMessageTopics;
    /**
     * Build topic transition graph
     */
    private buildTransitionGraph;
    private safeClassifyTransition;
    private safeCalculateTransitionConfidence;
    /**
     * Analyze circularity using Tarjan's strongly connected components algorithm
     */
    private analyzeCircularity;
    private getDefaultCircularityAnalysis;
    private safeFindStronglyConnectedComponents;
    /**
     * Tarjan's algorithm for finding strongly connected components
     */
    private findStronglyConnectedComponents;
    /**
     * Calculate conversation depth score
     */
    private calculateDepthScore;
    private safeCalculateVocabularyRichness;
    private safeCalculateTopicDepth;
    private safeCalculateQuestionComplexity;
    /**
     * Calculate coherence score (how well topics flow together)
     */
    private calculateCoherence;
    /**
     * Calculate progression score (how topics build upon each other)
     */
    private calculateProgression;
    private safeCalculateTopicEvolution;
    /**
     * Analyze timing patterns in conversation
     */
    private analyzeTimingPatterns;
    /**
     * Calculate engagement metrics
     */
    private calculateEngagementMetrics;
    /**
     * Calculate content metrics
     */
    private calculateContentMetrics;
    /**
     * Helper methods
     */
    private tokenize;
    private generateNgrams;
    private isStopWord;
    private normalizeTopicContent;
    private isValidTopic;
    private calculateTopicConfidence;
    private generateTopicId;
    private extractQuestionTopic;
    private classifyTransition;
    private calculateTransitionConfidence;
    private calculateTopicSimilarity;
    private calculateVocabularyRichness;
    private calculateTopicDepth;
    private calculateQuestionComplexity;
    private calculateTopicEvolution;
    private detectResolutionTime;
}
//# sourceMappingURL=ConversationFlowAnalyzer.d.ts.map