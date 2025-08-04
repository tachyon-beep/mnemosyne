/**
 * Context Management Module Exports
 * 
 * Exports all context management components including providers,
 * token counting, and summarization utilities.
 */

// Provider interfaces and base classes
export { 
  LLMProvider, 
  ProviderConfig, 
  SummaryRequest, 
  SummaryResponse, 
  ProviderHealth, 
  ModelInfo, 
  TokenCount,
  ProviderError,
  ProviderUnavailableError,
  ProviderTimeoutError,
  ProviderAuthError,
  ProviderRateLimitError,
  ProviderQuotaError
} from './providers/LLMProvider.js';

// Concrete provider implementations
export { OllamaProvider } from './providers/OllamaProvider.js';
export { OpenAIProvider } from './providers/OpenAIProvider.js';

// Provider management
export { 
  ProviderManager, 
  ProviderStrategy, 
  ProviderManagerConfig 
} from './ProviderManager.js';

// Token counting utilities
export { 
  TokenCounter, 
  TokenCount as TokenCountResult,
  TokenCounterConfig,
  createTokenCounter,
  countTokens,
  countMessageTokens,
  validateTokenCount,
  SUPPORTED_MODELS,
  isModelSupported,
  getModelConfig
} from './TokenCounter.js';