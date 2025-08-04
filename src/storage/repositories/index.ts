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

// Re-export relevant types from interfaces
export type {
  Conversation,
  Message,
  PersistenceState,
  PaginatedResult,
  SearchOptions,
  SearchResult
} from '../../types/interfaces.js';