/**
 * System Capability Profiler
 *
 * Automatically detects and profiles system capabilities including:
 * - CPU performance and characteristics
 * - Memory capacity and bandwidth
 * - Disk I/O performance
 * - Network capabilities
 * - Runtime environment characteristics
 *
 * Uses this information to automatically adjust system limits and thresholds.
 */
import { EventEmitter } from 'events';
interface CPUProfile {
    cores: number;
    logicalCores: number;
    baseFrequency: number;
    maxFrequency?: number;
    architecture: string;
    vendor: string;
    model: string;
    cacheSize?: {
        l1: number;
        l2: number;
        l3: number;
    };
    performanceScore: number;
}
interface MemoryProfile {
    totalMemory: number;
    availableMemory: number;
    swapTotal: number;
    swapFree: number;
    bandwidth: number;
    latency: number;
    recommendedHeapSize: number;
    recommendedCacheSize: number;
}
interface DiskProfile {
    type: 'HDD' | 'SSD' | 'NVME' | 'Unknown';
    capacity: number;
    available: number;
    readSpeed: number;
    writeSpeed: number;
    randomIOPS: number;
    latency: number;
}
interface NetworkProfile {
    interfaces: Array<{
        name: string;
        type: 'ethernet' | 'wifi' | 'loopback' | 'other';
        speed?: number;
        mtu: number;
        isActive: boolean;
    }>;
    estimatedBandwidth: number;
    latencyToInternet: number;
}
interface RuntimeProfile {
    nodeVersion: string;
    v8Version: string;
    platform: string;
    architecture: string;
    endianness: 'BE' | 'LE';
    maxHeapSize: number;
    gcType: string;
    jitSupport: boolean;
    workerThreadSupport: boolean;
}
interface SystemCapabilityProfile {
    cpu: CPUProfile;
    memory: MemoryProfile;
    disk: DiskProfile;
    network: NetworkProfile;
    runtime: RuntimeProfile;
    timestamp: number;
    profileVersion: string;
    overallPerformanceClass: 'low' | 'medium' | 'high' | 'exceptional';
    recommendedLimits: {
        maxConcurrentQueries: number;
        maxCacheSize: number;
        maxMemoryUsage: number;
        queryTimeout: number;
        indexBuildParallelism: number;
    };
}
interface BenchmarkResult {
    test: string;
    score: number;
    unit: string;
    duration: number;
    iterations: number;
}
export declare class SystemCapabilityProfiler extends EventEmitter {
    private readonly cacheFile;
    private profile;
    private benchmarkResults;
    private isProfiled;
    private readonly BENCHMARK_TIMEOUT;
    private readonly CACHE_DURATION;
    constructor(cacheFile?: string);
    /**
     * Run complete system profiling
     */
    profileSystem(): Promise<SystemCapabilityProfile>;
    /**
     * Profile CPU characteristics and performance
     */
    private profileCPU;
    /**
     * Profile memory characteristics
     */
    private profileMemory;
    /**
     * Profile disk I/O performance
     */
    private profileDisk;
    /**
     * Profile network capabilities
     */
    private profileNetwork;
    /**
     * Profile Node.js runtime characteristics
     */
    private profileRuntime;
    /**
     * Run CPU performance benchmark
     */
    private runCPUBenchmark;
    /**
     * Run memory performance benchmark
     */
    private runMemoryBenchmark;
    /**
     * Run disk I/O benchmark
     */
    private runDiskBenchmark;
    /**
     * Measure network latency
     */
    private pingLatency;
    /**
     * Extract CPU vendor from model string
     */
    private extractCPUVendor;
    /**
     * Calculate CPU performance score
     */
    private calculateCPUScore;
    /**
     * Calculate overall performance class
     */
    private calculatePerformanceClass;
    /**
     * Calculate recommended system limits based on capabilities
     */
    private calculateRecommendedLimits;
    /**
     * Load cached profile from disk
     */
    private loadCachedProfile;
    /**
     * Save profile to disk cache
     */
    private saveCachedProfile;
    /**
     * Get current system profile
     */
    getProfile(): SystemCapabilityProfile | null;
    /**
     * Get performance-adjusted configuration
     */
    getPerformanceConfig(): any;
    /**
     * Force re-profiling (ignores cache)
     */
    forceReprofile(): Promise<SystemCapabilityProfile>;
    /**
     * Get benchmark results
     */
    getBenchmarkResults(): Map<string, BenchmarkResult>;
}
export {};
//# sourceMappingURL=SystemCapabilityProfiler.d.ts.map