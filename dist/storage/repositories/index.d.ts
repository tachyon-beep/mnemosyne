/**
 * Repository Module Export Barrel
 *
 * This file exports all repository classes and their related types/interfaces
 * for easy importing throughout the application.
 */
export { BaseRepository } from './BaseRepository.js';
export { ConversationRepository, type CreateConversationParams, type UpdateConversationParams, type ConversationStats } from './ConversationRepository.js';
export { MessageRepository, type CreateMessageParams, type UpdateMessageParams } from './MessageRepository.js';
export { StateRepository, type BatchStateOperation } from './StateRepository.js';
export { SummaryRepository, type CreateSummaryParams, type UpdateSummaryParams, type BatchSummaryParams } from './SummaryRepository.js';
export { ProviderConfigRepository, type UpdateProviderParams } from './ProviderConfigRepository.js';
export { CacheRepository } from './CacheRepository.js';
export { SummaryHistoryRepository } from './SummaryHistoryRepository.js';
export { EntityRepository, type Entity, type EntityType, type CreateEntityInput, type UpdateEntityInput, type EntitySearchOptions } from './EntityRepository.js';
export type { Conversation, Message, PersistenceState, PaginatedResult, SearchOptions, SearchResult, ConversationSummary, LLMProvider, SummaryCache, SummaryHistory } from '../../types/interfaces.js';
export type { IProviderConfigRepository, ICacheRepository, ISummaryHistoryRepository, CreateProviderParams, CacheSetData, CacheStats, SummaryStartData, SummaryCompleteResult, SummaryStats, EncryptedData } from '../../types/repositories.js';
//# sourceMappingURL=index.d.ts.map