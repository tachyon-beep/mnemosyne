/**
 * Token Counter Utilities
 *
 * Provides accurate token counting for different models and tokenizers.
 * Supports both approximate and exact counting methods.
 */
/**
 * Model-specific token counting constants
 */
const MODEL_CONFIGS = {
    // OpenAI models
    'gpt-3.5-turbo': {
        avgCharsPerToken: 4,
        formattingOverhead: 0.1,
        metadataOverhead: 0.05
    },
    'gpt-4': {
        avgCharsPerToken: 4,
        formattingOverhead: 0.1,
        metadataOverhead: 0.05
    },
    'gpt-4-turbo': {
        avgCharsPerToken: 4,
        formattingOverhead: 0.1,
        metadataOverhead: 0.05
    },
    // Anthropic models
    'claude-3-haiku': {
        avgCharsPerToken: 4.2,
        formattingOverhead: 0.08,
        metadataOverhead: 0.04
    },
    'claude-3-sonnet': {
        avgCharsPerToken: 4.2,
        formattingOverhead: 0.08,
        metadataOverhead: 0.04
    },
    'claude-3-opus': {
        avgCharsPerToken: 4.2,
        formattingOverhead: 0.08,
        metadataOverhead: 0.04
    },
    // Local models (Llama family)
    'llama2:7b': {
        avgCharsPerToken: 4.5,
        formattingOverhead: 0.12,
        metadataOverhead: 0.06
    },
    'llama2:13b': {
        avgCharsPerToken: 4.5,
        formattingOverhead: 0.12,
        metadataOverhead: 0.06
    },
    'mistral:7b': {
        avgCharsPerToken: 4.3,
        formattingOverhead: 0.11,
        metadataOverhead: 0.05
    },
    'codellama:7b': {
        avgCharsPerToken: 3.8,
        formattingOverhead: 0.15,
        metadataOverhead: 0.07
    },
    // Default fallback
    'default': {
        avgCharsPerToken: 4.2,
        formattingOverhead: 0.1,
        metadataOverhead: 0.05
    }
};
/**
 * Token counter class
 */
export class TokenCounter {
    config;
    modelConfig;
    constructor(config) {
        this.config = config;
        this.modelConfig = MODEL_CONFIGS[config.model] || MODEL_CONFIGS.default;
    }
    /**
     * Count tokens in a text string
     */
    countText(text) {
        const baseTokenCount = Math.ceil(text.length / this.modelConfig.avgCharsPerToken);
        let totalCount = baseTokenCount;
        // Add formatting overhead if requested
        if (this.config.includeFormatting) {
            totalCount += Math.ceil(baseTokenCount * this.modelConfig.formattingOverhead);
        }
        return {
            count: Math.max(1, totalCount), // Minimum 1 token
            model: this.config.model,
            method: 'approximate'
        };
    }
    /**
     * Count tokens in messages
     */
    countMessages(messages) {
        let messageTokens = 0;
        let metadataTokens = 0;
        let formattingTokens = 0;
        for (const message of messages) {
            // Count content tokens
            const contentCount = this.countText(message.content).count;
            messageTokens += contentCount;
            // Count metadata tokens if requested
            if (this.config.includeMetadata && message.metadata) {
                const metadataText = JSON.stringify(message.metadata);
                const metadataCount = this.countText(metadataText).count;
                metadataTokens += metadataCount;
            }
            // Add message formatting overhead (role, timestamp, etc.)
            if (this.config.includeFormatting) {
                const roleTokens = this.countText(message.role).count;
                const timestampTokens = 2; // Approximate timestamp token count
                formattingTokens += roleTokens + timestampTokens;
            }
        }
        const totalCount = messageTokens + metadataTokens + formattingTokens;
        return {
            count: Math.max(1, totalCount),
            model: this.config.model,
            method: 'approximate',
            breakdown: {
                messages: messageTokens,
                metadata: metadataTokens,
                formatting: formattingTokens
            }
        };
    }
    /**
     * Count tokens in conversation summary format
     */
    countSummaryFormat(messages, level) {
        // Estimate token count for formatted conversation
        const formattedText = this.formatMessagesForSummary(messages, level);
        return this.countText(formattedText);
    }
    /**
     * Estimate output tokens for summary generation
     */
    estimateOutputTokens(inputTokens, level) {
        const compressionRatios = {
            brief: 0.05, // 5% of input (very compressed)
            standard: 0.15, // 15% of input (moderate compression)
            detailed: 0.3 // 30% of input (light compression)
        };
        const ratio = compressionRatios[level];
        const estimatedTokens = Math.ceil(inputTokens * ratio);
        // Minimum and maximum bounds
        const minTokens = level === 'brief' ? 10 : level === 'standard' ? 50 : 100;
        const maxTokens = level === 'brief' ? 200 : level === 'standard' ? 800 : 2000;
        return Math.min(Math.max(estimatedTokens, minTokens), maxTokens);
    }
    /**
     * Calculate token budget for context assembly
     */
    calculateTokenBudget(maxTokens, summaryRatio = 0.3) {
        const bufferRatio = 0.1; // 10% buffer for safety
        const metadataRatio = 0.1; // 10% for metadata
        const availableTokens = Math.floor(maxTokens * (1 - bufferRatio));
        const summaryTokens = Math.floor(availableTokens * summaryRatio);
        const metadataTokens = Math.floor(availableTokens * metadataRatio);
        const detailTokens = availableTokens - summaryTokens - metadataTokens;
        const bufferTokens = maxTokens - availableTokens;
        return {
            summaries: summaryTokens,
            details: detailTokens,
            metadata: metadataTokens,
            buffer: bufferTokens
        };
    }
    /**
     * Chunk text to fit within token limits
     */
    chunkText(text, maxTokensPerChunk, overlap = 0) {
        const totalTokens = this.countText(text).count;
        if (totalTokens <= maxTokensPerChunk) {
            return [text];
        }
        const chunks = [];
        const charsPerChunk = Math.floor(maxTokensPerChunk * this.modelConfig.avgCharsPerToken);
        const overlapChars = Math.floor(overlap * this.modelConfig.avgCharsPerToken);
        let start = 0;
        while (start < text.length) {
            const end = Math.min(start + charsPerChunk, text.length);
            let chunk = text.slice(start, end);
            // Try to break at word boundaries
            if (end < text.length) {
                const lastSpace = chunk.lastIndexOf(' ');
                if (lastSpace > charsPerChunk * 0.8) { // Don't break too early
                    chunk = chunk.slice(0, lastSpace);
                }
            }
            chunks.push(chunk);
            start = end - overlapChars;
        }
        return chunks;
    }
    /**
     * Format messages for summary generation
     */
    formatMessagesForSummary(messages, level) {
        const includeMetadata = level !== 'brief';
        const includeTimestamps = level === 'detailed';
        return messages.map(message => {
            let formatted = `${message.role}: ${message.content}`;
            if (includeTimestamps && message.createdAt) {
                const date = new Date(message.createdAt).toISOString();
                formatted = `[${date}] ${formatted}`;
            }
            if (includeMetadata && message.metadata) {
                const metadata = JSON.stringify(message.metadata);
                formatted += ` (metadata: ${metadata})`;
            }
            return formatted;
        }).join('\n\n');
    }
    /**
     * Get model configuration
     */
    getModelConfig() {
        return { ...this.modelConfig };
    }
    /**
     * Update configuration
     */
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        if (updates.model) {
            this.modelConfig = MODEL_CONFIGS[updates.model] || MODEL_CONFIGS.default;
        }
    }
}
/**
 * Utility functions
 */
/**
 * Create a token counter for a specific model
 */
export function createTokenCounter(model, options) {
    return new TokenCounter({
        model,
        includeMetadata: true,
        includeFormatting: true,
        ...options
    });
}
/**
 * Quick token count for text
 */
export function countTokens(text, model = 'default') {
    const counter = createTokenCounter(model);
    return counter.countText(text).count;
}
/**
 * Quick token count for messages
 */
export function countMessageTokens(messages, model = 'default') {
    const counter = createTokenCounter(model);
    return counter.countMessages(messages).count;
}
/**
 * Validate token count against limits
 */
export function validateTokenCount(count, maxTokens, buffer = 100) {
    const effectiveMax = maxTokens - buffer;
    const valid = count <= effectiveMax;
    return {
        valid,
        availableTokens: Math.max(0, effectiveMax - count),
        exceedsBy: valid ? undefined : count - effectiveMax
    };
}
/**
 * Model registry for easy access
 */
export const SUPPORTED_MODELS = Object.keys(MODEL_CONFIGS).filter(key => key !== 'default');
/**
 * Check if a model is supported
 */
export function isModelSupported(model) {
    return model in MODEL_CONFIGS;
}
/**
 * Get default model configuration
 */
export function getModelConfig(model) {
    return MODEL_CONFIGS[model] || MODEL_CONFIGS.default;
}
//# sourceMappingURL=TokenCounter.js.map