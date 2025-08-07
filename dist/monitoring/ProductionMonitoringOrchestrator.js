/**
 * Production Monitoring Orchestrator with Dynamic Capabilities
 *
 * Orchestrates dynamic monitoring coordination for the MCP Persistence System
 * with adaptive thresholds, context-aware alerting, and system profiling
 */
import { EventEmitter } from 'events';
import { EnhancedPerformanceMonitor } from './EnhancedPerformanceMonitor.js';
export class ProductionMonitoringOrchestrator extends EventEmitter {
    database;
    performanceMonitor;
    memoryManager;
    isRunning = false;
    enhancedMonitor = null;
    useEnhancedMonitoring = false;
    constructor(database, performanceMonitor, memoryManager, options = {}) {
        super();
        this.database = database;
        this.performanceMonitor = performanceMonitor;
        this.memoryManager = memoryManager;
        this.useEnhancedMonitoring = options.enableEnhancedMonitoring || false;
        if (this.useEnhancedMonitoring) {
            this.enhancedMonitor = new EnhancedPerformanceMonitor(this.database, this.memoryManager);
            this.setupEnhancedEventHandlers();
        }
    }
    async startMonitoring() {
        if (this.isRunning) {
            console.log('Monitoring already running');
            return;
        }
        console.log('🚀 Starting Production Monitoring...');
        if (this.useEnhancedMonitoring && this.enhancedMonitor) {
            console.log('📊 Initializing Enhanced Monitoring with Dynamic Thresholds...');
            await this.enhancedMonitor.initialize();
            await this.enhancedMonitor.startMonitoring();
        }
        else {
            console.log('📈 Starting Standard Monitoring...');
            await this.performanceMonitor.startMonitoring(30); // 30 second intervals
        }
        this.isRunning = true;
        this.emit('monitoring:started', { enhanced: this.useEnhancedMonitoring });
    }
    async stopMonitoring() {
        if (!this.isRunning)
            return;
        console.log('🛑 Stopping Production Monitoring...');
        if (this.useEnhancedMonitoring && this.enhancedMonitor) {
            await this.enhancedMonitor.stopMonitoring();
        }
        else {
            await this.performanceMonitor.stopMonitoring();
        }
        this.isRunning = false;
        this.emit('monitoring:stopped');
    }
    async getSystemHealthReport() {
        if (this.useEnhancedMonitoring && this.enhancedMonitor) {
            // Use enhanced monitoring report
            const healthAssessment = this.enhancedMonitor.getSystemHealthAssessment();
            const monitoringStatus = this.enhancedMonitor.getMonitoringStatus();
            return {
                overall: healthAssessment.overall,
                timestamp: healthAssessment.timestamp,
                uptime: process.uptime() * 1000,
                enhanced: true,
                systemProfile: monitoringStatus.systemProfile,
                components: healthAssessment.components,
                adaptiveMetrics: healthAssessment.adaptiveMetrics,
                recommendations: healthAssessment.recommendations,
                activeAlerts: monitoringStatus.activeAlerts,
                thresholdAccuracy: monitoringStatus.thresholdAccuracy
            };
        }
        else {
            // Use standard monitoring report
            const performanceReport = this.performanceMonitor.getEnhancedPerformanceReport();
            const memoryReport = this.memoryManager.getMemoryReport();
            const healthStatus = this.performanceMonitor.getHealthStatus();
            return {
                overall: healthStatus.overall,
                timestamp: Date.now(),
                uptime: process.uptime() * 1000,
                enhanced: false,
                performance: performanceReport,
                memory: memoryReport,
                components: healthStatus.components,
                activeAlerts: healthStatus.activeAlerts.length,
                thresholdInfo: performanceReport.thresholdInfo
            };
        }
    }
    /**
     * Setup event handlers for enhanced monitoring
     */
    setupEnhancedEventHandlers() {
        if (!this.enhancedMonitor)
            return;
        this.enhancedMonitor.on('initialized', (data) => {
            console.log(`✅ Enhanced monitoring initialized - Performance class: ${data.systemProfile?.overallPerformanceClass}`);
            this.emit('enhanced:initialized', data);
        });
        this.enhancedMonitor.on('thresholdAdapted', (data) => {
            console.log(`🎯 Threshold adapted: ${data.id} (${(data.confidence * 100).toFixed(1)}% confidence)`);
            this.emit('threshold:adapted', data);
        });
        this.enhancedMonitor.on('adaptiveAlert', (alert) => {
            console.log(`🚨 Adaptive alert: [${alert.contextualSeverity}] ${alert.message}`);
            this.emit('alert:adaptive', alert);
        });
        this.enhancedMonitor.on('contextualAlert', (alert) => {
            console.log(`📋 Contextual alert processed with insights: ${alert.actionableInsights.length} recommendations`);
            this.emit('alert:contextual', alert);
        });
        this.enhancedMonitor.on('systemProfileUpdated', (profile) => {
            console.log(`📊 System profile updated: ${profile.overallPerformanceClass} performance class`);
            this.emit('system:profileUpdated', profile);
        });
        this.enhancedMonitor.on('optimizationCycleComplete', (result) => {
            console.log(`🔄 Optimization cycle complete: ${result.recommendedThresholds?.size || 0} recommendations`);
            this.emit('optimization:complete', result);
        });
    }
    /**
     * Force system re-profiling (enhanced monitoring only)
     */
    async reprofileSystem() {
        if (!this.useEnhancedMonitoring || !this.enhancedMonitor) {
            throw new Error('Enhanced monitoring not enabled');
        }
        console.log('🔄 Forcing system re-profiling...');
        // This would trigger re-profiling in the enhanced monitor
        this.emit('system:reprofileRequested');
    }
    /**
     * Get monitoring capabilities and status
     */
    getMonitoringCapabilities() {
        return {
            enhanced: this.useEnhancedMonitoring,
            dynamicThresholds: this.useEnhancedMonitoring && this.performanceMonitor.isDynamicThresholdingEnabled(),
            contextAwareAlerts: this.useEnhancedMonitoring,
            systemProfiling: this.useEnhancedMonitoring,
            mlOptimization: this.useEnhancedMonitoring,
            uptime: process.uptime() * 1000,
            isRunning: this.isRunning
        };
    }
    /**
     * Switch monitoring mode (requires restart)
     */
    async switchToEnhancedMonitoring() {
        if (this.useEnhancedMonitoring) {
            console.log('Enhanced monitoring already enabled');
            return;
        }
        console.log('🔄 Switching to enhanced monitoring mode...');
        const wasRunning = this.isRunning;
        if (wasRunning) {
            await this.stopMonitoring();
        }
        // Initialize enhanced monitoring
        this.useEnhancedMonitoring = true;
        this.enhancedMonitor = new EnhancedPerformanceMonitor(this.database, this.memoryManager);
        this.setupEnhancedEventHandlers();
        if (wasRunning) {
            await this.startMonitoring();
        }
        console.log('✅ Switched to enhanced monitoring mode');
        this.emit('monitoring:modeChanged', { enhanced: true });
    }
}
//# sourceMappingURL=ProductionMonitoringOrchestrator.js.map