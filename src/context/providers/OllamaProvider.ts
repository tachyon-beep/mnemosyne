/**
 * Ollama Provider
 * 
 * Local LLM provider using Ollama API for conversation summarization.
 * Provides privacy-preserving inference with various open-source models.
 */

import { 
  LLMProvider, 
  ProviderConfig, 
  SummaryRequest, 
  SummaryResponse, 
  ProviderHealth, 
  ModelInfo, 
  TokenCount,
  ProviderError,
  ProviderUnavailableError,
  ProviderTimeoutError
} from './LLMProvider.js';
import { createTokenCounter } from '../TokenCounter.js';

/**
 * Ollama API response interfaces
 */
interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    stop?: string[];
  };
}

interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format?: string;
    family?: string;
    families?: string[];
    parameter_size?: string;
    quantization_level?: string;
  };
}

/**
 * Ollama provider implementation
 */
export class OllamaProvider extends LLMProvider {
  private endpoint: string;
  private timeout: number;
  private tokenCounter: ReturnType<typeof createTokenCounter>;

  constructor(config: ProviderConfig) {
    super(config);
    this.endpoint = config.endpoint || 'http://localhost:11434';
    this.timeout = config.metadata?.timeout || 30000;
    this.tokenCounter = createTokenCounter(config.modelName);
  }

  async initialize(): Promise<void> {
    try {
      // Check if Ollama is running
      const health = await this.getHealth();
      if (!health.isAvailable) {
        throw new Error('Ollama service is not available');
      }

      // Try to pull the model if it doesn't exist
      await this.ensureModelExists();

    } catch (error) {
      throw new ProviderError(
        `Failed to initialize Ollama provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'INITIALIZATION_ERROR',
        this.getName(),
        error instanceof Error ? error : undefined
      );
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout('/api/tags', {
        method: 'GET'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateSummary(request: SummaryRequest): Promise<SummaryResponse> {
    const startTime = Date.now();
    
    try {
      this.validateRequest(request);

      // Count input tokens
      const inputTokens = this.tokenCounter.countMessages(request.messages).count;

      // Generate prompt for summarization
      const prompt = this.createSummaryPrompt(request);

      // Make API request
      const ollamaRequest: OllamaGenerateRequest = {
        model: this.config.modelName,
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature || 0.7,
          max_tokens: request.maxTokens,
          stop: ['</summary>', '[END]', '---']
        }
      };

      const response = await this.fetchWithTimeout('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(ollamaRequest)
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json() as OllamaGenerateResponse;
      
      // Extract and clean summary
      const summary = this.extractSummary(result.response);
      const outputTokens = this.tokenCounter.countText(summary).count;
      const processingTime = Date.now() - startTime;

      // Calculate quality score based on length and content
      const qualityScore = this.calculateQualityScore(summary, request.level);

      // Record success
      this.recordSuccess(processingTime, 0); // No cost for local model

      return {
        summary,
        tokenCount: outputTokens,
        inputTokens,
        outputTokens,
        cost: 0, // Local model, no cost
        qualityScore,
        processingTime,
        metadata: {
          model: result.model,
          promptEvalCount: result.prompt_eval_count,
          evalCount: result.eval_count,
          totalDuration: result.total_duration,
          loadDuration: result.load_duration
        }
      };

    } catch (error) {
      this.recordFailure();
      
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        `Summary generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_ERROR',
        this.getName(),
        error instanceof Error ? error : undefined
      );
    }
  }

  async countTokens(text: string): Promise<TokenCount> {
    const result = this.tokenCounter.countText(text);
    return {
      count: result.count,
      model: this.config.modelName,
      estimatedCost: 0 // No cost for local counting
    };
  }

  async getHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    
    try {
      const response = await this.fetchWithTimeout('/api/version', {
        method: 'GET'
      });

      if (!response.ok) {
        return {
          isAvailable: false,
          lastChecked: new Date(),
          error: `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const latency = Date.now() - startTime;
      const modelInfo = await this.getModelInfo();

      return {
        isAvailable: true,
        latency,
        lastChecked: new Date(),
        modelInfo
      };

    } catch (error) {
      return {
        isAvailable: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getModelInfo(): Promise<ModelInfo | undefined> {
    try {
      const response = await this.fetchWithTimeout('/api/show', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: this.config.modelName })
      });

      if (!response.ok) {
        return undefined;
      }

      const info = await response.json() as OllamaModelInfo;
      
      return {
        name: info.name,
        version: info.digest.slice(0, 12),
        contextLength: this.getContextLength(info.details.family),
        capabilities: this.getModelCapabilities(info.details.family),
        memoryUsage: info.size
      };

    } catch {
      return undefined;
    }
  }

  /**
   * Create summarization prompt based on request
   */
  private createSummaryPrompt(request: SummaryRequest): string {
    const { messages, level, focusTopics, previousSummary } = request;
    
    // Format conversation
    const conversation = messages.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n\n');

    // Base prompt templates
    const templates = {
      brief: `Please provide a very brief 1-2 sentence summary of this conversation:

${conversation}

Focus on the main outcome or decision. Be concise and clear.

Summary:`,

      standard: `Please provide a clear summary of this conversation in 1-2 paragraphs:

${conversation}

Include the main topics discussed, key points made, and any outcomes or decisions reached.

${focusTopics ? `Pay special attention to: ${focusTopics.join(', ')}` : ''}

Summary:`,

      detailed: `Please provide a comprehensive summary of this conversation:

${conversation}

Include:
- Main topics and themes discussed
- Key arguments and perspectives presented
- Important decisions made or conclusions reached
- Any action items or next steps mentioned
- Context and background information

${focusTopics ? `Focus particularly on: ${focusTopics.join(', ')}` : ''}

${previousSummary ? `Previous summary to build upon:\n${previousSummary}\n` : ''}

Detailed Summary:`
    };

    return templates[level];
  }

  /**
   * Extract clean summary from model response
   */
  private extractSummary(response: string): string {
    // Remove any markdown formatting or extra text
    let summary = response.trim();
    
    // Remove common prefixes
    const prefixes = ['Summary:', 'summary:', 'Brief:', 'brief:', 'Here is', 'Here\'s'];
    for (const prefix of prefixes) {
      if (summary.toLowerCase().startsWith(prefix.toLowerCase())) {
        summary = summary.slice(prefix.length).trim();
      }
    }

    // Remove any trailing punctuation repetition
    summary = summary.replace(/[.!?]{2,}$/, '.');
    
    // Ensure it ends with proper punctuation
    if (!/[.!?]$/.test(summary)) {
      summary += '.';
    }

    return summary;
  }

  /**
   * Calculate quality score for generated summary
   */
  private calculateQualityScore(summary: string, level: 'brief' | 'standard' | 'detailed'): number {
    let score = 0.5; // Base score

    // Length appropriateness
    const lengthTargets = {
      brief: { min: 10, ideal: 50, max: 150 },
      standard: { min: 50, ideal: 200, max: 500 },
      detailed: { min: 100, ideal: 400, max: 1000 }
    };

    const target = lengthTargets[level];
    const length = summary.length;

    if (length >= target.min && length <= target.max) {
      score += 0.2;
      if (Math.abs(length - target.ideal) / target.ideal < 0.3) {
        score += 0.1; // Bonus for ideal length
      }
    }

    // Content quality indicators
    const hasProperStructure = /^[A-Z]/.test(summary) && /[.!?]$/.test(summary);
    if (hasProperStructure) score += 0.1;

    const hasCoherentSentences = !summary.includes('...');
    if (hasCoherentSentences) score += 0.1;

    const notTooRepetitive = !/((.+)\2{2,})/.test(summary);
    if (notTooRepetitive) score += 0.1;

    return Math.min(1.0, Math.max(0.0, score));
  }

  /**
   * Ensure model exists, pull if necessary
   */
  private async ensureModelExists(): Promise<void> {
    try {
      // Check if model exists
      const response = await this.fetchWithTimeout('/api/show', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: this.config.modelName })
      });

      if (response.ok) {
        return; // Model exists
      }

      // Try to pull the model
      console.log(`Pulling Ollama model: ${this.config.modelName}`);
      const pullResponse = await this.fetchWithTimeout('/api/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: this.config.modelName })
      }, 300000); // 5 minute timeout for pulling

      if (!pullResponse.ok) {
        throw new Error(`Failed to pull model ${this.config.modelName}`);
      }

    } catch (error) {
      throw new ProviderUnavailableError(
        this.getName(),
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get context length for model family
   */
  private getContextLength(family?: string): number {
    const contextLengths: Record<string, number> = {
      'llama': 4096,
      'mistral': 4096,
      'codellama': 16384,
      'vicuna': 2048,
      'alpaca': 2048
    };

    if (family && family in contextLengths) {
      return contextLengths[family];
    }

    return 4096; // Default
  }

  /**
   * Get model capabilities
   */
  private getModelCapabilities(family?: string): string[] {
    const capabilities: Record<string, string[]> = {
      'llama': ['text-generation', 'conversation', 'reasoning'],
      'mistral': ['text-generation', 'conversation', 'reasoning', 'instruction-following'],
      'codellama': ['text-generation', 'code-generation', 'code-explanation'],
      'vicuna': ['text-generation', 'conversation'],
      'alpaca': ['text-generation', 'instruction-following']
    };

    if (family && family in capabilities) {
      return capabilities[family];
    }

    return ['text-generation', 'conversation'];
  }

  /**
   * Fetch with timeout support
   */
  private async fetchWithTimeout(
    path: string, 
    options: RequestInit, 
    timeoutMs: number = this.timeout
  ): Promise<Response> {
    const url = `${this.endpoint}${path}`;
    
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new ProviderTimeoutError(this.getName(), timeoutMs)), timeoutMs);
    });

    try {
      const response = await Promise.race([
        fetch(url, options),
        timeoutPromise
      ]);

      return response;
    } catch (error) {
      if (error instanceof ProviderTimeoutError) {
        throw error;
      }
      
      throw new ProviderUnavailableError(
        this.getName(),
        error instanceof Error ? error : undefined
      );
    }
  }
}