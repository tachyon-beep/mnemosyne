/**
 * Pattern Detection Service - Temporal pattern detection and statistical analysis
 *
 * This service identifies recurring patterns in conversation data including:
 * - Unresolved action items and commitments
 * - Recurring questions without satisfactory answers
 * - Knowledge gaps and missing information
 * - Commitment tracking with temporal analysis
 */
import { BaseRepository } from '../../../storage/repositories/BaseRepository.js';
import { Message } from '../../../types/interfaces.js';
/**
 * Represents an unresolved action item
 */
export interface UnresolvedAction {
    /** Unique identifier for this action */
    id: string;
    /** The original commitment message */
    commitmentMessage: Message;
    /** The extracted commitment text */
    commitmentText: string;
    /** Pattern that matched the commitment */
    matchedPattern: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Days since the commitment was made */
    daysSinceCommitment: number;
    /** Whether there have been any follow-up mentions */
    hasFollowUp: boolean;
    /** Conversation ID where commitment was made */
    conversationId: string;
    /** Conversation title if available */
    conversationTitle?: string;
}
/**
 * Represents a recurring question pattern
 */
export interface RecurringQuestion {
    /** Unique identifier for this question pattern */
    id: string;
    /** The normalized question text */
    questionText: string;
    /** Number of times this question has been asked */
    frequency: number;
    /** Messages containing this question */
    instances: Message[];
    /** First time this question was asked */
    firstAskedAt: number;
    /** Most recent time this question was asked */
    lastAskedAt: number;
    /** Days between first and last occurrence */
    daysBetweenOccurrences: number;
    /** Average confidence score across instances */
    averageConfidence: number;
    /** Conversations where this question appeared */
    conversationIds: string[];
}
/**
 * Represents a knowledge gap
 */
export interface KnowledgeGap {
    /** Unique identifier for this knowledge gap */
    id: string;
    /** The topic or subject area */
    topic: string;
    /** Number of questions about this topic */
    questionCount: number;
    /** Number of answers provided */
    answerCount: number;
    /** Gap ratio (questions / answers) */
    gapRatio: number;
    /** Related messages for context */
    relatedMessages: Message[];
    /** First occurrence of questions on this topic */
    firstQuestionAt: number;
    /** Most recent question on this topic */
    lastQuestionAt: number;
    /** Confidence score for topic identification */
    topicConfidence: number;
}
/**
 * Represents a tracked commitment
 */
export interface TrackedCommitment {
    /** Unique identifier for this commitment */
    id: string;
    /** The commitment message */
    message: Message;
    /** Type of commitment */
    commitmentType: 'check' | 'follow_up' | 'update' | 'investigate' | 'temporal';
    /** Extracted commitment text */
    commitmentText: string;
    /** Confidence score (0-1) */
    confidence: number;
    /** Status of the commitment */
    status: 'pending' | 'mentioned' | 'resolved' | 'overdue';
    /** Expected resolution timeframe in days */
    expectedTimeframeDays?: number;
    /** Days since commitment was made */
    daysSinceCommitment: number;
    /** Follow-up messages if any */
    followUps: Message[];
}
/**
 * Pattern detection service for analyzing conversation patterns
 */
export declare class PatternDetectionService extends BaseRepository {
    /**
     * Commitment detection patterns
     */
    private static readonly COMMITMENT_PATTERNS;
    /**
     * Question patterns for identifying recurring questions
     */
    private static readonly QUESTION_PATTERNS;
    /**
     * Answer indicators
     */
    private static readonly ANSWER_INDICATORS;
    /**
     * Detect unresolved action items and commitments without follow-up
     */
    detectUnresolvedActions(options?: {
        conversationId?: string;
        daysSince?: number;
        minConfidence?: number;
        limit?: number;
    }): Promise<UnresolvedAction[]>;
    /**
     * Find recurring questions across conversations
     */
    findRecurringQuestions(options?: {
        conversationId?: string;
        minFrequency?: number;
        minDaysBetween?: number;
        limit?: number;
    }): Promise<RecurringQuestion[]>;
    /**
     * Identify knowledge gaps where questions exist but answers are inadequate
     */
    identifyKnowledgeGaps(options?: {
        conversationId?: string;
        minGapRatio?: number;
        limit?: number;
    }): Promise<KnowledgeGap[]>;
    /**
     * Track all commitments with their status and follow-ups
     */
    trackCommitments(options?: {
        conversationId?: string;
        includeResolved?: boolean;
        limit?: number;
    }): Promise<TrackedCommitment[]>;
    /**
     * Find commitment patterns in text
     */
    private findCommitmentPattern;
    /**
     * Calculate confidence score for a commitment
     */
    private calculateCommitmentConfidence;
    /**
     * Check if there's a follow-up mention of a commitment
     */
    private hasFollowUpMention;
    /**
     * Find follow-up messages related to a commitment
     */
    private findFollowUpMessages;
    /**
     * Check if a message is a question
     */
    private isQuestion;
    /**
     * Normalize question text for comparison
     */
    private normalizeQuestion;
    /**
     * Extract topic from question text
     */
    private extractTopic;
    /**
     * Find answers related to a topic
     */
    private findAnswersForTopic;
    /**
     * Check if content looks like an answer
     */
    private looksLikeAnswer;
    /**
     * Calculate confidence for topic identification
     */
    private calculateTopicConfidence;
    /**
     * Extract keywords from commitment text
     */
    private extractKeywords;
    /**
     * Determine commitment status based on follow-ups
     */
    private determineCommitmentStatus;
    /**
     * Classify the type of commitment
     */
    private classifyCommitmentType;
    /**
     * Extract timeframe from commitment text
     */
    private extractTimeframe;
}
//# sourceMappingURL=PatternDetectionService.d.ts.map