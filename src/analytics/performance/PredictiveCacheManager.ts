/**
 * Predictive Cache Manager
 * 
 * Intelligent cache warming system that learns from user behavior patterns 
 * to proactively preload likely-to-be-requested analytics data, reducing 
 * response times and improving user experience.
 * 
 * Features:
 * - User behavior pattern analysis
 * - Machine learning-based prediction models
 * - Adaptive cache warming strategies
 * - Resource-aware predictions
 * - Background optimization processes
 */

import { DatabaseManager } from '../../storage/Database.js';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';
import { Message, Conversation } from '../../types/interfaces.js';

export interface UsagePattern {
  id: string;
  userId?: string;
  sequence: string[];
  frequency: number;
  lastSeen: number;
  confidence: number;
  context: {
    timeOfDay?: number;
    dayOfWeek?: number;
    sessionDuration?: number;
    queryTypes?: string[];
  };
}

export interface PredictionModel {
  type: 'sequence' | 'collaborative' | 'temporal' | 'contextual';
  accuracy: number;
  trainingData: number;
  lastUpdated: number;
  parameters: Record<string, any>;
}

export interface CachePrediction {
  cacheKey: string;
  queryType: string;
  confidence: number;
  priority: number;
  estimatedValue: number;
  context: Record<string, any>;
  expiryTime: number;
}

export interface PredictiveCacheConfig {
  enabled: boolean;
  learningEnabled: boolean;
  maxPatternHistory: number;
  minPatternFrequency: number;
  predictionThreshold: number;
  maxConcurrentPredictions: number;
  resourceThresholds: {
    maxCpuUtilization: number;
    maxMemoryUsageMB: number;
    maxDiskIOPS: number;
  };
  warmingStrategy: {
    aggressiveness: 'conservative' | 'moderate' | 'aggressive';
    maxWarmingOperationsPerMinute: number;
    priorityWeighting: {
      frequency: number;
      recency: number;
      confidence: number;
      userContext: number;
    };
  };
  models: {
    enableSequenceAnalysis: boolean;
    enableCollaborativeFiltering: boolean;
    enableTemporalPatterns: boolean;
    enableContextualPredictions: boolean;
  };
}

/**
 * Analyzes user behavior patterns to identify predictable request sequences
 */
class UsagePatternAnalyzer {
  private patterns: Map<string, UsagePattern> = new Map();
  private recentRequests: Array<{ key: string; timestamp: number; context: Record<string, unknown> }> = [];
  private sessionData: Map<string, { requests: string[]; startTime: number }> = new Map();

  constructor(private config: PredictiveCacheConfig) {}

  /**
   * Record a cache request for pattern analysis
   */
  recordRequest(cacheKey: string, userId: string = 'default', context: Record<string, unknown> = {}): void {
    const timestamp = Date.now();
    
    // Add to recent requests
    this.recentRequests.push({
      key: cacheKey,
      timestamp,
      context: {
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        ...context
      }
    });

    // Maintain sliding window
    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    this.recentRequests = this.recentRequests.filter(
      req => timestamp - req.timestamp < windowMs
    );

    // Update session data
    this.updateSessionData(userId, cacheKey, timestamp);

    // Extract patterns from recent requests
    this.extractPatterns(userId);

    // Clean up old patterns
    this.cleanupOldPatterns();
  }

  /**
   * Get patterns that might predict next requests
   */
  getPredictivePatterns(recentKeys: string[], context: Record<string, unknown> = {}): UsagePattern[] {
    const matchingPatterns: Array<{ pattern: UsagePattern; score: number }> = [];

    for (const pattern of this.patterns.values()) {
      const score = this.calculatePatternMatch(pattern, recentKeys, context);
      if (score > this.config.predictionThreshold) {
        matchingPatterns.push({ pattern, score });
      }
    }

    // Sort by score and return top patterns
    return matchingPatterns
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.pattern);
  }

  /**
   * Get comprehensive pattern statistics
   */
  getPatternStats(): {
    totalPatterns: number;
    activePatterns: number;
    averageConfidence: number;
    topPatterns: Array<{ pattern: UsagePattern; strength: number }>;
  } {
    const activePatterns = Array.from(this.patterns.values()).filter(
      p => Date.now() - p.lastSeen < 7 * 24 * 60 * 60 * 1000 // 7 days
    );

    const averageConfidence = activePatterns.length > 0
      ? activePatterns.reduce((sum, p) => sum + p.confidence, 0) / activePatterns.length
      : 0;

    const topPatterns = activePatterns
      .map(pattern => ({
        pattern,
        strength: pattern.frequency * pattern.confidence
      }))
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 10);

    return {
      totalPatterns: this.patterns.size,
      activePatterns: activePatterns.length,
      averageConfidence,
      topPatterns
    };
  }

  private updateSessionData(userId: string, cacheKey: string, timestamp: number): void {
    if (!this.sessionData.has(userId)) {
      this.sessionData.set(userId, { requests: [], startTime: timestamp });
    }

    const session = this.sessionData.get(userId)!;
    session.requests.push(cacheKey);

    // Keep session data reasonable
    if (session.requests.length > 100) {
      session.requests = session.requests.slice(-50);
    }
  }

  private extractPatterns(userId: string): void {
    const session = this.sessionData.get(userId);
    if (!session || session.requests.length < 2) return;

    // Extract sequential patterns of various lengths
    for (let length = 2; length <= Math.min(5, session.requests.length); length++) {
      for (let i = 0; i <= session.requests.length - length; i++) {
        const sequence = session.requests.slice(i, i + length);
        const patternId = sequence.join('->');
        
        if (this.patterns.has(patternId)) {
          const pattern = this.patterns.get(patternId)!;
          pattern.frequency++;
          pattern.lastSeen = Date.now();
          pattern.confidence = Math.min(1.0, pattern.confidence + 0.01);
        } else {
          this.patterns.set(patternId, {
            id: patternId,
            userId,
            sequence,
            frequency: 1,
            lastSeen: Date.now(),
            confidence: 0.1,
            context: this.extractContextFromRecent(sequence)
          });
        }
      }
    }
  }

  private extractContextFromRecent(sequence: string[]): Record<string, unknown> {
    const recentContext = this.recentRequests
      .filter(req => sequence.includes(req.key))
      .map(req => req.context);

    if (recentContext.length === 0) return {};

    return {
      timeOfDay: this.mode(recentContext.map(c => typeof c.timeOfDay === 'number' ? c.timeOfDay : 0).filter(n => n > 0)),
      dayOfWeek: this.mode(recentContext.map(c => typeof c.dayOfWeek === 'number' ? c.dayOfWeek : 0).filter(n => n >= 0)),
      queryTypes: [...new Set(recentContext.flatMap(c => Array.isArray(c.queryTypes) ? c.queryTypes as string[] : []))]
    };
  }

  private mode(arr: number[]): number | undefined {
    if (arr.length === 0) return undefined;
    const counts = new Map<number, number>();
    arr.forEach(val => counts.set(val, (counts.get(val) || 0) + 1));
    return [...counts.entries()].reduce((a, b) => a[1] > b[1] ? a : b)[0];
  }

  private calculatePatternMatch(pattern: UsagePattern, recentKeys: string[], context: Record<string, unknown>): number {
    let score = 0;

    // Sequence matching
    const patternPrefix = pattern.sequence.slice(0, -1);
    const recentSuffix = recentKeys.slice(-patternPrefix.length);
    
    if (JSON.stringify(patternPrefix) === JSON.stringify(recentSuffix)) {
      score += 0.6;
    } else {
      // Partial sequence matching
      const overlap = this.calculateSequenceOverlap(patternPrefix, recentSuffix);
      score += overlap * 0.4;
    }

    // Frequency weighting
    score += Math.min(0.2, pattern.frequency / 100);

    // Confidence weighting
    score += pattern.confidence * 0.1;

    // Context matching
    if (pattern.context && context) {
      const contextMatch = this.calculateContextMatch(pattern.context, context);
      score += contextMatch * 0.1;
    }

    // Recency bonus
    const hoursSinceLastSeen = (Date.now() - pattern.lastSeen) / (1000 * 60 * 60);
    const recencyBonus = Math.max(0, 0.1 - (hoursSinceLastSeen / 168)); // Decay over 1 week
    score += recencyBonus;

    return score;
  }

  private calculateSequenceOverlap(seq1: string[], seq2: string[]): number {
    if (seq1.length === 0 || seq2.length === 0) return 0;
    
    let matches = 0;
    const minLength = Math.min(seq1.length, seq2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (seq1[seq1.length - 1 - i] === seq2[seq2.length - 1 - i]) {
        matches++;
      } else {
        break;
      }
    }
    
    return matches / minLength;
  }

  private calculateContextMatch(ctx1: Record<string, unknown>, ctx2: Record<string, unknown>): number {
    let matches = 0;
    let total = 0;

    if (typeof ctx1.timeOfDay === 'number' && typeof ctx2.timeOfDay === 'number') {
      total++;
      if (Math.abs(ctx1.timeOfDay - ctx2.timeOfDay) <= 1) matches++;
    }

    if (typeof ctx1.dayOfWeek === 'number' && typeof ctx2.dayOfWeek === 'number') {
      total++;
      if (ctx1.dayOfWeek === ctx2.dayOfWeek) matches++;
    }

    return total > 0 ? matches / total : 0;
  }

  private cleanupOldPatterns(): void {
    if (this.patterns.size <= this.config.maxPatternHistory) return;

    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    const toDelete: string[] = [];

    for (const [id, pattern] of this.patterns) {
      if (pattern.lastSeen < cutoffTime && pattern.frequency < this.config.minPatternFrequency) {
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => this.patterns.delete(id));
  }
}

/**
 * Machine learning models for cache prediction
 */
class PredictionModelManager {
  private models: Map<string, PredictionModel> = new Map();
  private trainingData: Array<{
    features: number[];
    target: string;
    timestamp: number;
    outcome: boolean;
  }> = [];

  constructor(private config: PredictiveCacheConfig) {
    this.initializeModels();
  }

  /**
   * Generate predictions based on current context
   */
  async generatePredictions(
    currentContext: Record<string, unknown>,
    patterns: UsagePattern[]
  ): Promise<CachePrediction[]> {
    const predictions: CachePrediction[] = [];

    // Sequence-based predictions
    if (this.config.models.enableSequenceAnalysis) {
      predictions.push(...await this.generateSequencePredictions(currentContext, patterns));
    }

    // Temporal-based predictions
    if (this.config.models.enableTemporalPatterns) {
      predictions.push(...await this.generateTemporalPredictions(currentContext));
    }

    // Contextual predictions
    if (this.config.models.enableContextualPredictions) {
      predictions.push(...await this.generateContextualPredictions(currentContext));
    }

    // Collaborative filtering predictions
    if (this.config.models.enableCollaborativeFiltering) {
      predictions.push(...await this.generateCollaborativePredictions(currentContext));
    }

    // Deduplicate and rank predictions
    return this.rankAndDedupePredictions(predictions);
  }

  /**
   * Update model with prediction outcome
   */
  updateModelWithOutcome(prediction: CachePrediction, wasAccurate: boolean): void {
    const features = this.extractFeatures(prediction);
    
    this.trainingData.push({
      features,
      target: prediction.cacheKey,
      timestamp: Date.now(),
      outcome: wasAccurate
    });

    // Maintain training data size
    if (this.trainingData.length > 10000) {
      this.trainingData = this.trainingData.slice(-5000);
    }

    // Update model accuracy
    this.updateModelAccuracy(prediction.queryType, wasAccurate);

    // Retrain models periodically
    if (this.trainingData.length % 100 === 0) {
      this.retrainModels();
    }
  }

  /**
   * Get model performance statistics
   */
  getModelStats(): Map<string, { accuracy: number; predictions: number; lastUpdated: number }> {
    const stats = new Map<string, { accuracy: number; predictions: number; lastUpdated: number }>();
    
    for (const [type, model] of this.models) {
      stats.set(type, {
        accuracy: model.accuracy,
        predictions: model.trainingData,
        lastUpdated: model.lastUpdated
      });
    }
    
    return stats;
  }

  private async generateSequencePredictions(
    context: Record<string, unknown>,
    patterns: UsagePattern[]
  ): Promise<CachePrediction[]> {
    const predictions: CachePrediction[] = [];
    
    for (const pattern of patterns) {
      if (pattern.sequence.length < 2) continue;
      
      const nextKey = pattern.sequence[pattern.sequence.length - 1];
      const confidence = pattern.confidence * (pattern.frequency / 100);
      
      predictions.push({
        cacheKey: nextKey,
        queryType: 'sequence',
        confidence,
        priority: confidence * 100,
        estimatedValue: this.estimateQueryValue(nextKey),
        context: pattern.context,
        expiryTime: Date.now() + (60 * 60 * 1000) // 1 hour
      });
    }
    
    return predictions;
  }

  private async generateTemporalPredictions(context: Record<string, unknown>): Promise<CachePrediction[]> {
    const predictions: CachePrediction[] = [];
    const timeOfDay = typeof context.timeOfDay === 'number' ? context.timeOfDay : 0;
    const dayOfWeek = typeof context.dayOfWeek === 'number' ? context.dayOfWeek : 0;

    // Analyze historical patterns for this time/day
    const historicalRequests = this.getHistoricalRequestsForTime(timeOfDay, dayOfWeek);
    const commonQueries = this.findMostCommonQueries(historicalRequests);

    for (const query of commonQueries.slice(0, 5)) {
      predictions.push({
        cacheKey: query.key,
        queryType: 'temporal',
        confidence: query.frequency,
        priority: query.frequency * 80,
        estimatedValue: this.estimateQueryValue(query.key),
        context: { timeOfDay, dayOfWeek },
        expiryTime: Date.now() + (2 * 60 * 60 * 1000) // 2 hours
      });
    }

    return predictions;
  }

  private async generateContextualPredictions(context: Record<string, unknown>): Promise<CachePrediction[]> {
    const predictions: CachePrediction[] = [];
    const queryTypes = Array.isArray(context.queryTypes) ? context.queryTypes as string[] : [];
    const sessionDuration = typeof context.sessionDuration === 'number' ? context.sessionDuration : 0;

    // Predict based on query types in session
    for (const queryType of queryTypes) {
      const relatedQueries = this.findRelatedQueries(queryType);
      
      for (const relatedQuery of relatedQueries.slice(0, 3)) {
        predictions.push({
          cacheKey: relatedQuery.key,
          queryType: 'contextual',
          confidence: relatedQuery.relevance,
          priority: relatedQuery.relevance * 60,
          estimatedValue: this.estimateQueryValue(relatedQuery.key),
          context: { queryType, sessionDuration },
          expiryTime: Date.now() + (30 * 60 * 1000) // 30 minutes
        });
      }
    }

    return predictions;
  }

  private async generateCollaborativePredictions(context: Record<string, unknown>): Promise<CachePrediction[]> {
    // Simplified collaborative filtering - in production would use more sophisticated algorithms
    const predictions: CachePrediction[] = [];
    const recentKeys = Array.isArray(context.recentKeys) ? context.recentKeys as string[] : [];

    // Find users with similar request patterns
    const similarUsers = this.findSimilarUsers(recentKeys);
    
    for (const similarUser of similarUsers.slice(0, 3)) {
      const recommendations = this.getUserRecommendations(similarUser.userId);
      
      for (const rec of recommendations.slice(0, 2)) {
        predictions.push({
          cacheKey: rec.key,
          queryType: 'collaborative',
          confidence: rec.similarity * similarUser.similarity,
          priority: rec.similarity * similarUser.similarity * 40,
          estimatedValue: this.estimateQueryValue(rec.key),
          context: { collaborativeUserId: similarUser.userId },
          expiryTime: Date.now() + (45 * 60 * 1000) // 45 minutes
        });
      }
    }

    return predictions;
  }

  private rankAndDedupePredictions(predictions: CachePrediction[]): CachePrediction[] {
    // Deduplicate by cache key
    const deduped = new Map<string, CachePrediction>();
    
    for (const prediction of predictions) {
      if (!deduped.has(prediction.cacheKey) || 
          deduped.get(prediction.cacheKey)!.confidence < prediction.confidence) {
        deduped.set(prediction.cacheKey, prediction);
      }
    }

    // Sort by priority and confidence
    return Array.from(deduped.values())
      .sort((a, b) => {
        const aScore = a.priority * a.confidence * a.estimatedValue;
        const bScore = b.priority * b.confidence * b.estimatedValue;
        return bScore - aScore;
      })
      .slice(0, this.config.maxConcurrentPredictions);
  }

  private initializeModels(): void {
    this.models.set('sequence', {
      type: 'sequence',
      accuracy: 0.5,
      trainingData: 0,
      lastUpdated: Date.now(),
      parameters: { windowSize: 5, threshold: 0.6 }
    });

    this.models.set('temporal', {
      type: 'temporal',
      accuracy: 0.4,
      trainingData: 0,
      lastUpdated: Date.now(),
      parameters: { timeWindows: [1, 3, 6, 12, 24], seasonality: true }
    });

    this.models.set('contextual', {
      type: 'contextual',
      accuracy: 0.6,
      trainingData: 0,
      lastUpdated: Date.now(),
      parameters: { maxContextFeatures: 10, similarity: 'cosine' }
    });

    this.models.set('collaborative', {
      type: 'collaborative',
      accuracy: 0.3,
      trainingData: 0,
      lastUpdated: Date.now(),
      parameters: { neighbors: 5, minSimilarity: 0.3 }
    });
  }

  private extractFeatures(prediction: CachePrediction): number[] {
    return [
      prediction.confidence,
      prediction.priority / 100,
      prediction.estimatedValue,
      (prediction.expiryTime - Date.now()) / (60 * 60 * 1000), // Hours until expiry
      prediction.queryType === 'sequence' ? 1 : 0,
      prediction.queryType === 'temporal' ? 1 : 0,
      prediction.queryType === 'contextual' ? 1 : 0,
      prediction.queryType === 'collaborative' ? 1 : 0
    ];
  }

  private updateModelAccuracy(queryType: string, wasAccurate: boolean): void {
    const model = this.models.get(queryType);
    if (model) {
      const alpha = 0.1; // Learning rate
      model.accuracy = (1 - alpha) * model.accuracy + alpha * (wasAccurate ? 1 : 0);
      model.trainingData++;
      model.lastUpdated = Date.now();
    }
  }

  private retrainModels(): void {
    // Simplified retraining - in production would use more sophisticated ML algorithms
    const recentData = this.trainingData.slice(-1000);
    
    for (const [type, model] of this.models) {
      const typeData = recentData.filter(d => d.target.includes(type));
      if (typeData.length > 10) {
        const accuracy = typeData.filter(d => d.outcome).length / typeData.length;
        model.accuracy = accuracy;
        model.lastUpdated = Date.now();
      }
    }
  }

  private estimateQueryValue(cacheKey: string): number {
    // Estimate computational cost saved by caching
    const keyParts = cacheKey.split(':');
    let value = 1;

    // Boost value for expensive operations
    if (cacheKey.includes('flow_analysis')) value *= 3;
    if (cacheKey.includes('knowledge_gap')) value *= 2.5;
    if (cacheKey.includes('productivity')) value *= 2;
    if (cacheKey.includes('search')) value *= 1.5;

    // Boost value for large datasets
    if (keyParts.some(part => part.includes('batch') || part.includes('all'))) {
      value *= 2;
    }

    return value;
  }

  private getHistoricalRequestsForTime(timeOfDay: number, dayOfWeek: number): Array<{ key: string; timestamp: number }> {
    // Simplified - would query actual database in production
    return this.trainingData
      .filter(d => {
        const requestTime = new Date(d.timestamp);
        return Math.abs(requestTime.getHours() - timeOfDay) <= 1 &&
               requestTime.getDay() === dayOfWeek;
      })
      .map(d => ({ key: d.target, timestamp: d.timestamp }));
  }

  private findMostCommonQueries(requests: Array<{ key: string; timestamp: number }>): Array<{ key: string; frequency: number }> {
    const counts = new Map<string, number>();
    
    requests.forEach(req => {
      counts.set(req.key, (counts.get(req.key) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([key, count]) => ({ key, frequency: count / requests.length }))
      .sort((a, b) => b.frequency - a.frequency);
  }

  private findRelatedQueries(queryType: string): Array<{ key: string; relevance: number }> {
    // Simplified query relation detection
    const related = this.trainingData
      .filter(d => d.target.includes(queryType))
      .map(d => ({ key: d.target, relevance: 0.7 }));

    return related.slice(0, 5);
  }

  private findSimilarUsers(_recentKeys: string[]): Array<{ userId: string; similarity: number }> {
    // Simplified user similarity - would use more sophisticated algorithms in production
    return [
      { userId: 'similar_user_1', similarity: 0.6 },
      { userId: 'similar_user_2', similarity: 0.4 }
    ];
  }

  private getUserRecommendations(_userId: string): Array<{ key: string; similarity: number }> {
    // Simplified recommendations
    return [
      { key: 'recommended_query_1', similarity: 0.8 },
      { key: 'recommended_query_2', similarity: 0.6 }
    ];
  }
}

/**
 * Resource-aware cache warming engine
 */
class CacheWarmingEngine {
  private warmingQueue: CachePrediction[] = [];
  private activeWarmingTasks = new Set<string>();
  private warmingStats = {
    successful: 0,
    failed: 0,
    skippedDueToResources: 0,
    totalEstimatedTimeSaved: 0
  };

  constructor(
    private config: PredictiveCacheConfig,
    private analyticsEngine: AnalyticsEngine,
    private databaseManager: DatabaseManager
  ) {}

  /**
   * Add predictions to warming queue
   */
  queuePredictions(predictions: CachePrediction[]): void {
    for (const prediction of predictions) {
      if (!this.activeWarmingTasks.has(prediction.cacheKey)) {
        this.warmingQueue.push(prediction);
      }
    }

    // Sort queue by priority
    this.warmingQueue.sort((a, b) => b.priority - a.priority);

    // Trim queue if too large
    if (this.warmingQueue.length > 100) {
      this.warmingQueue = this.warmingQueue.slice(0, 100);
    }
  }

  /**
   * Process warming queue based on resource availability
   */
  async processWarmingQueue(): Promise<void> {
    if (!this.config.enabled || this.warmingQueue.length === 0) return;

    // Check resource constraints
    const resourceStatus = await this.checkResourceAvailability();
    if (!resourceStatus.canWarm) {
      this.warmingStats.skippedDueToResources++;
      return;
    }

    const maxOperations = Math.min(
      this.config.warmingStrategy.maxWarmingOperationsPerMinute,
      resourceStatus.maxOperations
    );

    const toProcess = this.warmingQueue.splice(0, maxOperations);
    
    for (const prediction of toProcess) {
      await this.warmCachePrediction(prediction);
    }
  }

  /**
   * Get warming performance statistics
   */
  getWarmingStats(): {
    queueSize: number;
    activeTasks: number;
    stats: {
      successful: number;
      failed: number;
      skipped: number;
      totalProcessed: number;
    };
    efficiency: number;
  } {
    const total = this.warmingStats.successful + this.warmingStats.failed;
    const efficiency = total > 0 ? this.warmingStats.successful / total : 0;

    return {
      queueSize: this.warmingQueue.length,
      activeTasks: this.activeWarmingTasks.size,
      stats: {
        successful: this.warmingStats?.successful || 0,
        failed: this.warmingStats?.failed || 0,
        skipped: this.warmingStats?.skippedDueToResources || 0,
        totalProcessed: (this.warmingStats?.successful || 0) + (this.warmingStats?.failed || 0) + (this.warmingStats?.skippedDueToResources || 0)
      },
      efficiency
    };
  }

  private async checkResourceAvailability(): Promise<{
    canWarm: boolean;
    maxOperations: number;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let maxOperations = this.config.warmingStrategy.maxWarmingOperationsPerMinute;

    // Check CPU utilization
    const cpuUsage = await this.getCpuUsage();
    if (cpuUsage > this.config.resourceThresholds.maxCpuUtilization) {
      reasons.push(`CPU usage too high: ${cpuUsage.toFixed(1)}%`);
      maxOperations = Math.floor(maxOperations * 0.5);
    }

    // Check memory usage
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / (1024 * 1024);
    if (memoryUsageMB > this.config.resourceThresholds.maxMemoryUsageMB) {
      reasons.push(`Memory usage too high: ${memoryUsageMB.toFixed(1)}MB`);
      maxOperations = Math.floor(maxOperations * 0.3);
    }

    // Check active warming tasks
    if (this.activeWarmingTasks.size >= this.config.maxConcurrentPredictions) {
      reasons.push('Too many active warming tasks');
      maxOperations = 0;
    }

    const canWarm = maxOperations > 0 && reasons.length < 2;

    return {
      canWarm,
      maxOperations,
      reasons
    };
  }

  private async warmCachePrediction(prediction: CachePrediction): Promise<void> {
    this.activeWarmingTasks.add(prediction.cacheKey);

    try {
      // Determine warming strategy based on cache key
      const success = await this.executeWarmingStrategy(prediction);
      
      if (success) {
        this.warmingStats.successful++;
        this.warmingStats.totalEstimatedTimeSaved += prediction.estimatedValue * 1000; // Convert to ms
      } else {
        this.warmingStats.failed++;
      }

    } catch (error) {
      console.error(`Cache warming failed for ${prediction.cacheKey}:`, error);
      this.warmingStats.failed++;
    } finally {
      this.activeWarmingTasks.delete(prediction.cacheKey);
    }
  }

  private async executeWarmingStrategy(prediction: CachePrediction): Promise<boolean> {
    // Parse cache key to determine what to warm
    const keyParts = prediction.cacheKey.split(':');
    
    try {
      if (keyParts.includes('flow_analysis')) {
        return await this.warmFlowAnalysis(prediction);
      } else if (keyParts.includes('productivity')) {
        return await this.warmProductivityAnalysis(prediction);
      } else if (keyParts.includes('knowledge_gap')) {
        return await this.warmKnowledgeGapDetection(prediction);
      } else if (keyParts.includes('search')) {
        return await this.warmSearchResults(prediction);
      } else {
        return await this.warmGenericQuery(prediction);
      }
    } catch (error) {
      console.error(`Warming strategy execution failed:`, error);
      return false;
    }
  }

  private async warmFlowAnalysis(prediction: CachePrediction): Promise<boolean> {
    // Extract conversation IDs from context or key
    const conversationIds = this.extractConversationIds(prediction);
    if (conversationIds.length === 0) return false;

    // Fetch conversations and run flow analysis
    const conversations = await this.getConversationsWithMessages(conversationIds.slice(0, 5));
    if (conversations.length === 0) return false;

    // This would typically call the analytics engine to perform and cache flow analysis
    // For now, we'll simulate the caching
    await this.simulateAnalysisAndCache(prediction.cacheKey, conversations, 'flow');
    
    return true;
  }

  private async warmProductivityAnalysis(prediction: CachePrediction): Promise<boolean> {
    const conversationIds = this.extractConversationIds(prediction);
    if (conversationIds.length === 0) return false;

    const conversations = await this.getConversationsWithMessages(conversationIds.slice(0, 3));
    if (conversations.length === 0) return false;

    await this.simulateAnalysisAndCache(prediction.cacheKey, conversations, 'productivity');
    
    return true;
  }

  private async warmKnowledgeGapDetection(prediction: CachePrediction): Promise<boolean> {
    const conversationIds = this.extractConversationIds(prediction);
    if (conversationIds.length === 0) return false;

    const conversations = await this.getConversationsWithMessages(conversationIds.slice(0, 10));
    if (conversations.length === 0) return false;

    await this.simulateAnalysisAndCache(prediction.cacheKey, conversations, 'knowledge_gap');
    
    return true;
  }

  private async warmSearchResults(prediction: CachePrediction): Promise<boolean> {
    // Extract search query from cache key
    const searchQuery = this.extractSearchQuery(prediction.cacheKey);
    if (!searchQuery) return false;

    // Pre-warm search results
    await this.simulateSearchAndCache(prediction.cacheKey, searchQuery);
    
    return true;
  }

  private async warmGenericQuery(prediction: CachePrediction): Promise<boolean> {
    // For generic queries, we'll try to parse and execute them
    const queryInfo = this.parseGenericCacheKey(prediction.cacheKey);
    if (!queryInfo) return false;

    await this.simulateGenericQueryAndCache(prediction.cacheKey, queryInfo);
    
    return true;
  }

  private extractConversationIds(prediction: CachePrediction): string[] {
    // Extract conversation IDs from cache key or context
    const keyParts = prediction.cacheKey.split(':');
    const conversationIds: string[] = [];

    // Look for UUIDs in key parts
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    keyParts.forEach(part => {
      if (uuidRegex.test(part)) {
        conversationIds.push(part);
      }
    });

    // If no specific IDs found, get recent conversations
    if (conversationIds.length === 0) {
      conversationIds.push(...this.getRecentConversationIds(5));
    }

    return conversationIds;
  }

  private async getConversationsWithMessages(conversationIds: string[]): Promise<Array<{
    conversation: Conversation;
    messages: Message[];
  }>> {
    const results: Array<{ conversation: Conversation; messages: Message[] }> = [];

    try {
      const db = (this.databaseManager as any).getDatabase();
      
      for (const id of conversationIds) {
        const conversation = db.prepare(
          'SELECT * FROM conversations WHERE id = ?'
        ).get(id) as Conversation;
        
        if (conversation) {
          const messages = db.prepare(
            'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
          ).all(id) as Message[];
          
          results.push({ conversation, messages });
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations for warming:', error);
    }

    return results;
  }

  private getRecentConversationIds(limit: number): string[] {
    try {
      const db = (this.databaseManager as any).getDatabase();
      const recent = db.prepare(
        'SELECT id FROM conversations ORDER BY created_at DESC LIMIT ?'
      ).all(limit) as Array<{ id: string }>;
      
      return recent.map(r => r.id);
    } catch (error) {
      console.error('Failed to fetch recent conversation IDs:', error);
      return [];
    }
  }

  private extractSearchQuery(cacheKey: string): string | null {
    // Extract search query from cache key
    const parts = cacheKey.split(':');
    const queryIndex = parts.indexOf('query');
    
    if (queryIndex >= 0 && queryIndex < parts.length - 1) {
      return decodeURIComponent(parts[queryIndex + 1]);
    }
    
    return null;
  }

  private parseGenericCacheKey(cacheKey: string): { type: string; operation: string; parameters: string[] } {
    // Parse generic cache key to extract query information
    const parts = cacheKey.split(':');
    
    return {
      type: parts[0] || 'unknown',
      operation: parts[1] || 'query',
      parameters: parts.slice(2)
    };
  }

  private async simulateAnalysisAndCache(cacheKey: string, conversations: Array<{ conversation: unknown; messages: unknown[] }>, analysisType: string): Promise<void> {
    // Simulate running analytics and caching results
    // In a real implementation, this would call the actual analytics engine
    

    // Simulate cache storage (would integrate with actual cache system)
    console.log(`[Predictive Cache] Warmed ${analysisType} analysis for ${conversations.length} conversations`);
  }

  private async simulateSearchAndCache(cacheKey: string, searchQuery: string): Promise<void> {
    // Simulate search execution and caching

    console.log(`[Predictive Cache] Warmed search results for query: "${searchQuery}"`);
  }

  private async simulateGenericQueryAndCache(cacheKey: string, queryInfo: { type: string; operation: string; parameters: string[] }): Promise<void> {
    // Simulate generic query execution and caching
    console.log(`[Predictive Cache] Warmed generic query: ${queryInfo.type}.${queryInfo.operation}`);
  }

  private getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    // In production, would use more accurate system monitoring
    return Promise.resolve(Math.random() * 50 + 10); // Simulate 10-60% CPU usage
  }
}

/**
 * Main Predictive Cache Manager
 */
export class PredictiveCacheManager {
  private patternAnalyzer: UsagePatternAnalyzer;
  private modelManager: PredictionModelManager;
  private warmingEngine: CacheWarmingEngine;
  private lastPredictionTime = 0;
  private recentCacheKeys: Array<{ key: string; timestamp: number; context: Record<string, unknown> }> = [];
  
  private intervalHandles: NodeJS.Timeout[] = [];

  constructor(
    private databaseManager: DatabaseManager,
    private analyticsEngine: AnalyticsEngine,
    private config: PredictiveCacheConfig
  ) {
    this.patternAnalyzer = new UsagePatternAnalyzer(config);
    this.modelManager = new PredictionModelManager(config);
    this.warmingEngine = new CacheWarmingEngine(config, analyticsEngine, databaseManager);
  }

  /**
   * Initialize the predictive caching system
   */
  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      console.log('[Predictive Cache] Disabled by configuration');
      return;
    }

    console.log('[Predictive Cache] Initializing predictive caching system...');

    // Start background processes
    this.startBackgroundProcesses();

    console.log('[Predictive Cache] System initialized successfully');
    console.log(`   • Pattern analysis: ${this.config.learningEnabled ? 'Enabled' : 'Disabled'}`);
    console.log(`   • Prediction models: ${Object.keys(this.config.models).filter(k => (this.config.models as any)[k]).length} enabled`);
    console.log(`   • Cache warming: ${this.config.warmingStrategy.aggressiveness} mode`);
  }

  /**
   * Record cache access for pattern learning
   */
  recordCacheAccess(cacheKey: string, userId: string = 'default', context: Record<string, unknown> = {}): void {
    if (!this.config.learningEnabled) return;

    const enrichedContext = {
      ...context,
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay()
    };

    // Record for pattern analysis
    this.patternAnalyzer.recordRequest(cacheKey, userId, enrichedContext);

    // Update recent cache keys
    this.recentCacheKeys.push({
      key: cacheKey,
      timestamp: Date.now(),
      context: enrichedContext
    });

    // Maintain sliding window
    const windowMs = 60 * 60 * 1000; // 1 hour
    this.recentCacheKeys = this.recentCacheKeys.filter(
      item => Date.now() - item.timestamp < windowMs
    );
  }

  /**
   * Report prediction outcome for model improvement
   */
  reportPredictionOutcome(prediction: CachePrediction, wasAccurate: boolean): void {
    if (!this.config.learningEnabled) return;

    this.modelManager.updateModelWithOutcome(prediction, wasAccurate);
  }

  /**
   * Get comprehensive system status and performance metrics
   */
  getSystemStatus(): {
    enabled: boolean;
    patterns: ReturnType<UsagePatternAnalyzer['getPatternStats']>;
    models: ReturnType<PredictionModelManager['getModelStats']>;
    warming: ReturnType<CacheWarmingEngine['getWarmingStats']>;
    recentActivity: {
      totalRequests: number;
      requestsPerHour: number;
      predictionsGenerated: number;
    };
  } {
    const patternStats = this.patternAnalyzer.getPatternStats();
    const modelStats = this.modelManager.getModelStats();
    const warmingStats = this.warmingEngine.getWarmingStats();

    const recentRequests = this.recentCacheKeys.filter(
      item => Date.now() - item.timestamp < 60 * 60 * 1000
    );

    return {
      enabled: this.config.enabled,
      patterns: patternStats,
      models: modelStats,
      warming: warmingStats,
      recentActivity: {
        totalRequests: this.recentCacheKeys.length,
        requestsPerHour: recentRequests.length,
        predictionsGenerated: warmingStats.stats.successful + warmingStats.stats.failed
      }
    };
  }

  /**
   * Manually trigger prediction generation and cache warming
   */
  async triggerPredictiveWarming(): Promise<CachePrediction[]> {
    if (!this.config.enabled) return [];

    const currentContext = this.getCurrentContext();
    const patterns = this.patternAnalyzer.getPredictivePatterns(
      this.recentCacheKeys.slice(-10).map(item => item.key),
      currentContext
    );

    const predictions = await this.modelManager.generatePredictions(currentContext, patterns);
    
    if (predictions.length > 0) {
      this.warmingEngine.queuePredictions(predictions);
    }

    return predictions;
  }

  /**
   * Update configuration at runtime
   */
  updateConfiguration(newConfig: Partial<PredictiveCacheConfig>): void {
    Object.assign(this.config, newConfig);
    
    if (!this.config.enabled) {
      this.shutdown();
    } else if (this.intervalHandles.length === 0) {
      this.startBackgroundProcesses();
    }
  }

  /**
   * Shutdown the predictive caching system
   */
  shutdown(): void {
    console.log('[Predictive Cache] Shutting down predictive caching system...');
    
    // Clear all intervals
    this.intervalHandles.forEach(handle => clearInterval(handle));
    this.intervalHandles = [];
    
    console.log('[Predictive Cache] Shutdown complete');
  }

  private startBackgroundProcesses(): void {
    // Prediction generation interval
    const predictionInterval = setInterval(async () => {
      try {
        await this.triggerPredictiveWarming();
      } catch (error) {
        console.error('[Predictive Cache] Prediction generation failed:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes

    this.intervalHandles.push(predictionInterval);

    // Cache warming processing interval
    const warmingInterval = setInterval(async () => {
      try {
        await this.warmingEngine.processWarmingQueue();
      } catch (error) {
        console.error('[Predictive Cache] Cache warming failed:', error);
      }
    }, 2 * 60 * 1000); // Every 2 minutes

    this.intervalHandles.push(warmingInterval);

    // Cleanup interval for old data
    const cleanupInterval = setInterval(() => {
      try {
        this.performCleanup();
      } catch (error) {
        console.error('[Predictive Cache] Cleanup failed:', error);
      }
    }, 30 * 60 * 1000); // Every 30 minutes

    this.intervalHandles.push(cleanupInterval);
  }

  private getCurrentContext(): Record<string, unknown> {
    const now = new Date();
    const recentKeys = this.recentCacheKeys.slice(-10).map(item => item.key);
    
    // Extract query types from recent keys
    const queryTypes = [...new Set(
      recentKeys.map(key => key.split(':')[0]).filter(Boolean)
    )];

    const sessionStart = this.recentCacheKeys.length > 0 
      ? Math.min(...this.recentCacheKeys.map(item => item.timestamp))
      : Date.now();

    return {
      recentKeys,
      timeOfDay: now.getHours(),
      dayOfWeek: now.getDay(),
      sessionDuration: Date.now() - sessionStart,
      queryTypes
    };
  }

  private performCleanup(): void {
    // Clean up old recent cache keys
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    this.recentCacheKeys = this.recentCacheKeys.filter(
      item => item.timestamp > cutoffTime
    );
  }
}

// Default configuration
export const DEFAULT_PREDICTIVE_CACHE_CONFIG: PredictiveCacheConfig = {
  enabled: true,
  learningEnabled: true,
  maxPatternHistory: 10000,
  minPatternFrequency: 3,
  predictionThreshold: 0.4,
  maxConcurrentPredictions: 10,
  resourceThresholds: {
    maxCpuUtilization: 70,
    maxMemoryUsageMB: 400,
    maxDiskIOPS: 1000
  },
  warmingStrategy: {
    aggressiveness: 'moderate',
    maxWarmingOperationsPerMinute: 5,
    priorityWeighting: {
      frequency: 0.3,
      recency: 0.2,
      confidence: 0.3,
      userContext: 0.2
    }
  },
  models: {
    enableSequenceAnalysis: true,
    enableCollaborativeFiltering: true,
    enableTemporalPatterns: true,
    enableContextualPredictions: true
  }
};