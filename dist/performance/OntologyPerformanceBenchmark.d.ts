/**
 * Ontology Performance Benchmark Suite
 *
 * Comprehensive performance testing framework to evaluate the impact of
 * ontological enhancements on the MCP Persistence System.
 *
 * Tests performance across different scales and ontological approaches:
 * - Current pragmatic approach
 * - Formal ontological foundations
 * - Enhanced pragmatic approach
 */
import { DatabaseManager } from '../storage/Database.js';
interface BenchmarkResult {
    operation: string;
    approach: 'current' | 'formal' | 'enhanced';
    scale: 'small' | 'medium' | 'large';
    executionTimeMs: number;
    memoryUsageMB: number;
    queriesExecuted: number;
    cacheHitRate: number;
    errorCount: number;
}
export interface BenchmarkConfig {
    /** Number of warm-up runs before actual benchmarking */
    warmupRuns?: number;
    /** Number of iterations for each test */
    iterations?: number;
    /** Timeout for individual operations (ms) */
    timeout?: number;
    /** Enable verbose logging */
    verbose?: boolean;
    /** Output format for results */
    outputFormat?: 'json' | 'markdown' | 'csv';
    /** Scales to test */
    scales?: Array<'small' | 'medium' | 'large'>;
    /** Enable memory profiling */
    profileMemory?: boolean;
    /** Enable concurrency testing */
    testConcurrency?: boolean;
}
/**
 * Performance benchmark suite for ontological enhancements
 */
export declare class OntologyPerformanceBenchmark {
    private databaseManager;
    private knowledgeGraphService;
    private results;
    private performanceThresholds;
    private config;
    constructor(databaseManager: DatabaseManager, config?: BenchmarkConfig);
    /**
     * Run warm-up iterations to stabilize performance
     */
    private runWarmUp;
    /**
     * Run comprehensive benchmark suite
     */
    runBenchmarks(): Promise<{
        results: BenchmarkResult[];
        summary: {
            passedTests: number;
            failedTests: number;
            performanceRegression: number;
            recommendations: string[];
        };
    }>;
    /**
     * Benchmark current pragmatic approach
     */
    private benchmarkCurrentApproach;
    /**
     * Simulate formal ontology approach with validation overhead
     */
    private benchmarkFormalOntologyApproach;
    /**
     * Benchmark enhanced pragmatic approach
     */
    private benchmarkEnhancedPragmaticApproach;
    /**
     * Benchmark concurrent operations
     */
    private benchmarkConcurrency;
    /**
     * Simulate MCP tool operation
     */
    private simulateMCPToolOperation;
    /**
     * Simulate type hierarchy validation overhead
     */
    private simulateTypeHierarchyValidation;
    /**
     * Simulate domain/range validation overhead
     */
    private simulateDomainRangeValidation;
    /**
     * Simulate ontology validation overhead
     */
    private simulateOntologyValidation;
    /**
     * Generic benchmark operation wrapper
     */
    private benchmarkOperation;
    /**
     * Get scale configuration
     */
    private getScaleConfig;
    /**
     * Setup test data for benchmarking
     */
    private setupTestData;
    /**
     * Cleanup test data
     */
    private cleanupTestData;
    /**
     * Initialize test database
     */
    private initializeTestDatabase;
    /**
     * Cleanup test database
     */
    private cleanupTestDatabase;
    /**
     * Generate performance summary and recommendations
     */
    private generateSummary;
    /**
     * Export results for analysis
     */
    exportResults(): string;
}
export {};
//# sourceMappingURL=OntologyPerformanceBenchmark.d.ts.map