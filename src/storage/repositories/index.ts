/**
 * Repository Module Export Barrel
 * 
 * This file exports all repository classes and their related types/interfaces
 * for easy importing throughout the application.
 */

// Base repository
export { BaseRepository } from './BaseRepository.js';

// Conversation repository
export { 
  ConversationRepository,
  type CreateConversationParams,
  type UpdateConversationParams,
  type ConversationStats
} from './ConversationRepository.js';

// Message repository
export { 
  MessageRepository,
  type CreateMessageParams,
  type UpdateMessageParams
} from './MessageRepository.js';

// State repository
export { 
  StateRepository,
  type BatchStateOperation
} from './StateRepository.js';

// Summary repository
export { 
  SummaryRepository,
  type CreateSummaryParams,
  type UpdateSummaryParams,
  type BatchSummaryParams
} from './SummaryRepository.js';

// Provider configuration repository
export { 
  ProviderConfigRepository,
  type UpdateProviderParams
} from './ProviderConfigRepository.js';

// Cache repository
export { 
  CacheRepository
} from './CacheRepository.js';

// Summary history repository
export { 
  SummaryHistoryRepository
} from './SummaryHistoryRepository.js';

// Re-export relevant types from interfaces
export type {
  Conversation,
  Message,
  PersistenceState,
  PaginatedResult,
  SearchOptions,
  SearchResult,
  ConversationSummary,
  LLMProvider,
  SummaryCache,
  SummaryHistory
} from '../../types/interfaces.js';

// Re-export repository interface types
export type {
  IProviderConfigRepository,
  ICacheRepository,
  ISummaryHistoryRepository,
  CreateProviderParams,
  CacheSetData,
  CacheStats,
  SummaryStartData,
  SummaryCompleteResult,
  SummaryStats,
  EncryptedData
} from '../../types/repositories.js';