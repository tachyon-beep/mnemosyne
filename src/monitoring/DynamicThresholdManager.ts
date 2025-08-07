/**
 * Dynamic Threshold Management System
 * 
 * Provides adaptive performance thresholds that automatically adjust based on:
 * - System hardware capabilities
 * - Historical performance patterns
 * - Current system load
 * - Environmental conditions
 * - Machine learning optimization
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as fs from 'fs/promises';
import * as path from 'path';

interface SystemCapabilities {
  cpuCores: number;
  cpuSpeed: number; // MHz
  totalMemory: number; // bytes
  availableMemory: number; // bytes
  diskSpeed: number; // MB/s (estimated)
  platform: string;
  nodeVersion: string;
  architecture: string;
}

interface PerformanceBaseline {
  metric: string;
  category: string;
  percentile50: number;
  percentile95: number;
  percentile99: number;
  mean: number;
  standardDeviation: number;
  sampleCount: number;
  lastUpdated: number;
}

interface DynamicThreshold {
  id: string;
  metric: string;
  category: string;
  baseValue: number;
  currentValue: number;
  confidence: number; // 0-1, how confident we are in this threshold
  adaptationRate: number; // How quickly it adapts (0-1)
  lastAdjustment: number;
  adjustmentHistory: Array<{
    timestamp: number;
    oldValue: number;
    newValue: number;
    reason: string;
    confidence: number;
  }>;
}

interface SystemContext {
  currentLoad: {
    cpu: number; // 0-1
    memory: number; // 0-1
    io: number; // 0-1 (estimated)
  };
  recentActivity: {
    queryCount: number;
    errorCount: number;
    averageResponseTime: number;
  };
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  isUnderLoad: boolean;
}

interface ThresholdOptimizationResult {
  recommendedThresholds: Map<string, number>;
  confidence: number;
  reasoning: string[];
  estimatedImprovement: number;
}

interface MLTrainingData {
  timestamp: number;
  systemContext: SystemContext;
  performanceMetrics: Record<string, number>;
  thresholds: Record<string, number>;
  alertCount: number;
  falsePositiveCount: number;
  missedIssueCount: number;
}

export class DynamicThresholdManager extends EventEmitter {
  private systemCapabilities: SystemCapabilities | null = null;
  private baselines: Map<string, PerformanceBaseline> = new Map();
  private thresholds: Map<string, DynamicThreshold> = new Map();
  private trainingData: MLTrainingData[] = [];
  private contextHistory: SystemContext[] = [];
  
  private readonly BASELINE_WINDOW_HOURS = 168; // 1 week
  private readonly TRAINING_DATA_RETENTION_DAYS = 30;
  private readonly MIN_SAMPLES_FOR_ADAPTATION = 100;
  private readonly CONFIDENCE_THRESHOLD = 0.7;
  
  private profilingInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(
    private readonly configPath: string = './data/dynamic-thresholds.json'
  ) {
    super();
  }

  /**
   * Initialize the dynamic threshold system
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🔧 Initializing Dynamic Threshold Manager...');
    
    // Profile system capabilities
    await this.profileSystemCapabilities();
    
    // Load existing data
    await this.loadPersistedData();
    
    // Initialize default thresholds based on system capabilities
    this.initializeDefaultThresholds();
    
    // Start continuous monitoring
    this.startContinuousMonitoring();
    
    this.isInitialized = true;
    console.log('✅ Dynamic Threshold Manager initialized');
    this.emit('initialized', this.systemCapabilities);
  }

  /**
   * Profile system hardware and software capabilities
   */
  private async profileSystemCapabilities(): Promise<void> {
    console.log('📊 Profiling system capabilities...');
    
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    
    // Estimate disk speed with a simple benchmark
    const diskSpeed = await this.benchmarkDiskSpeed();
    
    this.systemCapabilities = {
      cpuCores: cpus.length,
      cpuSpeed: cpus[0]?.speed || 0,
      totalMemory,
      availableMemory: freeMemory,
      diskSpeed,
      platform: os.platform(),
      nodeVersion: process.version,
      architecture: os.arch()
    };

    console.log('💻 System Profile:', {
      cores: this.systemCapabilities.cpuCores,
      memory: `${Math.round(totalMemory / 1024 / 1024 / 1024)}GB`,
      diskSpeed: `${diskSpeed.toFixed(1)}MB/s`,
      platform: this.systemCapabilities.platform
    });
  }

  /**
   * Benchmark disk I/O performance
   */
  private async benchmarkDiskSpeed(): Promise<number> {
    try {
      const testFile = path.join(os.tmpdir(), 'disk-speed-test.tmp');
      const testData = Buffer.alloc(1024 * 1024, 'x'); // 1MB of data
      const iterations = 10;
      
      let totalTime = 0;
      
      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        await fs.writeFile(testFile, testData);
        await fs.readFile(testFile);
        const endTime = process.hrtime.bigint();
        
        totalTime += Number(endTime - startTime) / 1e6; // Convert to milliseconds
      }
      
      // Clean up
      try {
        await fs.unlink(testFile);
      } catch (error) {
        // Ignore cleanup errors
      }
      
      const averageTime = totalTime / iterations;
      const mbPerSecond = (2 * 1024 * 1024) / (averageTime / 1000); // 2MB (read + write) per operation
      
      return mbPerSecond / (1024 * 1024); // Convert to MB/s
      
    } catch (error) {
      console.warn('⚠️ Could not benchmark disk speed:', error);
      return 100; // Default estimate
    }
  }

  /**
   * Initialize default thresholds based on system capabilities
   */
  private initializeDefaultThresholds(): void {
    if (!this.systemCapabilities) {
      throw new Error('System capabilities not profiled');
    }

    // Calculate capability-adjusted thresholds
    const memoryFactor = Math.min(this.systemCapabilities.totalMemory / (4 * 1024 * 1024 * 1024), 2); // Normalize to 4GB baseline, cap at 2x
    const cpuFactor = Math.min(this.systemCapabilities.cpuCores / 4, 2); // Normalize to 4 cores, cap at 2x
    const diskFactor = Math.min(this.systemCapabilities.diskSpeed / 100, 2); // Normalize to 100MB/s, cap at 2x
    
    const defaultThresholds = [
      {
        id: 'database_query_time',
        metric: 'query_duration',
        category: 'database',
        baseValue: Math.max(200, 1000 / (cpuFactor * diskFactor)) // Faster systems get lower thresholds
      },
      {
        id: 'search_response_time',
        metric: 'search_duration',
        category: 'search',
        baseValue: Math.max(500, 2000 / cpuFactor)
      },
      {
        id: 'memory_usage_warning',
        metric: 'heap_usage_percent',
        category: 'memory',
        baseValue: Math.min(0.85, 0.6 + (0.2 * memoryFactor)) // More memory allows higher thresholds
      },
      {
        id: 'embedding_generation_time',
        metric: 'embedding_duration',
        category: 'embedding',
        baseValue: Math.max(100, 500 / cpuFactor)
      },
      {
        id: 'cache_miss_rate',
        metric: 'cache_miss_rate',
        category: 'cache',
        baseValue: Math.min(0.4, 0.2 + (0.1 / memoryFactor)) // Less memory = lower miss tolerance
      }
    ];

    for (const threshold of defaultThresholds) {
      this.thresholds.set(threshold.id, {
        ...threshold,
        currentValue: threshold.baseValue,
        confidence: 0.5, // Medium confidence for system-calculated defaults
        adaptationRate: 0.1, // Conservative adaptation
        lastAdjustment: Date.now(),
        adjustmentHistory: []
      });
    }

    console.log('🎯 Initialized adaptive thresholds based on system capabilities');
  }

  /**
   * Get current threshold for a metric
   */
  getThreshold(metricId: string): number | null {
    const threshold = this.thresholds.get(metricId);
    return threshold ? threshold.currentValue : null;
  }

  /**
   * Get all current thresholds
   */
  getAllThresholds(): Map<string, DynamicThreshold> {
    return new Map(this.thresholds);
  }

  /**
   * Update performance baseline with new metric data
   */
  updateBaseline(metric: string, category: string, value: number): void {
    const key = `${category}:${metric}`;
    let baseline = this.baselines.get(key);
    
    if (!baseline) {
      baseline = {
        metric,
        category,
        percentile50: value,
        percentile95: value,
        percentile99: value,
        mean: value,
        standardDeviation: 0,
        sampleCount: 1,
        lastUpdated: Date.now()
      };
    } else {
      // Exponential weighted moving average for continuous updates
      const alpha = Math.min(0.1, 1.0 / baseline.sampleCount);
      baseline.mean = baseline.mean * (1 - alpha) + value * alpha;
      
      // Simple running standard deviation approximation
      const variance = Math.pow(value - baseline.mean, 2);
      baseline.standardDeviation = Math.sqrt(
        baseline.standardDeviation * baseline.standardDeviation * (1 - alpha) + variance * alpha
      );
      
      baseline.sampleCount++;
      baseline.lastUpdated = Date.now();
      
      // Update percentiles periodically (simplified approach)
      if (baseline.sampleCount % 100 === 0) {
        // These would be updated with actual percentile calculations in a full implementation
        baseline.percentile50 = baseline.mean;
        baseline.percentile95 = baseline.mean + baseline.standardDeviation * 1.645;
        baseline.percentile99 = baseline.mean + baseline.standardDeviation * 2.326;
      }
    }
    
    this.baselines.set(key, baseline);
    
    // Trigger threshold adaptation if we have enough samples
    if (baseline.sampleCount >= this.MIN_SAMPLES_FOR_ADAPTATION &&
        baseline.sampleCount % 50 === 0) {
      this.adaptThreshold(metric, category, baseline);
    }
  }

  /**
   * Adapt threshold based on baseline performance
   */
  private adaptThreshold(metric: string, category: string, baseline: PerformanceBaseline): void {
    const thresholdKey = `${category}_${metric}`;
    const threshold = this.thresholds.get(thresholdKey);
    
    if (!threshold || threshold.confidence < this.CONFIDENCE_THRESHOLD) {
      return;
    }

    // Calculate new threshold based on percentiles and current system context
    const context = this.getCurrentSystemContext();
    let newValue: number;
    
    // Use different strategies based on metric type
    if (metric.includes('duration') || metric.includes('time')) {
      // For latency metrics, use 95th percentile with context adjustment
      newValue = baseline.percentile95;
      
      // Adjust for current load
      if (context.isUnderLoad) {
        newValue *= 1.5; // More lenient during high load
      } else {
        newValue *= 0.8; // More strict during normal load
      }
      
    } else if (metric.includes('usage') || metric.includes('percent')) {
      // For utilization metrics, be more conservative
      newValue = Math.min(baseline.percentile95, baseline.mean + 2 * baseline.standardDeviation);
      
    } else {
      // For other metrics, use mean + 2 standard deviations
      newValue = baseline.mean + 2 * baseline.standardDeviation;
    }

    // Ensure the new value is reasonable (not too extreme)
    const changeRatio = Math.abs(newValue - threshold.currentValue) / threshold.currentValue;
    if (changeRatio > 0.5) {
      // Cap changes to 50% to avoid extreme swings
      newValue = threshold.currentValue * (newValue > threshold.currentValue ? 1.5 : 0.5);
    }

    // Apply adaptation rate
    const adaptedValue = threshold.currentValue + 
      (newValue - threshold.currentValue) * threshold.adaptationRate;

    // Update threshold
    const oldValue = threshold.currentValue;
    threshold.currentValue = adaptedValue;
    threshold.lastAdjustment = Date.now();
    threshold.confidence = Math.min(0.95, threshold.confidence + 0.05);
    
    threshold.adjustmentHistory.push({
      timestamp: Date.now(),
      oldValue,
      newValue: adaptedValue,
      reason: `Baseline adaptation: ${baseline.sampleCount} samples, P95=${baseline.percentile95.toFixed(2)}`,
      confidence: threshold.confidence
    });

    // Keep adjustment history manageable
    if (threshold.adjustmentHistory.length > 50) {
      threshold.adjustmentHistory = threshold.adjustmentHistory.slice(-25);
    }

    console.log(`🔄 Adapted threshold ${thresholdKey}: ${oldValue.toFixed(2)} → ${adaptedValue.toFixed(2)} (confidence: ${threshold.confidence.toFixed(2)})`);
    
    this.emit('thresholdAdapted', {
      id: thresholdKey,
      oldValue,
      newValue: adaptedValue,
      confidence: threshold.confidence,
      baseline
    });
  }

  /**
   * Get current system context for threshold adaptation
   */
  private getCurrentSystemContext(): SystemContext {
    const cpuUsage = os.loadavg()[0] / os.cpus().length; // 1-minute load average per core
    const memoryUsage = 1 - (os.freemem() / os.totalmem());
    
    // Estimate I/O load (simplified)
    const ioLoad = Math.min(1, (cpuUsage + memoryUsage) / 2);
    
    const now = new Date();
    const timeOfDay = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Determine if system is under load
    const isUnderLoad = cpuUsage > 0.7 || memoryUsage > 0.8 || ioLoad > 0.7;
    
    const context: SystemContext = {
      currentLoad: {
        cpu: cpuUsage,
        memory: memoryUsage,
        io: ioLoad
      },
      recentActivity: {
        queryCount: 0, // Would be populated by monitoring system
        errorCount: 0,
        averageResponseTime: 0
      },
      timeOfDay,
      dayOfWeek,
      isUnderLoad
    };

    // Store context history for ML training
    this.contextHistory.push(context);
    if (this.contextHistory.length > 1000) {
      this.contextHistory = this.contextHistory.slice(-500);
    }

    return context;
  }

  /**
   * Optimize thresholds using machine learning approach
   */
  async optimizeThresholds(): Promise<ThresholdOptimizationResult> {
    if (this.trainingData.length < 100) {
      return {
        recommendedThresholds: new Map(),
        confidence: 0,
        reasoning: ['Insufficient training data for ML optimization'],
        estimatedImprovement: 0
      };
    }

    console.log('🤖 Running ML-based threshold optimization...');
    
    const recommendations: Map<string, number> = new Map();
    const reasoning: string[] = [];
    
    // Analyze correlation between thresholds and alert quality
    const thresholdPerformance = this.analyzeThresholdPerformance();
    
    for (const [thresholdId, performance] of thresholdPerformance.entries()) {
      const current = this.thresholds.get(thresholdId);
      if (!current) continue;
      
      // Simple optimization: minimize false positives while maintaining sensitivity
      const optimalValue = this.findOptimalThreshold(thresholdId, performance);
      
      if (Math.abs(optimalValue - current.currentValue) / current.currentValue > 0.1) {
        recommendations.set(thresholdId, optimalValue);
        reasoning.push(
          `${thresholdId}: ${current.currentValue.toFixed(2)} → ${optimalValue.toFixed(2)} ` +
          `(FP rate: ${(performance.falsePositiveRate * 100).toFixed(1)}%)`
        );
      }
    }

    const confidence = Math.min(0.9, this.trainingData.length / 1000);
    const estimatedImprovement = recommendations.size * 0.1; // Rough estimate
    
    console.log(`🎯 Optimization complete: ${recommendations.size} recommendations`);
    
    return {
      recommendedThresholds: recommendations,
      confidence,
      reasoning,
      estimatedImprovement
    };
  }

  /**
   * Analyze threshold performance from training data
   */
  private analyzeThresholdPerformance(): Map<string, {
    falsePositiveRate: number;
    missedIssueRate: number;
    optimalRange: [number, number];
  }> {
    const performance = new Map();
    
    // Group training data by threshold values
    const thresholdGroups = new Map<string, MLTrainingData[]>();
    
    for (const data of this.trainingData) {
      for (const [thresholdId, value] of Object.entries(data.thresholds)) {
        if (!thresholdGroups.has(thresholdId)) {
          thresholdGroups.set(thresholdId, []);
        }
        thresholdGroups.get(thresholdId)!.push(data);
      }
    }
    
    for (const [thresholdId, dataPoints] of thresholdGroups.entries()) {
      const totalAlerts = dataPoints.reduce((sum, d) => sum + d.alertCount, 0);
      const falsePositives = dataPoints.reduce((sum, d) => sum + d.falsePositiveCount, 0);
      const missedIssues = dataPoints.reduce((sum, d) => sum + d.missedIssueCount, 0);
      
      const falsePositiveRate = totalAlerts > 0 ? falsePositives / totalAlerts : 0;
      const missedIssueRate = missedIssues / dataPoints.length;
      
      // Calculate optimal range (simplified approach)
      const values = dataPoints.map(d => d.thresholds[thresholdId]).filter(v => v !== undefined);
      values.sort((a, b) => a - b);
      const optimalRange: [number, number] = [
        values[Math.floor(values.length * 0.1)],
        values[Math.floor(values.length * 0.9)]
      ];
      
      performance.set(thresholdId, {
        falsePositiveRate,
        missedIssueRate,
        optimalRange
      });
    }
    
    return performance;
  }

  /**
   * Find optimal threshold value using performance data
   */
  private findOptimalThreshold(thresholdId: string, performance: {
    falsePositiveRate: number;
    missedIssueRate: number;
    optimalRange: [number, number];
  }): number {
    // Simple approach: balance false positives and missed issues
    const [min, max] = performance.optimalRange;
    const targetFPRate = 0.1; // 10% false positive rate target
    
    if (performance.falsePositiveRate > targetFPRate) {
      // Too many false positives, increase threshold (be more lenient)
      return min + (max - min) * 0.7;
    } else if (performance.missedIssueRate > 0.2) {
      // Too many missed issues, decrease threshold (be more strict)
      return min + (max - min) * 0.3;
    }
    
    // Balanced approach
    return min + (max - min) * 0.5;
  }

  /**
   * Apply ML optimization recommendations
   */
  async applyOptimizationRecommendations(result: ThresholdOptimizationResult): Promise<void> {
    if (result.confidence < 0.6) {
      console.warn('⚠️ Optimization confidence too low, skipping application');
      return;
    }

    let appliedCount = 0;
    
    for (const [thresholdId, recommendedValue] of result.recommendedThresholds.entries()) {
      const threshold = this.thresholds.get(thresholdId);
      if (!threshold) continue;
      
      const oldValue = threshold.currentValue;
      threshold.currentValue = recommendedValue;
      threshold.lastAdjustment = Date.now();
      threshold.confidence = Math.min(0.95, result.confidence);
      
      threshold.adjustmentHistory.push({
        timestamp: Date.now(),
        oldValue,
        newValue: recommendedValue,
        reason: `ML optimization (confidence: ${result.confidence.toFixed(2)})`,
        confidence: result.confidence
      });
      
      appliedCount++;
    }
    
    console.log(`✅ Applied ${appliedCount} ML optimization recommendations`);
    this.emit('optimizationApplied', { count: appliedCount, confidence: result.confidence });
    
    // Save updated thresholds
    await this.persistData();
  }

  /**
   * Record training data for ML optimization
   */
  recordTrainingData(
    performanceMetrics: Record<string, number>,
    alertCount: number,
    falsePositiveCount: number = 0,
    missedIssueCount: number = 0
  ): void {
    const context = this.getCurrentSystemContext();
    const currentThresholds: Record<string, number> = {};
    
    for (const [id, threshold] of this.thresholds.entries()) {
      currentThresholds[id] = threshold.currentValue;
    }
    
    this.trainingData.push({
      timestamp: Date.now(),
      systemContext: context,
      performanceMetrics,
      thresholds: currentThresholds,
      alertCount,
      falsePositiveCount,
      missedIssueCount
    });
    
    // Clean up old training data
    const cutoff = Date.now() - (this.TRAINING_DATA_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    this.trainingData = this.trainingData.filter(d => d.timestamp > cutoff);
  }

  /**
   * Get comprehensive threshold report
   */
  getThresholdReport(): {
    systemCapabilities: SystemCapabilities | null;
    currentThresholds: Array<DynamicThreshold & { baseline?: PerformanceBaseline }>;
    recentAdjustments: Array<{
      thresholdId: string;
      adjustment: any;
    }>;
    recommendations: string[];
    systemLoad: SystemContext;
    confidence: number;
  } {
    const currentThresholds = Array.from(this.thresholds.values()).map(threshold => {
      const baselineKey = `${threshold.category}:${threshold.metric}`;
      const baseline = this.baselines.get(baselineKey);
      return { ...threshold, baseline };
    });

    // Get recent adjustments
    const recentAdjustments: Array<{ thresholdId: string; adjustment: any }> = [];
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [id, threshold] of this.thresholds.entries()) {
      const recentAdjustment = threshold.adjustmentHistory
        .filter(adj => adj.timestamp > oneDayAgo)
        .slice(-1)[0];
      
      if (recentAdjustment) {
        recentAdjustments.push({ thresholdId: id, adjustment: recentAdjustment });
      }
    }

    // Generate recommendations
    const recommendations: string[] = [];
    const avgConfidence = currentThresholds.reduce((sum, t) => sum + t.confidence, 0) / currentThresholds.length;
    
    if (avgConfidence < 0.7) {
      recommendations.push('Threshold confidence is low - consider running more training cycles');
    }
    
    const recentlyAdjusted = currentThresholds.filter(t => 
      Date.now() - t.lastAdjustment < 60 * 60 * 1000 // Last hour
    );
    
    if (recentlyAdjusted.length > 0) {
      recommendations.push(`${recentlyAdjusted.length} thresholds were recently adjusted - monitor for stability`);
    }

    return {
      systemCapabilities: this.systemCapabilities,
      currentThresholds,
      recentAdjustments,
      recommendations,
      systemLoad: this.getCurrentSystemContext(),
      confidence: avgConfidence
    };
  }

  /**
   * Start continuous monitoring and optimization
   */
  private startContinuousMonitoring(): void {
    // Profile system context every 30 seconds
    this.profilingInterval = setInterval(() => {
      this.getCurrentSystemContext();
    }, 30000);

    // Run optimization every hour
    this.optimizationInterval = setInterval(async () => {
      try {
        const result = await this.optimizeThresholds();
        if (result.confidence > 0.7 && result.recommendedThresholds.size > 0) {
          await this.applyOptimizationRecommendations(result);
        }
      } catch (error) {
        console.error('❌ Error during threshold optimization:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  /**
   * Persist threshold data to disk
   */
  private async persistData(): Promise<void> {
    try {
      const data = {
        version: '1.0.0',
        timestamp: Date.now(),
        systemCapabilities: this.systemCapabilities,
        thresholds: Array.from(this.thresholds.entries()),
        baselines: Array.from(this.baselines.entries()),
        trainingData: this.trainingData.slice(-1000) // Keep last 1000 entries
      };

      await fs.writeFile(this.configPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Failed to persist threshold data:', error);
    }
  }

  /**
   * Load persisted threshold data
   */
  private async loadPersistedData(): Promise<void> {
    try {
      const data = JSON.parse(await fs.readFile(this.configPath, 'utf-8'));
      
      if (data.version === '1.0.0') {
        if (data.thresholds) {
          this.thresholds = new Map(data.thresholds);
        }
        if (data.baselines) {
          this.baselines = new Map(data.baselines);
        }
        if (data.trainingData) {
          this.trainingData = data.trainingData;
        }
        
        console.log(`📥 Loaded persisted threshold data (${this.thresholds.size} thresholds, ${this.baselines.size} baselines)`);
      }
    } catch (error) {
      console.log('📁 No existing threshold data found, starting fresh');
    }
  }

  /**
   * Cleanup resources
   */
  async shutdown(): Promise<void> {
    if (this.profilingInterval) {
      clearInterval(this.profilingInterval);
    }
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
    
    // Final data persistence
    await this.persistData();
    
    console.log('🔒 Dynamic Threshold Manager shut down');
  }
}