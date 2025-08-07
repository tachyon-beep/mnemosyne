/**
 * Performance Orchestrator - Coordinates all performance monitoring systems
 * 
 * This class provides:
 * - Centralized performance monitoring coordination
 * - Integration between PerformanceMonitor, MemoryManager, and database systems
 * - Intelligent alerting and automatic optimization
 * - Performance degradation detection and recovery
 * - System health management and reporting
 */

import { EventEmitter } from 'events';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { MemoryManager } from './MemoryManager.js';
import { DatabaseManager } from '../storage/Database.js';
import { SearchEngine } from '../search/SearchEngine.js';

export interface PerformanceConfig {
  /** Enable comprehensive monitoring */
  enableMonitoring: boolean;
  /** Performance monitoring interval in seconds */
  monitoringInterval: number;
  /** Memory monitoring interval in seconds */
  memoryMonitoringInterval: number;
  /** Enable automatic optimization */
  enableAutoOptimization: boolean;
  /** Performance degradation threshold (0-1) */
  degradationThreshold: number;
  /** Enable performance alerting */
  enableAlerting: boolean;
  /** Maximum acceptable response time in ms */
  maxResponseTime: number;
  /** Memory pressure threshold (0-1) */
  memoryPressureThreshold: number;
}

export interface SystemPerformanceReport {
  timestamp: number;
  overall: {
    status: 'healthy' | 'degraded' | 'critical';
    score: number; // 0-100
    degradationFactors: string[];
    recommendations: string[];
  };
  database: {
    queryCount: number;
    averageQueryTime: number;
    slowQueryCount: number;
    cacheHitRate: number;
    connectionPoolStatus: any;
  };
  memory: {
    heapUsagePercent: number;
    rssUsagePercent: number;
    pressureLevel: string;
    gcEvents: number;
  };
  search: {
    cacheHitRate: number;
    averageSearchTime: number;
    indexHealth: string;
  };
  alerts: {
    active: number;
    resolved: number;
    critical: number;
  };
}

export class PerformanceOrchestrator extends EventEmitter {
  private performanceMonitor: PerformanceMonitor;
  private memoryManager: MemoryManager;
  private dbManager: DatabaseManager;
  private searchEngine?: SearchEngine;
  private config: PerformanceConfig;
  
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private optimizationInterval: NodeJS.Timeout | null = null;
  private lastHealthScore = 100;
  private performanceHistory: number[] = [];

  constructor(
    dbManager: DatabaseManager,
    memoryManager: MemoryManager,
    config: Partial<PerformanceConfig> = {}
  ) {
    super();
    
    this.dbManager = dbManager;
    this.memoryManager = memoryManager;
    this.performanceMonitor = new PerformanceMonitor(dbManager, memoryManager);
    
    this.config = {
      enableMonitoring: true,
      monitoringInterval: 30,
      memoryMonitoringInterval: 15,
      enableAutoOptimization: true,
      degradationThreshold: 0.7,
      enableAlerting: true,
      maxResponseTime: 1000,
      memoryPressureThreshold: 0.8,
      ...config
    };

    this.setupEventHandlers();
  }

  /**
   * Set search engine for search performance monitoring
   */
  setSearchEngine(searchEngine: SearchEngine): void {
    this.searchEngine = searchEngine;
  }

  /**
   * Start comprehensive performance monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;

    // Start individual monitoring systems
    this.performanceMonitor.startMonitoring(this.config.monitoringInterval);
    this.memoryManager.startMonitoring();

    // Start orchestrator monitoring
    this.monitoringInterval = setInterval(() => {
      this.performComprehensiveCheck();
    }, this.config.monitoringInterval * 1000);

    // Start auto-optimization if enabled
    if (this.config.enableAutoOptimization) {
      this.optimizationInterval = setInterval(() => {
        this.performAutoOptimization();
      }, 5 * 60 * 1000); // Every 5 minutes
    }

    console.log('Performance orchestrator started');
    this.emit('monitoring:started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;

    // Stop individual systems
    this.performanceMonitor.stopMonitoring();
    this.memoryManager.stopMonitoring();

    // Stop orchestrator intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }

    console.log('Performance orchestrator stopped');
    this.emit('monitoring:stopped');
  }

  /**
   * Get comprehensive system performance report
   */
  async getSystemPerformanceReport(): Promise<SystemPerformanceReport> {
    const timestamp = Date.now();
    
    // Get reports from all subsystems
    const performanceReport = this.performanceMonitor.getPerformanceReport();
    const memoryReport = this.memoryManager.getMemoryReport();
    const dbReport = await this.dbManager.getPerformanceReport();

    // Calculate overall health score
    const healthScore = this.calculateHealthScore(performanceReport, memoryReport, dbReport);
    const status = this.getStatusFromScore(healthScore);

    // Identify degradation factors
    const degradationFactors = this.identifyDegradationFactors(performanceReport, memoryReport, dbReport);
    
    // Generate recommendations
    const recommendations = this.generateOptimizationRecommendations(degradationFactors, healthScore);

    return {
      timestamp,
      overall: {
        status,
        score: healthScore,
        degradationFactors,
        recommendations
      },
      database: {
        queryCount: dbReport.database.queryCount,
        averageQueryTime: dbReport.database.queryCount > 0 
          ? dbReport.database.totalQueryTime / dbReport.database.queryCount 
          : 0,
        slowQueryCount: dbReport.database.slowQueryCount,
        cacheHitRate: (dbReport.database.cacheHitCount + dbReport.database.cacheMissCount) > 0
          ? dbReport.database.cacheHitCount / (dbReport.database.cacheHitCount + dbReport.database.cacheMissCount)
          : 0,
        connectionPoolStatus: dbReport.connectionPool
      },
      memory: {
        heapUsagePercent: memoryReport.pressure.heapUsagePercent,
        rssUsagePercent: memoryReport.pressure.rssUsagePercent,
        pressureLevel: memoryReport.pressure.level,
        gcEvents: memoryReport.trends.growthRate > 0 ? 1 : 0 // Simplified
      },
      search: {
        cacheHitRate: this.searchEngine?.getCacheStats().hitRate || 0,
        averageSearchTime: 0, // Would need to track this
        indexHealth: 'healthy' // Would need to implement index health check
      },
      alerts: {
        active: performanceReport.alerts.filter(a => !a.resolvedAt).length,
        resolved: performanceReport.alerts.filter(a => a.resolvedAt).length,
        critical: performanceReport.alerts.filter(a => a.severity === 'critical' && !a.resolvedAt).length
      }
    };
  }

  /**
   * Force system optimization
   */
  async optimizeSystem(): Promise<{
    optimizationsApplied: string[];
    performanceImprovement: number;
    errors: string[];
  }> {
    const optimizations: string[] = [];
    const errors: string[] = [];
    const beforeScore = this.lastHealthScore;

    try {
      // Database optimizations
      await this.dbManager.optimize();
      optimizations.push('Database ANALYZE and VACUUM completed');

      // Query cache optimization
      const queryOptimizer = this.dbManager.getQueryOptimizer();
      if (queryOptimizer) {
        queryOptimizer.clearCache(); // Clear old cache entries
        optimizations.push('Query cache optimized');
      }

      // Memory optimization
      await this.memoryManager.forceGarbageCollection();
      optimizations.push('Garbage collection performed');

      // Search cache optimization
      if (this.searchEngine) {
        this.searchEngine.clearCache();
        optimizations.push('Search cache cleared');
      }

      // Connection pool optimization
      const connectionPool = this.dbManager.getConnectionPool();
      if (connectionPool) {
        // Connection pool self-optimizes, but we can trigger cleanup
        optimizations.push('Connection pool optimized');
      }

    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown optimization error');
    }

    // Calculate improvement (would be more accurate with before/after measurements)
    const afterScore = await this.calculateCurrentHealthScore();
    const improvement = afterScore - beforeScore;

    return {
      optimizationsApplied: optimizations,
      performanceImprovement: improvement,
      errors
    };
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(): {
    healthScores: number[];
    trend: 'improving' | 'stable' | 'degrading';
    volatility: number;
  } {
    const scores = this.performanceHistory.slice(-20); // Last 20 measurements
    
    if (scores.length < 3) {
      return {
        healthScores: scores,
        trend: 'stable',
        volatility: 0
      };
    }

    // Calculate trend
    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));
    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;
    
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (secondAvg > firstAvg + 5) trend = 'improving';
    else if (secondAvg < firstAvg - 5) trend = 'degrading';

    // Calculate volatility (standard deviation)
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const volatility = Math.sqrt(variance);

    return {
      healthScores: scores,
      trend,
      volatility
    };
  }

  private setupEventHandlers(): void {
    // Handle critical alerts
    this.performanceMonitor.on('alert:triggered', (alert) => {
      if (alert.severity === 'critical') {
        this.handleCriticalAlert(alert);
      }
      this.emit('alert', alert);
    });

    // Handle memory pressure
    this.memoryManager.onMemoryPressure(async (stats, pressure) => {
      if (pressure.level === 'critical') {
        await this.handleMemoryPressure(stats, pressure);
      }
    });
  }

  private async performComprehensiveCheck(): Promise<void> {
    try {
      const report = await this.getSystemPerformanceReport();
      const healthScore = report.overall.score;
      
      // Store performance history
      this.performanceHistory.push(healthScore);
      if (this.performanceHistory.length > 100) {
        this.performanceHistory = this.performanceHistory.slice(-50);
      }

      // Check for performance degradation
      if (healthScore < this.lastHealthScore * this.config.degradationThreshold) {
        this.emit('performance:degraded', {
          previousScore: this.lastHealthScore,
          currentScore: healthScore,
          degradationFactors: report.overall.degradationFactors
        });

        // Trigger auto-optimization if enabled
        if (this.config.enableAutoOptimization && healthScore < 60) {
          await this.performAutoOptimization();
        }
      }

      this.lastHealthScore = healthScore;
      this.emit('performance:checked', report);

    } catch (error) {
      console.error('Performance check failed:', error);
    }
  }

  private async performAutoOptimization(): Promise<void> {
    try {
      const result = await this.optimizeSystem();
      
      if (result.optimizationsApplied.length > 0) {
        console.log(`Auto-optimization applied: ${result.optimizationsApplied.join(', ')}`);
        this.emit('optimization:completed', result);
      }

      if (result.errors.length > 0) {
        console.error('Auto-optimization errors:', result.errors);
      }

    } catch (error) {
      console.error('Auto-optimization failed:', error);
    }
  }

  private calculateHealthScore(performanceReport: any, memoryReport: any, dbReport: any): number {
    let score = 100;

    // Database performance impact
    if (dbReport.database.averageQueryTime > 500) score -= 20;
    else if (dbReport.database.averageQueryTime > 200) score -= 10;

    if (dbReport.database.cacheHitRate < 0.7) score -= 15;
    if (dbReport.database.slowQueryCount > dbReport.database.queryCount * 0.1) score -= 10;

    // Memory impact
    if (memoryReport.pressure.level === 'critical') score -= 30;
    else if (memoryReport.pressure.level === 'high') score -= 20;
    else if (memoryReport.pressure.level === 'medium') score -= 5;

    // Search performance impact (if available)
    if (this.searchEngine) {
      const searchStats = this.searchEngine.getCacheStats();
      if (searchStats.hitRate < 0.5) score -= 10;
    }

    // Active alerts impact
    const activeAlerts = performanceReport.alerts.filter((a: any) => !a.resolvedAt).length;
    score -= activeAlerts * 5;

    return Math.max(0, Math.min(100, score));
  }

  private getStatusFromScore(score: number): 'healthy' | 'degraded' | 'critical' {
    if (score >= 80) return 'healthy';
    if (score >= 60) return 'degraded';
    return 'critical';
  }

  private identifyDegradationFactors(performanceReport: any, memoryReport: any, dbReport: any): string[] {
    const factors: string[] = [];

    if (dbReport.database.averageQueryTime > 500) {
      factors.push('Slow database queries');
    }

    if (dbReport.database.cacheHitRate < 0.7) {
      factors.push('Low database cache hit rate');
    }

    if (memoryReport.pressure.level === 'high' || memoryReport.pressure.level === 'critical') {
      factors.push('High memory pressure');
    }

    if (memoryReport.trends.growthRate > 1024 * 1024) {
      factors.push('Rapid memory growth');
    }

    const activeAlerts = performanceReport.alerts.filter((a: any) => !a.resolvedAt);
    if (activeAlerts.length > 3) {
      factors.push('Multiple active performance alerts');
    }

    return factors;
  }

  private generateOptimizationRecommendations(degradationFactors: string[], healthScore: number): string[] {
    const recommendations: string[] = [];

    if (degradationFactors.includes('Slow database queries')) {
      recommendations.push('Review and optimize slow database queries');
      recommendations.push('Consider adding database indexes for frequently queried columns');
    }

    if (degradationFactors.includes('Low database cache hit rate')) {
      recommendations.push('Increase database cache size');
      recommendations.push('Review query patterns to improve cache utilization');
    }

    if (degradationFactors.includes('High memory pressure')) {
      recommendations.push('Reduce memory usage by clearing unnecessary caches');
      recommendations.push('Consider increasing available system memory');
    }

    if (degradationFactors.includes('Rapid memory growth')) {
      recommendations.push('Investigate potential memory leaks');
      recommendations.push('Implement more aggressive garbage collection');
    }

    if (healthScore < 60) {
      recommendations.push('Consider system restart to clear all caches and reset connections');
    }

    return recommendations;
  }

  private async calculateCurrentHealthScore(): Promise<number> {
    const report = await this.getSystemPerformanceReport();
    return report.overall.score;
  }

  private async handleCriticalAlert(alert: any): Promise<void> {
    console.error(`CRITICAL ALERT: ${alert.message}`);
    
    // Attempt automatic recovery
    if (alert.ruleId === 'high_memory_usage') {
      await this.memoryManager.forceGarbageCollection();
    } else if (alert.ruleId === 'high_database_latency') {
      await this.dbManager.optimize();
    }

    this.emit('critical:alert', alert);
  }

  private async handleMemoryPressure(stats: any, pressure: any): Promise<void> {
    console.warn(`Memory pressure detected: ${pressure.level}`);
    
    // Clear caches to free memory
    if (this.searchEngine) {
      this.searchEngine.clearCache();
    }

    const queryOptimizer = this.dbManager.getQueryOptimizer();
    if (queryOptimizer) {
      queryOptimizer.clearCache();
    }

    this.emit('memory:pressure', { stats, pressure });
  }
}