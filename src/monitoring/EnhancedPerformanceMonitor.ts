/**
 * Enhanced Performance Monitor with Dynamic Thresholds
 * 
 * Integrates all dynamic monitoring components:
 * - Dynamic threshold management
 * - Context-aware alerting
 * - System capability profiling
 * - Machine learning optimization
 * - Adaptive resource management
 */

import { EventEmitter } from 'events';
import { DynamicThresholdManager } from './DynamicThresholdManager.js';
import { ContextAwareAlertSystem } from './ContextAwareAlertSystem.js';
import { SystemCapabilityProfiler } from './SystemCapabilityProfiler.js';
import { DatabaseManager } from '../storage/Database.js';
import { MemoryManager } from '../utils/MemoryManager.js';

interface EnhancedMetric {
  id: string;
  category: 'database' | 'search' | 'embedding' | 'memory' | 'network' | 'system';
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent' | 'rate';
  timestamp: number;
  context: {
    systemLoad: number;
    concurrentOperations: number;
    errorRate: number;
    userActivity: number;
  };
  tags?: Record<string, string>;
}

interface AdaptiveAlert {
  id: string;
  originalThreshold: number;
  adaptiveThreshold: number;
  metric: EnhancedMetric;
  severity: 'low' | 'medium' | 'high' | 'critical';
  contextualSeverity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  rootCause?: string;
  recommendedAction?: string;
  predictedDuration: number;
  confidence: number;
  timestamp: number;
}

interface SystemHealthAssessment {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    database: ComponentHealth;
    search: ComponentHealth;
    memory: ComponentHealth;
    system: ComponentHealth;
  };
  adaptiveMetrics: {
    thresholdAccuracy: number;
    alertReduction: number;
    falsePositiveRate: number;
    systemOptimization: number;
  };
  recommendations: Array<{
    category: string;
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimatedImpact: string;
  }>;
  timestamp: number;
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical';
  metrics: Array<{
    name: string;
    current: number;
    threshold: number;
    trend: 'improving' | 'stable' | 'degrading';
  }>;
  lastIssue?: {
    timestamp: number;
    description: string;
    resolved: boolean;
  };
}

export class EnhancedPerformanceMonitor extends EventEmitter {
  private dynamicThresholds: DynamicThresholdManager;
  private contextualAlerts: ContextAwareAlertSystem;
  private systemProfiler: SystemCapabilityProfiler;
  
  private metrics: Map<string, EnhancedMetric[]> = new Map();
  private activeAlerts: Map<string, AdaptiveAlert> = new Map();
  private componentHealth: Map<string, ComponentHealth> = new Map();
  
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  
  private readonly METRICS_RETENTION_HOURS = 48;
  private readonly OPTIMIZATION_INTERVAL_HOURS = 6;
  private readonly HEALTH_CHECK_INTERVAL_SECONDS = 30;

  constructor(
    private readonly dbManager: DatabaseManager,
    private readonly memoryManager: MemoryManager,
    private readonly configPath: string = './data/enhanced-monitoring.json'
  ) {
    super();
    
    this.dynamicThresholds = new DynamicThresholdManager();
    this.contextualAlerts = new ContextAwareAlertSystem();
    this.systemProfiler = new SystemCapabilityProfiler();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the enhanced monitoring system
   */
  async initialize(): Promise<void> {
    console.log('🚀 Initializing Enhanced Performance Monitor...');
    
    // Initialize all components
    await Promise.all([
      this.systemProfiler.profileSystem(),
      this.dynamicThresholds.initialize()
    ]);
    
    // Apply system-specific configuration
    await this.applySystemOptimizedSettings();
    
    // Initialize component health tracking
    this.initializeComponentHealth();
    
    console.log('✅ Enhanced Performance Monitor initialized');
    this.emit('initialized', {
      systemProfile: this.systemProfiler.getProfile(),
      thresholds: this.dynamicThresholds.getAllThresholds()
    });
  }

  /**
   * Start enhanced monitoring with adaptive capabilities
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    console.log('📊 Starting enhanced performance monitoring...');
    
    this.isMonitoring = true;
    
    // Start periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      await this.performHealthChecks();
      await this.collectEnhancedMetrics();
      this.evaluateAdaptiveAlerts();
      this.updateComponentHealth();
      this.cleanupOldMetrics();
    }, this.HEALTH_CHECK_INTERVAL_SECONDS * 1000);

    // Start optimization cycle
    this.optimizationInterval = setInterval(async () => {
      await this.runOptimizationCycle();
    }, this.OPTIMIZATION_INTERVAL_HOURS * 60 * 60 * 1000);

    console.log('🔄 Enhanced monitoring active');
    this.emit('monitoringStarted');
  }

  /**
   * Stop monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    
    this.isMonitoring = false;
    
    // Cleanup components
    await this.dynamicThresholds.shutdown();
    
    console.log('🛑 Enhanced monitoring stopped');
    this.emit('monitoringStopped');
  }

  /**
   * Record an enhanced metric with context
   */
  recordEnhancedMetric(
    category: EnhancedMetric['category'],
    name: string,
    value: number,
    unit: EnhancedMetric['unit'],
    tags?: Record<string, string>
  ): void {
    const context = this.getCurrentSystemContext();
    
    const metric: EnhancedMetric = {
      id: `${category}_${name}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      category,
      name,
      value,
      unit,
      timestamp: Date.now(),
      context,
      tags
    };

    const key = `${category}:${name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    this.metrics.get(key)!.push(metric);
    
    // Update dynamic threshold baseline
    this.dynamicThresholds.updateBaseline(name, category, value);
    
    this.emit('metricRecorded', metric);
  }

  /**
   * Get current system context for monitoring
   */
  private getCurrentSystemContext(): EnhancedMetric['context'] {
    const memoryStats = this.memoryManager.getCurrentStats();
    const systemLoad = (memoryStats.heapUsed / memoryStats.heapTotal) * 0.5 + 0.5; // Simplified load calculation
    
    // Get concurrent operations (would be tracked by the monitoring system)
    const concurrentOperations = this.activeAlerts.size * 2; // Approximation
    
    // Calculate error rate from recent metrics
    const recentErrorMetrics = this.getRecentMetrics('system', 'error', 5 * 60 * 1000);
    const errorRate = recentErrorMetrics.length / Math.max(1, this.getTotalRecentOperations());
    
    return {
      systemLoad,
      concurrentOperations,
      errorRate,
      userActivity: 50 // Placeholder - would come from actual tracking
    };
  }

  /**
   * Apply system-optimized settings based on profiling
   */
  private async applySystemOptimizedSettings(): Promise<void> {
    const profile = this.systemProfiler.getProfile();
    if (!profile) return;
    
    const config = this.systemProfiler.getPerformanceConfig();
    
    console.log(`🎯 Applying ${profile.overallPerformanceClass} performance configuration`);
    
    // Configure memory manager based on system capabilities
    // Note: Memory configuration would be applied to memory manager in production
    
    // Update monitoring intervals based on system capability
    if (profile.overallPerformanceClass === 'exceptional' || profile.overallPerformanceClass === 'high') {
      // More frequent monitoring for high-performance systems
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = setInterval(async () => {
          await this.performHealthChecks();
          await this.collectEnhancedMetrics();
          this.evaluateAdaptiveAlerts();
          this.updateComponentHealth();
          this.cleanupOldMetrics();
        }, 15000); // 15 seconds for high-performance systems
      }
    }

    this.emit('configurationApplied', config);
  }

  /**
   * Initialize component health tracking
   */
  private initializeComponentHealth(): void {
    const components = ['database', 'search', 'memory', 'system'];
    
    for (const component of components) {
      this.componentHealth.set(component, {
        status: 'healthy',
        metrics: [],
        lastIssue: undefined
      });
    }
  }

  /**
   * Perform comprehensive health checks
   */
  private async performHealthChecks(): Promise<void> {
    await Promise.all([
      this.checkDatabaseHealth(),
      this.checkMemoryHealth(),
      this.checkSearchHealth(),
      this.checkSystemHealth()
    ]);
  }

  /**
   * Check database health with adaptive thresholds
   */
  private async checkDatabaseHealth(): Promise<void> {
    try {
      const db = this.dbManager.getConnection();
      
      // Test basic connectivity with timing
      const startTime = Date.now();
      db.prepare('SELECT 1 as test').get();
      const queryDuration = Date.now() - startTime;
      
      // Record metric with context
      this.recordEnhancedMetric('database', 'connectivity_test', queryDuration, 'ms');
      
      // Get adaptive threshold
      const threshold = this.dynamicThresholds.getThreshold('database_query_time') || 500;
      
      // Update component health
      const health = this.componentHealth.get('database')!;
      health.metrics = [
        {
          name: 'connectivity_test',
          current: queryDuration,
          threshold,
          trend: this.calculateTrend('database', 'connectivity_test')
        }
      ];
      
      if (queryDuration > threshold * 2) {
        health.status = 'critical';
        health.lastIssue = {
          timestamp: Date.now(),
          description: `Database connectivity test took ${queryDuration}ms (threshold: ${threshold}ms)`,
          resolved: false
        };
      } else if (queryDuration > threshold) {
        health.status = 'degraded';
      } else {
        health.status = 'healthy';
        if (health.lastIssue && !health.lastIssue.resolved) {
          health.lastIssue.resolved = true;
        }
      }
      
    } catch (error) {
      const health = this.componentHealth.get('database')!;
      health.status = 'critical';
      health.lastIssue = {
        timestamp: Date.now(),
        description: `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        resolved: false
      };
    }
  }

  /**
   * Check memory health with context awareness
   */
  private checkMemoryHealth(): void {
    const memoryReport = this.memoryManager.getMemoryReport();
    const { current, pressure } = memoryReport;
    
    this.recordEnhancedMetric('memory', 'heap_usage', current.heapUsed, 'bytes');
    this.recordEnhancedMetric('memory', 'heap_usage_percent', current.heapUsed / current.heapTotal, 'percent');
    this.recordEnhancedMetric('memory', 'rss', current.rss, 'bytes');
    
    const health = this.componentHealth.get('memory')!;
    const heapUsagePercent = current.heapUsed / current.heapTotal;
    
    health.metrics = [
      {
        name: 'heap_usage_percent',
        current: heapUsagePercent,
        threshold: 0.8, // Would use adaptive threshold
        trend: this.calculateTrend('memory', 'heap_usage_percent')
      }
    ];
    
    // Use pressure level from memory manager
    switch (pressure.level) {
      case 'critical':
        health.status = 'critical';
        break;
      case 'high':
        health.status = 'degraded';
        break;
      default:
        health.status = 'healthy';
    }
    
    if (pressure.level === 'critical' || pressure.level === 'high') {
      health.lastIssue = {
        timestamp: Date.now(),
        description: pressure.recommendation,
        resolved: false
      };
    }
  }

  /**
   * Check search system health
   */
  private async checkSearchHealth(): Promise<void> {
    try {
      const db = this.dbManager.getConnection();
      
      // Test FTS functionality
      const startTime = Date.now();
      db.prepare(`
        SELECT COUNT(*) as count FROM messages_fts 
        WHERE messages_fts MATCH 'test' 
        LIMIT 1
      `).get() as { count: number };
      const searchDuration = Date.now() - startTime;
      
      this.recordEnhancedMetric('search', 'fts_test', searchDuration, 'ms');
      
      const threshold = this.dynamicThresholds.getThreshold('search_response_time') || 1000;
      
      const health = this.componentHealth.get('search')!;
      health.metrics = [
        {
          name: 'fts_test',
          current: searchDuration,
          threshold,
          trend: this.calculateTrend('search', 'fts_test')
        }
      ];
      
      if (searchDuration > threshold * 1.5) {
        health.status = 'critical';
        health.lastIssue = {
          timestamp: Date.now(),
          description: `Search test took ${searchDuration}ms (threshold: ${threshold}ms)`,
          resolved: false
        };
      } else if (searchDuration > threshold) {
        health.status = 'degraded';
      } else {
        health.status = 'healthy';
      }
      
    } catch (error) {
      const health = this.componentHealth.get('search')!;
      health.status = 'critical';
      health.lastIssue = {
        timestamp: Date.now(),
        description: `Search health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        resolved: false
      };
    }
  }

  /**
   * Check overall system health
   */
  private checkSystemHealth(): void {
    const uptime = process.uptime() * 1000;
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    this.recordEnhancedMetric('system', 'uptime', uptime, 'ms');
    this.recordEnhancedMetric('system', 'cpu_time', cpuUsage.user + cpuUsage.system, 'ms');
    
    const health = this.componentHealth.get('system')!;
    const heapMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    
    health.metrics = [
      {
        name: 'memory_usage_mb',
        current: heapMB,
        threshold: 500, // 500MB threshold
        trend: this.calculateTrend('system', 'memory_usage')
      }
    ];
    
    if (heapMB > 1000) {
      health.status = 'critical';
      health.lastIssue = {
        timestamp: Date.now(),
        description: `High system memory usage: ${heapMB}MB`,
        resolved: false
      };
    } else if (heapMB > 500) {
      health.status = 'degraded';
    } else {
      health.status = 'healthy';
    }
  }

  /**
   * Calculate trend for a metric
   */
  private calculateTrend(category: string, metric: string): 'improving' | 'stable' | 'degrading' {
    const key = `${category}:${metric}`;
    const metrics = this.metrics.get(key) || [];
    
    if (metrics.length < 5) return 'stable';
    
    const recent = metrics.slice(-10);
    const firstHalf = recent.slice(0, Math.floor(recent.length / 2));
    const secondHalf = recent.slice(Math.floor(recent.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, m) => sum + m.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, m) => sum + m.value, 0) / secondHalf.length;
    
    const change = (secondAvg - firstAvg) / firstAvg;
    
    if (change < -0.1) return 'improving'; // 10% improvement
    if (change > 0.1) return 'degrading';  // 10% degradation
    return 'stable';
  }

  /**
   * Collect enhanced metrics from all sources
   */
  private async collectEnhancedMetrics(): Promise<void> {
    // System metrics
    const memStats = this.memoryManager.getCurrentStats();
    this.recordEnhancedMetric('memory', 'heap_used', memStats.heapUsed, 'bytes');
    this.recordEnhancedMetric('memory', 'rss', memStats.rss, 'bytes');
    this.recordEnhancedMetric('system', 'uptime', process.uptime() * 1000, 'ms');
    
    // Database metrics (if available)
    try {
      const db = this.dbManager.getConnection();
      const cacheSize = db.pragma('cache_size', { simple: true });
      this.recordEnhancedMetric('database', 'cache_size', cacheSize as number, 'count');
    } catch (error) {
      // Database not available
    }
  }

  /**
   * Evaluate adaptive alerts using context-aware system
   */
  private evaluateAdaptiveAlerts(): void {
    // Process recent metrics for threshold violations
    const recentWindow = 5 * 60 * 1000; // 5 minutes
    const now = Date.now();
    
    for (const [key, metrics] of this.metrics.entries()) {
      const recentMetrics = metrics.filter(m => now - m.timestamp <= recentWindow);
      if (recentMetrics.length === 0) continue;
      
      const [category, metricName] = key.split(':');
      const thresholdKey = `${category}_${metricName}`;
      const threshold = this.dynamicThresholds.getThreshold(thresholdKey);
      
      if (!threshold) continue;
      
      // Check for violations
      const violations = recentMetrics.filter(m => {
        if (metricName.includes('percent') || metricName.includes('usage')) {
          return m.value > threshold;
        } else {
          return m.value > threshold;
        }
      });
      
      if (violations.length > 0) {
        const latestViolation = violations[violations.length - 1];
        this.processPotentialAlert(latestViolation, threshold, thresholdKey);
      }
    }
  }

  /**
   * Process potential alert through context-aware system
   */
  private async processPotentialAlert(
    metric: EnhancedMetric,
    threshold: number,
    thresholdId: string
  ): Promise<void> {
    // Determine base severity
    const exceedanceRatio = metric.value / threshold;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (exceedanceRatio > 2) severity = 'critical';
    else if (exceedanceRatio > 1.5) severity = 'high';
    else if (exceedanceRatio > 1.2) severity = 'medium';
    
    const message = `${metric.category} ${metric.name}: ${metric.value.toFixed(2)} ${metric.unit} exceeds threshold ${threshold.toFixed(2)} ${metric.unit}`;
    
    // Process through context-aware alert system
    const contextualAlert = await this.contextualAlerts.processAlert(
      metric.name,
      metric.category,
      metric.value,
      threshold,
      severity,
      message
    );
    
    if (contextualAlert) {
      // Convert to adaptive alert format
      const adaptiveAlert: AdaptiveAlert = {
        id: contextualAlert.id,
        originalThreshold: threshold,
        adaptiveThreshold: threshold, // Would be adjusted based on context
        metric,
        severity,
        contextualSeverity: contextualAlert.adjustedSeverity,
        message: contextualAlert.message,
        rootCause: contextualAlert.rootCauseAnalysis.suspectedCause,
        recommendedAction: contextualAlert.actionableInsights[0],
        predictedDuration: contextualAlert.predictedDuration,
        confidence: contextualAlert.rootCauseAnalysis.confidence,
        timestamp: contextualAlert.timestamp
      };
      
      this.activeAlerts.set(adaptiveAlert.id, adaptiveAlert);
      
      // Record training data
      this.dynamicThresholds.recordTrainingData(
        { [thresholdId]: metric.value },
        1, // Alert count
        contextualAlert.adjustedSeverity !== severity ? 1 : 0, // False positive if severity was downgraded
        0 // Missed issues (not tracked here)
      );
      
      this.emit('adaptiveAlert', adaptiveAlert);
    }
  }

  /**
   * Update component health based on recent metrics and alerts
   */
  private updateComponentHealth(): void {
    for (const [component, health] of this.componentHealth.entries()) {
      // Check for recent alerts affecting this component
      const componentAlerts = Array.from(this.activeAlerts.values())
        .filter(alert => alert.metric.category === component);
      
      if (componentAlerts.length > 0) {
        const criticalAlerts = componentAlerts.filter(a => a.contextualSeverity === 'critical');
        const highAlerts = componentAlerts.filter(a => a.contextualSeverity === 'high');
        
        if (criticalAlerts.length > 0) {
          health.status = 'critical';
        } else if (highAlerts.length > 0) {
          health.status = 'degraded';
        }
      }
      
      // Update trends for component metrics
      for (const metric of health.metrics) {
        metric.trend = this.calculateTrend(component, metric.name);
      }
    }
  }

  /**
   * Run optimization cycle
   */
  private async runOptimizationCycle(): Promise<void> {
    console.log('🔄 Running monitoring optimization cycle...');
    
    try {
      // Run threshold optimization
      const optimizationResult = await this.dynamicThresholds.optimizeThresholds();
      
      if (optimizationResult.confidence > 0.7) {
        await this.dynamicThresholds.applyOptimizationRecommendations(optimizationResult);
        console.log(`✅ Applied ${optimizationResult.recommendedThresholds.size} threshold optimizations`);
      }
      
      // Update system profile if significant time has passed
      const profile = this.systemProfiler.getProfile();
      if (profile && Date.now() - profile.timestamp > 7 * 24 * 60 * 60 * 1000) { // 7 days
        console.log('🔄 Refreshing system profile...');
        await this.systemProfiler.forceReprofile();
        await this.applySystemOptimizedSettings();
      }
      
      this.emit('optimizationCycleComplete', optimizationResult);
      
    } catch (error) {
      console.error('❌ Error in optimization cycle:', error);
    }
  }

  /**
   * Get comprehensive system health assessment
   */
  getSystemHealthAssessment(): SystemHealthAssessment {
    const components = {
      database: this.componentHealth.get('database')!,
      search: this.componentHealth.get('search')!,
      memory: this.componentHealth.get('memory')!,
      system: this.componentHealth.get('system')!
    };
    
    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    const statuses = Object.values(components).map(c => c.status);
    
    if (statuses.includes('critical')) {
      overall = 'critical';
    } else if (statuses.includes('degraded')) {
      overall = 'degraded';
    }
    
    // Calculate adaptive metrics
    const thresholdReport = this.dynamicThresholds.getThresholdReport();
    const alertSystem = this.contextualAlerts.getSystemStatus();
    
    const adaptiveMetrics = {
      thresholdAccuracy: thresholdReport.confidence,
      alertReduction: Math.max(0, 1 - (alertSystem.activeAlerts.length / 10)), // Normalized
      falsePositiveRate: 0.05, // Would be calculated from actual data
      systemOptimization: thresholdReport.confidence
    };
    
    // Generate recommendations
    const recommendations = this.generateSystemRecommendations(components, adaptiveMetrics);
    
    return {
      overall,
      components,
      adaptiveMetrics,
      recommendations,
      timestamp: Date.now()
    };
  }

  /**
   * Generate system recommendations
   */
  private generateSystemRecommendations(
    components: SystemHealthAssessment['components'],
    metrics: SystemHealthAssessment['adaptiveMetrics']
  ): SystemHealthAssessment['recommendations'] {
    const recommendations: SystemHealthAssessment['recommendations'] = [];
    
    // Component-specific recommendations
    for (const [name, health] of Object.entries(components)) {
      if (health.status === 'critical') {
        recommendations.push({
          category: name,
          action: `Immediate attention required for ${name} component`,
          priority: 'high',
          estimatedImpact: 'Critical system stability'
        });
      } else if (health.status === 'degraded') {
        recommendations.push({
          category: name,
          action: `Monitor and optimize ${name} performance`,
          priority: 'medium',
          estimatedImpact: 'Improved response times'
        });
      }
      
      // Trend-based recommendations
      const degradingMetrics = health.metrics.filter(m => m.trend === 'degrading');
      if (degradingMetrics.length > 0) {
        recommendations.push({
          category: name,
          action: `Address degrading trend in ${degradingMetrics.map(m => m.name).join(', ')}`,
          priority: 'medium',
          estimatedImpact: 'Prevent future issues'
        });
      }
    }
    
    // Adaptive system recommendations
    if (metrics.thresholdAccuracy < 0.7) {
      recommendations.push({
        category: 'monitoring',
        action: 'Increase threshold training period for better accuracy',
        priority: 'medium',
        estimatedImpact: 'Reduced false alerts'
      });
    }
    
    if (metrics.falsePositiveRate > 0.15) {
      recommendations.push({
        category: 'alerting',
        action: 'Tune alert suppression rules to reduce noise',
        priority: 'low',
        estimatedImpact: 'Better alert quality'
      });
    }
    
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  // Helper methods

  private getRecentMetrics(category: string, name: string, windowMs: number): EnhancedMetric[] {
    const key = `${category}:${name}`;
    const metrics = this.metrics.get(key) || [];
    const cutoff = Date.now() - windowMs;
    return metrics.filter(m => m.timestamp > cutoff);
  }

  private getTotalRecentOperations(): number {
    // Simplified calculation - would be more sophisticated in production
    let total = 0;
    const windowMs = 5 * 60 * 1000; // 5 minutes
    
    for (const _metrics of this.metrics.values()) {
      total += this.getRecentMetrics('database', 'query', windowMs).length;
      total += this.getRecentMetrics('search', 'search', windowMs).length;
    }
    
    return Math.max(total, 1);
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - (this.METRICS_RETENTION_HOURS * 60 * 60 * 1000);
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(key, filteredMetrics);
    }
    
    // Cleanup resolved alerts older than 24 hours
    const alertCutoff = Date.now() - (24 * 60 * 60 * 1000);
    for (const [id, alert] of this.activeAlerts.entries()) {
      if (alert.timestamp < alertCutoff) {
        this.activeAlerts.delete(id);
      }
    }
  }

  private setupEventHandlers(): void {
    // Handle threshold adaptations
    this.dynamicThresholds.on('thresholdAdapted', (data) => {
      console.log(`🎯 Threshold adapted: ${data.id} (confidence: ${data.confidence.toFixed(2)})`);
      this.emit('thresholdAdapted', data);
    });
    
    // Handle contextual alerts
    this.contextualAlerts.on('alert:processed', (alert) => {
      console.log(`🚨 Contextual alert processed: ${alert.adjustedSeverity} - ${alert.message}`);
      this.emit('contextualAlert', alert);
    });
    
    // Handle system profiling
    this.systemProfiler.on('profileComplete', (profile) => {
      console.log(`📊 System profile updated: ${profile.overallPerformanceClass} class`);
      this.emit('systemProfileUpdated', profile);
    });
  }

  /**
   * Get enhanced monitoring status
   */
  getMonitoringStatus(): {
    isActive: boolean;
    systemProfile: any;
    activeAlerts: number;
    thresholdAccuracy: number;
    componentHealth: any;
    recommendations: number;
  } {
    const healthAssessment = this.getSystemHealthAssessment();
    
    return {
      isActive: this.isMonitoring,
      systemProfile: this.systemProfiler.getProfile(),
      activeAlerts: this.activeAlerts.size,
      thresholdAccuracy: healthAssessment.adaptiveMetrics.thresholdAccuracy,
      componentHealth: healthAssessment.components,
      recommendations: healthAssessment.recommendations.length
    };
  }
}