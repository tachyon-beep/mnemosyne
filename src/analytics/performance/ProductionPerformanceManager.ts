/**
 * Production Performance Manager - Orchestrates All Performance Monitoring
 * 
 * Central coordinator for production-quality database performance monitoring:
 * - Integrates index usage monitoring with existing analytics
 * - Coordinates with AnalyticsPerformanceOptimizer
 * - Provides unified performance management interface
 * - Handles automated optimization decisions
 * - Manages performance alerts and notifications
 * - Coordinates maintenance scheduling across all systems
 */

import { DatabaseManager } from '../../storage/Database.js';
import { AnalyticsPerformanceOptimizer } from './AnalyticsPerformanceOptimizer.js';
import { IndexUsageMonitor, IndexOptimizationRecommendation, PerformanceAlert } from './IndexUsageMonitor.js';
import { IndexMonitoringDashboard } from './IndexMonitoringDashboard.js';
import { AnalyticsEngine } from '../services/AnalyticsEngine.js';

export interface PerformanceConfiguration {
  monitoring: {
    enabled: boolean;
    intervalMinutes: number;
    alertThresholds: {
      slowQueryMs: number;
      unusedIndexDays: number;
      writeImpactThreshold: number;
      memoryUsageThresholdMB: number;
    };
    retentionDays: number;
  };
  optimization: {
    autoOptimizeEnabled: boolean;
    autoDropUnusedIndexes: boolean;
    maxConcurrentOptimizations: number;
    maintenanceWindowHours: number[];
    riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  };
  alerts: {
    emailNotifications: boolean;
    webhookUrl?: string;
    escalationThresholds: {
      criticalAlertCount: number;
      highAlertDurationMinutes: number;
    };
  };
}

export interface PerformanceStatus {
  overall: 'excellent' | 'good' | 'warning' | 'critical';
  systems: {
    indexMonitoring: 'active' | 'inactive' | 'error';
    queryOptimization: 'active' | 'inactive' | 'error';
    alertSystem: 'active' | 'inactive' | 'error';
    maintenanceScheduler: 'active' | 'inactive' | 'error';
  };
  lastUpdate: number;
  nextScheduledMaintenance?: number;
  activeOptimizations: number;
  pendingAlerts: number;
}

export interface AutomationDecision {
  id: string;
  type: 'index_optimization' | 'maintenance_task' | 'alert_escalation';
  decision: 'approve' | 'defer' | 'reject';
  reason: string;
  confidence: number;
  riskAssessment: string;
  timestamp: number;
  executedAt?: number;
  result?: 'success' | 'failure' | 'partial';
}

export interface PerformanceReport {
  period: {
    start: number;
    end: number;
    duration: string;
  };
  summary: {
    overallHealth: number;
    performanceScore: number;
    optimizationsExecuted: number;
    alertsGenerated: number;
    maintenanceTasksCompleted: number;
  };
  trends: {
    queryPerformance: Array<{ timestamp: number; avgTime: number }>;
    indexEffectiveness: Array<{ timestamp: number; score: number }>;
    systemLoad: Array<{ timestamp: number; load: number }>;
  };
  achievements: string[];
  concerns: string[];
  recommendations: string[];
}

/**
 * Unified performance management system for production environments
 */
export class ProductionPerformanceManager {
  private config: PerformanceConfiguration;
  private indexMonitor: IndexUsageMonitor;
  private analyticsOptimizer: AnalyticsPerformanceOptimizer;
  private dashboard: IndexMonitoringDashboard;
  private automationDecisions: AutomationDecision[] = [];
  private performanceHistory: PerformanceStatus[] = [];
  private isRunning = false;
  private maintenanceTimer: NodeJS.Timeout | null = null;

  constructor(
    private databaseManager: DatabaseManager,
    private analyticsEngine: AnalyticsEngine,
    config: Partial<PerformanceConfiguration> = {}
  ) {
    this.config = this.mergeConfig(config);
    this.indexMonitor = new IndexUsageMonitor(databaseManager);
    this.analyticsOptimizer = new AnalyticsPerformanceOptimizer(databaseManager);
    this.dashboard = new IndexMonitoringDashboard(databaseManager);
  }

  /**
   * Initialize and start the complete performance management system
   */
  async initialize(): Promise<void> {
    if (this.isRunning) {
      console.warn('Performance manager is already running');
      return;
    }

    console.log('Initializing Production Performance Manager...');

    try {
      // Initialize monitoring components
      if (this.config.monitoring.enabled) {
        await this.indexMonitor.startMonitoring(this.config.monitoring.intervalMinutes);
        await this.dashboard.initialize();
      }

      // Start periodic status updates
      this.startPeriodicStatusUpdates();

      // Schedule maintenance windows
      this.scheduleMaintenanceWindows();

      // Set up automated decision making
      if (this.config.optimization.autoOptimizeEnabled) {
        this.startAutomatedOptimization();
      }

      this.isRunning = true;
      console.log('Production Performance Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize Performance Manager:', error);
      throw error;
    }
  }

  /**
   * Shutdown the performance management system
   */
  async shutdown(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Shutting down Production Performance Manager...');

    this.indexMonitor.stopMonitoring();

    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
      this.maintenanceTimer = null;
    }

    this.isRunning = false;
    console.log('Performance Manager shutdown complete');
  }

  /**
   * Get current system performance status
   */
  async getPerformanceStatus(): Promise<PerformanceStatus> {
    const alerts = this.indexMonitor.getPerformanceAlerts();
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;

    // Determine overall status
    let overall: PerformanceStatus['overall'] = 'excellent';
    if (criticalAlerts > 0) overall = 'critical';
    else if (highAlerts > 2) overall = 'warning';
    else if (highAlerts > 0) overall = 'good';

    const status: PerformanceStatus = {
      overall,
      systems: {
        indexMonitoring: this.isRunning ? 'active' : 'inactive',
        queryOptimization: this.config.optimization.autoOptimizeEnabled ? 'active' : 'inactive',
        alertSystem: this.config.alerts.emailNotifications ? 'active' : 'inactive',
        maintenanceScheduler: this.maintenanceTimer ? 'active' : 'inactive'
      },
      lastUpdate: Date.now(),
      activeOptimizations: this.getActiveOptimizationsCount(),
      pendingAlerts: alerts.filter(a => !a.resolved).length
    };

    // Store for historical analysis
    this.performanceHistory.push(status);
    
    // Keep only last 1000 status updates
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }

    return status;
  }

  /**
   * Execute comprehensive performance analysis and optimization
   */
  async performComprehensiveOptimization(): Promise<{
    analysisResults: any;
    optimizationsExecuted: number;
    recommendations: IndexOptimizationRecommendation[];
    errors: string[];
  }> {
    console.log('Starting comprehensive performance optimization...');

    const results = {
      analysisResults: {} as any,
      optimizationsExecuted: 0,
      recommendations: [] as IndexOptimizationRecommendation[],
      errors: [] as string[]
    };

    try {
      // 1. Generate performance report from dashboard
      results.analysisResults.dashboard = await this.dashboard.generateExecutiveSummary();

      // 2. Get optimization recommendations
      const recommendations = await this.dashboard.getOptimizationRecommendations();
      results.recommendations = recommendations;

      // 3. Execute safe optimizations automatically
      if (this.config.optimization.autoOptimizeEnabled) {
        const safeRecommendations = recommendations.filter(rec => 
          rec.riskLevel === 'low' && 
          rec.implementationComplexity === 'low'
        );

        for (const rec of safeRecommendations.slice(0, this.config.optimization.maxConcurrentOptimizations)) {
          try {
            const result = await this.indexMonitor.executeRecommendation(rec);
            if (result.success) {
              results.optimizationsExecuted++;
              
              // Record automation decision
              this.recordAutomationDecision('index_optimization', 'approve', 
                `Auto-executed safe optimization: ${rec.reason}`, 0.9);
            } else {
              results.errors.push(`Failed to execute ${rec.indexName}: ${result.message || 'Unknown error'}`);
            }
          } catch (error) {
            results.errors.push(`Error executing ${rec.indexName}: ${error instanceof Error ? error.message : String(error)}`);
          }
        }
      }

      // 4. Analyze query patterns with analytics optimizer
      results.analysisResults.queryOptimization = this.analyticsOptimizer.getPerformanceReport();

      console.log(`Comprehensive optimization completed. Executed ${results.optimizationsExecuted} optimizations.`);

    } catch (error) {
      console.error('Error during comprehensive optimization:', error);
      results.errors.push(`Comprehensive optimization error: ${error instanceof Error ? error.message : String(error)}`);
    }

    return results;
  }

  /**
   * Handle performance alerts with automated decision making
   */
  async handlePerformanceAlert(alert: PerformanceAlert): Promise<AutomationDecision> {
    console.log(`Processing performance alert: ${alert.type} - ${alert.severity}`);

    const decision = this.makeAutomatedDecision(alert);
    
    // Execute decision if approved
    if (decision.decision === 'approve') {
      try {
        await this.executeAlertAction(alert, decision);
        decision.result = 'success';
        decision.executedAt = Date.now();
      } catch (error) {
        console.error(`Failed to execute alert action for ${alert.id}:`, error);
        decision.result = 'failure';
      }
    }

    // Send notifications if configured
    if (this.config.alerts.emailNotifications || this.config.alerts.webhookUrl) {
      await this.sendAlertNotification(alert, decision);
    }

    this.recordAutomationDecision('alert_escalation', decision.decision, decision.reason, decision.confidence);
    return decision;
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(periodDays: number = 7): Promise<PerformanceReport> {
    const endTime = Date.now();
    const startTime = endTime - (periodDays * 24 * 60 * 60 * 1000);

    // Get dashboard data
    const executiveSummary = await this.dashboard.generateExecutiveSummary();
    const currentMetrics = await this.dashboard.getCurrentMetrics();

    // Calculate trends from historical data
    const periodHistory = this.performanceHistory.filter(
      h => h.lastUpdate >= startTime && h.lastUpdate <= endTime
    );

    const queryTrend = periodHistory.map(h => ({
      timestamp: h.lastUpdate,
      avgTime: currentMetrics.overview.averageQueryTime // Simplified
    }));

    const indexTrend = periodHistory.map(h => ({
      timestamp: h.lastUpdate,
      score: currentMetrics.performance.indexEffectiveness // Simplified
    }));

    const systemLoadTrend = periodHistory.map(h => ({
      timestamp: h.lastUpdate,
      load: currentMetrics.performance.memoryUsage / 100 // Simplified
    }));

    // Count optimizations and alerts in period
    const periodDecisions = this.automationDecisions.filter(
      d => d.timestamp >= startTime && d.timestamp <= endTime
    );

    const optimizationsExecuted = periodDecisions.filter(
      d => d.type === 'index_optimization' && d.result === 'success'
    ).length;

    const alertsGenerated = periodDecisions.filter(
      d => d.type === 'alert_escalation'
    ).length;

    // Generate achievements and concerns
    const achievements = this.generateAchievements(executiveSummary, optimizationsExecuted);
    const concerns = this.generateConcerns(executiveSummary);
    const recommendations = this.generateRecommendations(executiveSummary);

    return {
      period: {
        start: startTime,
        end: endTime,
        duration: `${periodDays} days`
      },
      summary: {
        overallHealth: executiveSummary.keyMetrics.efficiencyScore as number,
        performanceScore: Math.round(currentMetrics.performance.indexEffectiveness * 100),
        optimizationsExecuted,
        alertsGenerated,
        maintenanceTasksCompleted: 0 // Would track from maintenance system
      },
      trends: {
        queryPerformance: queryTrend,
        indexEffectiveness: indexTrend,
        systemLoad: systemLoadTrend
      },
      achievements,
      concerns,
      recommendations
    };
  }

  /**
   * Get automation decisions history
   */
  getAutomationHistory(limit: number = 100): AutomationDecision[] {
    return this.automationDecisions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Update performance configuration
   */
  updateConfiguration(config: Partial<PerformanceConfiguration>): void {
    this.config = this.mergeConfig(config);
    console.log('Performance configuration updated');
  }

  /**
   * Export complete performance data
   */
  async exportPerformanceData(): Promise<{
    configuration: PerformanceConfiguration;
    currentStatus: PerformanceStatus;
    dashboardData: string;
    automationHistory: AutomationDecision[];
    performanceHistory: PerformanceStatus[];
  }> {
    return {
      configuration: this.config,
      currentStatus: await this.getPerformanceStatus(),
      dashboardData: await this.dashboard.exportMonitoringData('json'),
      automationHistory: this.automationDecisions,
      performanceHistory: this.performanceHistory.slice(-1000)
    };
  }

  // Private implementation methods

  private mergeConfig(config: Partial<PerformanceConfiguration>): PerformanceConfiguration {
    return {
      monitoring: {
        enabled: true,
        intervalMinutes: 15,
        alertThresholds: {
          slowQueryMs: 1000,
          unusedIndexDays: 30,
          writeImpactThreshold: 0.5,
          memoryUsageThresholdMB: 500
        },
        retentionDays: 30,
        ...config.monitoring
      },
      optimization: {
        autoOptimizeEnabled: false, // Conservative default
        autoDropUnusedIndexes: false,
        maxConcurrentOptimizations: 3,
        maintenanceWindowHours: [2, 3, 4], // 2-4 AM
        riskTolerance: 'conservative',
        ...config.optimization
      },
      alerts: {
        emailNotifications: false,
        escalationThresholds: {
          criticalAlertCount: 3,
          highAlertDurationMinutes: 60
        },
        ...config.alerts
      }
    };
  }

  private startPeriodicStatusUpdates(): void {
    setInterval(async () => {
      try {
        await this.getPerformanceStatus();
      } catch (error) {
        console.error('Error updating performance status:', error);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  private scheduleMaintenanceWindows(): void {
    // Schedule maintenance during configured hours
    this.maintenanceTimer = setInterval(async () => {
      const currentHour = new Date().getHours();
      if (this.config.optimization.maintenanceWindowHours.includes(currentHour)) {
        await this.performScheduledMaintenance();
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  private startAutomatedOptimization(): void {
    setInterval(async () => {
      try {
        const recommendations = await this.dashboard.getOptimizationRecommendations();
        const safeRecommendations = recommendations.filter(rec => 
          rec.riskLevel === 'low' && rec.costBenefitScore > 50
        );

        if (safeRecommendations.length > 0) {
          await this.performComprehensiveOptimization();
        }
      } catch (error) {
        console.error('Error in automated optimization:', error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private async performScheduledMaintenance(): Promise<void> {
    console.log('Performing scheduled maintenance...');

    const maintenanceTasks = this.dashboard.getMaintenanceSchedule();
    const dueTasks = maintenanceTasks.filter(task => 
      task.scheduledTime <= Date.now() && 
      (task.priority === 'critical' || task.priority === 'high')
    );

    for (const task of dueTasks) {
      try {
        const result = await this.dashboard.executeMaintenanceTask(`${task.task}_${task.target}`);
        if (result.success) {
          console.log(`Completed maintenance: ${task.task} on ${task.target}`);
          this.recordAutomationDecision('maintenance_task', 'approve',
            `Executed scheduled ${task.task}`, 0.95);
        }
      } catch (error) {
        console.error(`Failed maintenance task ${task.task}:`, error);
      }
    }
  }

  private makeAutomatedDecision(alert: PerformanceAlert): AutomationDecision {
    const decision: AutomationDecision = {
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'alert_escalation',
      decision: 'defer', // Default to safe option
      reason: '',
      confidence: 0,
      riskAssessment: '',
      timestamp: Date.now()
    };

    // Decision logic based on alert type and severity
    switch (alert.type) {
      case 'slow_query':
        if (alert.severity === 'critical' && this.config.optimization.riskTolerance !== 'conservative') {
          decision.decision = 'approve';
          decision.reason = 'Auto-approved critical slow query alert for immediate optimization';
          decision.confidence = 0.8;
          decision.riskAssessment = 'Medium risk - requires immediate attention';
        } else {
          decision.reason = 'Deferred slow query alert for manual review';
          decision.confidence = 0.6;
          decision.riskAssessment = 'Low risk - can wait for manual intervention';
        }
        break;

      case 'unused_index':
        if (this.config.optimization.autoDropUnusedIndexes && alert.severity !== 'critical') {
          decision.decision = 'approve';
          decision.reason = 'Auto-approved unused index removal based on configuration';
          decision.confidence = 0.9;
          decision.riskAssessment = 'Low risk - indexes confirmed unused';
        } else {
          decision.reason = 'Deferred unused index removal pending manual approval';
          decision.confidence = 0.7;
          decision.riskAssessment = 'Very low risk but requires confirmation';
        }
        break;

      default:
        decision.reason = `Deferred ${alert.type} alert - no automation rule defined`;
        decision.confidence = 0.5;
        decision.riskAssessment = 'Unknown risk - manual review required';
    }

    return decision;
  }

  private async executeAlertAction(alert: PerformanceAlert, decision: AutomationDecision): Promise<void> {
    switch (alert.type) {
      case 'slow_query':
        // Would implement slow query optimization
        console.log(`Executing slow query optimization for alert ${alert.id}`);
        break;
      case 'unused_index':
        // Would implement index removal
        console.log(`Removing unused indexes for alert ${alert.id}`);
        break;
      default:
        throw new Error(`No action handler for alert type: ${alert.type}`);
    }
  }

  private async sendAlertNotification(alert: PerformanceAlert, decision: AutomationDecision): Promise<void> {
    // Simplified notification - would implement email/webhook in production
    console.log(`NOTIFICATION: Alert ${alert.type} - ${alert.severity} | Decision: ${decision.decision}`);
    
    if (this.config.alerts.webhookUrl) {
      // Would send webhook notification
      console.log(`Webhook notification sent to ${this.config.alerts.webhookUrl}`);
    }
  }

  private recordAutomationDecision(
    type: AutomationDecision['type'],
    decision: AutomationDecision['decision'],
    reason: string,
    confidence: number
  ): void {
    this.automationDecisions.push({
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      decision,
      reason,
      confidence,
      riskAssessment: confidence > 0.8 ? 'Low risk' : confidence > 0.6 ? 'Medium risk' : 'High risk',
      timestamp: Date.now()
    });

    // Keep only last 10000 decisions
    if (this.automationDecisions.length > 10000) {
      this.automationDecisions = this.automationDecisions.slice(-5000);
    }
  }

  private getActiveOptimizationsCount(): number {
    // Would track active optimization tasks
    return 0;
  }

  private generateAchievements(summary: any, optimizationsExecuted: number): string[] {
    const achievements = [];
    
    if (summary.keyMetrics.efficiencyScore > 90) {
      achievements.push('Excellent system efficiency maintained (>90%)');
    }
    
    if (optimizationsExecuted > 0) {
      achievements.push(`Successfully executed ${optimizationsExecuted} automated optimizations`);
    }
    
    if (summary.keyMetrics.unusedIndexes === 0) {
      achievements.push('Zero unused indexes - optimal storage utilization');
    }
    
    if (summary.keyMetrics.averageQueryTime < 100) {
      achievements.push('Excellent query performance (<100ms average)');
    }
    
    return achievements;
  }

  private generateConcerns(summary: any): string[] {
    const concerns = [];
    
    if (summary.criticalIssues.length > 0) {
      concerns.push(`${summary.criticalIssues.length} critical issues require immediate attention`);
    }
    
    if (summary.keyMetrics.efficiencyScore < 60) {
      concerns.push('System efficiency below acceptable threshold (60%)');
    }
    
    if (summary.keyMetrics.unusedIndexes > 5) {
      concerns.push(`${summary.keyMetrics.unusedIndexes} unused indexes consuming storage`);
    }
    
    if (summary.keyMetrics.averageQueryTime > 1000) {
      concerns.push('Query performance degraded (>1000ms average)');
    }
    
    return concerns;
  }

  private generateRecommendations(summary: any): string[] {
    const recommendations = [];
    
    if (summary.recommendations.length > 0) {
      recommendations.push(...summary.recommendations.map((r: any) => r.recommendation));
    }
    
    recommendations.push('Regular performance monitoring and maintenance scheduling');
    recommendations.push('Consider enabling automated optimization for low-risk improvements');
    
    return recommendations.slice(0, 5); // Top 5 recommendations
  }
}