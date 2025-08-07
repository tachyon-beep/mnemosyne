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
import { IndexOptimizationRecommendation, PerformanceAlert } from './IndexUsageMonitor.js';
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
        queryPerformance: Array<{
            timestamp: number;
            avgTime: number;
        }>;
        indexEffectiveness: Array<{
            timestamp: number;
            score: number;
        }>;
        systemLoad: Array<{
            timestamp: number;
            load: number;
        }>;
    };
    achievements: string[];
    concerns: string[];
    recommendations: string[];
}
/**
 * Unified performance management system for production environments
 */
export declare class ProductionPerformanceManager {
    private databaseManager;
    private analyticsEngine;
    private config;
    private indexMonitor;
    private analyticsOptimizer;
    private dashboard;
    private automationDecisions;
    private performanceHistory;
    private isRunning;
    private maintenanceTimer;
    constructor(databaseManager: DatabaseManager, analyticsEngine: AnalyticsEngine, config?: Partial<PerformanceConfiguration>);
    /**
     * Initialize and start the complete performance management system
     */
    initialize(): Promise<void>;
    /**
     * Shutdown the performance management system
     */
    shutdown(): Promise<void>;
    /**
     * Get current system performance status
     */
    getPerformanceStatus(): Promise<PerformanceStatus>;
    /**
     * Execute comprehensive performance analysis and optimization
     */
    performComprehensiveOptimization(): Promise<{
        analysisResults: any;
        optimizationsExecuted: number;
        recommendations: IndexOptimizationRecommendation[];
        errors: string[];
    }>;
    /**
     * Handle performance alerts with automated decision making
     */
    handlePerformanceAlert(alert: PerformanceAlert): Promise<AutomationDecision>;
    /**
     * Generate comprehensive performance report
     */
    generatePerformanceReport(periodDays?: number): Promise<PerformanceReport>;
    /**
     * Get automation decisions history
     */
    getAutomationHistory(limit?: number): AutomationDecision[];
    /**
     * Update performance configuration
     */
    updateConfiguration(config: Partial<PerformanceConfiguration>): void;
    /**
     * Export complete performance data
     */
    exportPerformanceData(): Promise<{
        configuration: PerformanceConfiguration;
        currentStatus: PerformanceStatus;
        dashboardData: string;
        automationHistory: AutomationDecision[];
        performanceHistory: PerformanceStatus[];
    }>;
    private mergeConfig;
    private startPeriodicStatusUpdates;
    private scheduleMaintenanceWindows;
    private startAutomatedOptimization;
    private performScheduledMaintenance;
    private makeAutomatedDecision;
    private executeAlertAction;
    private sendAlertNotification;
    private recordAutomationDecision;
    private getActiveOptimizationsCount;
    private generateAchievements;
    private generateConcerns;
    private generateRecommendations;
}
//# sourceMappingURL=ProductionPerformanceManager.d.ts.map