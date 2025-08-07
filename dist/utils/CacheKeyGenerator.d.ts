/**
 * Enhanced Cache Key Generator with Content-Based Hashing
 *
 * Provides collision-resistant cache key generation using cryptographic hashing
 * and consistent key normalization for reliable cache operations.
 */
export interface CacheKeyOptions {
    /** Include timestamp in hash to prevent temporal collisions */
    includeTimestamp?: boolean;
    /** Algorithm to use for hashing ('sha256' | 'sha1' | 'md5') */
    algorithm?: 'sha256' | 'sha1' | 'md5';
    /** Prefix for the cache key */
    prefix?: string;
    /** Maximum key length (will truncate if needed) */
    maxLength?: number;
    /** Custom salt for additional uniqueness */
    salt?: string;
}
export interface NormalizedParams {
    /** Normalized parameters in consistent order */
    params: Record<string, any>;
    /** Original parameters for reference */
    original: Record<string, any>;
    /** Hash of the normalized parameters */
    hash: string;
}
/**
 * Enhanced cache key generator with collision resistance
 */
export declare class CacheKeyGenerator {
    private static readonly DEFAULT_ALGORITHM;
    private static readonly DEFAULT_MAX_LENGTH;
    private static readonly PARAM_SEPARATOR;
    private static readonly NESTED_SEPARATOR;
    /**
     * Generate a collision-resistant cache key using content-based hashing
     */
    static generateKey(operation: string, params?: Record<string, any>, options?: CacheKeyOptions): string;
    /**
     * Generate key for query operations with parameter consistency
     */
    static generateQueryKey(queryId: string, sql: string, params?: Record<string, any>, options?: CacheKeyOptions): string;
    /**
     * Generate key for analytics operations
     */
    static generateAnalyticsKey(operation: string, datasetId: string | number, options?: CacheKeyOptions & {
        /** Additional context for the operation */
        context?: Record<string, any>;
        /** Data size indicator for cache sizing */
        dataSize?: number;
    }): string;
    /**
     * Generate key for conversation-based operations
     */
    static generateConversationKey(operation: string, conversationIds: string[], messageCount?: number, options?: CacheKeyOptions): string;
    /**
     * Generate key with content hash for large objects
     */
    static generateContentKey(operation: string, content: any, options?: CacheKeyOptions): string;
    /**
     * Normalize parameters for consistent hashing
     */
    static normalizeParams(params: Record<string, any>): NormalizedParams;
    /**
     * Validate cache key for potential collisions or issues
     */
    static validateKey(key: string): {
        valid: boolean;
        issues: string[];
        recommendations: string[];
    };
    /**
     * Extract operation info from cache key
     */
    static parseKey(key: string): {
        prefix?: string;
        operation?: string;
        hash?: string;
        valid: boolean;
    };
    /**
     * Deep normalize object with consistent ordering and type handling
     */
    private static deepNormalizeObject;
    /**
     * Normalize SQL for consistent caching
     */
    private static normalizeSql;
    /**
     * Generate content hash with collision resistance
     */
    private static hashContent;
}
/**
 * Static utility functions for common cache key patterns
 */
export declare class CacheKeys {
    /**
     * Generate key for flow analysis operations
     */
    static flowAnalysis(conversations: Array<{
        conversation: {
            id: string;
        };
    }>): string;
    /**
     * Generate key for productivity analysis
     */
    static productivityAnalysis(conversations: Array<{
        conversation: {
            id: string;
        };
    }>): string;
    /**
     * Generate key for knowledge gap detection
     */
    static knowledgeGapDetection(conversations: Array<{
        conversation: {
            id: string;
        };
    }>): string;
    /**
     * Generate key for decision tracking
     */
    static decisionTracking(conversations: Array<{
        conversation: {
            id: string;
        };
    }>): string;
    /**
     * Generate key for topic extraction with memoization
     */
    static topicExtraction(messageContent: string): string;
}
//# sourceMappingURL=CacheKeyGenerator.d.ts.map