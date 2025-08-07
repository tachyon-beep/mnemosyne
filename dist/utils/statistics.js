/**
 * Statistical utility functions for analytics calculations
 *
 * This module provides production-ready statistical methods to replace
 * placeholder implementations in analytics tools.
 */
/**
 * Calculate comprehensive statistical summary for a dataset
 */
export function calculateStatisticalSummary(values) {
    if (values.length === 0) {
        throw new Error('Cannot calculate statistics for empty dataset');
    }
    const sorted = [...values].sort((a, b) => a - b);
    const n = values.length;
    // Basic statistics
    const sum = values.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;
    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;
    // Median
    const median = n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];
    // Mode(s)
    const frequency = new Map();
    values.forEach(val => {
        frequency.set(val, (frequency.get(val) || 0) + 1);
    });
    const maxFreq = Math.max(...frequency.values());
    const mode = Array.from(frequency.entries())
        .filter(([_, freq]) => freq === maxFreq)
        .map(([val, _]) => val);
    // Variance and standard deviation
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);
    // Quartiles
    const q1 = calculatePercentile(sorted, 25);
    const q2 = median;
    const q3 = calculatePercentile(sorted, 75);
    const iqr = q3 - q1;
    return {
        mean: Math.round(mean * 1000) / 1000,
        median: Math.round(median * 1000) / 1000,
        mode,
        standardDeviation: Math.round(standardDeviation * 1000) / 1000,
        variance: Math.round(variance * 1000) / 1000,
        min,
        max,
        range,
        quartiles: { q1, q2, q3, iqr },
        count: n
    };
}
/**
 * Calculate percentile for a sorted dataset
 */
export function calculatePercentile(sortedValues, percentile) {
    if (percentile < 0 || percentile > 100) {
        throw new Error('Percentile must be between 0 and 100');
    }
    const n = sortedValues.length;
    const index = (percentile / 100) * (n - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) {
        return sortedValues[lower];
    }
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}
/**
 * Calculate Pearson correlation coefficient
 */
export function calculatePearsonCorrelation(xValues, yValues) {
    if (xValues.length !== yValues.length || xValues.length < 2) {
        throw new Error('Arrays must have equal length and at least 2 elements');
    }
    const n = xValues.length;
    const sumX = xValues.reduce((sum, val) => sum + val, 0);
    const sumY = yValues.reduce((sum, val) => sum + val, 0);
    const sumXY = xValues.reduce((sum, val, i) => sum + val * yValues[i], 0);
    const sumXX = xValues.reduce((sum, val) => sum + val * val, 0);
    const sumYY = yValues.reduce((sum, val) => sum + val * val, 0);
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    if (denominator === 0)
        return 0;
    return Math.max(-1, Math.min(1, numerator / denominator));
}
/**
 * Calculate Spearman rank correlation coefficient
 */
export function calculateSpearmanCorrelation(xValues, yValues) {
    if (xValues.length !== yValues.length || xValues.length < 2) {
        throw new Error('Arrays must have equal length and at least 2 elements');
    }
    // Convert to ranks
    const xRanks = getRanks(xValues);
    const yRanks = getRanks(yValues);
    // Calculate Pearson correlation on ranks
    return calculatePearsonCorrelation(xRanks, yRanks);
}
/**
 * Convert values to ranks
 */
export function getRanks(values) {
    const indexed = values.map((value, index) => ({ value, index }));
    indexed.sort((a, b) => a.value - b.value);
    const ranks = new Array(values.length);
    for (let i = 0; i < indexed.length; i++) {
        ranks[indexed[i].index] = i + 1;
    }
    return ranks;
}
/**
 * Perform comprehensive correlation analysis
 */
export function analyzeCorrelation(xValues, yValues) {
    const pearson = calculatePearsonCorrelation(xValues, yValues);
    const spearman = calculateSpearmanCorrelation(xValues, yValues);
    // Calculate statistical significance (simplified)
    const n = xValues.length;
    const tStat = Math.abs(pearson) * Math.sqrt((n - 2) / (1 - pearson * pearson));
    const significance = 1 - (2 * normalCDF(-Math.abs(tStat))); // Two-tailed test
    // Determine correlation strength
    const absCorr = Math.abs(pearson);
    let strength;
    if (absCorr < 0.1)
        strength = 'very weak';
    else if (absCorr < 0.3)
        strength = 'weak';
    else if (absCorr < 0.5)
        strength = 'moderate';
    else if (absCorr < 0.7)
        strength = 'strong';
    else
        strength = 'very strong';
    return {
        pearsonCorrelation: Math.round(pearson * 1000) / 1000,
        spearmanCorrelation: Math.round(spearman * 1000) / 1000,
        significance: Math.round(significance * 1000) / 1000,
        strength
    };
}
/**
 * Perform linear regression analysis
 */
export function performLinearRegression(xValues, yValues) {
    if (xValues.length !== yValues.length || xValues.length < 2) {
        throw new Error('Arrays must have equal length and at least 2 elements');
    }
    const n = xValues.length;
    const sumX = xValues.reduce((sum, val) => sum + val, 0);
    const sumY = yValues.reduce((sum, val) => sum + val, 0);
    const sumXY = xValues.reduce((sum, val, i) => sum + val * yValues[i], 0);
    const sumXX = xValues.reduce((sum, val) => sum + val * val, 0);
    const sumYY = yValues.reduce((sum, val) => sum + val * val, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    // Calculate R-squared
    const yMean = sumY / n;
    const ssTotal = yValues.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const residuals = yValues.map((y, i) => y - (slope * xValues[i] + intercept));
    const ssResidual = residuals.reduce((sum, res) => sum + res * res, 0);
    const rSquared = 1 - (ssResidual / ssTotal);
    return {
        slope: Math.round(slope * 1000) / 1000,
        intercept: Math.round(intercept * 1000) / 1000,
        rSquared: Math.round(rSquared * 1000) / 1000,
        residuals
    };
}
/**
 * Analyze time series data for trends and patterns
 */
export function analyzeTimeSeries(values, timestamps) {
    if (values.length < 3) {
        throw new Error('Time series must have at least 3 data points');
    }
    // Use indices if no timestamps provided
    const xValues = timestamps || Array.from({ length: values.length }, (_, i) => i);
    // Trend analysis using linear regression
    const regression = performLinearRegression(xValues, values);
    let direction;
    if (Math.abs(regression.slope) < 0.01)
        direction = 'stable';
    else if (regression.slope > 0)
        direction = 'increasing';
    else
        direction = 'decreasing';
    // Simple seasonality detection (autocorrelation)
    const seasonality = detectSeasonality(values);
    // Change point detection (simplified)
    const changePoints = detectChangePoints(values);
    return {
        trend: {
            slope: regression.slope,
            intercept: regression.intercept,
            rSquared: regression.rSquared,
            direction
        },
        seasonality,
        changePoints
    };
}
/**
 * Detect seasonality in time series (simplified autocorrelation)
 */
function detectSeasonality(values) {
    const maxPeriod = Math.floor(values.length / 3);
    let bestPeriod = 0;
    let maxCorrelation = 0;
    for (let period = 2; period <= maxPeriod; period++) {
        const correlations = [];
        for (let offset = 0; offset < values.length - period; offset++) {
            const val1 = values[offset];
            const val2 = values[offset + period];
            correlations.push(val1 * val2);
        }
        if (correlations.length > 0) {
            const correlation = correlations.reduce((sum, val) => sum + val, 0) / correlations.length;
            if (Math.abs(correlation) > Math.abs(maxCorrelation)) {
                maxCorrelation = correlation;
                bestPeriod = period;
            }
        }
    }
    const detected = Math.abs(maxCorrelation) > 0.3; // Threshold for seasonality
    return {
        detected,
        period: detected ? bestPeriod : undefined,
        strength: detected ? Math.abs(maxCorrelation) : undefined
    };
}
/**
 * Detect change points in time series
 */
function detectChangePoints(values) {
    const changePoints = [];
    const windowSize = Math.max(3, Math.floor(values.length / 10));
    for (let i = windowSize; i < values.length - windowSize; i++) {
        const beforeMean = values.slice(i - windowSize, i)
            .reduce((sum, val) => sum + val, 0) / windowSize;
        const afterMean = values.slice(i, i + windowSize)
            .reduce((sum, val) => sum + val, 0) / windowSize;
        const difference = Math.abs(afterMean - beforeMean);
        const overall = calculateStatisticalSummary(values);
        const significance = difference / overall.standardDeviation;
        if (significance > 1.5) { // Threshold for significant change
            changePoints.push({
                index: i,
                significance: Math.round(significance * 100) / 100
            });
        }
    }
    return changePoints;
}
/**
 * Normal cumulative distribution function (approximation)
 */
function normalCDF(x) {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
}
/**
 * Calculate moving average
 */
export function calculateMovingAverage(values, windowSize) {
    if (windowSize <= 0 || windowSize > values.length) {
        throw new Error('Window size must be positive and not exceed array length');
    }
    const result = [];
    for (let i = 0; i <= values.length - windowSize; i++) {
        const window = values.slice(i, i + windowSize);
        const average = window.reduce((sum, val) => sum + val, 0) / windowSize;
        result.push(average);
    }
    return result;
}
/**
 * Calculate exponential moving average
 */
export function calculateExponentialMovingAverage(values, alpha) {
    if (alpha <= 0 || alpha > 1) {
        throw new Error('Alpha must be between 0 and 1');
    }
    const result = [values[0]];
    for (let i = 1; i < values.length; i++) {
        const ema = alpha * values[i] + (1 - alpha) * result[i - 1];
        result.push(ema);
    }
    return result;
}
/**
 * Normalize values to 0-100 scale
 */
export function normalizeToScale(values, min = 0, max = 100) {
    if (values.length === 0)
        return [];
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const range = dataMax - dataMin;
    if (range === 0)
        return values.map(() => min);
    return values.map(val => min + ((val - dataMin) / range) * (max - min));
}
/**
 * Calculate Z-scores for outlier detection
 */
export function calculateZScores(values) {
    const stats = calculateStatisticalSummary(values);
    return values.map(val => (val - stats.mean) / stats.standardDeviation);
}
/**
 * Detect outliers using Z-score method
 */
export function detectOutliers(values, threshold = 2.5) {
    const zScores = calculateZScores(values);
    const outliers = [];
    zScores.forEach((zScore, index) => {
        if (Math.abs(zScore) > threshold) {
            outliers.push({
                index,
                value: values[index],
                zScore: Math.round(zScore * 100) / 100
            });
        }
    });
    return outliers;
}
/**
 * Bootstrap confidence interval
 */
export function bootstrapConfidenceInterval(values, statistic, confidence = 0.95, iterations = 1000) {
    const bootstrapStats = [];
    for (let i = 0; i < iterations; i++) {
        // Bootstrap sample
        const sample = [];
        for (let j = 0; j < values.length; j++) {
            const randomIndex = Math.floor(Math.random() * values.length);
            sample.push(values[randomIndex]);
        }
        bootstrapStats.push(statistic(sample));
    }
    bootstrapStats.sort((a, b) => a - b);
    const alpha = 1 - confidence;
    const lowerIndex = Math.floor((alpha / 2) * iterations);
    const upperIndex = Math.floor((1 - alpha / 2) * iterations);
    return {
        lower: bootstrapStats[lowerIndex],
        upper: bootstrapStats[upperIndex],
        estimate: statistic(values)
    };
}
//# sourceMappingURL=statistics.js.map