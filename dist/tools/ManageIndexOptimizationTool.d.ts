/**
 * Manage Index Optimization Tool
 *
 * Allows users to review, approve, and execute index optimization recommendations.
 * Provides safe controls for managing database index performance improvements.
 */
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import { DatabaseManager } from '../storage/Database.js';
declare const ManageIndexOptimizationSchema: z.ZodObject<{
    action: z.ZodEnum<["list", "analyze", "preview", "execute", "status", "rollback"]>;
    optimizationType: z.ZodOptional<z.ZodEnum<["create", "drop", "rebuild", "modify", "all"]>>;
    indexName: z.ZodOptional<z.ZodString>;
    tableName: z.ZodOptional<z.ZodString>;
    autoApprove: z.ZodDefault<z.ZodBoolean>;
    riskTolerance: z.ZodDefault<z.ZodEnum<["conservative", "moderate", "aggressive"]>>;
    dryRun: z.ZodDefault<z.ZodBoolean>;
    maxOptimizations: z.ZodDefault<z.ZodNumber>;
    forceExecution: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    dryRun?: boolean;
    action?: "status" | "analyze" | "list" | "preview" | "execute" | "rollback";
    indexName?: string;
    tableName?: string;
    optimizationType?: "create" | "all" | "drop" | "modify" | "rebuild";
    autoApprove?: boolean;
    riskTolerance?: "moderate" | "conservative" | "aggressive";
    maxOptimizations?: number;
    forceExecution?: boolean;
}, {
    dryRun?: boolean;
    action?: "status" | "analyze" | "list" | "preview" | "execute" | "rollback";
    indexName?: string;
    tableName?: string;
    optimizationType?: "create" | "all" | "drop" | "modify" | "rebuild";
    autoApprove?: boolean;
    riskTolerance?: "moderate" | "conservative" | "aggressive";
    maxOptimizations?: number;
    forceExecution?: boolean;
}>;
interface OptimizationResult {
    optimizationId: string;
    indexName: string;
    tableName: string;
    action: string;
    status: 'planned' | 'executing' | 'completed' | 'failed' | 'rolled_back';
    executionTime?: number;
    beforeMetrics?: any;
    afterMetrics?: any;
    actualBenefit?: number;
    error?: string;
}
export declare class ManageIndexOptimizationTool extends BaseTool {
    private performanceManager;
    private dashboard;
    private indexMonitor;
    constructor(databaseManager: DatabaseManager);
    executeImpl(args: z.infer<typeof ManageIndexOptimizationSchema>): Promise<{
        success: boolean;
        action: string;
        totalRecommendations: number;
        filteredCount: number;
        displayedCount: number;
        riskTolerance: any;
        optimizations: {
            id: string;
            type: "create" | "drop" | "modify" | "rebuild";
            indexName: string;
            tableName: string;
            reason: string;
            expectedImpact: "low" | "medium" | "high";
            riskLevel: "low" | "medium" | "high";
            estimatedBenefit: string;
            costBenefitScore: number;
            implementationComplexity: "low" | "medium" | "high";
            priority: number;
            riskAssessment: string;
            canAutoApprove: boolean;
            sql: string;
        }[];
        filters: {
            optimizationType: any;
            riskTolerance: any;
            maxOptimizations: any;
        };
        summary: {
            totalBenefit: number;
            averageCostBenefit: number;
            riskDistribution: {
                low: number;
                medium: number;
                high: number;
            };
            typeDistribution: any;
            complexityDistribution: {
                low: number;
                medium: number;
                high: number;
            };
        };
    } | {
        success: boolean;
        action: string;
        analysis: {
            overview: {
                totalRecommendations: number;
                highImpactOptimizations: number;
                lowRiskOptimizations: number;
                potentialBenefit: number;
            };
            tableAnalysis: any;
            riskAnalysis: any;
            impactAnalysis: any;
            recommendations: {
                immediate: any[];
                shortTerm: any[];
                longTerm: any[];
            };
        };
    } | {
        success: boolean;
        error: string;
        action?: undefined;
        optimization?: undefined;
        currentState?: undefined;
        expectedOutcome?: undefined;
        preExecutionChecks?: undefined;
        warnings?: undefined;
        rollbackPlan?: undefined;
        executionSafe?: undefined;
    } | {
        success: boolean;
        action: string;
        optimization: {
            id: string;
            indexName: string;
            tableName: string;
            type: "create" | "drop" | "modify" | "rebuild";
            reason: string;
            sql: string;
            riskLevel: "low" | "medium" | "high";
            riskAssessment: string;
            implementationComplexity: "low" | "medium" | "high";
        };
        currentState: any;
        expectedOutcome: any;
        preExecutionChecks: string[];
        warnings: string[];
        rollbackPlan: any;
        executionSafe: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        hint: string;
        action?: undefined;
        message?: undefined;
        criteria?: undefined;
        executionSummary?: undefined;
        results?: undefined;
        recommendations?: undefined;
    } | {
        success: boolean;
        error: string;
        hint?: undefined;
        action?: undefined;
        message?: undefined;
        criteria?: undefined;
        executionSummary?: undefined;
        results?: undefined;
        recommendations?: undefined;
    } | {
        success: boolean;
        action: string;
        message: string;
        criteria: {
            riskTolerance: any;
            autoApprove: any;
            maxOptimizations: any;
        };
        error?: undefined;
        hint?: undefined;
        executionSummary?: undefined;
        results?: undefined;
        recommendations?: undefined;
    } | {
        success: boolean;
        action: string;
        executionSummary: {
            totalOptimizations: number;
            successful: number;
            failed: number;
            totalExecutionTime: number;
            averageExecutionTime: number;
            overallBenefit: number;
        };
        results: OptimizationResult[];
        recommendations: string[];
        error?: undefined;
        hint?: undefined;
        message?: undefined;
        criteria?: undefined;
    } | {
        success: boolean;
        action: string;
        systemStatus: {
            overall: "critical" | "good" | "excellent" | "warning";
            activeOptimizations: number;
            lastUpdate: string;
        };
        recentActivity: {
            indexName: any;
            tableName: any;
            action: any;
            status: any;
            executionTime: string;
            benefit: string;
            timestamp: string;
            error: any;
        }[];
        pendingRecommendations: {
            total: number;
            highPriority: number;
            lowRisk: number;
            autoApprovable: number;
        };
    } | {
        success: boolean;
        error: string;
        indexName?: undefined;
        note?: undefined;
    } | {
        success: boolean;
        error: string;
        indexName: any;
        note: string;
    } | {
        success: boolean;
        error: string;
        action: "status" | "analyze" | "list" | "preview" | "execute" | "rollback";
    }>;
    private listOptimizations;
    private analyzeOptimizations;
    private previewOptimization;
    private executeOptimizations;
    private getOptimizationStatus;
    private rollbackOptimization;
    private applyRiskFilter;
    private canAutoApprove;
    private generateOptimizationId;
    private generateOptimizationSummary;
    private analyzeByTable;
    private analyzeRisks;
    private analyzePerformanceImpact;
    private getImmediateRecommendations;
    private getShortTermRecommendations;
    private getLongTermRecommendations;
    private getCurrentIndexStats;
    private simulateOptimizationImpact;
    private generatePreExecutionChecks;
    private generateWarnings;
    private generateRollbackPlan;
    private isExecutionSafe;
    private selectOptimizationsForExecution;
    private executeIndividualOptimization;
    private calculateOverallRiskScore;
    private generateRiskMitigations;
    private generatePostExecutionRecommendations;
}
export {};
//# sourceMappingURL=ManageIndexOptimizationTool.d.ts.map