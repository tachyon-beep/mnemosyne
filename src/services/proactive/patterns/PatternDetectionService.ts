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
export class PatternDetectionService extends BaseRepository {

  /**
   * Commitment detection patterns
   */
  private static readonly COMMITMENT_PATTERNS = [
    /I'll\s+(?:check|look into|follow up|get back|update)/i,
    /let me\s+(?:check|look into|find out|investigate)/i,
    /I need to\s+(?:check|verify|confirm|update)/i,
    /(?:by|before|after)\s+(?:tomorrow|friday|next week|end of)/i,
  ];

  /**
   * Question patterns for identifying recurring questions
   */
  private static readonly QUESTION_PATTERNS = [
    /^(?:what|how|when|where|why|who|which|can|could|would|should|is|are|do|does|did)\s+/i,
    /\?$/,
    /^(?:explain|describe|tell me|show me)/i,
  ];

  /**
   * Answer indicators
   */
  private static readonly ANSWER_INDICATORS = [
    /^(?:the answer is|here's|this is|you can|to do this)/i,
    /^(?:according to|based on|in my experience)/i,
    /^(?:yes,|no,|sure,|definitely|certainly)/i,
  ];

  /**
   * Detect unresolved action items and commitments without follow-up
   */
  async detectUnresolvedActions(
    options: {
      conversationId?: string;
      daysSince?: number;
      minConfidence?: number;
      limit?: number;
    } = {}
  ): Promise<UnresolvedAction[]> {
    const {
      conversationId,
      daysSince = 7,
      minConfidence = 0.6,
      limit = 50
    } = options;

    const cutoffTimestamp = Date.now() - (daysSince * 24 * 60 * 60 * 1000);
    
    // Build query to find messages with commitment patterns
    let whereClause = 'WHERE m.created_at < ? AND m.role = ?';
    const params: any[] = [cutoffTimestamp, 'assistant'];

    if (conversationId) {
      whereClause += ' AND m.conversation_id = ?';
      params.push(conversationId);
    }

    params.push(limit);

    const messages = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
      conversation_title: string | null;
    }>(
      'find_potential_commitments',
      `SELECT m.*, c.title as conversation_title
       FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT ?`,
      params
    );

    const unresolvedActions: UnresolvedAction[] = [];

    for (const row of messages) {
      const message: Message = {
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role as 'user' | 'assistant' | 'system',
        content: row.content,
        createdAt: row.created_at,
        parentMessageId: row.parent_message_id || undefined,
        metadata: this.parseMetadata(row.metadata),
        embedding: row.embedding ? Array.from(new Float32Array(row.embedding.buffer)) : undefined
      };

      // Check if message contains commitment patterns
      const commitmentMatch = this.findCommitmentPattern(message.content);
      if (!commitmentMatch || commitmentMatch.confidence < minConfidence) {
        continue;
      }

      // Check for follow-up messages
      const hasFollowUp = await this.hasFollowUpMention(
        message.conversationId,
        message.createdAt,
        commitmentMatch.commitmentText
      );

      const daysSinceCommitment = Math.floor(
        (Date.now() - message.createdAt) / (24 * 60 * 60 * 1000)
      );

      unresolvedActions.push({
        id: this.generateId(),
        commitmentMessage: message,
        commitmentText: commitmentMatch.commitmentText,
        matchedPattern: commitmentMatch.pattern,
        confidence: commitmentMatch.confidence,
        daysSinceCommitment,
        hasFollowUp,
        conversationId: message.conversationId,
        conversationTitle: row.conversation_title || undefined
      });
    }

    return unresolvedActions.filter(action => !action.hasFollowUp);
  }

  /**
   * Find recurring questions across conversations
   */
  async findRecurringQuestions(
    options: {
      conversationId?: string;
      minFrequency?: number;
      minDaysBetween?: number;
      limit?: number;
    } = {}
  ): Promise<RecurringQuestion[]> {
    const {
      conversationId,
      minFrequency = 2,
      minDaysBetween = 1,
      limit = 20
    } = options;

    let whereClause = 'WHERE m.role = ?';
    const params: any[] = ['user'];

    if (conversationId) {
      whereClause += ' AND m.conversation_id = ?';
      params.push(conversationId);
    }

    const messages = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
    }>(
      'find_question_messages',
      `SELECT m.*
       FROM messages m
       ${whereClause}
       ORDER BY m.created_at DESC`,
      params
    );

    // Group similar questions
    const questionGroups = new Map<string, Message[]>();

    for (const row of messages) {
      const message: Message = {
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role as 'user' | 'assistant' | 'system',
        content: row.content,
        createdAt: row.created_at,
        parentMessageId: row.parent_message_id || undefined,
        metadata: this.parseMetadata(row.metadata)
      };

      if (this.isQuestion(message.content)) {
        const normalizedQuestion = this.normalizeQuestion(message.content);
        
        if (!questionGroups.has(normalizedQuestion)) {
          questionGroups.set(normalizedQuestion, []);
        }
        questionGroups.get(normalizedQuestion)!.push(message);
      }
    }

    const recurringQuestions: RecurringQuestion[] = [];

    for (const [questionText, instances] of questionGroups.entries()) {
      if (instances.length < minFrequency) {
        continue;
      }

      const sortedInstances = instances.sort((a, b) => a.createdAt - b.createdAt);
      const firstAskedAt = sortedInstances[0].createdAt;
      const lastAskedAt = sortedInstances[sortedInstances.length - 1].createdAt;
      const daysBetween = Math.floor((lastAskedAt - firstAskedAt) / (24 * 60 * 60 * 1000));

      if (daysBetween < minDaysBetween) {
        continue;
      }

      const conversationIds = [...new Set(instances.map(msg => msg.conversationId))];

      recurringQuestions.push({
        id: this.generateId(),
        questionText,
        frequency: instances.length,
        instances: sortedInstances,
        firstAskedAt,
        lastAskedAt,
        daysBetweenOccurrences: daysBetween,
        averageConfidence: 0.8, // Static confidence for question detection
        conversationIds
      });
    }

    return recurringQuestions
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Identify knowledge gaps where questions exist but answers are inadequate
   */
  async identifyKnowledgeGaps(
    options: {
      conversationId?: string;
      minGapRatio?: number;
      limit?: number;
    } = {}
  ): Promise<KnowledgeGap[]> {
    const {
      conversationId,
      minGapRatio = 1.5,
      limit = 15
    } = options;

    // Get question and answer patterns
    const recurringQuestions = await this.findRecurringQuestions({ conversationId });
    
    const knowledgeGaps: KnowledgeGap[] = [];
    const topicMap = new Map<string, { questions: Message[], answers: Message[] }>();

    // Group questions by topic
    for (const question of recurringQuestions) {
      const topic = this.extractTopic(question.questionText);
      
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { questions: [], answers: [] });
      }
      
      topicMap.get(topic)!.questions.push(...question.instances);
    }

    // Find answers for each topic
    for (const [topic, data] of topicMap.entries()) {
      const answers = await this.findAnswersForTopic(
        topic,
        data.questions,
        conversationId
      );
      
      data.answers = answers;

      const gapRatio = data.questions.length / Math.max(answers.length, 1);
      
      if (gapRatio >= minGapRatio) {
        const allMessages = [...data.questions, ...data.answers]
          .sort((a, b) => a.createdAt - b.createdAt);
        
        const questionTimestamps = data.questions.map(q => q.createdAt);
        const firstQuestionAt = Math.min(...questionTimestamps);
        const lastQuestionAt = Math.max(...questionTimestamps);

        knowledgeGaps.push({
          id: this.generateId(),
          topic,
          questionCount: data.questions.length,
          answerCount: answers.length,
          gapRatio,
          relatedMessages: allMessages,
          firstQuestionAt,
          lastQuestionAt,
          topicConfidence: this.calculateTopicConfidence(topic, data.questions)
        });
      }
    }

    return knowledgeGaps
      .sort((a, b) => b.gapRatio - a.gapRatio)
      .slice(0, limit);
  }

  /**
   * Track all commitments with their status and follow-ups
   */
  async trackCommitments(
    options: {
      conversationId?: string;
      includeResolved?: boolean;
      limit?: number;
    } = {}
  ): Promise<TrackedCommitment[]> {
    const {
      conversationId,
      includeResolved = false,
      limit = 30
    } = options;

    // Find all messages with commitment patterns
    let whereClause = 'WHERE m.role = ?';
    const params: any[] = ['assistant'];

    if (conversationId) {
      whereClause += ' AND m.conversation_id = ?';
      params.push(conversationId);
    }

    params.push(limit * 2); // Get more to filter later

    const messages = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
    }>(
      'find_commitment_messages',
      `SELECT m.*
       FROM messages m
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT ?`,
      params
    );

    const commitments: TrackedCommitment[] = [];

    for (const row of messages) {
      const message: Message = {
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role as 'user' | 'assistant' | 'system',
        content: row.content,
        createdAt: row.created_at,
        parentMessageId: row.parent_message_id || undefined,
        metadata: this.parseMetadata(row.metadata)
      };

      const commitmentMatch = this.findCommitmentPattern(message.content);
      if (!commitmentMatch) {
        continue;
      }

      const followUps = await this.findFollowUpMessages(
        message.conversationId,
        message.createdAt,
        commitmentMatch.commitmentText
      );

      const daysSinceCommitment = Math.floor(
        (Date.now() - message.createdAt) / (24 * 60 * 60 * 1000)
      );

      const status = this.determineCommitmentStatus(
        commitmentMatch,
        followUps,
        daysSinceCommitment
      );

      if (!includeResolved && status === 'resolved') {
        continue;
      }

      commitments.push({
        id: this.generateId(),
        message,
        commitmentType: this.classifyCommitmentType(commitmentMatch.commitmentText),
        commitmentText: commitmentMatch.commitmentText,
        confidence: commitmentMatch.confidence,
        status,
        expectedTimeframeDays: this.extractTimeframe(commitmentMatch.commitmentText),
        daysSinceCommitment,
        followUps
      });
    }

    return commitments.slice(0, limit);
  }

  /**
   * Find commitment patterns in text
   */
  private findCommitmentPattern(content: string): {
    commitmentText: string;
    pattern: string;
    confidence: number;
  } | null {
    for (const pattern of PatternDetectionService.COMMITMENT_PATTERNS) {
      const match = content.match(pattern);
      if (match) {
        // Extract the sentence containing the commitment
        const sentences = content.split(/[.!?]+/);
        const commitmentSentence = sentences.find(s => pattern.test(s))?.trim();
        
        if (commitmentSentence) {
          return {
            commitmentText: commitmentSentence,
            pattern: pattern.source,
            confidence: this.calculateCommitmentConfidence(commitmentSentence, pattern)
          };
        }
      }
    }
    return null;
  }

  /**
   * Calculate confidence score for a commitment
   */
  private calculateCommitmentConfidence(text: string, pattern: RegExp): number {
    let confidence = 0.6; // Base confidence
    
    // Boost confidence for specific patterns
    if (pattern.source.includes("I'll")) confidence += 0.2;
    if (pattern.source.includes("need to")) confidence += 0.1;
    if (text.includes("tomorrow") || text.includes("next week")) confidence += 0.1;
    if (text.length > 20 && text.length < 100) confidence += 0.1; // Reasonable length
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Check if there's a follow-up mention of a commitment
   */
  private async hasFollowUpMention(
    conversationId: string,
    afterTimestamp: number,
    commitmentText: string
  ): Promise<boolean> {
    const keywords = this.extractKeywords(commitmentText);
    if (keywords.length === 0) return false;

    const followUps = await this.findFollowUpMessages(conversationId, afterTimestamp, commitmentText);
    return followUps.length > 0;
  }

  /**
   * Find follow-up messages related to a commitment
   */
  private async findFollowUpMessages(
    conversationId: string,
    afterTimestamp: number,
    commitmentText: string
  ): Promise<Message[]> {
    const keywords = this.extractKeywords(commitmentText);
    if (keywords.length === 0) return [];

    // Use FTS to search for messages containing keywords after the commitment
    const rows = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
    }>(
      'find_followup_messages',
      `SELECT m.*
       FROM messages_fts
       JOIN messages m ON m.rowid = messages_fts.rowid
       WHERE m.conversation_id = ? 
         AND m.created_at > ?
         AND messages_fts MATCH ?
       ORDER BY m.created_at ASC`,
      [
        conversationId,
        afterTimestamp,
        keywords.join(' OR ')
      ]
    );

    return rows.map(row => ({
      id: row.id,
      conversationId: row.conversation_id,
      role: row.role as 'user' | 'assistant' | 'system',
      content: row.content,
      createdAt: row.created_at,
      parentMessageId: row.parent_message_id || undefined,
      metadata: this.parseMetadata(row.metadata)
    }));
  }

  /**
   * Check if a message is a question
   */
  private isQuestion(content: string): boolean {
    return PatternDetectionService.QUESTION_PATTERNS.some(pattern => 
      pattern.test(content.trim())
    );
  }

  /**
   * Normalize question text for comparison
   */
  private normalizeQuestion(question: string): string {
    return question
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Limit length for grouping
  }

  /**
   * Extract topic from question text
   */
  private extractTopic(questionText: string): string {
    // Simple topic extraction - could be enhanced with NLP
    const words = questionText.toLowerCase().split(/\s+/);
    const stopWords = new Set(['what', 'how', 'when', 'where', 'why', 'who', 'which', 'can', 'could', 'would', 'should', 'is', 'are', 'do', 'does', 'did', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    const topicWords = words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 3);
    
    return topicWords.length > 0 ? topicWords.join(' ') : 'general';
  }

  /**
   * Find answers related to a topic
   */
  private async findAnswersForTopic(
    topic: string,
    questions: Message[],
    conversationId?: string
  ): Promise<Message[]> {
    const topicKeywords = topic.split(' ');
    
    let whereClause = 'WHERE m.role = ? AND messages_fts MATCH ?';
    const params: any[] = ['assistant', topicKeywords.join(' OR ')];

    if (conversationId) {
      whereClause += ' AND m.conversation_id = ?';
      params.push(conversationId);
    }

    const rows = this.executeStatementAll<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: number;
      parent_message_id: string | null;
      metadata: string;
      embedding: Buffer | null;
    }>(
      'find_topic_answers',
      `SELECT m.*
       FROM messages_fts
       JOIN messages m ON m.rowid = messages_fts.rowid
       ${whereClause}
       ORDER BY m.created_at ASC`,
      params
    );

    // Filter for messages that look like answers
    return rows
      .map(row => ({
        id: row.id,
        conversationId: row.conversation_id,
        role: row.role as 'user' | 'assistant' | 'system',
        content: row.content,
        createdAt: row.created_at,
        parentMessageId: row.parent_message_id || undefined,
        metadata: this.parseMetadata(row.metadata)
      }))
      .filter(msg => this.looksLikeAnswer(msg.content));
  }

  /**
   * Check if content looks like an answer
   */
  private looksLikeAnswer(content: string): boolean {
    return PatternDetectionService.ANSWER_INDICATORS.some(pattern => 
      pattern.test(content.trim())
    ) || content.length > 50; // Longer responses more likely to be answers
  }

  /**
   * Calculate confidence for topic identification
   */
  private calculateTopicConfidence(topic: string, questions: Message[]): number {
    const topicWords = topic.split(' ');
    let totalMatches = 0;
    
    for (const question of questions) {
      const questionWords = question.content.toLowerCase().split(/\s+/);
      const matches = topicWords.filter(word => questionWords.includes(word)).length;
      totalMatches += matches;
    }
    
    return Math.min(totalMatches / (questions.length * topicWords.length), 1.0);
  }

  /**
   * Extract keywords from commitment text
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['i', 'will', 'ill', 'let', 'me', 'need', 'to', 'the', 'a', 'an', 'and', 'or', 'but']);
    
    return words
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 5);
  }

  /**
   * Determine commitment status based on follow-ups
   */
  private determineCommitmentStatus(
    commitment: { commitmentText: string; confidence: number },
    followUps: Message[],
    daysSince: number
  ): 'pending' | 'mentioned' | 'resolved' | 'overdue' {
    if (followUps.length === 0) {
      return daysSince > 7 ? 'overdue' : 'pending';
    }
    
    // Check if any follow-up indicates resolution
    const resolvedIndicators = ['completed', 'done', 'finished', 'resolved', 'found', 'confirmed'];
    const hasResolution = followUps.some(msg => 
      resolvedIndicators.some(indicator => msg.content.toLowerCase().includes(indicator))
    );
    
    return hasResolution ? 'resolved' : 'mentioned';
  }

  /**
   * Classify the type of commitment
   */
  private classifyCommitmentType(commitmentText: string): 'check' | 'follow_up' | 'update' | 'investigate' | 'temporal' {
    const text = commitmentText.toLowerCase();
    
    if (text.includes('check')) return 'check';
    if (text.includes('follow') || text.includes('get back')) return 'follow_up';
    if (text.includes('update')) return 'update';
    if (text.includes('investigate') || text.includes('look into')) return 'investigate';
    if (/(?:by|before|after)\s+(?:tomorrow|friday|next week|end of)/i.test(text)) return 'temporal';
    
    return 'check'; // Default
  }

  /**
   * Extract timeframe from commitment text
   */
  private extractTimeframe(commitmentText: string): number | undefined {
    const text = commitmentText.toLowerCase();
    
    if (text.includes('tomorrow')) return 1;
    if (text.includes('next week')) return 7;
    if (text.includes('friday')) {
      const today = new Date();
      const friday = 5; // Friday is day 5
      const currentDay = today.getDay();
      return currentDay <= friday ? friday - currentDay : 7 - currentDay + friday;
    }
    if (text.includes('end of week')) return 7;
    if (text.includes('end of month')) return 30;
    
    return undefined;
  }
}