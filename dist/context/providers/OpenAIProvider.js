/**
 * OpenAI Provider
 *
 * External LLM provider using OpenAI API for conversation summarization.
 * Provides high-quality summaries with cost tracking and rate limiting.
 */
import { LLMProvider, ProviderError, ProviderUnavailableError, ProviderTimeoutError, ProviderAuthError, ProviderRateLimitError, ProviderQuotaError } from './LLMProvider.js';
import { createTokenCounter } from '../TokenCounter.js';
/**
 * OpenAI model configurations
 */
const OPENAI_MODELS = {
    'gpt-3.5-turbo': {
        contextLength: 4096,
        costPer1kTokens: 0.002,
        maxTokens: 4096
    },
    'gpt-3.5-turbo-16k': {
        contextLength: 16384,
        costPer1kTokens: 0.004,
        maxTokens: 16384
    },
    'gpt-4': {
        contextLength: 8192,
        costPer1kTokens: 0.03,
        maxTokens: 8192
    },
    'gpt-4-turbo': {
        contextLength: 128000,
        costPer1kTokens: 0.01,
        maxTokens: 4096
    },
    'gpt-4o': {
        contextLength: 128000,
        costPer1kTokens: 0.005,
        maxTokens: 4096
    }
};
/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends LLMProvider {
    apiKey;
    endpoint;
    timeout;
    tokenCounter;
    modelConfig;
    constructor(config) {
        super(config);
        // Get API key from environment
        const apiKeyEnv = config.apiKeyEnv || 'PERSISTENCE_OPENAI_API_KEY';
        const apiKey = process.env[apiKeyEnv];
        if (!apiKey) {
            throw new ProviderError(`OpenAI API key not found in environment variable: ${apiKeyEnv}`, 'MISSING_API_KEY', this.getName());
        }
        this.apiKey = apiKey;
        this.endpoint = config.endpoint || 'https://api.openai.com/v1';
        this.timeout = config.metadata?.timeout || 60000;
        this.tokenCounter = createTokenCounter(config.modelName);
        // Get model configuration
        this.modelConfig = OPENAI_MODELS[config.modelName];
        if (!this.modelConfig) {
            throw new ProviderError(`Unsupported OpenAI model: ${config.modelName}`, 'UNSUPPORTED_MODEL', this.getName());
        }
    }
    async initialize() {
        try {
            // Validate API key by making a simple request
            const health = await this.getHealth();
            if (!health.isAvailable) {
                throw new Error('OpenAI API is not accessible');
            }
        }
        catch (error) {
            throw new ProviderError(`Failed to initialize OpenAI provider: ${error instanceof Error ? error.message : 'Unknown error'}`, 'INITIALIZATION_ERROR', this.getName(), error instanceof Error ? error : undefined);
        }
    }
    async isAvailable() {
        try {
            const response = await this.fetchWithTimeout('/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            return response.ok;
        }
        catch {
            return false;
        }
    }
    async generateSummary(request) {
        const startTime = Date.now();
        try {
            this.validateRequest(request);
            // Count input tokens (for tracking)
            this.tokenCounter.countMessages(request.messages).count;
            // Create messages for OpenAI API
            const messages = this.createChatMessages(request);
            // Calculate max output tokens
            const maxOutputTokens = Math.min(request.maxTokens, 1000); // Reasonable limit for summaries
            // Make API request
            const chatRequest = {
                model: this.config.modelName,
                messages,
                temperature: this.config.temperature || 0.7,
                max_tokens: maxOutputTokens,
                top_p: 0.9,
                frequency_penalty: 0.1,
                presence_penalty: 0.1,
                stop: ['---', '[END]', '</summary>']
            };
            const response = await this.fetchWithTimeout('/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(chatRequest)
            });
            if (!response.ok) {
                await this.handleApiError(response);
            }
            const result = await response.json();
            if (!result.choices || result.choices.length === 0) {
                throw new Error('No response from OpenAI API');
            }
            // Extract summary
            const summary = result.choices[0].message.content.trim();
            const processingTime = Date.now() - startTime;
            // Calculate actual cost
            const actualCost = (result.usage.total_tokens / 1000) * this.modelConfig.costPer1kTokens;
            // Calculate quality score
            const qualityScore = this.calculateQualityScore(summary, request.level);
            // Record success
            this.recordSuccess(processingTime, actualCost);
            return {
                summary,
                tokenCount: result.usage.completion_tokens,
                inputTokens: result.usage.prompt_tokens,
                outputTokens: result.usage.completion_tokens,
                cost: actualCost,
                qualityScore,
                processingTime,
                metadata: {
                    model: result.model,
                    finishReason: result.choices[0].finish_reason,
                    totalTokens: result.usage.total_tokens,
                    requestId: result.id
                }
            };
        }
        catch (error) {
            this.recordFailure();
            if (error instanceof ProviderError) {
                throw error;
            }
            throw new ProviderError(`Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 'GENERATION_ERROR', this.getName(), error instanceof Error ? error : undefined);
        }
    }
    async countTokens(text) {
        const result = this.tokenCounter.countText(text);
        const estimatedCost = this.estimateCost(result.count);
        return {
            count: result.count,
            model: this.config.modelName,
            estimatedCost
        };
    }
    async getHealth() {
        const startTime = Date.now();
        try {
            const response = await this.fetchWithTimeout('/models', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                const error = await response.text();
                return {
                    isAvailable: false,
                    lastChecked: new Date(),
                    error: `HTTP ${response.status}: ${error}`
                };
            }
            const latency = Date.now() - startTime;
            return {
                isAvailable: true,
                latency,
                lastChecked: new Date(),
                modelInfo: {
                    name: this.config.modelName,
                    contextLength: this.modelConfig.contextLength,
                    capabilities: ['text-generation', 'conversation', 'reasoning', 'summarization']
                }
            };
        }
        catch (error) {
            return {
                isAvailable: false,
                lastChecked: new Date(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async getModelInfo() {
        return {
            name: this.config.modelName,
            contextLength: this.modelConfig.contextLength,
            capabilities: ['text-generation', 'conversation', 'reasoning', 'summarization']
        };
    }
    /**
     * Create chat messages for OpenAI API
     */
    createChatMessages(request) {
        const { messages, level, focusTopics, previousSummary } = request;
        // System message with instructions
        const systemMessage = {
            role: 'system',
            content: this.createSystemPrompt(level, focusTopics, previousSummary)
        };
        // Format conversation as user message
        const conversationText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
        const userMessage = {
            role: 'user',
            content: `Please summarize this conversation:\n\n${conversationText}`
        };
        return [systemMessage, userMessage];
    }
    /**
     * Create system prompt based on summary level
     */
    createSystemPrompt(level, focusTopics, previousSummary) {
        const basePrompt = "You are an expert at creating clear, accurate conversation summaries.";
        const levelInstructions = {
            brief: "Create a very brief 1-2 sentence summary focusing on the main outcome or decision.",
            standard: "Create a clear 1-2 paragraph summary including main topics, key points, and outcomes.",
            detailed: "Create a comprehensive summary including topics, arguments, decisions, action items, and context."
        };
        let prompt = `${basePrompt} ${levelInstructions[level]}`;
        if (focusTopics && focusTopics.length > 0) {
            prompt += ` Pay special attention to: ${focusTopics.join(', ')}.`;
        }
        if (previousSummary) {
            prompt += ` Build upon this previous summary: ${previousSummary}`;
        }
        prompt += " Be accurate, concise, and objective. Do not add information not present in the conversation.";
        return prompt;
    }
    /**
     * Calculate quality score for generated summary
     */
    calculateQualityScore(summary, level) {
        let score = 0.7; // Base score for OpenAI (generally high quality)
        // Length appropriateness (OpenAI is usually good at this)
        const lengthTargets = {
            brief: { min: 20, ideal: 80, max: 200 },
            standard: { min: 100, ideal: 300, max: 600 },
            detailed: { min: 200, ideal: 500, max: 1200 }
        };
        const target = lengthTargets[level];
        const length = summary.length;
        if (length >= target.min && length <= target.max) {
            score += 0.15;
        }
        // Structure quality
        const hasGoodStructure = /^[A-Z]/.test(summary) && /[.!?]$/.test(summary);
        if (hasGoodStructure)
            score += 0.1;
        // Content quality (OpenAI typically produces coherent text)
        if (!summary.includes('I cannot') && !summary.includes('I am unable')) {
            score += 0.05;
        }
        return Math.min(1.0, score);
    }
    /**
     * Handle API errors and convert to appropriate exceptions
     */
    async handleApiError(response) {
        let errorDetails;
        try {
            errorDetails = await response.json();
        }
        catch {
            throw new ProviderError(`OpenAI API error: ${response.status} ${response.statusText}`, 'API_ERROR', this.getName());
        }
        const { error } = errorDetails;
        switch (response.status) {
            case 401:
                throw new ProviderAuthError(this.getName());
            case 429:
                const retryAfter = response.headers.get('retry-after');
                throw new ProviderRateLimitError(this.getName(), retryAfter ? parseInt(retryAfter) : undefined);
            case 402:
            case 403:
                if (error.code === 'insufficient_quota') {
                    throw new ProviderQuotaError(this.getName());
                }
                throw new ProviderAuthError(this.getName());
            default:
                throw new ProviderError(error.message || `OpenAI API error: ${response.status}`, error.code || 'API_ERROR', this.getName());
        }
    }
    /**
     * Fetch with timeout support
     */
    async fetchWithTimeout(path, options, timeoutMs = this.timeout) {
        const url = `${this.endpoint}${path}`;
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new ProviderTimeoutError(this.getName(), timeoutMs)), timeoutMs);
        });
        try {
            const response = await Promise.race([
                fetch(url, options),
                timeoutPromise
            ]);
            return response;
        }
        catch (error) {
            if (error instanceof ProviderTimeoutError) {
                throw error;
            }
            throw new ProviderUnavailableError(this.getName(), error instanceof Error ? error : undefined);
        }
    }
    /**
     * Get supported models
     */
    static getSupportedModels() {
        return Object.keys(OPENAI_MODELS);
    }
    /**
     * Get model configuration
     */
    static getModelConfig(model) {
        return OPENAI_MODELS[model];
    }
}
//# sourceMappingURL=OpenAIProvider.js.map