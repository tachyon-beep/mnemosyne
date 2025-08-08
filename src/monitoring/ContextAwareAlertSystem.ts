/**
 * Context-Aware Alert System
 * 
 * Provides intelligent alerting that considers:
 * - Current system load and conditions
 * - Historical patterns and trends
 * - Alert fatigue prevention
 * - Contextual alert suppression and enhancement
 * - Smart notification routing and prioritization
 */

import { EventEmitter } from 'events';

interface AlertContext {
  systemLoad: {
    cpu: number;
    memory: number;
    io: number;
  };
  recentActivity: {
    queryVolume: number;
    errorRate: number;
    userActivity: number;
  };
  timeContext: {
    hour: number;
    dayOfWeek: number;
    isBusinessHours: boolean;
    isMaintenanceWindow: boolean;
  };
  historicalBaseline: {
    typicalValueAtThisTime: number;
    standardDeviation: number;
    percentileRank: number; // Where current value ranks historically
  };
}

interface SmartAlert {
  id: string;
  originalSeverity: 'low' | 'medium' | 'high' | 'critical';
  adjustedSeverity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  category: string;
  value: number;
  threshold: number;
  message: string;
  context: AlertContext;
  suppressionReason?: string;
  enhancementReason?: string;
  actionableInsights: string[];
  predictedDuration: number; // How long this condition might last
  correlatedAlerts: string[]; // IDs of related alerts
  rootCauseAnalysis: {
    suspectedCause: string;
    confidence: number;
    supportingEvidence: string[];
  };
  timestamp: number;
  acknowledged?: boolean;
  resolvedAt?: number;
}

interface AlertPattern {
  pattern: string;
  frequency: number;
  typicalDuration: number;
  commonCauses: Array<{
    cause: string;
    probability: number;
    typicalResolution: string;
  }>;
  seasonality: {
    hourly: number[];
    daily: number[];
    weekly: number[];
  };
}

interface AlertSuppressionRule {
  id: string;
  name: string;
  conditions: Array<{
    metric: string;
    operator: 'and' | 'or';
    checks: Array<{
      field: string; // e.g., 'systemLoad.cpu', 'timeContext.isMaintenanceWindow'
      operator: '>' | '<' | '=' | '!=' | 'between';
      value: any;
    }>;
  }>;
  action: 'suppress' | 'downgrade' | 'delay' | 'enhance';
  reason: string;
  priority: number;
  enabled: boolean;
}

interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'webhook' | 'log' | 'console' | 'sms';
  config: any;
  severityFilter: Array<'low' | 'medium' | 'high' | 'critical'>;
  timeRestrictions?: {
    quietHours: { start: number; end: number }; // Hours of day
    weekendPolicy: 'normal' | 'critical-only' | 'suppress';
  };
  rateLimiting: {
    maxAlertsPerHour: number;
    cooldownMinutes: number;
  };
}


export class ContextAwareAlertSystem extends EventEmitter {
  private activeAlerts: Map<string, SmartAlert> = new Map();
  private alertHistory: SmartAlert[] = [];
  private alertPatterns: Map<string, AlertPattern> = new Map();
  private suppressionRules: Map<string, AlertSuppressionRule> = new Map();
  private notificationChannels: Map<string, NotificationChannel> = new Map();
  private alertFatigueScores: Map<string, number> = new Map(); // Tracks fatigue per alert type
  
  private readonly MAX_HISTORY_SIZE = 10000;
  private readonly CORRELATION_WINDOW_MINUTES = 30;
  private readonly PATTERN_LEARNING_WINDOW_DAYS = 30;

  constructor() {
    super();
    this.initializeDefaultRules();
    this.initializeDefaultChannels();
  }

  /**
   * Process a raw alert and apply context-aware intelligence
   */
  async processAlert(
    metric: string,
    category: string,
    value: number,
    threshold: number,
    originalSeverity: 'low' | 'medium' | 'high' | 'critical',
    rawMessage: string
  ): Promise<SmartAlert | null> {
    const context = await this.gatherAlertContext(metric, category, value);
    
    // Create base alert
    const alert: SmartAlert = {
      id: `alert_${category}_${metric}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      originalSeverity,
      adjustedSeverity: originalSeverity,
      metric,
      category,
      value,
      threshold,
      message: rawMessage,
      context,
      actionableInsights: [],
      predictedDuration: 0,
      correlatedAlerts: [],
      rootCauseAnalysis: {
        suspectedCause: 'Unknown',
        confidence: 0,
        supportingEvidence: []
      },
      timestamp: Date.now()
    };

    // Apply context-aware processing
    await this.applyContextualAdjustments(alert);
    
    // Check suppression rules
    if (await this.shouldSuppressAlert(alert)) {
      console.log(`🔇 Alert suppressed: ${alert.message} (${alert.suppressionReason})`);
      return null; // Alert is suppressed
    }

    // Correlate with existing alerts
    await this.correlateAlert(alert);
    
    // Generate actionable insights
    this.generateActionableInsights(alert);
    
    // Predict duration
    alert.predictedDuration = this.predictAlertDuration(alert);
    
    // Store and process
    this.activeAlerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    this.cleanupHistory();
    
    // Update patterns for learning
    this.updateAlertPatterns(alert);
    
    // Route notifications
    await this.routeNotifications(alert);
    
    console.log(`🚨 Context-aware alert: [${alert.adjustedSeverity.toUpperCase()}] ${alert.message}`);
    if (alert.actionableInsights.length > 0) {
      console.log(`💡 Insights: ${alert.actionableInsights.join('; ')}`);
    }
    
    this.emit('alert:processed', alert);
    return alert;
  }

  /**
   * Gather contextual information for alert processing
   */
  private async gatherAlertContext(metric: string, category: string, value: number): Promise<AlertContext> {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();
    
    // Get system load (would be injected from monitoring system)
    const systemLoad = {
      cpu: 0.5, // Placeholder - would come from actual monitoring
      memory: 0.6,
      io: 0.4
    };

    const recentActivity = {
      queryVolume: 100, // Placeholder
      errorRate: 0.02,
      userActivity: 50
    };

    const timeContext = {
      hour,
      dayOfWeek,
      isBusinessHours: hour >= 9 && hour <= 17 && dayOfWeek >= 1 && dayOfWeek <= 5,
      isMaintenanceWindow: this.isMaintenanceWindow(now)
    };

    // Calculate historical baseline
    const historicalData = this.getHistoricalDataForMetric(metric, category, now);
    const historicalBaseline = {
      typicalValueAtThisTime: historicalData.mean,
      standardDeviation: historicalData.stdDev,
      percentileRank: this.calculatePercentileRank(value, historicalData.values)
    };

    return {
      systemLoad,
      recentActivity,
      timeContext,
      historicalBaseline
    };
  }

  /**
   * Apply contextual adjustments to alert severity and messaging
   */
  private async applyContextualAdjustments(alert: SmartAlert): Promise<void> {
    let severityAdjustment = 0;
    const adjustmentReasons: string[] = [];

    // System load adjustments
    if (alert.context.systemLoad.cpu > 0.9) {
      severityAdjustment += 1;
      adjustmentReasons.push('High CPU load detected');
    }
    
    if (alert.context.systemLoad.memory > 0.9) {
      severityAdjustment += 1;
      adjustmentReasons.push('High memory pressure detected');
    }

    // Time-based adjustments
    if (!alert.context.timeContext.isBusinessHours) {
      severityAdjustment -= 1;
      adjustmentReasons.push('Outside business hours');
    }

    if (alert.context.timeContext.isMaintenanceWindow) {
      severityAdjustment -= 2;
      adjustmentReasons.push('During maintenance window');
      alert.suppressionReason = 'Maintenance window active';
    }

    // Historical context adjustments
    if (alert.context.historicalBaseline.percentileRank < 0.8) {
      severityAdjustment -= 1;
      adjustmentReasons.push('Value within historical normal range');
    } else if (alert.context.historicalBaseline.percentileRank > 0.95) {
      severityAdjustment += 1;
      adjustmentReasons.push('Value in extreme historical range');
    }

    // Activity-based adjustments
    if (alert.context.recentActivity.errorRate > 0.1) {
      severityAdjustment += 1;
      adjustmentReasons.push('High recent error rate');
    }

    // Apply severity adjustment
    const severityLevels: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
    const currentIndex = severityLevels.indexOf(alert.originalSeverity);
    const newIndex = Math.max(0, Math.min(3, currentIndex + severityAdjustment));
    alert.adjustedSeverity = severityLevels[newIndex];

    // Record enhancement or degradation reason
    if (severityAdjustment > 0) {
      alert.enhancementReason = adjustmentReasons.join(', ');
    } else if (severityAdjustment < 0) {
      alert.suppressionReason = adjustmentReasons.join(', ');
    }

    // Update message with context
    if (alert.adjustedSeverity !== alert.originalSeverity) {
      alert.message += ` [Severity adjusted: ${alert.originalSeverity} → ${alert.adjustedSeverity}]`;
    }
  }

  /**
   * Check if alert should be suppressed based on rules
   */
  private async shouldSuppressAlert(alert: SmartAlert): Promise<boolean> {
    // Check alert fatigue
    const fatigueKey = `${alert.category}:${alert.metric}`;
    const fatigueScore = this.alertFatigueScores.get(fatigueKey) || 0;
    if (fatigueScore > 10 && alert.adjustedSeverity !== 'critical') {
      alert.suppressionReason = 'Alert fatigue threshold exceeded';
      return true;
    }

    // Check suppression rules
    for (const rule of this.suppressionRules.values()) {
      if (!rule.enabled) continue;
      
      if (await this.evaluateSuppressionRule(rule, alert)) {
        if (rule.action === 'suppress') {
          alert.suppressionReason = rule.reason;
          return true;
        } else if (rule.action === 'downgrade') {
          const levels: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];
          const currentIndex = levels.indexOf(alert.adjustedSeverity);
          if (currentIndex > 0) {
            alert.adjustedSeverity = levels[currentIndex - 1];
            alert.suppressionReason = rule.reason;
          }
        }
      }
    }

    return false;
  }

  /**
   * Evaluate suppression rule against alert
   */
  private async evaluateSuppressionRule(rule: AlertSuppressionRule, alert: SmartAlert): Promise<boolean> {
    for (const condition of rule.conditions) {
      let conditionResult = false;
      
      for (const check of condition.checks) {
        const fieldValue = this.getNestedValue(alert, check.field);
        let checkResult = false;
        
        switch (check.operator) {
          case '>':
            checkResult = fieldValue > check.value;
            break;
          case '<':
            checkResult = fieldValue < check.value;
            break;
          case '=':
            checkResult = fieldValue === check.value;
            break;
          case '!=':
            checkResult = fieldValue !== check.value;
            break;
          case 'between':
            checkResult = fieldValue >= check.value[0] && fieldValue <= check.value[1];
            break;
        }
        
        if (condition.operator === 'or' && checkResult) {
          conditionResult = true;
          break;
        } else if (condition.operator === 'and' && !checkResult) {
          conditionResult = false;
          break;
        } else if (condition.operator === 'and') {
          conditionResult = true;
        }
      }
      
      if (!conditionResult) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Correlate alert with existing alerts to find patterns
   */
  private async correlateAlert(alert: SmartAlert): Promise<void> {
    const correlationWindow = Date.now() - (this.CORRELATION_WINDOW_MINUTES * 60 * 1000);
    const recentAlerts = Array.from(this.activeAlerts.values())
      .filter(a => a.timestamp > correlationWindow && a.id !== alert.id);

    // Find related alerts by category
    const categoryAlerts = recentAlerts.filter(a => a.category === alert.category);
    if (categoryAlerts.length > 0) {
      alert.correlatedAlerts.push(...categoryAlerts.map(a => a.id));
    }

    // Find cascade patterns (one alert leading to others)
    const cascadeAlerts = recentAlerts.filter(a => 
      this.isCascadePattern(a.category, a.metric, alert.category, alert.metric)
    );
    if (cascadeAlerts.length > 0) {
      alert.correlatedAlerts.push(...cascadeAlerts.map(a => a.id));
    }

    // Perform root cause analysis if multiple correlated alerts
    if (alert.correlatedAlerts.length > 0) {
      this.performRootCauseAnalysis(alert, recentAlerts);
    }
  }

  /**
   * Perform root cause analysis for correlated alerts
   */
  private performRootCauseAnalysis(alert: SmartAlert, recentAlerts: SmartAlert[]): void {
    const correlatedAlerts = recentAlerts.filter(a => alert.correlatedAlerts.includes(a.id));
    
    // Simple root cause heuristics
    if (correlatedAlerts.some(a => a.category === 'database' && a.metric.includes('latency'))) {
      if (alert.category === 'memory' || alert.category === 'system') {
        alert.rootCauseAnalysis = {
          suspectedCause: 'Database performance issue causing resource pressure',
          confidence: 0.8,
          supportingEvidence: ['High database latency detected', 'Subsequent resource pressure']
        };
      }
    } else if (correlatedAlerts.some(a => a.category === 'memory')) {
      alert.rootCauseAnalysis = {
        suspectedCause: 'Memory pressure affecting system performance',
        confidence: 0.7,
        supportingEvidence: ['Memory alerts preceding performance degradation']
      };
    } else if (correlatedAlerts.length > 3) {
      alert.rootCauseAnalysis = {
        suspectedCause: 'Cascading system failure or external load spike',
        confidence: 0.6,
        supportingEvidence: [`${correlatedAlerts.length} related alerts within ${this.CORRELATION_WINDOW_MINUTES} minutes`]
      };
    }
  }

  /**
   * Generate actionable insights for the alert
   */
  private generateActionableInsights(alert: SmartAlert): void {
    const insights: string[] = [];

    // Metric-specific insights
    if (alert.metric.includes('latency') || alert.metric.includes('duration')) {
      if (alert.context.systemLoad.cpu > 0.8) {
        insights.push('Check for CPU-intensive operations or consider scaling');
      }
      if (alert.correlatedAlerts.length > 0) {
        insights.push('Multiple performance issues detected - investigate system-wide bottlenecks');
      }
    }

    if (alert.metric.includes('memory')) {
      insights.push('Monitor for memory leaks or increase memory allocation');
      if (alert.value > alert.threshold * 1.2) {
        insights.push('Critical memory usage - immediate cleanup recommended');
      }
    }

    if (alert.category === 'database') {
      insights.push('Review recent queries for optimization opportunities');
      if (alert.context.recentActivity.queryVolume > 1000) {
        insights.push('High query volume detected - consider connection pooling or caching');
      }
    }

    // Context-based insights
    if (!alert.context.timeContext.isBusinessHours && alert.adjustedSeverity === 'critical') {
      insights.push('Critical issue outside business hours - may require immediate attention');
    }

    if (alert.context.historicalBaseline.percentileRank > 0.99) {
      insights.push('Value is in the extreme historical range - unprecedented situation');
    }

    // Pattern-based insights
    const pattern = this.alertPatterns.get(`${alert.category}:${alert.metric}`);
    if (pattern) {
      insights.push(`Typical duration: ${Math.round(pattern.typicalDuration / 60000)} minutes`);
      if (pattern.commonCauses.length > 0) {
        const topCause = pattern.commonCauses[0];
        insights.push(`Common cause: ${topCause.cause} (${topCause.typicalResolution})`);
      }
    }

    alert.actionableInsights = insights;
  }

  /**
   * Predict how long the alert condition might last
   */
  private predictAlertDuration(alert: SmartAlert): number {
    const pattern = this.alertPatterns.get(`${alert.category}:${alert.metric}`);
    if (pattern) {
      return pattern.typicalDuration;
    }

    // Default predictions based on category
    const defaultDurations = {
      database: 10 * 60 * 1000, // 10 minutes
      memory: 30 * 60 * 1000,   // 30 minutes
      search: 5 * 60 * 1000,    // 5 minutes
      system: 15 * 60 * 1000    // 15 minutes
    };

    return defaultDurations[alert.category as keyof typeof defaultDurations] || 15 * 60 * 1000;
  }

  /**
   * Route notifications to appropriate channels
   */
  private async routeNotifications(alert: SmartAlert): Promise<void> {
    for (const channel of this.notificationChannels.values()) {
      if (await this.shouldNotifyChannel(channel, alert)) {
        await this.sendNotification(channel, alert);
        
        // Update fatigue score
        const fatigueKey = `${alert.category}:${alert.metric}`;
        this.alertFatigueScores.set(fatigueKey, (this.alertFatigueScores.get(fatigueKey) || 0) + 1);
      }
    }
  }

  /**
   * Check if channel should receive this alert
   */
  private async shouldNotifyChannel(channel: NotificationChannel, alert: SmartAlert): Promise<boolean> {
    // Check severity filter
    if (!channel.severityFilter.includes(alert.adjustedSeverity)) {
      return false;
    }

    // Check time restrictions
    if (channel.timeRestrictions) {
      const now = new Date();
      const hour = now.getHours();
      const isWeekend = now.getDay() === 0 || now.getDay() === 6;
      
      if (channel.timeRestrictions.quietHours &&
          hour >= channel.timeRestrictions.quietHours.start &&
          hour <= channel.timeRestrictions.quietHours.end &&
          alert.adjustedSeverity !== 'critical') {
        return false;
      }
      
      if (isWeekend && channel.timeRestrictions.weekendPolicy === 'suppress') {
        return false;
      }
      
      if (isWeekend && 
          channel.timeRestrictions.weekendPolicy === 'critical-only' && 
          alert.adjustedSeverity !== 'critical') {
        return false;
      }
    }

    // Check rate limiting
    const recentNotifications = this.getRecentNotificationsForChannel(channel.id);
    if (recentNotifications >= channel.rateLimiting.maxAlertsPerHour) {
      return false;
    }

    return true;
  }

  /**
   * Send notification through channel
   */
  private async sendNotification(channel: NotificationChannel, alert: SmartAlert): Promise<void> {
    const message = this.formatAlertForChannel(alert, channel);
    
    switch (channel.type) {
      case 'console':
        console.log(`[${channel.name}] ${message}`);
        break;
      case 'log':
        // Would integrate with logging system
        console.log(`[LOG:${channel.name}] ${message}`);
        break;
      case 'webhook':
        // Would make HTTP request
        console.log(`[WEBHOOK:${channel.name}] ${message}`);
        break;
      default:
        console.log(`[${channel.name}] ${message}`);
    }
    
    this.emit('notification:sent', { channel: channel.name, alert, message });
  }

  /**
   * Format alert message for specific channel
   */
  private formatAlertForChannel(alert: SmartAlert, _channel: NotificationChannel): string {
    let message = `[${alert.adjustedSeverity.toUpperCase()}] ${alert.message}`;
    
    if (alert.rootCauseAnalysis.confidence > 0.6) {
      message += `\n🔍 Suspected cause: ${alert.rootCauseAnalysis.suspectedCause} (${Math.round(alert.rootCauseAnalysis.confidence * 100)}% confidence)`;
    }
    
    if (alert.actionableInsights.length > 0) {
      message += `\n💡 Insights: ${alert.actionableInsights.slice(0, 3).join('; ')}`;
    }
    
    if (alert.predictedDuration > 0) {
      const durationMinutes = Math.round(alert.predictedDuration / 60000);
      message += `\n⏱️ Expected duration: ~${durationMinutes} minutes`;
    }
    
    return message;
  }

  /**
   * Initialize default suppression rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertSuppressionRule[] = [
      {
        id: 'maintenance_window',
        name: 'Maintenance Window Suppression',
        conditions: [{
          metric: 'any',
          operator: 'and',
          checks: [{
            field: 'context.timeContext.isMaintenanceWindow',
            operator: '=',
            value: true
          }]
        }],
        action: 'suppress',
        reason: 'System is in maintenance mode',
        priority: 1,
        enabled: true
      },
      {
        id: 'low_severity_night',
        name: 'Low Severity Night Suppression',
        conditions: [{
          metric: 'any',
          operator: 'and',
          checks: [
            {
              field: 'adjustedSeverity',
              operator: '=',
              value: 'low'
            },
            {
              field: 'context.timeContext.hour',
              operator: 'between',
              value: [23, 6]
            }
          ]
        }],
        action: 'suppress',
        reason: 'Low severity alerts suppressed during night hours',
        priority: 2,
        enabled: true
      }
    ];

    defaultRules.forEach(rule => this.suppressionRules.set(rule.id, rule));
  }

  /**
   * Initialize default notification channels
   */
  private initializeDefaultChannels(): void {
    const defaultChannels: NotificationChannel[] = [
      {
        id: 'console',
        name: 'Console Output',
        type: 'console',
        config: {},
        severityFilter: ['low', 'medium', 'high', 'critical'],
        rateLimiting: {
          maxAlertsPerHour: 100,
          cooldownMinutes: 0
        }
      },
      {
        id: 'critical_only',
        name: 'Critical Alerts Only',
        type: 'log',
        config: {},
        severityFilter: ['critical'],
        timeRestrictions: {
          quietHours: { start: 23, end: 6 },
          weekendPolicy: 'critical-only'
        },
        rateLimiting: {
          maxAlertsPerHour: 10,
          cooldownMinutes: 15
        }
      }
    ];

    defaultChannels.forEach(channel => this.notificationChannels.set(channel.id, channel));
  }

  // Helper methods

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private isMaintenanceWindow(date: Date): boolean {
    // Example: maintenance window is Sunday 2-4 AM
    return date.getDay() === 0 && date.getHours() >= 2 && date.getHours() < 4;
  }

  private isCascadePattern(fromCategory: string, fromMetric: string, toCategory: string, toMetric: string): boolean {
    // Define known cascade patterns
    const cascadePatterns = [
      { from: 'database:latency', to: 'memory:usage' },
      { from: 'memory:pressure', to: 'system:performance' },
      { from: 'search:timeout', to: 'database:connection' }
    ];
    
    const fromKey = `${fromCategory}:${fromMetric}`;
    const toKey = `${toCategory}:${toMetric}`;
    
    return cascadePatterns.some(pattern => 
      fromKey.includes(pattern.from) && toKey.includes(pattern.to)
    );
  }

  private getHistoricalDataForMetric(_metric: string, _category: string, _date: Date): {
    mean: number;
    stdDev: number;
    values: number[];
  } {
    // In a real implementation, this would query historical data
    // For now, return reasonable defaults
    return {
      mean: 0.5,
      stdDev: 0.1,
      values: [0.3, 0.4, 0.5, 0.6, 0.7]
    };
  }

  private calculatePercentileRank(value: number, historicalValues: number[]): number {
    const sorted = [...historicalValues].sort((a, b) => a - b);
    const rank = sorted.findIndex(v => v >= value);
    return rank === -1 ? 1 : rank / sorted.length;
  }

  private updateAlertPatterns(alert: SmartAlert): void {
    const key = `${alert.category}:${alert.metric}`;
    let pattern = this.alertPatterns.get(key);
    
    if (!pattern) {
      pattern = {
        pattern: key,
        frequency: 1,
        typicalDuration: alert.predictedDuration,
        commonCauses: [],
        seasonality: {
          hourly: new Array(24).fill(0),
          daily: new Array(7).fill(0),
          weekly: new Array(52).fill(0)
        }
      };
    } else {
      pattern.frequency++;
    }
    
    // Update seasonality
    const now = new Date();
    pattern.seasonality.hourly[now.getHours()]++;
    pattern.seasonality.daily[now.getDay()]++;
    
    this.alertPatterns.set(key, pattern);
  }

  private getRecentNotificationsForChannel(_channelId: string): number {
    // Would track notifications in production
    return 0;
  }

  private cleanupHistory(): void {
    if (this.alertHistory.length > this.MAX_HISTORY_SIZE) {
      this.alertHistory = this.alertHistory.slice(-Math.floor(this.MAX_HISTORY_SIZE * 0.8));
    }
  }

  /**
   * Resolve an active alert
   */
  resolveAlert(alertId: string, _resolvedBy?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolvedAt = Date.now();
    this.activeAlerts.delete(alertId);
    
    // Reduce alert fatigue score
    const fatigueKey = `${alert.category}:${alert.metric}`;
    const currentScore = this.alertFatigueScores.get(fatigueKey) || 0;
    this.alertFatigueScores.set(fatigueKey, Math.max(0, currentScore - 1));
    
    console.log(`✅ Alert resolved: ${alert.message} (Duration: ${((alert.resolvedAt - alert.timestamp) / 60000).toFixed(1)} minutes)`);
    this.emit('alert:resolved', alert);
    
    return true;
  }

  /**
   * Get comprehensive alert system status
   */
  getSystemStatus(): {
    activeAlerts: SmartAlert[];
    recentPatterns: Array<{ pattern: string; frequency: number }>;
    channelStatus: Array<{ channel: string; health: string }>;
    suppressionRules: Array<{ rule: string; enabled: boolean }>;
    fatigueScores: Array<{ metric: string; score: number }>;
  } {
    return {
      activeAlerts: Array.from(this.activeAlerts.values()),
      recentPatterns: Array.from(this.alertPatterns.entries())
        .map(([pattern, data]) => ({ pattern, frequency: data.frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10),
      channelStatus: Array.from(this.notificationChannels.values())
        .map(channel => ({ channel: channel.name, health: 'healthy' })),
      suppressionRules: Array.from(this.suppressionRules.values())
        .map(rule => ({ rule: rule.name, enabled: rule.enabled })),
      fatigueScores: Array.from(this.alertFatigueScores.entries())
        .map(([metric, score]) => ({ metric, score }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
    };
  }
}