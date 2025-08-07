/**
 * Get Index Performance Report Tool
 *
 * Provides comprehensive index performance monitoring and analysis.
 * Generates detailed reports on index usage, effectiveness, and optimization opportunities.
 */
import { z } from 'zod';
import { BaseTool } from './BaseTool.js';
import { DatabaseManager } from '../storage/Database.js';
declare const GetIndexPerformanceReportSchema: z.ZodObject<{
    reportType: z.ZodDefault<z.ZodEnum<["overview", "detailed", "recommendations", "health", "executive"]>>;
    timeframe: z.ZodDefault<z.ZodEnum<["hour", "day", "week", "month"]>>;
    includeOptimizations: z.ZodDefault<z.ZodBoolean>;
    includeAlerts: z.ZodDefault<z.ZodBoolean>;
    includeMaintenanceSchedule: z.ZodDefault<z.ZodBoolean>;
    format: z.ZodDefault<z.ZodEnum<["summary", "detailed", "json"]>>;
}, "strip", z.ZodTypeAny, {
    format?: "json" | "detailed" | "summary";
    reportType?: "detailed" | "executive" | "recommendations" | "overview" | "health";
    timeframe?: "hour" | "day" | "week" | "month";
    includeOptimizations?: boolean;
    includeAlerts?: boolean;
    includeMaintenanceSchedule?: boolean;
}, {
    format?: "json" | "detailed" | "summary";
    reportType?: "detailed" | "executive" | "recommendations" | "overview" | "health";
    timeframe?: "hour" | "day" | "week" | "month";
    includeOptimizations?: boolean;
    includeAlerts?: boolean;
    includeMaintenanceSchedule?: boolean;
}>;
export declare class GetIndexPerformanceReportTool extends BaseTool {
    private performanceManager;
    private dashboard;
    constructor(databaseManager: DatabaseManager);
    executeImpl(args: z.infer<typeof GetIndexPerformanceReportSchema>): Promise<{
        success: boolean;
        reportType: "detailed" | "executive" | "recommendations" | "overview" | "health";
        timeframe: "hour" | "day" | "week" | "month";
        generatedAt: string;
        data: any;
        report?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        report: string;
        reportType?: undefined;
        timeframe?: undefined;
        generatedAt?: undefined;
        data?: undefined;
        error?: undefined;
    } | {
        success: boolean;
        error: string;
        reportType: "detailed" | "executive" | "recommendations" | "overview" | "health";
        timeframe?: undefined;
        generatedAt?: undefined;
        data?: undefined;
        report?: undefined;
    }>;
    private generateOverviewReport;
    private generateDetailedReport;
    private generateRecommendationsReport;
    private generateHealthReport;
    private generateExecutiveReport;
    private formatReport;
    private formatOverviewReport;
    private formatDetailedReport;
    private formatRecommendationsReport;
    private formatHealthReport;
    private formatExecutiveReport;
    private generateActionItems;
    private generateNextSteps;
    private sanitizeQuery;
}
export {};
//# sourceMappingURL=GetIndexPerformanceReportTool.d.ts.map