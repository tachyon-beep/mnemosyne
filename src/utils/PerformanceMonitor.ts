/**
 * Performance Monitoring System - Production-grade monitoring and alerting
 * 
 * Provides comprehensive performance tracking, alerting, and health checking
 * for all system components in production environments.
 */

import { EventEmitter } from 'events';
import { DatabaseManager } from '../storage/Database.js';
import { MemoryManager } from './MemoryManager.js';

interface PerformanceMetric {
  id: string;
  category: 'database' | 'search' | 'embedding' | 'memory' | 'network' | 'system';
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percent' | 'rate';
  timestamp: number;
  tags?: Record<string, string>;
}

interface AlertRule {
  id: string;
  category: string;
  metric: string;
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  duration: number; // ms - how long condition must persist
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  description: string;
}

interface Alert {
  id: string;
  ruleId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: PerformanceMetric;
  triggeredAt: number;
  resolvedAt?: number;
  acknowledged?: boolean;
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  lastCheck: number;
  duration: number;
  details?: Record<string, any>;
}

interface PerformanceReport {
  timestamp: number;
  duration: number; // reporting period in ms
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    errorRate: number;
    memoryUsage: number;
    activeAlerts: number;
  };
  metrics: {
    database: Record<string, number>;
    search: Record<string, number>;
    embedding: Record<string, number>;
    memory: Record<string, number>;
    system: Record<string, number>;
  };
  healthChecks: HealthCheck[];
  alerts: Alert[];
  recommendations: string[];
}

export class PerformanceMonitor extends EventEmitter {
  private dbManager: DatabaseManager;
  private memoryManager: MemoryManager;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private healthChecks: Map<string, HealthCheck> = new Map();
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metricsRetentionMs: number;
  private alertCooldownMs: number;
  private isMonitoring = false;

  // Performance baselines and thresholds
  private readonly PERFORMANCE_THRESHOLDS = {
    DATABASE_QUERY_TIME: 500,    // ms
    SEARCH_RESPONSE_TIME: 1000,  // ms
    EMBEDDING_TIME: 200,         // ms
    MEMORY_USAGE: 0.8,           // 80% of available memory
    ERROR_RATE: 0.05,            // 5% error rate
    CACHE_HIT_RATE: 0.7          // 70% cache hit rate
  };

  constructor(
    dbManager: DatabaseManager,
    memoryManager: MemoryManager,
    options: {
      metricsRetentionHours?: number;
      alertCooldownMinutes?: number;
      monitoringIntervalSeconds?: number;
    } = {}
  ) {
    super();
    
    this.dbManager = dbManager;
    this.memoryManager = memoryManager;
    this.metricsRetentionMs = (options.metricsRetentionHours || 24) * 60 * 60 * 1000;
    this.alertCooldownMs = (options.alertCooldownMinutes || 5) * 60 * 1000;

    this.setupDefaultAlertRules();
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalSeconds: number = 30): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.runHealthChecks();
      this.evaluateAlerts();
      this.cleanupOldMetrics();
    }, intervalSeconds * 1000);

    console.log(`Performance monitoring started (interval: ${intervalSeconds}s)`);
    this.emit('monitoring:started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.isMonitoring = false;
    
    console.log('Performance monitoring stopped');
    this.emit('monitoring:stopped');
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): void {
    const fullMetric: PerformanceMetric = {
      id: `${metric.category}_${metric.name}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      timestamp: Date.now(),
      ...metric
    };

    const key = `${metric.category}:${metric.name}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push(fullMetric);
    this.emit('metric:recorded', fullMetric);
  }

  /**
   * Record database operation metrics
   */
  recordDatabaseMetric(operation: string, duration: number, resultCount: number = 0): void {
    this.recordMetric({
      category: 'database',
      name: operation,
      value: duration,
      unit: 'ms',
      tags: { resultCount: resultCount.toString() }
    });

    // Record slow query alert
    if (duration > this.PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME) {
      this.recordMetric({
        category: 'database',
        name: 'slow_query',
        value: 1,
        unit: 'count',
        tags: { operation, duration: duration.toString() }
      });
    }
  }

  /**
   * Record search operation metrics
   */
  recordSearchMetric(searchType: string, duration: number, resultCount: number, cacheHit: boolean = false): void {
    this.recordMetric({
      category: 'search',
      name: `${searchType}_duration`,
      value: duration,
      unit: 'ms',
      tags: { resultCount: resultCount.toString(), cacheHit: cacheHit.toString() }
    });

    this.recordMetric({
      category: 'search',
      name: `${searchType}_results`,
      value: resultCount,
      unit: 'count'
    });
  }

  /**
   * Record embedding operation metrics
   */
  recordEmbeddingMetric(operation: string, duration: number, batchSize: number = 1): void {
    const avgDuration = duration / batchSize;
    
    this.recordMetric({
      category: 'embedding',
      name: `${operation}_duration`,
      value: avgDuration,
      unit: 'ms',
      tags: { batchSize: batchSize.toString() }
    });

    this.recordMetric({
      category: 'embedding',
      name: `${operation}_throughput`,
      value: (batchSize / duration) * 1000, // operations per second
      unit: 'rate'
    });
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    console.log(`Alert rule added: ${rule.id} - ${rule.description}`);
  }

  /**
   * Get current performance report
   */
  getPerformanceReport(durationMs: number = 300000): PerformanceReport { // Default: last 5 minutes
    const now = Date.now();
    const startTime = now - durationMs;
    
    // Collect metrics from the specified time range
    const periodMetrics = this.getMetricsInRange(startTime, now);
    
    // Calculate summary statistics
    const totalRequests = this.sumMetricValues(periodMetrics, 'database', 'query') +
                         this.sumMetricValues(periodMetrics, 'search') +
                         this.sumMetricValues(periodMetrics, 'embedding');
    
    const responseTimeMetrics = this.getMetricsByCategory(periodMetrics, 'database')
      .concat(this.getMetricsByCategory(periodMetrics, 'search'));
    
    const averageResponseTime = responseTimeMetrics.length > 0
      ? responseTimeMetrics.reduce((sum, m) => sum + m.value, 0) / responseTimeMetrics.length
      : 0;
    
    const errorMetrics = this.getMetricsByName(periodMetrics, 'error');
    const errorRate = errorMetrics.length > 0 && totalRequests > 0
      ? errorMetrics.length / totalRequests
      : 0;

    const memoryStats = this.memoryManager.getCurrentStats();
    const memoryUsage = memoryStats.heapUsed / memoryStats.heapTotal;

    return {
      timestamp: now,
      duration: durationMs,
      summary: {
        totalRequests,
        averageResponseTime,
        errorRate,
        memoryUsage,
        activeAlerts: this.activeAlerts.size
      },
      metrics: {
        database: this.aggregateMetrics(periodMetrics, 'database'),
        search: this.aggregateMetrics(periodMetrics, 'search'),
        embedding: this.aggregateMetrics(periodMetrics, 'embedding'),
        memory: this.aggregateMetrics(periodMetrics, 'memory'),
        system: this.aggregateMetrics(periodMetrics, 'system')
      },
      healthChecks: Array.from(this.healthChecks.values()),
      alerts: Array.from(this.activeAlerts.values()),
      recommendations: this.generateRecommendations(periodMetrics)
    };
  }

  /**
   * Get health status of all monitored components
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    components: HealthCheck[];
    activeAlerts: Alert[];
    uptime: number;
  } {
    const components = Array.from(this.healthChecks.values());
    const activeAlerts = Array.from(this.activeAlerts.values());
    
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (components.some(c => c.status === 'unhealthy') || 
        activeAlerts.some(a => a.severity === 'critical')) {
      overall = 'unhealthy';
    } else if (components.some(c => c.status === 'degraded') ||
               activeAlerts.some(a => a.severity === 'high')) {
      overall = 'degraded';
    }

    return {
      overall,
      components,
      activeAlerts,
      uptime: process.uptime() * 1000
    };
  }

  /**
   * Force health check run
   */
  async runHealthChecks(): Promise<void> {
    // Database health check
    await this.runDatabaseHealthCheck();
    
    // Memory health check
    this.runMemoryHealthCheck();
    
    // Search system health check
    await this.runSearchHealthCheck();
    
    // System health check
    this.runSystemHealthCheck();
  }

  private setupDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_database_latency',
        category: 'database',
        metric: 'query_duration',
        operator: '>',
        threshold: this.PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME,
        duration: 60000, // 1 minute
        severity: 'high',
        enabled: true,
        description: 'Database queries taking too long'
      },
      {
        id: 'high_search_latency',
        category: 'search',
        metric: 'search_duration',
        operator: '>',
        threshold: this.PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME,
        duration: 30000, // 30 seconds
        severity: 'medium',
        enabled: true,
        description: 'Search operations taking too long'
      },
      {
        id: 'high_memory_usage',
        category: 'memory',
        metric: 'heap_usage_percent',
        operator: '>',
        threshold: this.PERFORMANCE_THRESHOLDS.MEMORY_USAGE,
        duration: 120000, // 2 minutes
        severity: 'critical',
        enabled: true,
        description: 'Memory usage critically high'
      },
      {
        id: 'high_error_rate',
        category: 'system',
        metric: 'error_rate',
        operator: '>',
        threshold: this.PERFORMANCE_THRESHOLDS.ERROR_RATE,
        duration: 60000, // 1 minute
        severity: 'high',
        enabled: true,
        description: 'Error rate exceeding acceptable threshold'
      }
    ];

    defaultRules.forEach(rule => this.addAlertRule(rule));
  }

  private async collectSystemMetrics(): Promise<void> {
    // Memory metrics
    const memoryStats = this.memoryManager.getCurrentStats();
    this.recordMetric({
      category: 'memory',
      name: 'heap_used',
      value: memoryStats.heapUsed,
      unit: 'bytes'
    });

    this.recordMetric({
      category: 'memory',
      name: 'heap_usage_percent',
      value: memoryStats.heapUsed / memoryStats.heapTotal,
      unit: 'percent'
    });

    this.recordMetric({
      category: 'memory',
      name: 'rss',
      value: memoryStats.rss,
      unit: 'bytes'
    });

    // System metrics
    this.recordMetric({
      category: 'system',
      name: 'uptime',
      value: process.uptime() * 1000,
      unit: 'ms'
    });

    this.recordMetric({
      category: 'system',
      name: 'cpu_usage',
      value: process.cpuUsage().user + process.cpuUsage().system,
      unit: 'ms'
    });
  }

  private async runDatabaseHealthCheck(): Promise<void> {
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Database operating normally';
    const details: Record<string, any> = {};

    try {
      const db = this.dbManager.getConnection();
      
      // Test basic connectivity
      const testResult = db.prepare('SELECT 1 as test').get();
      if (!testResult || (testResult as any).test !== 1) {
        throw new Error('Database connectivity test failed');
      }

      // Check WAL mode
      const walMode = db.pragma('journal_mode', { simple: true });
      details.journalMode = walMode;

      // Check cache hit rate (approximate)
      const cacheInfo = db.pragma('cache_size', { simple: true });
      details.cacheSize = cacheInfo;

      // Test write capability
      const writeStart = Date.now();
      db.prepare(`
        INSERT INTO persistence_state (key, value, updated_at) 
        VALUES ('health_check', ?, ?) 
        ON CONFLICT(key) DO UPDATE SET 
          value = excluded.value, 
          updated_at = excluded.updated_at
      `).run(Date.now().toString(), Date.now());
      
      const writeDuration = Date.now() - writeStart;
      details.writeLatency = writeDuration;

      if (writeDuration > 100) {
        status = 'degraded';
        message = `Database write latency high: ${writeDuration}ms`;
      }

    } catch (error) {
      status = 'unhealthy';
      message = `Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      details.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.healthChecks.set('database', {
      name: 'Database',
      status,
      message,
      lastCheck: Date.now(),
      duration: Date.now() - startTime,
      details
    });
  }

  private runMemoryHealthCheck(): void {
    const memoryReport = this.memoryManager.getMemoryReport();
    const pressure = memoryReport.pressure;
    
    let status: 'healthy' | 'degraded' | 'unhealthy';
    let message: string;

    switch (pressure.level) {
      case 'low':
      case 'medium':
        status = 'healthy';
        message = `Memory usage normal (${(pressure.heapUsagePercent * 100).toFixed(1)}% heap)`;
        break;
      case 'high':
        status = 'degraded';
        message = `High memory pressure (${(pressure.heapUsagePercent * 100).toFixed(1)}% heap)`;
        break;
      case 'critical':
        status = 'unhealthy';
        message = `Critical memory pressure (${(pressure.heapUsagePercent * 100).toFixed(1)}% heap)`;
        break;
    }

    this.healthChecks.set('memory', {
      name: 'Memory',
      status,
      message,
      lastCheck: Date.now(),
      duration: 0,
      details: {
        heapUsagePercent: pressure.heapUsagePercent,
        rssUsagePercent: pressure.rssUsagePercent,
        recommendation: pressure.recommendation
      }
    });
  }

  private async runSearchHealthCheck(): Promise<void> {
    const startTime = Date.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'Search system operating normally';
    const details: Record<string, any> = {};

    try {
      const db = this.dbManager.getConnection();
      
      // Test FTS functionality
      const ftsTest = db.prepare(`
        SELECT COUNT(*) as count FROM messages_fts WHERE messages_fts MATCH 'test' LIMIT 1
      `).get() as { count: number };
      
      details.ftsEnabled = ftsTest !== undefined;

      // Check index integrity
      const indexCheck = db.prepare(`
        SELECT COUNT(*) as messages_count FROM messages
      `).get() as { count: number };
      
      const ftsCheck = db.prepare(`
        SELECT COUNT(*) as fts_count FROM messages_fts
      `).get() as { count: number };

      details.messageCount = indexCheck.count;
      details.ftsCount = ftsCheck.count;

      const indexSyncRatio = ftsCheck.count / Math.max(indexCheck.count, 1);
      if (indexSyncRatio < 0.95) {
        status = 'degraded';
        message = `FTS index out of sync: ${(indexSyncRatio * 100).toFixed(1)}% indexed`;
      }

    } catch (error) {
      status = 'unhealthy';
      message = `Search health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      details.error = error instanceof Error ? error.message : 'Unknown error';
    }

    this.healthChecks.set('search', {
      name: 'Search',
      status,
      message,
      lastCheck: Date.now(),
      duration: Date.now() - startTime,
      details
    });
  }

  private runSystemHealthCheck(): void {
    const uptime = process.uptime() * 1000;
    const memoryUsage = process.memoryUsage();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = 'System operating normally';

    // Check for rapid memory growth or other system issues
    if (memoryUsage.heapUsed > 200 * 1024 * 1024) { // 200MB
      status = 'degraded';
      message = `High memory usage: ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`;
    }

    this.healthChecks.set('system', {
      name: 'System',
      status,
      message,
      lastCheck: Date.now(),
      duration: 0,
      details: {
        uptime,
        memoryUsage,
        nodeVersion: process.version,
        platform: process.platform
      }
    });
  }

  private evaluateAlerts(): void {
    const now = Date.now();
    
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;

      const key = `${rule.category}:${rule.metric}`;
      const metrics = this.metrics.get(key) || [];
      
      // Get metrics within the alert duration window
      const recentMetrics = metrics.filter(m => now - m.timestamp <= rule.duration);
      
      if (recentMetrics.length === 0) continue;

      // Check if all recent metrics violate the threshold
      let shouldAlert = false;
      
      switch (rule.operator) {
        case '>':
          shouldAlert = recentMetrics.every(m => m.value > rule.threshold);
          break;
        case '<':
          shouldAlert = recentMetrics.every(m => m.value < rule.threshold);
          break;
        case '>=':
          shouldAlert = recentMetrics.every(m => m.value >= rule.threshold);
          break;
        case '<=':
          shouldAlert = recentMetrics.every(m => m.value <= rule.threshold);
          break;
        case '=':
          shouldAlert = recentMetrics.every(m => m.value === rule.threshold);
          break;
      }

      const existingAlert = this.activeAlerts.get(ruleId);
      
      if (shouldAlert && !existingAlert) {
        // Trigger new alert
        const latestMetric = recentMetrics[recentMetrics.length - 1];
        const alert: Alert = {
          id: `alert_${ruleId}_${now}`,
          ruleId,
          severity: rule.severity,
          message: `${rule.description}: ${latestMetric.value} ${latestMetric.unit} ${rule.operator} ${rule.threshold} ${latestMetric.unit}`,
          metric: latestMetric,
          triggeredAt: now
        };
        
        this.activeAlerts.set(ruleId, alert);
        this.alertHistory.push(alert);
        this.emit('alert:triggered', alert);
        
        console.warn(`ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
        
      } else if (!shouldAlert && existingAlert && !existingAlert.resolvedAt) {
        // Resolve existing alert
        existingAlert.resolvedAt = now;
        this.activeAlerts.delete(ruleId);
        this.emit('alert:resolved', existingAlert);
        
        console.log(`ALERT RESOLVED: ${existingAlert.message}`);
      }
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - this.metricsRetentionMs;
    
    for (const [key, metrics] of this.metrics.entries()) {
      const filteredMetrics = metrics.filter(m => m.timestamp > cutoff);
      this.metrics.set(key, filteredMetrics);
    }

    // Clean up old alerts
    this.alertHistory = this.alertHistory.filter(a => 
      a.triggeredAt > cutoff || (a.resolvedAt && a.resolvedAt > cutoff)
    );
  }

  private getMetricsInRange(startTime: number, endTime: number): PerformanceMetric[] {
    const result: PerformanceMetric[] = [];
    
    for (const metrics of this.metrics.values()) {
      result.push(...metrics.filter(m => 
        m.timestamp >= startTime && m.timestamp <= endTime
      ));
    }
    
    return result;
  }

  private getMetricsByCategory(metrics: PerformanceMetric[], category: string): PerformanceMetric[] {
    return metrics.filter(m => m.category === category);
  }

  private getMetricsByName(metrics: PerformanceMetric[], name: string): PerformanceMetric[] {
    return metrics.filter(m => m.name === name);
  }

  private sumMetricValues(metrics: PerformanceMetric[], category: string, nameFilter?: string): number {
    return metrics
      .filter(m => m.category === category && (!nameFilter || m.name.includes(nameFilter)))
      .length; // Count of metrics, not sum of values
  }

  private aggregateMetrics(metrics: PerformanceMetric[], category: string): Record<string, number> {
    const categoryMetrics = this.getMetricsByCategory(metrics, category);
    const result: Record<string, number> = {};

    // Group by metric name and calculate averages
    const groups = new Map<string, number[]>();
    
    for (const metric of categoryMetrics) {
      if (!groups.has(metric.name)) {
        groups.set(metric.name, []);
      }
      groups.get(metric.name)!.push(metric.value);
    }

    for (const [name, values] of groups.entries()) {
      if (values.length > 0) {
        result[`${name}_avg`] = values.reduce((sum, v) => sum + v, 0) / values.length;
        result[`${name}_max`] = Math.max(...values);
        result[`${name}_min`] = Math.min(...values);
        result[`${name}_count`] = values.length;
      }
    }

    return result;
  }

  private generateRecommendations(metrics: PerformanceMetric[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze database performance
    const dbMetrics = this.getMetricsByCategory(metrics, 'database');
    const slowQueries = dbMetrics.filter(m => m.value > this.PERFORMANCE_THRESHOLDS.DATABASE_QUERY_TIME);
    
    if (slowQueries.length > dbMetrics.length * 0.2) {
      recommendations.push('Consider optimizing database queries - 20% of queries are slow');
    }

    // Analyze memory usage
    const memoryMetrics = this.getMetricsByCategory(metrics, 'memory');
    const highMemoryUsage = memoryMetrics.filter(m => 
      m.name === 'heap_usage_percent' && m.value > 0.7
    );
    
    if (highMemoryUsage.length > 0) {
      recommendations.push('Memory usage is high - consider increasing memory or optimizing caches');
    }

    // Analyze search performance
    const searchMetrics = this.getMetricsByCategory(metrics, 'search');
    const slowSearches = searchMetrics.filter(m => 
      m.name.includes('duration') && m.value > this.PERFORMANCE_THRESHOLDS.SEARCH_RESPONSE_TIME
    );
    
    if (slowSearches.length > 0) {
      recommendations.push('Search operations are slow - consider query optimization or caching');
    }

    return recommendations;
  }
}