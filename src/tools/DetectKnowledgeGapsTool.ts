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

import { DetectKnowledgeGapsToolDef as DetectKnowledgeGapsToolDef } from '../types/mcp.js';
import { DetectKnowledgeGapsSchema, DetectKnowledgeGapsInput } from '../types/schemas.js';
import { BaseTool, ToolContext, wrapDatabaseOperation } from './BaseTool.js';
import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
import { KnowledgeGapDetector, DetectedKnowledgeGap } from '../analytics/analyzers/KnowledgeGapDetector.js';
import { ConversationRepository } from '../storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { KnowledgeGapsRepository } from '../analytics/repositories/KnowledgeGapsRepository.js';
import { TimeRange } from '../analytics/repositories/AnalyticsRepository.js';
import { 
  validateDateRange, 
  validateStringArray,
  validateFrequency,
  ValidationError,
  formatValidationError,
  withEnhancedValidation 
} from '../utils/validation.js';

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
    mostFrequent: Array<{ topic: string; frequency: number; lastSeen: number }>;
    /** Trending topics with increasing gaps */
    trending: Array<{ topic: string; trend: number; currentFrequency: number }>;
    /** Topics with declining gaps (being resolved) */
    improving: Array<{ topic: string; trend: number; resolutionRate: number }>;
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
export class DetectKnowledgeGapsTool extends BaseTool<DetectKnowledgeGapsInput, DetectKnowledgeGapsResponse> {
  private readonly analyticsEngine: AnalyticsEngine;
  private readonly conversationRepository: ConversationRepository;
  private readonly messageRepository: MessageRepository;
  private readonly knowledgeGapDetector: KnowledgeGapDetector;
  private readonly knowledgeGapsRepository: KnowledgeGapsRepository;

  constructor(dependencies: DetectKnowledgeGapsDependencies) {
    super(DetectKnowledgeGapsToolDef, DetectKnowledgeGapsSchema);
    this.analyticsEngine = dependencies.analyticsEngine;
    this.conversationRepository = dependencies.conversationRepository;
    this.messageRepository = dependencies.messageRepository;
    this.knowledgeGapDetector = dependencies.knowledgeGapDetector;
    this.knowledgeGapsRepository = dependencies.knowledgeGapsRepository;
  }

  /**
   * Execute the detect_knowledge_gaps tool
   */
  protected async executeImpl(input: DetectKnowledgeGapsInput, _context: ToolContext): Promise<DetectKnowledgeGapsResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Enhanced validation with comprehensive input checking
      const validatedInput = withEnhancedValidation(() => {
        // Validate time range with 60-day default for knowledge gap analysis
        const timeRange = validateDateRange(input.startDate, input.endDate, '', {
          maxDays: 365, // Allow up to 1 year for comprehensive gap analysis
          defaultDays: 60 // Default to 60 days for meaningful pattern detection
        });

        // Validate topic areas array
        const topicAreas = validateStringArray(input.topicAreas, 'topicAreas', {
          maxLength: 20, // Reasonable limit for topic areas
          maxItemLength: 200, // Max length for topic area names
          minItemLength: 2, // Min length for meaningful topic names
          allowEmpty: true, // Allow empty to analyze all topics
          allowDuplicates: false // No duplicates needed
        });

        // Validate minimum frequency threshold
        const minFrequency = validateFrequency(
          input.minFrequency, 
          'minFrequency', 
          1, // Minimum frequency of 1
          100, // Maximum frequency of 100 for performance  
          1 // Default frequency of 1
        );

        return { 
          timeRange, 
          topicAreas, 
          minFrequency,
          includeResolved: input.includeResolved,
          includeSuggestions: input.includeSuggestions
        };
      }, 'knowledge gaps input validation');

      // Step 2: Get conversations and messages for analysis
      const { conversations, messages } = await this.getAnalysisData(
        validatedInput.timeRange, 
        validatedInput.topicAreas
      );
    
      if (conversations.length === 0) {
        return this.createEmptyResponse(validatedInput.timeRange, input, startTime);
      }

      // Step 3: Detect knowledge gaps
      const knowledgeGaps = await this.detectGaps(conversations, messages, validatedInput);
      
      // Step 4: Analyze gap categories and patterns
      const [categories, topicCoverage, frequencyAnalysis] = await Promise.all([
        this.analyzeGapCategories(knowledgeGaps),
        this.analyzeTopicCoverage(conversations, messages, knowledgeGaps, validatedInput.topicAreas),
        this.analyzeGapFrequency(knowledgeGaps, validatedInput.timeRange)
      ]);

      // Step 5: Generate resolution suggestions if requested
      const resolutionSuggestions = validatedInput.includeSuggestions ? 
        this.generateResolutionSuggestions(knowledgeGaps) : undefined;

      // Step 6: Generate learning recommendations
      const learningRecommendations = this.generateLearningRecommendations(knowledgeGaps, topicCoverage);

      // Step 7: Generate insights and next steps
      const insights = this.generateInsights(knowledgeGaps, categories, frequencyAnalysis, topicCoverage);

      // Step 8: Build response metadata
      const analysisDuration = Date.now() - startTime;
      const metadata = {
        conversationCount: conversations.length,
        messageCount: messages.length,
        totalGaps: knowledgeGaps.length,
        unresolvedGaps: knowledgeGaps.filter(g => g.frequency > 1).length, // Using frequency as proxy for unresolved
        analysisDuration,
        minFrequency: validatedInput.minFrequency,
        includedResolved: validatedInput.includeResolved
      };

      return {
        timeRange: validatedInput.timeRange,
        analyzedAt: Date.now(),
        knowledgeGaps,
        categories,
        topicCoverage,
        resolutionSuggestions,
        frequencyAnalysis,
        learningRecommendations,
        insights,
        metadata
      };

    } catch (error) {
      // Enhanced error handling with user-friendly messages
      if (error instanceof ValidationError) {
        throw new Error(JSON.stringify(formatValidationError(error)));
      }
      
      // Re-throw other errors with context
      throw new Error(`Knowledge gaps detection failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  /**
   * Get conversations and messages for analysis
   */
  private async getAnalysisData(timeRange: TimeRange, topicAreas?: string[]) {
    return wrapDatabaseOperation(async () => {
      // Get conversations in time range
      const conversationsResult = await this.conversationRepository.findByDateRange(
        timeRange.start,
        timeRange.end,
        1000, // Large limit
        0
      );
      const conversations = conversationsResult.data;

      // Get messages for all conversations
      const messages = [];
      for (const conversation of conversations) {
        const conversationMessages = await this.messageRepository.findByConversationId(conversation.id);
        
        // Filter by topic areas if specified
        if (topicAreas && topicAreas.length > 0) {
          const filteredMessages = conversationMessages.filter(msg => 
            topicAreas.some(topic => 
              msg.content.toLowerCase().includes(topic.toLowerCase())
            )
          );
          messages.push(...filteredMessages);
        } else {
          messages.push(...conversationMessages);
        }
      }

      return { conversations, messages };
    }, 'Failed to retrieve analysis data');
  }

  /**
   * Detect knowledge gaps in conversations
   */
  private async detectGaps(conversations: any[], messages: any[], validatedInput: any): Promise<DetectedKnowledgeGap[]> {
    return wrapDatabaseOperation(async () => {
      const allGaps: DetectedKnowledgeGap[] = [];

      // Analyze each conversation for knowledge gaps
      for (const conversation of conversations) {
        const conversationMessages = messages.filter(m => m.conversationId === conversation.id);
        if (conversationMessages.length === 0) continue;

        const gaps = await this.knowledgeGapDetector.detectGaps([{ conversation, messages: conversationMessages }]);
        
        // Filter gaps based on validated input criteria
        const filteredGaps = gaps.filter(gap => {
          // Check frequency threshold
          if (gap.frequency < validatedInput.minFrequency) return false;
          
          // Check if resolved gaps should be included (using frequency as proxy)
          if (!validatedInput.includeResolved && gap.frequency <= 1) return false;
          
          return true;
        });

        allGaps.push(...filteredGaps);
      }

      // Deduplicate and merge similar gaps
      return this.deduplicateGaps(allGaps);
    }, 'Failed to detect knowledge gaps');
  }

  /**
   * Analyze knowledge gap categories
   */
  private async analyzeGapCategories(knowledgeGaps: DetectedKnowledgeGap[]): Promise<KnowledgeGapCategory[]> {
    return wrapDatabaseOperation(async () => {
      const categoryMap = new Map<string, {
        gaps: DetectedKnowledgeGap[];
        totalFrequency: number;
        resolvedCount: number;
      }>();

      // Group gaps by category
      knowledgeGaps.forEach(gap => {
        const category = gap.type || 'General'; // Using type as category
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { gaps: [], totalFrequency: 0, resolvedCount: 0 });
        }
        
        const catData = categoryMap.get(category)!;
        catData.gaps.push(gap);
        catData.totalFrequency += gap.frequency;
        if (gap.frequency <= 1) catData.resolvedCount++; // Using frequency as proxy for resolved
      });

      // Create category analysis
      return Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        name: this.formatCategoryName(category),
        gapCount: data.gaps.length,
        averageFrequency: data.totalFrequency / data.gaps.length,
        resolutionRate: data.resolvedCount / data.gaps.length,
        priority: this.calculateCategoryPriority(data.gaps, data.totalFrequency, data.resolvedCount)
      }));
    }, 'Failed to analyze gap categories');
  }

  /**
   * Analyze topic coverage
   */
  private async analyzeTopicCoverage(
    conversations: any[], 
    messages: any[], 
    knowledgeGaps: DetectedKnowledgeGap[], 
    topicAreas?: string[]
  ): Promise<TopicCoverage[]> {
    return wrapDatabaseOperation(async () => {
      // Extract topics from messages or use provided topic areas
      const topics = topicAreas && topicAreas.length > 0 ? 
        topicAreas : this.extractTopicsFromMessages(messages);

      return topics.map(topic => {
        const topicMessages = messages.filter(msg => 
          msg.content.toLowerCase().includes(topic.toLowerCase())
        );
        
        const topicGaps = knowledgeGaps.filter(gap => 
          gap.content.toLowerCase().includes(topic.toLowerCase()) ||
          gap.relatedTopics.some(t => t.toLowerCase().includes(topic.toLowerCase()))
        );

        return {
          topic,
          frequency: topicMessages.length,
          coverageDepth: this.calculateCoverageDepth(topicMessages, topicGaps),
          hasGaps: topicGaps.length > 0,
          gaps: topicGaps.map(gap => gap.content),
          suggestedResources: this.suggestResourcesForTopic(topic, topicGaps)
        };
      });
    }, 'Failed to analyze topic coverage');
  }

  /**
   * Analyze gap frequency patterns
   */
  private async analyzeGapFrequency(knowledgeGaps: DetectedKnowledgeGap[], timeRange: TimeRange): Promise<DetectKnowledgeGapsResponse['frequencyAnalysis']> {
    return wrapDatabaseOperation(async () => {
      // Most frequent unresolved gaps (using frequency as proxy)
      const unresolvedGaps = knowledgeGaps.filter(gap => gap.frequency > 1);
      const mostFrequent = unresolvedGaps
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10)
        .map(gap => ({
          topic: gap.content.substring(0, 50) + '...', // Using content as topic
          frequency: gap.frequency,
          lastSeen: gap.lastOccurrence
        }));

      // Calculate trending and improving topics
      const trending = await this.calculateTrendingGaps(knowledgeGaps, timeRange);
      const improving = await this.calculateImprovingTopics(knowledgeGaps, timeRange);

      return {
        mostFrequent,
        trending,
        improving
      };
    }, 'Failed to analyze gap frequency');
  }

  /**
   * Generate resolution suggestions
   */
  private generateResolutionSuggestions(knowledgeGaps: DetectedKnowledgeGap[]): ResolutionSuggestion[] {
    const suggestions: ResolutionSuggestion[] = [];

    knowledgeGaps
      .filter(gap => gap.frequency > 1) // Using frequency as proxy for unresolved
      .slice(0, 20) // Limit to top 20 gaps
      .forEach((gap, index) => {
        const suggestionType = this.determineSuggestionType(gap);
        const suggestion: ResolutionSuggestion = {
          gapId: gap.id,
          type: suggestionType,
          action: this.generateActionSuggestion(gap, suggestionType),
          priority: Math.min(5, Math.max(1, Math.floor(gap.frequency / 2) + 1)),
          effort: this.estimateEffort(gap, suggestionType),
          impact: this.estimateImpact(gap),
          resources: this.suggestResources(gap, suggestionType)
        };
        
        suggestions.push(suggestion);
      });

    return suggestions.sort((a, b) => (b.priority * b.impact) - (a.priority * a.impact));
  }

  /**
   * Generate learning recommendations
   */
  private generateLearningRecommendations(
    knowledgeGaps: DetectedKnowledgeGap[], 
    topicCoverage: TopicCoverage[]
  ): DetectKnowledgeGapsResponse['learningRecommendations'] {
    // High priority areas (frequent unresolved gaps)
    const highPriority = knowledgeGaps
      .filter(gap => gap.frequency >= 3) // High frequency gaps
      .slice(0, 5)
      .map(gap => gap.content.substring(0, 50) + '...'); // Using content as topic

    // Learning paths based on related topics
    const learningPaths = this.generateLearningPaths(knowledgeGaps, topicCoverage);

    // Resource recommendations
    const resources = this.generateResourceRecommendations(knowledgeGaps, topicCoverage);

    return {
      highPriority,
      learningPaths,
      resources
    };
  }

  /**
   * Generate insights and analysis
   */
  private generateInsights(
    knowledgeGaps: DetectedKnowledgeGap[],
    categories: KnowledgeGapCategory[],
    frequencyAnalysis: any,
    topicCoverage: TopicCoverage[]
  ): DetectKnowledgeGapsResponse['insights'] {
    const keyInsights: string[] = [];
    const concerns: string[] = [];
    const progress: string[] = [];
    const nextSteps: string[] = [];

    // Gap analysis insights
    const unresolvedCount = knowledgeGaps.filter(g => g.frequency > 1).length; // Using frequency as proxy
    const totalGaps = knowledgeGaps.length;
    
    if (totalGaps === 0) {
      keyInsights.push('No significant knowledge gaps detected');
    } else {
      keyInsights.push(`Identified ${totalGaps} knowledge gaps, ${unresolvedCount} unresolved`);
      
      const resolutionRate = totalGaps > 0 ? ((totalGaps - unresolvedCount) / totalGaps) * 100 : 0;
      if (resolutionRate > 70) {
        progress.push(`High resolution rate: ${Math.round(resolutionRate)}% of gaps have been resolved`);
      } else if (resolutionRate < 30) {
        concerns.push(`Low resolution rate: Only ${Math.round(resolutionRate)}% of gaps have been resolved`);
      }
    }

    // Category insights
    const highPriorityCategories = categories.filter(c => c.priority >= 4);
    if (highPriorityCategories.length > 0) {
      concerns.push(`High priority knowledge areas: ${highPriorityCategories.map(c => c.name).join(', ')}`);
      nextSteps.push(`Focus learning efforts on: ${highPriorityCategories[0].name}`);
    }

    // Frequency insights
    if (frequencyAnalysis.mostFrequent.length > 0) {
      const topGap = frequencyAnalysis.mostFrequent[0];
      keyInsights.push(`Most frequent knowledge gap: ${topGap.topic} (${topGap.frequency} occurrences)`);
    }

    // Topic coverage insights
    const poorCoverage = topicCoverage.filter(t => t.coverageDepth < 30);
    if (poorCoverage.length > 0) {
      concerns.push(`Topics with poor coverage: ${poorCoverage.map(t => t.topic).join(', ')}`);
    }

    // Trending insights
    if (frequencyAnalysis.trending.length > 0) {
      const trending = frequencyAnalysis.trending[0];
      keyInsights.push(`Trending knowledge gap: ${trending.topic} (increasing frequency)`);
    }

    if (frequencyAnalysis.improving.length > 0) {
      const improving = frequencyAnalysis.improving[0];
      progress.push(`Improving area: ${improving.topic} (${Math.round(improving.resolutionRate * 100)}% resolution rate)`);
    }

    // Generate next steps if none exist
    if (nextSteps.length === 0) {
      if (unresolvedCount > 0) {
        nextSteps.push('Address highest frequency unresolved knowledge gaps');
      } else {
        nextSteps.push('Continue monitoring for new knowledge gaps');
      }
    }

    return {
      keyInsights: keyInsights.length > 0 ? keyInsights : ['Knowledge gap analysis completed'],
      concerns: concerns,
      progress: progress,
      nextSteps: nextSteps
    };
  }

  // Helper methods
  private deduplicateGaps(gaps: DetectedKnowledgeGap[]): DetectedKnowledgeGap[] {
    const uniqueGaps = new Map<string, DetectedKnowledgeGap>();
    
    gaps.forEach(gap => {
      const key = `${gap.type.toLowerCase()}-${gap.content.toLowerCase().substring(0, 50)}`;  // Using type and content
      if (uniqueGaps.has(key)) {
        // Merge duplicate gaps by combining frequency
        const existing = uniqueGaps.get(key)!;
        existing.frequency += gap.frequency;
        existing.lastOccurrence = Math.max(existing.lastOccurrence, gap.lastOccurrence);
      } else {
        uniqueGaps.set(key, gap);
      }
    });

    return Array.from(uniqueGaps.values());
  }

  private formatCategoryName(category: string): string {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  private calculateCategoryPriority(gaps: DetectedKnowledgeGap[], totalFrequency: number, resolvedCount: number): number {
    const avgFrequency = totalFrequency / gaps.length;
    const resolutionRate = resolvedCount / gaps.length;
    
    // Higher frequency and lower resolution rate = higher priority
    const frequencyScore = Math.min(5, avgFrequency);
    const resolutionPenalty = resolutionRate * 2;
    
    return Math.max(1, Math.min(5, Math.round(frequencyScore - resolutionPenalty + 1)));
  }

  private extractTopicsFromMessages(messages: any[]): string[] {
    const topicCandidates = new Map<string, { count: number, contexts: string[] }>();
    const phrasePatterns = new Map<string, number>();
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      sentences.forEach(sentence => {
        const words = sentence.trim().split(/\s+/);
        
        // Extract noun phrases (simplified NLP)
        for (let i = 0; i < words.length; i++) {
          const word = this.cleanWord(words[i]);
          
          // Single meaningful words
          if (this.isMeaningfulTopicWord(word)) {
            this.addTopicCandidate(topicCandidates, word, sentence);
          }
          
          // Two-word phrases
          if (i < words.length - 1) {
            const word2 = this.cleanWord(words[i + 1]);
            const phrase = `${word} ${word2}`;
            if (this.isMeaningfulPhrase(word, word2)) {
              this.addTopicCandidate(topicCandidates, phrase, sentence);
              phrasePatterns.set(phrase, (phrasePatterns.get(phrase) || 0) + 1);
            }
          }
          
          // Three-word phrases (for technical terms)
          if (i < words.length - 2) {
            const word2 = this.cleanWord(words[i + 1]);
            const word3 = this.cleanWord(words[i + 2]);
            const phrase = `${word} ${word2} ${word3}`;
            if (this.isTechnicalPhrase(word, word2, word3)) {
              this.addTopicCandidate(topicCandidates, phrase, sentence);
            }
          }
        }
        
        // Extract domain-specific patterns
        this.extractDomainSpecificTopics(sentence, topicCandidates);
      });
    });
    
    // Score and rank topics
    return this.rankTopics(topicCandidates, phrasePatterns).slice(0, 15);
  }
  
  private cleanWord(word: string): string {
    return word.replace(/[^a-z0-9]/g, '').toLowerCase();
  }
  
  private isMeaningfulTopicWord(word: string): boolean {
    return word.length >= 4 && 
           !this.isCommonWord(word) && 
           !this.isStopWord(word) &&
           !/^\d+$/.test(word); // Not just numbers
  }
  
  private isMeaningfulPhrase(word1: string, word2: string): boolean {
    return word1.length >= 3 && word2.length >= 3 &&
           !this.isCommonWord(word1) && !this.isCommonWord(word2) &&
           !this.isStopWord(word1) && !this.isStopWord(word2);
  }
  
  private isTechnicalPhrase(word1: string, word2: string, word3: string): boolean {
    const phrase = `${word1} ${word2} ${word3}`;
    return (phrase.includes('machine learning') ||
            phrase.includes('data science') ||
            phrase.includes('artificial intelligence') ||
            phrase.includes('software development') ||
            phrase.includes('web development') ||
            phrase.includes('database design') ||
            word1.length >= 4 && word2.length >= 4 && word3.length >= 4);
  }
  
  private addTopicCandidate(candidates: Map<string, { count: number, contexts: string[] }>, topic: string, context: string): void {
    if (!candidates.has(topic)) {
      candidates.set(topic, { count: 0, contexts: [] });
    }
    const candidate = candidates.get(topic)!;
    candidate.count++;
    if (candidate.contexts.length < 3) {
      candidate.contexts.push(context.substring(0, 100));
    }
  }
  
  private extractDomainSpecificTopics(sentence: string, candidates: Map<string, { count: number, contexts: string[] }>): void {
    // Programming and technology terms
    const techPatterns = [
      /\b(api|rest|graphql|sql|nosql|database|server|client|frontend|backend)\b/g,
      /\b(react|angular|vue|node|python|javascript|typescript|java|kotlin)\b/g,
      /\b(aws|azure|docker|kubernetes|microservices|architecture)\b/g,
      /\b(authentication|authorization|security|encryption|oauth)\b/g
    ];
    
    // Business and analytics terms
    const businessPatterns = [
      /\b(analytics|metrics|kpi|roi|conversion|engagement|retention)\b/g,
      /\b(strategy|planning|roadmap|stakeholder|requirement|specification)\b/g,
      /\b(user experience|user interface|design system|wireframe|prototype)\b/g
    ];
    
    [...techPatterns, ...businessPatterns].forEach(pattern => {
      const matches = sentence.match(pattern);
      if (matches) {
        matches.forEach(match => {
          this.addTopicCandidate(candidates, match, sentence);
        });
      }
    });
  }
  
  private rankTopics(candidates: Map<string, { count: number, contexts: string[] }>, phrases: Map<string, number>): string[] {
    return Array.from(candidates.entries())
      .map(([topic, data]) => {
        let score = data.count;
        
        // Boost multi-word phrases
        if (topic.includes(' ')) score *= 1.5;
        
        // Boost technical terms
        if (this.isTechnicalTerm(topic)) score *= 1.3;
        
        // Boost topics with rich context
        if (data.contexts.length > 1) score *= 1.2;
        
        return { topic, score, count: data.count };
      })
      .filter(item => item.count >= 2) // Must appear at least twice
      .sort((a, b) => b.score - a.score)
      .map(item => item.topic);
  }
  
  private isTechnicalTerm(term: string): boolean {
    const technicalIndicators = [
      'api', 'database', 'server', 'client', 'framework', 'library',
      'algorithm', 'architecture', 'protocol', 'interface', 'system',
      'development', 'programming', 'analytics', 'machine', 'learning'
    ];
    
    return technicalIndicators.some(indicator => 
      term.toLowerCase().includes(indicator)
    );
  }
  
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'its', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
      'did', 'may', 'she', 'use', 'use', 'her', 'how', 'say', 'she', 'use',
      'each', 'make', 'most', 'over', 'said', 'some', 'time', 'very', 'what',
      'with', 'have', 'from', 'they', 'will', 'been', 'each', 'like', 'more',
      'many', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like',
      'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well'
    ]);
    
    return stopWords.has(word);
  }

  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'about', 'would', 'could', 'should', 'think', 'know', 'want', 'need',
      'like', 'time', 'work', 'good', 'great', 'really', 'thing', 'things',
      'something', 'someone', 'anything', 'nothing', 'everything', 'everyone',
      'maybe', 'probably', 'definitely', 'certainly', 'actually', 'basically',
      'generally', 'specifically', 'especially', 'particularly', 'obviously',
      'clearly', 'simply', 'exactly', 'quite', 'rather', 'pretty', 'fairly',
      'seems', 'appears', 'looks', 'feels', 'sounds', 'means', 'says',
      'tells', 'shows', 'gives', 'makes', 'takes', 'gets', 'comes', 'goes'
    ]);
    return commonWords.has(word);
  }

  private calculateCoverageDepth(messages: any[], gaps: DetectedKnowledgeGap[]): number {
    if (messages.length === 0) return 0;
    
    let depthScore = 0;
    
    // Message depth factors
    const avgMessageLength = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
    const lengthScore = Math.min(30, avgMessageLength / 100); // Up to 30 points for message depth
    
    // Question depth (more specific questions indicate deeper exploration)
    const questions = messages.filter(m => m.content.includes('?'));
    const questionDepthScore = this.analyzeQuestionDepth(questions);
    
    // Topic exploration breadth
    const topicBreadthScore = this.calculateTopicBreadth(messages);
    
    // Follow-up pattern analysis
    const followUpScore = this.analyzeFollowUpPatterns(messages);
    
    // Technical depth indicators
    const technicalDepthScore = this.analyzeTechnicalDepth(messages);
    
    depthScore = lengthScore + questionDepthScore + topicBreadthScore + followUpScore + technicalDepthScore;
    
    // Apply gap penalty
    const unresolvedGaps = gaps.filter(g => g.frequency > 1); // Using frequency as proxy for unresolved
    const gapPenalty = Math.min(40, unresolvedGaps.length * 8); // Up to 40 point penalty
    
    // Resolution bonus
    const resolvedGaps = gaps.filter(g => g.frequency <= 1); // Using frequency as proxy for resolved
    const resolutionBonus = Math.min(20, resolvedGaps.length * 5);
    
    const finalScore = Math.max(0, Math.min(100, depthScore - gapPenalty + resolutionBonus));
    return Math.round(finalScore);
  }
  
  private analyzeQuestionDepth(questions: any[]): number {
    if (questions.length === 0) return 0;
    
    let depthScore = 0;
    const depthIndicators = {
      'why': 4,     // Deep understanding questions
      'how': 3,     // Process/method questions  
      'what if': 4, // Scenario exploration
      'explain': 3, // Clarification requests
      'difference': 2, // Comparison questions
      'best': 2,    // Optimization questions
      'pros and cons': 3, // Analysis questions
      'impact': 3,  // Consequence questions
      'relationship': 3, // Connection questions
      'cause': 4    // Root cause questions
    };
    
    questions.forEach(q => {
      const content = q.content.toLowerCase();
      Object.entries(depthIndicators).forEach(([indicator, score]) => {
        if (content.includes(indicator)) {
          depthScore += score;
        }
      });
    });
    
    return Math.min(25, depthScore / questions.length * 5); // Normalize to 0-25
  }
  
  private calculateTopicBreadth(messages: any[]): number {
    const topics = this.extractTopicsFromMessages(messages);
    const uniqueTopics = new Set(topics);
    
    // Score based on topic diversity
    const breadthScore = Math.min(15, uniqueTopics.size * 1.5);
    return breadthScore;
  }
  
  private analyzeFollowUpPatterns(messages: any[]): number {
    let followUpScore = 0;
    
    for (let i = 1; i < messages.length; i++) {
      const current = messages[i].content.toLowerCase();
      const previous = messages[i-1].content.toLowerCase();
      
      // Look for follow-up indicators
      const followUpIndicators = [
        'can you elaborate', 'tell me more', 'expand on', 'go deeper',
        'what about', 'how does this relate', 'can you explain',
        'i\'m curious about', 'what if we', 'how would'
      ];
      
      if (followUpIndicators.some(indicator => current.includes(indicator))) {
        followUpScore += 2;
      }
      
      // Check for topic continuity
      if (this.hasTopicContinuity(previous, current)) {
        followUpScore += 1;
      }
    }
    
    return Math.min(15, followUpScore);
  }
  
  private hasTopicContinuity(previous: string, current: string): boolean {
    const prevWords = new Set(previous.split(' ').filter(w => w.length > 4));
    const currWords = new Set(current.split(' ').filter(w => w.length > 4));
    
    // Check for shared meaningful words
    const intersection = new Set([...prevWords].filter(x => currWords.has(x)));
    return intersection.size > 0;
  }
  
  private analyzeTechnicalDepth(messages: any[]): number {
    let technicalScore = 0;
    const technicalIndicators = [
      'implementation', 'algorithm', 'architecture', 'design pattern',
      'performance', 'scalability', 'optimization', 'complexity',
      'trade-off', 'comparison', 'analysis', 'evaluation',
      'best practice', 'methodology', 'framework', 'strategy'
    ];
    
    messages.forEach(msg => {
      const content = msg.content.toLowerCase();
      technicalIndicators.forEach(indicator => {
        if (content.includes(indicator)) {
          technicalScore += 1;
        }
      });
    });
    
    return Math.min(15, technicalScore);
  }

  private suggestResourcesForTopic(topic: string, gaps: DetectedKnowledgeGap[]): string[] {
    const resources: string[] = [];
    
    // Generic suggestions based on topic
    if (gaps.length > 0) {
      resources.push(`Search for documentation on ${topic}`);
      resources.push(`Find tutorials or courses about ${topic}`);
      if (gaps.some(g => g.frequency > 3)) {
        resources.push(`Consult experts or communities focused on ${topic}`);
      }
    }

    return resources.slice(0, 3);
  }

  private async calculateTrendingGaps(gaps: DetectedKnowledgeGap[], timeRange: TimeRange) {
    if (gaps.length === 0) return [];
    
    const timeSpan = timeRange.end - timeRange.start;
    const midPoint = timeRange.start + (timeSpan / 2);
    
    // Group gaps into early and recent periods
    const earlyGaps = new Map<string, number>();
    const recentGaps = new Map<string, number>();
    
    gaps.forEach(gap => {
      const key = gap.content.substring(0, 30); // Using content as topic key
      
      if (gap.firstOccurrence < midPoint) {
        earlyGaps.set(key, (earlyGaps.get(key) || 0) + 1);
      }
      
      if (gap.lastOccurrence > midPoint) {
        recentGaps.set(key, (recentGaps.get(key) || 0) + 1);
      }
    });
    
    // Calculate trending topics
    const trending = [];
    
    for (const [topic, recentCount] of recentGaps.entries()) {
      const earlyCount = earlyGaps.get(topic) || 0;
      
      // Calculate trend strength
      let trendStrength = 0;
      if (earlyCount === 0 && recentCount > 0) {
        trendStrength = 2; // New emerging gap
      } else if (earlyCount > 0) {
        const growthRate = (recentCount - earlyCount) / earlyCount;
        if (growthRate > 0.5) { // 50% increase
          trendStrength = 1 + Math.min(1, growthRate); // Scale 1-2
        }
      }
      
      if (trendStrength > 0.5 && recentCount >= 2) {
        trending.push({
          topic,
          trend: Math.round(trendStrength * 10) / 10,
          currentFrequency: recentCount
        });
      }
    }
    
    return trending
      .sort((a, b) => b.trend - a.trend)
      .slice(0, 5);
  }

  private async calculateImprovingTopics(gaps: DetectedKnowledgeGap[], timeRange: TimeRange) {
    if (gaps.length === 0) return [];
    
    const timeSpan = timeRange.end - timeRange.start;
    const quarterSpan = timeSpan / 4;
    
    // Group by topic and track resolution over time
    const topicTimeline = new Map<string, {
      periods: Array<{ resolved: number, total: number }>
    }>();
    
    gaps.forEach(gap => {
      const topicKey = gap.content.substring(0, 30); // Using content as topic key
      if (!topicTimeline.has(topicKey)) {
        topicTimeline.set(topicKey, {
          periods: new Array(4).fill(0).map(() => ({ resolved: 0, total: 0 }))
        });
      }
      
      // Determine which period this gap belongs to
      const periodIndex = Math.min(3, Math.floor((gap.lastOccurrence - timeRange.start) / quarterSpan));
      const timeline = topicTimeline.get(topicKey)!;
      
      timeline.periods[periodIndex].total++;
      if (gap.frequency <= 1) { // Using frequency as proxy for resolved
        timeline.periods[periodIndex].resolved++;
      }
    });
    
    const improving = [];
    
    for (const [topic, timeline] of topicTimeline.entries()) {
      // Calculate improvement trend
      const resolutionRates = timeline.periods.map(p => 
        p.total > 0 ? p.resolved / p.total : 0
      );
      
      // Only consider topics with activity in multiple periods
      const activePeriods = timeline.periods.filter(p => p.total > 0).length;
      if (activePeriods < 2) continue;
      
      // Calculate trend using linear regression on resolution rates
      const trend = this.calculateTrend(resolutionRates);
      const overallResolutionRate = timeline.periods.reduce((sum, p) => sum + p.resolved, 0) /
                                   timeline.periods.reduce((sum, p) => sum + p.total, 0);
      
      // Consider improving if trend is positive and overall resolution rate is decent
      if (trend > 0.1 && overallResolutionRate > 0.3) {
        improving.push({
          topic,
          trend: Math.round(trend * 10) / 10,
          resolutionRate: Math.round(overallResolutionRate * 100) / 100
        });
      }
    }
    
    return improving
      .sort((a, b) => b.trend - a.trend)
      .slice(0, 5);
  }
  
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0);
    
    const denominator = (n * sumXX - sumX * sumX);
    if (denominator === 0) return 0;
    
    return (n * sumXY - sumX * sumY) / denominator;
  }

  private determineSuggestionType(gap: DetectedKnowledgeGap): ResolutionSuggestion['type'] {
    if (gap.content.toLowerCase().includes('how to') || gap.content.toLowerCase().includes('implement')) {
      return 'practice';
    } else if (gap.content.toLowerCase().includes('expert') || gap.content.toLowerCase().includes('advice')) {
      return 'consultation';
    } else if (gap.content.toLowerCase().includes('test') || gap.content.toLowerCase().includes('try')) {
      return 'experimentation';
    }
    return 'research';
  }

  private generateActionSuggestion(gap: DetectedKnowledgeGap, type: ResolutionSuggestion['type']): string {
    const actions = {
      research: `Research and study ${gap.relatedTopics[0] || gap.type} to understand ${gap.content}`,
      practice: `Practice implementing solutions related to ${gap.relatedTopics[0] || gap.type}`,
      consultation: `Consult with experts about ${gap.relatedTopics[0] || gap.type} and ${gap.content}`,
      experimentation: `Experiment with different approaches to ${gap.relatedTopics[0] || gap.type}`
    };
    
    return actions[type];
  }

  private estimateEffort(gap: DetectedKnowledgeGap, type: ResolutionSuggestion['type']): number {
    const baseEffort = gap.frequency <= 2 ? 1 : gap.frequency <= 5 ? 3 : 5;
    const typeMultiplier = {
      research: 1,
      practice: 1.5,
      consultation: 0.8,
      experimentation: 2
    };
    
    return Math.min(5, Math.max(1, Math.round(baseEffort * typeMultiplier[type])));
  }

  private estimateImpact(gap: DetectedKnowledgeGap): number {
    // Higher frequency gaps have higher impact when resolved
    return Math.min(5, Math.max(1, Math.ceil(gap.frequency / 2)));
  }

  private suggestResources(gap: DetectedKnowledgeGap, type: ResolutionSuggestion['type']): string[] {
    const resources = [];
    
    switch (type) {
      case 'research':
        resources.push('Official documentation', 'Online tutorials', 'Academic papers');
        break;
      case 'practice':
        resources.push('Hands-on exercises', 'Practice projects', 'Code examples');
        break;
      case 'consultation':
        resources.push('Subject matter experts', 'Professional forums', 'Mentorship');
        break;
      case 'experimentation':
        resources.push('Test environments', 'Prototype tools', 'Experiment frameworks');
        break;
    }
    
    return resources;
  }

  private generateLearningPaths(gaps: DetectedKnowledgeGap[], coverage: TopicCoverage[]) {
    // Group related topics into learning paths
    const paths = [];
    
    const technicalTopics = gaps.filter(g => g.type === 'skill' || g.type === 'concept').slice(0, 3);
    if (technicalTopics.length > 0) {
      paths.push({
        path: 'Technical Skills Development',
        topics: technicalTopics.map(g => g.content.substring(0, 50) + '...'),
        estimatedEffort: '2-4 weeks',
        expectedImpact: 'Resolve fundamental technical knowledge gaps'
      });
    }

    return paths;
  }

  private generateResourceRecommendations(gaps: DetectedKnowledgeGap[], coverage: TopicCoverage[]) {
    const resources = [];
    
    // Suggest different types of resources based on gap patterns
    const highFrequencyGaps = gaps.filter(g => g.frequency >= 3).slice(0, 3);
    
    highFrequencyGaps.forEach(gap => {
      resources.push({
        type: 'documentation' as const,
        title: `Official ${gap.relatedTopics[0] || gap.type} Documentation`,
        relevance: `Addresses frequent questions about ${gap.content.substring(0, 50)}`,
        topics: gap.relatedTopics.length > 0 ? gap.relatedTopics.slice(0, 1) : [gap.type]
      });
    });

    return resources.slice(0, 5);
  }

  private createEmptyResponse(timeRange: TimeRange, input: DetectKnowledgeGapsInput, startTime: number): DetectKnowledgeGapsResponse {
    return {
      timeRange,
      analyzedAt: Date.now(),
      knowledgeGaps: [],
      categories: [],
      topicCoverage: [],
      resolutionSuggestions: input.includeSuggestions ? [] : undefined,
      frequencyAnalysis: {
        mostFrequent: [],
        trending: [],
        improving: []
      },
      learningRecommendations: {
        highPriority: [],
        learningPaths: [],
        resources: []
      },
      insights: {
        keyInsights: ['No conversations found in the specified time range'],
        concerns: [],
        progress: [],
        nextSteps: ['Start conversations to begin knowledge gap analysis']
      },
      metadata: {
        conversationCount: 0,
        messageCount: 0,
        totalGaps: 0,
        unresolvedGaps: 0,
        analysisDuration: Date.now() - startTime,
        minFrequency: input.minFrequency,
        includedResolved: input.includeResolved
      }
    };
  }

  /**
   * Static factory method to create a DetectKnowledgeGapsTool instance
   */
  static create(dependencies: DetectKnowledgeGapsDependencies): DetectKnowledgeGapsTool {
    return new DetectKnowledgeGapsTool(dependencies);
  }
}