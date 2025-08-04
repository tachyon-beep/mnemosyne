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

// Summary generation
export {
  SummaryGenerator,
  SummaryGeneratorConfig,
  GenerationRequest,
  GenerationResult,
  BatchGenerationRequest,
  BatchGenerationResult
} from './SummaryGenerator.js';

// Summary prompts
export {
  SummaryPrompts,
  PromptConfig,
  GeneratedPrompt
} from './prompts/SummaryPrompts.js';

// Summary validation
export {
  SummaryValidator,
  ValidationResult,
  EntityAnalysis,
  ContentAnalysis,
  ValidationConfig
} from './validators/SummaryValidator.js';

// Context Assembly
export {
  ContextAssembler,
  ContextAssemblyRequest,
  AssembledContext,
  ContextAssemblerConfig
} from './ContextAssembler.js';

// Relevance Scoring
export {
  RelevanceScorer,
  ScoredItem,
  ItemToScore,
  RelevanceScorerConfig
} from './scoring/RelevanceScorer.js';

// Token Optimization
export {
  TokenOptimizer,
  TokenBudget,
  TokenOptimizerConfig,
  OptimizationResult
} from './optimization/TokenOptimizer.js';

// Assembly Strategies
export {
  AssemblyStrategy,
  StrategyType,
  StrategySelectionCriteria
} from './strategies/AssemblyStrategy.js';

export { TemporalStrategy } from './strategies/TemporalStrategy.js';
export { TopicalStrategy } from './strategies/TopicalStrategy.js';
export { EntityCentricStrategy } from './strategies/EntityCentricStrategy.js';
export { HybridStrategy } from './strategies/HybridStrategy.js';