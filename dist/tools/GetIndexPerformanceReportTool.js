/**
 * Get Index Performance Report Tool
 *
 * Provides comprehensive index performance monitoring and analysis.
 * Generates detailed reports on index usage, effectiveness, and optimization opportunities.
 */
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import { ProductionPerformanceManager } from '../analytics/performance/ProductionPerformanceManager.js';
import { IndexMonitoringDashboard } from '../analytics/performance/IndexMonitoringDashboard.js';
import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
const GetIndexPerformanceReportSchema = z.object({
    reportType: z.enum(['overview', 'detailed', 'recommendations', 'health', 'executive']).default('overview'),
    timeframe: z.enum(['hour', 'day', 'week', 'month']).default('day'),
    includeOptimizations: z.boolean().default(true),
    includeAlerts: z.boolean().default(true),
    includeMaintenanceSchedule: z.boolean().default(false),
    format: z.enum(['summary', 'detailed', 'json']).default('summary')
});
export class GetIndexPerformanceReportTool extends BaseTool {
    performanceManager;
    dashboard;
    constructor(databaseManager) {
        const toolDef = {
            name: 'get_index_performance_report',
            description: 'Generate comprehensive index performance analysis and monitoring reports',
            inputSchema: {
                type: 'object',
                properties: {
                    reportType: { type: 'string', enum: ['overview', 'detailed', 'recommendations', 'health', 'executive'], default: 'overview' },
                    timeframe: { type: 'string', enum: ['hour', 'day', 'week', 'month'], default: 'day' },
                    includeOptimizations: { type: 'boolean', default: true },
                    includeAlerts: { type: 'boolean', default: true },
                    includeMaintenanceSchedule: { type: 'boolean', default: false },
                    format: { type: 'string', enum: ['summary', 'detailed', 'json'], default: 'summary' }
                },
                additionalProperties: false
            }
        };
        super(toolDef, GetIndexPerformanceReportSchema);
        // Initialize performance monitoring components
        const analyticsEngine = new AnalyticsEngine(databaseManager);
        this.performanceManager = new ProductionPerformanceManager(databaseManager, analyticsEngine, {
            monitoring: {
                enabled: true,
                intervalMinutes: 15,
                alertThresholds: {
                    slowQueryMs: 1000,
                    unusedIndexDays: 30,
                    writeImpactThreshold: 0.1,
                    memoryUsageThresholdMB: 100
                },
                retentionDays: 30
            },
            optimization: {
                autoOptimizeEnabled: false,
                autoDropUnusedIndexes: false,
                maxConcurrentOptimizations: 1,
                maintenanceWindowHours: [2, 3, 4], // 2-4 AM
                riskTolerance: 'conservative'
            },
            alerts: {
                emailNotifications: false,
                escalationThresholds: {
                    criticalAlertCount: 5,
                    highAlertDurationMinutes: 60
                }
            }
        });
        this.dashboard = new IndexMonitoringDashboard(databaseManager);
    }
    async executeImpl(args) {
        try {
            console.log(`Generating ${args.reportType} index performance report for ${args.timeframe} timeframe`);
            // Initialize monitoring if not already running
            try {
                await this.performanceManager.initialize();
            }
            catch (error) {
                // Manager might already be initialized
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (!errorMessage.includes('already running')) {
                    console.warn('Performance manager initialization warning:', errorMessage);
                }
            }
            let reportData;
            switch (args.reportType) {
                case 'overview':
                    reportData = await this.generateOverviewReport(args);
                    break;
                case 'detailed':
                    reportData = await this.generateDetailedReport(args);
                    break;
                case 'recommendations':
                    reportData = await this.generateRecommendationsReport(args);
                    break;
                case 'health':
                    reportData = await this.generateHealthReport(args);
                    break;
                case 'executive':
                    reportData = await this.generateExecutiveReport(args);
                    break;
                default:
                    throw new Error(`Unsupported report type: ${args.reportType}`);
            }
            // Format the response based on requested format
            if (args.format === 'json') {
                return {
                    success: true,
                    reportType: args.reportType,
                    timeframe: args.timeframe,
                    generatedAt: new Date().toISOString(),
                    data: reportData
                };
            }
            else {
                return {
                    success: true,
                    report: this.formatReport(args.reportType, reportData, args.format)
                };
            }
        }
        catch (error) {
            console.error('Error generating index performance report:', error);
            return {
                success: false,
                error: `Failed to generate performance report: ${error instanceof Error ? error.message : String(error)}`,
                reportType: args.reportType
            };
        }
    }
    async generateOverviewReport(args) {
        const status = await this.performanceManager.getPerformanceStatus();
        const metrics = await this.dashboard.getCurrentMetrics();
        const alerts = this.dashboard.getActiveAlerts();
        return {
            systemStatus: status,
            performance: {
                totalIndexes: metrics.overview.totalIndexes,
                activeIndexes: metrics.overview.activeIndexes,
                unusedIndexes: metrics.overview.unusedIndexes,
                averageQueryTime: Math.round(metrics.overview.averageQueryTime),
                indexEffectiveness: Math.round(metrics.performance.indexEffectiveness * 100),
                cacheHitRate: Math.round(metrics.performance.cacheHitRate * 100)
            },
            alerts: {
                total: alerts.length,
                critical: alerts.filter(a => a.severity === 'critical').length,
                high: alerts.filter(a => a.severity === 'high').length
            },
            trends: metrics.trends
        };
    }
    async generateDetailedReport(args) {
        const [healthReport, insights, optimization] = await Promise.all([
            this.dashboard.getIndexHealthReport(),
            this.dashboard.getQueryPerformanceInsights(),
            args.includeOptimizations ? this.dashboard.getOptimizationRecommendations() : []
        ]);
        return {
            indexHealth: healthReport.map(health => ({
                index: health.indexName,
                table: health.tableName,
                health: health.health,
                score: Math.round(health.healthScore),
                issues: health.issues,
                recommendations: health.recommendations,
                usage: {
                    frequency: health.metrics.usageFrequency,
                    effectiveness: Math.round(health.metrics.effectiveness * 100),
                    lastUsed: health.metrics.lastUsed ? new Date(health.metrics.lastUsed).toISOString() : 'Never',
                    size: `${Math.round(health.metrics.storageSize / 1024)}KB`
                }
            })),
            queryInsights: insights.slice(0, 10).map(insight => ({
                pattern: this.sanitizeQuery(insight.queryPattern),
                frequency: insight.frequency,
                avgTime: `${Math.round(insight.avgExecutionTime)}ms`,
                impact: insight.impact,
                optimizationPotential: `${Math.round(insight.optimizationPotential)}%`
            })),
            optimizations: args.includeOptimizations ? optimization.slice(0, 5).map(opt => ({
                type: opt.type,
                target: opt.indexName,
                table: opt.tableName,
                reason: opt.reason,
                impact: opt.expectedImpact,
                risk: opt.riskLevel,
                benefit: Math.round(opt.estimatedBenefit),
                complexity: opt.implementationComplexity,
                priority: opt.implementationPriority
            })) : []
        };
    }
    async generateRecommendationsReport(args) {
        const recommendations = await this.dashboard.getOptimizationRecommendations();
        const maintenanceSchedule = args.includeMaintenanceSchedule ?
            this.dashboard.getMaintenanceSchedule() : [];
        return {
            optimizations: recommendations.map(rec => ({
                priority: rec.implementationPriority,
                type: rec.type,
                target: rec.indexName,
                table: rec.tableName,
                reason: rec.reason,
                expectedImpact: rec.expectedImpact,
                riskLevel: rec.riskLevel,
                estimatedBenefit: `${Math.round(rec.estimatedBenefit)}ms improvement`,
                complexity: rec.implementationComplexity,
                costBenefitScore: Math.round(rec.costBenefitScore),
                riskAssessment: rec.riskAssessment,
                sql: rec.sql
            })),
            maintenance: args.includeMaintenanceSchedule ? maintenanceSchedule.map(task => ({
                task: task.task,
                target: task.target,
                scheduledTime: new Date(task.scheduledTime).toISOString(),
                priority: task.priority,
                estimatedDuration: `${Math.round(task.estimatedDuration / 60000)} minutes`,
                impact: task.impact,
                prerequisites: task.prerequisites
            })) : []
        };
    }
    async generateHealthReport(args) {
        const healthReports = await this.dashboard.getIndexHealthReport();
        const alerts = this.dashboard.getActiveAlerts();
        // Categorize indexes by health
        const healthCategories = {
            excellent: healthReports.filter(h => h.health === 'excellent'),
            good: healthReports.filter(h => h.health === 'good'),
            fair: healthReports.filter(h => h.health === 'fair'),
            poor: healthReports.filter(h => h.health === 'poor'),
            critical: healthReports.filter(h => h.health === 'critical')
        };
        return {
            summary: {
                totalIndexes: healthReports.length,
                healthDistribution: {
                    excellent: healthCategories.excellent.length,
                    good: healthCategories.good.length,
                    fair: healthCategories.fair.length,
                    poor: healthCategories.poor.length,
                    critical: healthCategories.critical.length
                },
                averageHealthScore: Math.round(healthReports.reduce((sum, h) => sum + h.healthScore, 0) / healthReports.length)
            },
            criticalIndexes: healthCategories.critical.map(h => ({
                index: h.indexName,
                table: h.tableName,
                score: Math.round(h.healthScore),
                issues: h.issues,
                recommendations: h.recommendations.slice(0, 2) // Top 2 recommendations
            })),
            poorIndexes: healthCategories.poor.map(h => ({
                index: h.indexName,
                table: h.tableName,
                score: Math.round(h.healthScore),
                primaryIssue: h.issues[0] || 'Unknown issue'
            })),
            unusedIndexes: healthReports
                .filter(h => h.issues.includes('Never used') || h.issues.includes('Rarely used'))
                .map(h => ({
                index: h.indexName,
                table: h.tableName,
                size: `${Math.round(h.metrics.storageSize / 1024)}KB`,
                lastUsed: h.metrics.lastUsed ? new Date(h.metrics.lastUsed).toISOString() : 'Never'
            })),
            activeAlerts: args.includeAlerts ? alerts.slice(0, 5).map(alert => ({
                type: alert.type,
                severity: alert.severity,
                message: alert.message,
                age: `${Math.round((Date.now() - alert.timestamp) / (60 * 1000))} minutes`,
                actionPlan: alert.actionPlan.slice(0, 2) // Top 2 actions
            })) : []
        };
    }
    async generateExecutiveReport(args) {
        const executiveSummary = await this.dashboard.generateExecutiveSummary();
        const performanceReport = await this.performanceManager.generatePerformanceReport(args.timeframe === 'hour' ? 1 / 24 :
            args.timeframe === 'day' ? 1 :
                args.timeframe === 'week' ? 7 : 30);
        return {
            executiveSummary: {
                summary: executiveSummary.summary,
                keyMetrics: executiveSummary.keyMetrics,
                overallHealth: `${Math.round(performanceReport.summary.overallHealth)}%`,
                performanceScore: `${performanceReport.summary.performanceScore}%`
            },
            criticalIssues: executiveSummary.criticalIssues.slice(0, 3),
            topRecommendations: executiveSummary.recommendations.slice(0, 3),
            trendAnalysis: {
                performanceTrend: executiveSummary.trendAnalysis.performanceTrend,
                efficiency: `${Math.round(executiveSummary.trendAnalysis.efficiency * 100)}%`,
                capacityUtilization: `${Math.round(executiveSummary.trendAnalysis.capacityUtilization * 100)}%`
            },
            achievements: performanceReport.achievements.slice(0, 3),
            concerns: performanceReport.concerns.slice(0, 3),
            actionItems: this.generateActionItems(executiveSummary),
            nextSteps: this.generateNextSteps(executiveSummary, performanceReport)
        };
    }
    formatReport(reportType, data, format) {
        const lines = [];
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        lines.push(`=== Index Performance Report: ${reportType.toUpperCase()} ===`);
        lines.push(`Generated: ${timestamp}`);
        lines.push('');
        switch (reportType) {
            case 'overview':
                lines.push(...this.formatOverviewReport(data, format));
                break;
            case 'detailed':
                lines.push(...this.formatDetailedReport(data, format));
                break;
            case 'recommendations':
                lines.push(...this.formatRecommendationsReport(data, format));
                break;
            case 'health':
                lines.push(...this.formatHealthReport(data, format));
                break;
            case 'executive':
                lines.push(...this.formatExecutiveReport(data, format));
                break;
        }
        return lines.join('\n');
    }
    formatOverviewReport(data, format) {
        const lines = [];
        lines.push(`System Status: ${data.systemStatus.overall.toUpperCase()}`);
        lines.push(`Last Update: ${new Date(data.systemStatus.lastUpdate).toLocaleString()}`);
        lines.push('');
        lines.push('📊 PERFORMANCE METRICS');
        lines.push(`• Total Indexes: ${data.performance.totalIndexes}`);
        lines.push(`• Active Indexes: ${data.performance.activeIndexes}`);
        lines.push(`• Unused Indexes: ${data.performance.unusedIndexes}`);
        lines.push(`• Average Query Time: ${data.performance.averageQueryTime}ms`);
        lines.push(`• Index Effectiveness: ${data.performance.indexEffectiveness}%`);
        lines.push(`• Cache Hit Rate: ${data.performance.cacheHitRate}%`);
        lines.push('');
        if (data.alerts.total > 0) {
            lines.push('🚨 ACTIVE ALERTS');
            lines.push(`• Total: ${data.alerts.total}`);
            lines.push(`• Critical: ${data.alerts.critical}`);
            lines.push(`• High: ${data.alerts.high}`);
            lines.push('');
        }
        if (format === 'detailed' && data.trends.indexUsageTrend?.length > 0) {
            lines.push('📈 INDEX USAGE TRENDS');
            data.trends.indexUsageTrend.forEach((trend) => {
                const arrow = trend.trend === 'up' ? '↗️' : trend.trend === 'down' ? '↘️' : '→';
                lines.push(`• ${trend.index}: ${arrow} ${trend.trend}`);
            });
            lines.push('');
        }
        return lines;
    }
    formatDetailedReport(data, format) {
        const lines = [];
        // Index Health Summary
        lines.push('🏥 INDEX HEALTH STATUS');
        const healthCounts = data.indexHealth.reduce((acc, index) => {
            acc[index.health] = (acc[index.health] || 0) + 1;
            return acc;
        }, {});
        Object.entries(healthCounts).forEach(([health, count]) => {
            const emoji = health === 'critical' ? '🔴' : health === 'poor' ? '🟠' :
                health === 'fair' ? '🟡' : health === 'good' ? '🟢' : '✅';
            lines.push(`• ${emoji} ${health}: ${count} indexes`);
        });
        lines.push('');
        // Critical/Poor Indexes
        const problemIndexes = data.indexHealth.filter((i) => i.health === 'critical' || i.health === 'poor');
        if (problemIndexes.length > 0) {
            lines.push('⚠️  INDEXES REQUIRING ATTENTION');
            problemIndexes.slice(0, 5).forEach((index) => {
                lines.push(`• ${index.index} (${index.table}): ${index.health} - Score: ${index.score}%`);
                lines.push(`  Issues: ${index.issues.slice(0, 2).join(', ')}`);
                if (format === 'detailed' && index.recommendations.length > 0) {
                    lines.push(`  Action: ${index.recommendations[0]}`);
                }
            });
            lines.push('');
        }
        // Query Performance Insights
        if (data.queryInsights.length > 0) {
            lines.push('🐌 SLOW QUERY PATTERNS');
            data.queryInsights.slice(0, 3).forEach((insight) => {
                lines.push(`• Pattern: ${insight.pattern.substring(0, 60)}...`);
                lines.push(`  Frequency: ${insight.frequency}, Avg Time: ${insight.avgTime}, Impact: ${insight.impact}`);
                if (insight.optimizationPotential > 50) {
                    lines.push(`  ⚡ High optimization potential: ${insight.optimizationPotential}`);
                }
            });
            lines.push('');
        }
        // Top Optimizations
        if (data.optimizations.length > 0) {
            lines.push('🔧 TOP OPTIMIZATION OPPORTUNITIES');
            data.optimizations.slice(0, 3).forEach((opt) => {
                const riskEmoji = opt.risk === 'low' ? '🟢' : opt.risk === 'medium' ? '🟡' : '🔴';
                lines.push(`• ${opt.type.toUpperCase()}: ${opt.target} (${opt.table})`);
                lines.push(`  ${riskEmoji} ${opt.reason}`);
                lines.push(`  Expected benefit: ${opt.benefit}ms, Risk: ${opt.risk}, Priority: ${opt.priority}`);
            });
        }
        return lines;
    }
    formatRecommendationsReport(data, format) {
        const lines = [];
        lines.push('🎯 OPTIMIZATION RECOMMENDATIONS');
        lines.push('');
        data.optimizations.slice(0, 10).forEach((rec, index) => {
            const priorityEmoji = rec.priority === 1 ? '🔥' : rec.priority === 2 ? '⚡' : '📝';
            const riskEmoji = rec.riskLevel === 'low' ? '🟢' : rec.riskLevel === 'medium' ? '🟡' : '🔴';
            lines.push(`${index + 1}. ${priorityEmoji} ${rec.type.toUpperCase()}: ${rec.target}`);
            lines.push(`   Table: ${rec.table}`);
            lines.push(`   Reason: ${rec.reason}`);
            lines.push(`   ${riskEmoji} Risk: ${rec.riskLevel} | Impact: ${rec.expectedImpact} | Benefit: ${rec.estimatedBenefit}`);
            lines.push(`   Complexity: ${rec.complexity} | Score: ${rec.costBenefitScore}`);
            if (format === 'detailed') {
                lines.push(`   Risk Assessment: ${rec.riskAssessment}`);
                if (rec.sql && rec.sql.length < 100) {
                    lines.push(`   SQL: ${rec.sql}`);
                }
            }
            lines.push('');
        });
        if (data.maintenance.length > 0) {
            lines.push('🛠️  SCHEDULED MAINTENANCE');
            data.maintenance.slice(0, 5).forEach((task) => {
                const priorityEmoji = task.priority === 'critical' ? '🔴' :
                    task.priority === 'high' ? '🟠' : '🟡';
                lines.push(`• ${priorityEmoji} ${task.task.toUpperCase()}: ${task.target}`);
                lines.push(`  Scheduled: ${new Date(task.scheduledTime).toLocaleString()}`);
                lines.push(`  Duration: ${task.estimatedDuration} | Impact: ${task.impact}`);
            });
        }
        return lines;
    }
    formatHealthReport(data, format) {
        const lines = [];
        lines.push('🏥 INDEX HEALTH OVERVIEW');
        lines.push(`Total Indexes: ${data.summary.totalIndexes} | Average Health: ${data.summary.averageHealthScore}%`);
        lines.push('');
        // Health Distribution
        lines.push('📊 HEALTH DISTRIBUTION');
        Object.entries(data.summary.healthDistribution).forEach(([health, count]) => {
            const emoji = health === 'critical' ? '🔴' : health === 'poor' ? '🟠' :
                health === 'fair' ? '🟡' : health === 'good' ? '🟢' : '✅';
            const percentage = Math.round(count / data.summary.totalIndexes * 100);
            lines.push(`• ${emoji} ${health}: ${count} (${percentage}%)`);
        });
        lines.push('');
        // Critical Issues
        if (data.criticalIndexes.length > 0) {
            lines.push('🚨 CRITICAL INDEXES (Immediate Attention Required)');
            data.criticalIndexes.forEach((index) => {
                lines.push(`• ${index.index} (${index.table}) - Score: ${index.score}%`);
                lines.push(`  Issues: ${index.issues.join(', ')}`);
                lines.push(`  Actions: ${index.recommendations.join('; ')}`);
                lines.push('');
            });
        }
        // Poor Performance
        if (data.poorIndexes.length > 0) {
            lines.push('⚠️  POOR PERFORMANCE INDEXES');
            data.poorIndexes.forEach((index) => {
                lines.push(`• ${index.index} (${index.table}) - Score: ${index.score}% - ${index.primaryIssue}`);
            });
            lines.push('');
        }
        // Unused Indexes
        if (data.unusedIndexes.length > 0) {
            lines.push('💾 UNUSED INDEXES (Storage Optimization Opportunity)');
            data.unusedIndexes.slice(0, 5).forEach((index) => {
                lines.push(`• ${index.index} (${index.table}) - Size: ${index.size} - Last used: ${index.lastUsed}`);
            });
            if (data.unusedIndexes.length > 5) {
                lines.push(`... and ${data.unusedIndexes.length - 5} more`);
            }
            lines.push('');
        }
        // Active Alerts
        if (data.activeAlerts.length > 0) {
            lines.push('🔔 ACTIVE ALERTS');
            data.activeAlerts.forEach((alert) => {
                const emoji = alert.severity === 'critical' ? '🚨' : alert.severity === 'high' ? '⚠️' : 'ℹ️';
                lines.push(`• ${emoji} ${alert.message} (${alert.age} ago)`);
                if (format === 'detailed' && alert.actionPlan.length > 0) {
                    lines.push(`  Next steps: ${alert.actionPlan.join('; ')}`);
                }
            });
        }
        return lines;
    }
    formatExecutiveReport(data, format) {
        const lines = [];
        lines.push('📈 EXECUTIVE SUMMARY');
        lines.push(data.executiveSummary.summary);
        lines.push('');
        lines.push('📊 KEY PERFORMANCE INDICATORS');
        lines.push(`• System Health: ${data.executiveSummary.overallHealth}`);
        lines.push(`• Performance Score: ${data.executiveSummary.performanceScore}`);
        lines.push(`• Total Indexes: ${data.executiveSummary.keyMetrics.totalIndexes}`);
        lines.push(`• Efficiency Score: ${data.executiveSummary.keyMetrics.efficiencyScore}%`);
        lines.push(`• Average Query Time: ${data.executiveSummary.keyMetrics.averageQueryTime}ms`);
        lines.push('');
        lines.push('📈 TREND ANALYSIS');
        lines.push(`• Performance Trend: ${data.trendAnalysis.performanceTrend.toUpperCase()}`);
        lines.push(`• System Efficiency: ${data.trendAnalysis.efficiency}`);
        lines.push(`• Storage Utilization: ${data.trendAnalysis.capacityUtilization}`);
        lines.push('');
        if (data.achievements.length > 0) {
            lines.push('🎉 ACHIEVEMENTS');
            data.achievements.forEach((achievement) => {
                lines.push(`• ${achievement}`);
            });
            lines.push('');
        }
        if (data.criticalIssues.length > 0) {
            lines.push('🚨 CRITICAL ISSUES');
            data.criticalIssues.forEach((issue) => {
                lines.push(`• ${issue.issue}`);
                lines.push(`  Impact: ${issue.impact}`);
                lines.push(`  Urgency: ${issue.urgency}`);
            });
            lines.push('');
        }
        if (data.concerns.length > 0) {
            lines.push('⚠️  AREAS OF CONCERN');
            data.concerns.forEach((concern) => {
                lines.push(`• ${concern}`);
            });
            lines.push('');
        }
        lines.push('🎯 TOP RECOMMENDATIONS');
        data.topRecommendations.forEach((rec, index) => {
            lines.push(`${index + 1}. ${rec.recommendation}`);
            lines.push(`   Expected Benefit: ${rec.expectedBenefit}`);
        });
        lines.push('');
        lines.push('📋 IMMEDIATE ACTION ITEMS');
        data.actionItems.forEach((item, index) => {
            lines.push(`${index + 1}. ${item}`);
        });
        lines.push('');
        lines.push('🔄 NEXT STEPS');
        data.nextSteps.forEach((step, index) => {
            lines.push(`${index + 1}. ${step}`);
        });
        return lines;
    }
    generateActionItems(executiveSummary) {
        const actions = [];
        if (executiveSummary.criticalIssues.length > 0) {
            actions.push(`Address ${executiveSummary.criticalIssues.length} critical issues within 24 hours`);
        }
        if (executiveSummary.keyMetrics.unusedIndexes > 0) {
            actions.push(`Review and remove ${executiveSummary.keyMetrics.unusedIndexes} unused indexes`);
        }
        if (executiveSummary.keyMetrics.efficiencyScore < 70) {
            actions.push('Implement top 3 optimization recommendations');
        }
        actions.push('Schedule regular performance review meetings');
        actions.push('Enable automated monitoring and alerting');
        return actions.slice(0, 5);
    }
    generateNextSteps(executiveSummary, performanceReport) {
        const steps = [];
        if (performanceReport.summary.optimizationsExecuted === 0) {
            steps.push('Begin implementing low-risk index optimizations');
        }
        if (executiveSummary.trendAnalysis.performanceTrend === 'degrading') {
            steps.push('Investigate root cause of performance degradation');
        }
        steps.push('Establish baseline performance metrics for trending');
        steps.push('Configure automated maintenance windows');
        steps.push('Develop index lifecycle management procedures');
        return steps.slice(0, 5);
    }
    sanitizeQuery(query) {
        // Remove sensitive data and normalize query for display
        return query
            .replace(/\b\d+\b/g, '?') // Replace numbers with placeholders
            .replace(/('[^']*'|"[^"]*")/g, '?') // Replace string literals
            .substring(0, 80); // Limit length
    }
}
//# sourceMappingURL=GetIndexPerformanceReportTool.js.map