/**
 * Analytics Repositories - Export all analytics repository classes
 */

export { AnalyticsRepository } from './AnalyticsRepository.js';
export type { TimeRange, PaginationOptions } from './AnalyticsRepository.js';

export { ConversationAnalyticsRepository } from './ConversationAnalyticsRepository.js';
export type { 
  ConversationAnalytics,
  ConversationAnalyticsInput,
  ProductivitySummary,
  TopicFlowSummary
} from './ConversationAnalyticsRepository.js';

export { ProductivityPatternsRepository } from './ProductivityPatternsRepository.js';
export type {
  ProductivityPattern,
  ProductivityPatternInput,
  QuestionPattern,
  HourlyProductivity,
  SessionLengthAnalysis
} from './ProductivityPatternsRepository.js';

export { KnowledgeGapsRepository } from './KnowledgeGapsRepository.js';
export type {
  KnowledgeGap,
  KnowledgeGapInput,
  GapCluster,
  LearningProgress,
  TopicCoverage
} from './KnowledgeGapsRepository.js';

export { DecisionTrackingRepository } from './DecisionTrackingRepository.js';
export type {
  DecisionTracking,
  DecisionInput,
  DecisionOutcome,
  DecisionAnalysis,
  DecisionPattern
} from './DecisionTrackingRepository.js';