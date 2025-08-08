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
export class ContextAwareAlertSystem extends EventEmitter {
    activeAlerts = new Map();
    alertHistory = [];
    alertPatterns = new Map();
    suppressionRules = new Map();
    notificationChannels = new Map();
    alertFatigueScores = new Map(); // Tracks fatigue per alert type
    MAX_HISTORY_SIZE = 10000;
    CORRELATION_WINDOW_MINUTES = 30;
    PATTERN_LEARNING_WINDOW_DAYS = 30;
    constructor() {
        super();
        this.initializeDefaultRules();
        this.initializeDefaultChannels();
    }
    /**
     * Process a raw alert and apply context-aware intelligence
     */
    async processAlert(metric, category, value, threshold, originalSeverity, rawMessage) {
        const context = await this.gatherAlertContext(metric, category, value);
        // Create base alert
        const alert = {
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
    async gatherAlertContext(metric, category, value) {
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
    async applyContextualAdjustments(alert) {
        let severityAdjustment = 0;
        const adjustmentReasons = [];
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
        }
        else if (alert.context.historicalBaseline.percentileRank > 0.95) {
            severityAdjustment += 1;
            adjustmentReasons.push('Value in extreme historical range');
        }
        // Activity-based adjustments
        if (alert.context.recentActivity.errorRate > 0.1) {
            severityAdjustment += 1;
            adjustmentReasons.push('High recent error rate');
        }
        // Apply severity adjustment
        const severityLevels = ['low', 'medium', 'high', 'critical'];
        const currentIndex = severityLevels.indexOf(alert.originalSeverity);
        const newIndex = Math.max(0, Math.min(3, currentIndex + severityAdjustment));
        alert.adjustedSeverity = severityLevels[newIndex];
        // Record enhancement or degradation reason
        if (severityAdjustment > 0) {
            alert.enhancementReason = adjustmentReasons.join(', ');
        }
        else if (severityAdjustment < 0) {
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
    async shouldSuppressAlert(alert) {
        // Check alert fatigue
        const fatigueKey = `${alert.category}:${alert.metric}`;
        const fatigueScore = this.alertFatigueScores.get(fatigueKey) || 0;
        if (fatigueScore > 10 && alert.adjustedSeverity !== 'critical') {
            alert.suppressionReason = 'Alert fatigue threshold exceeded';
            return true;
        }
        // Check suppression rules
        for (const rule of this.suppressionRules.values()) {
            if (!rule.enabled)
                continue;
            if (await this.evaluateSuppressionRule(rule, alert)) {
                if (rule.action === 'suppress') {
                    alert.suppressionReason = rule.reason;
                    return true;
                }
                else if (rule.action === 'downgrade') {
                    const levels = ['low', 'medium', 'high', 'critical'];
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
    async evaluateSuppressionRule(rule, alert) {
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
                }
                else if (condition.operator === 'and' && !checkResult) {
                    conditionResult = false;
                    break;
                }
                else if (condition.operator === 'and') {
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
    async correlateAlert(alert) {
        const correlationWindow = Date.now() - (this.CORRELATION_WINDOW_MINUTES * 60 * 1000);
        const recentAlerts = Array.from(this.activeAlerts.values())
            .filter(a => a.timestamp > correlationWindow && a.id !== alert.id);
        // Find related alerts by category
        const categoryAlerts = recentAlerts.filter(a => a.category === alert.category);
        if (categoryAlerts.length > 0) {
            alert.correlatedAlerts.push(...categoryAlerts.map(a => a.id));
        }
        // Find cascade patterns (one alert leading to others)
        const cascadeAlerts = recentAlerts.filter(a => this.isCascadePattern(a.category, a.metric, alert.category, alert.metric));
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
    performRootCauseAnalysis(alert, recentAlerts) {
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
        }
        else if (correlatedAlerts.some(a => a.category === 'memory')) {
            alert.rootCauseAnalysis = {
                suspectedCause: 'Memory pressure affecting system performance',
                confidence: 0.7,
                supportingEvidence: ['Memory alerts preceding performance degradation']
            };
        }
        else if (correlatedAlerts.length > 3) {
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
    generateActionableInsights(alert) {
        const insights = [];
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
    predictAlertDuration(alert) {
        const pattern = this.alertPatterns.get(`${alert.category}:${alert.metric}`);
        if (pattern) {
            return pattern.typicalDuration;
        }
        // Default predictions based on category
        const defaultDurations = {
            database: 10 * 60 * 1000, // 10 minutes
            memory: 30 * 60 * 1000, // 30 minutes
            search: 5 * 60 * 1000, // 5 minutes
            system: 15 * 60 * 1000 // 15 minutes
        };
        return defaultDurations[alert.category] || 15 * 60 * 1000;
    }
    /**
     * Route notifications to appropriate channels
     */
    async routeNotifications(alert) {
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
    async shouldNotifyChannel(channel, alert) {
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
    async sendNotification(channel, alert) {
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
    formatAlertForChannel(alert, _channel) {
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
    initializeDefaultRules() {
        const defaultRules = [
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
    initializeDefaultChannels() {
        const defaultChannels = [
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
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    isMaintenanceWindow(date) {
        // Example: maintenance window is Sunday 2-4 AM
        return date.getDay() === 0 && date.getHours() >= 2 && date.getHours() < 4;
    }
    isCascadePattern(fromCategory, fromMetric, toCategory, toMetric) {
        // Define known cascade patterns
        const cascadePatterns = [
            { from: 'database:latency', to: 'memory:usage' },
            { from: 'memory:pressure', to: 'system:performance' },
            { from: 'search:timeout', to: 'database:connection' }
        ];
        const fromKey = `${fromCategory}:${fromMetric}`;
        const toKey = `${toCategory}:${toMetric}`;
        return cascadePatterns.some(pattern => fromKey.includes(pattern.from) && toKey.includes(pattern.to));
    }
    getHistoricalDataForMetric(_metric, _category, _date) {
        // In a real implementation, this would query historical data
        // For now, return reasonable defaults
        return {
            mean: 0.5,
            stdDev: 0.1,
            values: [0.3, 0.4, 0.5, 0.6, 0.7]
        };
    }
    calculatePercentileRank(value, historicalValues) {
        const sorted = [...historicalValues].sort((a, b) => a - b);
        const rank = sorted.findIndex(v => v >= value);
        return rank === -1 ? 1 : rank / sorted.length;
    }
    updateAlertPatterns(alert) {
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
        }
        else {
            pattern.frequency++;
        }
        // Update seasonality
        const now = new Date();
        pattern.seasonality.hourly[now.getHours()]++;
        pattern.seasonality.daily[now.getDay()]++;
        this.alertPatterns.set(key, pattern);
    }
    getRecentNotificationsForChannel(_channelId) {
        // Would track notifications in production
        return 0;
    }
    cleanupHistory() {
        if (this.alertHistory.length > this.MAX_HISTORY_SIZE) {
            this.alertHistory = this.alertHistory.slice(-Math.floor(this.MAX_HISTORY_SIZE * 0.8));
        }
    }
    /**
     * Resolve an active alert
     */
    resolveAlert(alertId, _resolvedBy) {
        const alert = this.activeAlerts.get(alertId);
        if (!alert)
            return false;
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
    getSystemStatus() {
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
//# sourceMappingURL=ContextAwareAlertSystem.js.map