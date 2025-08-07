/**
 * Advanced Size Estimation Utilities
 *
 * Provides accurate memory size calculation for JavaScript objects,
 * accounting for object overhead, circular references, and complex structures.
 */
export interface SizeEstimate {
    /** Total estimated size in bytes */
    totalBytes: number;
    /** Breakdown by data type */
    breakdown: {
        primitives: number;
        objects: number;
        arrays: number;
        strings: number;
        functions: number;
        overhead: number;
    };
    /** Detailed analysis */
    analysis: {
        objectCount: number;
        arrayCount: number;
        stringCount: number;
        circularReferences: number;
        maxDepth: number;
        averageKeyLength: number;
    };
}
export interface SizeOptions {
    /** Include object overhead in calculations */
    includeOverhead?: boolean;
    /** Maximum depth to traverse (prevents infinite recursion) */
    maxDepth?: number;
    /** Include function sizes */
    includeFunctions?: boolean;
    /** Use precise string size calculation */
    preciseStrings?: boolean;
    /** Account for V8 internal structures */
    includeV8Overhead?: boolean;
}
/**
 * Advanced size estimator with object overhead calculation
 */
export declare class SizeEstimator {
    private static readonly DEFAULT_OPTIONS;
    private static readonly V8_OVERHEAD;
    /**
     * Estimate the memory size of a JavaScript value
     */
    static estimate(value: any, options?: SizeOptions): SizeEstimate;
    /**
     * Quick size estimate for cache operations
     */
    static quickEstimate(value: any): number;
    /**
     * Compare size estimates for cache efficiency analysis
     */
    static compareEstimates(estimate1: SizeEstimate, estimate2: SizeEstimate): {
        sizeDifference: number;
        percentageDifference: number;
        moreEfficient: 'first' | 'second' | 'equal';
        recommendations: string[];
    };
    /**
     * Estimate size with caching for repeated structures
     */
    static estimateWithCache(value: any, cache?: Map<any, number>, options?: SizeOptions): number;
    /**
     * Monitor size trends over time
     */
    static createSizeMonitor(): {
        record: (key: string, value: any) => void;
        getStats: () => {
            averageSize: number;
            maxSize: number;
            minSize: number;
            totalSamples: number;
            sizeByKey: Map<string, number[]>;
            trends: Array<{
                key: string;
                trend: 'growing' | 'shrinking' | 'stable';
            }>;
        };
        clear: () => void;
    };
    /**
     * Estimate value size recursively
     */
    private static estimateValue;
    /**
     * Estimate string size with encoding considerations
     */
    private static estimateString;
    /**
     * Estimate function size
     */
    private static estimateFunction;
    /**
     * Estimate object size with circular reference detection
     */
    private static estimateObject;
    /**
     * Estimate array size
     */
    private static estimateArray;
    /**
     * Estimate Map size
     */
    private static estimateMap;
    /**
     * Estimate Set size
     */
    private static estimateSet;
    /**
     * Get accurate string size in bytes
     */
    private static getStringSize;
    /**
     * Simplified estimation for quick operations
     */
    private static simplifiedEstimate;
}
/**
 * Utility functions for common size operations
 */
export declare class SizeUtils {
    /**
     * Format bytes in human-readable format
     */
    static formatBytes(bytes: number): string;
    /**
     * Check if size is within reasonable cache limits
     */
    static isReasonableCacheSize(bytes: number, maxBytes?: number): boolean;
    /**
     * Calculate cache efficiency ratio
     */
    static calculateCacheEfficiency(dataSize: number, cacheSize: number): number;
    /**
     * Estimate serialization overhead
     */
    static estimateSerializationOverhead(value: any): number;
}
//# sourceMappingURL=SizeEstimator.d.ts.map