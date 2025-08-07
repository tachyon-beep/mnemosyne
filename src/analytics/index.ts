/**
 * Analytics Module Index
 * 
 * Central export point for all analytics components including:
 * - Core analytics services and repositories
 * - Analyzer implementations
 * - Performance optimizations
 * - MCP tools integration
 */

// Core analytics services
export { AnalyticsEngine } from './services/AnalyticsEngine.js';
export type { AnalyticsEngineConfig, AnalyticsReport } from './services/AnalyticsEngine.js';

// Analyzer implementations
export { ConversationFlowAnalyzer } from './analyzers/ConversationFlowAnalyzer.js';
export type { 
  ConversationFlowMetrics,
  Topic,
  TopicTransition,
  CircularityAnalysis
} from './analyzers/ConversationFlowAnalyzer.js';

export { ProductivityAnalyzer } from './analyzers/ProductivityAnalyzer.js';
export type {
  ProductivityMetrics,
  HourlyProductivityData,
  QuestionEffectivenessAnalysis,
  BreakthroughPattern,
  SessionOptimization
} from './analyzers/ProductivityAnalyzer.js';

export { KnowledgeGapDetector } from './analyzers/KnowledgeGapDetector.js';
export type {
  DetectedKnowledgeGap,
  QuestionCluster,
  TopicCoverageAnalysis,
  LearningCurve,
  ExpertiseDomain
} from './analyzers/KnowledgeGapDetector.js';

export { DecisionTracker } from './analyzers/DecisionTracker.js';
export type {
  TrackedDecision,
  DecisionPattern,
  DecisionQualityMetrics,
  DecisionTimeline
} from './analyzers/DecisionTracker.js';

// Repository layer
export { AnalyticsRepository } from './repositories/AnalyticsRepository.js';
export { ConversationAnalyticsRepository } from './repositories/ConversationAnalyticsRepository.js';
export { KnowledgeGapsRepository } from './repositories/KnowledgeGapsRepository.js';
export { DecisionTrackingRepository } from './repositories/DecisionTrackingRepository.js';
export type { TimeRange, PaginationOptions } from './repositories/AnalyticsRepository.js';

// Performance optimizations - the new additions
export {
  AnalyticsPerformanceOptimizer,
  OptimizedAnalyticsEngine,
  AnalyticsResourceManager,
  AnalyticsPerformanceBenchmark,
  createOptimizedAnalyticsSystem,
  PerformanceUtils
} from './performance/index.js';

export type {
  PerformanceMetrics,
  OptimizationConfig,
  OptimizedAnalyticsConfig,
  OptimizedAnalyticsReport,
  ResourceManagerConfig,
  ResourceUsageStats,
  BenchmarkResult,
  OptimizedAnalyticsSystem,
  SystemStatus
} from './performance/index.js';

// MCP Tools (if they exist)
// These would be exported if the tools have been implemented
// export { GetConversationAnalyticsTool } from './tools/GetConversationAnalyticsTool.js';
// export { GenerateAnalyticsReportTool } from './tools/GenerateAnalyticsReportTool.js';

/**
 * Convenience factory function for creating a production-ready analytics system
 */
export { createOptimizedAnalyticsSystem as createAnalyticsSystem } from './performance/index.js';

/**
 * Analytics module version and metadata
 */
export const ANALYTICS_VERSION = '1.0.0';
export const ANALYTICS_FEATURES = {
  coreAnalytics: true,
  performanceOptimization: true,
  parallelProcessing: true,
  memoryOptimization: true,
  resourceManagement: true,
  benchmarking: true,
  realTimeMonitoring: true
} as const;