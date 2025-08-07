/**
 * Zod schemas for tool validation in the MCP Persistence System
 * 
 * This file contains all the validation schemas used to validate tool inputs
 * and ensure type safety throughout the system.
 */

import { z } from 'zod';

/**
 * Schema for message roles
 */
export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);

/**
 * Schema for export formats
 */
export const ExportFormatSchema = z.enum(['json', 'markdown', 'csv']);

/**
 * Schema for search match types
 */
export const MatchTypeSchema = z.enum(['fuzzy', 'exact', 'prefix']);

/**
 * Schema for log levels
 */
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error']);

/**
 * Schema for validating save_message tool input
 */
export const SaveMessageSchema = z.object({
  /** Optional conversation ID - if not provided, a new conversation will be created */
  conversationId: z.string().optional(),
  /** Role of the message sender */
  role: MessageRoleSchema,
  /** Content of the message */
  content: z.string().min(1, 'Message content cannot be empty'),
  /** Optional parent message ID for threading */
  parentMessageId: z.string().optional(),
  /** Optional metadata as key-value pairs */
  metadata: z.record(z.any()).optional()
});

/**
 * Schema for validating search_messages tool input
 */
export const SearchMessagesSchema = z.object({
  /** Search query string */
  query: z.string().min(1, 'Search query cannot be empty'),
  /** Optional conversation ID to limit search scope */
  conversationId: z.string().optional(),
  /** Maximum number of results to return */
  limit: z.number().min(1).max(100).default(20),
  /** Number of results to skip for pagination */
  offset: z.number().min(0).default(0),
  /** Start date for time-based filtering (ISO 8601 string) */
  startDate: z.string().datetime().optional(),
  /** End date for time-based filtering (ISO 8601 string) */
  endDate: z.string().datetime().optional(),
  /** Type of matching to perform */
  matchType: MatchTypeSchema.default('fuzzy'),
  /** Start marker for highlighting matches */
  highlightStart: z.string().default('<mark>'),
  /** End marker for highlighting matches */
  highlightEnd: z.string().default('</mark>')
});

/**
 * Schema for validating get_conversation tool input
 */
export const GetConversationSchema = z.object({
  /** ID of the conversation to retrieve */
  conversationId: z.string().min(1, 'Conversation ID cannot be empty'),
  /** Whether to include messages in the response */
  includeMessages: z.boolean().default(true),
  /** Maximum number of messages to return */
  messageLimit: z.number().min(1).max(1000).default(100),
  /** Return messages before this message ID (for pagination) */
  beforeMessageId: z.string().optional(),
  /** Return messages after this message ID (for pagination) */
  afterMessageId: z.string().optional()
});

/**
 * Schema for validating get_conversations tool input
 */
export const GetConversationsSchema = z.object({
  /** Maximum number of conversations to return */
  limit: z.number().min(1).max(100).default(20),
  /** Number of conversations to skip for pagination */
  offset: z.number().min(0).default(0),
  /** Start date for filtering conversations */
  startDate: z.string().datetime().optional(),
  /** End date for filtering conversations */
  endDate: z.string().datetime().optional(),
  /** Whether to include message counts for each conversation */
  includeMessageCounts: z.boolean().default(false)
});

/**
 * Schema for validating delete_conversation tool input
 */
export const DeleteConversationSchema = z.object({
  /** ID of the conversation to delete */
  conversationId: z.string().min(1, 'Conversation ID cannot be empty'),
  /** Whether to permanently delete (vs soft delete) */
  permanent: z.boolean().default(false)
});

/**
 * Schema for validating delete_message tool input
 */
export const DeleteMessageSchema = z.object({
  /** ID of the message to delete */
  messageId: z.string().min(1, 'Message ID cannot be empty'),
  /** Whether to permanently delete (vs soft delete) */
  permanent: z.boolean().default(false)
});

/**
 * Schema for validating update_conversation tool input
 */
export const UpdateConversationSchema = z.object({
  /** ID of the conversation to update */
  conversationId: z.string().min(1, 'Conversation ID cannot be empty'),
  /** New title for the conversation */
  title: z.string().optional(),
  /** Metadata to merge with existing metadata */
  metadata: z.record(z.any()).optional()
});

/**
 * Schema for validating update_message tool input
 */
export const UpdateMessageSchema = z.object({
  /** ID of the message to update */
  messageId: z.string().min(1, 'Message ID cannot be empty'),
  /** New content for the message */
  content: z.string().min(1, 'Message content cannot be empty').optional(),
  /** Metadata to merge with existing metadata */
  metadata: z.record(z.any()).optional()
});

/**
 * Schema for validating export_conversations tool input
 */
export const ExportConversationsSchema = z.object({
  /** Format for the export */
  format: ExportFormatSchema.default('json'),
  /** Optional conversation IDs to include (if not specified, exports all) */
  conversationIds: z.array(z.string()).optional(),
  /** Start date for filtering conversations */
  startDate: z.string().datetime().optional(),
  /** End date for filtering conversations */
  endDate: z.string().datetime().optional(),
  /** Whether to include message metadata in the export */
  includeMetadata: z.boolean().default(true)
});

/**
 * Schema for validating import_conversations tool input
 */
export const ImportConversationsSchema = z.object({
  /** JSON string or file path containing conversations to import */
  data: z.string().min(1, 'Import data cannot be empty'),
  /** Whether the data parameter is a file path (vs JSON string) */
  isFilePath: z.boolean().default(false),
  /** Whether to overwrite existing conversations with same IDs */
  overwrite: z.boolean().default(false),
  /** Whether to validate conversation structure before import */
  validate: z.boolean().default(true)
});

/**
 * Schema for validating get_database_stats tool input
 */
export const GetDatabaseStatsSchema = z.object({
  /** Whether to include detailed breakdown by conversation */
  includeDetails: z.boolean().default(false)
});

/**
 * Schema for validating optimize_database tool input
 */
export const OptimizeDatabaseSchema = z.object({
  /** Whether to run VACUUM operation */
  vacuum: z.boolean().default(true),
  /** Whether to run ANALYZE operation */
  analyze: z.boolean().default(true),
  /** Whether to optimize FTS indexes */
  optimizeFTS: z.boolean().default(true)
});

/**
 * Schema for validating set_retention_policy tool input
 */
export const SetRetentionPolicySchema = z.object({
  /** Number of days to retain conversations */
  retentionDays: z.number().min(1).max(3650), // Max ~10 years
  /** Whether to apply the policy immediately */
  applyImmediately: z.boolean().default(false)
});

/**
 * Schema for validating generate_embeddings tool input
 */
export const GenerateEmbeddingsSchema = z.object({
  /** Optional conversation ID to limit embedding generation */
  conversationId: z.string().optional(),
  /** Whether to regenerate existing embeddings */
  force: z.boolean().default(false),
  /** Maximum number of messages to process in this batch */
  batchSize: z.number().min(1).max(1000).default(100)
});

/**
 * Schema for assembly strategy types
 */
export const AssemblyStrategySchema = z.enum(['temporal', 'topical', 'entity-centric', 'hybrid']);

/**
 * Schema for validating get_relevant_snippets tool input
 */
export const GetRelevantSnippetsSchema = z.object({
  /** Query to find relevant snippets for */
  query: z.string().min(1, 'Query cannot be empty'),
  /** Maximum token budget for selected snippets */
  maxTokens: z.number().min(50).max(16000).default(4000),
  /** Assembly strategy to use for context selection */
  strategy: AssemblyStrategySchema.default('hybrid'),
  /** Optional conversation IDs to limit search scope */
  conversationIds: z.array(z.string()).optional(),
  /** Minimum relevance threshold (0-1) */
  minRelevance: z.number().min(0).max(1).default(0.3),
  /** Include recent messages regardless of relevance */
  includeRecent: z.boolean().default(true),
  /** Entity names to focus on */
  focusEntities: z.array(z.string()).optional(),
  /** Time window for context in milliseconds */
  timeWindow: z.number().min(0).optional(),
  /** Model name for token counting */
  model: z.string().default('gpt-3.5-turbo')
});

/**
 * Schema for provider operation types
 */
export const ProviderOperationSchema = z.enum(['add', 'update', 'remove', 'list']);

/**
 * Schema for provider types
 */
export const ProviderTypeSchema = z.enum(['local', 'external']);

/**
 * Schema for provider configuration
 */
export const ProviderConfigSchema = z.object({
  /** Provider ID (required for update/remove operations) */
  id: z.string().optional(),
  /** Provider name */
  name: z.string().min(1).optional(),
  /** Provider type */
  type: ProviderTypeSchema.optional(),
  /** API endpoint URL */
  endpoint: z.string().url().optional(),
  /** Environment variable name for API key */
  apiKeyEnv: z.string().optional(),
  /** Model name to use */
  modelName: z.string().min(1).optional(),
  /** Maximum tokens for the model */
  maxTokens: z.number().min(1).optional(),
  /** Temperature setting (0-2) */
  temperature: z.number().min(0).max(2).optional(),
  /** Whether the provider is active */
  isActive: z.boolean().optional(),
  /** Priority for provider selection (higher = preferred) */
  priority: z.number().optional(),
  /** Cost per 1000 tokens */
  costPer1kTokens: z.number().min(0).optional(),
  /** Additional metadata */
  metadata: z.record(z.any()).optional()
});

/**
 * Schema for validating configure_llm_provider tool input
 */
export const ConfigureLLMProviderSchema = z.object({
  /** Operation to perform */
  operation: ProviderOperationSchema,
  /** Provider configuration (required for add/update operations) */
  config: ProviderConfigSchema.optional()
}).refine(
  (data) => {
    // For add/update operations, config is required
    if ((data.operation === 'add' || data.operation === 'update') && !data.config) {
      return false;
    }
    // For update/remove operations, config.id is required
    if ((data.operation === 'update' || data.operation === 'remove') && (!data.config || !data.config.id)) {
      return false;
    }
    return true;
  },
  {
    message: 'Config is required for add/update operations, and config.id is required for update/remove operations'
  }
);

/**
 * Schema for conversation data structure (used in imports/exports)
 */
export const ConversationDataSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  title: z.string().optional(),
  metadata: z.record(z.any()),
  messages: z.array(z.object({
    id: z.string(),
    conversationId: z.string(),
    role: MessageRoleSchema,
    content: z.string(),
    createdAt: z.number(),
    parentMessageId: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })).optional()
});

/**
 * Schema for server configuration
 */
export const PersistenceServerConfigSchema = z.object({
  databasePath: z.string().min(1, 'Database path cannot be empty'),
  maxDatabaseSizeMB: z.number().min(1).default(1000),
  maxConversationAgeDays: z.number().min(1).default(365),
  maxMessagesPerConversation: z.number().min(1).default(10000),
  enableEmbeddings: z.boolean().default(false),
  embeddingModel: z.string().optional(),
  enableAutoSummarization: z.boolean().default(false),
  vacuumInterval: z.number().min(60000).default(86400000), // Min 1 minute, default 1 day
  checkpointInterval: z.number().min(30000).default(300000), // Min 30 seconds, default 5 minutes
  encryptionEnabled: z.boolean().default(false),
  defaultRetentionDays: z.number().min(1).default(90),
  logLevel: LogLevelSchema.default('info')
});

// Export inferred types from schemas
export type SaveMessageInput = z.infer<typeof SaveMessageSchema>;

// For schemas with defaults, we need to handle the output type properly
export type SearchMessagesInput = z.input<typeof SearchMessagesSchema>;

export type GetConversationInput = z.infer<typeof GetConversationSchema>;

export type GetConversationsInput = z.input<typeof GetConversationsSchema>;

export type DeleteConversationInput = z.input<typeof DeleteConversationSchema>;

export type DeleteMessageInput = z.infer<typeof DeleteMessageSchema>;
export type UpdateConversationInput = z.infer<typeof UpdateConversationSchema>;
export type UpdateMessageInput = z.infer<typeof UpdateMessageSchema>;
export type ExportConversationsInput = z.infer<typeof ExportConversationsSchema>;
export type ImportConversationsInput = z.infer<typeof ImportConversationsSchema>;
export type GetDatabaseStatsInput = z.infer<typeof GetDatabaseStatsSchema>;
export type OptimizeDatabaseInput = z.infer<typeof OptimizeDatabaseSchema>;
export type SetRetentionPolicyInput = z.infer<typeof SetRetentionPolicySchema>;
export type GenerateEmbeddingsInput = z.infer<typeof GenerateEmbeddingsSchema>;
export type GetRelevantSnippetsInput = z.infer<typeof GetRelevantSnippetsSchema>;
export type ConfigureLLMProviderInput = z.infer<typeof ConfigureLLMProviderSchema>;

/**
 * Schema for get_progressive_detail tool input
 */
export const GetProgressiveDetailSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID format'),
  level: z.enum(['brief', 'standard', 'detailed', 'full']).optional()
    .describe('Detail level to retrieve'),
  maxTokens: z.number().int().min(100).max(16000).optional()
    .describe('Maximum tokens to return'),
  focusMessageId: z.string().uuid().optional()
    .describe('Message ID to focus on for key message selection'),
  expandContext: z.boolean().optional()
    .describe('Whether to expand context for detailed/full levels')
});

export type GetProgressiveDetailInput = z.input<typeof GetProgressiveDetailSchema>;

/**
 * Schema for validating get_proactive_insights tool input
 */
export const GetProactiveInsightsSchema = z.object({
  conversationId: z.string().optional(),
  includeTypes: z.array(z.enum(['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments']))
    .default(['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments']),
  daysSince: z.number().min(1).max(365).default(30),
  minConfidence: z.number().min(0).max(1).default(0.6),
  limit: z.number().min(1).max(100).default(20)
});

/**
 * Schema for validating check_for_conflicts tool input
 */
export const CheckForConflictsSchema = z.object({
  conversationId: z.string().optional(),
  entityIds: z.array(z.string()).optional(),
  conflictTypes: z.array(z.enum([
    'property_contradiction', 
    'status_inconsistency', 
    'temporal_impossibility', 
    'relationship_conflict', 
    'existence_dispute', 
    'identity_confusion', 
    'authority_disagreement'
  ])).default(['property_contradiction', 'status_inconsistency', 'temporal_impossibility', 'relationship_conflict']),
  minSeverity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  maxAge: z.number().min(1).max(365).default(90),
  includeResolutions: z.boolean().default(true),
  limit: z.number().min(1).max(100).default(20)
});

/**
 * Schema for validating suggest_relevant_context tool input
 */
export const SuggestRelevantContextSchema = z.object({
  currentConversationId: z.string().optional(),
  currentEntities: z.array(z.string()).optional(),
  contextTypes: z.array(z.enum([
    'related_conversation', 
    'expert_insight', 
    'similar_context', 
    'temporal_connection', 
    'relationship_network', 
    'follow_up_needed', 
    'missing_information', 
    'contradiction_alert'
  ])).default(['related_conversation', 'expert_insight', 'similar_context', 'contradiction_alert']),
  maxHistoryAge: z.number().min(1).max(365).default(90),
  minRelevanceScore: z.number().min(0).max(1).default(0.4),
  maxTokens: z.number().min(100).max(16000).default(4000),
  includeExperts: z.boolean().default(true),
  includeMessages: z.boolean().default(true),
  limit: z.number().min(1).max(50).default(10)
});

/**
 * Schema for validating auto_tag_conversation tool input
 */
export const AutoTagConversationSchema = z.object({
  conversationId: z.string().min(1, 'Conversation ID cannot be empty'),
  analysisTypes: z.array(z.enum(['topic_tags', 'activity_classification', 'urgency_analysis', 'project_contexts']))
    .default(['topic_tags', 'activity_classification', 'urgency_analysis', 'project_contexts']),
  config: z.object({
    minEntityRelevance: z.number().min(0).max(1).default(0.3),
    maxTopicTags: z.number().min(1).max(20).default(5),
    minProjectConfidence: z.number().min(0).max(1).default(0.6),
    urgencyKeywords: z.array(z.string()).optional()
  }).optional(),
  updateConversation: z.boolean().default(false),
  returnAnalysis: z.boolean().default(true)
});

export type GetProactiveInsightsInput = z.infer<typeof GetProactiveInsightsSchema>;
export type CheckForConflictsInput = z.infer<typeof CheckForConflictsSchema>;
export type SuggestRelevantContextInput = z.infer<typeof SuggestRelevantContextSchema>;
export type AutoTagConversationInput = z.infer<typeof AutoTagConversationSchema>;
export type ConversationData = z.infer<typeof ConversationDataSchema>;
export type PersistenceServerConfigInput = z.infer<typeof PersistenceServerConfigSchema>;

/**
 * Schema for validating get_conversation_analytics tool input
 */
export const GetConversationAnalyticsSchema = z.object({
  /** ID of the conversation to analyze */
  conversationId: z.string().min(1, 'Conversation ID cannot be empty'),
  /** Include detailed flow metrics */
  includeFlowMetrics: z.boolean().default(true),
  /** Include productivity metrics */
  includeProductivityMetrics: z.boolean().default(true),
  /** Include knowledge gap analysis */
  includeKnowledgeGaps: z.boolean().default(false),
  /** Include decision tracking */
  includeDecisionTracking: z.boolean().default(false)
});

/**
 * Schema for validating analyze_productivity_patterns tool input
 */
export const AnalyzeProductivityPatternsSchema = z.object({
  /** Start date for analysis (ISO 8601 string) */
  startDate: z.string().datetime().optional(),
  /** End date for analysis (ISO 8601 string) */
  endDate: z.string().datetime().optional(),
  /** Conversation IDs to analyze (if not provided, analyzes all) */
  conversationIds: z.array(z.string()).optional(),
  /** Granularity for time-based patterns */
  granularity: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  /** Include peak hour analysis */
  includePeakHours: z.boolean().default(true),
  /** Include session length analysis */
  includeSessionAnalysis: z.boolean().default(true),
  /** Include question pattern analysis */
  includeQuestionPatterns: z.boolean().default(true)
});

/**
 * Schema for validating detect_knowledge_gaps tool input
 */
export const DetectKnowledgeGapsSchema = z.object({
  /** Start date for analysis (ISO 8601 string) */
  startDate: z.string().datetime().optional(),
  /** End date for analysis (ISO 8601 string) */
  endDate: z.string().datetime().optional(),
  /** Minimum frequency threshold for gaps */
  minFrequency: z.number().min(1).default(2),
  /** Include resolved gaps in analysis */
  includeResolved: z.boolean().default(false),
  /** Topic areas to focus on */
  topicAreas: z.array(z.string()).optional(),
  /** Include gap resolution suggestions */
  includeSuggestions: z.boolean().default(true)
});

/**
 * Schema for validating track_decision_effectiveness tool input
 */
export const TrackDecisionEffectivenessSchema = z.object({
  /** Start date for analysis (ISO 8601 string) */
  startDate: z.string().datetime().optional(),
  /** End date for analysis (ISO 8601 string) */
  endDate: z.string().datetime().optional(),
  /** Decision types to analyze */
  decisionTypes: z.array(z.string()).optional(),
  /** Include outcome tracking */
  includeOutcomes: z.boolean().default(true),
  /** Include reversal analysis */
  includeReversals: z.boolean().default(true),
  /** Include quality metrics */
  includeQualityMetrics: z.boolean().default(true)
});

/**
 * Schema for validating generate_analytics_report tool input
 */
export const GenerateAnalyticsReportSchema = z.object({
  /** Start date for report (ISO 8601 string) */
  startDate: z.string().datetime().optional(),
  /** End date for report (ISO 8601 string) */
  endDate: z.string().datetime().optional(),
  /** Report format */
  format: z.enum(['summary', 'detailed', 'executive']).default('summary'),
  /** Sections to include in report */
  sections: z.array(z.enum([
    'conversation_metrics',
    'productivity_insights',
    'knowledge_gaps',
    'decision_quality',
    'recommendations'
  ])).default(['conversation_metrics', 'productivity_insights']),
  /** Include charts and visualizations */
  includeCharts: z.boolean().default(false),
  /** Include raw data */
  includeRawData: z.boolean().default(false)
});

export type GetConversationAnalyticsInput = z.infer<typeof GetConversationAnalyticsSchema>;
export type AnalyzeProductivityPatternsInput = z.infer<typeof AnalyzeProductivityPatternsSchema>;
export type DetectKnowledgeGapsInput = z.infer<typeof DetectKnowledgeGapsSchema>;
export type TrackDecisionEffectivenessInput = z.infer<typeof TrackDecisionEffectivenessSchema>;
export type GenerateAnalyticsReportInput = z.infer<typeof GenerateAnalyticsReportSchema>;

/**
 * Union type of all possible tool input schemas
 */
export const ToolInputSchema = z.union([
  SaveMessageSchema,
  SearchMessagesSchema,
  GetConversationSchema,
  GetConversationsSchema,
  DeleteConversationSchema,
  DeleteMessageSchema,
  UpdateConversationSchema,
  UpdateMessageSchema,
  ExportConversationsSchema,
  ImportConversationsSchema,
  GetDatabaseStatsSchema,
  OptimizeDatabaseSchema,
  SetRetentionPolicySchema,
  GenerateEmbeddingsSchema,
  GetRelevantSnippetsSchema,
  ConfigureLLMProviderSchema,
  GetProgressiveDetailSchema,
  GetProactiveInsightsSchema,
  CheckForConflictsSchema,
  SuggestRelevantContextSchema,
  AutoTagConversationSchema,
  GetConversationAnalyticsSchema,
  AnalyzeProductivityPatternsSchema,
  DetectKnowledgeGapsSchema,
  TrackDecisionEffectivenessSchema,
  GenerateAnalyticsReportSchema
]);

export type ToolInput = z.infer<typeof ToolInputSchema>;