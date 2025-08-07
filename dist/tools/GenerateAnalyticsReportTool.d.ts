/**
 * Generate Analytics Report Tool Implementation
 *
 * This tool generates comprehensive analytics reports by combining data from:
 * - Conversation flow and quality metrics
 * - Productivity patterns and insights
 * - Knowledge gap analysis
 * - Decision effectiveness tracking
 * - Trend analysis and recommendations
 */
import { GenerateAnalyticsReportInput } from '../types/schemas.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
import { ConversationRepository } from '../storage/repositories/ConversationRepository.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { TimeRange } from '../analytics/repositories/index.js';
/**
 * Chart data for visualizations
 */
export interface ChartData {
    /** Chart type */
    type: 'line' | 'bar' | 'pie' | 'scatter' | 'heatmap';
    /** Chart title */
    title: string;
    /** Chart description */
    description: string;
    /** Data points */
    data: Array<{
        label: string;
        value: number;
        category?: string;
        timestamp?: number;
    }>;
    /** Chart configuration */
    config: {
        xAxisLabel?: string;
        yAxisLabel?: string;
        colors?: string[];
        showLegend?: boolean;
    };
}
/**
 * Report section content
 */
export interface ReportSection {
    /** Section identifier */
    id: string;
    /** Section title */
    title: string;
    /** Section summary */
    summary: string;
    /** Key metrics for this section */
    metrics: Array<{
        name: string;
        value: number | string;
        unit?: string;
        trend?: 'up' | 'down' | 'stable';
        trendValue?: number;
    }>;
    /** Detailed insights */
    insights: string[];
    /** Recommendations specific to this section */
    recommendations: string[];
    /** Charts for this section */
    charts?: ChartData[];
    /** Raw data (if requested) */
    rawData?: any;
}
/**
 * Executive summary data
 */
export interface ExecutiveSummary {
    /** Overall health score (0-100) */
    overallScore: number;
    /** Key achievements */
    achievements: string[];
    /** Critical issues */
    criticalIssues: string[];
    /** Top recommendations */
    topRecommendations: string[];
    /** Period comparison */
    periodComparison?: {
        metric: string;
        currentValue: number;
        previousValue: number;
        percentageChange: number;
        interpretation: string;
    }[];
}
/**
 * Response interface for generate_analytics_report tool
 */
export interface GenerateAnalyticsReportResponse {
    /** Report metadata */
    reportInfo: {
        /** Report title */
        title: string;
        /** Report format */
        format: 'summary' | 'detailed' | 'executive';
        /** Time range covered */
        timeRange: TimeRange;
        /** When report was generated */
        generatedAt: number;
        /** Report version */
        version: string;
    };
    /** Executive summary (for executive format) */
    executiveSummary?: ExecutiveSummary;
    /** Report sections */
    sections: ReportSection[];
    /** Overall insights and recommendations */
    overallInsights: {
        /** Cross-cutting insights that span multiple areas */
        keyInsights: string[];
        /** Strategic recommendations */
        strategicRecommendations: string[];
        /** Action items with priorities */
        actionItems: Array<{
            action: string;
            priority: 'high' | 'medium' | 'low';
            effort: 'low' | 'medium' | 'high';
            impact: 'low' | 'medium' | 'high';
            timeline: string;
        }>;
        /** Success indicators to monitor */
        successIndicators: string[];
    };
    /** Charts and visualizations (if requested) */
    visualizations?: ChartData[];
    /** Appendices with raw data (if requested) */
    appendices?: Array<{
        title: string;
        description: string;
        data: any;
    }>;
    /** Report generation metadata */
    metadata: {
        /** Data sources used */
        dataSources: string[];
        /** Number of conversations analyzed */
        conversationCount: number;
        /** Total messages analyzed */
        messageCount: number;
        /** Analysis coverage percentage */
        coveragePercentage: number;
        /** Generation time in milliseconds */
        generationTime: number;
        /** Data quality indicators */
        dataQuality: {
            completeness: number;
            accuracy: number;
            freshness: number;
        };
    };
}
/**
 * Dependencies required by GenerateAnalyticsReportTool
 */
export interface GenerateAnalyticsReportDependencies {
    analyticsEngine: AnalyticsEngine;
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
}
/**
 * Implementation of the generate_analytics_report MCP tool
 */
export declare class GenerateAnalyticsReportTool extends BaseTool<GenerateAnalyticsReportInput, GenerateAnalyticsReportResponse> {
    private readonly analyticsEngine;
    private readonly conversationRepository;
    private readonly messageRepository;
    constructor(dependencies: GenerateAnalyticsReportDependencies);
    /**
     * Execute the generate_analytics_report tool
     */
    protected executeImpl(input: GenerateAnalyticsReportInput, _context: ToolContext): Promise<GenerateAnalyticsReportResponse>;
    /**
     * Generate core analytics report from engine
     */
    private generateCoreReport;
    /**
     * Get data counts for metadata
     */
    private getDataCounts;
    /**
     * Build report sections based on requested sections
     */
    private buildReportSections;
    /**
     * Build conversation metrics section
     */
    private buildConversationMetricsSection;
    /**
     * Build productivity insights section
     */
    private buildProductivityInsightsSection;
    /**
     * Build knowledge gaps section
     */
    private buildKnowledgeGapsSection;
    /**
     * Build decision quality section
     */
    private buildDecisionQualitySection;
    /**
     * Build recommendations section
     */
    private buildRecommendationsSection;
    /**
     * Generate executive summary
     */
    private generateExecutiveSummary;
    /**
     * Generate visualizations
     */
    private generateVisualizations;
    /**
     * Generate appendices with raw data
     */
    private generateAppendices;
    /**
     * Generate overall insights and recommendations
     */
    private generateOverallInsights;
    /**
     * Build report metadata
     */
    private buildReportMetadata;
    /**
     * Generate report title
     */
    private generateReportTitle;
    /**
     * Get real productivity data for peak hours
     */
    private getPeakHourProductivityData;
    /**
     * Calculate conversation productivity score
     */
    private calculateConversationProductivity;
    /**
     * Static factory method to create a GenerateAnalyticsReportTool instance
     */
    static create(dependencies: GenerateAnalyticsReportDependencies): GenerateAnalyticsReportTool;
}
//# sourceMappingURL=GenerateAnalyticsReportTool.d.ts.map