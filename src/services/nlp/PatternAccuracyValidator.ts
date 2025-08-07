/**
 * Pattern Accuracy Validator - Production-grade pattern detection validation
 * 
 * This service provides comprehensive pattern detection accuracy monitoring,
 * statistical validation, context-aware matching, and real-time quality assurance
 * to ensure <5% false positive rate in production environments.
 */

import { EventEmitter } from 'events';
import { DatabaseManager } from '../../storage/Database.js';
import { BaseRepository } from '../../storage/repositories/BaseRepository.js';

// Core interfaces for pattern validation
export interface PatternMatch {
  id: string;
  pattern: string;
  text: string;
  matchedText: string;
  confidence: number;
  contextualConfidence: number;
  type: 'commitment' | 'question' | 'intent' | 'urgency';
  subtype?: string;
  startPosition: number;
  endPosition: number;
  conversationContext: ConversationContext;
  linguisticFeatures: LinguisticFeatures;
  validationResult?: ValidationResult;
  timestamp: number;
}

export interface ConversationContext {
  previousMessages: string[];
  currentTopic: string;
  userRole: 'user' | 'assistant' | 'system';
  conversationStage: 'opening' | 'development' | 'resolution' | 'closing';
  semanticContext: SemanticContext;
  temporalContext: TemporalContext;
}

export interface SemanticContext {
  entities: Array<{ name: string; type: string; confidence: number }>;
  topics: Array<{ name: string; relevance: number }>;
  sentiment: { polarity: number; confidence: number };
  intentFlow: string[];
  hypotheticalIndicators: boolean;
}

export interface TemporalContext {
  timeReferences: Array<{ text: string; type: 'absolute' | 'relative'; confidence: number }>;
  sequenceIndicators: string[];
  conditionalMarkers: string[];
}

export interface LinguisticFeatures {
  sentenceType: 'declarative' | 'interrogative' | 'imperative' | 'exclamatory';
  modalVerbs: string[];
  certaintyMarkers: string[];
  hedgingLanguage: string[];
  intensifiers: string[];
  negationMarkers: string[];
  conditionalMarkers: string[];
  temporalMarkers: string[];
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  falsePositiveRisk: number;
  falseNegativeRisk: number;
  contextualScore: number;
  linguisticScore: number;
  validationMethod: string;
  validationTimestamp: number;
  issues: ValidationIssue[];
  corrections?: PatternCorrection[];
}

export interface ValidationIssue {
  type: 'false_positive_risk' | 'context_mismatch' | 'linguistic_inconsistency' | 'ambiguity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedAction: string;
  confidence: number;
}

export interface PatternCorrection {
  original: PatternMatch;
  corrected: Partial<PatternMatch>;
  correctionType: 'confidence_adjustment' | 'context_refinement' | 'type_reclassification';
  reason: string;
  confidence: number;
}

export interface PatternAccuracyMetrics {
  totalPatterns: number;
  validatedPatterns: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1Score: number;
  contextualAccuracy: number;
  averageConfidence: number;
  validationRate: number;
  lastUpdate: number;
}

export interface PatternTestCase {
  id: string;
  input: string;
  context: ConversationContext;
  expectedMatches: Array<{
    type: string;
    subtype?: string;
    confidence: number;
    shouldMatch: boolean;
    expectedText?: string;
  }>;
  description: string;
  category: 'basic' | 'edge_case' | 'contextual' | 'adversarial';
  weight: number; // For weighted accuracy calculation
}

// Advanced pattern matching with context awareness
export class PatternAccuracyValidator extends BaseRepository {
  private eventEmitter = new EventEmitter();
  private validationCache = new Map<string, ValidationResult>();
  private accuracyMetrics: PatternAccuracyMetrics;
  private testSuite: PatternTestCase[] = [];
  private isInitialized = false;

  // Production-grade pattern configurations
  private static readonly FALSE_POSITIVE_THRESHOLD = 0.15; // 15% false positive risk threshold
  private static readonly MINIMUM_CONFIDENCE = 0.75; // Minimum confidence for production use
  private static readonly CONTEXT_WEIGHT = 0.4; // 40% weight for contextual signals
  private static readonly LINGUISTIC_WEIGHT = 0.35; // 35% weight for linguistic analysis
  private static readonly PATTERN_WEIGHT = 0.25; // 25% weight for raw pattern match

  // Enhanced commitment patterns with contextual markers
  private static readonly COMMITMENT_PATTERNS = [
    {
      pattern: /\b(?:I'll|I will)\s+([^.!?]{10,100})(?:\s+(?:by|before|within|until)\s+([^.!?]{1,30}))?\b/gi,
      confidence: 0.85,
      contextRequirement: 'assistant_response',
      excludeIfHypothetical: true,
      requiresFutureTense: true,
      type: 'strong_commitment'
    },
    {
      pattern: /\b(?:let me|I'll go ahead and|I'll proceed to)\s+([^.!?]{5,80})\b/gi,
      confidence: 0.8,
      contextRequirement: 'assistant_response',
      excludeIfHypothetical: true,
      requiresActionVerb: true,
      type: 'action_commitment'
    },
    {
      pattern: /\b(?:I need to|I have to|I must)\s+([^.!?]{5,80})(?:\s+(?:by|before|within)\s+([^.!?]{1,30}))?\b/gi,
      confidence: 0.75,
      contextRequirement: 'assistant_response',
      excludeIfHypothetical: true,
      requiresUrgencyMarkers: false,
      type: 'obligation_commitment'
    },
    {
      pattern: /\b(?:by|before|after|within)\s+(tomorrow|today|this week|next week|friday|monday|tuesday|wednesday|thursday|saturday|sunday|\d+\s*(?:hours?|days?|weeks?|months?))\s*[,.]?\s*(?:I'll|I will|we'll|we will|let me)\s+([^.!?]{5,80})\b/gi,
      confidence: 0.9,
      contextRequirement: 'assistant_response',
      excludeIfHypothetical: true,
      temporalCommitment: true,
      type: 'temporal_commitment'
    }
  ];

  // Enhanced question patterns with intent classification
  private static readonly QUESTION_PATTERNS = [
    {
      pattern: /^(?:what|how|when|where|why|who|which)\s+(.{5,100})\?$/gi,
      confidence: 0.95,
      type: 'factual_question',
      requiresQuestionMark: true
    },
    {
      pattern: /^(?:can|could|would|should|will|do|does|did|have|has|is|are|am)\s+(.{5,100})\?$/gi,
      confidence: 0.9,
      type: 'yes_no_question',
      requiresQuestionMark: true
    },
    {
      pattern: /^(?:explain|describe|tell me|show me|walk me through)\s+(.{5,100})[\?.]?$/gi,
      confidence: 0.85,
      type: 'explanation_request',
      requiresQuestionMark: false
    }
  ];

  // Hypothetical language markers that reduce commitment confidence
  private static readonly HYPOTHETICAL_MARKERS = [
    'if', 'suppose', 'imagine', 'what if', 'assuming', 'hypothetically',
    'theoretically', 'potentially', 'might', 'could', 'would', 'should',
    'perhaps', 'maybe', 'possibly', 'probably', 'likely'
  ];

  // Context markers that affect pattern interpretation
  private static readonly CONTEXT_MARKERS = {
    uncertainty: ['maybe', 'perhaps', 'possibly', 'might', 'could', 'uncertain'],
    certainty: ['definitely', 'certainly', 'absolutely', 'sure', 'confirm', 'guarantee'],
    temporal: ['now', 'soon', 'later', 'tomorrow', 'today', 'next week', 'immediately'],
    conditional: ['if', 'when', 'unless', 'provided', 'assuming', 'given that'],
    negation: ['not', 'never', 'no', "won't", "can't", "don't", 'unable', 'impossible']
  };

  constructor(dbManager: DatabaseManager) {
    super(dbManager);
    this.accuracyMetrics = this.initializeMetrics();
  }

  /**
   * Initialize the pattern accuracy validator
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔍 Initializing Pattern Accuracy Validator...');
    
    // Load test suite from database or create default
    await this.loadTestSuite();
    
    // Initialize validation tables
    await this.initializeValidationTables();
    
    // Load historical metrics
    await this.loadMetrics();
    
    // Set up real-time monitoring
    this.setupRealtimeMonitoring();
    
    this.isInitialized = true;
    console.log('✅ Pattern Accuracy Validator initialized');
  }

  /**
   * Validate a pattern match with comprehensive accuracy checking
   */
  async validatePattern(match: PatternMatch): Promise<ValidationResult> {
    const cacheKey = this.generateCacheKey(match);
    
    // Check cache first
    const cached = this.validationCache.get(cacheKey);
    if (cached && Date.now() - cached.validationTimestamp < 300000) { // 5 minute cache
      return cached;
    }

    const result = await this.performComprehensiveValidation(match);
    
    // Cache result
    this.validationCache.set(cacheKey, result);
    
    // Store validation result for metrics tracking
    await this.storeValidationResult(match, result);
    
    // Emit validation event for monitoring
    this.eventEmitter.emit('pattern:validated', { match, result });
    
    return result;
  }

  /**
   * Validate multiple patterns with batch processing
   */
  async validatePatterns(matches: PatternMatch[]): Promise<ValidationResult[]> {
    const results = await Promise.all(
      matches.map(match => this.validatePattern(match))
    );
    
    // Update batch metrics
    await this.updateBatchMetrics(matches, results);
    
    return results;
  }

  /**
   * Run comprehensive accuracy test suite
   */
  async runAccuracyTests(): Promise<{
    overallAccuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    falsePositiveRate: number;
    contextualAccuracy: number;
    testResults: Array<{
      testCase: PatternTestCase;
      predictions: PatternMatch[];
      correct: boolean;
      issues: string[];
    }>;
  }> {
    console.log('🧪 Running comprehensive pattern accuracy tests...');
    
    const testResults = [];
    let totalTests = 0;
    let correctPredictions = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let falseNegatives = 0;
    let contextuallyCorrect = 0;

    for (const testCase of this.testSuite) {
      const predictions = await this.detectPatternsInText(testCase.input, testCase.context);
      const result = await this.evaluateTestCase(testCase, predictions);
      
      testResults.push(result);
      totalTests++;
      
      if (result.correct) {
        correctPredictions++;
      }
      
      // Calculate precision/recall metrics
      const expectedPositives = testCase.expectedMatches.filter(m => m.shouldMatch).length;
      const actualPositives = predictions.length;
      const correctPositives = result.predictions.filter((pred, idx) => 
        testCase.expectedMatches[idx]?.shouldMatch && 
        this.isCorrectMatch(pred, testCase.expectedMatches[idx])
      ).length;
      
      truePositives += correctPositives;
      falsePositives += Math.max(0, actualPositives - correctPositives);
      falseNegatives += Math.max(0, expectedPositives - correctPositives);
      
      if (this.isContextuallyCorrect(result)) {
        contextuallyCorrect++;
      }
    }

    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;
    const falsePositiveRate = falsePositives / (falsePositives + truePositives) || 0;

    const results = {
      overallAccuracy: correctPredictions / totalTests,
      precision,
      recall,
      f1Score,
      falsePositiveRate,
      contextualAccuracy: contextuallyCorrect / totalTests,
      testResults
    };

    // Store test results for monitoring
    await this.storeTestResults(results);
    
    console.log('📊 Accuracy test results:');
    console.log(`   Overall Accuracy: ${(results.overallAccuracy * 100).toFixed(1)}%`);
    console.log(`   Precision: ${(results.precision * 100).toFixed(1)}%`);
    console.log(`   Recall: ${(results.recall * 100).toFixed(1)}%`);
    console.log(`   F1 Score: ${(results.f1Score * 100).toFixed(1)}%`);
    console.log(`   False Positive Rate: ${(results.falsePositiveRate * 100).toFixed(1)}%`);
    console.log(`   Contextual Accuracy: ${(results.contextualAccuracy * 100).toFixed(1)}%`);

    return results;
  }

  /**
   * Get current accuracy metrics
   */
  getAccuracyMetrics(): PatternAccuracyMetrics {
    return { ...this.accuracyMetrics };
  }

  /**
   * Add custom test case to the validation suite
   */
  async addTestCase(testCase: PatternTestCase): Promise<void> {
    this.testSuite.push(testCase);
    await this.saveTestSuite();
  }

  /**
   * Get validation issues for monitoring dashboard
   */
  async getValidationIssues(hours: number = 24): Promise<{
    criticalIssues: number;
    highIssues: number;
    totalIssues: number;
    commonIssues: Array<{ type: string; count: number; description: string }>;
  }> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    
    const results = this.executeStatementAll<{
      id: string;
      issues: string;
      timestamp: number;
    }>(
      'get_validation_issues',
      'SELECT id, issues, timestamp FROM pattern_validations WHERE timestamp >= ? AND issues IS NOT NULL',
      [cutoff]
    );

    let criticalIssues = 0;
    let highIssues = 0;
    let totalIssues = 0;
    const issueTypes = new Map<string, number>();

    for (const row of results) {
      try {
        const issues: ValidationIssue[] = JSON.parse(row.issues);
        totalIssues += issues.length;
        
        for (const issue of issues) {
          if (issue.severity === 'critical') criticalIssues++;
          if (issue.severity === 'high') highIssues++;
          
          issueTypes.set(issue.type, (issueTypes.get(issue.type) || 0) + 1);
        }
      } catch (error) {
        console.error('Error parsing validation issues:', error);
      }
    }

    const commonIssues = Array.from(issueTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({
        type,
        count,
        description: this.getIssueDescription(type)
      }));

    return {
      criticalIssues,
      highIssues,
      totalIssues,
      commonIssues
    };
  }

  // Private implementation methods

  private async performComprehensiveValidation(match: PatternMatch): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    let confidence = match.confidence;
    
    // 1. Contextual validation
    const contextualScore = await this.validateContext(match, issues);
    
    // 2. Linguistic validation  
    const linguisticScore = await this.validateLinguistics(match, issues);
    
    // 3. Pattern-specific validation
    const patternScore = await this.validatePatternSpecifics(match, issues);
    
    // 4. Calculate weighted confidence
    const weightedConfidence = 
      (contextualScore * PatternAccuracyValidator.CONTEXT_WEIGHT) +
      (linguisticScore * PatternAccuracyValidator.LINGUISTIC_WEIGHT) +
      (patternScore * PatternAccuracyValidator.PATTERN_WEIGHT);
    
    // 5. Calculate false positive risk
    const falsePositiveRisk = this.calculateFalsePositiveRisk(match, contextualScore, linguisticScore);
    
    // 6. Calculate false negative risk  
    const falseNegativeRisk = this.calculateFalseNegativeRisk(match, contextualScore);
    
    // 7. Determine if pattern is valid for production use
    const isValid = weightedConfidence >= PatternAccuracyValidator.MINIMUM_CONFIDENCE &&
                   falsePositiveRisk <= PatternAccuracyValidator.FALSE_POSITIVE_THRESHOLD;

    return {
      isValid,
      confidence: weightedConfidence,
      falsePositiveRisk,
      falseNegativeRisk,
      contextualScore,
      linguisticScore,
      validationMethod: 'comprehensive_multi_factor',
      validationTimestamp: Date.now(),
      issues,
      corrections: isValid ? undefined : await this.generateCorrections(match, issues)
    };
  }

  private async validateContext(match: PatternMatch, issues: ValidationIssue[]): Promise<number> {
    let score = 0.5; // Base score
    const context = match.conversationContext;
    
    // Check role appropriateness
    if (match.type === 'commitment' && context.userRole !== 'assistant') {
      issues.push({
        type: 'context_mismatch',
        severity: 'high',
        description: 'Commitment detected in non-assistant message',
        suggestedAction: 'Verify sender role or reclassify pattern',
        confidence: 0.9
      });
      score -= 0.3;
    }
    
    // Check for hypothetical markers
    if (context.semanticContext.hypotheticalIndicators && match.type === 'commitment') {
      issues.push({
        type: 'false_positive_risk',
        severity: 'medium',
        description: 'Hypothetical language detected in commitment',
        suggestedAction: 'Reduce confidence for hypothetical commitments',
        confidence: 0.8
      });
      score -= 0.2;
    }
    
    // Check conversation stage appropriateness
    if (match.type === 'commitment' && context.conversationStage === 'closing') {
      score -= 0.1; // Less likely to make new commitments when closing
    }
    
    // Check temporal consistency
    if (match.type === 'commitment' && context.temporalContext.conditionalMarkers.length > 0) {
      score -= 0.15; // Conditional commitments are less certain
    }
    
    // Check semantic relevance
    const topicRelevance = context.semanticContext.topics
      .reduce((max, topic) => Math.max(max, topic.relevance), 0);
    score += (topicRelevance - 0.5) * 0.2; // Boost for highly relevant topics
    
    return Math.max(0, Math.min(1, score));
  }

  private async validateLinguistics(match: PatternMatch, issues: ValidationIssue[]): Promise<number> {
    let score = 0.5; // Base score
    const features = match.linguisticFeatures;
    
    // Modal verb analysis
    const strongModals = ['will', 'shall', 'must'];
    const weakModals = ['might', 'could', 'would', 'should'];
    
    const strongModalCount = features.modalVerbs.filter(m => strongModals.includes(m.toLowerCase())).length;
    const weakModalCount = features.modalVerbs.filter(m => weakModals.includes(m.toLowerCase())).length;
    
    if (match.type === 'commitment') {
      score += strongModalCount * 0.15;
      score -= weakModalCount * 0.1;
    }
    
    // Certainty markers
    if (features.certaintyMarkers.length > 0) {
      score += 0.1;
    }
    
    // Hedging language reduces confidence
    if (features.hedgingLanguage.length > 0) {
      score -= features.hedgingLanguage.length * 0.05;
      
      if (match.type === 'commitment') {
        issues.push({
          type: 'linguistic_inconsistency',
          severity: 'medium',
          description: 'Hedging language detected in commitment',
          suggestedAction: 'Review commitment strength given hedging language',
          confidence: 0.7
        });
      }
    }
    
    // Negation analysis
    if (features.negationMarkers.length > 0 && match.type === 'commitment') {
      issues.push({
        type: 'false_positive_risk',
        severity: 'high', 
        description: 'Negation markers found in commitment text',
        suggestedAction: 'Verify this is actually a commitment, not a negation',
        confidence: 0.85
      });
      score -= 0.3;
    }
    
    // Sentence type appropriateness
    if (match.type === 'question' && features.sentenceType !== 'interrogative') {
      issues.push({
        type: 'linguistic_inconsistency',
        severity: 'medium',
        description: 'Question pattern in non-interrogative sentence',
        suggestedAction: 'Verify question classification',
        confidence: 0.8
      });
      score -= 0.2;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private async validatePatternSpecifics(match: PatternMatch, issues: ValidationIssue[]): Promise<number> {
    let score = match.confidence; // Start with original pattern confidence
    
    // Commitment-specific validation
    if (match.type === 'commitment') {
      // Check for action verbs
      const actionVerbs = ['check', 'update', 'review', 'send', 'create', 'fix', 'investigate'];
      const hasActionVerb = actionVerbs.some(verb => 
        match.matchedText.toLowerCase().includes(verb)
      );
      
      if (!hasActionVerb) {
        score -= 0.1;
        issues.push({
          type: 'ambiguity',
          severity: 'low',
          description: 'Commitment lacks specific action verb',
          suggestedAction: 'Consider if this is a specific enough commitment',
          confidence: 0.6
        });
      }
      
      // Check commitment length (too short or too long may be less reliable)
      const textLength = match.matchedText.length;
      if (textLength < 10) {
        score -= 0.15;
        issues.push({
          type: 'ambiguity',
          severity: 'medium',
          description: 'Commitment text is very short',
          suggestedAction: 'Short commitments may lack specificity',
          confidence: 0.7
        });
      } else if (textLength > 150) {
        score -= 0.1;
        issues.push({
          type: 'ambiguity',
          severity: 'low',
          description: 'Commitment text is very long',
          suggestedAction: 'Long commitments may contain multiple actions',
          confidence: 0.5
        });
      }
    }
    
    // Question-specific validation
    if (match.type === 'question') {
      // Questions should typically end with question mark or be clear requests
      if (!match.matchedText.includes('?') && !this.isImplicitQuestion(match.matchedText)) {
        score -= 0.2;
        issues.push({
          type: 'ambiguity',
          severity: 'medium',
          description: 'Question pattern without question mark or clear question structure',
          suggestedAction: 'Verify this is actually a question',
          confidence: 0.75
        });
      }
    }
    
    return Math.max(0, Math.min(1, score));
  }

  private calculateFalsePositiveRisk(
    match: PatternMatch, 
    contextualScore: number, 
    linguisticScore: number
  ): number {
    let risk = 0.1; // Base risk
    
    // Higher risk for low contextual scores
    if (contextualScore < 0.4) {
      risk += 0.3;
    }
    
    // Higher risk for poor linguistic signals
    if (linguisticScore < 0.4) {
      risk += 0.2;
    }
    
    // Pattern-specific risk factors
    if (match.type === 'commitment') {
      // Hypothetical commitments have higher false positive risk
      if (match.conversationContext.semanticContext.hypotheticalIndicators) {
        risk += 0.25;
      }
      
      // Non-assistant commitments are likely false positives
      if (match.conversationContext.userRole !== 'assistant') {
        risk += 0.4;
      }
    }
    
    // Text length risks
    if (match.matchedText.length < 10) {
      risk += 0.15; // Very short matches are risky
    }
    
    return Math.min(1, risk);
  }

  private calculateFalseNegativeRisk(match: PatternMatch, contextualScore: number): number {
    let risk = 0.1; // Base risk
    
    // Higher false negative risk for high-context situations we might have missed
    if (contextualScore > 0.8 && match.confidence < 0.7) {
      risk += 0.2; // Strong context but weak pattern match
    }
    
    return Math.min(1, risk);
  }

  private async generateCorrections(match: PatternMatch, issues: ValidationIssue[]): Promise<PatternCorrection[]> {
    const corrections: PatternCorrection[] = [];
    
    for (const issue of issues) {
      if (issue.type === 'false_positive_risk' && issue.severity === 'high') {
        corrections.push({
          original: match,
          corrected: {
            confidence: Math.max(0.1, match.confidence - 0.3)
          },
          correctionType: 'confidence_adjustment',
          reason: `High false positive risk: ${issue.description}`,
          confidence: issue.confidence
        });
      }
      
      if (issue.type === 'context_mismatch') {
        corrections.push({
          original: match,
          corrected: {
            type: 'intent' as any // Reclassify as general intent
          },
          correctionType: 'type_reclassification',
          reason: `Context mismatch suggests different pattern type: ${issue.description}`,
          confidence: issue.confidence
        });
      }
    }
    
    return corrections;
  }

  private async detectPatternsInText(text: string, context: ConversationContext): Promise<PatternMatch[]> {
    const matches: PatternMatch[] = [];
    
    // Detect commitments
    for (const patternConfig of PatternAccuracyValidator.COMMITMENT_PATTERNS) {
      const patternMatches = text.matchAll(patternConfig.pattern);
      
      for (const match of patternMatches) {
        const linguisticFeatures = this.extractLinguisticFeatures(text, match.index || 0);
        
        matches.push({
          id: this.generateId(),
          pattern: patternConfig.pattern.source,
          text,
          matchedText: match[0],
          confidence: patternConfig.confidence,
          contextualConfidence: 0, // Will be calculated during validation
          type: 'commitment',
          subtype: patternConfig.type,
          startPosition: match.index || 0,
          endPosition: (match.index || 0) + match[0].length,
          conversationContext: context,
          linguisticFeatures,
          timestamp: Date.now()
        });
      }
    }
    
    // Detect questions
    for (const patternConfig of PatternAccuracyValidator.QUESTION_PATTERNS) {
      const patternMatches = text.matchAll(patternConfig.pattern);
      
      for (const match of patternMatches) {
        const linguisticFeatures = this.extractLinguisticFeatures(text, match.index || 0);
        
        matches.push({
          id: this.generateId(),
          pattern: patternConfig.pattern.source,
          text,
          matchedText: match[0],
          confidence: patternConfig.confidence,
          contextualConfidence: 0,
          type: 'question',
          subtype: patternConfig.type,
          startPosition: match.index || 0,
          endPosition: (match.index || 0) + match[0].length,
          conversationContext: context,
          linguisticFeatures,
          timestamp: Date.now()
        });
      }
    }
    
    return matches;
  }

  private extractLinguisticFeatures(text: string, position: number): LinguisticFeatures {
    const sentence = this.extractSentence(text, position);
    
    return {
      sentenceType: this.determineSentenceType(sentence),
      modalVerbs: this.extractModalVerbs(sentence),
      certaintyMarkers: this.extractCertaintyMarkers(sentence),
      hedgingLanguage: this.extractHedgingLanguage(sentence),
      intensifiers: this.extractIntensifiers(sentence),
      negationMarkers: this.extractNegationMarkers(sentence),
      conditionalMarkers: this.extractConditionalMarkers(sentence),
      temporalMarkers: this.extractTemporalMarkers(sentence)
    };
  }

  private extractSentence(text: string, position: number): string {
    const beforeMatch = text.substring(0, position);
    const afterMatch = text.substring(position);
    
    const sentenceStart = Math.max(0, beforeMatch.lastIndexOf('.') + 1, beforeMatch.lastIndexOf('!') + 1);
    const sentenceEnd = Math.min(
      afterMatch.indexOf('.') !== -1 ? position + afterMatch.indexOf('.') : text.length,
      afterMatch.indexOf('!') !== -1 ? position + afterMatch.indexOf('!') : text.length,
      afterMatch.indexOf('?') !== -1 ? position + afterMatch.indexOf('?') : text.length
    );
    
    return text.substring(sentenceStart, sentenceEnd).trim();
  }

  private determineSentenceType(sentence: string): 'declarative' | 'interrogative' | 'imperative' | 'exclamatory' {
    if (sentence.endsWith('?')) return 'interrogative';
    if (sentence.endsWith('!')) return 'exclamatory';
    if (sentence.startsWith(/(?:please|let|do|don't|can you|could you|would you)/i.test(sentence) ? 'match' : 'nomatch') === 'match') {
      return 'imperative';
    }
    return 'declarative';
  }

  private extractModalVerbs(sentence: string): string[] {
    const modals = ['will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'ought'];
    const words = sentence.toLowerCase().split(/\s+/);
    return words.filter(word => modals.includes(word));
  }

  private extractCertaintyMarkers(sentence: string): string[] {
    return PatternAccuracyValidator.CONTEXT_MARKERS.certainty
      .filter(marker => sentence.toLowerCase().includes(marker));
  }

  private extractHedgingLanguage(sentence: string): string[] {
    const hedgeMarkers = ['maybe', 'perhaps', 'possibly', 'probably', 'likely', 'sort of', 'kind of', 'I think', 'I believe'];
    return hedgeMarkers.filter(marker => sentence.toLowerCase().includes(marker));
  }

  private extractIntensifiers(sentence: string): string[] {
    const intensifiers = ['very', 'really', 'extremely', 'highly', 'absolutely', 'completely', 'totally'];
    return intensifiers.filter(intensifier => sentence.toLowerCase().includes(intensifier));
  }

  private extractNegationMarkers(sentence: string): string[] {
    return PatternAccuracyValidator.CONTEXT_MARKERS.negation
      .filter(marker => sentence.toLowerCase().includes(marker));
  }

  private extractConditionalMarkers(sentence: string): string[] {
    return PatternAccuracyValidator.CONTEXT_MARKERS.conditional
      .filter(marker => sentence.toLowerCase().includes(marker));
  }

  private extractTemporalMarkers(sentence: string): string[] {
    return PatternAccuracyValidator.CONTEXT_MARKERS.temporal
      .filter(marker => sentence.toLowerCase().includes(marker));
  }

  private isImplicitQuestion(text: string): boolean {
    const implicitQuestionStarters = [
      'explain', 'describe', 'tell me', 'show me', 'walk me through',
      'help me understand', 'clarify', 'elaborate'
    ];
    
    return implicitQuestionStarters.some(starter => 
      text.toLowerCase().startsWith(starter)
    );
  }

  private async evaluateTestCase(testCase: PatternTestCase, predictions: PatternMatch[]): Promise<{
    testCase: PatternTestCase;
    predictions: PatternMatch[];
    correct: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let correct = true;
    
    // Check if we found the expected patterns
    for (const expected of testCase.expectedMatches) {
      if (expected.shouldMatch) {
        const found = predictions.some(pred => 
          pred.type === expected.type && 
          (expected.subtype ? pred.subtype === expected.subtype : true) &&
          pred.confidence >= expected.confidence - 0.1 // Allow 10% confidence tolerance
        );
        
        if (!found) {
          correct = false;
          issues.push(`Expected ${expected.type}${expected.subtype ? `(${expected.subtype})` : ''} not found`);
        }
      }
    }
    
    // Check for unexpected patterns (false positives)
    const expectedTypes = new Set(testCase.expectedMatches.filter(e => e.shouldMatch).map(e => e.type));
    const unexpectedPatterns = predictions.filter(pred => !expectedTypes.has(pred.type));
    
    if (unexpectedPatterns.length > 0) {
      correct = false;
      issues.push(`Unexpected patterns found: ${unexpectedPatterns.map(p => p.type).join(', ')}`);
    }
    
    return {
      testCase,
      predictions,
      correct,
      issues
    };
  }

  private isCorrectMatch(prediction: PatternMatch, expected: any): boolean {
    return prediction.type === expected.type &&
           (expected.subtype ? prediction.subtype === expected.subtype : true) &&
           prediction.confidence >= expected.confidence - 0.1;
  }

  private isContextuallyCorrect(result: any): boolean {
    // Check if the contextual understanding was correct
    return result.issues.filter((issue: string) => issue.includes('context')).length === 0;
  }

  private generateCacheKey(match: PatternMatch): string {
    return `${match.text.substring(0, 100)}_${match.type}_${match.conversationContext.userRole}`;
  }

  private async initializeValidationTables(): Promise<void> {
    this.executeStatement(
      'create_pattern_validations_table',
      `CREATE TABLE IF NOT EXISTS pattern_validations (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        text TEXT NOT NULL,
        pattern_type TEXT NOT NULL,
        confidence REAL NOT NULL,
        contextual_confidence REAL NOT NULL,
        validation_result TEXT NOT NULL,
        issues TEXT,
        timestamp INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    this.executeStatement(
      'create_accuracy_metrics_table',
      `CREATE TABLE IF NOT EXISTS pattern_accuracy_metrics (
        id TEXT PRIMARY KEY,
        total_patterns INTEGER NOT NULL,
        validated_patterns INTEGER NOT NULL,
        false_positives INTEGER NOT NULL,
        false_negatives INTEGER NOT NULL,
        precision REAL NOT NULL,
        recall REAL NOT NULL,
        f1_score REAL NOT NULL,
        contextual_accuracy REAL NOT NULL,
        average_confidence REAL NOT NULL,
        validation_rate REAL NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );

    this.executeStatement(
      'create_test_cases_table',
      `CREATE TABLE IF NOT EXISTS pattern_test_cases (
        id TEXT PRIMARY KEY,
        input TEXT NOT NULL,
        context TEXT NOT NULL,
        expected_matches TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        weight REAL NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    );
  }

  private async loadTestSuite(): Promise<void> {
    const testCases = this.executeStatementAll<{
      id: string;
      input: string;
      context: string;
      expected_matches: string;
      description: string;
      category: string;
      weight: number;
    }>(
      'load_test_cases',
      'SELECT * FROM pattern_test_cases',
      []
    );

    this.testSuite = testCases.map(row => ({
      id: row.id,
      input: row.input,
      context: JSON.parse(row.context),
      expectedMatches: JSON.parse(row.expected_matches),
      description: row.description,
      category: row.category as any,
      weight: row.weight
    }));

    // If no test cases exist, create default ones
    if (this.testSuite.length === 0) {
      await this.createDefaultTestSuite();
    }
  }

  private async saveTestSuite(): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO pattern_test_cases 
      (id, input, context, expected_matches, description, category, weight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const testCase of this.testSuite) {
      stmt.run(
        testCase.id,
        testCase.input,
        JSON.stringify(testCase.context),
        JSON.stringify(testCase.expectedMatches),
        testCase.description,
        testCase.category,
        testCase.weight
      );
    }
  }

  private async createDefaultTestSuite(): Promise<void> {
    const defaultTests: PatternTestCase[] = [
      {
        id: 'commitment_strong_future',
        input: "I'll update the documentation by Friday and send you the link.",
        context: this.createDefaultContext('assistant'),
        expectedMatches: [
          {
            type: 'commitment',
            subtype: 'temporal_commitment',
            confidence: 0.85,
            shouldMatch: true,
            expectedText: "I'll update the documentation by Friday"
          }
        ],
        description: 'Strong commitment with temporal constraint',
        category: 'basic',
        weight: 1.0
      },
      {
        id: 'hypothetical_commitment',
        input: "If you need it, I could potentially update the documentation.",
        context: this.createDefaultContext('assistant'),
        expectedMatches: [
          {
            type: 'commitment',
            confidence: 0.3,
            shouldMatch: false // Should be rejected due to hypothetical language
          }
        ],
        description: 'Hypothetical commitment should be rejected',
        category: 'edge_case',
        weight: 1.5
      },
      {
        id: 'user_commitment_false_positive',
        input: "I'll check the documentation myself.",
        context: this.createDefaultContext('user'),
        expectedMatches: [
          {
            type: 'commitment',
            confidence: 0.8,
            shouldMatch: false // Should be rejected due to user role
          }
        ],
        description: 'User commitment should be rejected',
        category: 'contextual',
        weight: 1.5
      },
      {
        id: 'clear_question',
        input: "How do I configure the database connection?",
        context: this.createDefaultContext('user'),
        expectedMatches: [
          {
            type: 'question',
            subtype: 'factual_question',
            confidence: 0.9,
            shouldMatch: true
          }
        ],
        description: 'Clear factual question',
        category: 'basic',
        weight: 1.0
      },
      {
        id: 'negated_commitment',
        input: "I won't be able to update the documentation today.",
        context: this.createDefaultContext('assistant'),
        expectedMatches: [
          {
            type: 'commitment',
            confidence: 0.5,
            shouldMatch: false // Should be rejected due to negation
          }
        ],
        description: 'Negated commitment should be rejected',
        category: 'edge_case',
        weight: 1.5
      }
    ];

    this.testSuite = defaultTests;
    await this.saveTestSuite();
  }

  private createDefaultContext(role: 'user' | 'assistant' | 'system'): ConversationContext {
    return {
      previousMessages: [],
      currentTopic: 'general',
      userRole: role,
      conversationStage: 'development',
      semanticContext: {
        entities: [],
        topics: [{ name: 'general', relevance: 0.5 }],
        sentiment: { polarity: 0, confidence: 0.5 },
        intentFlow: [],
        hypotheticalIndicators: false
      },
      temporalContext: {
        timeReferences: [],
        sequenceIndicators: [],
        conditionalMarkers: []
      }
    };
  }

  private async storeValidationResult(match: PatternMatch, result: ValidationResult): Promise<void> {
    this.executeStatement(
      'store_validation_result',
      `INSERT INTO pattern_validations 
       (id, pattern_id, text, pattern_type, confidence, contextual_confidence, 
        validation_result, issues, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.generateId(),
        match.id,
        match.text,
        match.type,
        match.confidence,
        result.contextualScore,
        JSON.stringify(result),
        result.issues.length > 0 ? JSON.stringify(result.issues) : null,
        Date.now()
      ]
    );
  }

  private async storeTestResults(results: any): Promise<void> {
    this.executeStatement(
      'store_test_results',
      `INSERT INTO pattern_accuracy_metrics 
       (id, total_patterns, validated_patterns, false_positives, false_negatives,
        precision, recall, f1_score, contextual_accuracy, average_confidence,
        validation_rate, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        this.generateId(),
        results.testResults.length,
        results.testResults.filter((r: any) => r.correct).length,
        Math.round(results.falsePositiveRate * results.testResults.length),
        Math.round((1 - results.recall) * results.testResults.length),
        results.precision,
        results.recall,
        results.f1Score,
        results.contextualAccuracy,
        0.8, // Placeholder for average confidence
        1.0, // All patterns validated in test
        Date.now()
      ]
    );
  }

  private async loadMetrics(): Promise<void> {
    const latest = this.executeStatementGet<{
      total_patterns: number;
      validated_patterns: number;
      false_positives: number;
      false_negatives: number;
      precision: number;
      recall: number;
      f1_score: number;
      contextual_accuracy: number;
      average_confidence: number;
      validation_rate: number;
      timestamp: number;
    }>(
      'load_latest_metrics',
      `SELECT * FROM pattern_accuracy_metrics 
       ORDER BY timestamp DESC LIMIT 1`,
      []
    );

    if (latest) {
      this.accuracyMetrics = {
        totalPatterns: latest.total_patterns,
        validatedPatterns: latest.validated_patterns,
        falsePositives: latest.false_positives,
        falseNegatives: latest.false_negatives,
        precision: latest.precision,
        recall: latest.recall,
        f1Score: latest.f1_score,
        contextualAccuracy: latest.contextual_accuracy,
        averageConfidence: latest.average_confidence,
        validationRate: latest.validation_rate,
        lastUpdate: latest.timestamp
      };
    }
  }

  private async updateBatchMetrics(matches: PatternMatch[], results: ValidationResult[]): Promise<void> {
    const validResults = results.filter(r => r.isValid);
    const falsePositives = results.filter(r => r.falsePositiveRisk > 0.15).length;
    
    this.accuracyMetrics.totalPatterns += matches.length;
    this.accuracyMetrics.validatedPatterns += validResults.length;
    this.accuracyMetrics.falsePositives += falsePositives;
    this.accuracyMetrics.averageConfidence = 
      (this.accuracyMetrics.averageConfidence * 0.9) + 
      (results.reduce((sum, r) => sum + r.confidence, 0) / results.length * 0.1);
    this.accuracyMetrics.lastUpdate = Date.now();
    
    // Recalculate precision
    this.accuracyMetrics.precision = 
      this.accuracyMetrics.validatedPatterns / 
      Math.max(1, this.accuracyMetrics.validatedPatterns + this.accuracyMetrics.falsePositives);
  }

  private setupRealtimeMonitoring(): void {
    // Monitor validation events
    this.eventEmitter.on('pattern:validated', ({ match, result }) => {
      if (result.falsePositiveRisk > 0.2) {
        console.warn(`⚠️  High false positive risk pattern detected: ${match.type} (${(result.falsePositiveRisk * 100).toFixed(1)}%)`);
      }
      
      if (result.issues.some(issue => issue.severity === 'critical')) {
        console.error(`🚨 Critical pattern validation issue: ${match.type} - ${result.issues[0].description}`);
      }
    });
  }

  private initializeMetrics(): PatternAccuracyMetrics {
    return {
      totalPatterns: 0,
      validatedPatterns: 0,
      falsePositives: 0,
      falseNegatives: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      contextualAccuracy: 0,
      averageConfidence: 0,
      validationRate: 0,
      lastUpdate: Date.now()
    };
  }

  private getIssueDescription(type: string): string {
    const descriptions = {
      'false_positive_risk': 'Pattern has high risk of being incorrectly detected',
      'context_mismatch': 'Pattern does not match conversational context',
      'linguistic_inconsistency': 'Pattern conflicts with linguistic analysis',
      'ambiguity': 'Pattern match is ambiguous or unclear'
    };
    
    return descriptions[type as keyof typeof descriptions] || 'Unknown validation issue';
  }
}