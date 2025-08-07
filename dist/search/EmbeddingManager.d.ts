/**
 * Embedding Manager - Local embedding generation and management
 *
 * This module provides:
 * - Local embedding generation using sentence-transformers via ONNX
 * - Vector similarity calculations
 * - Embedding storage and retrieval
 * - Batch processing for efficiency
 * - Caching for performance
 */
import { DatabaseManager } from '../storage/Database.js';
export interface EmbeddingConfig {
    /** Model name for embedding generation */
    modelName: string;
    /** Embedding dimensions */
    dimensions: number;
    /** Maximum text length for embedding */
    maxLength: number;
    /** Whether to cache embeddings in memory */
    enableCache: boolean;
    /** Maximum cache size in MB */
    maxCacheSize: number;
    /** Cache directory for models */
    cacheDir?: string;
    /** Performance target for single embedding (ms) */
    performanceTarget: number;
}
export interface ModelLoadingProgress {
    /** Current step in the loading process */
    step: string;
    /** Progress percentage (0-100) */
    progress: number;
    /** Whether the step is complete */
    complete: boolean;
}
export interface EmbeddingResult {
    /** The text that was embedded */
    text: string;
    /** The generated embedding vector */
    embedding: number[];
    /** Processing time in milliseconds */
    processingTime: number;
}
export interface SimilarityResult {
    /** Message ID */
    messageId: string;
    /** Conversation ID */
    conversationId: string;
    /** Message content */
    content: string;
    /** Similarity score (0-1) */
    similarity: number;
    /** Created timestamp */
    createdAt: number;
}
/**
 * Local embedding manager using ONNX runtime for privacy-preserving semantic search
 */
export declare class EmbeddingManager {
    private dbManager;
    private config;
    private embeddingCache;
    private model;
    private isInitialized;
    private loadingProgress;
    private performanceMetrics;
    private circuitBreaker;
    private operationLock;
    private memoryManager;
    private readonly allowedModels;
    constructor(dbManager: DatabaseManager, config?: Partial<EmbeddingConfig>);
    /**
     * Initialize the embedding manager with the actual ONNX model
     */
    initialize(): Promise<void>;
    /**
     * Update loading progress
     */
    private updateProgress;
    /**
     * Warm up the model with test inference
     */
    private warmUpModel;
    /**
     * Generate embedding for a single text using the ONNX model
     */
    generateEmbedding(text: string): Promise<number[]>;
    /**
     * Update performance tracking metrics
     */
    private updatePerformanceMetrics;
    /**
     * Generate embeddings for multiple texts in batch
     * Uses optimized batch processing when possible
     */
    generateBatchEmbeddings(texts: string[]): Promise<number[][]>;
    /**
     * Store embedding for a message
     */
    storeEmbedding(messageId: string, embedding: number[]): Promise<void>;
    /**
     * Retrieve embedding for a message
     */
    getEmbedding(messageId: string): Promise<number[] | null>;
    /**
     * Generate embeddings for messages that don't have them (thread-safe)
     */
    processUnembeddedMessages(batchSize?: number): Promise<{
        processed: number;
        errors: number;
    }>;
    /**
     * Find similar messages using chunked vector similarity processing
     */
    findSimilarMessages(queryEmbedding: number[], options?: {
        limit?: number;
        threshold?: number;
        conversationId?: string;
        excludeMessageIds?: string[];
    }): Promise<SimilarityResult[]>;
    /**
     * Calculate cosine similarity between two vectors
     */
    cosineSimilarity(a: number[], b: number[]): number;
    /**
     * Get current loading progress
     */
    getLoadingProgress(): ModelLoadingProgress | null;
    /**
     * Get comprehensive embedding statistics
     */
    getEmbeddingStats(): Promise<{
        totalMessages: number;
        embeddedMessages: number;
        embeddingCoverage: number;
        averageEmbeddingTime: number;
        cacheSize: number;
        cacheMemoryUsage: number;
        cacheHitRate: number;
        performanceMetrics: {
            totalEmbeddings: number;
            totalTime: number;
            averageTime: number;
            targetTime: number;
            performanceRatio: number;
        };
        modelInfo: {
            modelName: string;
            dimensions: number;
            isInitialized: boolean;
            cacheDir: string | undefined;
        };
    }>;
    /**
     * Clear embedding cache
     */
    clearCache(): void;
    /**
     * Get cache statistics
     */
    getCacheStats(): {
        size: number;
        memoryUsage: number;
        maxSize: number;
        maxMemoryBytes: number;
    };
    /**
     * Get circuit breaker status
     */
    getCircuitBreakerStatus(): {
        state: string;
        isOpen: boolean;
    };
    /**
     * Get current configuration
     */
    getConfiguration(): EmbeddingConfig;
    /**
     * Update configuration
     */
    updateConfiguration(newConfig: Partial<EmbeddingConfig>): Promise<void>;
    /**
     * Normalize text for embedding with security validation
     */
    private normalizeText;
    /**
     * Generate secure cache key for text using crypto hash
     */
    private getCacheKey;
    /**
     * Load configuration from database
     */
    private loadConfiguration;
    /**
     * Test model functionality and performance
     */
    testModel(): Promise<{
        success: boolean;
        performance: number;
        dimensions: number;
        error?: string;
    }>;
    /**
     * Reset and reinitialize the model (useful for error recovery)
     */
    reset(): Promise<void>;
    /**
     * Check if the model is healthy and performing within target parameters
     */
    isModelHealthy(): boolean;
    /**
     * Generate embedding with circuit breaker and automatic fallback
     */
    generateEmbeddingWithFallback(text: string, maxRetries?: number): Promise<number[]>;
    /**
     * Cleanup resources and shutdown model
     */
    destroy(): void;
}
//# sourceMappingURL=EmbeddingManager.d.ts.map