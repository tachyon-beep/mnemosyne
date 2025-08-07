/**
 * Ollama Provider
 *
 * Local LLM provider using Ollama API for conversation summarization.
 * Provides privacy-preserving inference with various open-source models.
 */
import { LLMProvider, ProviderConfig, SummaryRequest, SummaryResponse, ProviderHealth, ModelInfo, TokenCount } from './LLMProvider.js';
/**
 * Ollama provider implementation
 */
export declare class OllamaProvider extends LLMProvider {
    private endpoint;
    private timeout;
    private tokenCounter;
    constructor(config: ProviderConfig);
    initialize(): Promise<void>;
    isAvailable(): Promise<boolean>;
    generateSummary(request: SummaryRequest): Promise<SummaryResponse>;
    countTokens(text: string): Promise<TokenCount>;
    getHealth(): Promise<ProviderHealth>;
    getModelInfo(): Promise<ModelInfo | undefined>;
    /**
     * Create summarization prompt based on request
     */
    private createSummaryPrompt;
    /**
     * Extract clean summary from model response
     */
    private extractSummary;
    /**
     * Calculate quality score for generated summary
     */
    private calculateQualityScore;
    /**
     * Ensure model exists, pull if necessary
     */
    private ensureModelExists;
    /**
     * Get context length for model family
     */
    private getContextLength;
    /**
     * Get model capabilities
     */
    private getModelCapabilities;
    /**
     * Fetch with timeout support
     */
    private fetchWithTimeout;
}
//# sourceMappingURL=OllamaProvider.d.ts.map