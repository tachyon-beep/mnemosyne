/**
 * Production Configuration - Optimized settings for production deployment
 *
 * Provides configuration profiles for different deployment scenarios
 * with performance-optimized settings and monitoring capabilities.
 */
import { EmbeddingConfig } from '../search/EmbeddingManager.js';
import { DatabaseOptions } from '../storage/Database.js';
export interface ProductionConfig {
    environment: 'development' | 'production' | 'staging';
    database: DatabaseOptions & {
        /** Connection pool size */
        maxConnections: number;
        minConnections: number;
        /** Enable query optimization */
        enableQueryOptimization: boolean;
        /** Checkpoint interval (WAL) */
        walCheckpointInterval: number;
    };
    search: {
        embedding: EmbeddingConfig;
        /** Query result cache TTL in ms */
        queryCacheTTL: number;
        /** Maximum query cache size */
        maxQueryCacheSize: number;
        /** Enable search result caching */
        enableResultCaching: boolean;
    };
    monitoring: {
        /** Enable performance monitoring */
        enabled: boolean;
        /** Metrics collection interval in seconds */
        metricsInterval: number;
        /** Metrics retention period in hours */
        retentionHours: number;
        /** Enable alerting */
        enableAlerting: boolean;
        /** Health check interval in seconds */
        healthCheckInterval: number;
    };
    memory: {
        /** Maximum RSS in bytes */
        maxRssBytes: number;
        /** Heap warning threshold (0-1) */
        heapWarningThreshold: number;
        /** Force GC threshold (0-1) */
        gcThreshold: number;
        /** Memory monitoring interval in seconds */
        monitoringInterval: number;
    };
    logging: {
        level: 'error' | 'warn' | 'info' | 'debug';
        enablePerformanceLogging: boolean;
        logSlowQueries: boolean;
        slowQueryThreshold: number;
    };
}
/**
 * Small deployment (single user, local desktop)
 */
export declare const SMALL_DEPLOYMENT_CONFIG: ProductionConfig;
/**
 * Medium deployment (team usage, shared server)
 */
export declare const MEDIUM_DEPLOYMENT_CONFIG: ProductionConfig;
/**
 * Large deployment (enterprise usage, high concurrency)
 */
export declare const LARGE_DEPLOYMENT_CONFIG: ProductionConfig;
/**
 * Development configuration
 */
export declare const DEVELOPMENT_CONFIG: ProductionConfig;
/**
 * Configuration selector based on environment variables or deployment size
 */
export declare function getProductionConfig(): ProductionConfig;
/**
 * Validate configuration against system resources
 */
export declare function validateConfiguration(config: ProductionConfig): {
    isValid: boolean;
    warnings: string[];
    recommendations: string[];
};
/**
 * Apply runtime optimizations based on current system state
 */
export declare function applyRuntimeOptimizations(config: ProductionConfig): ProductionConfig;
/**
 * Generate startup report with configuration summary
 */
export declare function generateStartupReport(config: ProductionConfig): string;
//# sourceMappingURL=ProductionConfig.d.ts.map