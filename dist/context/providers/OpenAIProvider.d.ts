/**
 * OpenAI Provider
 *
 * External LLM provider using OpenAI API for conversation summarization.
 * Provides high-quality summaries with cost tracking and rate limiting.
 */
import { LLMProvider, ProviderConfig, SummaryRequest, SummaryResponse, ProviderHealth, ModelInfo, TokenCount } from './LLMProvider.js';
/**
 * OpenAI model configurations
 */
declare const OPENAI_MODELS: {
    'gpt-3.5-turbo': {
        contextLength: number;
        costPer1kTokens: number;
        maxTokens: number;
    };
    'gpt-3.5-turbo-16k': {
        contextLength: number;
        costPer1kTokens: number;
        maxTokens: number;
    };
    'gpt-4': {
        contextLength: number;
        costPer1kTokens: number;
        maxTokens: number;
    };
    'gpt-4-turbo': {
        contextLength: number;
        costPer1kTokens: number;
        maxTokens: number;
    };
    'gpt-4o': {
        contextLength: number;
        costPer1kTokens: number;
        maxTokens: number;
    };
};
/**
 * OpenAI provider implementation
 */
export declare class OpenAIProvider extends LLMProvider {
    private apiKey;
    private endpoint;
    private timeout;
    private tokenCounter;
    private modelConfig;
    constructor(config: ProviderConfig);
    initialize(): Promise<void>;
    isAvailable(): Promise<boolean>;
    generateSummary(request: SummaryRequest): Promise<SummaryResponse>;
    countTokens(text: string): Promise<TokenCount>;
    getHealth(): Promise<ProviderHealth>;
    getModelInfo(): Promise<ModelInfo>;
    /**
     * Create chat messages for OpenAI API
     */
    private createChatMessages;
    /**
     * Create system prompt based on summary level
     */
    private createSystemPrompt;
    /**
     * Calculate quality score for generated summary
     */
    private calculateQualityScore;
    /**
     * Handle API errors and convert to appropriate exceptions
     */
    private handleApiError;
    /**
     * Fetch with timeout support
     */
    private fetchWithTimeout;
    /**
     * Get supported models
     */
    static getSupportedModels(): string[];
    /**
     * Get model configuration
     */
    static getModelConfig(model: string): typeof OPENAI_MODELS[keyof typeof OPENAI_MODELS] | undefined;
}
export {};
//# sourceMappingURL=OpenAIProvider.d.ts.map