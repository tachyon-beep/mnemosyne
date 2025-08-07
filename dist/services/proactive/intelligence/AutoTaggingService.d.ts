import { DatabaseManager } from '../../../storage/Database.js';
import { Entity } from '../../../storage/repositories/EntityRepository.js';
/**
 * Auto-tagging service that automatically classifies and tags conversations
 * based on entity analysis, activity patterns, and urgency signals
 */
export interface TopicTag {
    name: string;
    type: 'entity' | 'theme' | 'domain';
    relevance: number;
    source: 'primary_entity' | 'entity_cluster' | 'keyword_analysis';
}
export interface ActivityClassification {
    type: 'discussion' | 'decision' | 'planning' | 'problem_solving' | 'learning' | 'review' | 'brainstorming';
    confidence: number;
    indicators: string[];
}
export interface UrgencyAnalysis {
    level: 'none' | 'low' | 'medium' | 'high' | 'critical';
    score: number;
    signals: string[];
    deadline?: Date;
}
export interface ProjectContext {
    name: string;
    entities: Entity[];
    confidence: number;
    type: 'ongoing' | 'new' | 'completed';
}
export interface AutoTaggingResult {
    conversationId: string;
    topicTags: TopicTag[];
    activity: ActivityClassification;
    urgency: UrgencyAnalysis;
    projectContexts: ProjectContext[];
    generatedAt: Date;
}
export interface AutoTaggingConfig {
    minEntityRelevance?: number;
    maxTopicTags?: number;
    minProjectConfidence?: number;
    urgencyKeywords?: string[];
    activityPatterns?: Record<string, RegExp[]>;
}
export declare class AutoTaggingService {
    private config;
    private dbManager;
    private readonly ACTIVITY_PATTERNS;
    private readonly URGENCY_KEYWORDS;
    constructor(dbManager: DatabaseManager, config?: Partial<AutoTaggingConfig>);
    /**
     * Generate topic tags from entity analysis
     */
    generateTopicTags(conversationId: string): Promise<TopicTag[]>;
    /**
     * Classify conversation activity type
     */
    classifyActivity(conversationId: string): Promise<ActivityClassification>;
    /**
     * Detect urgency signals in conversation
     */
    detectUrgencySignals(conversationId: string): Promise<UrgencyAnalysis>;
    /**
     * Identify project contexts from entity clustering
     */
    identifyProjectContexts(conversationId: string): Promise<ProjectContext[]>;
    /**
     * Perform complete auto-tagging for a conversation
     */
    autoTagConversation(conversationId: string): Promise<AutoTaggingResult>;
    private getConversationEntities;
    private getConversationMessages;
    private calculateEntityRelevance;
    private getEntityTypeScore;
    private findEntityClusters;
    private generateClusterName;
    private generateDomainTags;
    private getEntityDomain;
    private parseDeadline;
    private determineProjectType;
}
//# sourceMappingURL=AutoTaggingService.d.ts.map