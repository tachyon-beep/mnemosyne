/**
 * Token Counter Utilities
 *
 * Provides accurate token counting for different models and tokenizers.
 * Supports both approximate and exact counting methods.
 */
import { Message } from '../types/interfaces.js';
/**
 * Token counting result
 */
export interface TokenCount {
    count: number;
    model: string;
    method: 'exact' | 'approximate';
    breakdown?: {
        messages: number;
        metadata: number;
        formatting: number;
    };
}
/**
 * Token counting configuration
 */
export interface TokenCounterConfig {
    model: string;
    includeMetadata?: boolean;
    includeFormatting?: boolean;
    approximationFactor?: number;
}
/**
 * Model-specific token counting constants
 */
declare const MODEL_CONFIGS: {
    'gpt-3.5-turbo': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    'gpt-4': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    'gpt-4-turbo': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    'claude-3-haiku': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    'claude-3-sonnet': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    'claude-3-opus': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    'llama2:7b': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    'llama2:13b': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    'mistral:7b': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    'codellama:7b': {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
    default: {
        avgCharsPerToken: number;
        formattingOverhead: number;
        metadataOverhead: number;
    };
};
/**
 * Token counter class
 */
export declare class TokenCounter {
    private config;
    private modelConfig;
    constructor(config: TokenCounterConfig);
    /**
     * Count tokens in a text string
     */
    countText(text: string): TokenCount;
    /**
     * Count tokens in messages
     */
    countMessages(messages: Message[]): TokenCount;
    /**
     * Count tokens in conversation summary format
     */
    countSummaryFormat(messages: Message[], level: 'brief' | 'standard' | 'detailed'): TokenCount;
    /**
     * Estimate output tokens for summary generation
     */
    estimateOutputTokens(inputTokens: number, level: 'brief' | 'standard' | 'detailed'): number;
    /**
     * Calculate token budget for context assembly
     */
    calculateTokenBudget(maxTokens: number, summaryRatio?: number): {
        summaries: number;
        details: number;
        metadata: number;
        buffer: number;
    };
    /**
     * Chunk text to fit within token limits
     */
    chunkText(text: string, maxTokensPerChunk: number, overlap?: number): string[];
    /**
     * Format messages for summary generation
     */
    private formatMessagesForSummary;
    /**
     * Get model configuration
     */
    getModelConfig(): typeof MODEL_CONFIGS['default'];
    /**
     * Update configuration
     */
    updateConfig(updates: Partial<TokenCounterConfig>): void;
}
/**
 * Utility functions
 */
/**
 * Create a token counter for a specific model
 */
export declare function createTokenCounter(model: string, options?: Partial<TokenCounterConfig>): TokenCounter;
/**
 * Quick token count for text
 */
export declare function countTokens(text: string, model?: string): number;
/**
 * Quick token count for messages
 */
export declare function countMessageTokens(messages: Message[], model?: string): number;
/**
 * Validate token count against limits
 */
export declare function validateTokenCount(count: number, maxTokens: number, buffer?: number): {
    valid: boolean;
    availableTokens: number;
    exceedsBy?: number;
};
/**
 * Model registry for easy access
 */
export declare const SUPPORTED_MODELS: string[];
/**
 * Check if a model is supported
 */
export declare function isModelSupported(model: string): boolean;
/**
 * Get default model configuration
 */
export declare function getModelConfig(model: string): typeof MODEL_CONFIGS['default'];
export {};
//# sourceMappingURL=TokenCounter.d.ts.map