/**
 * Analytics Resource Manager
 * 
 * Comprehensive resource management for analytics operations:
 * - Database connection pooling and lifecycle management
 * - Memory cleanup and garbage collection optimization
 * - Background maintenance tasks and data retention
 * - Performance monitoring and alerting
 * - Resource usage optimization and throttling
 * - Automatic cleanup of temporary data and caches
 */

import { DatabaseManager } from '../../storage/Database.js';
import { AnalyticsPerformanceOptimizer } from './AnalyticsPerformanceOptimizer.js';

export interface ResourceManagerConfig {
  // Database settings
  maxDatabaseConnections: number;
  connectionTimeoutMs: number;
  idleConnectionTimeoutMs: number;
  
  // Memory management
  maxMemoryUsageMB: number;
  memoryCleanupThresholdMB: number;
  gcForceIntervalMs: number;
  
  // Maintenance settings
  maintenanceIntervalMs: number;
  dataRetentionDays: number;
  tempDataCleanupIntervalMs: number;
  
  // Performance monitoring
  performanceMonitoringIntervalMs: number;
  alertThresholds: {
    memoryUsageMB: number;
    queryTimeMs: number;
    errorRate: number;
  };
  
  // Resource throttling
  enableThrottling: boolean;
  maxConcurrentOperations: number;
  operationQueueSize: number;
}

export interface ResourceUsageStats {
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  database: {
    activeConnections: number;
    totalQueries: number;
    averageQueryTime: number;
    slowQueries: number;
  };
  performance: {
    cacheHitRate: number;
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  maintenance: {
    lastCleanup: number;
    dataRetained: number;
    tempDataSize: number;
  };
}

export interface MaintenanceTask {
  name: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  intervalMs: number;
  lastRun: number;
  nextRun: number;
  execute: () => Promise<void>;
}

/**
 * Comprehensive resource manager for analytics operations
 */
export class AnalyticsResourceManager {
  private config: ResourceManagerConfig;
  private maintenanceTasks: MaintenanceTask[] = [];
  private cleanupIntervals: NodeJS.Timeout[] = [];
  private performanceStats: Map<string, number[]> = new Map();
  private alertCallbacks: Array<(alert: ResourceAlert) => void> = [];
  private operationQueue: Array<() => Promise<any>> = [];
  private activeOperations = 0;
  private isShuttingDown = false;

  constructor(
    private databaseManager: DatabaseManager,
    private optimizer?: AnalyticsPerformanceOptimizer,
    config: Partial<ResourceManagerConfig> = {}
  ) {
    this.config = {
      maxDatabaseConnections: 10,
      connectionTimeoutMs: 30000,
      idleConnectionTimeoutMs: 60000,
      maxMemoryUsageMB: 500,
      memoryCleanupThresholdMB: 400,
      gcForceIntervalMs: 60000,
      maintenanceIntervalMs: 3600000, // 1 hour
      dataRetentionDays: 90,
      tempDataCleanupIntervalMs: 900000, // 15 minutes
      performanceMonitoringIntervalMs: 30000, // 30 seconds
      alertThresholds: {
        memoryUsageMB: 450,
        queryTimeMs: 5000,
        errorRate: 0.05
      },
      enableThrottling: true,
      maxConcurrentOperations: 5,
      operationQueueSize: 100,
      ...config
    };

    this.initializeMaintenanceTasks();
    this.startResourceMonitoring();
  }

  /**
   * Start the resource manager
   */
  start(): void {
    console.log('Starting Analytics Resource Manager...');
    
    // Start performance monitoring
    this.cleanupIntervals.push(
      setInterval(() => this.monitorPerformance(), this.config.performanceMonitoringIntervalMs)
    );

    // Start memory monitoring and cleanup
    this.cleanupIntervals.push(
      setInterval(() => this.monitorAndCleanupMemory(), this.config.gcForceIntervalMs)
    );

    // Start maintenance tasks
    this.cleanupIntervals.push(
      setInterval(() => this.runMaintenanceTasks(), this.config.maintenanceIntervalMs)
    );

    // Start temporary data cleanup
    this.cleanupIntervals.push(
      setInterval(() => this.cleanupTemporaryData(), this.config.tempDataCleanupIntervalMs)
    );

    console.log('Analytics Resource Manager started successfully');
  }

  /**
   * Stop the resource manager gracefully
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down Analytics Resource Manager...');
    this.isShuttingDown = true;

    // Clear all intervals
    this.cleanupIntervals.forEach(interval => clearInterval(interval));
    this.cleanupIntervals = [];

    // Wait for active operations to complete
    let attempts = 0;
    while (this.activeOperations > 0 && attempts < 30) {
      console.log(`Waiting for ${this.activeOperations} active operations to complete...`);
      await this.sleep(1000);
      attempts++;
    }

    // Force cleanup if operations are still running
    if (this.activeOperations > 0) {
      console.warn(`Force shutting down with ${this.activeOperations} operations still running`);
    }

    // Run final cleanup
    await this.runFinalCleanup();

    console.log('Analytics Resource Manager shutdown complete');
  }

  /**
   * Execute operation with resource management
   */
  async executeWithResourceManagement<T>(
    operation: () => Promise<T>,
    operationName: string = 'anonymous',
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error('Resource manager is shutting down');
    }

    // Check if we can execute immediately or need to queue
    if (this.activeOperations >= this.config.maxConcurrentOperations) {
      if (this.operationQueue.length >= this.config.operationQueueSize) {
        throw new Error('Operation queue is full - system is overloaded');
      }

      // Queue the operation
      return new Promise<T>((resolve, reject) => {
        const queuedOperation = async () => {
          try {
            const result = await this.executeOperationWithMonitoring(operation, operationName);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        if (priority === 'high') {
          this.operationQueue.unshift(queuedOperation);
        } else {
          this.operationQueue.push(queuedOperation);
        }
      });
    }

    return await this.executeOperationWithMonitoring(operation, operationName);
  }

  /**
   * Get current resource usage statistics
   */
  getResourceUsageStats(): ResourceUsageStats {
    const memoryUsage = process.memoryUsage();
    const performanceReport = this.optimizer?.getPerformanceReport();

    return {
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        rss: memoryUsage.rss
      },
      database: {
        activeConnections: 1, // Simplified for SQLite
        totalQueries: this.getStatSum('total_queries') || 0,
        averageQueryTime: this.getStatAverage('query_time') || 0,
        slowQueries: this.getStatSum('slow_queries') || 0
      },
      performance: {
        cacheHitRate: this.getStatAverage('cache_hit_rate') || 0,
        averageResponseTime: this.getStatAverage('response_time') || 0,
        errorRate: this.getStatAverage('error_rate') || 0,
        throughput: this.getStatAverage('throughput') || 0
      },
      maintenance: {
        lastCleanup: this.getStatLatest('last_cleanup') || 0,
        dataRetained: this.getStatSum('data_retained') || 0,
        tempDataSize: this.getStatLatest('temp_data_size') || 0
      }
    };
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: ResourceAlert) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Force memory cleanup
   */
  async forceMemoryCleanup(): Promise<{ beforeMB: number; afterMB: number; freedMB: number }> {
    const beforeMemory = process.memoryUsage().heapUsed;

    // Clear optimizer caches if available
    if (this.optimizer) {
      this.optimizer.resetPerformanceState();
    }

    // Clear internal caches
    this.clearInternalCaches();

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const afterMemory = process.memoryUsage().heapUsed;
    const freedMB = (beforeMemory - afterMemory) / (1024 * 1024);

    console.log(`Memory cleanup: freed ${freedMB.toFixed(2)} MB`);

    return {
      beforeMB: beforeMemory / (1024 * 1024),
      afterMB: afterMemory / (1024 * 1024),
      freedMB
    };
  }

  /**
   * Run database maintenance
   */
  async runDatabaseMaintenance(): Promise<void> {
    console.log('Running database maintenance...');

    try {
      const db = this.databaseManager.getDatabase();

      // Update database statistics
      db.exec('ANALYZE');

      // Optimize the database
      db.exec('PRAGMA optimize');

      // Clean up old analytics data
      const cutoffTime = Date.now() - (this.config.dataRetentionDays * 24 * 60 * 60 * 1000);
      
      // Clean up old conversation analytics
      const cleanupAnalytics = db.prepare(`
        DELETE FROM conversation_analytics 
        WHERE analyzed_at < ?
      `);
      const analyticsDeleted = cleanupAnalytics.run(cutoffTime).changes;

      // Clean up old productivity patterns
      const cleanupPatterns = db.prepare(`
        DELETE FROM productivity_patterns 
        WHERE window_end < ?
      `);
      const patternsDeleted = cleanupPatterns.run(cutoffTime).changes;

      // Clean up resolved knowledge gaps older than retention period
      const cleanupGaps = db.prepare(`
        DELETE FROM knowledge_gaps 
        WHERE resolved = TRUE AND resolution_date < ?
      `);
      const gapsDeleted = cleanupGaps.run(cutoffTime).changes;

      console.log(`Database maintenance completed: removed ${analyticsDeleted} analytics records, ${patternsDeleted} pattern records, ${gapsDeleted} resolved gaps`);
      
      this.recordStat('data_retained', analyticsDeleted + patternsDeleted + gapsDeleted);
      this.recordStat('last_cleanup', Date.now());

    } catch (error) {
      console.error('Database maintenance failed:', error);
      this.triggerAlert({
        type: 'error',
        severity: 'high',
        message: 'Database maintenance failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private initializeMaintenanceTasks(): void {
    this.maintenanceTasks = [
      {
        name: 'database_maintenance',
        description: 'Clean up old data and optimize database',
        priority: 'high',
        intervalMs: 24 * 60 * 60 * 1000, // Daily
        lastRun: 0,
        nextRun: Date.now() + 60000, // Start in 1 minute
        execute: () => this.runDatabaseMaintenance()
      },
      {
        name: 'memory_optimization',
        description: 'Force garbage collection and memory cleanup',
        priority: 'medium',
        intervalMs: 2 * 60 * 60 * 1000, // Every 2 hours
        lastRun: 0,
        nextRun: Date.now() + 120000, // Start in 2 minutes
        execute: async () => {
          await this.forceMemoryCleanup();
        }
      },
      {
        name: 'performance_analysis',
        description: 'Analyze performance trends and generate recommendations',
        priority: 'medium',
        intervalMs: 6 * 60 * 60 * 1000, // Every 6 hours
        lastRun: 0,
        nextRun: Date.now() + 300000, // Start in 5 minutes
        execute: () => this.analyzePerformanceTrends()
      },
      {
        name: 'cache_optimization',
        description: 'Optimize cache strategies based on usage patterns',
        priority: 'low',
        intervalMs: 12 * 60 * 60 * 1000, // Every 12 hours
        lastRun: 0,
        nextRun: Date.now() + 600000, // Start in 10 minutes
        execute: () => this.optimizeCacheStrategies()
      }
    ];
  }

  private startResourceMonitoring(): void {
    // Monitor memory usage continuously
    const memoryMonitor = () => {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);
      
      this.recordStat('memory_usage', heapUsedMB);
      
      if (heapUsedMB > this.config.alertThresholds.memoryUsageMB) {
        this.triggerAlert({
          type: 'resource',
          severity: 'high',
          message: `High memory usage: ${heapUsedMB.toFixed(2)} MB`,
          details: `Memory usage exceeds threshold of ${this.config.alertThresholds.memoryUsageMB} MB`
        });
      }
    };

    // Start monitoring immediately and then periodically
    memoryMonitor();
    this.cleanupIntervals.push(
      setInterval(memoryMonitor, 10000) // Every 10 seconds
    );
  }

  private async executeOperationWithMonitoring<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    this.activeOperations++;
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;

    try {
      const result = await operation();
      
      const executionTime = performance.now() - startTime;
      const endMemory = process.memoryUsage().heapUsed;
      const memoryDelta = endMemory - startMemory;

      // Record performance metrics
      this.recordStat('response_time', executionTime);
      this.recordStat('memory_delta', memoryDelta);
      this.recordStat('total_queries', 1);

      // Check for slow operations
      if (executionTime > this.config.alertThresholds.queryTimeMs) {
        this.recordStat('slow_queries', 1);
        this.triggerAlert({
          type: 'performance',
          severity: 'medium',
          message: `Slow operation detected: ${operationName}`,
          details: `Execution time: ${executionTime.toFixed(2)}ms`
        });
      }

      return result;

    } catch (error) {
      this.recordStat('error_count', 1);
      
      this.triggerAlert({
        type: 'error',
        severity: 'high',
        message: `Operation failed: ${operationName}`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;

    } finally {
      this.activeOperations--;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.operationQueue.length > 0 && this.activeOperations < this.config.maxConcurrentOperations) {
      const nextOperation = this.operationQueue.shift();
      if (nextOperation) {
        nextOperation();
      }
    }
  }

  private async monitorPerformance(): Promise<void> {
    const stats = this.getResourceUsageStats();
    
    // Check error rate
    const errorRate = this.calculateRecentErrorRate();
    this.recordStat('error_rate', errorRate);
    
    if (errorRate > this.config.alertThresholds.errorRate) {
      this.triggerAlert({
        type: 'performance',
        severity: 'high',
        message: `High error rate detected: ${(errorRate * 100).toFixed(2)}%`,
        details: `Error rate exceeds threshold of ${(this.config.alertThresholds.errorRate * 100).toFixed(2)}%`
      });
    }

    // Calculate throughput
    const recentQueries = this.getRecentStats('total_queries');
    const throughput = recentQueries.length > 0 ? recentQueries.reduce((sum, count) => sum + count, 0) / 30 : 0;
    this.recordStat('throughput', throughput);
  }

  private async monitorAndCleanupMemory(): Promise<void> {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = memoryUsage.heapUsed / (1024 * 1024);

    if (heapUsedMB > this.config.memoryCleanupThresholdMB) {
      console.log(`Memory usage (${heapUsedMB.toFixed(2)} MB) exceeds cleanup threshold, initiating cleanup...`);
      await this.forceMemoryCleanup();
    }
  }

  private async runMaintenanceTasks(): Promise<void> {
    const now = Date.now();
    
    for (const task of this.maintenanceTasks) {
      if (now >= task.nextRun) {
        console.log(`Running maintenance task: ${task.name}`);
        
        try {
          await task.execute();
          task.lastRun = now;
          task.nextRun = now + task.intervalMs;
          
          console.log(`Maintenance task ${task.name} completed successfully`);
        } catch (error) {
          console.error(`Maintenance task ${task.name} failed:`, error);
          
          // Retry in 30 minutes for failed tasks
          task.nextRun = now + (30 * 60 * 1000);
          
          this.triggerAlert({
            type: 'maintenance',
            severity: 'medium',
            message: `Maintenance task failed: ${task.name}`,
            details: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
  }

  private async cleanupTemporaryData(): Promise<void> {
    try {
      const db = this.databaseManager.getDatabase();
      
      // Clean up temporary analytics data
      const tempDataQuery = db.prepare(`
        SELECT COUNT(*) as count, SUM(LENGTH(metadata)) as size
        FROM conversation_analytics 
        WHERE analyzed_at < ?
      `);
      
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      const tempDataInfo = tempDataQuery.get(cutoffTime) as { count: number; size: number };
      
      if (tempDataInfo.count > 0) {
        const cleanupQuery = db.prepare(`
          DELETE FROM conversation_analytics 
          WHERE analyzed_at < ? AND productivity_score = 0
        `);
        
        const deleted = cleanupQuery.run(cutoffTime).changes;
        console.log(`Cleaned up ${deleted} temporary analytics records`);
        
        this.recordStat('temp_data_size', tempDataInfo.size || 0);
      }

    } catch (error) {
      console.error('Temporary data cleanup failed:', error);
    }
  }

  private async runFinalCleanup(): Promise<void> {
    console.log('Running final cleanup...');
    
    try {
      // Final memory cleanup
      await this.forceMemoryCleanup();
      
      // Clear all performance statistics
      this.performanceStats.clear();
      
      // Final database optimization
      const db = this.databaseManager.getDatabase();
      db.exec('PRAGMA optimize');
      
      console.log('Final cleanup completed');
    } catch (error) {
      console.error('Final cleanup failed:', error);
    }
  }

  private async analyzePerformanceTrends(): Promise<void> {
    const trends = this.calculatePerformanceTrends();
    
    // Generate recommendations based on trends
    const recommendations: string[] = [];
    
    if (trends.memoryUsageIncrease > 20) {
      recommendations.push('Memory usage trending upward - consider more frequent cleanup');
    }
    
    if (trends.queryTimeIncrease > 50) {
      recommendations.push('Query performance degrading - review database indexes');
    }
    
    if (trends.errorRateIncrease > 10) {
      recommendations.push('Error rate increasing - investigate system stability');
    }
    
    if (recommendations.length > 0) {
      console.log('Performance analysis recommendations:', recommendations);
    }
  }

  private async optimizeCacheStrategies(): Promise<void> {
    if (!this.optimizer) return;
    
    const cacheStats = this.optimizer.getPerformanceReport().cacheStats;
    
    // Analyze cache effectiveness and suggest improvements
    console.log('Cache optimization analysis:', {
      totalEntries: cacheStats?.totalEntries || 0,
      averageHitRate: this.getStatAverage('cache_hit_rate') || 0
    });
  }

  private clearInternalCaches(): void {
    // Clear performance stats older than 1 hour
    const cutoff = Date.now() - (60 * 60 * 1000);
    
    for (const [key, values] of this.performanceStats.entries()) {
      // Keep only recent values (simplified - would use timestamps in real implementation)
      const recentValues = values.slice(-100); // Keep last 100 values
      this.performanceStats.set(key, recentValues);
    }
  }

  private recordStat(key: string, value: number): void {
    if (!this.performanceStats.has(key)) {
      this.performanceStats.set(key, []);
    }
    
    const stats = this.performanceStats.get(key)!;
    stats.push(value);
    
    // Keep only recent stats
    if (stats.length > 1000) {
      stats.splice(0, stats.length - 1000);
    }
  }

  private getStatSum(key: string): number | null {
    const stats = this.performanceStats.get(key);
    return stats ? stats.reduce((sum, val) => sum + val, 0) : null;
  }

  private getStatAverage(key: string): number | null {
    const stats = this.performanceStats.get(key);
    return stats && stats.length > 0 ? stats.reduce((sum, val) => sum + val, 0) / stats.length : null;
  }

  private getStatLatest(key: string): number | null {
    const stats = this.performanceStats.get(key);
    return stats && stats.length > 0 ? stats[stats.length - 1] : null;
  }

  private getRecentStats(key: string, periodMinutes: number = 30): number[] {
    const stats = this.performanceStats.get(key);
    if (!stats) return [];
    
    // Simplified - would use actual timestamps in production
    const recentCount = Math.min(stats.length, Math.floor(periodMinutes / 5)); // Assume 5-minute intervals
    return stats.slice(-recentCount);
  }

  private calculateRecentErrorRate(): number {
    const recentErrors = this.getRecentStats('error_count');
    const recentQueries = this.getRecentStats('total_queries');
    
    const totalErrors = recentErrors.reduce((sum, count) => sum + count, 0);
    const totalQueries = recentQueries.reduce((sum, count) => sum + count, 0);
    
    return totalQueries > 0 ? totalErrors / totalQueries : 0;
  }

  private calculatePerformanceTrends(): {
    memoryUsageIncrease: number;
    queryTimeIncrease: number;
    errorRateIncrease: number;
  } {
    // Simplified trend calculation
    const recentMemory = this.getRecentStats('memory_usage', 60);
    const recentQueryTime = this.getRecentStats('response_time', 60);
    const recentErrorRate = this.getRecentStats('error_rate', 60);
    
    return {
      memoryUsageIncrease: this.calculateTrendPercentage(recentMemory),
      queryTimeIncrease: this.calculateTrendPercentage(recentQueryTime),
      errorRateIncrease: this.calculateTrendPercentage(recentErrorRate)
    };
  }

  private calculateTrendPercentage(values: number[]): number {
    if (values.length < 2) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    return firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  }

  private triggerAlert(alert: ResourceAlert): void {
    console.warn(`Resource Alert [${alert.severity}]: ${alert.message} - ${alert.details}`);
    
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert);
      } catch (error) {
        console.error('Alert callback failed:', error);
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export interface ResourceAlert {
  type: 'resource' | 'performance' | 'error' | 'maintenance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: string;
  timestamp?: number;
}