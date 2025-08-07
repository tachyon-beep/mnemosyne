/**
 * Statistical utility functions for analytics calculations
 *
 * This module provides production-ready statistical methods to replace
 * placeholder implementations in analytics tools.
 */
/**
 * Statistical summary for a dataset
 */
export interface StatisticalSummary {
    mean: number;
    median: number;
    mode: number[];
    standardDeviation: number;
    variance: number;
    min: number;
    max: number;
    range: number;
    quartiles: {
        q1: number;
        q2: number;
        q3: number;
        iqr: number;
    };
    count: number;
}
/**
 * Correlation analysis result
 */
export interface CorrelationAnalysis {
    pearsonCorrelation: number;
    spearmanCorrelation: number;
    significance: number;
    strength: 'very weak' | 'weak' | 'moderate' | 'strong' | 'very strong';
}
/**
 * Time series analysis result
 */
export interface TimeSeriesAnalysis {
    trend: {
        slope: number;
        intercept: number;
        rSquared: number;
        direction: 'increasing' | 'decreasing' | 'stable';
    };
    seasonality: {
        detected: boolean;
        period?: number;
        strength?: number;
    };
    changePoints: Array<{
        index: number;
        significance: number;
    }>;
}
/**
 * Calculate comprehensive statistical summary for a dataset
 */
export declare function calculateStatisticalSummary(values: number[]): StatisticalSummary;
/**
 * Calculate percentile for a sorted dataset
 */
export declare function calculatePercentile(sortedValues: number[], percentile: number): number;
/**
 * Calculate Pearson correlation coefficient
 */
export declare function calculatePearsonCorrelation(xValues: number[], yValues: number[]): number;
/**
 * Calculate Spearman rank correlation coefficient
 */
export declare function calculateSpearmanCorrelation(xValues: number[], yValues: number[]): number;
/**
 * Convert values to ranks
 */
export declare function getRanks(values: number[]): number[];
/**
 * Perform comprehensive correlation analysis
 */
export declare function analyzeCorrelation(xValues: number[], yValues: number[]): CorrelationAnalysis;
/**
 * Perform linear regression analysis
 */
export declare function performLinearRegression(xValues: number[], yValues: number[]): {
    slope: number;
    intercept: number;
    rSquared: number;
    residuals: number[];
};
/**
 * Analyze time series data for trends and patterns
 */
export declare function analyzeTimeSeries(values: number[], timestamps?: number[]): TimeSeriesAnalysis;
/**
 * Calculate moving average
 */
export declare function calculateMovingAverage(values: number[], windowSize: number): number[];
/**
 * Calculate exponential moving average
 */
export declare function calculateExponentialMovingAverage(values: number[], alpha: number): number[];
/**
 * Normalize values to 0-100 scale
 */
export declare function normalizeToScale(values: number[], min?: number, max?: number): number[];
/**
 * Calculate Z-scores for outlier detection
 */
export declare function calculateZScores(values: number[]): number[];
/**
 * Detect outliers using Z-score method
 */
export declare function detectOutliers(values: number[], threshold?: number): Array<{
    index: number;
    value: number;
    zScore: number;
}>;
/**
 * Bootstrap confidence interval
 */
export declare function bootstrapConfidenceInterval(values: number[], statistic: (vals: number[]) => number, confidence?: number, iterations?: number): {
    lower: number;
    upper: number;
    estimate: number;
};
//# sourceMappingURL=statistics.d.ts.map