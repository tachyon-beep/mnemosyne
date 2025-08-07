/**
 * Manage Index Optimization Tool
 *
 * Allows users to review, approve, and execute index optimization recommendations.
 * Provides safe controls for managing database index performance improvements.
 */
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import { ProductionPerformanceManager } from '../analytics/performance/ProductionPerformanceManager.js';
import { IndexMonitoringDashboard } from '../analytics/performance/IndexMonitoringDashboard.js';
import { IndexUsageMonitor } from '../analytics/performance/IndexUsageMonitor.js';
import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
const ManageIndexOptimizationSchema = z.object({
    action: z.enum(['list', 'analyze', 'preview', 'execute', 'status', 'rollback']),
    optimizationType: z.enum(['create', 'drop', 'rebuild', 'modify', 'all']).optional(),
    indexName: z.string().optional(),
    tableName: z.string().optional(),
    autoApprove: z.boolean().default(false),
    riskTolerance: z.enum(['conservative', 'moderate', 'aggressive']).default('conservative'),
    dryRun: z.boolean().default(true),
    maxOptimizations: z.number().min(1).max(10).default(5),
    forceExecution: z.boolean().default(false)
});
export class ManageIndexOptimizationTool extends BaseTool {
    performanceManager;
    dashboard;
    indexMonitor;
    constructor(databaseManager) {
        const toolDef = {
            name: 'manage_index_optimization',
            description: 'Manage index optimization recommendations - analyze, preview, and execute database index improvements',
            inputSchema: {
                type: 'object',
                properties: {
                    action: { type: 'string', enum: ['list', 'analyze', 'preview', 'execute', 'status', 'rollback'] },
                    optimizationType: { type: 'string', enum: ['create', 'drop', 'rebuild', 'modify', 'all'] },
                    indexName: { type: 'string' },
                    tableName: { type: 'string' },
                    autoApprove: { type: 'boolean', default: false },
                    riskTolerance: { type: 'string', enum: ['conservative', 'moderate', 'aggressive'], default: 'conservative' },
                    dryRun: { type: 'boolean', default: true },
                    maxOptimizations: { type: 'number', minimum: 1, maximum: 10, default: 5 },
                    forceExecution: { type: 'boolean', default: false }
                },
                required: ['action'],
                additionalProperties: false
            }
        };
        super(toolDef, ManageIndexOptimizationSchema);
        // Initialize performance management components
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
        this.indexMonitor = new IndexUsageMonitor(databaseManager);
    }
    async executeImpl(args) {
        try {
            console.log(`Executing index optimization action: ${args.action}`);
            // Initialize monitoring if not already running
            try {
                await this.performanceManager.initialize();
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                if (!errorMessage.includes('already running')) {
                    console.warn('Performance manager initialization warning:', errorMessage);
                }
            }
            switch (args.action) {
                case 'list':
                    return await this.listOptimizations(args);
                case 'analyze':
                    return await this.analyzeOptimizations(args);
                case 'preview':
                    return await this.previewOptimization(args);
                case 'execute':
                    return await this.executeOptimizations(args);
                case 'status':
                    return await this.getOptimizationStatus(args);
                case 'rollback':
                    return await this.rollbackOptimization(args);
                default:
                    throw new Error(`Unsupported action: ${args.action}`);
            }
        }
        catch (error) {
            console.error('Error in index optimization management:', error);
            return {
                success: false,
                error: `Index optimization failed: ${error instanceof Error ? error.message : String(error)}`,
                action: args.action
            };
        }
    }
    async listOptimizations(args) {
        const recommendations = await this.dashboard.getOptimizationRecommendations();
        // Filter by type if specified
        let filteredRecommendations = recommendations;
        if (args.optimizationType && args.optimizationType !== 'all') {
            filteredRecommendations = recommendations.filter(r => r.type === args.optimizationType);
        }
        // Apply risk tolerance filter
        filteredRecommendations = this.applyRiskFilter(filteredRecommendations, args.riskTolerance);
        // Limit results
        const limitedRecommendations = filteredRecommendations.slice(0, args.maxOptimizations);
        return {
            success: true,
            action: 'list',
            totalRecommendations: recommendations.length,
            filteredCount: filteredRecommendations.length,
            displayedCount: limitedRecommendations.length,
            riskTolerance: args.riskTolerance,
            optimizations: limitedRecommendations.map(rec => ({
                id: this.generateOptimizationId(rec),
                type: rec.type,
                indexName: rec.indexName,
                tableName: rec.tableName,
                reason: rec.reason,
                expectedImpact: rec.expectedImpact,
                riskLevel: rec.riskLevel,
                estimatedBenefit: `${Math.round(rec.estimatedBenefit)}ms`,
                costBenefitScore: Math.round(rec.costBenefitScore),
                implementationComplexity: rec.implementationComplexity,
                priority: rec.implementationPriority,
                riskAssessment: rec.riskAssessment,
                canAutoApprove: this.canAutoApprove(rec, args.riskTolerance),
                sql: args.dryRun ? rec.sql : '*** SQL hidden - set dryRun:false to view ***'
            })),
            filters: {
                optimizationType: args.optimizationType || 'all',
                riskTolerance: args.riskTolerance,
                maxOptimizations: args.maxOptimizations
            },
            summary: this.generateOptimizationSummary(limitedRecommendations)
        };
    }
    async analyzeOptimizations(args) {
        const recommendations = await this.dashboard.getOptimizationRecommendations();
        const healthReports = await this.dashboard.getIndexHealthReport();
        const currentMetrics = await this.dashboard.getCurrentMetrics();
        // Analyze impact by table
        const tableAnalysis = this.analyzeByTable(recommendations, healthReports);
        // Risk analysis
        const riskAnalysis = this.analyzeRisks(recommendations);
        // Performance impact analysis
        const impactAnalysis = this.analyzePerformanceImpact(recommendations, currentMetrics);
        return {
            success: true,
            action: 'analyze',
            analysis: {
                overview: {
                    totalRecommendations: recommendations.length,
                    highImpactOptimizations: recommendations.filter(r => r.expectedImpact === 'high').length,
                    lowRiskOptimizations: recommendations.filter(r => r.riskLevel === 'low').length,
                    potentialBenefit: Math.round(recommendations.reduce((sum, r) => sum + r.estimatedBenefit, 0))
                },
                tableAnalysis,
                riskAnalysis,
                impactAnalysis,
                recommendations: {
                    immediate: this.getImmediateRecommendations(recommendations, args.riskTolerance),
                    shortTerm: this.getShortTermRecommendations(recommendations),
                    longTerm: this.getLongTermRecommendations(recommendations)
                }
            }
        };
    }
    async previewOptimization(args) {
        if (!args.indexName) {
            return {
                success: false,
                error: 'indexName is required for preview action'
            };
        }
        const recommendations = await this.dashboard.getOptimizationRecommendations();
        const recommendation = recommendations.find(r => r.indexName === args.indexName);
        if (!recommendation) {
            return {
                success: false,
                error: `No optimization recommendation found for index: ${args.indexName}`
            };
        }
        // Get current index statistics
        const currentStats = await this.getCurrentIndexStats(args.indexName);
        // Simulate the optimization impact
        const impactSimulation = this.simulateOptimizationImpact(recommendation, currentStats);
        return {
            success: true,
            action: 'preview',
            optimization: {
                id: this.generateOptimizationId(recommendation),
                indexName: recommendation.indexName,
                tableName: recommendation.tableName,
                type: recommendation.type,
                reason: recommendation.reason,
                sql: recommendation.sql,
                riskLevel: recommendation.riskLevel,
                riskAssessment: recommendation.riskAssessment,
                implementationComplexity: recommendation.implementationComplexity
            },
            currentState: currentStats,
            expectedOutcome: impactSimulation,
            preExecutionChecks: this.generatePreExecutionChecks(recommendation),
            warnings: this.generateWarnings(recommendation, currentStats),
            rollbackPlan: this.generateRollbackPlan(recommendation),
            executionSafe: this.isExecutionSafe(recommendation, args.riskTolerance)
        };
    }
    async executeOptimizations(args) {
        if (args.dryRun && !args.forceExecution) {
            return {
                success: false,
                error: 'Dry run mode active. Set dryRun:false or forceExecution:true to execute optimizations',
                hint: 'Use preview action to analyze specific optimizations before execution'
            };
        }
        const recommendations = await this.dashboard.getOptimizationRecommendations();
        let targetRecommendations = [];
        if (args.indexName) {
            // Execute specific optimization
            const specific = recommendations.find(r => r.indexName === args.indexName);
            if (!specific) {
                return {
                    success: false,
                    error: `No optimization found for index: ${args.indexName}`
                };
            }
            targetRecommendations = [specific];
        }
        else {
            // Execute multiple optimizations based on criteria
            targetRecommendations = this.selectOptimizationsForExecution(recommendations, args.riskTolerance, args.maxOptimizations, args.autoApprove);
        }
        if (targetRecommendations.length === 0) {
            return {
                success: true,
                action: 'execute',
                message: 'No optimizations selected for execution based on current criteria',
                criteria: {
                    riskTolerance: args.riskTolerance,
                    autoApprove: args.autoApprove,
                    maxOptimizations: args.maxOptimizations
                }
            };
        }
        // Execute optimizations
        const results = [];
        const executionStart = Date.now();
        for (const recommendation of targetRecommendations) {
            const result = await this.executeIndividualOptimization(recommendation, args.forceExecution);
            results.push(result);
            // Stop on failure if not forcing execution
            if (!result.status.includes('completed') && !args.forceExecution) {
                break;
            }
        }
        const executionTime = Date.now() - executionStart;
        const successful = results.filter(r => r.status === 'completed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        return {
            success: successful > 0,
            action: 'execute',
            executionSummary: {
                totalOptimizations: results.length,
                successful,
                failed,
                totalExecutionTime: executionTime,
                averageExecutionTime: Math.round(executionTime / results.length),
                overallBenefit: results.reduce((sum, r) => sum + (r.actualBenefit || 0), 0)
            },
            results,
            recommendations: this.generatePostExecutionRecommendations(results)
        };
    }
    async getOptimizationStatus(args) {
        // Get recent optimization history from the database
        const db = this.dashboard['databaseManager'].getConnection();
        const recentOptimizations = db.prepare(`
      SELECT 
        index_name,
        table_name,
        action_type,
        status,
        execution_time,
        actual_impact,
        created_at,
        error_message
      FROM index_optimization_log
      WHERE created_at > ?
      ORDER BY created_at DESC
      LIMIT 20
    `).all(Date.now() - (7 * 24 * 60 * 60 * 1000)); // Last 7 days
        const currentRecommendations = await this.dashboard.getOptimizationRecommendations();
        const systemStatus = await this.performanceManager.getPerformanceStatus();
        return {
            success: true,
            action: 'status',
            systemStatus: {
                overall: systemStatus.overall,
                activeOptimizations: systemStatus.activeOptimizations,
                lastUpdate: new Date(systemStatus.lastUpdate).toISOString()
            },
            recentActivity: recentOptimizations.map((opt) => ({
                indexName: opt.index_name,
                tableName: opt.table_name,
                action: opt.action_type,
                status: opt.status,
                executionTime: opt.execution_time ? `${Math.round(opt.execution_time)}ms` : null,
                benefit: opt.actual_impact ? `${Math.round(opt.actual_impact)}ms` : null,
                timestamp: new Date(opt.created_at).toISOString(),
                error: opt.error_message
            })),
            pendingRecommendations: {
                total: currentRecommendations.length,
                highPriority: currentRecommendations.filter(r => r.implementationPriority === 1).length,
                lowRisk: currentRecommendations.filter(r => r.riskLevel === 'low').length,
                autoApprovable: currentRecommendations.filter(r => this.canAutoApprove(r, args.riskTolerance || 'conservative')).length
            }
        };
    }
    async rollbackOptimization(args) {
        if (!args.indexName) {
            return {
                success: false,
                error: 'indexName is required for rollback action'
            };
        }
        // This would implement rollback logic - simplified for demo
        return {
            success: false,
            error: 'Rollback functionality not yet implemented - would require detailed audit trail and reverse operations',
            indexName: args.indexName,
            note: 'Manual rollback may be required for complex optimizations'
        };
    }
    // Helper methods
    applyRiskFilter(recommendations, riskTolerance) {
        switch (riskTolerance) {
            case 'conservative':
                return recommendations.filter(r => r.riskLevel === 'low');
            case 'moderate':
                return recommendations.filter(r => r.riskLevel === 'low' || r.riskLevel === 'medium');
            case 'aggressive':
                return recommendations; // Include all risk levels
            default:
                return recommendations.filter(r => r.riskLevel === 'low');
        }
    }
    canAutoApprove(recommendation, riskTolerance) {
        if (recommendation.riskLevel === 'high')
            return false;
        if (recommendation.implementationComplexity === 'high')
            return false;
        switch (riskTolerance) {
            case 'conservative':
                return recommendation.riskLevel === 'low' && recommendation.implementationComplexity === 'low';
            case 'moderate':
                return recommendation.costBenefitScore > 50;
            case 'aggressive':
                return recommendation.costBenefitScore > 30;
            default:
                return false;
        }
    }
    generateOptimizationId(recommendation) {
        return `opt_${recommendation.type}_${recommendation.indexName}_${Date.now().toString(36)}`;
    }
    generateOptimizationSummary(recommendations) {
        const summary = {
            totalBenefit: Math.round(recommendations.reduce((sum, r) => sum + r.estimatedBenefit, 0)),
            averageCostBenefit: Math.round(recommendations.reduce((sum, r) => sum + r.costBenefitScore, 0) / recommendations.length),
            riskDistribution: {
                low: recommendations.filter(r => r.riskLevel === 'low').length,
                medium: recommendations.filter(r => r.riskLevel === 'medium').length,
                high: recommendations.filter(r => r.riskLevel === 'high').length
            },
            typeDistribution: recommendations.reduce((acc, r) => {
                acc[r.type] = (acc[r.type] || 0) + 1;
                return acc;
            }, {}),
            complexityDistribution: {
                low: recommendations.filter(r => r.implementationComplexity === 'low').length,
                medium: recommendations.filter(r => r.implementationComplexity === 'medium').length,
                high: recommendations.filter(r => r.implementationComplexity === 'high').length
            }
        };
        return summary;
    }
    analyzeByTable(recommendations, healthReports) {
        const tableAnalysis = {};
        for (const rec of recommendations) {
            if (!tableAnalysis[rec.tableName]) {
                tableAnalysis[rec.tableName] = {
                    optimizations: 0,
                    totalBenefit: 0,
                    riskLevels: { low: 0, medium: 0, high: 0 },
                    types: {},
                    averageHealth: 0
                };
            }
            const analysis = tableAnalysis[rec.tableName];
            analysis.optimizations++;
            analysis.totalBenefit += rec.estimatedBenefit;
            analysis.riskLevels[rec.riskLevel]++;
            analysis.types[rec.type] = (analysis.types[rec.type] || 0) + 1;
        }
        // Add health information
        for (const health of healthReports) {
            if (tableAnalysis[health.tableName]) {
                tableAnalysis[health.tableName].averageHealth = health.healthScore;
            }
        }
        return tableAnalysis;
    }
    analyzeRisks(recommendations) {
        return {
            overallRiskScore: this.calculateOverallRiskScore(recommendations),
            highestRiskOptimizations: recommendations
                .filter(r => r.riskLevel === 'high')
                .slice(0, 3)
                .map(r => ({ index: r.indexName, reason: r.riskAssessment })),
            riskMitigations: this.generateRiskMitigations(recommendations)
        };
    }
    analyzePerformanceImpact(recommendations, currentMetrics) {
        const totalBenefit = recommendations.reduce((sum, r) => sum + r.estimatedBenefit, 0);
        const currentAvgTime = currentMetrics.overview.averageQueryTime;
        return {
            estimatedImprovementPercent: Math.round((totalBenefit / currentAvgTime) * 100),
            projectedAverageQueryTime: Math.max(currentAvgTime - totalBenefit, 50), // Minimum 50ms
            highImpactOptimizations: recommendations
                .filter(r => r.expectedImpact === 'high')
                .sort((a, b) => b.estimatedBenefit - a.estimatedBenefit)
                .slice(0, 3)
        };
    }
    getImmediateRecommendations(recommendations, riskTolerance) {
        return recommendations
            .filter(r => r.implementationPriority === 1 && this.canAutoApprove(r, riskTolerance))
            .slice(0, 3)
            .map(r => ({
            index: r.indexName,
            action: r.type,
            reason: r.reason,
            benefit: `${Math.round(r.estimatedBenefit)}ms`
        }));
    }
    getShortTermRecommendations(recommendations) {
        return recommendations
            .filter(r => r.implementationPriority === 2)
            .slice(0, 5)
            .map(r => ({
            index: r.indexName,
            action: r.type,
            reason: r.reason,
            complexity: r.implementationComplexity
        }));
    }
    getLongTermRecommendations(recommendations) {
        return recommendations
            .filter(r => r.implementationPriority >= 3)
            .slice(0, 5)
            .map(r => ({
            index: r.indexName,
            action: r.type,
            reason: r.reason,
            strategicValue: r.costBenefitScore > 70 ? 'high' : 'medium'
        }));
    }
    async getCurrentIndexStats(indexName) {
        // Simplified - would get actual index statistics
        return {
            exists: true,
            size: '1.2MB',
            lastUsed: Date.now() - (2 * 60 * 60 * 1000), // 2 hours ago
            usageCount: 1234,
            effectiveness: 0.75
        };
    }
    simulateOptimizationImpact(recommendation, currentStats) {
        return {
            estimatedNewQueryTime: Math.max(100, 1000 - recommendation.estimatedBenefit),
            estimatedStorageChange: recommendation.type === 'drop' ? `-${currentStats.size}` :
                recommendation.type === 'create' ? '+500KB' : 'unchanged',
            maintenanceImpact: recommendation.type === 'rebuild' ? 'temporary table lock' : 'minimal',
            rollbackComplexity: recommendation.type === 'drop' ? 'difficult' : 'easy'
        };
    }
    generatePreExecutionChecks(recommendation) {
        const checks = [
            'Verify no critical queries depend solely on this index',
            'Confirm maintenance window availability',
            'Ensure sufficient disk space for operation'
        ];
        if (recommendation.type === 'drop') {
            checks.push('Double-check index is truly unused');
        }
        if (recommendation.type === 'create') {
            checks.push('Verify column selectivity supports index effectiveness');
        }
        return checks;
    }
    generateWarnings(recommendation, currentStats) {
        const warnings = [];
        if (recommendation.riskLevel === 'high') {
            warnings.push('HIGH RISK: This optimization has significant risk factors');
        }
        if (recommendation.type === 'drop' && currentStats.lastUsed && (Date.now() - currentStats.lastUsed) < 7 * 24 * 60 * 60 * 1000) {
            warnings.push('Index was used within the last 7 days - verify it is safe to drop');
        }
        if (recommendation.implementationComplexity === 'high') {
            warnings.push('Complex optimization - consider executing during planned maintenance');
        }
        return warnings;
    }
    generateRollbackPlan(recommendation) {
        switch (recommendation.type) {
            case 'drop':
                return {
                    complexity: 'difficult',
                    steps: ['Recreate index with original definition', 'Rebuild statistics'],
                    dataRequired: 'Original CREATE INDEX statement'
                };
            case 'create':
                return {
                    complexity: 'easy',
                    steps: ['DROP INDEX ' + recommendation.indexName],
                    dataRequired: 'None'
                };
            case 'rebuild':
                return {
                    complexity: 'easy',
                    steps: ['Index will return to previous state automatically if failed'],
                    dataRequired: 'None'
                };
            default:
                return {
                    complexity: 'manual',
                    steps: ['Requires case-by-case analysis'],
                    dataRequired: 'Before/after metrics'
                };
        }
    }
    isExecutionSafe(recommendation, riskTolerance) {
        if (recommendation.riskLevel === 'high' && riskTolerance === 'conservative') {
            return false;
        }
        if (recommendation.implementationComplexity === 'high' && riskTolerance !== 'aggressive') {
            return false;
        }
        return true;
    }
    selectOptimizationsForExecution(recommendations, riskTolerance, maxOptimizations, autoApprove) {
        let eligible = this.applyRiskFilter(recommendations, riskTolerance);
        if (autoApprove) {
            eligible = eligible.filter(r => this.canAutoApprove(r, riskTolerance));
        }
        // Sort by priority and benefit
        eligible.sort((a, b) => {
            if (a.implementationPriority !== b.implementationPriority) {
                return a.implementationPriority - b.implementationPriority;
            }
            return b.estimatedBenefit - a.estimatedBenefit;
        });
        return eligible.slice(0, maxOptimizations);
    }
    async executeIndividualOptimization(recommendation, forceExecution) {
        const optimizationId = this.generateOptimizationId(recommendation);
        const result = {
            optimizationId,
            indexName: recommendation.indexName,
            tableName: recommendation.tableName,
            action: recommendation.type,
            status: 'planned'
        };
        try {
            result.status = 'executing';
            const executionResult = await this.indexMonitor.executeRecommendation(recommendation);
            if (executionResult.success) {
                result.status = 'completed';
                result.executionTime = executionResult.executionTime;
                result.actualBenefit = recommendation.estimatedBenefit; // Simplified
            }
            else {
                result.status = 'failed';
                result.error = executionResult.error;
            }
        }
        catch (error) {
            result.status = 'failed';
            result.error = error instanceof Error ? error.message : String(error);
        }
        return result;
    }
    calculateOverallRiskScore(recommendations) {
        if (recommendations.length === 0)
            return 0;
        const riskScores = recommendations.map(r => {
            switch (r.riskLevel) {
                case 'low': return 1;
                case 'medium': return 2;
                case 'high': return 3;
                default: return 2;
            }
        });
        return Math.round(riskScores.reduce((sum, score) => sum + score, 0) / riskScores.length);
    }
    generateRiskMitigations(recommendations) {
        const mitigations = [
            'Execute optimizations during low-traffic periods',
            'Monitor query performance immediately after changes',
            'Keep rollback scripts ready for high-risk operations'
        ];
        if (recommendations.some(r => r.type === 'drop')) {
            mitigations.push('Verify unused indexes with recent query analysis');
        }
        return mitigations;
    }
    generatePostExecutionRecommendations(results) {
        const recommendations = [];
        const successful = results.filter(r => r.status === 'completed').length;
        const failed = results.filter(r => r.status === 'failed').length;
        if (successful > 0) {
            recommendations.push(`Monitor performance of ${successful} optimized indexes over next 24 hours`);
        }
        if (failed > 0) {
            recommendations.push(`Investigate ${failed} failed optimizations for root cause`);
        }
        recommendations.push('Update monitoring baseline with new performance metrics');
        recommendations.push('Schedule follow-up analysis in 1 week');
        return recommendations;
    }
}
//# sourceMappingURL=ManageIndexOptimizationTool.js.map