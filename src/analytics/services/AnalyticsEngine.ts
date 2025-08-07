/**
 * Analytics Engine - Central orchestration service for Phase 5 analytics
 * 
 * Coordinates all analytics components:
 * - Conversation flow analysis
 * - Productivity pattern detection
 * - Knowledge gap identification
 * - Decision quality tracking
 * - Report generation and caching
 */

import { DatabaseManager } from '../../storage/Database.js';
import { 
  ConversationAnalyticsRepository,
  ProductivityPatternsRepository,
  KnowledgeGapsRepository,
  DecisionTrackingRepository,
  TimeRange
} from '../repositories/index.js';

import { ConversationRepository } from '../../storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../../storage/repositories/MessageRepository.js';
import { ConversationFlowAnalyzer } from '../analyzers/ConversationFlowAnalyzer.js';
import { ProductivityAnalyzer } from '../analyzers/ProductivityAnalyzer.js';
import { KnowledgeGapDetector } from '../analyzers/KnowledgeGapDetector.js';
import { DecisionTracker } from '../analyzers/DecisionTracker.js';

export interface AnalyticsEngineConfig {
  enableIncrementalProcessing: boolean;
  cacheExpirationMinutes: number;
  batchProcessingSize: number;
  maxProcessingTimeMs: number;
}

export interface AnalyticsReport {
  generatedAt: number;
  timeRange: TimeRange;
  
  conversationMetrics: {
    totalConversations: number;
    averageProductivity: number;
    averageDepth: number;
    averageCircularity: number;
    totalInsights: number;
  };
  
  productivityInsights: {
    peakHours: number[];
    optimalSessionLength: number;
    topQuestionPatterns: string[];
    weeklyTrend: number;
  };
  
  knowledgeGaps: {
    totalUnresolved: number;
    criticalGaps: number;
    averageResolutionTime: number;
    topicCoverage: number;
  };
  
  decisionQuality: {
    totalDecisions: number;
    averageQuality: number;
    averageOutcome: number;
    reversalRate: number;
  };
  
  recommendations: string[];
  insights: string[];
}

/**
 * Central analytics engine orchestrating all analytics components
 */
export class AnalyticsEngine {
  private conversationAnalytics: ConversationAnalyticsRepository;
  private productivityPatterns: ProductivityPatternsRepository;
  private knowledgeGaps: KnowledgeGapsRepository;
  private decisionTracking: DecisionTrackingRepository;
  private conversations: ConversationRepository;
  private messages: MessageRepository;
  
  // Analyzer instances for real data processing
  private conversationFlowAnalyzer: ConversationFlowAnalyzer;
  private productivityAnalyzer: ProductivityAnalyzer;
  private knowledgeGapDetector: KnowledgeGapDetector;
  private decisionTracker: DecisionTracker;
  
  private config: AnalyticsEngineConfig;
  private cache: Map<string, { data: any; expiresAt: number }> = new Map();

  constructor(
    databaseManager: DatabaseManager,
    config: Partial<AnalyticsEngineConfig> = {}
  ) {
    this.conversationAnalytics = new ConversationAnalyticsRepository(databaseManager);
    this.productivityPatterns = new ProductivityPatternsRepository(databaseManager);
    this.knowledgeGaps = new KnowledgeGapsRepository(databaseManager);
    this.decisionTracking = new DecisionTrackingRepository(databaseManager);
    this.conversations = new ConversationRepository(databaseManager);
    this.messages = new MessageRepository(databaseManager);
    
    // Initialize real analyzer instances
    this.conversationFlowAnalyzer = new ConversationFlowAnalyzer();
    this.productivityAnalyzer = new ProductivityAnalyzer();
    this.knowledgeGapDetector = new KnowledgeGapDetector();
    this.decisionTracker = new DecisionTracker();
    
    this.config = {
      enableIncrementalProcessing: true,
      cacheExpirationMinutes: 60,
      batchProcessingSize: 50,
      maxProcessingTimeMs: 30000,
      ...config
    };
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(
    timeRange?: TimeRange,
    format: 'summary' | 'detailed' | 'executive' = 'summary'
  ): Promise<AnalyticsReport> {
    const cacheKey = `report_${format}_${JSON.stringify(timeRange)}`;
    const cached = this.getFromCache<AnalyticsReport>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const validTimeRange = this.validateTimeRange(timeRange);
    const startTime = Date.now();
    
    try {
      // Run analytics in parallel for efficiency
      const [
        conversationMetricsRaw,
        productivityInsightsRaw,
        knowledgeGapMetricsRaw,
        decisionMetricsRaw
      ] = await Promise.all([
        this.getConversationMetrics(validTimeRange).catch(() => ({
          totalConversations: 0,
          averageProductivity: 0,
          averageDepth: 0,
          averageCircularity: 0,
          totalInsights: 0
        })),
        this.getProductivityInsights(validTimeRange).catch(() => ({
          peakHours: [],
          optimalSessionLength: 60,
          topQuestionPatterns: [],
          weeklyTrend: 0
        })),
        this.getKnowledgeGapMetrics(validTimeRange).catch(() => ({
          totalUnresolved: 0,
          criticalGaps: 0,
          averageResolutionTime: 0,
          topicCoverage: 0
        })),
        this.getDecisionMetrics(validTimeRange).catch(() => ({
          totalDecisions: 0,
          averageQuality: 0,
          averageOutcome: 0,
          reversalRate: 0
        }))
      ]);

      // Ensure proper typing by extracting values
      const conversationMetrics = conversationMetricsRaw!;
      const productivityInsights = productivityInsightsRaw!;
      const knowledgeGapMetrics = knowledgeGapMetricsRaw!;
      const decisionMetrics = decisionMetricsRaw!;

      // Generate insights and recommendations
      const insights = this.generateInsights({
        conversationMetrics,
        productivityInsights,
        knowledgeGapMetrics,
        decisionMetrics
      });

      const recommendations = this.generateRecommendations({
        conversationMetrics,
        productivityInsights,
        knowledgeGapMetrics,
        decisionMetrics
      });

      const report: AnalyticsReport = {
        generatedAt: Date.now(),
        timeRange: validTimeRange,
        conversationMetrics,
        productivityInsights,
        knowledgeGaps: knowledgeGapMetrics,
        decisionQuality: decisionMetrics,
        recommendations,
        insights
      };

      // Cache the report
      this.setCache(cacheKey, report);
      
      return report;
    } catch (error) {
      throw new Error(`Failed to generate analytics report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process conversations that need analytics
   */
  async processNeedingAnalysis(): Promise<number> {
    if (!this.config.enableIncrementalProcessing) {
      return 0;
    }

    const startTime = Date.now();
    const conversationIds = await this.conversationAnalytics.getConversationsNeedingAnalysis(
      this.config.batchProcessingSize
    );

    if (conversationIds.length === 0) {
      return 0;
    }

    let processed = 0;
    
    for (const conversationId of conversationIds) {
      // Check processing time limit
      if (Date.now() - startTime > this.config.maxProcessingTimeMs) {
        break;
      }

      try {
        await this.analyzeConversation(conversationId);
        processed++;
      } catch (error) {
        console.error(`Failed to analyze conversation ${conversationId}:`, error);
        // Continue processing other conversations
      }
    }

    return processed;
  }

  /**
   * Analyze single conversation using real analyzer classes
   */
  async analyzeConversation(conversationId: string): Promise<void> {
    // Get conversation and messages
    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const messages = await this.messages.findByConversationId(conversationId);
    if (messages.length === 0) {
      return; // Skip empty conversations
    }

    try {
      // Run comprehensive analysis using real analyzer classes
      const [flowMetrics, productivityMetrics, knowledgeGaps, decisions] = await Promise.all([
        this.conversationFlowAnalyzer.analyzeFlow(conversation, messages),
        this.productivityAnalyzer.analyzeConversationProductivity(conversation, messages),
        this.knowledgeGapDetector.detectGaps([{ conversation, messages }]),
        this.decisionTracker.trackDecisions(conversation, messages)
      ]);

      // Convert analyzer results to analytics repository format
      const analytics = {
        conversationId: conversation.id,
        topicCount: flowMetrics.topicCount,
        topicTransitions: flowMetrics.transitionCount,
        depthScore: flowMetrics.depthScore,
        circularityIndex: flowMetrics.circularityIndex,
        productivityScore: productivityMetrics.overallProductivityScore,
        resolutionTime: flowMetrics.resolutionTime,
        insightCount: productivityMetrics.outputMetrics.insightCount,
        breakthroughCount: productivityMetrics.outputMetrics.breakthroughCount,
        questionQualityAvg: productivityMetrics.questionMetrics.questionQualityScore,
        responseQualityAvg: productivityMetrics.effectivenessScore,
        engagementScore: productivityMetrics.engagementScore,
        metadata: {
          flowMetrics: {
            coherenceScore: flowMetrics.coherenceScore,
            progressionScore: flowMetrics.progressionScore,
            averageTopicDuration: flowMetrics.averageTopicDuration,
            vocabularyRichness: flowMetrics.vocabularyRichness
          },
          productivityMetrics: {
            sessionDuration: productivityMetrics.sessionDuration,
            activeTime: productivityMetrics.activeTime,
            responseLatency: productivityMetrics.responseLatency,
            peakProductivityPeriod: productivityMetrics.peakProductivityPeriod
          },
          gapMetrics: {
            totalGaps: knowledgeGaps.length,
            unresolvedGaps: knowledgeGaps.filter(g => g.frequency && g.frequency > 1).length, // Using frequency as proxy for unresolved
            criticalGaps: knowledgeGaps.filter(g => g.frequency && g.frequency >= 5).length
          },
          decisionMetrics: {
            totalDecisions: decisions.length,
            averageQuality: decisions.length > 0 ? 
              decisions.reduce((sum, d) => sum + (d.clarityScore || 0), 0) / decisions.length : 0,
            reversalCount: decisions.reduce((sum, d) => sum + (d.reversalCount || 0), 0)
          }
        }
      };
      
      // Save comprehensive analytics to repository
      await this.conversationAnalytics.saveAnalytics(analytics);
      
      // Process knowledge gaps
      await this.processKnowledgeGaps(knowledgeGaps, conversationId);
      
      // Process decisions
      await this.processDecisions(decisions, conversationId);
      
      // Clear related caches
      this.invalidateCache(`conversation_${conversationId}`);
      
    } catch (error) {
      console.error(`Failed to analyze conversation ${conversationId}:`, error);
      throw error;
    }
  }

  /**
   * Get conversation metrics
   */
  private async getConversationMetrics(timeRange: TimeRange) {
    const cacheKey = `conversation_metrics_${timeRange.start}_${timeRange.end}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const [productivitySummary, topicFlowSummary] = await Promise.all([
      this.conversationAnalytics.getProductivitySummary(timeRange),
      this.conversationAnalytics.getTopicFlowSummary(timeRange)
    ]);

    const metrics = {
      totalConversations: productivitySummary.totalConversations,
      averageProductivity: productivitySummary.averageScore,
      averageDepth: productivitySummary.averageDepth,
      averageCircularity: productivitySummary.averageCircularity,
      totalInsights: productivitySummary.totalInsights
    };

    this.setCache(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get productivity insights with real calculation
   */
  private async getProductivityInsights(timeRange: TimeRange) {
    const cacheKey = `productivity_insights_${timeRange.start}_${timeRange.end}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Get real data from repositories
    const [peakHours, sessionAnalysis, questionPatterns, weeklyTrend] = await Promise.all([
      this.productivityPatterns.getPeakHours(timeRange),
      this.productivityPatterns.getSessionLengthAnalysis(timeRange),
      this.productivityPatterns.getQuestionPatterns(timeRange),
      this.calculateProductivityTrend(timeRange)
    ]);

    const insights = {
      peakHours,
      optimalSessionLength: sessionAnalysis.optimalLength,
      topQuestionPatterns: questionPatterns.slice(0, 3).map(p => p.pattern),
      weeklyTrend
    };

    this.setCache(cacheKey, insights);
    return insights;
  }

  /**
   * Get knowledge gap metrics
   */
  private async getKnowledgeGapMetrics(timeRange: TimeRange) {
    const cacheKey = `knowledge_gaps_${timeRange.start}_${timeRange.end}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const [unresolvedGaps, topicCoverage] = await Promise.all([
      this.knowledgeGaps.getUnresolvedGaps(),
      this.knowledgeGaps.getTopicCoverage(timeRange)
    ]);

    const metrics = {
      totalUnresolved: unresolvedGaps.length,
      criticalGaps: unresolvedGaps.filter(gap => gap.frequency >= 5).length,
      averageResolutionTime: 24, // Would be calculated from resolved gaps
      topicCoverage: topicCoverage.length > 0 
        ? topicCoverage.reduce((sum, t) => sum + t.coverageScore, 0) / topicCoverage.length 
        : 0
    };

    this.setCache(cacheKey, metrics);
    return metrics;
  }

  /**
   * Get decision quality metrics
   */
  private async getDecisionMetrics(timeRange: TimeRange) {
    const cacheKey = `decision_metrics_${timeRange.start}_${timeRange.end}`;
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    const analysis = await this.decisionTracking.getDecisionAnalysis(timeRange);
    
    const metrics = {
      totalDecisions: analysis.totalDecisions,
      averageQuality: analysis.averageQuality,
      averageOutcome: analysis.averageOutcome,
      reversalRate: analysis.reversalRate
    };

    this.setCache(cacheKey, metrics);
    return metrics;
  }

  /**
   * Generate insights from metrics
   */
  private generateInsights(data: any): string[] {
    const insights: string[] = [];

    // Productivity insights
    if (data.conversationMetrics.averageProductivity > 75) {
      insights.push('High productivity detected - conversations are generating significant value');
    } else if (data.conversationMetrics.averageProductivity < 40) {
      insights.push('Low productivity alert - consider adjusting conversation approach');
    }

    // Knowledge gap insights
    if (data.knowledgeGapMetrics.criticalGaps > 5) {
      insights.push('Multiple critical knowledge gaps identified - prioritize learning in these areas');
    }

    // Decision quality insights
    if (data.decisionMetrics.reversalRate > 20) {
      insights.push('High decision reversal rate - consider improving decision-making process');
    }

    // Peak hour insights
    if (data.productivityInsights.peakHours.length > 0) {
      const hours = data.productivityInsights.peakHours.join(', ');
      insights.push(`Peak productivity hours identified: ${hours} - schedule important work during these times`);
    }

    return insights;
  }

  /**
   * Generate recommendations from metrics
   */
  private generateRecommendations(data: any): string[] {
    const recommendations: string[] = [];

    // Session length recommendations
    if (data.productivityInsights.optimalSessionLength < 45) {
      recommendations.push('Consider longer conversation sessions for deeper analysis');
    } else if (data.productivityInsights.optimalSessionLength > 120) {
      recommendations.push('Consider breaking long sessions into smaller focused conversations');
    }

    // Knowledge gap recommendations
    if (data.knowledgeGapMetrics.totalUnresolved > 10) {
      recommendations.push('Prioritize resolving unresolved knowledge gaps through focused learning');
    }

    // Decision quality recommendations
    if (data.decisionMetrics.averageQuality < 60) {
      recommendations.push('Improve decision quality by gathering more information and considering alternatives');
    }

    // General productivity recommendation
    if (data.conversationMetrics.averageProductivity < 50) {
      recommendations.push('Focus on asking more specific, actionable questions to improve conversation value');
    }

    return recommendations;
  }

  /**
   * Analyze productivity patterns across conversations
   */
  async analyzeProductivityPatterns(timeRange?: TimeRange): Promise<number> {
    const normalizedRange = this.validateTimeRange(timeRange);
    
    // Get conversations in time range for productivity analysis
    const conversationResult = await this.conversations.findByDateRange(
      normalizedRange.start,
      normalizedRange.end,
      this.config.batchProcessingSize,
      0
    );

    const conversations = conversationResult.data;
    let processed = 0;
    const startTime = Date.now();

    // Process conversations in batches using real analyzers
    const batchSize = Math.min(10, conversations.length);
    for (let i = 0; i < conversations.length; i += batchSize) {
      // Check processing time limit
      if (Date.now() - startTime > this.config.maxProcessingTimeMs) {
        break;
      }

      const batch = conversations.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (conversation) => {
        const messages = await this.messages.findByConversationId(conversation.id);
        
        if (messages.length === 0) return;
        
        try {
          // Use real productivity analyzer
          const productivityMetrics = await this.productivityAnalyzer.analyzeConversationProductivity(
            conversation, messages
          );
          
          // Convert to repository format and save
          const pattern = {
            windowStart: conversation.createdAt,
            windowEnd: conversation.createdAt + productivityMetrics.sessionDuration,
            windowType: 'day' as const,
            totalConversations: 1,
            totalMessages: messages.length,
            totalDecisions: 0,
            totalInsights: productivityMetrics.outputMetrics.insightCount || 0,
            avgProductivityScore: productivityMetrics.overallProductivityScore,
            peakProductivityScore: productivityMetrics.overallProductivityScore,
            minProductivityScore: productivityMetrics.overallProductivityScore,
            peakHours: [new Date(conversation.createdAt).getHours()],
            effectiveQuestionPatterns: [],
            breakthroughIndicators: [],
            optimalSessionLength: Math.round(productivityMetrics.sessionDuration / (1000 * 60)), // convert to minutes
            sampleSize: 1,
            confidenceLevel: 0.8
          };
          
          await this.productivityPatterns.savePattern(pattern);
          processed++;
          
        } catch (error) {
          console.error(`Failed to analyze productivity for conversation ${conversation.id}:`, error);
          // Fall back to basic pattern if analysis fails
          const sessionDuration = this.estimateSessionDuration(messages);
          const basicPattern = {
            windowStart: conversation.createdAt,
            windowEnd: conversation.createdAt + sessionDuration,
            windowType: 'day' as const,
            totalConversations: 1,
            totalMessages: messages.length,
            totalDecisions: 0,
            totalInsights: 0,
            avgProductivityScore: Math.min(100, messages.length * 3),
            peakProductivityScore: Math.min(100, messages.length * 3),
            minProductivityScore: Math.min(100, messages.length * 3),
            peakHours: [new Date(conversation.createdAt).getHours()],
            effectiveQuestionPatterns: [],
            breakthroughIndicators: [],
            optimalSessionLength: Math.round(sessionDuration / (1000 * 60)), // convert to minutes
            sampleSize: 1,
            confidenceLevel: 0.5 // lower confidence for fallback
          };
          
          await this.productivityPatterns.savePattern(basicPattern);
          processed++;
        }
      }));
    }

    return processed;
  }

  /**
   * Analyze knowledge gaps across conversations
   */
  async analyzeKnowledgeGaps(timeRange?: TimeRange): Promise<number> {
    const normalizedRange = this.validateTimeRange(timeRange);
    
    const conversationResult = await this.conversations.findByDateRange(
      normalizedRange.start,
      normalizedRange.end,
      this.config.batchProcessingSize,
      0
    );
    
    const conversations = conversationResult.data;

    let processed = 0;
    const startTime = Date.now();

    for (let i = 0; i < conversations.length; i += 10) {
      if (Date.now() - startTime > this.config.maxProcessingTimeMs) {
        break;
      }

      const batch = conversations.slice(i, i + 10);
      
      await Promise.all(batch.map(async (conversation) => {
        const messages = await this.messages.findByConversationId(conversation.id);
        if (messages.length === 0) return;
        
        try {
          const knowledgeGaps = await this.knowledgeGapDetector.detectGaps([{
            conversation,
            messages
          }]);
          await this.processKnowledgeGaps(knowledgeGaps, conversation.id);
          processed++;
        } catch (error) {
          console.error(`Failed to analyze knowledge gaps for conversation ${conversation.id}:`, error);
        }
      }));
    }

    return processed;
  }

  /**
   * Estimate session duration based on message timestamps
   */
  private estimateSessionDuration(messages: any[]): number {
    if (messages.length < 2) return 0;
    
    const sortedMessages = [...messages].sort((a, b) => a.createdAt - b.createdAt);
    const firstMessage = sortedMessages[0];
    const lastMessage = sortedMessages[sortedMessages.length - 1];
    
    return Math.max(0, lastMessage.createdAt - firstMessage.createdAt);
  }

  /**
   * Analyze decision patterns across conversations  
   */
  async analyzeDecisionPatterns(timeRange?: TimeRange): Promise<number> {
    const normalizedRange = this.validateTimeRange(timeRange);
    
    const conversationResult = await this.conversations.findByDateRange(
      normalizedRange.start,
      normalizedRange.end,
      this.config.batchProcessingSize,
      0
    );

    const conversations = conversationResult.data;
    let processed = 0;
    const startTime = Date.now();

    for (let i = 0; i < conversations.length; i += 10) {
      if (Date.now() - startTime > this.config.maxProcessingTimeMs) {
        break;
      }

      const batch = conversations.slice(i, i + 10);
      
      await Promise.all(batch.map(async (conversation) => {
        const messages = await this.messages.findByConversationId(conversation.id);
        if (messages.length === 0) return;
        
        try {
          const decisions = await this.decisionTracker.trackDecisions(conversation, messages);
          await this.processDecisions(decisions, conversation.id);
          processed++;
        } catch (error) {
          console.error(`Failed to analyze decisions for conversation ${conversation.id}:`, error);
        }
      }));
    }

    return processed;
  }

  /**
   * Process knowledge gaps and store them in repository using batch operations
   */
  private async processKnowledgeGaps(knowledgeGaps: any[], conversationId: string): Promise<void> {
    if (knowledgeGaps.length === 0) return;

    // Use batch processing for better performance
    const conversationGaps = [{
      conversationId,
      gaps: knowledgeGaps,
      conversationMetadata: {
        timestamp: Date.now(),
        messageCount: 0 // Will be filled in by batch processor
      }
    }];

    try {
      const result = await this.knowledgeGaps.batchProcessGapsFromConversations(conversationGaps, {
        batchSize: 50,
        deduplication: true
      });
      
      if (result.failed > 0) {
        console.warn(`Knowledge gap batch processing: ${result.processed} processed, ${result.failed} failed, ${result.duplicates} duplicates removed`);
      }
    } catch (error) {
      console.error('Failed to batch process knowledge gaps:', error);
      // Fallback to individual processing
      await this.fallbackProcessKnowledgeGaps(knowledgeGaps, conversationId);
    }
  }

  /**
   * Fallback individual knowledge gap processing
   */
  private async fallbackProcessKnowledgeGaps(knowledgeGaps: any[], conversationId: string): Promise<void> {
    for (const gap of knowledgeGaps) {
      try {
        const gapInput = {
          gapType: gap.type || 'question',
          content: gap.content || gap.description || 'Unknown gap',
          normalizedContent: gap.normalizedContent,
          frequency: gap.frequency || 1,
          firstOccurrence: gap.firstOccurrence || Date.now(),
          lastOccurrence: gap.lastOccurrence || Date.now(),
          explorationDepth: gap.explorationDepth || 0,
          relatedEntities: gap.relatedEntities || [],
          suggestedActions: gap.suggestedActions || [],
          suggestedResources: gap.suggestedResources || []
        };
        
        await this.knowledgeGaps.saveGap(gapInput);
      } catch (error) {
        console.error(`Failed to save individual knowledge gap for conversation ${conversationId}:`, error);
      }
    }
  }

  /**
   * Process decisions and store them in repository using batch operations
   */
  private async processDecisions(decisions: any[], conversationId: string): Promise<void> {
    if (decisions.length === 0) return;

    // Use batch processing for better performance
    const conversationDecisions = [{
      conversationId,
      decisions,
      conversationMetadata: {
        timestamp: Date.now(),
        depthScore: 0 // Will be estimated by batch processor
      }
    }];

    try {
      const result = await this.decisionTracking.batchTrackDecisions(conversationDecisions, {
        batchSize: 50
      });
      
      if (result.failed > 0) {
        console.warn(`Decision batch processing: ${result.tracked} tracked, ${result.failed} failed`);
      }
    } catch (error) {
      console.error('Failed to batch process decisions:', error);
      // Fallback to individual processing
      await this.fallbackProcessDecisions(decisions, conversationId);
    }
  }

  /**
   * Fallback individual decision processing
   */
  private async fallbackProcessDecisions(decisions: any[], conversationId: string): Promise<void> {
    for (const decision of decisions) {
      try {
        const decisionInput = {
          decisionSummary: decision.summary || decision.content || 'Automated decision detection',
          decisionType: decision.type || 'operational',
          conversationIds: [conversationId],
          problemIdentifiedAt: decision.problemIdentifiedAt,
          optionsConsideredAt: decision.optionsConsideredAt,
          decisionMadeAt: decision.timestamp || decision.decisionMadeAt || Date.now(),
          clarityScore: decision.clarityScore || 50,
          confidenceLevel: decision.confidenceLevel || 50,
          informationCompleteness: decision.informationCompleteness || 50,
          stakeholderCount: decision.stakeholderCount || 1,
          alternativesConsidered: decision.alternativesConsidered || 1,
          riskAssessed: decision.riskAssessed || false,
          tags: decision.tags || [],
          priority: decision.priority || 'medium'
        };
        
        await this.decisionTracking.saveDecision(decisionInput);
      } catch (error) {
        console.error(`Failed to save individual decision for conversation ${conversationId}:`, error);
      }
    }
  }

  /**
   * Calculate productivity trend over time
   */
  private async calculateProductivityTrend(timeRange: TimeRange): Promise<number> {
    try {
      // Get conversations from the time range
      const conversationResult = await this.conversations.findByDateRange(
        timeRange.start,
        timeRange.end,
        1000,
        0
      );
      
      const conversations = conversationResult.data;

      if (conversations.length < 2) {
        return 0; // Not enough data for trend
      }

      // Get analytics for these conversations
      const analytics = await Promise.all(
        conversations.map(conv => this.conversationAnalytics.getConversationAnalytics(conv.id))
      );

      const validAnalytics = analytics.filter(a => a !== null);
      
      if (validAnalytics.length < 2) {
        return 0;
      }

      // Sort by creation date and calculate trend
      validAnalytics.sort((a, b) => a!.createdAt - b!.createdAt);
      
      const firstHalf = validAnalytics.slice(0, Math.floor(validAnalytics.length / 2));
      const secondHalf = validAnalytics.slice(Math.floor(validAnalytics.length / 2));
      
      const firstHalfAvg = firstHalf.reduce((sum, a) => sum + a!.productivityScore, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, a) => sum + a!.productivityScore, 0) / secondHalf.length;
      
      // Calculate percentage change
      return firstHalfAvg > 0 ? ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100 : 0;
      
    } catch (error) {
      console.error('Error calculating productivity trend:', error);
      return 0;
    }
  }

  /**
   * Validate and normalize time range
   */
  private validateTimeRange(timeRange?: TimeRange): TimeRange {
    if (!timeRange) {
      const end = Date.now();
      const start = end - (30 * 24 * 60 * 60 * 1000); // 30 days
      return { start, end };
    }

    return {
      start: Math.max(0, timeRange.start),
      end: Math.max(timeRange.start, timeRange.end)
    };
  }

  /**
   * Get item from cache if not expired
   */
  private getFromCache<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  /**
   * Set item in cache with expiration
   */
  private setCache(key: string, data: any): void {
    const expiresAt = Date.now() + (this.config.cacheExpirationMinutes * 60 * 1000);
    this.cache.set(key, { data, expiresAt });
  }

  /**
   * Invalidate cache entries matching pattern
   */
  private invalidateCache(pattern: string): void {
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const keys: string[] = [];
    this.cache.forEach((_, key) => keys.push(key));
    return {
      size: this.cache.size,
      keys
    };
  }

  /**
   * Batch process multiple conversations with optimized analytics operations
   */
  async batchProcessConversations(
    conversationIds: string[],
    options: {
      batchSize?: number;
      analysisTypes?: ('analytics' | 'productivity' | 'knowledge-gaps' | 'decisions')[];
      onProgress?: (processed: number, total: number, currentOperation: string) => void;
      maxProcessingTimeMs?: number;
    } = {}
  ): Promise<{
    processed: number;
    failed: number;
    analytics: { inserted: number; updated: number; failed: number };
    patterns: { inserted: number; updated: number; failed: number };
    knowledgeGaps: { processed: number; failed: number; duplicates: number };
    decisions: { tracked: number; failed: number };
    processingTimeMs: number;
  }> {
    const {
      batchSize = 50,
      analysisTypes = ['analytics', 'productivity', 'knowledge-gaps', 'decisions'],
      onProgress,
      maxProcessingTimeMs = this.config.maxProcessingTimeMs
    } = options;

    const startTime = Date.now();
    let processed = 0;
    let failed = 0;
    
    // Initialize results tracking
    const results = {
      analytics: { inserted: 0, updated: 0, failed: 0 },
      patterns: { inserted: 0, updated: 0, failed: 0 },
      knowledgeGaps: { processed: 0, failed: 0, duplicates: 0 },
      decisions: { tracked: 0, failed: 0 }
    };

    try {
      // Step 1: Batch load conversations with messages
      onProgress?.(0, conversationIds.length, 'Loading conversations');
      const conversations = await this.loadConversationsBatch(conversationIds);
      
      if (conversations.length === 0) {
        return {
          processed: 0,
          failed: conversationIds.length,
          ...results,
          processingTimeMs: Date.now() - startTime
        };
      }

      // Step 2: Batch analyze conversations
      onProgress?.(0, conversations.length, 'Analyzing conversations');
      const analysisResults = await this.batchAnalyzeConversations(conversations, {
        batchSize,
        maxProcessingTimeMs: maxProcessingTimeMs - (Date.now() - startTime)
      });

      processed = analysisResults.processed;
      failed = analysisResults.failed;

      // Step 3: Batch save analytics data
      if (analysisTypes.includes('analytics') && analysisResults.analytics.length > 0) {
        onProgress?.(processed, conversations.length, 'Saving conversation analytics');
        
        const analyticsResult = await this.conversationAnalytics.batchSaveAnalytics(
          analysisResults.analytics,
          {
            batchSize,
            conflictResolution: 'UPDATE',
            onProgress: (p, t) => onProgress?.(processed + Math.floor((p / t) * 0.25 * conversations.length), conversations.length, 'Saving analytics')
          }
        );
        
        results.analytics = {
          inserted: analyticsResult.inserted,
          updated: analyticsResult.updated,
          failed: analyticsResult.failed
        };
      }

      // Step 4: Batch process productivity patterns
      if (analysisTypes.includes('productivity') && analysisResults.productivity.length > 0) {
        onProgress?.(processed, conversations.length, 'Processing productivity patterns');
        
        // Group conversations for pattern analysis
        const productivityResult = await this.productivityPatterns.bulkAnalyzeProductivityPatterns(
          conversations,
          'day', // Default to daily patterns
          {
            batchSize,
            onProgress: (p, t) => onProgress?.(processed + Math.floor((p / t) * 0.25 * conversations.length), conversations.length, 'Analyzing patterns')
          }
        );
        
        results.patterns = {
          inserted: productivityResult.patterns.length,
          updated: 0,
          failed: productivityResult.failed
        };
      }

      // Step 5: Batch process knowledge gaps
      if (analysisTypes.includes('knowledge-gaps') && analysisResults.knowledgeGaps.length > 0) {
        onProgress?.(processed, conversations.length, 'Processing knowledge gaps');
        
        const knowledgeGapResult = await this.knowledgeGaps.batchProcessGapsFromConversations(
          analysisResults.knowledgeGaps,
          {
            batchSize,
            deduplication: true,
            onProgress: (p, t) => onProgress?.(processed + Math.floor((p / t) * 0.25 * conversations.length), conversations.length, 'Processing gaps')
          }
        );
        
        results.knowledgeGaps = knowledgeGapResult;
      }

      // Step 6: Batch process decisions
      if (analysisTypes.includes('decisions') && analysisResults.decisions.length > 0) {
        onProgress?.(processed, conversations.length, 'Processing decisions');
        
        const decisionResult = await this.decisionTracking.batchTrackDecisions(
          analysisResults.decisions,
          {
            batchSize,
            onProgress: (p, t) => onProgress?.(processed + Math.floor((p / t) * 0.25 * conversations.length), conversations.length, 'Tracking decisions')
          }
        );
        
        results.decisions = decisionResult;
      }

      // Clear related caches
      this.invalidateCache('batch_processed');
      onProgress?.(conversations.length, conversations.length, 'Completed');

    } catch (error) {
      console.error('Batch processing failed:', error);
      failed = conversationIds.length - processed;
    }

    return {
      processed,
      failed,
      ...results,
      processingTimeMs: Date.now() - startTime
    };
  }

  /**
   * Load conversations with messages in batches
   */
  private async loadConversationsBatch(conversationIds: string[]): Promise<Array<{
    id: string;
    createdAt: number;
    updatedAt?: number;
    title?: string;
    metadata?: Record<string, any>;
    messages: any[];
    analytics?: any;
  }>> {
    const conversations: Array<{
      id: string;
      createdAt: number;
      updatedAt?: number;
      title?: string;
      metadata?: Record<string, any>;
      messages: any[];
      analytics?: any;
    }> = [];

    // Load in smaller batches to avoid memory issues
    const loadBatchSize = 20;
    for (let i = 0; i < conversationIds.length; i += loadBatchSize) {
      const batch = conversationIds.slice(i, i + loadBatchSize);
      
      await Promise.all(batch.map(async (id) => {
        try {
          const conversation = await this.conversations.findById(id);
          if (conversation) {
            const messages = await this.messages.findByConversationId(id);
            const analytics = await this.conversationAnalytics.getConversationAnalytics(id);
            
            conversations.push({
              id: conversation.id,
              createdAt: conversation.createdAt,
              updatedAt: conversation.updatedAt,
              title: conversation.title,
              metadata: conversation.metadata,
              messages,
              analytics
            });
          }
        } catch (error) {
          console.error(`Failed to load conversation ${id}:`, error);
        }
      }));
    }

    return conversations;
  }

  /**
   * Batch analyze multiple conversations
   */
  private async batchAnalyzeConversations(
    conversations: Array<{
      id: string;
      createdAt: number;
      updatedAt?: number;
      title?: string;
      metadata?: Record<string, any>;
      messages: any[];
      analytics?: any;
    }>,
    options: {
      batchSize?: number;
      maxProcessingTimeMs?: number;
    } = {}
  ): Promise<{
    processed: number;
    failed: number;
    analytics: any[];
    productivity: any[];
    knowledgeGaps: Array<{ conversationId: string; gaps: any[]; conversationMetadata?: any }>;
    decisions: Array<{ conversationId: string; decisions: any[]; conversationMetadata?: any }>;
  }> {
    const { batchSize = 10, maxProcessingTimeMs = 30000 } = options;
    const startTime = Date.now();
    
    let processed = 0;
    let failed = 0;
    const analytics: any[] = [];
    const productivity: any[] = [];
    const knowledgeGaps: Array<{ conversationId: string; gaps: any[]; conversationMetadata?: any }> = [];
    const decisions: Array<{ conversationId: string; decisions: any[]; conversationMetadata?: any }> = [];

    // Process conversations in batches
    for (let i = 0; i < conversations.length; i += batchSize) {
      // Check time limit
      if (Date.now() - startTime > maxProcessingTimeMs) {
        console.warn(`Batch analysis stopped due to time limit. Processed ${processed}/${conversations.length}`);
        break;
      }

      const batch = conversations.slice(i, i + batchSize);
      
      // Process batch in parallel
      const batchPromises = batch.map(async (conversation) => {
        try {
          // Ensure conversation has required properties
          const fullConversation: any = {
            id: conversation.id,
            createdAt: conversation.createdAt,
            updatedAt: conversation.updatedAt || conversation.createdAt,
            title: conversation.title,
            metadata: conversation.metadata || {}
          };

          const [flowMetrics, productivityMetrics, detectedGaps, detectedDecisions] = await Promise.all([
            this.conversationFlowAnalyzer.analyzeFlow(fullConversation, conversation.messages),
            this.productivityAnalyzer.analyzeConversationProductivity(fullConversation, conversation.messages),
            this.knowledgeGapDetector.detectGaps([{ conversation: fullConversation, messages: conversation.messages }]),
            this.decisionTracker.trackDecisions(fullConversation, conversation.messages)
          ]);

          // Prepare analytics data
          const analyticsData = {
            conversationId: conversation.id,
            topicCount: flowMetrics.topicCount,
            topicTransitions: flowMetrics.transitionCount,
            depthScore: flowMetrics.depthScore,
            circularityIndex: flowMetrics.circularityIndex,
            productivityScore: productivityMetrics.overallProductivityScore,
            resolutionTime: flowMetrics.resolutionTime,
            insightCount: productivityMetrics.outputMetrics.insightCount,
            breakthroughCount: productivityMetrics.outputMetrics.breakthroughCount,
            questionQualityAvg: productivityMetrics.questionMetrics.questionQualityScore,
            responseQualityAvg: productivityMetrics.effectivenessScore,
            engagementScore: productivityMetrics.engagementScore,
            metadata: {
              flowMetrics,
              productivityMetrics,
              processedAt: Date.now()
            }
          };

          return {
            success: true,
            conversationId: conversation.id,
            analytics: analyticsData,
            productivity: productivityMetrics,
            knowledgeGaps: detectedGaps,
            decisions: detectedDecisions,
            conversationMetadata: {
              messageCount: conversation.messages?.length || 0,
              depthScore: flowMetrics?.depthScore || 0,
              createdAt: conversation.createdAt
            }
          };
        } catch (error) {
          console.error(`Failed to analyze conversation ${conversation.id}:`, error);
          return {
            success: false,
            conversationId: conversation.id,
            error
          };
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      
      // Collect results
      for (const result of batchResults) {
        if (result.success) {
          processed++;
          analytics.push(result.analytics);
          productivity.push(result.productivity);
          
          if (result.knowledgeGaps && result.knowledgeGaps.length > 0) {
            knowledgeGaps.push({
              conversationId: result.conversationId,
              gaps: result.knowledgeGaps,
              conversationMetadata: result.conversationMetadata
            });
          }
          
          if (result.decisions && result.decisions.length > 0) {
            decisions.push({
              conversationId: result.conversationId,
              decisions: result.decisions,
              conversationMetadata: result.conversationMetadata
            });
          }
        } else {
          failed++;
        }
      }
    }

    return {
      processed,
      failed,
      analytics,
      productivity,
      knowledgeGaps,
      decisions
    };
  }
}