/**
 * Track Decision Effectiveness Tool Implementation
 * 
 * This tool tracks decision-making patterns and effectiveness by analyzing:
 * - Decisions made in conversations and their quality
 * - Decision outcomes and follow-up actions
 * - Decision reversal patterns and rates
 * - Decision-making process effectiveness
 * - Factors that influence decision quality
 */

import { TrackDecisionEffectivenessToolDef as TrackDecisionEffectivenessToolDef } from '../types/mcp.js';
import { TrackDecisionEffectivenessSchema, TrackDecisionEffectivenessInput } from '../types/schemas.js';
import { BaseTool, ToolContext, wrapDatabaseOperation } from './BaseTool.js';
import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
import { DecisionTracker, Decision, DecisionOutcome } from '../analytics/analyzers/DecisionTracker.js';
import { ConversationRepository } from '../storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { DecisionTrackingRepository } from '../analytics/repositories/DecisionTrackingRepository.js';
import { TimeRange } from '../analytics/repositories/AnalyticsRepository.js';
import { 
  validateDateRange, 
  validateStringArray,
  ValidationError,
  formatValidationError,
  withEnhancedValidation 
} from '../utils/validation.js';

/**
 * Decision quality analysis
 */
export interface DecisionQualityAnalysis {
  /** Average decision quality score (0-100) */
  averageQuality: number;
  /** Quality distribution */
  qualityDistribution: {
    excellent: number; // 80-100
    good: number;      // 60-79
    fair: number;      // 40-59
    poor: number;      // 0-39
  };
  /** Factors affecting quality */
  qualityFactors: Array<{
    factor: string;
    impact: number; // -100 to 100
    frequency: number;
  }>;
  /** Quality trends over time */
  trends: Array<{
    period: string;
    averageQuality: number;
    decisionCount: number;
  }>;
}

/**
 * Decision outcome tracking
 */
export interface DecisionOutcomeAnalysis {
  /** Average outcome score (0-100) */
  averageOutcome: number;
  /** Outcome distribution */
  outcomeDistribution: {
    successful: number;    // 80-100
    partial: number;       // 40-79
    unsuccessful: number;  // 0-39
    unknown: number;       // Not tracked
  };
  /** Time to outcome measurement */
  timeToOutcome: {
    average: number; // days
    median: number;  // days
    range: { min: number; max: number };
  };
  /** Success factors */
  successFactors: string[];
  /** Common failure patterns */
  failurePatterns: string[];
}

/**
 * Decision reversal analysis
 */
export interface DecisionReversalAnalysis {
  /** Overall reversal rate (0-1) */
  reversalRate: number;
  /** Time to reversal statistics */
  timeToReversal: {
    average: number; // days
    median: number;  // days
    range: { min: number; max: number };
  };
  /** Reversal patterns by decision type */
  reversalsByType: Array<{
    decisionType: string;
    reversalRate: number;
    count: number;
  }>;
  /** Common reversal reasons */
  reversalReasons: Array<{
    reason: string;
    frequency: number;
    impact: number;
  }>;
  /** Prevention strategies */
  preventionStrategies: string[];
}

/**
 * Decision type analysis
 */
export interface DecisionTypeAnalysis {
  /** Analysis by decision type */
  byType: Array<{
    type: string;
    count: number;
    averageQuality: number;
    averageOutcome: number;
    reversalRate: number;
    characteristics: string[];
  }>;
  /** Most common decision types */
  mostCommon: Array<{
    type: string;
    frequency: number;
    percentage: number;
  }>;
  /** Best performing decision types */
  bestPerforming: Array<{
    type: string;
    performanceScore: number;
    qualityScore: number;
    outcomeScore: number;
  }>;
}

/**
 * Response interface for track_decision_effectiveness tool
 */
export interface TrackDecisionEffectivenessResponse {
  /** Time range analyzed */
  timeRange: TimeRange;
  /** When the analysis was performed */
  analyzedAt: number;
  
  /** All decisions tracked in the period */
  decisions: Decision[];
  
  /** Decision quality analysis */
  qualityAnalysis: DecisionQualityAnalysis;
  
  /** Decision outcome tracking (if requested) */
  outcomeAnalysis?: DecisionOutcomeAnalysis;
  
  /** Decision reversal analysis (if requested) */
  reversalAnalysis?: DecisionReversalAnalysis;
  
  /** Decision type analysis */
  typeAnalysis: DecisionTypeAnalysis;
  
  /** Decision-making process insights */
  processInsights: {
    /** Average time spent on decision */
    averageDecisionTime: number; // minutes
    /** Information gathering effectiveness */
    informationGathering: {
      score: number; // 0-100
      commonSources: string[];
      gaps: string[];
    };
    /** Consultation patterns */
    consultationPatterns: {
      frequency: number; // 0-1
      effectiveness: number; // 0-100
      types: string[];
    };
    /** Follow-up adherence */
    followUpAdherence: {
      rate: number; // 0-1
      averageDelay: number; // days
      completionRate: number; // 0-1
    };
  };
  
  /** Recommendations for improvement */
  recommendations: {
    /** Quality improvement suggestions */
    qualityImprovements: string[];
    /** Process improvements */
    processImprovements: string[];
    /** Risk mitigation strategies */
    riskMitigation: string[];
    /** Best practices to adopt */
    bestPractices: string[];
  };
  
  /** Key insights and patterns */
  insights: {
    /** Most significant insights */
    keyInsights: string[];
    /** Warning signals */
    warnings: string[];
    /** Positive trends */
    positives: string[];
    /** Areas needing attention */
    concerns: string[];
  };
  
  /** Analysis metadata */
  metadata: {
    /** Number of conversations analyzed */
    conversationCount: number;
    /** Total decisions tracked */
    totalDecisions: number;
    /** Decisions with quality scores */
    qualityScored: number;
    /** Decisions with outcome data */
    outcomeTracked: number;
    /** Analysis duration in milliseconds */
    analysisDuration: number;
    /** Decision types included */
    decisionTypesIncluded: string[];
  };
}

/**
 * Dependencies required by TrackDecisionEffectivenessTool
 */
export interface TrackDecisionEffectivenessDependencies {
  analyticsEngine: AnalyticsEngine;
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  decisionTracker: DecisionTracker;
  decisionTrackingRepository: DecisionTrackingRepository;
}

/**
 * Implementation of the track_decision_effectiveness MCP tool
 */
export class TrackDecisionEffectivenessTool extends BaseTool<TrackDecisionEffectivenessInput, TrackDecisionEffectivenessResponse> {
  private readonly analyticsEngine: AnalyticsEngine;
  private readonly conversationRepository: ConversationRepository;
  private readonly messageRepository: MessageRepository;
  private readonly decisionTracker: DecisionTracker;
  private readonly decisionTrackingRepository: DecisionTrackingRepository;

  constructor(dependencies: TrackDecisionEffectivenessDependencies) {
    super(TrackDecisionEffectivenessToolDef, TrackDecisionEffectivenessSchema);
    this.analyticsEngine = dependencies.analyticsEngine;
    this.conversationRepository = dependencies.conversationRepository;
    this.messageRepository = dependencies.messageRepository;
    this.decisionTracker = dependencies.decisionTracker;
    this.decisionTrackingRepository = dependencies.decisionTrackingRepository;
  }

  /**
   * Execute the track_decision_effectiveness tool
   */
  protected async executeImpl(input: TrackDecisionEffectivenessInput, _context: ToolContext): Promise<TrackDecisionEffectivenessResponse> {
    const startTime = Date.now();

    try {
      // Step 1: Enhanced validation with comprehensive input checking
      const validatedInput = withEnhancedValidation(() => {
        // Validate time range with 90-day default and business rules
        const timeRange = validateDateRange(input.startDate, input.endDate, '', {
          maxDays: 365, // Allow up to 1 year for decision effectiveness analysis
          defaultDays: 90 // Default to 90 days for comprehensive analysis
        });

        // Validate decision types array
        const decisionTypes = validateStringArray(input.decisionTypes, 'decisionTypes', {
          maxLength: 20, // Reasonable limit for decision types
          maxItemLength: 100, // Max length for decision type names
          minItemLength: 2, // Min length for meaningful type names
          allowEmpty: true, // Allow empty to analyze all types
          allowDuplicates: false // No duplicates needed
        });

        return { timeRange, decisionTypes };
      }, 'decision effectiveness input validation');

      // Step 2: Get conversations and messages for analysis
      const { conversations, messages } = await this.getAnalysisData(
        validatedInput.timeRange, 
        validatedInput.decisionTypes
      );
      
      if (conversations.length === 0) {
        return this.createEmptyResponse(validatedInput.timeRange, input, startTime);
      }

      // Step 3: Track decisions in conversations
      const decisions = await this.trackDecisions(conversations, messages, validatedInput.decisionTypes);
      
      if (decisions.length === 0) {
        return this.createEmptyResponse(validatedInput.timeRange, input, startTime, conversations.length);
      }

      // Step 4: Analyze decision quality
      const qualityAnalysis = await this.analyzeDecisionQuality(decisions, validatedInput.timeRange);

      // Step 5: Analyze outcomes and reversals if requested
      const [outcomeAnalysis, reversalAnalysis] = await Promise.all([
        input.includeOutcomes ? this.analyzeDecisionOutcomes(decisions) : Promise.resolve(undefined),
        input.includeReversals ? this.analyzeDecisionReversals(decisions) : Promise.resolve(undefined)
      ]);

      // Step 6: Analyze decision types
      const typeAnalysis = await this.analyzeDecisionTypes(decisions);

      // Step 7: Analyze decision-making process
      const processInsights = await this.analyzeDecisionProcess(decisions, conversations, messages);

      // Step 8: Generate recommendations
      const recommendations = this.generateRecommendations(decisions, qualityAnalysis, outcomeAnalysis, reversalAnalysis);

      // Step 9: Generate insights
      const insights = this.generateInsights(decisions, qualityAnalysis, outcomeAnalysis, reversalAnalysis, typeAnalysis);

      // Step 10: Build response metadata
      const analysisDuration = Date.now() - startTime;
      const metadata = {
        conversationCount: conversations.length,
        totalDecisions: decisions.length,
        qualityScored: decisions.filter(d => d.qualityScore !== undefined).length,
        outcomeTracked: decisions.filter(d => d.outcome !== undefined).length,
        analysisDuration,
        decisionTypesIncluded: validatedInput.decisionTypes || ['all']
      };

      return {
        timeRange: validatedInput.timeRange,
        analyzedAt: Date.now(),
        decisions,
        qualityAnalysis,
        outcomeAnalysis,
        reversalAnalysis,
        typeAnalysis,
        processInsights,
        recommendations,
        insights,
        metadata
      };

    } catch (error) {
      // Enhanced error handling with user-friendly messages
      if (error instanceof ValidationError) {
        throw new Error(JSON.stringify(formatValidationError(error)));
      }
      
      // Re-throw other errors with context
      throw new Error(`Decision effectiveness analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }


  /**
   * Get conversations and messages for analysis
   */
  private async getAnalysisData(timeRange: TimeRange, decisionTypes?: string[]) {
    return wrapDatabaseOperation(async () => {
      // Get conversations in time range
      const conversationsResult = await this.conversationRepository.findByDateRange(
        timeRange.start,
        timeRange.end,
        1000, // Large limit for comprehensive analysis
        0
      );

      // Get messages for all conversations
      const messages = [];
      for (const conversation of conversationsResult.data) {
        const conversationMessages = await this.messageRepository.findByConversationId(conversation.id);
        messages.push(...conversationMessages);
      }

      return { conversations: conversationsResult.data, messages };
    }, 'Failed to retrieve analysis data');
  }

  /**
   * Track decisions in conversations
   */
  private async trackDecisions(conversations: any[], messages: any[], decisionTypes?: string[]): Promise<Decision[]> {
    return wrapDatabaseOperation(async () => {
      const allDecisions: Decision[] = [];

      // Analyze each conversation for decisions
      for (const conversation of conversations) {
        const conversationMessages = messages.filter(m => m.conversationId === conversation.id);
        if (conversationMessages.length === 0) continue;

        const decisions = await this.decisionTracker.trackDecisions(conversation, conversationMessages);
        
        // Filter decisions by type if specified
        const filteredDecisions = decisionTypes && decisionTypes.length > 0 ? 
          decisions.filter(decision => decision.decisionType && decisionTypes.includes(decision.decisionType)) : decisions;

        allDecisions.push(...filteredDecisions);
      }

      return allDecisions;
    }, 'Failed to track decisions');
  }

  /**
   * Analyze decision quality
   */
  private async analyzeDecisionQuality(decisions: Decision[], timeRange: TimeRange): Promise<DecisionQualityAnalysis> {
    return wrapDatabaseOperation(async () => {
      const qualityScores = decisions
        .filter(d => d.qualityScore !== undefined)
        .map(d => d.qualityScore!);

      if (qualityScores.length === 0) {
        return this.createEmptyQualityAnalysis();
      }

      const averageQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

      // Calculate quality distribution
      const qualityDistribution = {
        excellent: qualityScores.filter(s => s >= 80).length,
        good: qualityScores.filter(s => s >= 60 && s < 80).length,
        fair: qualityScores.filter(s => s >= 40 && s < 60).length,
        poor: qualityScores.filter(s => s < 40).length
      };

      // Analyze quality factors
      const qualityFactors = this.analyzeQualityFactors(decisions);

      // Calculate trends over time
      const trends = await this.calculateQualityTrends(decisions, timeRange);

      return {
        averageQuality: Math.round(averageQuality),
        qualityDistribution,
        qualityFactors,
        trends
      };
    }, 'Failed to analyze decision quality');
  }

  /**
   * Analyze decision outcomes
   */
  private async analyzeDecisionOutcomes(decisions: Decision[]): Promise<DecisionOutcomeAnalysis> {
    return wrapDatabaseOperation(async () => {
      const decisionsWithOutcomes = decisions.filter(d => d.outcome !== undefined);

      if (decisionsWithOutcomes.length === 0) {
        return this.createEmptyOutcomeAnalysis();
      }

      const outcomeScores = decisionsWithOutcomes.map(d => d.outcome!);
      const averageOutcome = outcomeScores.reduce((sum, score) => sum + score, 0) / outcomeScores.length;

      // Calculate outcome distribution
      const outcomeDistribution = {
        successful: outcomeScores.filter(s => s >= 80).length,
        partial: outcomeScores.filter(s => s >= 40 && s < 80).length,
        unsuccessful: outcomeScores.filter(s => s < 40).length,
        unknown: decisions.length - decisionsWithOutcomes.length
      };

      // Calculate time to outcome
      const timeToOutcome = this.calculateTimeToOutcome(decisionsWithOutcomes);

      // Identify success factors and failure patterns
      const successFactors = this.identifySuccessFactors(decisionsWithOutcomes);
      const failurePatterns = this.identifyFailurePatterns(decisionsWithOutcomes);

      return {
        averageOutcome: Math.round(averageOutcome),
        outcomeDistribution,
        timeToOutcome,
        successFactors,
        failurePatterns
      };
    }, 'Failed to analyze decision outcomes');
  }

  /**
   * Analyze decision reversals
   */
  private async analyzeDecisionReversals(decisions: Decision[]): Promise<DecisionReversalAnalysis> {
    return wrapDatabaseOperation(async () => {
      const reversedDecisions = decisions.filter(d => d.reversed);
      const reversalRate = decisions.length > 0 ? reversedDecisions.length / decisions.length : 0;

      if (reversedDecisions.length === 0) {
        return {
          reversalRate: 0,
          timeToReversal: { average: 0, median: 0, range: { min: 0, max: 0 } },
          reversalsByType: [],
          reversalReasons: [],
          preventionStrategies: []
        };
      }

      // Calculate time to reversal
      const timeToReversal = this.calculateTimeToReversal(reversedDecisions);

      // Analyze reversals by type
      const reversalsByType = this.calculateReversalsByType(decisions);

      // Identify reversal reasons
      const reversalReasons = this.identifyReversalReasons(reversedDecisions);

      // Generate prevention strategies
      const preventionStrategies = this.generatePreventionStrategies(reversedDecisions, reversalReasons);

      return {
        reversalRate,
        timeToReversal,
        reversalsByType,
        reversalReasons,
        preventionStrategies
      };
    }, 'Failed to analyze decision reversals');
  }

  /**
   * Analyze decision types
   */
  private async analyzeDecisionTypes(decisions: Decision[]): Promise<DecisionTypeAnalysis> {
    return wrapDatabaseOperation(async () => {
      // Group decisions by type
      const typeGroups = this.groupDecisionsByType(decisions);

      // Analyze each type
      const byType = Array.from(typeGroups.entries()).map(([type, typeDecisions]) => ({
        type,
        count: typeDecisions.length,
        averageQuality: this.calculateAverageQuality(typeDecisions),
        averageOutcome: this.calculateAverageOutcome(typeDecisions),
        reversalRate: typeDecisions.filter(d => d.reversed).length / typeDecisions.length,
        characteristics: this.identifyTypeCharacteristics(typeDecisions)
      }));

      // Find most common types
      const mostCommon = byType
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
        .map(type => ({
          type: type.type,
          frequency: type.count,
          percentage: Math.round((type.count / decisions.length) * 100)
        }));

      // Find best performing types
      const bestPerforming = byType
        .filter(type => type.count >= 2) // Only consider types with multiple decisions
        .map(type => ({
          type: type.type,
          performanceScore: Math.round(
            (type.averageQuality * 0.4) + 
            (type.averageOutcome * 0.4) + 
            ((1 - type.reversalRate) * 100 * 0.2)
          ),
          qualityScore: type.averageQuality,
          outcomeScore: type.averageOutcome
        }))
        .sort((a, b) => b.performanceScore - a.performanceScore)
        .slice(0, 3);

      return {
        byType,
        mostCommon,
        bestPerforming
      };
    }, 'Failed to analyze decision types');
  }

  /**
   * Analyze decision-making process
   */
  private async analyzeDecisionProcess(decisions: Decision[], conversations: any[], messages: any[]): Promise<TrackDecisionEffectivenessResponse['processInsights']> {
    return wrapDatabaseOperation(async () => {
      // Calculate average decision time
      const averageDecisionTime = this.calculateAverageDecisionTime(decisions, messages);

      // Analyze information gathering
      const informationGathering = this.analyzeInformationGathering(decisions, messages);

      // Analyze consultation patterns
      const consultationPatterns = this.analyzeConsultationPatterns(decisions, messages);

      // Analyze follow-up adherence
      const followUpAdherence = this.analyzeFollowUpAdherence(decisions);

      return {
        averageDecisionTime,
        informationGathering,
        consultationPatterns,
        followUpAdherence
      };
    }, 'Failed to analyze decision process');
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    decisions: Decision[],
    qualityAnalysis: DecisionQualityAnalysis,
    outcomeAnalysis?: DecisionOutcomeAnalysis,
    reversalAnalysis?: DecisionReversalAnalysis
  ): TrackDecisionEffectivenessResponse['recommendations'] {
    const qualityImprovements: string[] = [];
    const processImprovements: string[] = [];
    const riskMitigation: string[] = [];
    const bestPractices: string[] = [];

    // Quality improvements
    if (qualityAnalysis.averageQuality < 70) {
      qualityImprovements.push('Implement structured decision-making framework');
      qualityImprovements.push('Increase information gathering before making decisions');
    }

    if (qualityAnalysis.qualityDistribution.poor > 0) {
      qualityImprovements.push('Review and improve decision criteria for poor quality decisions');
    }

    // Process improvements
    const fastDecisions = decisions.filter(d => d.processingTime && d.processingTime < 300000); // Less than 5 minutes
    if (fastDecisions.length / decisions.length > 0.5) {
      processImprovements.push('Consider spending more time on decision analysis');
    }

    // Risk mitigation
    if (reversalAnalysis && reversalAnalysis.reversalRate > 0.2) {
      riskMitigation.push('Implement decision review process to reduce reversals');
      riskMitigation.push('Add checkpoint evaluations before finalizing decisions');
    }

    // Best practices
    if (qualityAnalysis.averageQuality > 80) {
      bestPractices.push('Continue current high-quality decision-making approach');
    }

    const highQualityFactors = qualityAnalysis.qualityFactors.filter(f => f.impact > 20);
    highQualityFactors.forEach(factor => {
      bestPractices.push(`Leverage ${factor.factor.toLowerCase()} in decision-making`);
    });

    return {
      qualityImprovements: qualityImprovements.length > 0 ? qualityImprovements : ['Decision quality is satisfactory'],
      processImprovements: processImprovements.length > 0 ? processImprovements : ['Process efficiency is good'],
      riskMitigation: riskMitigation.length > 0 ? riskMitigation : ['Risk levels are manageable'],
      bestPractices: bestPractices.length > 0 ? bestPractices : ['Continue monitoring decision effectiveness']
    };
  }

  /**
   * Generate insights
   */
  private generateInsights(
    decisions: Decision[],
    qualityAnalysis: DecisionQualityAnalysis,
    outcomeAnalysis?: DecisionOutcomeAnalysis,
    reversalAnalysis?: DecisionReversalAnalysis,
    typeAnalysis?: DecisionTypeAnalysis
  ): TrackDecisionEffectivenessResponse['insights'] {
    const keyInsights: string[] = [];
    const warnings: string[] = [];
    const positives: string[] = [];
    const concerns: string[] = [];

    // Quality insights
    if (qualityAnalysis.averageQuality > 80) {
      positives.push('Consistently high decision quality maintained');
    } else if (qualityAnalysis.averageQuality < 50) {
      concerns.push('Decision quality is below acceptable threshold');
    }

    keyInsights.push(`Average decision quality: ${qualityAnalysis.averageQuality}/100 across ${decisions.length} decisions`);

    // Outcome insights
    if (outcomeAnalysis) {
      if (outcomeAnalysis.averageOutcome > 75) {
        positives.push('Decision outcomes are generally successful');
      } else if (outcomeAnalysis.averageOutcome < 50) {
        concerns.push('Decision outcomes need improvement');
      }
    }

    // Reversal insights
    if (reversalAnalysis) {
      if (reversalAnalysis.reversalRate > 0.3) {
        warnings.push(`High decision reversal rate: ${Math.round(reversalAnalysis.reversalRate * 100)}%`);
        concerns.push('Consider implementing more thorough decision validation');
      } else if (reversalAnalysis.reversalRate < 0.1) {
        positives.push('Low decision reversal rate indicates good decision stability');
      }
    }

    // Type insights
    if (typeAnalysis && typeAnalysis.mostCommon.length > 0) {
      const topType = typeAnalysis.mostCommon[0];
      keyInsights.push(`Most common decision type: ${topType.type} (${topType.percentage}% of decisions)`);
    }

    if (typeAnalysis && typeAnalysis.bestPerforming.length > 0) {
      const bestType = typeAnalysis.bestPerforming[0];
      positives.push(`Best performing decision type: ${bestType.type} (${bestType.performanceScore}/100)`);
    }

    // Trends insights
    const recentTrend = qualityAnalysis.trends[qualityAnalysis.trends.length - 1];
    const earlierTrend = qualityAnalysis.trends[0];
    if (recentTrend && earlierTrend && recentTrend.averageQuality > earlierTrend.averageQuality + 10) {
      positives.push('Decision quality is improving over time');
    } else if (recentTrend && earlierTrend && recentTrend.averageQuality < earlierTrend.averageQuality - 10) {
      warnings.push('Decision quality is declining over time');
    }

    return {
      keyInsights: keyInsights.length > 0 ? keyInsights : ['Decision tracking analysis completed'],
      warnings,
      positives,
      concerns
    };
  }

  // Helper methods (simplified implementations for brevity)
  
  private analyzeQualityFactors(decisions: Decision[]) {
    const factorAnalysis = new Map<string, { impacts: number[], frequencies: number }>(
      [['Information Availability', { impacts: [], frequencies: 0 }],
       ['Time Pressure', { impacts: [], frequencies: 0 }],
       ['Stakeholder Input', { impacts: [], frequencies: 0 }],
       ['Decision Complexity', { impacts: [], frequencies: 0 }],
       ['Prior Experience', { impacts: [], frequencies: 0 }]]
    );

    // Analyze actual decisions to determine factor impacts
    decisions.forEach(decision => {
      const qualityScore = decision.qualityScore || 50;
      
      // Information Availability: based on processing time and quality correlation
      if (decision.processingTime && decision.processingTime > 1800000) { // > 30 minutes
        factorAnalysis.get('Information Availability')!.impacts.push(qualityScore > 70 ? 20 : -10);
        factorAnalysis.get('Information Availability')!.frequencies++;
      }
      
      // Time Pressure: fast decisions vs quality
      if (decision.processingTime && decision.processingTime < 300000) { // < 5 minutes
        factorAnalysis.get('Time Pressure')!.impacts.push(qualityScore > 60 ? 5 : -20);
        factorAnalysis.get('Time Pressure')!.frequencies++;
      }
      
      // Stakeholder Input: decisions with consultation vs without
      if (decision.metadata?.hasConsultation) {
        factorAnalysis.get('Stakeholder Input')!.impacts.push(qualityScore > 70 ? 15 : 5);
        factorAnalysis.get('Stakeholder Input')!.frequencies++;
      }
      
      // Decision Complexity: based on description length and outcome variance
      const complexityScore = (decision.description?.length || 0) / 100;
      if (complexityScore > 2) {
        factorAnalysis.get('Decision Complexity')!.impacts.push(qualityScore > 60 ? 10 : -15);
        factorAnalysis.get('Decision Complexity')!.frequencies++;
      }
      
      // Prior Experience: similar decision types and their success
      if (decision.metadata?.hasPriorExperience) {
        factorAnalysis.get('Prior Experience')!.impacts.push(qualityScore > 75 ? 25 : 10);
        factorAnalysis.get('Prior Experience')!.frequencies++;
      }
    });

    // Calculate average impacts and frequencies
    return Array.from(factorAnalysis.entries())
      .filter(([_, data]) => data.frequencies > 0)
      .map(([factor, data]) => ({
        factor,
        impact: Math.round(data.impacts.reduce((sum, impact) => sum + impact, 0) / data.impacts.length),
        frequency: Math.min(1, data.frequencies / decisions.length)
      }))
      .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
  }

  private async calculateQualityTrends(decisions: Decision[], timeRange: TimeRange) {
    if (decisions.length === 0) return [];
    
    const timeSpan = timeRange.end - timeRange.start;
    const periodLength = timeSpan / 4; // Divide into 4 periods
    const trends = [];
    
    for (let i = 0; i < 4; i++) {
      const periodStart = timeRange.start + (i * periodLength);
      const periodEnd = timeRange.start + ((i + 1) * periodLength);
      
      const periodDecisions = decisions.filter(d => 
        d.timestamp && d.timestamp >= periodStart && d.timestamp < periodEnd && d.qualityScore !== undefined
      );
      
      if (periodDecisions.length > 0) {
        const averageQuality = periodDecisions.reduce((sum, d) => sum + (d.qualityScore || 0), 0) / periodDecisions.length;
        const periodName = this.formatPeriodName(periodStart, periodEnd);
        
        trends.push({
          period: periodName,
          averageQuality: Math.round(averageQuality),
          decisionCount: periodDecisions.length
        });
      }
    }
    
    return trends;
  }
  
  private formatPeriodName(start: number, end: number): string {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (endDate.getTime() - startDate.getTime() <= 7 * 24 * 60 * 60 * 1000) {
      return `Week of ${startDate.toLocaleDateString()}`;
    } else {
      return `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
    }
  }

  private calculateTimeToOutcome(decisions: Decision[]) {
    const times = decisions
      .filter(d => d.outcomeAssessedAt && d.timestamp)
      .map(d => (d.outcomeAssessedAt! - d.timestamp!) / (1000 * 60 * 60 * 24)); // Convert to days

    return {
      average: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
      median: times.length > 0 ? this.calculateMedian(times) : 0,
      range: {
        min: times.length > 0 ? Math.min(...times) : 0,
        max: times.length > 0 ? Math.max(...times) : 0
      }
    };
  }

  private calculateMedian(numbers: number[]): number {
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private identifySuccessFactors(decisions: Decision[]): string[] {
    const successfulDecisions = decisions.filter(d => 
      d.outcome && d.outcome >= 75 && d.qualityScore && d.qualityScore >= 70
    );
    
    if (successfulDecisions.length === 0) return [];
    
    const factorCounts = new Map<string, number>();
    
    successfulDecisions.forEach(decision => {
      // Analyze processing time
      if (decision.processingTime && decision.processingTime > 1800000) { // > 30 minutes
        this.incrementFactor(factorCounts, 'Thorough information gathering');
      }
      
      // Check for consultation patterns
      if (decision.metadata?.hasConsultation || decision.description?.toLowerCase().includes('consult')) {
        this.incrementFactor(factorCounts, 'Stakeholder consultation');
      }
      
      // Check for clear criteria
      if (decision.description?.toLowerCase().includes('criteria') || 
          decision.description?.toLowerCase().includes('goals')) {
        this.incrementFactor(factorCounts, 'Clear success criteria');
      }
      
      // Check for data-driven approach
      if (decision.description?.toLowerCase().includes('data') || 
          decision.description?.toLowerCase().includes('analysis')) {
        this.incrementFactor(factorCounts, 'Data-driven analysis');
      }
      
      // Check for alternative consideration
      if (decision.description?.toLowerCase().includes('alternative') || 
          decision.description?.toLowerCase().includes('option')) {
        this.incrementFactor(factorCounts, 'Alternative consideration');
      }
      
      // Check for risk assessment
      if (decision.description?.toLowerCase().includes('risk') || 
          decision.description?.toLowerCase().includes('impact')) {
        this.incrementFactor(factorCounts, 'Risk assessment');
      }
    });
    
    // Return factors that appear in at least 30% of successful decisions
    const threshold = Math.max(1, Math.floor(successfulDecisions.length * 0.3));
    
    return Array.from(factorCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort(([_, a], [__, b]) => b - a)
      .map(([factor, _]) => factor)
      .slice(0, 5);
  }
  
  private incrementFactor(factorCounts: Map<string, number>, factor: string): void {
    factorCounts.set(factor, (factorCounts.get(factor) || 0) + 1);
  }

  private identifyFailurePatterns(decisions: Decision[]): string[] {
    const failedDecisions = decisions.filter(d => 
      d.outcome && d.outcome < 40 || d.qualityScore && d.qualityScore < 50
    );
    
    if (failedDecisions.length === 0) return [];
    
    const patternCounts = new Map<string, number>();
    
    failedDecisions.forEach(decision => {
      // Analyze processing time for rushed decisions
      if (decision.processingTime && decision.processingTime < 300000) { // < 5 minutes
        this.incrementFactor(patternCounts, 'Rushed decision-making');
      }
      
      // Check for lack of data analysis
      if (!decision.description?.toLowerCase().includes('data') && 
          !decision.description?.toLowerCase().includes('analysis')) {
        this.incrementFactor(patternCounts, 'Insufficient data analysis');
      }
      
      // Check for lack of alternatives
      if (!decision.description?.toLowerCase().includes('alternative') && 
          !decision.description?.toLowerCase().includes('option')) {
        this.incrementFactor(patternCounts, 'Lack of alternative consideration');
      }
      
      // Check for lack of consultation
      if (!decision.metadata?.hasConsultation && 
          !decision.description?.toLowerCase().includes('consult')) {
        this.incrementFactor(patternCounts, 'Limited stakeholder input');
      }
      
      // Check for unclear objectives
      if (!decision.description?.toLowerCase().includes('goal') && 
          !decision.description?.toLowerCase().includes('objective')) {
        this.incrementFactor(patternCounts, 'Unclear objectives');
      }
      
      // Check for lack of risk consideration
      if (!decision.description?.toLowerCase().includes('risk') && 
          !decision.description?.toLowerCase().includes('consequence')) {
        this.incrementFactor(patternCounts, 'Inadequate risk assessment');
      }
      
      // Check for decision reversals
      if (decision.reversed) {
        this.incrementFactor(patternCounts, 'Premature finalization');
      }
    });
    
    // Return patterns that appear in at least 25% of failed decisions
    const threshold = Math.max(1, Math.floor(failedDecisions.length * 0.25));
    
    return Array.from(patternCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort(([_, a], [__, b]) => b - a)
      .map(([pattern, _]) => pattern)
      .slice(0, 5);
  }

  private calculateTimeToReversal(decisions: Decision[]) {
    const times = decisions
      .filter(d => d.reversed && d.timestamp)
      .map(d => 1); // Just count reversals, no time calculation available

    return {
      average: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
      median: times.length > 0 ? this.calculateMedian(times) : 0,
      range: {
        min: times.length > 0 ? Math.min(...times) : 0,
        max: times.length > 0 ? Math.max(...times) : 0
      }
    };
  }

  private calculateReversalsByType(decisions: Decision[]) {
    const typeGroups = this.groupDecisionsByType(decisions);
    
    return Array.from(typeGroups.entries()).map(([type, typeDecisions]) => ({
      decisionType: type,
      reversalRate: typeDecisions.filter(d => d.reversed).length / typeDecisions.length,
      count: typeDecisions.length
    }));
  }

  private identifyReversalReasons(decisions: Decision[]) {
    const reversedDecisions = decisions.filter(d => d.reversed);
    
    if (reversedDecisions.length === 0) return [];
    
    const reasonCounts = new Map<string, { count: number, impactSum: number }>();
    
    reversedDecisions.forEach(decision => {
      const timeToReversal = decision.reversed ? 24 : 0; // Default to 1 day if reversed
      
      // Analyze reversal patterns based on timing and context
      if (timeToReversal < 24) { // Within 24 hours
        this.addReversalReason(reasonCounts, 'Immediate reconsideration', 5);
      } else if (timeToReversal < 168) { // Within a week
        this.addReversalReason(reasonCounts, 'New information available', 4);
      } else {
        this.addReversalReason(reasonCounts, 'Changed circumstances', 3);
      }
      
      // Analyze reversal context from decision description
      const description = decision.description?.toLowerCase() || '';
      
      if (description.includes('stakeholder') || description.includes('team')) {
        this.addReversalReason(reasonCounts, 'Stakeholder objection', 4);
      }
      
      if (description.includes('budget') || description.includes('cost')) {
        this.addReversalReason(reasonCounts, 'Budget constraints', 3);
      }
      
      if (description.includes('technical') || description.includes('feasibility')) {
        this.addReversalReason(reasonCounts, 'Technical feasibility issues', 4);
      }
      
      if (description.includes('risk') || description.includes('concern')) {
        this.addReversalReason(reasonCounts, 'Risk reassessment', 3);
      }
      
      // Default reason if no specific pattern found
      if (reasonCounts.size === 0) {
        this.addReversalReason(reasonCounts, 'Unspecified factors', 2);
      }
    });
    
    return Array.from(reasonCounts.entries())
      .map(([reason, data]) => ({
        reason,
        frequency: data.count,
        impact: Math.round(data.impactSum / data.count)
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 5);
  }
  
  private addReversalReason(reasonCounts: Map<string, { count: number, impactSum: number }>, reason: string, impact: number): void {
    const existing = reasonCounts.get(reason) || { count: 0, impactSum: 0 };
    existing.count++;
    existing.impactSum += impact;
    reasonCounts.set(reason, existing);
  }

  private generatePreventionStrategies(decisions: Decision[], reasons: any[]): string[] {
    return [
      'Implement decision review checkpoints',
      'Establish clearer decision criteria',
      'Improve stakeholder communication'
    ];
  }

  private groupDecisionsByType(decisions: Decision[]): Map<string, Decision[]> {
    const groups = new Map<string, Decision[]>();
    
    decisions.forEach(decision => {
      const type = decision.decisionType || 'Unknown';
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(decision);
    });

    return groups;
  }

  private calculateAverageQuality(decisions: Decision[]): number {
    const qualityScores = decisions.filter(d => d.qualityScore !== undefined).map(d => d.qualityScore!);
    return qualityScores.length > 0 ? qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;
  }

  private calculateAverageOutcome(decisions: Decision[]): number {
    const outcomeScores = decisions.filter(d => d.outcome !== undefined).map(d => d.outcome!);
    return outcomeScores.length > 0 ? outcomeScores.reduce((sum, score) => sum + score, 0) / outcomeScores.length : 0;
  }

  private identifyTypeCharacteristics(decisions: Decision[]): string[] {
    if (decisions.length === 0) return [];
    
    const characteristics = new Set<string>();
    const totalDecisions = decisions.length;
    
    // Analyze processing time characteristics
    const avgProcessingTime = decisions
      .filter(d => d.processingTime)
      .reduce((sum, d) => sum + (d.processingTime || 0), 0) / 
      decisions.filter(d => d.processingTime).length;
    
    if (avgProcessingTime > 1800000) { // > 30 minutes
      characteristics.add('Deliberative approach');
    } else if (avgProcessingTime < 300000) { // < 5 minutes
      characteristics.add('Rapid decision-making');
    } else {
      characteristics.add('Balanced timing');
    }
    
    // Analyze quality characteristics
    const avgQuality = decisions
      .filter(d => d.qualityScore)
      .reduce((sum, d) => sum + (d.qualityScore || 0), 0) / 
      decisions.filter(d => d.qualityScore).length;
    
    if (avgQuality > 80) {
      characteristics.add('High-quality decisions');
    } else if (avgQuality > 60) {
      characteristics.add('Moderate quality focus');
    }
    
    // Analyze consultation patterns
    const consultationRate = decisions.filter(d => 
      d.metadata?.hasConsultation || 
      d.description?.toLowerCase().includes('consult')
    ).length / totalDecisions;
    
    if (consultationRate > 0.7) {
      characteristics.add('Highly collaborative');
    } else if (consultationRate > 0.3) {
      characteristics.add('Moderately collaborative');
    } else {
      characteristics.add('Independent approach');
    }
    
    // Analyze data usage
    const dataUsageRate = decisions.filter(d => 
      d.description?.toLowerCase().includes('data') ||
      d.description?.toLowerCase().includes('analysis')
    ).length / totalDecisions;
    
    if (dataUsageRate > 0.6) {
      characteristics.add('Data-driven');
    } else if (dataUsageRate > 0.3) {
      characteristics.add('Evidence-informed');
    }
    
    // Analyze structure and process
    const structuredRate = decisions.filter(d => 
      d.description?.toLowerCase().includes('criteria') ||
      d.description?.toLowerCase().includes('framework') ||
      d.description?.toLowerCase().includes('process')
    ).length / totalDecisions;
    
    if (structuredRate > 0.5) {
      characteristics.add('Structured approach');
    } else {
      characteristics.add('Flexible approach');
    }
    
    // Analyze risk consideration
    const riskAwareRate = decisions.filter(d => 
      d.description?.toLowerCase().includes('risk') ||
      d.description?.toLowerCase().includes('impact')
    ).length / totalDecisions;
    
    if (riskAwareRate > 0.4) {
      characteristics.add('Risk-conscious');
    }
    
    return Array.from(characteristics).slice(0, 5);
  }

  private calculateAverageDecisionTime(decisions: Decision[], messages: any[]): number {
    const decisionsWithTime = decisions.filter(d => d.processingTime);
    
    if (decisionsWithTime.length === 0) {
      // Fallback: estimate from message patterns
      const conversationTimes = new Map<string, number[]>();
      
      messages.forEach(msg => {
        const convId = msg.conversationId;
        if (!conversationTimes.has(convId)) {
          conversationTimes.set(convId, []);
        }
        conversationTimes.get(convId)!.push(new Date(msg.timestamp).getTime());
      });
      
      const estimatedTimes: number[] = [];
      conversationTimes.forEach(times => {
        if (times.length > 1) {
          times.sort((a, b) => a - b);
          const duration = (times[times.length - 1] - times[0]) / (1000 * 60); // Convert to minutes
          estimatedTimes.push(Math.min(duration, 240)); // Cap at 4 hours
        }
      });
      
      if (estimatedTimes.length > 0) {
        return Math.round(estimatedTimes.reduce((sum, time) => sum + time, 0) / estimatedTimes.length);
      }
      
      return 30; // Default reasonable estimate
    }
    
    // Calculate from actual processing times
    const avgMilliseconds = decisionsWithTime.reduce((sum, d) => sum + (d.processingTime || 0), 0) / decisionsWithTime.length;
    return Math.round(avgMilliseconds / (1000 * 60)); // Convert to minutes
  }

  private analyzeInformationGathering(decisions: Decision[], messages: any[]) {
    const sources = new Map<string, number>();
    const gaps = new Set<string>();
    let totalInformationScore = 0;
    let scoredDecisions = 0;
    
    decisions.forEach(decision => {
      const description = decision.description?.toLowerCase() || '';
      const processingTime = decision.processingTime || 0;
      
      // Identify information sources mentioned
      if (description.includes('document') || description.includes('manual')) {
        this.incrementFactor(sources, 'Documentation');
      }
      if (description.includes('expert') || description.includes('consult')) {
        this.incrementFactor(sources, 'Expert consultation');
      }
      if (description.includes('data') || description.includes('analysis')) {
        this.incrementFactor(sources, 'Data analysis');
      }
      if (description.includes('research') || description.includes('study')) {
        this.incrementFactor(sources, 'Research');
      }
      if (description.includes('experience') || description.includes('past')) {
        this.incrementFactor(sources, 'Prior experience');
      }
      if (description.includes('benchmark') || description.includes('comparison')) {
        this.incrementFactor(sources, 'Benchmarking');
      }
      
      // Score information gathering based on processing time and quality
      let informationScore = 50; // Base score
      
      if (processingTime > 1800000) informationScore += 20; // Thorough time investment
      if (processingTime > 3600000) informationScore += 10; // Very thorough
      
      if (decision.qualityScore && decision.qualityScore > 70) informationScore += 15;
      if (decision.outcome && decision.outcome > 75) informationScore += 10;
      
      // Penalize for indicators of poor information gathering
      if (processingTime < 300000) informationScore -= 15; // Too rushed
      if (decision.reversed) informationScore -= 10; // May indicate insufficient info
      
      totalInformationScore += Math.max(0, Math.min(100, informationScore));
      scoredDecisions++;
      
      // Identify potential gaps
      if (!description.includes('risk') && !description.includes('impact')) {
        gaps.add('Risk assessment');
      }
      if (!description.includes('market') && !description.includes('competitive')) {
        gaps.add('Market research');
      }
      if (!description.includes('financial') && !description.includes('cost')) {
        gaps.add('Financial analysis');
      }
      if (!description.includes('user') && !description.includes('customer')) {
        gaps.add('User research');
      }
      if (!description.includes('technical') && !description.includes('feasibility')) {
        gaps.add('Technical assessment');
      }
    });
    
    const avgScore = scoredDecisions > 0 ? Math.round(totalInformationScore / scoredDecisions) : 50;
    
    const commonSources = Array.from(sources.entries())
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([source, _]) => source);
    
    const identifiedGaps = Array.from(gaps)
      .slice(0, 4); // Limit to top 4 gaps
    
    return {
      score: avgScore,
      commonSources: commonSources.length > 0 ? commonSources : ['Limited information sources identified'],
      gaps: identifiedGaps
    };
  }

  private analyzeConsultationPatterns(decisions: Decision[], messages: any[]) {
    if (decisions.length === 0) {
      return { frequency: 0, effectiveness: 0, types: [] };
    }
    
    let consultationCount = 0;
    let totalEffectiveness = 0;
    const consultationTypes = new Map<string, number>();
    
    decisions.forEach(decision => {
      const description = decision.description?.toLowerCase() || '';
      let hasConsultation = false;
      let effectivenessScore = 50;
      
      // Detect consultation patterns
      if (description.includes('peer') || description.includes('colleague')) {
        this.incrementFactor(consultationTypes, 'Peer review');
        hasConsultation = true;
        effectivenessScore += 10;
      }
      
      if (description.includes('expert') || description.includes('specialist')) {
        this.incrementFactor(consultationTypes, 'Expert consultation');
        hasConsultation = true;
        effectivenessScore += 15;
      }
      
      if (description.includes('stakeholder') || description.includes('customer')) {
        this.incrementFactor(consultationTypes, 'Stakeholder input');
        hasConsultation = true;
        effectivenessScore += 12;
      }
      
      if (description.includes('team') || description.includes('meeting')) {
        this.incrementFactor(consultationTypes, 'Team consultation');
        hasConsultation = true;
        effectivenessScore += 8;
      }
      
      if (description.includes('review') || description.includes('feedback')) {
        this.incrementFactor(consultationTypes, 'Formal review');
        hasConsultation = true;
        effectivenessScore += 10;
      }
      
      // Check metadata for consultation indicators
      if (decision.metadata?.hasConsultation) {
        hasConsultation = true;
        effectivenessScore += 5;
      }
      
      if (hasConsultation) {
        consultationCount++;
        
        // Adjust effectiveness based on outcomes
        if (decision.qualityScore && decision.qualityScore > 80) effectivenessScore += 20;
        if (decision.outcome && decision.outcome > 80) effectivenessScore += 15;
        if (decision.reversed) effectivenessScore -= 20; // Consultation didn't prevent reversal
        
        totalEffectiveness += Math.max(0, Math.min(100, effectivenessScore));
      }
    });
    
    const frequency = consultationCount / decisions.length;
    const avgEffectiveness = consultationCount > 0 ? 
      Math.round(totalEffectiveness / consultationCount) : 0;
    
    const types = Array.from(consultationTypes.entries())
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([type, _]) => type);
    
    return {
      frequency: Math.round(frequency * 100) / 100, // Round to 2 decimal places
      effectiveness: avgEffectiveness,
      types: types.length > 0 ? types : ['No consultation patterns identified']
    };
  }

  private analyzeFollowUpAdherence(decisions: Decision[]) {
    if (decisions.length === 0) {
      return { rate: 0, averageDelay: 0, completionRate: 0 };
    }
    
    let followUpCount = 0;
    let totalDelay = 0;
    let completedCount = 0;
    const delays: number[] = [];
    
    decisions.forEach(decision => {
      // Check for follow-up indicators
      const hasFollowUp = decision.outcome !== undefined || 
                          decision.metadata?.hasFollowUp ||
                          decision.description?.toLowerCase().includes('follow') ||
                          decision.description?.toLowerCase().includes('track');
      
      if (hasFollowUp) {
        followUpCount++;
        
        // Calculate delay if we have outcome measurement time
        if (decision.outcomeAssessedAt && decision.timestamp) {
          const delay = (decision.outcomeAssessedAt - decision.timestamp) / (1000 * 60 * 60 * 24); // days
          delays.push(delay);
          totalDelay += delay;
          
          // Consider completed if outcome was measured
          completedCount++;
        } else if (decision.outcome) {
          // Has outcome but no specific timing - assume reasonable delay
          const estimatedDelay = 7; // Assume 1 week default
          delays.push(estimatedDelay);
          totalDelay += estimatedDelay;
          completedCount++;
        }
      }
    });
    
    const followUpRate = followUpCount / decisions.length;
    const averageDelay = delays.length > 0 ? totalDelay / delays.length : 0;
    const completionRate = followUpCount > 0 ? completedCount / followUpCount : 0;
    
    return {
      rate: Math.round(followUpRate * 100) / 100,
      averageDelay: Math.round(averageDelay * 10) / 10, // Round to 1 decimal
      completionRate: Math.round(completionRate * 100) / 100
    };
  }

  private createEmptyQualityAnalysis(): DecisionQualityAnalysis {
    return {
      averageQuality: 0,
      qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
      qualityFactors: [],
      trends: []
    };
  }

  private createEmptyOutcomeAnalysis(): DecisionOutcomeAnalysis {
    return {
      averageOutcome: 0,
      outcomeDistribution: { successful: 0, partial: 0, unsuccessful: 0, unknown: 0 },
      timeToOutcome: { average: 0, median: 0, range: { min: 0, max: 0 } },
      successFactors: [],
      failurePatterns: []
    };
  }

  private createEmptyResponse(
    timeRange: TimeRange, 
    input: TrackDecisionEffectivenessInput, 
    startTime: number, 
    conversationCount: number = 0
  ): TrackDecisionEffectivenessResponse {
    return {
      timeRange,
      analyzedAt: Date.now(),
      decisions: [],
      qualityAnalysis: this.createEmptyQualityAnalysis(),
      outcomeAnalysis: input.includeOutcomes ? this.createEmptyOutcomeAnalysis() : undefined,
      reversalAnalysis: input.includeReversals ? {
        reversalRate: 0,
        timeToReversal: { average: 0, median: 0, range: { min: 0, max: 0 } },
        reversalsByType: [],
        reversalReasons: [],
        preventionStrategies: []
      } : undefined,
      typeAnalysis: {
        byType: [],
        mostCommon: [],
        bestPerforming: []
      },
      processInsights: {
        averageDecisionTime: 0,
        informationGathering: { score: 0, commonSources: [], gaps: [] },
        consultationPatterns: { frequency: 0, effectiveness: 0, types: [] },
        followUpAdherence: { rate: 0, averageDelay: 0, completionRate: 0 }
      },
      recommendations: {
        qualityImprovements: conversationCount === 0 ? ['Start conversations to begin decision tracking'] : ['No decisions found to analyze'],
        processImprovements: [],
        riskMitigation: [],
        bestPractices: []
      },
      insights: {
        keyInsights: conversationCount === 0 ? ['No conversations found in specified time range'] : ['No decisions detected in conversations'],
        warnings: [],
        positives: [],
        concerns: []
      },
      metadata: {
        conversationCount,
        totalDecisions: 0,
        qualityScored: 0,
        outcomeTracked: 0,
        analysisDuration: Date.now() - startTime,
        decisionTypesIncluded: input.decisionTypes || ['all']
      }
    };
  }

  /**
   * Static factory method to create a TrackDecisionEffectivenessTool instance
   */
  static create(dependencies: TrackDecisionEffectivenessDependencies): TrackDecisionEffectivenessTool {
    return new TrackDecisionEffectivenessTool(dependencies);
  }
}