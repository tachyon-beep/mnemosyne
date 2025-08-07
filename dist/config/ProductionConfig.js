/**
 * Production Configuration - Optimized settings for production deployment
 *
 * Provides configuration profiles for different deployment scenarios
 * with performance-optimized settings and monitoring capabilities.
 */
/**
 * Small deployment (single user, local desktop)
 */
export const SMALL_DEPLOYMENT_CONFIG = {
    environment: 'production',
    database: {
        databasePath: './conversations.db',
        enableWAL: true,
        enableForeignKeys: true,
        cacheSize: 4000, // 4MB
        readOnly: false,
        create: true,
        maxConnections: 3,
        minConnections: 1,
        enableQueryOptimization: true,
        walCheckpointInterval: 1000 // Every 1000 transactions
    },
    search: {
        embedding: {
            modelName: 'Xenova/all-MiniLM-L6-v2',
            dimensions: 384,
            maxLength: 512,
            enableCache: true,
            maxCacheSize: 25, // 25MB
            performanceTarget: 150, // More relaxed for single user
            cacheDir: './.cache/transformers'
        },
        queryCacheTTL: 300000, // 5 minutes
        maxQueryCacheSize: 500,
        enableResultCaching: true
    },
    monitoring: {
        enabled: true,
        metricsInterval: 60, // Every minute
        retentionHours: 12, // 12 hours retention
        enableAlerting: false, // No alerting for small deployments
        healthCheckInterval: 300 // Every 5 minutes
    },
    memory: {
        maxRssBytes: 512 * 1024 * 1024, // 512MB
        heapWarningThreshold: 0.75,
        gcThreshold: 0.8,
        monitoringInterval: 60 // Every minute
    },
    logging: {
        level: 'info',
        enablePerformanceLogging: false,
        logSlowQueries: true,
        slowQueryThreshold: 500 // 500ms
    }
};
/**
 * Medium deployment (team usage, shared server)
 */
export const MEDIUM_DEPLOYMENT_CONFIG = {
    environment: 'production',
    database: {
        databasePath: './conversations.db',
        enableWAL: true,
        enableForeignKeys: true,
        cacheSize: 16000, // 16MB
        readOnly: false,
        create: true,
        maxConnections: 8,
        minConnections: 2,
        enableQueryOptimization: true,
        walCheckpointInterval: 2000
    },
    search: {
        embedding: {
            modelName: 'Xenova/all-MiniLM-L6-v2',
            dimensions: 384,
            maxLength: 512,
            enableCache: true,
            maxCacheSize: 100, // 100MB
            performanceTarget: 100,
            cacheDir: './.cache/transformers'
        },
        queryCacheTTL: 600000, // 10 minutes
        maxQueryCacheSize: 2000,
        enableResultCaching: true
    },
    monitoring: {
        enabled: true,
        metricsInterval: 30, // Every 30 seconds
        retentionHours: 24, // 24 hours retention
        enableAlerting: true,
        healthCheckInterval: 120 // Every 2 minutes
    },
    memory: {
        maxRssBytes: 1024 * 1024 * 1024, // 1GB
        heapWarningThreshold: 0.7,
        gcThreshold: 0.75,
        monitoringInterval: 30 // Every 30 seconds
    },
    logging: {
        level: 'info',
        enablePerformanceLogging: true,
        logSlowQueries: true,
        slowQueryThreshold: 200 // 200ms
    }
};
/**
 * Large deployment (enterprise usage, high concurrency)
 */
export const LARGE_DEPLOYMENT_CONFIG = {
    environment: 'production',
    database: {
        databasePath: './conversations.db',
        enableWAL: true,
        enableForeignKeys: true,
        cacheSize: 64000, // 64MB
        readOnly: false,
        create: true,
        maxConnections: 20,
        minConnections: 5,
        enableQueryOptimization: true,
        walCheckpointInterval: 5000
    },
    search: {
        embedding: {
            modelName: 'Xenova/all-mpnet-base-v2', // Higher quality model
            dimensions: 768,
            maxLength: 512,
            enableCache: true,
            maxCacheSize: 200, // 200MB
            performanceTarget: 75, // Stricter performance target
            cacheDir: './.cache/transformers'
        },
        queryCacheTTL: 900000, // 15 minutes
        maxQueryCacheSize: 5000,
        enableResultCaching: true
    },
    monitoring: {
        enabled: true,
        metricsInterval: 15, // Every 15 seconds
        retentionHours: 72, // 3 days retention
        enableAlerting: true,
        healthCheckInterval: 60 // Every minute
    },
    memory: {
        maxRssBytes: 2048 * 1024 * 1024, // 2GB
        heapWarningThreshold: 0.6,
        gcThreshold: 0.7,
        monitoringInterval: 15 // Every 15 seconds
    },
    logging: {
        level: 'warn',
        enablePerformanceLogging: true,
        logSlowQueries: true,
        slowQueryThreshold: 100 // 100ms
    }
};
/**
 * Development configuration
 */
export const DEVELOPMENT_CONFIG = {
    environment: 'development',
    database: {
        databasePath: ':memory:', // In-memory for development
        enableWAL: false, // WAL not needed for memory DB
        enableForeignKeys: true,
        cacheSize: 1000,
        readOnly: false,
        create: true,
        maxConnections: 2,
        minConnections: 1,
        enableQueryOptimization: false, // Disable for easier debugging
        walCheckpointInterval: 1000
    },
    search: {
        embedding: {
            modelName: 'Xenova/all-MiniLM-L6-v2',
            dimensions: 384,
            maxLength: 256, // Shorter for faster dev testing
            enableCache: true,
            maxCacheSize: 10, // 10MB
            performanceTarget: 500, // Very relaxed for development
            cacheDir: './.cache/transformers'
        },
        queryCacheTTL: 60000, // 1 minute (shorter for testing)
        maxQueryCacheSize: 100,
        enableResultCaching: false // Disable caching for development
    },
    monitoring: {
        enabled: false, // Disable monitoring in development
        metricsInterval: 300,
        retentionHours: 1,
        enableAlerting: false,
        healthCheckInterval: 600
    },
    memory: {
        maxRssBytes: 256 * 1024 * 1024, // 256MB
        heapWarningThreshold: 0.9, // Very high threshold
        gcThreshold: 0.95,
        monitoringInterval: 300
    },
    logging: {
        level: 'debug',
        enablePerformanceLogging: true,
        logSlowQueries: true,
        slowQueryThreshold: 50 // 50ms (very sensitive for development)
    }
};
/**
 * Configuration selector based on environment variables or deployment size
 */
export function getProductionConfig() {
    const env = process.env.NODE_ENV || 'development';
    const deploymentSize = process.env.DEPLOYMENT_SIZE || 'small';
    if (env === 'development') {
        return DEVELOPMENT_CONFIG;
    }
    switch (deploymentSize.toLowerCase()) {
        case 'small':
            return SMALL_DEPLOYMENT_CONFIG;
        case 'medium':
            return MEDIUM_DEPLOYMENT_CONFIG;
        case 'large':
            return LARGE_DEPLOYMENT_CONFIG;
        default:
            console.warn(`Unknown deployment size: ${deploymentSize}, using small config`);
            return SMALL_DEPLOYMENT_CONFIG;
    }
}
/**
 * Validate configuration against system resources
 */
export function validateConfiguration(config) {
    const warnings = [];
    const recommendations = [];
    let isValid = true;
    // Check available memory
    const totalMemory = require('os').totalmem();
    const configuredMemory = config.memory.maxRssBytes;
    if (configuredMemory > totalMemory * 0.8) {
        warnings.push(`Configured memory limit (${Math.round(configuredMemory / 1024 / 1024)}MB) exceeds 80% of system memory`);
        recommendations.push('Reduce maxRssBytes or increase system memory');
    }
    // Check database cache size vs available memory
    const dbCacheBytes = (config.database.cacheSize || 0) * 1024; // cacheSize is in KB
    if (dbCacheBytes > configuredMemory * 0.3) {
        warnings.push('Database cache size is very large relative to memory limit');
        recommendations.push('Consider reducing database cache size');
    }
    // Check embedding cache vs memory
    const embeddingCacheBytes = config.search.embedding.maxCacheSize * 1024 * 1024;
    if (embeddingCacheBytes > configuredMemory * 0.4) {
        warnings.push('Embedding cache size is large relative to memory limit');
        recommendations.push('Consider reducing embedding cache size');
    }
    // Check performance targets vs deployment size
    if (config.search.embedding.performanceTarget < 50 && config.database.maxConnections > 10) {
        warnings.push('Aggressive performance targets with high concurrency may cause resource contention');
        recommendations.push('Consider relaxing performance targets or reducing connection count');
    }
    // Check monitoring overhead
    if (config.monitoring.enabled && config.monitoring.metricsInterval < 15) {
        warnings.push('Very frequent metrics collection may impact performance');
        recommendations.push('Consider increasing metrics collection interval');
    }
    return {
        isValid,
        warnings,
        recommendations
    };
}
/**
 * Apply runtime optimizations based on current system state
 */
export function applyRuntimeOptimizations(config) {
    const optimizedConfig = { ...config };
    // Adjust memory settings based on available memory
    const totalMemory = require('os').totalmem();
    const availableMemory = totalMemory - process.memoryUsage().rss;
    // If available memory is low, reduce cache sizes
    if (availableMemory < optimizedConfig.memory.maxRssBytes * 0.5) {
        optimizedConfig.search.embedding.maxCacheSize = Math.floor(optimizedConfig.search.embedding.maxCacheSize * 0.7);
        optimizedConfig.database.cacheSize = Math.floor((optimizedConfig.database.cacheSize || 0) * 0.8);
        console.log('Applied memory-constrained optimizations');
    }
    // Adjust performance targets based on CPU count
    const cpuCount = require('os').cpus().length;
    if (cpuCount <= 2) {
        // Relax performance targets on low-CPU systems
        optimizedConfig.search.embedding.performanceTarget = Math.max(optimizedConfig.search.embedding.performanceTarget * 1.5, 200);
    }
    return optimizedConfig;
}
/**
 * Generate startup report with configuration summary
 */
export function generateStartupReport(config) {
    const validation = validateConfiguration(config);
    let report = '=== MCP Persistence Server Configuration ===\n\n';
    report += `Environment: ${config.environment}\n`;
    report += `Database: ${config.database.databasePath}\n`;
    report += `Max Connections: ${config.database.maxConnections}\n`;
    report += `Database Cache: ${Math.round((config.database.cacheSize || 0) / 1024)}MB\n`;
    report += `Embedding Model: ${config.search.embedding.modelName}\n`;
    report += `Embedding Cache: ${config.search.embedding.maxCacheSize}MB\n`;
    report += `Memory Limit: ${Math.round(config.memory.maxRssBytes / 1024 / 1024)}MB\n`;
    report += `Monitoring: ${config.monitoring.enabled ? 'Enabled' : 'Disabled'}\n\n`;
    if (validation.warnings.length > 0) {
        report += 'Warnings:\n';
        validation.warnings.forEach(warning => report += `  - ${warning}\n`);
        report += '\n';
    }
    if (validation.recommendations.length > 0) {
        report += 'Recommendations:\n';
        validation.recommendations.forEach(rec => report += `  - ${rec}\n`);
        report += '\n';
    }
    report += 'Configuration validated successfully.\n';
    return report;
}
//# sourceMappingURL=ProductionConfig.js.map