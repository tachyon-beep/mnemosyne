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
        percentileRank: number;
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
    predictedDuration: number;
    correlatedAlerts: string[];
    rootCauseAnalysis: {
        suspectedCause: string;
        confidence: number;
        supportingEvidence: string[];
    };
    timestamp: number;
    acknowledged?: boolean;
    resolvedAt?: number;
}
export declare class ContextAwareAlertSystem extends EventEmitter {
    private activeAlerts;
    private alertHistory;
    private alertPatterns;
    private suppressionRules;
    private notificationChannels;
    private alertFatigueScores;
    private readonly MAX_HISTORY_SIZE;
    private readonly CORRELATION_WINDOW_MINUTES;
    private readonly PATTERN_LEARNING_WINDOW_DAYS;
    constructor();
    /**
     * Process a raw alert and apply context-aware intelligence
     */
    processAlert(metric: string, category: string, value: number, threshold: number, originalSeverity: 'low' | 'medium' | 'high' | 'critical', rawMessage: string): Promise<SmartAlert | null>;
    /**
     * Gather contextual information for alert processing
     */
    private gatherAlertContext;
    /**
     * Apply contextual adjustments to alert severity and messaging
     */
    private applyContextualAdjustments;
    /**
     * Check if alert should be suppressed based on rules
     */
    private shouldSuppressAlert;
    /**
     * Evaluate suppression rule against alert
     */
    private evaluateSuppressionRule;
    /**
     * Correlate alert with existing alerts to find patterns
     */
    private correlateAlert;
    /**
     * Perform root cause analysis for correlated alerts
     */
    private performRootCauseAnalysis;
    /**
     * Generate actionable insights for the alert
     */
    private generateActionableInsights;
    /**
     * Predict how long the alert condition might last
     */
    private predictAlertDuration;
    /**
     * Route notifications to appropriate channels
     */
    private routeNotifications;
    /**
     * Check if channel should receive this alert
     */
    private shouldNotifyChannel;
    /**
     * Send notification through channel
     */
    private sendNotification;
    /**
     * Format alert message for specific channel
     */
    private formatAlertForChannel;
    /**
     * Initialize default suppression rules
     */
    private initializeDefaultRules;
    /**
     * Initialize default notification channels
     */
    private initializeDefaultChannels;
    private getNestedValue;
    private isMaintenanceWindow;
    private isCascadePattern;
    private getHistoricalDataForMetric;
    private calculatePercentileRank;
    private updateAlertPatterns;
    private getRecentNotificationsForChannel;
    private cleanupHistory;
    /**
     * Resolve an active alert
     */
    resolveAlert(alertId: string, _resolvedBy?: string): boolean;
    /**
     * Get comprehensive alert system status
     */
    getSystemStatus(): {
        activeAlerts: SmartAlert[];
        recentPatterns: Array<{
            pattern: string;
            frequency: number;
        }>;
        channelStatus: Array<{
            channel: string;
            health: string;
        }>;
        suppressionRules: Array<{
            rule: string;
            enabled: boolean;
        }>;
        fatigueScores: Array<{
            metric: string;
            score: number;
        }>;
    };
}
export {};
//# sourceMappingURL=ContextAwareAlertSystem.d.ts.map