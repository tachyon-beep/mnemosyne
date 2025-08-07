/**
 * Production Pattern Detector - Enhanced pattern detection with accuracy validation
 * 
 * This service provides production-ready pattern detection with comprehensive
 * accuracy validation, context-aware matching, and real-time quality monitoring.
 * Designed to achieve <5% false positive rate for production deployment.
 */

import { BaseRepository } from '../../storage/repositories/BaseRepository.js';
import { DatabaseManager } from '../../storage/Database.js';
import { PatternAccuracyValidator, PatternMatch, ConversationContext, LinguisticFeatures, SemanticContext, TemporalContext } from './PatternAccuracyValidator.js';
import { Message } from '../../types/interfaces.js';

export interface EnhancedCommitment {
  id: string;
  message: Message;
  commitmentText: string;
  commitmentType: 'promise' | 'deadline' | 'action' | 'deliverable' | 'investigation';
  confidence: number;
  validatedConfidence: number;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  timeframe?: {
    type: 'absolute' | 'relative';
    value: string;
    estimatedDays?: number;
    confidence: number;
  };
  actionItems: Array<{
    action: string;
    specificity: 'vague' | 'specific' | 'detailed';
    confidence: number;
  }>;
  contextualFactors: {
    conversationStage: string;
    topicRelevance: number;
    hypotheticalRisk: number;
    linguisticCertainty: number;
  };
  validationResult: {
    isValid: boolean;
    falsePositiveRisk: number;
    issues: string[];
    qualityScore: number;
  };
  extractedAt: number;
}

export interface EnhancedQuestion {
  id: string;
  message: Message;
  questionText: string;
  questionType: 'factual' | 'procedural' | 'opinion' | 'clarification' | 'decision' | 'rhetorical';
  confidence: number;
  validatedConfidence: number;
  subject: string;
  complexity: 'simple' | 'moderate' | 'complex';
  urgencyIndicators: string[];
  contextualRelevance: number;
  intentClassification: {
    primary: string;
    secondary?: string;
    confidence: number;
  };
  semanticFeatures: {
    entities: string[];
    concepts: string[];
    relationships: string[];
  };
  validationResult: {
    isValid: boolean;
    qualityScore: number;
    ambiguityRisk: number;
  };
  extractedAt: number;
}

export interface PatternQualityReport {
  timestamp: number;
  totalPatterns: number;
  validatedPatterns: number;
  qualityDistribution: {
    high: number;
    medium: number;
    low: number;
    invalid: number;
  };
  accuracyMetrics: {
    precision: number;
    recall: number;
    f1Score: number;
    falsePositiveRate: number;
    contextualAccuracy: number;
  };
  commonIssues: Array<{
    issue: string;
    frequency: number;
    severity: string;
  }>;
  recommendations: string[];
}

export class ProductionPatternDetector extends BaseRepository {
  private validator: PatternAccuracyValidator;
  private isInitialized = false;

  // Enhanced pattern configurations with production optimizations
  private static readonly ENHANCED_COMMITMENT_PATTERNS = [
    {
      id: 'strong_future_commitment',
      pattern: /\b(?:I'll|I will)\s+((?:(?!(?:if|unless|when|should|might|could|would|hypothetically|theoretically|suppose|imagine)).){10,120})(?:\s+(?:by|before|within|until)\s+((?:today|tomorrow|this week|next week|friday|monday|tuesday|wednesday|thursday|saturday|sunday|\d+\s*(?:hours?|days?|weeks?|months?))[^.!?]{0,30}))?\b/gi,
      baseConfidence: 0.88,
      type: 'promise',
      requiresContext: ['assistant_message', 'future_tense'],
      excludePatterns: [/\b(?:if|unless|suppose|imagine|hypothetically|theoretically|might|could|would)\b/i],
      boostFactors: {
        actionVerbs: 0.1,
        timeSpecificity: 0.15,
        certaintyMarkers: 0.08
      },
      penaltyFactors: {
        hedging: -0.2,
        uncertainty: -0.15,
        conditionals: -0.25
      }
    },
    {
      id: 'immediate_action_commitment',
      pattern: /\b(?:let me|I'll go ahead and|I'll start|I'll begin|I'll proceed to)\s+((?:(?!(?:if|unless|when|should|might|could|would)).){5,100})\b/gi,
      baseConfidence: 0.85,
      type: 'action',
      requiresContext: ['assistant_message', 'present_future_tense'],
      boostFactors: {
        immediacy: 0.12,
        actionSpecificity: 0.1
      }
    },
    {
      id: 'obligation_commitment',
      pattern: /\b(?:I need to|I have to|I must|I should)\s+((?:(?!(?:if|unless|when|might|could|would|probably|maybe)).){5,100})(?:\s+(?:by|before|within|until)\s+((?:today|tomorrow|this week|next week|\d+\s*(?:hours?|days?|weeks?))[^.!?]{0,20}))?\b/gi,
      baseConfidence: 0.78,
      type: 'deliverable',
      requiresContext: ['assistant_message'],
      penaltyFactors: {
        weakModals: -0.25
      }
    },
    {
      id: 'investigation_commitment',
      pattern: /\b(?:I'll (?:check|look into|investigate|research|review|examine|verify)|let me (?:check|look into|investigate|research|review|examine|verify))\s+((?:(?!(?:if|unless|when|should|might|could|would)).){5,100})\b/gi,
      baseConfidence: 0.82,
      type: 'investigation',
      requiresContext: ['assistant_message'],
      boostFactors: {
        investigativeVerbs: 0.08
      }
    },
    {
      id: 'temporal_deadline_commitment',
      pattern: /\b(?:by|before|within|until)\s+((?:today|tomorrow|this week|next week|end of (?:day|week|month)|friday|monday|tuesday|wednesday|thursday|saturday|sunday|\d+\s*(?:hours?|days?|weeks?|months?))[^.!?]{0,30})[,.]?\s*(?:I'll|I will|we'll|we will|let me)\s+((?:(?!(?:if|unless|when|should|might|could|would)).){5,100})\b/gi,
      baseConfidence: 0.92,
      type: 'deadline',
      requiresContext: ['assistant_message', 'temporal_reference'],
      boostFactors: {
        temporalSpecificity: 0.15,
        urgencyMarkers: 0.1
      }
    }
  ];

  private static readonly ENHANCED_QUESTION_PATTERNS = [
    {
      id: 'direct_wh_question',
      pattern: /^(?:what|how|when|where|why|who|which)\s+(.{8,150})\?$/gi,
      baseConfidence: 0.95,
      type: 'factual',
      requiresContext: ['question_mark', 'interrogative_word']
    },
    {
      id: 'auxiliary_question',
      pattern: /^(?:can|could|would|should|will|do|does|did|have|has|is|are|am)\s+(.{8,150})\?$/gi,
      baseConfidence: 0.92,
      type: 'factual',
      requiresContext: ['question_mark', 'auxiliary_verb']
    },
    {
      id: 'procedural_request',
      pattern: /^(?:how (?:do I|can I|should I)|what(?:'s the| is the)\s+(?:way|process|method|procedure|steps?)\s+to)\s+(.{8,150})[\?.]?$/gi,
      baseConfidence: 0.88,
      type: 'procedural',
      requiresContext: ['procedural_intent']
    },
    {
      id: 'explanation_request',
      pattern: /^(?:explain|describe|tell me (?:about|how)|walk me through|clarify|elaborate on)\s+(.{8,150})[\?.]?$/gi,
      baseConfidence: 0.85,
      type: 'clarification',
      requiresContext: ['explanation_intent']
    },
    {
      id: 'opinion_question',
      pattern: /^(?:what (?:do you think|are your thoughts|'s your opinion)|do you (?:think|believe|recommend)|would you (?:recommend|suggest))\s+(.{8,150})\?$/gi,
      baseConfidence: 0.82,
      type: 'opinion',
      requiresContext: ['opinion_seeking']
    }
  ];

  // Context analysis patterns
  private static readonly CONTEXT_INDICATORS = {
    hypothetical: [
      /\b(?:if|suppose|imagine|what if|assuming|hypothetically|theoretically|let's say|in theory)\b/gi,
      /\b(?:would|could|might|should)(?:\s+(?:you|I|we))?\s+(?:be able to|have|do|consider)\b/gi
    ],
    certainty: [
      /\b(?:definitely|certainly|absolutely|sure|confirm|guarantee|promise|commit)\b/gi,
      /\b(?:will|shall)\s+(?:definitely|certainly|absolutely)\b/gi
    ],
    urgency: [
      /\b(?:urgent|asap|immediately|right now|as soon as possible|critical|emergency)\b/gi,
      /\b(?:today|this morning|this afternoon|by end of day|eod)\b/gi
    ],
    temporal: [
      /\b(?:today|tomorrow|this week|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
      /\b(?:in|within|by|before|after)\s+\d+\s*(?:minutes?|hours?|days?|weeks?|months?)\b/gi
    ]
  };

  constructor(dbManager: DatabaseManager) {
    super(dbManager);
    this.validator = new PatternAccuracyValidator(dbManager);
  }

  /**
   * Initialize the production pattern detector
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🚀 Initializing Production Pattern Detector...');
    
    await this.validator.initialize();
    await this.initializePatternTables();
    
    this.isInitialized = true;
    console.log('✅ Production Pattern Detector initialized');
  }

  /**
   * Detect commitments with enhanced accuracy validation
   */
  async detectCommitments(
    messages: Message[],
    options: {
      minConfidence?: number;
      enableValidation?: boolean;
      includeContext?: boolean;
    } = {}
  ): Promise<EnhancedCommitment[]> {
    const {
      minConfidence = 0.75,
      enableValidation = true,
      includeContext = true
    } = options;

    const commitments: EnhancedCommitment[] = [];

    for (const message of messages) {
      // Only analyze assistant messages for commitments
      if (message.role !== 'assistant') continue;

      const context = includeContext ? await this.buildConversationContext(message, messages) : this.createMinimalContext(message);
      
      // Apply enhanced patterns
      for (const patternConfig of ProductionPatternDetector.ENHANCED_COMMITMENT_PATTERNS) {
        const matches = message.content.matchAll(patternConfig.pattern);
        
        for (const match of matches) {
          const rawCommitment = await this.createRawCommitment(message, match, patternConfig, context);
          
          // Skip if doesn't meet minimum confidence
          if (rawCommitment.confidence < minConfidence) continue;

          // Apply accuracy validation if enabled
          if (enableValidation) {
            const patternMatch: PatternMatch = {
              id: rawCommitment.id,
              pattern: patternConfig.pattern.source,
              text: message.content,
              matchedText: match[0],
              confidence: rawCommitment.confidence,
              contextualConfidence: 0,
              type: 'commitment',
              subtype: patternConfig.type,
              startPosition: match.index || 0,
              endPosition: (match.index || 0) + match[0].length,
              conversationContext: context,
              linguisticFeatures: this.extractLinguisticFeatures(message.content, match.index || 0),
              timestamp: Date.now()
            };

            const validationResult = await this.validator.validatePattern(patternMatch);
            
            // Apply validation results
            rawCommitment.validatedConfidence = validationResult.confidence;
            rawCommitment.validationResult = {
              isValid: validationResult.isValid,
              falsePositiveRisk: validationResult.falsePositiveRisk,
              issues: validationResult.issues.map(issue => issue.description),
              qualityScore: this.calculateQualityScore(validationResult)
            };

            // Filter out invalid patterns
            if (!validationResult.isValid || validationResult.falsePositiveRisk > 0.15) {
              continue;
            }
          }

          commitments.push(rawCommitment);
        }
      }
    }

    // Sort by validated confidence and quality
    return commitments.sort((a, b) => {
      const scoreA = enableValidation ? a.validatedConfidence : a.confidence;
      const scoreB = enableValidation ? b.validatedConfidence : b.confidence;
      return scoreB - scoreA;
    });
  }

  /**
   * Detect questions with enhanced accuracy validation
   */
  async detectQuestions(
    messages: Message[],
    options: {
      minConfidence?: number;
      enableValidation?: boolean;
      includeContext?: boolean;
    } = {}
  ): Promise<EnhancedQuestion[]> {
    const {
      minConfidence = 0.75,
      enableValidation = true,
      includeContext = true
    } = options;

    const questions: EnhancedQuestion[] = [];

    for (const message of messages) {
      // Typically analyze user messages for questions, but allow assistant clarifying questions
      if (message.role === 'system') continue;

      const context = includeContext ? await this.buildConversationContext(message, messages) : this.createMinimalContext(message);
      
      // Apply enhanced question patterns
      for (const patternConfig of ProductionPatternDetector.ENHANCED_QUESTION_PATTERNS) {
        const matches = message.content.matchAll(patternConfig.pattern);
        
        for (const match of matches) {
          const rawQuestion = await this.createRawQuestion(message, match, patternConfig, context);
          
          // Skip if doesn't meet minimum confidence
          if (rawQuestion.confidence < minConfidence) continue;

          // Apply accuracy validation if enabled
          if (enableValidation) {
            const patternMatch: PatternMatch = {
              id: rawQuestion.id,
              pattern: patternConfig.pattern.source,
              text: message.content,
              matchedText: match[0],
              confidence: rawQuestion.confidence,
              contextualConfidence: 0,
              type: 'question',
              subtype: patternConfig.type,
              startPosition: match.index || 0,
              endPosition: (match.index || 0) + match[0].length,
              conversationContext: context,
              linguisticFeatures: this.extractLinguisticFeatures(message.content, match.index || 0),
              timestamp: Date.now()
            };

            const validationResult = await this.validator.validatePattern(patternMatch);
            
            // Apply validation results
            rawQuestion.validatedConfidence = validationResult.confidence;
            rawQuestion.validationResult = {
              isValid: validationResult.isValid,
              qualityScore: this.calculateQualityScore(validationResult),
              ambiguityRisk: this.calculateAmbiguityRisk(validationResult)
            };

            // Filter out invalid patterns
            if (!validationResult.isValid || validationResult.falsePositiveRisk > 0.12) {
              continue;
            }
          }

          questions.push(rawQuestion);
        }
      }
    }

    return questions.sort((a, b) => {
      const scoreA = enableValidation ? a.validatedConfidence : a.confidence;
      const scoreB = enableValidation ? b.validatedConfidence : b.confidence;
      return scoreB - scoreA;
    });
  }

  /**
   * Run comprehensive pattern quality assessment
   */
  async assessPatternQuality(messages: Message[]): Promise<PatternQualityReport> {
    console.log('🔍 Running comprehensive pattern quality assessment...');
    
    const startTime = Date.now();
    
    // Detect all patterns with validation
    const commitments = await this.detectCommitments(messages, { enableValidation: true, minConfidence: 0.5 });
    const questions = await this.detectQuestions(messages, { enableValidation: true, minConfidence: 0.5 });
    
    const allPatterns = [...commitments, ...questions];
    const validPatterns = allPatterns.filter(p => 
      'validationResult' in p && p.validationResult.isValid
    );
    
    // Calculate quality distribution
    const qualityDistribution = {
      high: 0,
      medium: 0,
      low: 0,
      invalid: 0
    };
    
    for (const pattern of allPatterns) {
      if (!('validationResult' in pattern) || !pattern.validationResult.isValid) {
        qualityDistribution.invalid++;
        continue;
      }
      
      const quality = pattern.validationResult.qualityScore;
      if (quality >= 0.8) qualityDistribution.high++;
      else if (quality >= 0.6) qualityDistribution.medium++;
      else qualityDistribution.low++;
    }
    
    // Run accuracy test suite
    const testResults = await this.validator.runAccuracyTests();
    
    // Collect common issues
    const issueMap = new Map<string, { count: number; severity: string }>();
    
    for (const pattern of allPatterns) {
      if ('validationResult' in pattern && pattern.validationResult.issues.length > 0) {
        for (const issue of pattern.validationResult.issues) {
          const key = issue.replace(/[:.]/g, '').substring(0, 50); // Normalize issue text
          if (!issueMap.has(key)) {
            issueMap.set(key, { count: 0, severity: 'medium' });
          }
          issueMap.get(key)!.count++;
        }
      }
    }
    
    const commonIssues = Array.from(issueMap.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([issue, data]) => ({
        issue,
        frequency: data.count,
        severity: data.severity
      }));
    
    // Generate recommendations
    const recommendations = this.generateQualityRecommendations(testResults, qualityDistribution, commonIssues);
    
    const report: PatternQualityReport = {
      timestamp: Date.now(),
      totalPatterns: allPatterns.length,
      validatedPatterns: validPatterns.length,
      qualityDistribution,
      accuracyMetrics: {
        precision: testResults.precision,
        recall: testResults.recall,
        f1Score: testResults.f1Score,
        falsePositiveRate: testResults.falsePositiveRate,
        contextualAccuracy: testResults.contextualAccuracy
      },
      commonIssues,
      recommendations
    };
    
    // Store quality report
    await this.storeQualityReport(report);
    
    console.log(`✅ Pattern quality assessment completed in ${Date.now() - startTime}ms`);
    console.log(`📊 Results: ${validPatterns.length}/${allPatterns.length} valid patterns (${(validPatterns.length / Math.max(1, allPatterns.length) * 100).toFixed(1)}%)`);
    console.log(`🎯 Accuracy: P=${(testResults.precision * 100).toFixed(1)}% R=${(testResults.recall * 100).toFixed(1)}% F1=${(testResults.f1Score * 100).toFixed(1)}%`);
    console.log(`🚫 False Positive Rate: ${(testResults.falsePositiveRate * 100).toFixed(1)}%`);
    
    return report;
  }

  /**
   * Get production readiness status
   */
  async getProductionReadiness(): Promise<{
    isReady: boolean;
    readinessScore: number;
    criticalIssues: string[];
    recommendations: string[];
    metrics: {
      accuracy: number;
      falsePositiveRate: number;
      validationCoverage: number;
      qualityScore: number;
    };
  }> {
    const testResults = await this.validator.runAccuracyTests();
    const accuracyMetrics = this.validator.getAccuracyMetrics();
    const validationIssues = await this.validator.getValidationIssues(24);
    
    const criticalIssues: string[] = [];
    const recommendations: string[] = [];
    
    // Check false positive rate
    if (testResults.falsePositiveRate > 0.05) {
      criticalIssues.push(`False positive rate (${(testResults.falsePositiveRate * 100).toFixed(1)}%) exceeds 5% threshold`);
      recommendations.push('Improve pattern specificity and contextual validation');
    }
    
    // Check accuracy
    if (testResults.precision < 0.85) {
      criticalIssues.push(`Precision (${(testResults.precision * 100).toFixed(1)}%) below 85% threshold`);
      recommendations.push('Enhance pattern accuracy with better linguistic analysis');
    }
    
    // Check validation coverage
    const validationRate = accuracyMetrics.validationRate;
    if (validationRate < 0.95) {
      criticalIssues.push(`Validation coverage (${(validationRate * 100).toFixed(1)}%) below 95% threshold`);
      recommendations.push('Ensure all patterns are validated before production use');
    }
    
    // Check critical validation issues
    if (validationIssues.criticalIssues > 0) {
      criticalIssues.push(`${validationIssues.criticalIssues} critical validation issues detected`);
      recommendations.push('Resolve critical validation issues before deployment');
    }
    
    const readinessScore = this.calculateReadinessScore(testResults, accuracyMetrics, validationIssues);
    const isReady = criticalIssues.length === 0 && readinessScore >= 0.85;
    
    return {
      isReady,
      readinessScore,
      criticalIssues,
      recommendations,
      metrics: {
        accuracy: testResults.f1Score,
        falsePositiveRate: testResults.falsePositiveRate,
        validationCoverage: validationRate,
        qualityScore: readinessScore
      }
    };
  }

  // Private implementation methods

  private async createRawCommitment(
    message: Message, 
    match: RegExpMatchArray, 
    patternConfig: any, 
    context: ConversationContext
  ): Promise<EnhancedCommitment> {
    const commitmentText = match[1] || match[0];
    const timeframeText = match[2];
    
    // Calculate base confidence with boosts/penalties
    let confidence = patternConfig.baseConfidence;
    
    // Apply boost factors
    if (patternConfig.boostFactors) {
      confidence += this.calculateBoosts(commitmentText, patternConfig.boostFactors);
    }
    
    // Apply penalty factors
    if (patternConfig.penaltyFactors) {
      confidence += this.calculatePenalties(commitmentText, patternConfig.penaltyFactors);
    }
    
    // Extract action items
    const actionItems = this.extractActionItems(commitmentText);
    
    // Analyze urgency
    const urgencyLevel = this.analyzeUrgency(match[0], context);
    
    // Parse timeframe
    const timeframe = timeframeText ? this.parseTimeframe(timeframeText) : undefined;
    
    // Analyze contextual factors
    const contextualFactors = this.analyzeContextualFactors(context, commitmentText);
    
    return {
      id: this.generateId(),
      message,
      commitmentText: commitmentText.trim(),
      commitmentType: this.mapPatternTypeToCommitmentType(patternConfig.type),
      confidence: Math.max(0, Math.min(1, confidence)),
      validatedConfidence: confidence, // Will be updated by validation
      urgencyLevel,
      timeframe,
      actionItems,
      contextualFactors,
      validationResult: {
        isValid: true, // Will be updated by validation
        falsePositiveRisk: 0,
        issues: [],
        qualityScore: confidence
      },
      extractedAt: Date.now()
    };
  }

  private async createRawQuestion(
    message: Message,
    match: RegExpMatchArray,
    patternConfig: any,
    context: ConversationContext
  ): Promise<EnhancedQuestion> {
    const questionText = match[0];
    const subject = match[1] || this.extractQuestionSubject(questionText);
    
    const confidence = patternConfig.baseConfidence;
    const complexity = this.analyzeQuestionComplexity(questionText);
    const urgencyIndicators = this.extractUrgencyIndicators(questionText);
    const intentClassification = this.classifyQuestionIntent(questionText, patternConfig.type);
    const semanticFeatures = this.extractSemanticFeatures(questionText);
    
    return {
      id: this.generateId(),
      message,
      questionText: questionText.trim(),
      questionType: patternConfig.type,
      confidence,
      validatedConfidence: confidence, // Will be updated by validation
      subject: subject.trim(),
      complexity,
      urgencyIndicators,
      contextualRelevance: this.calculateContextualRelevance(context, questionText),
      intentClassification,
      semanticFeatures,
      validationResult: {
        isValid: true, // Will be updated by validation
        qualityScore: confidence,
        ambiguityRisk: 0
      },
      extractedAt: Date.now()
    };
  }

  private async buildConversationContext(message: Message, allMessages: Message[]): Promise<ConversationContext> {
    // Get previous messages for context
    const messageIndex = allMessages.findIndex(m => m.id === message.id);
    const previousMessages = allMessages.slice(Math.max(0, messageIndex - 3), messageIndex)
      .map(m => m.content);
    
    // Analyze semantic context
    const semanticContext = await this.analyzeSemanticContext(message, previousMessages);
    
    // Analyze temporal context
    const temporalContext = this.analyzeTemporalContext(message.content);
    
    return {
      previousMessages,
      currentTopic: this.extractCurrentTopic(message, previousMessages),
      userRole: message.role,
      conversationStage: this.determineConversationStage(messageIndex, allMessages.length),
      semanticContext,
      temporalContext
    };
  }

  private createMinimalContext(message: Message): ConversationContext {
    return {
      previousMessages: [],
      currentTopic: 'general',
      userRole: message.role,
      conversationStage: 'development',
      semanticContext: {
        entities: [],
        topics: [],
        sentiment: { polarity: 0, confidence: 0.5 },
        intentFlow: [],
        hypotheticalIndicators: this.detectHypotheticalLanguage(message.content)
      },
      temporalContext: {
        timeReferences: [],
        sequenceIndicators: [],
        conditionalMarkers: []
      }
    };
  }

  private extractLinguisticFeatures(text: string, position: number): LinguisticFeatures {
    // Implementation would extract linguistic features around the match position
    // For now, returning basic analysis
    return {
      sentenceType: 'declarative',
      modalVerbs: this.extractModalVerbs(text),
      certaintyMarkers: this.extractCertaintyMarkers(text),
      hedgingLanguage: this.extractHedgingLanguage(text),
      intensifiers: [],
      negationMarkers: this.extractNegationMarkers(text),
      conditionalMarkers: this.extractConditionalMarkers(text),
      temporalMarkers: this.extractTemporalMarkers(text)
    };
  }

  private calculateBoosts(text: string, boostFactors: any): number {
    let boost = 0;
    
    if (boostFactors.actionVerbs) {
      const actionVerbs = ['check', 'update', 'review', 'send', 'create', 'fix', 'investigate', 'analyze'];
      if (actionVerbs.some(verb => text.toLowerCase().includes(verb))) {
        boost += boostFactors.actionVerbs;
      }
    }
    
    if (boostFactors.timeSpecificity) {
      const timePatterns = /\b(?:today|tomorrow|this week|by friday|within \d+ days)\b/gi;
      if (timePatterns.test(text)) {
        boost += boostFactors.timeSpecificity;
      }
    }
    
    if (boostFactors.certaintyMarkers) {
      const certaintyWords = ['definitely', 'certainly', 'absolutely', 'guarantee'];
      if (certaintyWords.some(word => text.toLowerCase().includes(word))) {
        boost += boostFactors.certaintyMarkers;
      }
    }
    
    return boost;
  }

  private calculatePenalties(text: string, penaltyFactors: any): number {
    let penalty = 0;
    
    if (penaltyFactors.hedging) {
      const hedgeWords = ['maybe', 'perhaps', 'possibly', 'probably', 'might'];
      if (hedgeWords.some(word => text.toLowerCase().includes(word))) {
        penalty += penaltyFactors.hedging;
      }
    }
    
    if (penaltyFactors.uncertainty) {
      const uncertaintyWords = ['uncertain', 'not sure', 'unclear', 'unsure'];
      if (uncertaintyWords.some(word => text.toLowerCase().includes(word))) {
        penalty += penaltyFactors.uncertainty;
      }
    }
    
    if (penaltyFactors.conditionals) {
      const conditionalWords = ['if', 'unless', 'provided', 'assuming'];
      if (conditionalWords.some(word => text.toLowerCase().includes(word))) {
        penalty += penaltyFactors.conditionals;
      }
    }
    
    return penalty;
  }

  private extractActionItems(text: string): Array<{ action: string; specificity: 'vague' | 'specific' | 'detailed'; confidence: number }> {
    const actionItems = [];
    const actionVerbs = ['check', 'update', 'review', 'send', 'create', 'fix', 'investigate', 'analyze', 'implement', 'test'];
    
    for (const verb of actionVerbs) {
      if (text.toLowerCase().includes(verb)) {
        // Extract action phrase around the verb
        const verbIndex = text.toLowerCase().indexOf(verb);
        const actionPhrase = text.substring(Math.max(0, verbIndex - 10), verbIndex + 30).trim();
        
        const specificity = this.determineActionSpecificity(actionPhrase);
        const confidence = specificity === 'detailed' ? 0.9 : specificity === 'specific' ? 0.7 : 0.5;
        
        actionItems.push({
          action: actionPhrase,
          specificity,
          confidence
        });
      }
    }
    
    return actionItems;
  }

  private analyzeUrgency(text: string, context: ConversationContext): 'low' | 'medium' | 'high' | 'critical' {
    const criticalMarkers = ['urgent', 'emergency', 'critical', 'asap', 'immediately'];
    const highMarkers = ['soon', 'quickly', 'priority', 'today', 'this morning'];
    const mediumMarkers = ['this week', 'when possible', 'by end of week'];
    
    const lowerText = text.toLowerCase();
    
    if (criticalMarkers.some(marker => lowerText.includes(marker))) return 'critical';
    if (highMarkers.some(marker => lowerText.includes(marker))) return 'high';
    if (mediumMarkers.some(marker => lowerText.includes(marker))) return 'medium';
    
    return 'low';
  }

  private parseTimeframe(timeframeText: string): { type: 'absolute' | 'relative'; value: string; estimatedDays?: number; confidence: number } {
    const text = timeframeText.toLowerCase().trim();
    
    // Absolute dates
    const absolutePatterns = [
      { pattern: /\b(today)\b/, days: 0, confidence: 0.95 },
      { pattern: /\b(tomorrow)\b/, days: 1, confidence: 0.95 },
      { pattern: /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/, days: 3, confidence: 0.8 },
    ];
    
    // Relative dates
    const relativePatterns = [
      { pattern: /\b(\d+)\s*(hours?)\b/, days: 0.1, confidence: 0.9 },
      { pattern: /\b(\d+)\s*(days?)\b/, multiplier: true, confidence: 0.9 },
      { pattern: /\b(\d+)\s*(weeks?)\b/, multiplier: 7, confidence: 0.85 },
    ];
    
    for (const { pattern, days, confidence } of absolutePatterns) {
      if (pattern.test(text)) {
        return {
          type: 'absolute',
          value: timeframeText,
          estimatedDays: days,
          confidence
        };
      }
    }
    
    for (const { pattern, days, multiplier, confidence } of relativePatterns) {
      const match = text.match(pattern);
      if (match) {
        const number = parseInt(match[1]) || 1;
        return {
          type: 'relative',
          value: timeframeText,
          estimatedDays: multiplier === true ? number : typeof multiplier === 'number' ? number * multiplier : days,
          confidence
        };
      }
    }
    
    return {
      type: 'relative',
      value: timeframeText,
      confidence: 0.5
    };
  }

  private analyzeContextualFactors(context: ConversationContext, text: string) {
    return {
      conversationStage: context.conversationStage,
      topicRelevance: this.calculateTopicRelevance(context, text),
      hypotheticalRisk: context.semanticContext.hypotheticalIndicators ? 0.8 : 0.1,
      linguisticCertainty: this.calculateLinguisticCertainty(text)
    };
  }

  private calculateTopicRelevance(context: ConversationContext, text: string): number {
    if (context.semanticContext.topics.length === 0) return 0.5;
    
    const topicWords = context.semanticContext.topics.flatMap(t => t.name.split(' '));
    const textWords = text.toLowerCase().split(/\s+/);
    
    const overlap = topicWords.filter(word => textWords.includes(word.toLowerCase())).length;
    return Math.min(1, overlap / Math.max(1, topicWords.length));
  }

  private calculateLinguisticCertainty(text: string): number {
    const certaintyMarkers = ['will', 'shall', 'definitely', 'certainly', 'absolutely'];
    const uncertaintyMarkers = ['might', 'could', 'maybe', 'perhaps', 'possibly'];
    
    const lowerText = text.toLowerCase();
    const certaintyCount = certaintyMarkers.filter(marker => lowerText.includes(marker)).length;
    const uncertaintyCount = uncertaintyMarkers.filter(marker => lowerText.includes(marker)).length;
    
    return Math.max(0, Math.min(1, 0.5 + (certaintyCount * 0.2) - (uncertaintyCount * 0.15)));
  }

  private mapPatternTypeToCommitmentType(patternType: string): 'promise' | 'deadline' | 'action' | 'deliverable' | 'investigation' {
    const mapping = {
      'promise': 'promise' as const,
      'action': 'action' as const,
      'deliverable': 'deliverable' as const,
      'investigation': 'investigation' as const,
      'deadline': 'deadline' as const
    };
    
    return mapping[patternType as keyof typeof mapping] || 'action';
  }

  private determineActionSpecificity(actionPhrase: string): 'vague' | 'specific' | 'detailed' {
    if (actionPhrase.length < 15) return 'vague';
    if (actionPhrase.length > 40) return 'detailed';
    return 'specific';
  }

  private extractQuestionSubject(questionText: string): string {
    // Extract the main subject of the question
    const words = questionText.split(/\s+/);
    const contentWords = words.filter(word => 
      !['what', 'how', 'when', 'where', 'why', 'who', 'which', 'is', 'are', 'do', 'does', 'can', 'could', 'would', 'should'].includes(word.toLowerCase())
    );
    
    return contentWords.slice(0, 5).join(' ') || 'general';
  }

  private analyzeQuestionComplexity(questionText: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = questionText.split(/\s+/).length;
    const hasMultipleClauses = (questionText.match(/,/g) || []).length >= 2;
    const hasSubQuestions = questionText.includes('?') && (questionText.match(/\?/g) || []).length > 1;
    
    if (wordCount > 20 || hasMultipleClauses || hasSubQuestions) return 'complex';
    if (wordCount > 8) return 'moderate';
    return 'simple';
  }

  private extractUrgencyIndicators(text: string): string[] {
    const urgencyWords = ['urgent', 'quickly', 'asap', 'immediately', 'soon', 'fast', 'right away'];
    return urgencyWords.filter(word => text.toLowerCase().includes(word));
  }

  private classifyQuestionIntent(text: string, baseType: string): { primary: string; secondary?: string; confidence: number } {
    const intentPatterns = {
      'information_seeking': /\b(?:what|who|when|where)\b/gi,
      'procedure_request': /\b(?:how|steps|process|method)\b/gi,
      'explanation_request': /\b(?:why|explain|describe|clarify)\b/gi,
      'opinion_seeking': /\b(?:think|opinion|recommend|suggest)\b/gi,
      'confirmation_seeking': /\b(?:is|are|do|does|did|can|could)\b/gi
    };
    
    for (const [intent, pattern] of Object.entries(intentPatterns)) {
      if (pattern.test(text)) {
        return {
          primary: intent,
          confidence: 0.8
        };
      }
    }
    
    return {
      primary: baseType,
      confidence: 0.6
    };
  }

  private extractSemanticFeatures(text: string) {
    // Simplified semantic feature extraction
    const words = text.toLowerCase().split(/\s+/);
    const entities = words.filter(word => word.length > 4 && /^[A-Z]/.test(word));
    const concepts = words.filter(word => ['system', 'process', 'method', 'approach', 'technique'].includes(word));
    
    return {
      entities,
      concepts,
      relationships: []
    };
  }

  private calculateContextualRelevance(context: ConversationContext, text: string): number {
    // Simplified contextual relevance calculation
    return 0.7; // Placeholder
  }

  // Additional helper methods for context analysis
  private async analyzeSemanticContext(message: Message, previousMessages: string[]): Promise<SemanticContext> {
    return {
      entities: [],
      topics: [{ name: 'general', relevance: 0.5 }],
      sentiment: { polarity: 0, confidence: 0.5 },
      intentFlow: [],
      hypotheticalIndicators: this.detectHypotheticalLanguage(message.content)
    };
  }

  private analyzeTemporalContext(content: string): TemporalContext {
    const timeReferences = this.extractTimeReferences(content);
    const sequenceIndicators = this.extractSequenceIndicators(content);
    const conditionalMarkers = this.extractConditionalMarkers(content);
    
    return {
      timeReferences,
      sequenceIndicators,
      conditionalMarkers
    };
  }

  private extractCurrentTopic(message: Message, previousMessages: string[]): string {
    // Simplified topic extraction
    return 'general';
  }

  private determineConversationStage(messageIndex: number, totalMessages: number): 'opening' | 'development' | 'resolution' | 'closing' {
    const ratio = messageIndex / Math.max(1, totalMessages);
    if (ratio < 0.2) return 'opening';
    if (ratio < 0.8) return 'development';
    if (ratio < 0.95) return 'resolution';
    return 'closing';
  }

  private detectHypotheticalLanguage(text: string): boolean {
    const hypotheticalMarkers = ['if', 'suppose', 'imagine', 'what if', 'hypothetically', 'theoretically'];
    return hypotheticalMarkers.some(marker => text.toLowerCase().includes(marker));
  }

  private extractTimeReferences(content: string): Array<{ text: string; type: 'absolute' | 'relative'; confidence: number }> {
    const timePatterns = [
      { pattern: /\b(?:today|tomorrow|yesterday)\b/gi, type: 'absolute' as const, confidence: 0.9 },
      { pattern: /\b(?:next|last|this)\s+(?:week|month|year)\b/gi, type: 'relative' as const, confidence: 0.8 },
      { pattern: /\bin\s+\d+\s+(?:minutes?|hours?|days?|weeks?)\b/gi, type: 'relative' as const, confidence: 0.85 }
    ];
    
    const references = [];
    for (const { pattern, type, confidence } of timePatterns) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        references.push({
          text: match[0],
          type,
          confidence
        });
      }
    }
    
    return references;
  }

  private extractSequenceIndicators(content: string): string[] {
    const sequenceWords = ['first', 'then', 'next', 'finally', 'after', 'before', 'meanwhile', 'subsequently'];
    return sequenceWords.filter(word => content.toLowerCase().includes(word));
  }

  private extractModalVerbs(text: string): string[] {
    const modals = ['will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must'];
    const words = text.toLowerCase().split(/\s+/);
    return words.filter(word => modals.includes(word));
  }

  private extractCertaintyMarkers(text: string): string[] {
    const certaintyWords = ['definitely', 'certainly', 'absolutely', 'guarantee', 'promise', 'commit'];
    return certaintyWords.filter(word => text.toLowerCase().includes(word));
  }

  private extractHedgingLanguage(text: string): string[] {
    const hedgeWords = ['maybe', 'perhaps', 'possibly', 'probably', 'likely', 'sort of', 'kind of'];
    return hedgeWords.filter(word => text.toLowerCase().includes(word));
  }

  private extractNegationMarkers(text: string): string[] {
    const negationWords = ['not', 'never', 'no', "won't", "can't", "don't", 'unable', 'impossible'];
    return negationWords.filter(word => text.toLowerCase().includes(word));
  }

  private extractConditionalMarkers(text: string): string[] {
    const conditionalWords = ['if', 'unless', 'provided', 'assuming', 'given', 'when'];
    return conditionalWords.filter(word => text.toLowerCase().includes(word));
  }

  private extractTemporalMarkers(text: string): string[] {
    const temporalWords = ['now', 'soon', 'later', 'eventually', 'immediately', 'shortly', 'presently'];
    return temporalWords.filter(word => text.toLowerCase().includes(word));
  }

  private calculateQualityScore(validationResult: any): number {
    // Calculate overall quality score from validation result
    let score = validationResult.confidence;
    
    // Penalty for high false positive risk
    score -= validationResult.falsePositiveRisk * 0.5;
    
    // Bonus for high contextual score
    score += validationResult.contextualScore * 0.2;
    
    // Penalty for issues
    const issueCount = validationResult.issues.length;
    score -= issueCount * 0.1;
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateAmbiguityRisk(validationResult: any): number {
    // Calculate risk of ambiguous interpretation
    let risk = 0.1; // Base risk
    
    // Higher risk for low linguistic score
    if (validationResult.linguisticScore < 0.5) {
      risk += 0.2;
    }
    
    // Higher risk if issues present
    const ambiguityIssues = validationResult.issues.filter((issue: any) => 
      issue.type === 'ambiguity'
    ).length;
    
    risk += ambiguityIssues * 0.15;
    
    return Math.min(1, risk);
  }

  private generateQualityRecommendations(
    testResults: any,
    qualityDistribution: any,
    commonIssues: any[]
  ): string[] {
    const recommendations = [];
    
    if (testResults.falsePositiveRate > 0.05) {
      recommendations.push('Reduce false positive rate by improving contextual validation');
    }
    
    if (testResults.precision < 0.85) {
      recommendations.push('Enhance pattern specificity to improve precision');
    }
    
    if (qualityDistribution.low > qualityDistribution.high) {
      recommendations.push('Focus on improving low-quality pattern detection');
    }
    
    if (commonIssues.length > 0) {
      const topIssue = commonIssues[0];
      recommendations.push(`Address most common issue: ${topIssue.issue}`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Pattern quality is within acceptable parameters');
    }
    
    return recommendations;
  }

  private calculateReadinessScore(testResults: any, accuracyMetrics: any, validationIssues: any): number {
    let score = 1.0;
    
    // Accuracy component (40% weight)
    score *= 0.6 + (testResults.f1Score * 0.4);
    
    // False positive penalty (30% weight)
    const fpPenalty = Math.min(1, testResults.falsePositiveRate / 0.05); // Normalize to 5% threshold
    score *= 0.7 + (0.3 * (1 - fpPenalty));
    
    // Validation coverage (20% weight)
    score *= 0.8 + (accuracyMetrics.validationRate * 0.2);
    
    // Critical issues penalty (10% weight)
    const criticalPenalty = Math.min(1, validationIssues.criticalIssues / 10); // Normalize to 10 issues
    score *= 0.9 + (0.1 * (1 - criticalPenalty));
    
    return Math.max(0, Math.min(1, score));
  }

  private async initializePatternTables(): Promise<void> {
    // Create tables for enhanced pattern storage
    this.executeStatement(
      'create_enhanced_commitments_table',
      `CREATE TABLE IF NOT EXISTS enhanced_commitments (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        commitment_text TEXT NOT NULL,
        commitment_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        validated_confidence REAL NOT NULL,
        urgency_level TEXT NOT NULL,
        timeframe TEXT,
        action_items TEXT,
        contextual_factors TEXT,
        validation_result TEXT,
        extracted_at INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id)
      )`
    );

    this.executeStatement(
      'create_enhanced_questions_table',
      `CREATE TABLE IF NOT EXISTS enhanced_questions (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        question_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        validated_confidence REAL NOT NULL,
        subject TEXT NOT NULL,
        complexity TEXT NOT NULL,
        urgency_indicators TEXT,
        contextual_relevance REAL NOT NULL,
        intent_classification TEXT,
        semantic_features TEXT,
        validation_result TEXT,
        extracted_at INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id)
      )`
    );

    this.executeStatement(
      'create_quality_reports_table',
      `CREATE TABLE IF NOT EXISTS pattern_quality_reports (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        total_patterns INTEGER NOT NULL,
        validated_patterns INTEGER NOT NULL,
        quality_distribution TEXT NOT NULL,
        accuracy_metrics TEXT NOT NULL,
        common_issues TEXT NOT NULL,
        recommendations TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  }

  private async storeQualityReport(report: PatternQualityReport): Promise<void> {
    this.executeStatement(
      'store_quality_report',
      `INSERT INTO pattern_quality_reports 
       (id, timestamp, total_patterns, validated_patterns, quality_distribution,
        accuracy_metrics, common_issues, recommendations)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.generateId(),
        report.timestamp,
        report.totalPatterns,
        report.validatedPatterns,
        JSON.stringify(report.qualityDistribution),
        JSON.stringify(report.accuracyMetrics),
        JSON.stringify(report.commonIssues),
        JSON.stringify(report.recommendations)
      ]
    );
  }
}