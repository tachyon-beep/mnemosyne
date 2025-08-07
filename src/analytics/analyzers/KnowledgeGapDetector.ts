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
  
  // Gap metrics
  frequency: number;
  firstOccurrence: number;
  lastOccurrence: number;
  explorationDepth: number; // 0-100
  
  // Context information
  sourceConversations: string[];
  relatedQuestions: string[];
  relatedTopics: string[];
  
  // Analysis
  urgency: 'critical' | 'high' | 'medium' | 'low';
  resolutionComplexity: number; // 1-10
  learningPath: string[];
  
  // Recommendations
  suggestedActions: string[];
  recommendedResources: string[];
  estimatedLearningTime: number; // hours
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
  
  // Coverage metrics
  mentionFrequency: number;
  explorationDepth: number; // 0-100
  coverageCompleteness: number; // 0-100
  
  // Time-based analysis
  firstMention: number;
  lastMention: number;
  developmentTrajectory: Array<{
    timestamp: number;
    understandingLevel: number;
  }>;
  
  // Gap identification
  identifiedGaps: string[];
  missingConcepts: string[];
  unclarifiedAspects: string[];
  
  // Relationships
  relatedTopics: string[];
  prerequisiteTopics: string[];
  dependentTopics: string[];
}

export interface LearningCurve {
  topic: string;
  dataPoints: Array<{
    timestamp: number;
    understandingLevel: number; // 0-100
    conversationId: string;
    evidence: string[];
  }>;
  
  // Curve characteristics
  gradient: number; // learning rate
  plateauLevel: number;
  timeToMastery: number; // estimated hours
  currentLevel: number;
  
  // Analysis
  learningPattern: 'rapid' | 'steady' | 'slow' | 'plateaued' | 'declining';
  challenges: string[];
  accelerators: string[];
  nextSteps: string[];
}

export interface ExpertiseDomain {
  domain: string;
  
  // Expertise levels
  knowledgeLevel: number; // 0-100
  confidenceLevel: number; // 0-100
  applicationLevel: number; // 0-100
  
  // Evidence
  strongAreas: string[];
  weakAreas: string[];
  gapAreas: string[];
  
  // Development
  growthPotential: number; // 0-100
  learningVelocity: number;
  priorityScore: number;
}

/**
 * Detects and analyzes knowledge gaps using NLP and clustering techniques
 */
export class KnowledgeGapDetector {
  private readonly MIN_CLUSTER_SIZE = 2;
  private readonly SIMILARITY_THRESHOLD = 0.6;
  private readonly EXPLORATION_THRESHOLD = 30; // Below this is considered a gap
  private readonly LEARNING_CURVE_MIN_POINTS = 3;

  /**
   * Detect knowledge gaps in a set of conversations
   */
  async detectGaps(conversations: Array<{
    conversation: Conversation;
    messages: Message[];
  }>): Promise<DetectedKnowledgeGap[]> {
    try {
      if (!conversations || conversations.length === 0) {
        console.warn('KnowledgeGapDetector: No conversations provided');
        return [];
      }

      // Safely extract messages with error handling
      const allMessages: Array<Message & { conversationId: string }> = [];
      for (const conversation of conversations) {
        try {
          if (!conversation?.conversation?.id || !conversation?.messages) {
            console.warn('KnowledgeGapDetector: Invalid conversation data, skipping');
            continue;
          }
          
          const messages = conversation.messages
            .filter(m => m && m.content && typeof m.content === 'string')
            .map(m => ({ ...m, conversationId: conversation.conversation.id }));
          
          allMessages.push(...messages);
        } catch (convError) {
          console.warn('KnowledgeGapDetector: Error processing conversation:', convError);
          continue;
        }
      }

      if (allMessages.length === 0) {
        console.warn('KnowledgeGapDetector: No valid messages found');
        return [];
      }

      const allGaps: DetectedKnowledgeGap[] = [];

      // Step 1: Extract questions and cluster them
      try {
        const questionClusters = await this.safeClusterQuestions(allMessages);
        const questionGaps = this.safeProcessQuestionClusters(questionClusters);
        allGaps.push(...questionGaps);
      } catch (questionError) {
        console.warn('KnowledgeGapDetector: Error clustering questions:', questionError);
      }
      
      // Step 2: Analyze topic coverage
      try {
        const topicCoverage = await this.safeAnalyzeTopicCoverage(allMessages);
        const topicGaps = this.safeProcessTopicCoverage(topicCoverage);
        allGaps.push(...topicGaps);
      } catch (topicError) {
        console.warn('KnowledgeGapDetector: Error analyzing topic coverage:', topicError);
      }
      
      // Step 3: Identify skill gaps
      try {
        const skillGaps = await this.safeIdentifySkillGaps(allMessages);
        allGaps.push(...skillGaps);
      } catch (skillError) {
        console.warn('KnowledgeGapDetector: Error identifying skill gaps:', skillError);
      }
      
      // Step 4: Find conceptual gaps
      try {
        const conceptGaps = await this.safeFindConceptualGaps(allMessages, []);
        allGaps.push(...conceptGaps);
      } catch (conceptError) {
        console.warn('KnowledgeGapDetector: Error finding conceptual gaps:', conceptError);
      }

      // Step 5: Analyze and enrich gaps
      for (const gap of allGaps) {
        try {
          await this.safeEnrichGapAnalysis(gap, allMessages);
        } catch (enrichError) {
          console.warn('KnowledgeGapDetector: Error enriching gap analysis:', enrichError);
        }
      }

      return this.safePrioritizeGaps(allGaps);
    } catch (error) {
      console.error('KnowledgeGapDetector: Failed to detect knowledge gaps:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationCount: conversations?.length
      });
      
      return [];
    }
  }

  /**
   * Safe wrapper methods for error handling
   */

  private async safeClusterQuestions(messages: Array<Message & { conversationId: string }>): Promise<QuestionCluster[]> {
    try {
      return await this.clusterQuestions(messages);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error clustering questions:', error);
      return [];
    }
  }

  private safeProcessQuestionClusters(clusters: QuestionCluster[]): DetectedKnowledgeGap[] {
    try {
      return this.clustersToGaps(clusters);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error processing question clusters:', error);
      return [];
    }
  }

  private async safeAnalyzeTopicCoverage(messages: Array<Message & { conversationId: string }>): Promise<TopicCoverageAnalysis[]> {
    try {
      return await this.analyzeTopicCoverage(messages);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error analyzing topic coverage:', error);
      return [];
    }
  }

  private safeProcessTopicCoverage(coverage: TopicCoverageAnalysis[]): DetectedKnowledgeGap[] {
    try {
      return this.topicsToGaps(coverage);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error processing topic coverage:', error);
      return [];
    }
  }

  private async safeIdentifySkillGaps(messages: Array<Message & { conversationId: string }>): Promise<DetectedKnowledgeGap[]> {
    try {
      return await this.identifySkillGaps(messages);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error identifying skill gaps:', error);
      return [];
    }
  }

  private async safeFindConceptualGaps(messages: Array<Message & { conversationId: string }>, topicCoverage: TopicCoverageAnalysis[]): Promise<DetectedKnowledgeGap[]> {
    try {
      return await this.findConceptualGaps(messages, topicCoverage);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error finding conceptual gaps:', error);
      return [];
    }
  }

  private async safeEnrichGapAnalysis(gap: DetectedKnowledgeGap, messages: Array<Message & { conversationId: string }>): Promise<void> {
    try {
      await this.enrichGapAnalysis(gap, messages);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error enriching gap analysis:', error);
    }
  }

  private safePrioritizeGaps(gaps: DetectedKnowledgeGap[]): DetectedKnowledgeGap[] {
    try {
      return this.prioritizeGaps(gaps);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error prioritizing gaps:', error);
      return gaps; // Return unsorted gaps as fallback
    }
  }

  /**
   * Cluster similar questions using content similarity
   */
  async clusterQuestions(messages: Array<Message & { conversationId: string }>): Promise<QuestionCluster[]> {
    try {
      const questions = this.safeExtractQuestions(messages);
      
      if (questions.length === 0) {
        return [];
      }

      // DBSCAN-like clustering with error handling
      const clusters: QuestionCluster[] = [];
      const processed = new Set<number>();

      for (let i = 0; i < questions.length; i++) {
        try {
          if (processed.has(i)) continue;

          const cluster: typeof questions = [questions[i]];
          processed.add(i);

          // Find similar questions
          for (let j = i + 1; j < questions.length; j++) {
            try {
              if (processed.has(j)) continue;

              const similarity = this.safeCalculateQuestionSimilarity(
                questions[i].content,
                questions[j].content
              );

              if (similarity >= this.SIMILARITY_THRESHOLD) {
                cluster.push(questions[j]);
                processed.add(j);
              }
            } catch (similarityError) {
              console.warn('KnowledgeGapDetector: Error calculating similarity:', similarityError);
              continue;
            }
          }

          // Create cluster if it has enough questions
          if (cluster.length >= this.MIN_CLUSTER_SIZE) {
            try {
              const clusterId = this.safeGenerateClusterId(cluster[0]?.content || '');
              const centerQuestion = this.safeFindCenterQuestion(cluster);
              const averageSimilarity = this.safeCalculateAverageSimilarity(cluster);
              const resolved = this.safeAssessClusterResolution(cluster, messages);
              const resolutionConfidence = this.safeCalculateResolutionConfidence(cluster, messages);
              
              clusters.push({
                clusterId,
                centerQuestion,
                questions: cluster.map(q => ({
                  content: q.content || '',
                  conversationId: q.conversationId || 'unknown',
                  timestamp: q.createdAt || Date.now(),
                  similarity: this.safeCalculateQuestionSimilarity(q.content, cluster[0]?.content || '')
                })),
                frequency: cluster.length,
                averageSimilarity: Math.max(0, Math.min(1, averageSimilarity)),
                resolved,
                resolutionConfidence: Math.max(0, Math.min(1, resolutionConfidence))
              });
            } catch (clusterError) {
              console.warn('KnowledgeGapDetector: Error creating cluster:', clusterError);
              continue;
            }
          }
        } catch (iterationError) {
          console.warn('KnowledgeGapDetector: Error in clustering iteration:', iterationError);
          continue;
        }
      }

      return clusters.sort((a, b) => {
        try {
          return (b.frequency || 0) - (a.frequency || 0);
        } catch (sortError) {
          return 0;
        }
      });
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error in clusterQuestions:', error);
      return [];
    }
  }

  private safeExtractQuestions(messages: Array<Message & { conversationId: string }>): Array<Message & { conversationId: string }> {
    try {
      return this.extractQuestions(messages);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error extracting questions:', error);
      return [];
    }
  }

  private safeCalculateQuestionSimilarity(q1: string, q2: string): number {
    try {
      return this.calculateQuestionSimilarity(q1, q2);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error calculating question similarity:', error);
      return 0;
    }
  }

  private safeGenerateClusterId(content: string): string {
    try {
      return this.generateClusterId(content);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error generating cluster ID:', error);
      return `cluster_${Date.now()}`;
    }
  }

  private safeFindCenterQuestion(cluster: Array<Message & { conversationId: string }>): string {
    try {
      return this.findCenterQuestion(cluster);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error finding center question:', error);
      return cluster[0]?.content || 'Unknown question';
    }
  }

  private safeCalculateAverageSimilarity(cluster: Array<Message & { conversationId: string }>): number {
    try {
      return this.calculateAverageSimilarity(cluster);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error calculating average similarity:', error);
      return 0.5;
    }
  }

  private safeAssessClusterResolution(cluster: Array<Message & { conversationId: string }>, allMessages: Array<Message & { conversationId: string }>): boolean {
    try {
      return this.assessClusterResolution(cluster, allMessages);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error assessing cluster resolution:', error);
      return false;
    }
  }

  private safeCalculateResolutionConfidence(cluster: Array<Message & { conversationId: string }>, allMessages: Array<Message & { conversationId: string }>): number {
    try {
      return this.calculateResolutionConfidence(cluster, allMessages);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error calculating resolution confidence:', error);
      return 0;
    }
  }

  /**
   * Analyze topic coverage and identify gaps
   */
  async analyzeTopicCoverage(messages: Array<Message & { conversationId: string }>): Promise<TopicCoverageAnalysis[]> {
    try {
      const topicMentions = this.safeExtractTopicMentions(messages);
      const topicAnalyses: TopicCoverageAnalysis[] = [];

      for (const [topic, mentions] of topicMentions.entries()) {
        try {
          if (!topic || !mentions || mentions.length === 0) {
            continue;
          }
          
          const analysis = await this.safeAnalyzeTopicEvolution(topic, mentions, messages);
          if (analysis) {
            topicAnalyses.push(analysis);
          }
        } catch (topicError) {
          console.warn(`KnowledgeGapDetector: Error analyzing topic '${topic}':`, topicError);
          continue;
        }
      }

      return topicAnalyses.sort((a, b) => {
        try {
          return (a.explorationDepth || 0) - (b.explorationDepth || 0);
        } catch (sortError) {
          return 0;
        }
      });
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error analyzing topic coverage:', error);
      return [];
    }
  }

  private safeExtractTopicMentions(messages: Array<Message & { conversationId: string }>): Map<string, Array<Message & { conversationId: string }>> {
    try {
      return this.extractTopicMentions(messages);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error extracting topic mentions:', error);
      return new Map();
    }
  }

  private async safeAnalyzeTopicEvolution(
    topic: string,
    mentions: Array<Message & { conversationId: string }>,
    allMessages: Array<Message & { conversationId: string }>
  ): Promise<TopicCoverageAnalysis | null> {
    try {
      return await this.analyzeTopicEvolution(topic, mentions, allMessages);
    } catch (error) {
      console.warn(`KnowledgeGapDetector: Error analyzing topic evolution for '${topic}':`, error);
      return null;
    }
  }

  /**
   * Generate learning curves for topics
   */
  async generateLearningCurves(
    conversations: Array<{
      conversation: Conversation;
      messages: Message[];
    }>,
    topics?: string[]
  ): Promise<LearningCurve[]> {
    try {
      if (!conversations || conversations.length === 0) {
        console.warn('KnowledgeGapDetector: No conversations provided for learning curves');
        return [];
      }

      // Safely extract messages
      const allMessages: Array<Message & { conversationId: string }> = [];
      for (const conversation of conversations) {
        try {
          if (!conversation?.conversation?.id || !conversation?.messages) {
            continue;
          }
          
          const messages = conversation.messages
            .filter(m => m && m.content && typeof m.content === 'string')
            .map(m => ({ ...m, conversationId: conversation.conversation.id }));
          
          allMessages.push(...messages);
        } catch (convError) {
          console.warn('KnowledgeGapDetector: Error processing conversation for learning curves:', convError);
          continue;
        }
      }

      // If no topics specified, extract from messages
      let topicList = topics;
      if (!topicList || topicList.length === 0) {
        try {
          const topicMentions = this.safeExtractTopicMentions(allMessages);
          topicList = Array.from(topicMentions.keys()).slice(0, 20); // Top 20 topics
        } catch (topicExtractionError) {
          console.warn('KnowledgeGapDetector: Error extracting topics for learning curves:', topicExtractionError);
          return [];
        }
      }

      const curves: LearningCurve[] = [];

      for (const topic of topicList) {
        try {
          if (!topic || typeof topic !== 'string') {
            continue;
          }
          
          const curve = await this.safeBuildLearningCurve(topic, allMessages);
          if (curve && curve.dataPoints && curve.dataPoints.length >= this.LEARNING_CURVE_MIN_POINTS) {
            curves.push(curve);
          }
        } catch (curveError) {
          console.warn(`KnowledgeGapDetector: Error building learning curve for topic '${topic}':`, curveError);
          continue;
        }
      }

      return curves;
    } catch (error) {
      console.error('KnowledgeGapDetector: Failed to generate learning curves:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationCount: conversations?.length
      });
      
      return [];
    }
  }

  private async safeBuildLearningCurve(topic: string, messages: Array<Message & { conversationId: string }>): Promise<LearningCurve | null> {
    try {
      return await this.buildLearningCurve(topic, messages);
    } catch (error) {
      console.warn(`KnowledgeGapDetector: Error building learning curve for '${topic}':`, error);
      return null;
    }
  }

  /**
   * Map expertise domains
   */
  async mapExpertiseDomains(
    conversations: Array<{
      conversation: Conversation;
      messages: Message[];
    }>
  ): Promise<ExpertiseDomain[]> {
    try {
      if (!conversations || conversations.length === 0) {
        console.warn('KnowledgeGapDetector: No conversations provided for expertise mapping');
        return [];
      }

      // Safely extract messages
      const allMessages: Array<Message & { conversationId: string }> = [];
      for (const conversation of conversations) {
        try {
          if (!conversation?.conversation?.id || !conversation?.messages) {
            continue;
          }
          
          const messages = conversation.messages
            .filter(m => m && m.content && typeof m.content === 'string')
            .map(m => ({ ...m, conversationId: conversation.conversation.id }));
          
          allMessages.push(...messages);
        } catch (convError) {
          console.warn('KnowledgeGapDetector: Error processing conversation for expertise mapping:', convError);
          continue;
        }
      }

      const domains = this.safeIdentifyDomains(allMessages);
      const expertiseMaps: ExpertiseDomain[] = [];

      for (const domain of domains) {
        try {
          if (!domain || typeof domain !== 'string') {
            continue;
          }
          
          const domainMessages = this.safeFilterMessagesByDomain(allMessages, domain);
          const expertise = await this.safeAssessDomainExpertise(domain, domainMessages);
          
          if (expertise) {
            expertiseMaps.push(expertise);
          }
        } catch (domainError) {
          console.warn(`KnowledgeGapDetector: Error processing domain '${domain}':`, domainError);
          continue;
        }
      }

      return expertiseMaps.sort((a, b) => {
        try {
          return (b.priorityScore || 0) - (a.priorityScore || 0);
        } catch (sortError) {
          return 0;
        }
      });
    } catch (error) {
      console.error('KnowledgeGapDetector: Failed to map expertise domains:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationCount: conversations?.length
      });
      
      return [];
    }
  }

  private safeIdentifyDomains(messages: Array<Message & { conversationId: string }>): string[] {
    try {
      return this.identifyDomains(messages);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error identifying domains:', error);
      return ['general'];
    }
  }

  private safeFilterMessagesByDomain(messages: Array<Message & { conversationId: string }>, domain: string): Array<Message & { conversationId: string }> {
    try {
      return this.filterMessagesByDomain(messages, domain);
    } catch (error) {
      console.warn(`KnowledgeGapDetector: Error filtering messages by domain '${domain}':`, error);
      return [];
    }
  }

  private async safeAssessDomainExpertise(domain: string, messages: Array<Message & { conversationId: string }>): Promise<ExpertiseDomain | null> {
    try {
      return await this.assessDomainExpertise(domain, messages);
    } catch (error) {
      console.warn(`KnowledgeGapDetector: Error assessing domain expertise for '${domain}':`, error);
      return null;
    }
  }

  /**
   * Private helper methods
   */

  private extractQuestions(messages: Array<Message & { conversationId: string }>) {
    try {
      if (!messages || !Array.isArray(messages)) {
        return [];
      }
      
      return messages.filter(m => {
        try {
          return m && 
                 m.role === 'user' && 
                 m.content && 
                 typeof m.content === 'string' &&
                 m.content.includes('?') &&
                 m.content.trim().length > 10;
        } catch (filterError) {
          return false;
        }
      });
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error extracting questions:', error);
      return [];
    }
  }

  private calculateQuestionSimilarity(q1: string, q2: string): number {
    try {
      if (!q1 || !q2 || typeof q1 !== 'string' || typeof q2 !== 'string') {
        return 0;
      }

      // Preprocess questions
      const tokens1 = this.safeTokenizeQuestion(q1);
      const tokens2 = this.safeTokenizeQuestion(q2);

      if (tokens1.length === 0 || tokens2.length === 0) {
        return 0;
      }

      // Jaccard similarity with error handling
      let jaccardSim = 0;
      try {
        const set1 = new Set(tokens1);
        const set2 = new Set(tokens2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        jaccardSim = union.size > 0 ? intersection.size / union.size : 0;
      } catch (jaccardError) {
        console.warn('KnowledgeGapDetector: Error calculating Jaccard similarity:', jaccardError);
        jaccardSim = 0;
      }

      // Add semantic similarity bonus for similar question structures
      let structureSim = 0;
      try {
        structureSim = this.safeCalculateStructuralSimilarity(q1, q2);
      } catch (structureError) {
        console.warn('KnowledgeGapDetector: Error calculating structural similarity:', structureError);
        structureSim = 0;
      }
      
      const result = (jaccardSim * 0.7) + (structureSim * 0.3);
      return Math.max(0, Math.min(1, result));
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error calculating question similarity:', error);
      return 0;
    }
  }

  private safeTokenizeQuestion(question: string): string[] {
    try {
      return this.tokenizeQuestion(question);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error tokenizing question:', error);
      return [];
    }
  }

  private safeCalculateStructuralSimilarity(q1: string, q2: string): number {
    try {
      return this.calculateStructuralSimilarity(q1, q2);
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error calculating structural similarity:', error);
      return 0;
    }
  }

  private tokenizeQuestion(question: string): string[] {
    try {
      if (!question || typeof question !== 'string') {
        return [];
      }
      
      return question
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(token => {
          try {
            return token && 
                   token.length > 2 && 
                   !this.isStopWord(token) &&
                   !this.isQuestionWord(token);
          } catch (filterError) {
            return false;
          }
        });
    } catch (error) {
      console.warn('KnowledgeGapDetector: Error tokenizing question:', error);
      return [];
    }
  }

  private isStopWord(word: string): boolean {
    try {
      if (!word || typeof word !== 'string') {
        return true;
      }
      
      const stopWords = new Set([
        'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
        'for', 'not', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
        'but', 'his', 'by', 'from', 'they', 'she', 'or', 'an', 'will',
        'my', 'one', 'all', 'would', 'there', 'their', 'so', 'if'
      ]);
      return stopWords.has(word.toLowerCase());
    } catch (error) {
      return true;
    }
  }

  private isQuestionWord(word: string): boolean {
    try {
      if (!word || typeof word !== 'string') {
        return false;
      }
      
      const questionWords = new Set([
        'what', 'how', 'why', 'when', 'where', 'who', 'which', 'can', 'could',
        'should', 'would', 'is', 'are', 'does', 'did', 'will'
      ]);
      return questionWords.has(word.toLowerCase());
    } catch (error) {
      return false;
    }
  }

  private calculateStructuralSimilarity(q1: string, q2: string): number {
    const structure1 = this.extractQuestionStructure(q1);
    const structure2 = this.extractQuestionStructure(q2);
    return structure1 === structure2 ? 1 : 0;
  }

  private extractQuestionStructure(question: string): string {
    const lower = question.toLowerCase().trim();
    
    if (lower.startsWith('what')) return 'what';
    if (lower.startsWith('how')) return 'how';
    if (lower.startsWith('why')) return 'why';
    if (lower.startsWith('when')) return 'when';
    if (lower.startsWith('where')) return 'where';
    if (lower.startsWith('who')) return 'who';
    if (lower.startsWith('which')) return 'which';
    if (lower.startsWith('can') || lower.startsWith('could')) return 'can';
    if (lower.startsWith('should') || lower.startsWith('would')) return 'should';
    
    return 'other';
  }

  private generateClusterId(centerQuestion: string): string {
    return centerQuestion
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .slice(0, 3)
      .join('_');
  }

  private findCenterQuestion(cluster: Array<Message & { conversationId: string }>): string {
    // Return the question with highest average similarity to all others
    let bestQuestion = cluster[0].content;
    let bestScore = 0;

    for (const question of cluster) {
      let totalSimilarity = 0;
      for (const other of cluster) {
        if (question !== other) {
          totalSimilarity += this.calculateQuestionSimilarity(
            question.content,
            other.content
          );
        }
      }
      
      const avgSimilarity = totalSimilarity / (cluster.length - 1);
      if (avgSimilarity > bestScore) {
        bestScore = avgSimilarity;
        bestQuestion = question.content;
      }
    }

    return bestQuestion;
  }

  private calculateAverageSimilarity(cluster: Array<Message & { conversationId: string }>): number {
    if (cluster.length < 2) return 1;

    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        totalSimilarity += this.calculateQuestionSimilarity(
          cluster[i].content,
          cluster[j].content
        );
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private assessClusterResolution(
    cluster: Array<Message & { conversationId: string }>,
    allMessages: Array<Message & { conversationId: string }>
  ): boolean {
    // Look for resolution indicators in conversations containing these questions
    const conversationIds = new Set(cluster.map(q => q.conversationId));
    
    for (const conversationId of conversationIds) {
      const conversationMessages = allMessages
        .filter(m => m.conversationId === conversationId)
        .sort((a, b) => a.createdAt - b.createdAt);

      // Find questions from this cluster in the conversation
      const clusterQuestions = cluster.filter(q => q.conversationId === conversationId);
      
      for (const question of clusterQuestions) {
        const questionIndex = conversationMessages.findIndex(m => m.id === question.id);
        if (questionIndex === -1) continue;

        // Look for resolution indicators in subsequent messages
        const followingMessages = conversationMessages.slice(questionIndex + 1, questionIndex + 5);
        const hasResolution = followingMessages.some(m => 
          this.containsResolutionIndicators(m.content)
        );

        if (hasResolution) {
          return true;
        }
      }
    }

    return false;
  }

  private calculateResolutionConfidence(
    cluster: Array<Message & { conversationId: string }>,
    allMessages: Array<Message & { conversationId: string }>
  ): number {
    let totalConfidence = 0;
    let evaluatedQuestions = 0;

    for (const question of cluster) {
      const conversationMessages = allMessages
        .filter(m => m.conversationId === question.conversationId)
        .sort((a, b) => a.createdAt - b.createdAt);

      const questionIndex = conversationMessages.findIndex(m => m.id === question.id);
      if (questionIndex === -1) continue;

      const followingMessages = conversationMessages.slice(questionIndex + 1, questionIndex + 5);
      let questionConfidence = 0;

      for (const message of followingMessages) {
        if (this.containsResolutionIndicators(message.content)) {
          questionConfidence += 0.3;
        }
        if (this.containsUnderstandingIndicators(message.content)) {
          questionConfidence += 0.2;
        }
        if (message.content.length > 200) { // Detailed response
          questionConfidence += 0.1;
        }
      }

      totalConfidence += Math.min(1, questionConfidence);
      evaluatedQuestions++;
    }

    return evaluatedQuestions > 0 ? totalConfidence / evaluatedQuestions : 0;
  }

  private containsResolutionIndicators(content: string): boolean {
    const indicators = [
      'solved', 'resolved', 'fixed', 'working', 'done', 'complete',
      'got it', 'understand', 'clear', 'makes sense', 'perfect',
      'exactly', 'right', 'correct', 'thanks'
    ];
    
    const lower = content.toLowerCase();
    return indicators.some(indicator => lower.includes(indicator));
  }

  private containsUnderstandingIndicators(content: string): boolean {
    const indicators = [
      'i see', 'ah', 'oh', 'now i understand', 'that helps',
      'interesting', 'good point', 'makes sense', 'clear',
      'i get it', 'understand'
    ];
    
    const lower = content.toLowerCase();
    return indicators.some(indicator => lower.includes(indicator));
  }

  private extractTopicMentions(messages: Array<Message & { conversationId: string }>): Map<string, Array<Message & { conversationId: string }>> {
    const topicMentions = new Map<string, Array<Message & { conversationId: string }>>();

    for (const message of messages) {
      const topics = this.extractMessageTopics(message.content);
      
      for (const topic of topics) {
        if (!topicMentions.has(topic)) {
          topicMentions.set(topic, []);
        }
        topicMentions.get(topic)!.push(message);
      }
    }

    // Filter topics with sufficient mentions
    const filteredTopics = new Map<string, Array<Message & { conversationId: string }>>();
    for (const [topic, mentions] of topicMentions.entries()) {
      if (mentions.length >= 3) { // Minimum mentions threshold
        filteredTopics.set(topic, mentions);
      }
    }

    return filteredTopics;
  }

  private extractMessageTopics(content: string): string[] {
    // Simple topic extraction - in production would use more sophisticated NLP
    const topics: string[] = [];
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const words = sentence.toLowerCase().split(/\s+/)
        .filter(w => w.length > 4 && !this.isStopWord(w));
      
      // Extract noun phrases and important terms
      for (let i = 0; i < words.length - 1; i++) {
        const bigram = words.slice(i, i + 2).join(' ');
        if (this.isSignificantBigram(bigram)) {
          topics.push(bigram);
        }
      }
      
      // Single important words
      for (const word of words) {
        if (this.isSignificantTopic(word)) {
          topics.push(word);
        }
      }
    }

    return [...new Set(topics)]; // Remove duplicates
  }

  private isSignificantBigram(bigram: string): boolean {
    // Simple heuristics for identifying significant bigrams
    const technicalPrefixes = ['machine learning', 'data science', 'artificial intelligence', 'software engineering'];
    const conceptualPatterns = /^(how to|what is|why does|when to)/;
    
    return technicalPrefixes.includes(bigram) || conceptualPatterns.test(bigram);
  }

  private isSignificantTopic(word: string): boolean {
    // Identify words that are likely to be important topics
    if (word.length < 5) return false;
    
    const technicalTerms = new Set([
      'algorithm', 'database', 'framework', 'architecture', 'implementation',
      'optimization', 'performance', 'security', 'scalability', 'methodology'
    ]);
    
    return technicalTerms.has(word) || /^[A-Z][a-z]+$/.test(word); // Proper nouns
  }

  private async analyzeTopicEvolution(
    topic: string,
    mentions: Array<Message & { conversationId: string }>,
    allMessages: Array<Message & { conversationId: string }>
  ): Promise<TopicCoverageAnalysis> {
    // Sort mentions by timestamp
    const sortedMentions = mentions.sort((a, b) => a.createdAt - b.createdAt);
    
    // Calculate exploration depth
    const explorationDepth = this.calculateTopicExplorationDepth(topic, mentions, allMessages);
    
    // Generate development trajectory
    const developmentTrajectory = this.buildDevelopmentTrajectory(topic, sortedMentions);
    
    // Identify gaps
    const identifiedGaps = this.identifyTopicGaps(topic, mentions);
    const missingConcepts = this.identifyMissingConcepts(topic, mentions);
    const unclarifiedAspects = this.identifyUnclarifiedAspects(topic, mentions);
    
    return {
      topic,
      normalizedTopic: this.normalizeTopicName(topic),
      mentionFrequency: mentions.length,
      explorationDepth,
      coverageCompleteness: this.calculateCoverageCompleteness(explorationDepth, identifiedGaps.length),
      firstMention: sortedMentions[0].createdAt,
      lastMention: sortedMentions[sortedMentions.length - 1].createdAt,
      developmentTrajectory,
      identifiedGaps,
      missingConcepts,
      unclarifiedAspects,
      relatedTopics: this.findRelatedTopics(topic, allMessages),
      prerequisiteTopics: this.identifyPrerequisites(topic),
      dependentTopics: this.identifyDependentTopics(topic)
    };
  }

  private calculateTopicExplorationDepth(
    topic: string,
    mentions: Array<Message & { conversationId: string }>,
    allMessages: Array<Message & { conversationId: string }>
  ): number {
    let totalDepth = 0;
    let evaluatedMentions = 0;

    for (const mention of mentions) {
      // Get conversation context around this mention
      const conversationMessages = allMessages
        .filter(m => m.conversationId === mention.conversationId)
        .sort((a, b) => a.createdAt - b.createdAt);

      const mentionIndex = conversationMessages.findIndex(m => m.id === mention.id);
      if (mentionIndex === -1) continue;

      // Analyze depth indicators in surrounding messages
      const contextStart = Math.max(0, mentionIndex - 2);
      const contextEnd = Math.min(conversationMessages.length, mentionIndex + 3);
      const contextMessages = conversationMessages.slice(contextStart, contextEnd);

      let mentionDepth = 30; // Base depth
      
      // Add depth for detailed discussion
      const totalLength = contextMessages.reduce((sum, m) => sum + m.content.length, 0);
      mentionDepth += Math.min(30, totalLength / 100);
      
      // Add depth for technical detail
      const technicalKeywords = ['implement', 'algorithm', 'approach', 'method', 'technique'];
      const technicalCount = contextMessages.reduce((count, m) => 
        count + technicalKeywords.filter(kw => m.content.toLowerCase().includes(kw)).length, 0
      );
      mentionDepth += Math.min(20, technicalCount * 5);
      
      // Add depth for examples and specifics
      const exampleKeywords = ['example', 'instance', 'specifically', 'particular', 'case'];
      const exampleCount = contextMessages.reduce((count, m) => 
        count + exampleKeywords.filter(kw => m.content.toLowerCase().includes(kw)).length, 0
      );
      mentionDepth += Math.min(20, exampleCount * 7);

      totalDepth += Math.min(100, mentionDepth);
      evaluatedMentions++;
    }

    return evaluatedMentions > 0 ? totalDepth / evaluatedMentions : 0;
  }

  private buildDevelopmentTrajectory(
    topic: string,
    sortedMentions: Array<Message & { conversationId: string }>
  ): Array<{ timestamp: number; understandingLevel: number }> {
    const trajectory: Array<{ timestamp: number; understandingLevel: number }> = [];
    let currentLevel = 20; // Starting understanding level

    for (const mention of sortedMentions) {
      // Estimate understanding level based on context and progression
      const contextComplexity = this.assessMessageComplexity(mention.content);
      const isQuestion = mention.content.includes('?');
      
      if (isQuestion) {
        // Questions might indicate gaps, but also show engagement
        currentLevel += Math.min(5, contextComplexity * 0.1);
      } else {
        // Non-questions might show understanding or explanations
        currentLevel += Math.min(10, contextComplexity * 0.2);
      }

      // Gradual increase with diminishing returns
      currentLevel = Math.min(90, currentLevel * 1.02);

      trajectory.push({
        timestamp: mention.createdAt,
        understandingLevel: Math.round(currentLevel)
      });
    }

    return trajectory;
  }

  private assessMessageComplexity(content: string): number {
    const length = content.length;
    const technicalTerms = (content.match(/\b[A-Z][a-z]*[A-Z][a-z]*\b/g) || []).length; // CamelCase terms
    const longWords = content.split(/\s+/).filter(w => w.length > 8).length;
    
    return Math.min(100, (length / 50) + (technicalTerms * 5) + (longWords * 2));
  }

  // Additional helper methods for gap analysis...

  private identifyTopicGaps(topic: string, mentions: Array<Message & { conversationId: string }>): string[] {
    // Identify specific aspects of the topic that haven't been covered
    const gaps: string[] = [];
    
    // For common technical topics, check for standard aspects
    const commonAspects = this.getCommonTopicAspects(topic);
    const discussedAspects = this.extractDiscussedAspects(mentions);
    
    for (const aspect of commonAspects) {
      if (!discussedAspects.includes(aspect)) {
        gaps.push(aspect);
      }
    }
    
    return gaps;
  }

  private getCommonTopicAspects(topic: string): string[] {
    // Return common aspects that should be covered for different topic types
    const aspects: Record<string, string[]> = {
      'algorithm': ['complexity', 'implementation', 'use cases', 'limitations'],
      'database': ['schema design', 'performance', 'scalability', 'security'],
      'framework': ['setup', 'core concepts', 'best practices', 'limitations'],
      'default': ['basics', 'implementation', 'examples', 'troubleshooting']
    };
    
    const normalizedTopic = topic.toLowerCase();
    for (const [key, aspectList] of Object.entries(aspects)) {
      if (normalizedTopic.includes(key) || key === 'default') {
        return aspectList;
      }
    }
    
    return aspects.default;
  }

  private extractDiscussedAspects(mentions: Array<Message & { conversationId: string }>): string[] {
    const discussed: string[] = [];
    const allContent = mentions.map(m => m.content).join(' ').toLowerCase();
    
    // Look for aspect indicators
    const aspectIndicators = [
      'complexity', 'implement', 'example', 'use case', 'limitation',
      'setup', 'design', 'performance', 'scale', 'security', 'basic',
      'troubleshoot', 'debug', 'optimize'
    ];
    
    for (const indicator of aspectIndicators) {
      if (allContent.includes(indicator)) {
        discussed.push(indicator);
      }
    }
    
    return discussed;
  }

  private identifyMissingConcepts(topic: string, mentions: Array<Message & { conversationId: string }>): string[] {
    // Identify related concepts that should be discussed but aren't
    const relatedConcepts = this.getRelatedConcepts(topic);
    const mentionedConcepts = this.extractMentionedConcepts(mentions);
    
    return relatedConcepts.filter(concept => !mentionedConcepts.includes(concept));
  }

  private getRelatedConcepts(topic: string): string[] {
    // Return concepts that are typically related to the topic
    const conceptMap: Record<string, string[]> = {
      'machine learning': ['training data', 'model validation', 'overfitting', 'feature engineering'],
      'database': ['indexing', 'normalization', 'transactions', 'backup'],
      'algorithm': ['data structure', 'optimization', 'complexity analysis'],
      'default': ['implementation', 'testing', 'documentation']
    };
    
    const normalizedTopic = topic.toLowerCase();
    for (const [key, concepts] of Object.entries(conceptMap)) {
      if (normalizedTopic.includes(key)) {
        return concepts;
      }
    }
    
    return conceptMap.default;
  }

  private extractMentionedConcepts(mentions: Array<Message & { conversationId: string }>): string[] {
    const concepts: string[] = [];
    const allContent = mentions.map(m => m.content).join(' ').toLowerCase();
    
    // Extract technical terms and concepts
    const technicalTerms = allContent.match(/\b[a-z]{4,}\b/g) || [];
    concepts.push(...technicalTerms);
    
    return [...new Set(concepts)];
  }

  private identifyUnclarifiedAspects(topic: string, mentions: Array<Message & { conversationId: string }>): string[] {
    const unclarified: string[] = [];
    
    // Look for uncertainty indicators
    for (const mention of mentions) {
      if (this.containsUncertaintyIndicators(mention.content)) {
        const aspects = this.extractUncertainAspects(mention.content);
        unclarified.push(...aspects);
      }
    }
    
    return [...new Set(unclarified)];
  }

  private containsUncertaintyIndicators(content: string): boolean {
    const indicators = [
      'not sure', 'unclear', 'confused', 'don\'t understand',
      'not clear', 'uncertain', 'maybe', 'perhaps', 'might be'
    ];
    
    const lower = content.toLowerCase();
    return indicators.some(indicator => lower.includes(indicator));
  }

  private extractUncertainAspects(content: string): string[] {
    // Extract what specifically is unclear
    const aspects: string[] = [];
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      if (this.containsUncertaintyIndicators(sentence)) {
        // Try to extract the subject of uncertainty
        const words = sentence.split(/\s+/).filter(w => w.length > 4);
        aspects.push(...words.slice(0, 3)); // Take first few significant words
      }
    }
    
    return aspects;
  }

  // More implementation methods continue...

  private buildLearningCurve(topic: string, messages: Array<Message & { conversationId: string }>): Promise<LearningCurve> {
    // Implementation for building learning curves
    throw new Error('buildLearningCurve not implemented');
  }

  private identifyDomains(messages: Array<Message & { conversationId: string }>): string[] {
    // Implementation for identifying expertise domains
    return ['software development', 'data analysis', 'project management'];
  }

  private filterMessagesByDomain(messages: Array<Message & { conversationId: string }>, domain: string): Array<Message & { conversationId: string }> {
    // Implementation for filtering messages by domain
    return messages.filter(m => m.content.toLowerCase().includes(domain.toLowerCase()));
  }

  private assessDomainExpertise(domain: string, messages: Array<Message & { conversationId: string }>): Promise<ExpertiseDomain> {
    // Implementation for assessing domain expertise
    throw new Error('assessDomainExpertise not implemented');
  }

  // Conversion and prioritization methods

  private clustersToGaps(clusters: QuestionCluster[]): DetectedKnowledgeGap[] {
    return clusters
      .filter(c => !c.resolved)
      .map(cluster => ({
        id: `question_cluster_${cluster.clusterId}`,
        type: 'question' as const,
        content: cluster.centerQuestion,
        normalizedContent: this.normalizeContent(cluster.centerQuestion),
        frequency: cluster.frequency,
        firstOccurrence: Math.min(...cluster.questions.map(q => q.timestamp)),
        lastOccurrence: Math.max(...cluster.questions.map(q => q.timestamp)),
        explorationDepth: cluster.resolutionConfidence * 100,
        sourceConversations: [...new Set(cluster.questions.map(q => q.conversationId))],
        relatedQuestions: cluster.questions.map(q => q.content),
        relatedTopics: [],
        urgency: this.determineUrgency(cluster.frequency, cluster.resolutionConfidence),
        resolutionComplexity: this.estimateComplexity(cluster.centerQuestion),
        learningPath: this.generateLearningPath(cluster.centerQuestion),
        suggestedActions: this.generateActions(cluster.centerQuestion),
        recommendedResources: [],
        estimatedLearningTime: this.estimateLearningTime(cluster.centerQuestion)
      }));
  }

  private topicsToGaps(topics: TopicCoverageAnalysis[]): DetectedKnowledgeGap[] {
    return topics
      .filter(t => t.explorationDepth < this.EXPLORATION_THRESHOLD)
      .map(topic => ({
        id: `topic_gap_${topic.normalizedTopic.replace(/\s+/g, '_')}`,
        type: 'topic' as const,
        content: topic.topic,
        normalizedContent: topic.normalizedTopic,
        frequency: topic.mentionFrequency,
        firstOccurrence: topic.firstMention,
        lastOccurrence: topic.lastMention,
        explorationDepth: topic.explorationDepth,
        sourceConversations: [],
        relatedQuestions: [],
        relatedTopics: topic.relatedTopics,
        urgency: this.determineTopicUrgency(topic.explorationDepth, topic.mentionFrequency),
        resolutionComplexity: this.estimateTopicComplexity(topic.topic),
        learningPath: this.generateTopicLearningPath(topic.topic),
        suggestedActions: this.generateTopicActions(topic),
        recommendedResources: this.generateTopicResources(topic.topic),
        estimatedLearningTime: this.estimateTopicLearningTime(topic.topic)
      }));
  }

  private async identifySkillGaps(messages: Array<Message & { conversationId: string }>): Promise<DetectedKnowledgeGap[]> {
    // Implementation for identifying skill gaps
    return [];
  }

  private async findConceptualGaps(
    messages: Array<Message & { conversationId: string }>,
    topicCoverage: TopicCoverageAnalysis[]
  ): Promise<DetectedKnowledgeGap[]> {
    // Implementation for finding conceptual gaps
    return [];
  }

  private async enrichGapAnalysis(gap: DetectedKnowledgeGap, messages: Array<Message & { conversationId: string }>): Promise<void> {
    // Enrich gap with additional analysis
  }

  private prioritizeGaps(gaps: DetectedKnowledgeGap[]): DetectedKnowledgeGap[] {
    return gaps.sort((a, b) => {
      // Prioritize by urgency, frequency, and recent activity
      const scoreA = this.calculateGapPriorityScore(a);
      const scoreB = this.calculateGapPriorityScore(b);
      return scoreB - scoreA;
    });
  }

  private calculateGapPriorityScore(gap: DetectedKnowledgeGap): number {
    const urgencyWeight = gap.urgency === 'critical' ? 4 : gap.urgency === 'high' ? 3 : gap.urgency === 'medium' ? 2 : 1;
    const frequencyWeight = Math.min(gap.frequency * 0.1, 2);
    const recencyWeight = this.calculateRecencyWeight(gap.lastOccurrence);
    
    return urgencyWeight + frequencyWeight + recencyWeight;
  }

  private calculateRecencyWeight(timestamp: number): number {
    const daysSince = (Date.now() - timestamp) / (1000 * 60 * 60 * 24);
    return Math.max(0, 2 - (daysSince / 30)); // Decreases over 30 days
  }

  // Helper methods for gap creation

  private normalizeContent(content: string): string {
    return content.toLowerCase().replace(/[^\w\s]/g, '').trim();
  }

  private determineUrgency(frequency: number, resolutionConfidence: number): 'critical' | 'high' | 'medium' | 'low' {
    if (frequency >= 5 && resolutionConfidence < 0.3) return 'critical';
    if (frequency >= 3 && resolutionConfidence < 0.5) return 'high';
    if (frequency >= 2) return 'medium';
    return 'low';
  }

  private determineTopicUrgency(explorationDepth: number, frequency: number): 'critical' | 'high' | 'medium' | 'low' {
    if (explorationDepth < 20 && frequency >= 3) return 'critical';
    if (explorationDepth < 30 && frequency >= 2) return 'high';
    if (explorationDepth < 40) return 'medium';
    return 'low';
  }

  private estimateComplexity(content: string): number {
    // Estimate complexity based on content characteristics
    const length = content.length;
    const technicalTerms = (content.match(/\b[A-Z][a-z]*[A-Z][a-z]*\b/g) || []).length;
    return Math.min(10, Math.max(1, Math.floor((length / 20) + technicalTerms)));
  }

  private estimateTopicComplexity(topic: string): number {
    const complexTopics = new Set([
      'machine learning', 'artificial intelligence', 'blockchain',
      'quantum computing', 'distributed systems'
    ]);
    
    const normalized = topic.toLowerCase();
    for (const complex of complexTopics) {
      if (normalized.includes(complex)) {
        return 8;
      }
    }
    
    return 5; // Default complexity
  }

  private generateLearningPath(content: string): string[] {
    // Generate learning path based on content
    return ['research basics', 'find examples', 'practice implementation'];
  }

  private generateTopicLearningPath(topic: string): string[] {
    return ['understand fundamentals', 'explore use cases', 'hands-on practice'];
  }

  private generateActions(content: string): string[] {
    return ['ask more specific questions', 'request examples', 'practice with real scenarios'];
  }

  private generateTopicActions(topic: TopicCoverageAnalysis): string[] {
    const actions = ['deep dive into fundamentals'];
    
    if (topic.identifiedGaps.length > 0) {
      actions.push(`explore: ${topic.identifiedGaps.join(', ')}`);
    }
    
    if (topic.missingConcepts.length > 0) {
      actions.push(`learn about: ${topic.missingConcepts.slice(0, 2).join(', ')}`);
    }
    
    return actions;
  }

  private generateTopicResources(topic: string): string[] {
    return [`${topic} tutorial`, `${topic} documentation`, `${topic} examples`];
  }

  private estimateLearningTime(content: string): number {
    const complexity = this.estimateComplexity(content);
    return complexity * 2; // Hours based on complexity
  }

  private estimateTopicLearningTime(topic: string): number {
    const complexity = this.estimateTopicComplexity(topic);
    return complexity * 3; // Hours based on topic complexity
  }

  private normalizeTopicName(topic: string): string {
    return topic.toLowerCase().replace(/\s+/g, ' ').trim();
  }

  private calculateCoverageCompleteness(explorationDepth: number, gapCount: number): number {
    const depthScore = explorationDepth;
    const gapPenalty = Math.min(30, gapCount * 5);
    return Math.max(0, depthScore - gapPenalty);
  }

  private findRelatedTopics(topic: string, messages: Array<Message & { conversationId: string }>): string[] {
    // Find topics that appear in similar contexts
    return [];
  }

  private identifyPrerequisites(topic: string): string[] {
    // Identify prerequisite topics
    const prerequisites: Record<string, string[]> = {
      'machine learning': ['statistics', 'programming', 'linear algebra'],
      'database design': ['data modeling', 'SQL basics'],
      'web development': ['HTML', 'CSS', 'JavaScript']
    };
    
    return prerequisites[topic.toLowerCase()] || [];
  }

  private identifyDependentTopics(topic: string): string[] {
    // Identify topics that depend on this one
    return [];
  }
}