/**
 * Index Usage Monitor - Production Quality Database Index Monitoring
 * 
 * Comprehensive monitoring system for database index effectiveness:
 * - Real-time index usage tracking with EXPLAIN QUERY PLAN analysis
 * - Query performance monitoring and slow query detection
 * - Index effectiveness scoring and recommendations
 * - Automated index optimization suggestions
 * - Write performance impact monitoring
 * - Performance degradation alerts
 * - Index maintenance automation
 */

import Database from 'better-sqlite3';
import { DatabaseManager } from '../../storage/Database.js';

export interface IndexUsageStats {
  indexName: string;
  tableName: string;
  usageCount: number;
  hitCount: number;
  missCount: number;
  lastUsed: number;
  avgQueryTime: number;
  effectivenessScore: number;
  queryTypes: string[];
  sizeBytes: number;
  maintenanceCost: number;
}

export interface QueryPlanAnalysis {
  queryId: string;
  sql: string;
  params: any[];
  executionTime: number;
  planSteps: Array<{
    operation: string;
    table: string;
    indexUsed: string | null;
    estimatedCost: number;
    rowsScanned: number;
  }>;
  indexesUsed: string[];
  tableScans: string[];
  recommendations: string[];
  performanceIssues: string[];
}

export interface IndexOptimizationRecommendation {
  type: 'create' | 'drop' | 'modify' | 'rebuild';
  indexName: string;
  tableName: string;
  reason: string;
  expectedImpact: 'high' | 'medium' | 'low';
  sql: string;
  riskLevel: 'low' | 'medium' | 'high';
  estimatedBenefit: number;
  implementationPriority: number;
  
  // Additional properties for optimization scoring
  costBenefitScore: number;
  implementationComplexity: 'low' | 'medium' | 'high';
  riskAssessment: string;
}

export interface PerformanceAlert {
  id: string;
  type: 'slow_query' | 'unused_index' | 'index_degradation' | 'write_impact' | 'storage_growth' | 'monitoring_error';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  details: Record<string, any>;
  timestamp: number;
  resolved: boolean;
  actionRequired: boolean;
}

export interface WritePerformanceMetrics {
  tableName: string;
  indexCount: number;
  avgInsertTime: number;
  avgUpdateTime: number;
  avgDeleteTime: number;
  writeThroughputImpact: number;
  indexMaintenanceOverhead: number;
}

/**
 * Comprehensive index usage and performance monitoring system
 */
export class IndexUsageMonitor {
  private db: Database.Database;
  private monitoringActive = false;
  private queryPlanCache = new Map<string, QueryPlanAnalysis>();
  private indexStatsCache = new Map<string, IndexUsageStats>();
  private writeMetricsCache = new Map<string, WritePerformanceMetrics>();
  private performanceAlerts: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;

  constructor(private databaseManager: DatabaseManager) {
    this.db = databaseManager.getConnection();
    this.initializeMonitoringTables();
  }

  /**
   * Start continuous index usage monitoring
   */
  async startMonitoring(intervalMinutes: number = 15): Promise<void> {
    if (this.monitoringActive) {
      console.warn('Index monitoring is already active');
      return;
    }

    this.monitoringActive = true;
    console.log(`Starting index usage monitoring (interval: ${intervalMinutes} minutes)`);

    // Initial analysis
    await this.performComprehensiveAnalysis();

    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performPeriodicAnalysis();
      } catch (error) {
        console.error('Error in periodic index analysis:', error);
        this.createPerformanceAlert('critical', 'monitoring_error', 
          'Index monitoring encountered an error', { error: error instanceof Error ? error.message : String(error) });
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop index usage monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.monitoringActive = false;
    console.log('Index usage monitoring stopped');
  }

  /**
   * Analyze query plan and track index usage
   */
  async analyzeQueryPlan(sql: string, params: any[] = []): Promise<QueryPlanAnalysis> {
    const queryId = this.generateQueryId(sql, params);
    const startTime = performance.now();

    try {
      // Get query plan using EXPLAIN QUERY PLAN
      const planStmt = this.db.prepare(`EXPLAIN QUERY PLAN ${sql}`);
      const rawPlan = planStmt.all(...params) as any[];
      
      const executionTime = performance.now() - startTime;
      
      // Parse query plan
      const analysis = this.parseQueryPlan(queryId, sql, params, rawPlan, executionTime);
      
      // Update index usage statistics
      await this.updateIndexUsageStats(analysis);
      
      // Cache analysis
      this.queryPlanCache.set(queryId, analysis);
      
      // Store in database for historical analysis
      await this.storeQueryPlanAnalysis(analysis);
      
      return analysis;
    } catch (error) {
      console.error(`Failed to analyze query plan for: ${sql}`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive index usage statistics
   */
  async getIndexUsageStats(): Promise<Map<string, IndexUsageStats>> {
    const stats = new Map<string, IndexUsageStats>();
    
    // Get all indexes in the database
    const indexes = this.db.prepare(`
      SELECT name, tbl_name, sql 
      FROM sqlite_master 
      WHERE type = 'index' AND name NOT LIKE 'sqlite_autoindex_%'
      ORDER BY name
    `).all() as Array<{ name: string; tbl_name: string; sql: string }>;

    for (const index of indexes) {
      const indexStats = await this.calculateIndexEffectiveness(index.name, index.tbl_name);
      stats.set(index.name, indexStats);
    }

    this.indexStatsCache = stats;
    return stats;
  }

  /**
   * Identify unused indexes that can be safely dropped
   */
  async getUnusedIndexes(minDaysUnused: number = 30): Promise<string[]> {
    const unusedIndexes: string[] = [];
    const cutoffTime = Date.now() - (minDaysUnused * 24 * 60 * 60 * 1000);
    
    const stats = await this.getIndexUsageStats();
    
    for (const [indexName, indexStats] of stats) {
      // Skip system indexes and primary key indexes
      if (indexName.startsWith('sqlite_') || indexName.includes('pk_')) {
        continue;
      }
      
      // Check if index hasn't been used recently
      if (indexStats.lastUsed < cutoffTime || indexStats.usageCount === 0) {
        // Additional safety checks
        const isReferenced = await this.isIndexReferencedInConstraints(indexName);
        if (!isReferenced) {
          unusedIndexes.push(indexName);
        }
      }
    }
    
    return unusedIndexes;
  }

  /**
   * Generate index optimization recommendations
   */
  async generateIndexOptimizations(): Promise<IndexOptimizationRecommendation[]> {
    const recommendations: IndexOptimizationRecommendation[] = [];
    
    // Analyze current index usage
    const indexStats = await this.getIndexUsageStats();
    const slowQueries = await this.getSlowQueries();
    const writeMetrics = await this.getWritePerformanceMetrics();
    
    // 1. Recommend dropping unused indexes
    const unusedIndexes = await this.getUnusedIndexes();
    for (const indexName of unusedIndexes) {
      const stats = indexStats.get(indexName);
      if (stats && stats.maintenanceCost > 10) {
        recommendations.push({
          type: 'drop',
          indexName,
          tableName: stats.tableName,
          reason: `Index unused for ${Math.floor((Date.now() - stats.lastUsed) / (24 * 60 * 60 * 1000))} days with high maintenance cost`,
          expectedImpact: 'medium',
          sql: `DROP INDEX IF EXISTS ${indexName}`,
          riskLevel: 'low',
          estimatedBenefit: stats.maintenanceCost,
          implementationPriority: 3,
          costBenefitScore: stats.maintenanceCost * 2,
          implementationComplexity: 'low',
          riskAssessment: 'Low risk - unused index removal'
        });
      }
    }
    
    // 2. Recommend new indexes for slow queries
    for (const query of slowQueries) {
      if (query.tableScans.length > 0) {
        const indexRecommendation = this.suggestIndexForQuery(query);
        if (indexRecommendation) {
          recommendations.push(indexRecommendation);
        }
      }
    }
    
    // 3. Recommend index rebuilds for fragmented indexes
    for (const [indexName, stats] of indexStats) {
      if (stats.effectivenessScore < 0.5 && stats.usageCount > 100) {
        recommendations.push({
          type: 'rebuild',
          indexName,
          tableName: stats.tableName,
          reason: `Low effectiveness score (${stats.effectivenessScore.toFixed(2)}) despite high usage`,
          expectedImpact: 'medium',
          sql: `REINDEX ${indexName}`,
          riskLevel: 'low',
          estimatedBenefit: (1 - stats.effectivenessScore) * 100,
          implementationPriority: 2,
          costBenefitScore: (1 - stats.effectivenessScore) * 150,
          implementationComplexity: 'medium',
          riskAssessment: 'Low risk - index rebuild operation'
        });
      }
    }
    
    // 4. Recommend composite index optimizations
    const compositeRecommendations = await this.analyzeCompositeIndexOpportunities();
    recommendations.push(...compositeRecommendations);
    
    // Sort by priority and expected impact
    return recommendations.sort((a, b) => {
      if (a.implementationPriority !== b.implementationPriority) {
        return a.implementationPriority - b.implementationPriority;
      }
      return b.estimatedBenefit - a.estimatedBenefit;
    });
  }

  /**
   * Monitor write performance impact of indexes
   */
  async getWritePerformanceMetrics(): Promise<Map<string, WritePerformanceMetrics>> {
    const metrics = new Map<string, WritePerformanceMetrics>();
    
    // Get tables with analytics data
    const tables = ['conversation_analytics', 'knowledge_gaps', 'decision_tracking', 
                   'productivity_patterns', 'topic_evolution', 'insights'];
    
    for (const tableName of tables) {
      const tableMetrics = await this.calculateWriteMetrics(tableName);
      metrics.set(tableName, tableMetrics);
    }
    
    this.writeMetricsCache = metrics;
    return metrics;
  }

  /**
   * Get performance alerts for immediate attention
   */
  getPerformanceAlerts(severity?: 'critical' | 'high' | 'medium' | 'low'): PerformanceAlert[] {
    let alerts = this.performanceAlerts.filter(alert => !alert.resolved);
    
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(): Promise<{
    summary: {
      totalIndexes: number;
      unusedIndexes: number;
      highImpactIndexes: number;
      slowQueries: number;
      averageQueryTime: number;
      writeImpact: number;
    };
    indexStats: Map<string, IndexUsageStats>;
    recommendations: IndexOptimizationRecommendation[];
    alerts: PerformanceAlert[];
    writeMetrics: Map<string, WritePerformanceMetrics>;
    trends: {
      queryTimesTrend: 'improving' | 'stable' | 'degrading';
      indexUsageTrend: 'increasing' | 'stable' | 'decreasing';
      writePerformanceTrend: 'improving' | 'stable' | 'degrading';
    };
  }> {
    const indexStats = await this.getIndexUsageStats();
    const recommendations = await this.generateIndexOptimizations();
    const alerts = this.getPerformanceAlerts();
    const writeMetrics = await this.getWritePerformanceMetrics();
    const slowQueries = await this.getSlowQueries();
    
    const unusedIndexes = await this.getUnusedIndexes();
    const highImpactIndexes = Array.from(indexStats.values())
      .filter(stats => stats.effectivenessScore > 0.8).length;
    
    const avgQueryTime = slowQueries.length > 0 
      ? slowQueries.reduce((sum, q) => sum + q.executionTime, 0) / slowQueries.length
      : 0;
    
    const writeImpact = Array.from(writeMetrics.values())
      .reduce((sum, m) => sum + m.indexMaintenanceOverhead, 0) / writeMetrics.size;
    
    return {
      summary: {
        totalIndexes: indexStats.size,
        unusedIndexes: unusedIndexes.length,
        highImpactIndexes,
        slowQueries: slowQueries.length,
        averageQueryTime: avgQueryTime,
        writeImpact
      },
      indexStats,
      recommendations,
      alerts,
      writeMetrics,
      trends: await this.calculatePerformanceTrends()
    };
  }

  /**
   * Execute index optimization recommendations
   */
  async executeRecommendation(recommendation: IndexOptimizationRecommendation): Promise<{
    success: boolean;
    message: string;
    executionTime?: number;
    error?: string;
  }> {
    const startTime = performance.now();
    
    try {
      console.log(`Executing ${recommendation.type} recommendation for ${recommendation.indexName}`);
      
      // Safety checks
      if (recommendation.riskLevel === 'high') {
        throw new Error('High-risk operations require manual approval');
      }
      
      // Execute the SQL
      this.db.exec(recommendation.sql);
      
      const executionTime = performance.now() - startTime;
      
      // Log the action
      await this.logIndexAction(recommendation, 'executed', executionTime);
      
      // Clear relevant caches
      this.invalidateCache(recommendation.tableName);
      
      return {
        success: true,
        message: `Successfully executed ${recommendation.type} for ${recommendation.indexName}`,
        executionTime
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.logIndexAction(recommendation, 'failed', 0, errorMessage);
      
      return {
        success: false,
        message: `Failed to execute ${recommendation.type} for ${recommendation.indexName}`,
        error: errorMessage
      };
    }
  }

  // Private implementation methods

  private initializeMonitoringTables(): void {
    // Create tables if they don't exist (they should exist from migrations)
    const tables = [
      `CREATE TABLE IF NOT EXISTS index_usage_monitoring (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        index_name TEXT NOT NULL,
        table_name TEXT NOT NULL,
        usage_count INTEGER DEFAULT 0,
        hit_count INTEGER DEFAULT 0,
        miss_count INTEGER DEFAULT 0,
        last_used INTEGER,
        avg_query_time REAL DEFAULT 0,
        effectiveness_score REAL DEFAULT 0,
        query_types TEXT, -- JSON array
        size_bytes INTEGER DEFAULT 0,
        maintenance_cost REAL DEFAULT 0,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`,
      
      `CREATE TABLE IF NOT EXISTS query_plan_analysis (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        query_id TEXT NOT NULL,
        sql_pattern TEXT NOT NULL,
        execution_time REAL NOT NULL,
        indexes_used TEXT, -- JSON array
        table_scans TEXT, -- JSON array
        recommendations TEXT, -- JSON array
        performance_issues TEXT, -- JSON array
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`,
      
      `CREATE TABLE IF NOT EXISTS index_optimization_log (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        index_name TEXT NOT NULL,
        table_name TEXT NOT NULL,
        action_type TEXT NOT NULL,
        sql_executed TEXT,
        status TEXT NOT NULL,
        execution_time REAL,
        error_message TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )`
    ];

    for (const tableSQL of tables) {
      try {
        this.db.exec(tableSQL);
      } catch (error) {
        console.error('Failed to create monitoring table:', error);
      }
    }

    // Create indexes for monitoring tables
    const monitoringIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_index_usage_name ON index_usage_monitoring(index_name)',
      'CREATE INDEX IF NOT EXISTS idx_index_usage_table ON index_usage_monitoring(table_name)',
      'CREATE INDEX IF NOT EXISTS idx_query_plan_id ON query_plan_analysis(query_id)',
      'CREATE INDEX IF NOT EXISTS idx_optimization_log_time ON index_optimization_log(created_at DESC)'
    ];

    for (const indexSQL of monitoringIndexes) {
      try {
        this.db.exec(indexSQL);
      } catch (error) {
        console.error('Failed to create monitoring index:', error);
      }
    }
  }

  private async performComprehensiveAnalysis(): Promise<void> {
    console.log('Performing comprehensive index analysis...');
    
    // Analyze all existing indexes
    await this.getIndexUsageStats();
    
    // Check for slow queries
    const slowQueries = await this.getSlowQueries();
    if (slowQueries.length > 0) {
      this.createPerformanceAlert('high', 'slow_query', 
        `${slowQueries.length} slow queries detected`, 
        { slowQueries: slowQueries.slice(0, 5) });
    }
    
    // Check for unused indexes
    const unusedIndexes = await this.getUnusedIndexes();
    if (unusedIndexes.length > 0) {
      this.createPerformanceAlert('medium', 'unused_index',
        `${unusedIndexes.length} unused indexes found`,
        { indexes: unusedIndexes });
    }
    
    // Monitor write performance
    await this.getWritePerformanceMetrics();
    
    console.log('Comprehensive analysis completed');
  }

  private async performPeriodicAnalysis(): Promise<void> {
    // Update index statistics
    await this.getIndexUsageStats();
    
    // Check for performance degradation
    await this.checkPerformanceDegradation();
    
    // Clean up old data
    await this.cleanupOldMonitoringData();
  }

  private parseQueryPlan(
    queryId: string,
    sql: string,
    params: any[],
    rawPlan: any[],
    executionTime: number
  ): QueryPlanAnalysis {
    const planSteps: QueryPlanAnalysis['planSteps'] = [];
    const indexesUsed: string[] = [];
    const tableScans: string[] = [];
    const recommendations: string[] = [];
    const performanceIssues: string[] = [];

    for (const step of rawPlan) {
      const detail = step.detail || '';
      
      const planStep = {
        operation: this.extractOperation(detail),
        table: this.extractTable(detail),
        indexUsed: this.extractIndex(detail),
        estimatedCost: this.estimateCost(detail),
        rowsScanned: this.estimateRowsScanned(detail)
      };
      
      planSteps.push(planStep);
      
      // Track indexes used
      if (planStep.indexUsed && !indexesUsed.includes(planStep.indexUsed)) {
        indexesUsed.push(planStep.indexUsed);
      }
      
      // Track table scans
      if (detail.includes('SCAN TABLE')) {
        const tableName = this.extractTable(detail);
        if (tableName && !tableScans.includes(tableName)) {
          tableScans.push(tableName);
          recommendations.push(`Consider adding an index for table scans on ${tableName}`);
        }
      }
      
      // Detect performance issues
      if (detail.includes('USE TEMP B-TREE FOR ORDER BY')) {
        performanceIssues.push('Temporary B-tree created for ORDER BY - consider adding covering index');
      }
      
      if (detail.includes('USE TEMP B-TREE FOR GROUP BY')) {
        performanceIssues.push('Temporary B-tree created for GROUP BY - consider adding index');
      }
    }

    return {
      queryId,
      sql,
      params,
      executionTime,
      planSteps,
      indexesUsed,
      tableScans,
      recommendations,
      performanceIssues
    };
  }

  private async updateIndexUsageStats(analysis: QueryPlanAnalysis): Promise<void> {
    const timestamp = Date.now();
    
    for (const indexName of analysis.indexesUsed) {
      const stmt = this.db.prepare(`
        INSERT INTO index_usage_monitoring 
        (index_name, table_name, usage_count, hit_count, last_used, avg_query_time, updated_at)
        VALUES (?, ?, 1, 1, ?, ?, ?)
        ON CONFLICT(index_name) DO UPDATE SET
          usage_count = usage_count + 1,
          hit_count = hit_count + 1,
          last_used = ?,
          avg_query_time = (avg_query_time * usage_count + ?) / (usage_count + 1),
          updated_at = ?
      `);
      
      const tableName = this.getTableForIndex(indexName);
      stmt.run(indexName, tableName, timestamp, analysis.executionTime, timestamp,
               timestamp, analysis.executionTime, timestamp);
    }
    
    // Track misses for table scans
    for (const tableName of analysis.tableScans) {
      const stmt = this.db.prepare(`
        INSERT INTO index_usage_monitoring 
        (index_name, table_name, usage_count, miss_count, last_used, avg_query_time, updated_at)
        VALUES (?, ?, 1, 1, ?, ?, ?)
        ON CONFLICT(index_name) DO UPDATE SET
          usage_count = usage_count + 1,
          miss_count = miss_count + 1,
          last_used = ?,
          avg_query_time = (avg_query_time * usage_count + ?) / (usage_count + 1),
          updated_at = ?
      `);
      
      stmt.run(`table_scan_${tableName}`, tableName, timestamp, analysis.executionTime, timestamp,
               timestamp, analysis.executionTime, timestamp);
    }
  }

  private async calculateIndexEffectiveness(indexName: string, tableName: string): Promise<IndexUsageStats> {
    const stats = this.db.prepare(`
      SELECT * FROM index_usage_monitoring WHERE index_name = ?
    `).get(indexName) as any;
    
    if (!stats) {
      return {
        indexName,
        tableName,
        usageCount: 0,
        hitCount: 0,
        missCount: 0,
        lastUsed: 0,
        avgQueryTime: 0,
        effectivenessScore: 0,
        queryTypes: [],
        sizeBytes: 0,
        maintenanceCost: 0
      };
    }
    
    const effectivenessScore = stats.hit_count > 0 
      ? stats.hit_count / (stats.hit_count + stats.miss_count)
      : 0;
    
    const sizeBytes = await this.getIndexSize(indexName);
    const maintenanceCost = this.calculateMaintenanceCost(indexName, sizeBytes, stats.usage_count);
    
    return {
      indexName,
      tableName,
      usageCount: stats.usage_count || 0,
      hitCount: stats.hit_count || 0,
      missCount: stats.miss_count || 0,
      lastUsed: stats.last_used || 0,
      avgQueryTime: stats.avg_query_time || 0,
      effectivenessScore,
      queryTypes: stats.query_types ? JSON.parse(stats.query_types) : [],
      sizeBytes,
      maintenanceCost
    };
  }

  private async getSlowQueries(thresholdMs: number = 1000): Promise<QueryPlanAnalysis[]> {
    const slowQueries = this.db.prepare(`
      SELECT * FROM query_plan_analysis 
      WHERE execution_time > ? 
      ORDER BY execution_time DESC 
      LIMIT 20
    `).all(thresholdMs) as any[];
    
    return slowQueries.map(row => ({
      queryId: row.query_id,
      sql: row.sql_pattern,
      params: [],
      executionTime: row.execution_time,
      planSteps: [],
      indexesUsed: row.indexes_used ? JSON.parse(row.indexes_used) : [],
      tableScans: row.table_scans ? JSON.parse(row.table_scans) : [],
      recommendations: row.recommendations ? JSON.parse(row.recommendations) : [],
      performanceIssues: row.performance_issues ? JSON.parse(row.performance_issues) : []
    }));
  }

  private suggestIndexForQuery(query: QueryPlanAnalysis): IndexOptimizationRecommendation | null {
    if (query.tableScans.length === 0) return null;
    
    const tableName = query.tableScans[0];
    const indexName = `idx_${tableName}_performance_${Date.now()}`;
    
    // Simple heuristic - in production, this would be much more sophisticated
    const columns = this.extractColumnsFromQuery(query.sql);
    const indexColumns = columns.slice(0, 3).join(', '); // Limit to 3 columns
    
    return {
      type: 'create',
      indexName,
      tableName,
      reason: `Table scan detected on ${tableName} for query taking ${query.executionTime.toFixed(2)}ms`,
      expectedImpact: query.executionTime > 5000 ? 'high' : 'medium',
      sql: `CREATE INDEX ${indexName} ON ${tableName} (${indexColumns})`,
      riskLevel: 'low',
      estimatedBenefit: Math.min(query.executionTime * 0.7, 1000),
      implementationPriority: 1,
      costBenefitScore: Math.min(query.executionTime * 0.5, 800),
      implementationComplexity: 'low',
      riskAssessment: 'Low risk - new index creation'
    };
  }

  private async analyzeCompositeIndexOpportunities(): Promise<IndexOptimizationRecommendation[]> {
    // This is a simplified version - production would analyze query patterns more thoroughly
    return [];
  }

  private async calculateWriteMetrics(tableName: string): Promise<WritePerformanceMetrics> {
    // Get index count for table
    const indexCount = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM sqlite_master 
      WHERE type = 'index' AND tbl_name = ?
    `).get(tableName) as { count: number };
    
    // Estimate write performance impact (simplified)
    const baseWriteTime = 10; // ms baseline
    const indexOverhead = indexCount.count * 2; // ms per index
    
    return {
      tableName,
      indexCount: indexCount.count,
      avgInsertTime: baseWriteTime + indexOverhead,
      avgUpdateTime: (baseWriteTime + indexOverhead) * 1.2,
      avgDeleteTime: (baseWriteTime + indexOverhead) * 0.8,
      writeThroughputImpact: indexOverhead / baseWriteTime,
      indexMaintenanceOverhead: indexOverhead
    };
  }

  private createPerformanceAlert(
    severity: 'critical' | 'high' | 'medium' | 'low',
    type: PerformanceAlert['type'],
    message: string,
    details: Record<string, any> = {}
  ): void {
    const alert: PerformanceAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      severity,
      message,
      details,
      timestamp: Date.now(),
      resolved: false,
      actionRequired: severity === 'critical' || severity === 'high'
    };
    
    this.performanceAlerts.push(alert);
    console.warn(`Performance Alert [${severity.toUpperCase()}]: ${message}`);
  }

  private async checkPerformanceDegradation(): Promise<void> {
    // Check for recent performance trends
    const recentQueries = await this.getSlowQueries(500); // Lower threshold for trending
    
    if (recentQueries.length > 10) {
      this.createPerformanceAlert('high', 'index_degradation',
        'Performance degradation detected - increasing slow query count',
        { recentSlowQueries: recentQueries.length });
    }
    
    // Check write performance impact
    const writeMetrics = this.writeMetricsCache;
    for (const [tableName, metrics] of writeMetrics) {
      if (metrics.writeThroughputImpact > 0.5) {
        this.createPerformanceAlert('medium', 'write_impact',
          `High write performance impact on ${tableName}`,
          { impact: metrics.writeThroughputImpact, indexCount: metrics.indexCount });
      }
    }
  }

  private async calculatePerformanceTrends(): Promise<{
    queryTimesTrend: 'improving' | 'stable' | 'degrading';
    indexUsageTrend: 'increasing' | 'stable' | 'decreasing';
    writePerformanceTrend: 'improving' | 'stable' | 'degrading';
  }> {
    // Simplified trend calculation - in production would use proper time series analysis
    return {
      queryTimesTrend: 'stable',
      indexUsageTrend: 'stable',
      writePerformanceTrend: 'stable'
    };
  }

  private async cleanupOldMonitoringData(): Promise<void> {
    const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
    
    this.db.prepare(`
      DELETE FROM query_plan_analysis WHERE created_at < ?
    `).run(cutoffTime);
    
    this.db.prepare(`
      DELETE FROM index_optimization_log WHERE created_at < ?
    `).run(cutoffTime);
  }

  // Helper methods for query plan parsing
  private extractOperation(detail: string): string {
    if (detail.includes('SCAN TABLE')) return 'TABLE_SCAN';
    if (detail.includes('SEARCH TABLE')) return 'INDEX_SEEK';
    if (detail.includes('USE TEMP B-TREE')) return 'TEMP_SORT';
    return 'OTHER';
  }

  private extractTable(detail: string): string {
    const match = detail.match(/TABLE (\w+)/);
    return match ? match[1] : '';
  }

  private extractIndex(detail: string): string | null {
    const match = detail.match(/USING INDEX (\w+)/);
    return match ? match[1] : null;
  }

  private estimateCost(detail: string): number {
    if (detail.includes('SCAN TABLE')) return 1000;
    if (detail.includes('USING INDEX')) return 10;
    return 100;
  }

  private estimateRowsScanned(detail: string): number {
    // Simplified estimation
    if (detail.includes('SCAN TABLE')) return 10000;
    return 100;
  }

  private generateQueryId(sql: string, params: any[]): string {
    const normalized = sql.toLowerCase().replace(/\s+/g, ' ').trim();
    return `query_${normalized.substring(0, 50)}_${JSON.stringify(params).substring(0, 20)}`;
  }

  private getTableForIndex(indexName: string): string {
    const result = this.db.prepare(`
      SELECT tbl_name FROM sqlite_master WHERE name = ? AND type = 'index'
    `).get(indexName) as { tbl_name: string } | undefined;
    
    return result?.tbl_name || 'unknown';
  }

  private async getIndexSize(indexName: string): Promise<number> {
    // Simplified size estimation - in production would use PRAGMA index_info
    return 1024; // 1KB default estimate
  }

  private calculateMaintenanceCost(indexName: string, sizeBytes: number, usageCount: number): number {
    // Cost based on size and usage frequency
    return (sizeBytes / 1024) * (usageCount / 1000);
  }

  private async isIndexReferencedInConstraints(indexName: string): Promise<boolean> {
    // Check if index is part of foreign key or unique constraints
    const result = this.db.prepare(`
      SELECT COUNT(*) as count FROM sqlite_master 
      WHERE type = 'table' AND sql LIKE ?
    `).get(`%${indexName}%`) as { count: number };
    
    return result.count > 0;
  }

  private extractColumnsFromQuery(sql: string): string[] {
    // Simplified column extraction - in production would use proper SQL parsing
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/i);
    if (whereMatch) {
      const conditions = whereMatch[1];
      const columns = conditions.match(/\w+\s*[=<>]/g) || [];
      return columns.map(col => col.replace(/\s*[=<>]/, '').trim());
    }
    return [];
  }

  private async storeQueryPlanAnalysis(analysis: QueryPlanAnalysis): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO query_plan_analysis 
      (query_id, sql_pattern, execution_time, indexes_used, table_scans, recommendations, performance_issues)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      analysis.queryId,
      analysis.sql,
      analysis.executionTime,
      JSON.stringify(analysis.indexesUsed),
      JSON.stringify(analysis.tableScans),
      JSON.stringify(analysis.recommendations),
      JSON.stringify(analysis.performanceIssues)
    );
  }

  private async logIndexAction(
    recommendation: IndexOptimizationRecommendation,
    status: 'executed' | 'failed',
    executionTime: number,
    errorMessage?: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO index_optimization_log 
      (index_name, table_name, action_type, sql_executed, status, execution_time, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      recommendation.indexName,
      recommendation.tableName,
      recommendation.type,
      recommendation.sql,
      status,
      executionTime,
      errorMessage || null
    );
  }

  private invalidateCache(tableName: string): void {
    // Clear relevant caches when indexes change
    for (const key of this.queryPlanCache.keys()) {
      if (key.includes(tableName)) {
        this.queryPlanCache.delete(key);
      }
    }
    
    for (const key of this.indexStatsCache.keys()) {
      const stats = this.indexStatsCache.get(key);
      if (stats && stats.tableName === tableName) {
        this.indexStatsCache.delete(key);
      }
    }
  }
}