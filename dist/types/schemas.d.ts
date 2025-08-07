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
export declare const MessageRoleSchema: z.ZodEnum<["user", "assistant", "system"]>;
/**
 * Schema for export formats
 */
export declare const ExportFormatSchema: z.ZodEnum<["json", "markdown", "csv"]>;
/**
 * Schema for search match types
 */
export declare const MatchTypeSchema: z.ZodEnum<["fuzzy", "exact", "prefix"]>;
/**
 * Schema for log levels
 */
export declare const LogLevelSchema: z.ZodEnum<["debug", "info", "warn", "error"]>;
/**
 * Schema for validating save_message tool input
 */
export declare const SaveMessageSchema: z.ZodObject<{
    /** Optional conversation ID - if not provided, a new conversation will be created */
    conversationId: z.ZodOptional<z.ZodString>;
    /** Role of the message sender */
    role: z.ZodEnum<["user", "assistant", "system"]>;
    /** Content of the message */
    content: z.ZodString;
    /** Optional parent message ID for threading */
    parentMessageId: z.ZodOptional<z.ZodString>;
    /** Optional metadata as key-value pairs */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    role?: "user" | "assistant" | "system";
    content?: string;
    parentMessageId?: string;
    metadata?: Record<string, any>;
}, {
    conversationId?: string;
    role?: "user" | "assistant" | "system";
    content?: string;
    parentMessageId?: string;
    metadata?: Record<string, any>;
}>;
/**
 * Schema for validating search_messages tool input
 */
export declare const SearchMessagesSchema: z.ZodObject<{
    /** Search query string */
    query: z.ZodString;
    /** Optional conversation ID to limit search scope */
    conversationId: z.ZodOptional<z.ZodString>;
    /** Maximum number of results to return */
    limit: z.ZodDefault<z.ZodNumber>;
    /** Number of results to skip for pagination */
    offset: z.ZodDefault<z.ZodNumber>;
    /** Start date for time-based filtering (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for time-based filtering (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Type of matching to perform */
    matchType: z.ZodDefault<z.ZodEnum<["fuzzy", "exact", "prefix"]>>;
    /** Start marker for highlighting matches */
    highlightStart: z.ZodDefault<z.ZodString>;
    /** End marker for highlighting matches */
    highlightEnd: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    query?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    matchType?: "fuzzy" | "exact" | "prefix";
    highlightStart?: string;
    highlightEnd?: string;
}, {
    conversationId?: string;
    query?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    matchType?: "fuzzy" | "exact" | "prefix";
    highlightStart?: string;
    highlightEnd?: string;
}>;
/**
 * Schema for validating get_conversation tool input
 */
export declare const GetConversationSchema: z.ZodObject<{
    /** ID of the conversation to retrieve */
    conversationId: z.ZodString;
    /** Whether to include messages in the response */
    includeMessages: z.ZodDefault<z.ZodBoolean>;
    /** Maximum number of messages to return */
    messageLimit: z.ZodDefault<z.ZodNumber>;
    /** Return messages before this message ID (for pagination) */
    beforeMessageId: z.ZodOptional<z.ZodString>;
    /** Return messages after this message ID (for pagination) */
    afterMessageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    includeMessages?: boolean;
    messageLimit?: number;
    beforeMessageId?: string;
    afterMessageId?: string;
}, {
    conversationId?: string;
    includeMessages?: boolean;
    messageLimit?: number;
    beforeMessageId?: string;
    afterMessageId?: string;
}>;
/**
 * Schema for validating get_conversations tool input
 */
export declare const GetConversationsSchema: z.ZodObject<{
    /** Maximum number of conversations to return */
    limit: z.ZodDefault<z.ZodNumber>;
    /** Number of conversations to skip for pagination */
    offset: z.ZodDefault<z.ZodNumber>;
    /** Start date for filtering conversations */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for filtering conversations */
    endDate: z.ZodOptional<z.ZodString>;
    /** Whether to include message counts for each conversation */
    includeMessageCounts: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    includeMessageCounts?: boolean;
}, {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    includeMessageCounts?: boolean;
}>;
/**
 * Schema for validating delete_conversation tool input
 */
export declare const DeleteConversationSchema: z.ZodObject<{
    /** ID of the conversation to delete */
    conversationId: z.ZodString;
    /** Whether to permanently delete (vs soft delete) */
    permanent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    permanent?: boolean;
}, {
    conversationId?: string;
    permanent?: boolean;
}>;
/**
 * Schema for validating delete_message tool input
 */
export declare const DeleteMessageSchema: z.ZodObject<{
    /** ID of the message to delete */
    messageId: z.ZodString;
    /** Whether to permanently delete (vs soft delete) */
    permanent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    permanent?: boolean;
    messageId?: string;
}, {
    permanent?: boolean;
    messageId?: string;
}>;
/**
 * Schema for validating update_conversation tool input
 */
export declare const UpdateConversationSchema: z.ZodObject<{
    /** ID of the conversation to update */
    conversationId: z.ZodString;
    /** New title for the conversation */
    title: z.ZodOptional<z.ZodString>;
    /** Metadata to merge with existing metadata */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    metadata?: Record<string, any>;
    title?: string;
}, {
    conversationId?: string;
    metadata?: Record<string, any>;
    title?: string;
}>;
/**
 * Schema for validating update_message tool input
 */
export declare const UpdateMessageSchema: z.ZodObject<{
    /** ID of the message to update */
    messageId: z.ZodString;
    /** New content for the message */
    content: z.ZodOptional<z.ZodString>;
    /** Metadata to merge with existing metadata */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    content?: string;
    metadata?: Record<string, any>;
    messageId?: string;
}, {
    content?: string;
    metadata?: Record<string, any>;
    messageId?: string;
}>;
/**
 * Schema for validating export_conversations tool input
 */
export declare const ExportConversationsSchema: z.ZodObject<{
    /** Format for the export */
    format: z.ZodDefault<z.ZodEnum<["json", "markdown", "csv"]>>;
    /** Optional conversation IDs to include (if not specified, exports all) */
    conversationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Start date for filtering conversations */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for filtering conversations */
    endDate: z.ZodOptional<z.ZodString>;
    /** Whether to include message metadata in the export */
    includeMetadata: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    format?: "json" | "markdown" | "csv";
    conversationIds?: string[];
    includeMetadata?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    format?: "json" | "markdown" | "csv";
    conversationIds?: string[];
    includeMetadata?: boolean;
}>;
/**
 * Schema for validating import_conversations tool input
 */
export declare const ImportConversationsSchema: z.ZodObject<{
    /** JSON string or file path containing conversations to import */
    data: z.ZodString;
    /** Whether the data parameter is a file path (vs JSON string) */
    isFilePath: z.ZodDefault<z.ZodBoolean>;
    /** Whether to overwrite existing conversations with same IDs */
    overwrite: z.ZodDefault<z.ZodBoolean>;
    /** Whether to validate conversation structure before import */
    validate: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    data?: string;
    isFilePath?: boolean;
    overwrite?: boolean;
    validate?: boolean;
}, {
    data?: string;
    isFilePath?: boolean;
    overwrite?: boolean;
    validate?: boolean;
}>;
/**
 * Schema for validating get_database_stats tool input
 */
export declare const GetDatabaseStatsSchema: z.ZodObject<{
    /** Whether to include detailed breakdown by conversation */
    includeDetails: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeDetails?: boolean;
}, {
    includeDetails?: boolean;
}>;
/**
 * Schema for validating optimize_database tool input
 */
export declare const OptimizeDatabaseSchema: z.ZodObject<{
    /** Whether to run VACUUM operation */
    vacuum: z.ZodDefault<z.ZodBoolean>;
    /** Whether to run ANALYZE operation */
    analyze: z.ZodDefault<z.ZodBoolean>;
    /** Whether to optimize FTS indexes */
    optimizeFTS: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    vacuum?: boolean;
    analyze?: boolean;
    optimizeFTS?: boolean;
}, {
    vacuum?: boolean;
    analyze?: boolean;
    optimizeFTS?: boolean;
}>;
/**
 * Schema for validating set_retention_policy tool input
 */
export declare const SetRetentionPolicySchema: z.ZodObject<{
    /** Number of days to retain conversations */
    retentionDays: z.ZodNumber;
    /** Whether to apply the policy immediately */
    applyImmediately: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    retentionDays?: number;
    applyImmediately?: boolean;
}, {
    retentionDays?: number;
    applyImmediately?: boolean;
}>;
/**
 * Schema for validating generate_embeddings tool input
 */
export declare const GenerateEmbeddingsSchema: z.ZodObject<{
    /** Optional conversation ID to limit embedding generation */
    conversationId: z.ZodOptional<z.ZodString>;
    /** Whether to regenerate existing embeddings */
    force: z.ZodDefault<z.ZodBoolean>;
    /** Maximum number of messages to process in this batch */
    batchSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    force?: boolean;
    batchSize?: number;
}, {
    conversationId?: string;
    force?: boolean;
    batchSize?: number;
}>;
/**
 * Schema for assembly strategy types
 */
export declare const AssemblyStrategySchema: z.ZodEnum<["temporal", "topical", "entity-centric", "hybrid"]>;
/**
 * Schema for validating get_relevant_snippets tool input
 */
export declare const GetRelevantSnippetsSchema: z.ZodObject<{
    /** Query to find relevant snippets for */
    query: z.ZodString;
    /** Maximum token budget for selected snippets */
    maxTokens: z.ZodDefault<z.ZodNumber>;
    /** Assembly strategy to use for context selection */
    strategy: z.ZodDefault<z.ZodEnum<["temporal", "topical", "entity-centric", "hybrid"]>>;
    /** Optional conversation IDs to limit search scope */
    conversationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Minimum relevance threshold (0-1) */
    minRelevance: z.ZodDefault<z.ZodNumber>;
    /** Include recent messages regardless of relevance */
    includeRecent: z.ZodDefault<z.ZodBoolean>;
    /** Entity names to focus on */
    focusEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Time window for context in milliseconds */
    timeWindow: z.ZodOptional<z.ZodNumber>;
    /** Model name for token counting */
    model: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    conversationIds?: string[];
    maxTokens?: number;
    strategy?: "temporal" | "topical" | "entity-centric" | "hybrid";
    minRelevance?: number;
    includeRecent?: boolean;
    focusEntities?: string[];
    timeWindow?: number;
    model?: string;
}, {
    query?: string;
    conversationIds?: string[];
    maxTokens?: number;
    strategy?: "temporal" | "topical" | "entity-centric" | "hybrid";
    minRelevance?: number;
    includeRecent?: boolean;
    focusEntities?: string[];
    timeWindow?: number;
    model?: string;
}>;
/**
 * Schema for provider operation types
 */
export declare const ProviderOperationSchema: z.ZodEnum<["add", "update", "remove", "list"]>;
/**
 * Schema for provider types
 */
export declare const ProviderTypeSchema: z.ZodEnum<["local", "external"]>;
/**
 * Schema for provider configuration
 */
export declare const ProviderConfigSchema: z.ZodObject<{
    /** Provider ID (required for update/remove operations) */
    id: z.ZodOptional<z.ZodString>;
    /** Provider name */
    name: z.ZodOptional<z.ZodString>;
    /** Provider type */
    type: z.ZodOptional<z.ZodEnum<["local", "external"]>>;
    /** API endpoint URL */
    endpoint: z.ZodOptional<z.ZodString>;
    /** Environment variable name for API key */
    apiKeyEnv: z.ZodOptional<z.ZodString>;
    /** Model name to use */
    modelName: z.ZodOptional<z.ZodString>;
    /** Maximum tokens for the model */
    maxTokens: z.ZodOptional<z.ZodNumber>;
    /** Temperature setting (0-2) */
    temperature: z.ZodOptional<z.ZodNumber>;
    /** Whether the provider is active */
    isActive: z.ZodOptional<z.ZodBoolean>;
    /** Priority for provider selection (higher = preferred) */
    priority: z.ZodOptional<z.ZodNumber>;
    /** Cost per 1000 tokens */
    costPer1kTokens: z.ZodOptional<z.ZodNumber>;
    /** Additional metadata */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    type?: "local" | "external";
    metadata?: Record<string, any>;
    maxTokens?: number;
    id?: string;
    name?: string;
    endpoint?: string;
    apiKeyEnv?: string;
    modelName?: string;
    temperature?: number;
    isActive?: boolean;
    priority?: number;
    costPer1kTokens?: number;
}, {
    type?: "local" | "external";
    metadata?: Record<string, any>;
    maxTokens?: number;
    id?: string;
    name?: string;
    endpoint?: string;
    apiKeyEnv?: string;
    modelName?: string;
    temperature?: number;
    isActive?: boolean;
    priority?: number;
    costPer1kTokens?: number;
}>;
/**
 * Schema for validating configure_llm_provider tool input
 */
export declare const ConfigureLLMProviderSchema: z.ZodEffects<z.ZodObject<{
    /** Operation to perform */
    operation: z.ZodEnum<["add", "update", "remove", "list"]>;
    /** Provider configuration (required for add/update operations) */
    config: z.ZodOptional<z.ZodObject<{
        /** Provider ID (required for update/remove operations) */
        id: z.ZodOptional<z.ZodString>;
        /** Provider name */
        name: z.ZodOptional<z.ZodString>;
        /** Provider type */
        type: z.ZodOptional<z.ZodEnum<["local", "external"]>>;
        /** API endpoint URL */
        endpoint: z.ZodOptional<z.ZodString>;
        /** Environment variable name for API key */
        apiKeyEnv: z.ZodOptional<z.ZodString>;
        /** Model name to use */
        modelName: z.ZodOptional<z.ZodString>;
        /** Maximum tokens for the model */
        maxTokens: z.ZodOptional<z.ZodNumber>;
        /** Temperature setting (0-2) */
        temperature: z.ZodOptional<z.ZodNumber>;
        /** Whether the provider is active */
        isActive: z.ZodOptional<z.ZodBoolean>;
        /** Priority for provider selection (higher = preferred) */
        priority: z.ZodOptional<z.ZodNumber>;
        /** Cost per 1000 tokens */
        costPer1kTokens: z.ZodOptional<z.ZodNumber>;
        /** Additional metadata */
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    }, {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    operation?: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    };
}, {
    operation?: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    };
}>, {
    operation?: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    };
}, {
    operation?: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    };
}>;
/**
 * Schema for conversation data structure (used in imports/exports)
 */
export declare const ConversationDataSchema: z.ZodObject<{
    id: z.ZodString;
    createdAt: z.ZodNumber;
    updatedAt: z.ZodNumber;
    title: z.ZodOptional<z.ZodString>;
    metadata: z.ZodRecord<z.ZodString, z.ZodAny>;
    messages: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        conversationId: z.ZodString;
        role: z.ZodEnum<["user", "assistant", "system"]>;
        content: z.ZodString;
        createdAt: z.ZodNumber;
        parentMessageId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        conversationId?: string;
        role?: "user" | "assistant" | "system";
        content?: string;
        parentMessageId?: string;
        metadata?: Record<string, any>;
        id?: string;
        createdAt?: number;
    }, {
        conversationId?: string;
        role?: "user" | "assistant" | "system";
        content?: string;
        parentMessageId?: string;
        metadata?: Record<string, any>;
        id?: string;
        createdAt?: number;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    metadata?: Record<string, any>;
    title?: string;
    id?: string;
    createdAt?: number;
    updatedAt?: number;
    messages?: {
        conversationId?: string;
        role?: "user" | "assistant" | "system";
        content?: string;
        parentMessageId?: string;
        metadata?: Record<string, any>;
        id?: string;
        createdAt?: number;
    }[];
}, {
    metadata?: Record<string, any>;
    title?: string;
    id?: string;
    createdAt?: number;
    updatedAt?: number;
    messages?: {
        conversationId?: string;
        role?: "user" | "assistant" | "system";
        content?: string;
        parentMessageId?: string;
        metadata?: Record<string, any>;
        id?: string;
        createdAt?: number;
    }[];
}>;
/**
 * Schema for server configuration
 */
export declare const PersistenceServerConfigSchema: z.ZodObject<{
    databasePath: z.ZodString;
    maxDatabaseSizeMB: z.ZodDefault<z.ZodNumber>;
    maxConversationAgeDays: z.ZodDefault<z.ZodNumber>;
    maxMessagesPerConversation: z.ZodDefault<z.ZodNumber>;
    enableEmbeddings: z.ZodDefault<z.ZodBoolean>;
    embeddingModel: z.ZodOptional<z.ZodString>;
    enableAutoSummarization: z.ZodDefault<z.ZodBoolean>;
    vacuumInterval: z.ZodDefault<z.ZodNumber>;
    checkpointInterval: z.ZodDefault<z.ZodNumber>;
    encryptionEnabled: z.ZodDefault<z.ZodBoolean>;
    defaultRetentionDays: z.ZodDefault<z.ZodNumber>;
    logLevel: z.ZodDefault<z.ZodEnum<["debug", "info", "warn", "error"]>>;
}, "strip", z.ZodTypeAny, {
    databasePath?: string;
    maxDatabaseSizeMB?: number;
    maxConversationAgeDays?: number;
    maxMessagesPerConversation?: number;
    enableEmbeddings?: boolean;
    embeddingModel?: string;
    enableAutoSummarization?: boolean;
    vacuumInterval?: number;
    checkpointInterval?: number;
    encryptionEnabled?: boolean;
    defaultRetentionDays?: number;
    logLevel?: "debug" | "info" | "warn" | "error";
}, {
    databasePath?: string;
    maxDatabaseSizeMB?: number;
    maxConversationAgeDays?: number;
    maxMessagesPerConversation?: number;
    enableEmbeddings?: boolean;
    embeddingModel?: string;
    enableAutoSummarization?: boolean;
    vacuumInterval?: number;
    checkpointInterval?: number;
    encryptionEnabled?: boolean;
    defaultRetentionDays?: number;
    logLevel?: "debug" | "info" | "warn" | "error";
}>;
export type SaveMessageInput = z.infer<typeof SaveMessageSchema>;
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
export declare const GetProgressiveDetailSchema: z.ZodObject<{
    conversationId: z.ZodString;
    level: z.ZodOptional<z.ZodEnum<["brief", "standard", "detailed", "full"]>>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    focusMessageId: z.ZodOptional<z.ZodString>;
    expandContext: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    maxTokens?: number;
    level?: "brief" | "standard" | "detailed" | "full";
    focusMessageId?: string;
    expandContext?: boolean;
}, {
    conversationId?: string;
    maxTokens?: number;
    level?: "brief" | "standard" | "detailed" | "full";
    focusMessageId?: string;
    expandContext?: boolean;
}>;
export type GetProgressiveDetailInput = z.input<typeof GetProgressiveDetailSchema>;
/**
 * Schema for validating get_proactive_insights tool input
 */
export declare const GetProactiveInsightsSchema: z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    includeTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["unresolved_actions", "recurring_questions", "knowledge_gaps", "stale_commitments"]>, "many">>;
    daysSince: z.ZodDefault<z.ZodNumber>;
    minConfidence: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    limit?: number;
    includeTypes?: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[];
    daysSince?: number;
    minConfidence?: number;
}, {
    conversationId?: string;
    limit?: number;
    includeTypes?: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[];
    daysSince?: number;
    minConfidence?: number;
}>;
/**
 * Schema for validating check_for_conflicts tool input
 */
export declare const CheckForConflictsSchema: z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    entityIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    conflictTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["property_contradiction", "status_inconsistency", "temporal_impossibility", "relationship_conflict", "existence_dispute", "identity_confusion", "authority_disagreement"]>, "many">>;
    minSeverity: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    maxAge: z.ZodDefault<z.ZodNumber>;
    includeResolutions: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    limit?: number;
    entityIds?: string[];
    conflictTypes?: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[];
    minSeverity?: "low" | "medium" | "high" | "critical";
    maxAge?: number;
    includeResolutions?: boolean;
}, {
    conversationId?: string;
    limit?: number;
    entityIds?: string[];
    conflictTypes?: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[];
    minSeverity?: "low" | "medium" | "high" | "critical";
    maxAge?: number;
    includeResolutions?: boolean;
}>;
/**
 * Schema for validating suggest_relevant_context tool input
 */
export declare const SuggestRelevantContextSchema: z.ZodObject<{
    currentConversationId: z.ZodOptional<z.ZodString>;
    currentEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    contextTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["related_conversation", "expert_insight", "similar_context", "temporal_connection", "relationship_network", "follow_up_needed", "missing_information", "contradiction_alert"]>, "many">>;
    maxHistoryAge: z.ZodDefault<z.ZodNumber>;
    minRelevanceScore: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    includeExperts: z.ZodDefault<z.ZodBoolean>;
    includeMessages: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    includeMessages?: boolean;
    maxTokens?: number;
    currentConversationId?: string;
    currentEntities?: string[];
    contextTypes?: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[];
    maxHistoryAge?: number;
    minRelevanceScore?: number;
    includeExperts?: boolean;
}, {
    limit?: number;
    includeMessages?: boolean;
    maxTokens?: number;
    currentConversationId?: string;
    currentEntities?: string[];
    contextTypes?: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[];
    maxHistoryAge?: number;
    minRelevanceScore?: number;
    includeExperts?: boolean;
}>;
/**
 * Schema for validating auto_tag_conversation tool input
 */
export declare const AutoTagConversationSchema: z.ZodObject<{
    conversationId: z.ZodString;
    analysisTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["topic_tags", "activity_classification", "urgency_analysis", "project_contexts"]>, "many">>;
    config: z.ZodOptional<z.ZodObject<{
        minEntityRelevance: z.ZodDefault<z.ZodNumber>;
        maxTopicTags: z.ZodDefault<z.ZodNumber>;
        minProjectConfidence: z.ZodDefault<z.ZodNumber>;
        urgencyKeywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        minEntityRelevance?: number;
        maxTopicTags?: number;
        minProjectConfidence?: number;
        urgencyKeywords?: string[];
    }, {
        minEntityRelevance?: number;
        maxTopicTags?: number;
        minProjectConfidence?: number;
        urgencyKeywords?: string[];
    }>>;
    updateConversation: z.ZodDefault<z.ZodBoolean>;
    returnAnalysis: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    config?: {
        minEntityRelevance?: number;
        maxTopicTags?: number;
        minProjectConfidence?: number;
        urgencyKeywords?: string[];
    };
    analysisTypes?: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[];
    updateConversation?: boolean;
    returnAnalysis?: boolean;
}, {
    conversationId?: string;
    config?: {
        minEntityRelevance?: number;
        maxTopicTags?: number;
        minProjectConfidence?: number;
        urgencyKeywords?: string[];
    };
    analysisTypes?: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[];
    updateConversation?: boolean;
    returnAnalysis?: boolean;
}>;
export type GetProactiveInsightsInput = z.infer<typeof GetProactiveInsightsSchema>;
export type CheckForConflictsInput = z.infer<typeof CheckForConflictsSchema>;
export type SuggestRelevantContextInput = z.infer<typeof SuggestRelevantContextSchema>;
export type AutoTagConversationInput = z.infer<typeof AutoTagConversationSchema>;
export type ConversationData = z.infer<typeof ConversationDataSchema>;
export type PersistenceServerConfigInput = z.infer<typeof PersistenceServerConfigSchema>;
/**
 * Schema for validating get_conversation_analytics tool input
 */
export declare const GetConversationAnalyticsSchema: z.ZodObject<{
    /** ID of the conversation to analyze */
    conversationId: z.ZodString;
    /** Include detailed flow metrics */
    includeFlowMetrics: z.ZodDefault<z.ZodBoolean>;
    /** Include productivity metrics */
    includeProductivityMetrics: z.ZodDefault<z.ZodBoolean>;
    /** Include knowledge gap analysis */
    includeKnowledgeGaps: z.ZodDefault<z.ZodBoolean>;
    /** Include decision tracking */
    includeDecisionTracking: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    includeFlowMetrics?: boolean;
    includeProductivityMetrics?: boolean;
    includeKnowledgeGaps?: boolean;
    includeDecisionTracking?: boolean;
}, {
    conversationId?: string;
    includeFlowMetrics?: boolean;
    includeProductivityMetrics?: boolean;
    includeKnowledgeGaps?: boolean;
    includeDecisionTracking?: boolean;
}>;
/**
 * Schema for validating analyze_productivity_patterns tool input
 */
export declare const AnalyzeProductivityPatternsSchema: z.ZodObject<{
    /** Start date for analysis (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for analysis (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Conversation IDs to analyze (if not provided, analyzes all) */
    conversationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Granularity for time-based patterns */
    granularity: z.ZodDefault<z.ZodEnum<["hour", "day", "week", "month"]>>;
    /** Include peak hour analysis */
    includePeakHours: z.ZodDefault<z.ZodBoolean>;
    /** Include session length analysis */
    includeSessionAnalysis: z.ZodDefault<z.ZodBoolean>;
    /** Include question pattern analysis */
    includeQuestionPatterns: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    conversationIds?: string[];
    granularity?: "hour" | "day" | "week" | "month";
    includePeakHours?: boolean;
    includeSessionAnalysis?: boolean;
    includeQuestionPatterns?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    conversationIds?: string[];
    granularity?: "hour" | "day" | "week" | "month";
    includePeakHours?: boolean;
    includeSessionAnalysis?: boolean;
    includeQuestionPatterns?: boolean;
}>;
/**
 * Schema for validating detect_knowledge_gaps tool input
 */
export declare const DetectKnowledgeGapsSchema: z.ZodObject<{
    /** Start date for analysis (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for analysis (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Minimum frequency threshold for gaps */
    minFrequency: z.ZodDefault<z.ZodNumber>;
    /** Include resolved gaps in analysis */
    includeResolved: z.ZodDefault<z.ZodBoolean>;
    /** Topic areas to focus on */
    topicAreas: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Include gap resolution suggestions */
    includeSuggestions: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    minFrequency?: number;
    includeResolved?: boolean;
    topicAreas?: string[];
    includeSuggestions?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    minFrequency?: number;
    includeResolved?: boolean;
    topicAreas?: string[];
    includeSuggestions?: boolean;
}>;
/**
 * Schema for validating track_decision_effectiveness tool input
 */
export declare const TrackDecisionEffectivenessSchema: z.ZodObject<{
    /** Start date for analysis (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for analysis (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Decision types to analyze */
    decisionTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Include outcome tracking */
    includeOutcomes: z.ZodDefault<z.ZodBoolean>;
    /** Include reversal analysis */
    includeReversals: z.ZodDefault<z.ZodBoolean>;
    /** Include quality metrics */
    includeQualityMetrics: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    decisionTypes?: string[];
    includeOutcomes?: boolean;
    includeReversals?: boolean;
    includeQualityMetrics?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    decisionTypes?: string[];
    includeOutcomes?: boolean;
    includeReversals?: boolean;
    includeQualityMetrics?: boolean;
}>;
/**
 * Schema for validating generate_analytics_report tool input
 */
export declare const GenerateAnalyticsReportSchema: z.ZodObject<{
    /** Start date for report (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for report (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Report format */
    format: z.ZodDefault<z.ZodEnum<["summary", "detailed", "executive"]>>;
    /** Sections to include in report */
    sections: z.ZodDefault<z.ZodArray<z.ZodEnum<["conversation_metrics", "productivity_insights", "knowledge_gaps", "decision_quality", "recommendations"]>, "many">>;
    /** Include charts and visualizations */
    includeCharts: z.ZodDefault<z.ZodBoolean>;
    /** Include raw data */
    includeRawData: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    format?: "detailed" | "summary" | "executive";
    sections?: ("knowledge_gaps" | "conversation_metrics" | "productivity_insights" | "decision_quality" | "recommendations")[];
    includeCharts?: boolean;
    includeRawData?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    format?: "detailed" | "summary" | "executive";
    sections?: ("knowledge_gaps" | "conversation_metrics" | "productivity_insights" | "decision_quality" | "recommendations")[];
    includeCharts?: boolean;
    includeRawData?: boolean;
}>;
export type GetConversationAnalyticsInput = z.infer<typeof GetConversationAnalyticsSchema>;
export type AnalyzeProductivityPatternsInput = z.infer<typeof AnalyzeProductivityPatternsSchema>;
export type DetectKnowledgeGapsInput = z.infer<typeof DetectKnowledgeGapsSchema>;
export type TrackDecisionEffectivenessInput = z.infer<typeof TrackDecisionEffectivenessSchema>;
export type GenerateAnalyticsReportInput = z.infer<typeof GenerateAnalyticsReportSchema>;
/**
 * Union type of all possible tool input schemas
 */
export declare const ToolInputSchema: z.ZodUnion<[z.ZodObject<{
    /** Optional conversation ID - if not provided, a new conversation will be created */
    conversationId: z.ZodOptional<z.ZodString>;
    /** Role of the message sender */
    role: z.ZodEnum<["user", "assistant", "system"]>;
    /** Content of the message */
    content: z.ZodString;
    /** Optional parent message ID for threading */
    parentMessageId: z.ZodOptional<z.ZodString>;
    /** Optional metadata as key-value pairs */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    role?: "user" | "assistant" | "system";
    content?: string;
    parentMessageId?: string;
    metadata?: Record<string, any>;
}, {
    conversationId?: string;
    role?: "user" | "assistant" | "system";
    content?: string;
    parentMessageId?: string;
    metadata?: Record<string, any>;
}>, z.ZodObject<{
    /** Search query string */
    query: z.ZodString;
    /** Optional conversation ID to limit search scope */
    conversationId: z.ZodOptional<z.ZodString>;
    /** Maximum number of results to return */
    limit: z.ZodDefault<z.ZodNumber>;
    /** Number of results to skip for pagination */
    offset: z.ZodDefault<z.ZodNumber>;
    /** Start date for time-based filtering (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for time-based filtering (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Type of matching to perform */
    matchType: z.ZodDefault<z.ZodEnum<["fuzzy", "exact", "prefix"]>>;
    /** Start marker for highlighting matches */
    highlightStart: z.ZodDefault<z.ZodString>;
    /** End marker for highlighting matches */
    highlightEnd: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    query?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    matchType?: "fuzzy" | "exact" | "prefix";
    highlightStart?: string;
    highlightEnd?: string;
}, {
    conversationId?: string;
    query?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    matchType?: "fuzzy" | "exact" | "prefix";
    highlightStart?: string;
    highlightEnd?: string;
}>, z.ZodObject<{
    /** ID of the conversation to retrieve */
    conversationId: z.ZodString;
    /** Whether to include messages in the response */
    includeMessages: z.ZodDefault<z.ZodBoolean>;
    /** Maximum number of messages to return */
    messageLimit: z.ZodDefault<z.ZodNumber>;
    /** Return messages before this message ID (for pagination) */
    beforeMessageId: z.ZodOptional<z.ZodString>;
    /** Return messages after this message ID (for pagination) */
    afterMessageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    includeMessages?: boolean;
    messageLimit?: number;
    beforeMessageId?: string;
    afterMessageId?: string;
}, {
    conversationId?: string;
    includeMessages?: boolean;
    messageLimit?: number;
    beforeMessageId?: string;
    afterMessageId?: string;
}>, z.ZodObject<{
    /** Maximum number of conversations to return */
    limit: z.ZodDefault<z.ZodNumber>;
    /** Number of conversations to skip for pagination */
    offset: z.ZodDefault<z.ZodNumber>;
    /** Start date for filtering conversations */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for filtering conversations */
    endDate: z.ZodOptional<z.ZodString>;
    /** Whether to include message counts for each conversation */
    includeMessageCounts: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    includeMessageCounts?: boolean;
}, {
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
    includeMessageCounts?: boolean;
}>, z.ZodObject<{
    /** ID of the conversation to delete */
    conversationId: z.ZodString;
    /** Whether to permanently delete (vs soft delete) */
    permanent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    permanent?: boolean;
}, {
    conversationId?: string;
    permanent?: boolean;
}>, z.ZodObject<{
    /** ID of the message to delete */
    messageId: z.ZodString;
    /** Whether to permanently delete (vs soft delete) */
    permanent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    permanent?: boolean;
    messageId?: string;
}, {
    permanent?: boolean;
    messageId?: string;
}>, z.ZodObject<{
    /** ID of the conversation to update */
    conversationId: z.ZodString;
    /** New title for the conversation */
    title: z.ZodOptional<z.ZodString>;
    /** Metadata to merge with existing metadata */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    metadata?: Record<string, any>;
    title?: string;
}, {
    conversationId?: string;
    metadata?: Record<string, any>;
    title?: string;
}>, z.ZodObject<{
    /** ID of the message to update */
    messageId: z.ZodString;
    /** New content for the message */
    content: z.ZodOptional<z.ZodString>;
    /** Metadata to merge with existing metadata */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    content?: string;
    metadata?: Record<string, any>;
    messageId?: string;
}, {
    content?: string;
    metadata?: Record<string, any>;
    messageId?: string;
}>, z.ZodObject<{
    /** Format for the export */
    format: z.ZodDefault<z.ZodEnum<["json", "markdown", "csv"]>>;
    /** Optional conversation IDs to include (if not specified, exports all) */
    conversationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Start date for filtering conversations */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for filtering conversations */
    endDate: z.ZodOptional<z.ZodString>;
    /** Whether to include message metadata in the export */
    includeMetadata: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    format?: "json" | "markdown" | "csv";
    conversationIds?: string[];
    includeMetadata?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    format?: "json" | "markdown" | "csv";
    conversationIds?: string[];
    includeMetadata?: boolean;
}>, z.ZodObject<{
    /** JSON string or file path containing conversations to import */
    data: z.ZodString;
    /** Whether the data parameter is a file path (vs JSON string) */
    isFilePath: z.ZodDefault<z.ZodBoolean>;
    /** Whether to overwrite existing conversations with same IDs */
    overwrite: z.ZodDefault<z.ZodBoolean>;
    /** Whether to validate conversation structure before import */
    validate: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    data?: string;
    isFilePath?: boolean;
    overwrite?: boolean;
    validate?: boolean;
}, {
    data?: string;
    isFilePath?: boolean;
    overwrite?: boolean;
    validate?: boolean;
}>, z.ZodObject<{
    /** Whether to include detailed breakdown by conversation */
    includeDetails: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeDetails?: boolean;
}, {
    includeDetails?: boolean;
}>, z.ZodObject<{
    /** Whether to run VACUUM operation */
    vacuum: z.ZodDefault<z.ZodBoolean>;
    /** Whether to run ANALYZE operation */
    analyze: z.ZodDefault<z.ZodBoolean>;
    /** Whether to optimize FTS indexes */
    optimizeFTS: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    vacuum?: boolean;
    analyze?: boolean;
    optimizeFTS?: boolean;
}, {
    vacuum?: boolean;
    analyze?: boolean;
    optimizeFTS?: boolean;
}>, z.ZodObject<{
    /** Number of days to retain conversations */
    retentionDays: z.ZodNumber;
    /** Whether to apply the policy immediately */
    applyImmediately: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    retentionDays?: number;
    applyImmediately?: boolean;
}, {
    retentionDays?: number;
    applyImmediately?: boolean;
}>, z.ZodObject<{
    /** Optional conversation ID to limit embedding generation */
    conversationId: z.ZodOptional<z.ZodString>;
    /** Whether to regenerate existing embeddings */
    force: z.ZodDefault<z.ZodBoolean>;
    /** Maximum number of messages to process in this batch */
    batchSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    force?: boolean;
    batchSize?: number;
}, {
    conversationId?: string;
    force?: boolean;
    batchSize?: number;
}>, z.ZodObject<{
    /** Query to find relevant snippets for */
    query: z.ZodString;
    /** Maximum token budget for selected snippets */
    maxTokens: z.ZodDefault<z.ZodNumber>;
    /** Assembly strategy to use for context selection */
    strategy: z.ZodDefault<z.ZodEnum<["temporal", "topical", "entity-centric", "hybrid"]>>;
    /** Optional conversation IDs to limit search scope */
    conversationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Minimum relevance threshold (0-1) */
    minRelevance: z.ZodDefault<z.ZodNumber>;
    /** Include recent messages regardless of relevance */
    includeRecent: z.ZodDefault<z.ZodBoolean>;
    /** Entity names to focus on */
    focusEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Time window for context in milliseconds */
    timeWindow: z.ZodOptional<z.ZodNumber>;
    /** Model name for token counting */
    model: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    query?: string;
    conversationIds?: string[];
    maxTokens?: number;
    strategy?: "temporal" | "topical" | "entity-centric" | "hybrid";
    minRelevance?: number;
    includeRecent?: boolean;
    focusEntities?: string[];
    timeWindow?: number;
    model?: string;
}, {
    query?: string;
    conversationIds?: string[];
    maxTokens?: number;
    strategy?: "temporal" | "topical" | "entity-centric" | "hybrid";
    minRelevance?: number;
    includeRecent?: boolean;
    focusEntities?: string[];
    timeWindow?: number;
    model?: string;
}>, z.ZodEffects<z.ZodObject<{
    /** Operation to perform */
    operation: z.ZodEnum<["add", "update", "remove", "list"]>;
    /** Provider configuration (required for add/update operations) */
    config: z.ZodOptional<z.ZodObject<{
        /** Provider ID (required for update/remove operations) */
        id: z.ZodOptional<z.ZodString>;
        /** Provider name */
        name: z.ZodOptional<z.ZodString>;
        /** Provider type */
        type: z.ZodOptional<z.ZodEnum<["local", "external"]>>;
        /** API endpoint URL */
        endpoint: z.ZodOptional<z.ZodString>;
        /** Environment variable name for API key */
        apiKeyEnv: z.ZodOptional<z.ZodString>;
        /** Model name to use */
        modelName: z.ZodOptional<z.ZodString>;
        /** Maximum tokens for the model */
        maxTokens: z.ZodOptional<z.ZodNumber>;
        /** Temperature setting (0-2) */
        temperature: z.ZodOptional<z.ZodNumber>;
        /** Whether the provider is active */
        isActive: z.ZodOptional<z.ZodBoolean>;
        /** Priority for provider selection (higher = preferred) */
        priority: z.ZodOptional<z.ZodNumber>;
        /** Cost per 1000 tokens */
        costPer1kTokens: z.ZodOptional<z.ZodNumber>;
        /** Additional metadata */
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    }, {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    }>>;
}, "strip", z.ZodTypeAny, {
    operation?: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    };
}, {
    operation?: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    };
}>, {
    operation?: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    };
}, {
    operation?: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external";
        metadata?: Record<string, any>;
        maxTokens?: number;
        id?: string;
        name?: string;
        endpoint?: string;
        apiKeyEnv?: string;
        modelName?: string;
        temperature?: number;
        isActive?: boolean;
        priority?: number;
        costPer1kTokens?: number;
    };
}>, z.ZodObject<{
    conversationId: z.ZodString;
    level: z.ZodOptional<z.ZodEnum<["brief", "standard", "detailed", "full"]>>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    focusMessageId: z.ZodOptional<z.ZodString>;
    expandContext: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    maxTokens?: number;
    level?: "brief" | "standard" | "detailed" | "full";
    focusMessageId?: string;
    expandContext?: boolean;
}, {
    conversationId?: string;
    maxTokens?: number;
    level?: "brief" | "standard" | "detailed" | "full";
    focusMessageId?: string;
    expandContext?: boolean;
}>, z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    includeTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["unresolved_actions", "recurring_questions", "knowledge_gaps", "stale_commitments"]>, "many">>;
    daysSince: z.ZodDefault<z.ZodNumber>;
    minConfidence: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    limit?: number;
    includeTypes?: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[];
    daysSince?: number;
    minConfidence?: number;
}, {
    conversationId?: string;
    limit?: number;
    includeTypes?: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[];
    daysSince?: number;
    minConfidence?: number;
}>, z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    entityIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    conflictTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["property_contradiction", "status_inconsistency", "temporal_impossibility", "relationship_conflict", "existence_dispute", "identity_confusion", "authority_disagreement"]>, "many">>;
    minSeverity: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    maxAge: z.ZodDefault<z.ZodNumber>;
    includeResolutions: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    limit?: number;
    entityIds?: string[];
    conflictTypes?: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[];
    minSeverity?: "low" | "medium" | "high" | "critical";
    maxAge?: number;
    includeResolutions?: boolean;
}, {
    conversationId?: string;
    limit?: number;
    entityIds?: string[];
    conflictTypes?: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[];
    minSeverity?: "low" | "medium" | "high" | "critical";
    maxAge?: number;
    includeResolutions?: boolean;
}>, z.ZodObject<{
    currentConversationId: z.ZodOptional<z.ZodString>;
    currentEntities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    contextTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["related_conversation", "expert_insight", "similar_context", "temporal_connection", "relationship_network", "follow_up_needed", "missing_information", "contradiction_alert"]>, "many">>;
    maxHistoryAge: z.ZodDefault<z.ZodNumber>;
    minRelevanceScore: z.ZodDefault<z.ZodNumber>;
    maxTokens: z.ZodDefault<z.ZodNumber>;
    includeExperts: z.ZodDefault<z.ZodBoolean>;
    includeMessages: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit?: number;
    includeMessages?: boolean;
    maxTokens?: number;
    currentConversationId?: string;
    currentEntities?: string[];
    contextTypes?: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[];
    maxHistoryAge?: number;
    minRelevanceScore?: number;
    includeExperts?: boolean;
}, {
    limit?: number;
    includeMessages?: boolean;
    maxTokens?: number;
    currentConversationId?: string;
    currentEntities?: string[];
    contextTypes?: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[];
    maxHistoryAge?: number;
    minRelevanceScore?: number;
    includeExperts?: boolean;
}>, z.ZodObject<{
    conversationId: z.ZodString;
    analysisTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["topic_tags", "activity_classification", "urgency_analysis", "project_contexts"]>, "many">>;
    config: z.ZodOptional<z.ZodObject<{
        minEntityRelevance: z.ZodDefault<z.ZodNumber>;
        maxTopicTags: z.ZodDefault<z.ZodNumber>;
        minProjectConfidence: z.ZodDefault<z.ZodNumber>;
        urgencyKeywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        minEntityRelevance?: number;
        maxTopicTags?: number;
        minProjectConfidence?: number;
        urgencyKeywords?: string[];
    }, {
        minEntityRelevance?: number;
        maxTopicTags?: number;
        minProjectConfidence?: number;
        urgencyKeywords?: string[];
    }>>;
    updateConversation: z.ZodDefault<z.ZodBoolean>;
    returnAnalysis: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    config?: {
        minEntityRelevance?: number;
        maxTopicTags?: number;
        minProjectConfidence?: number;
        urgencyKeywords?: string[];
    };
    analysisTypes?: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[];
    updateConversation?: boolean;
    returnAnalysis?: boolean;
}, {
    conversationId?: string;
    config?: {
        minEntityRelevance?: number;
        maxTopicTags?: number;
        minProjectConfidence?: number;
        urgencyKeywords?: string[];
    };
    analysisTypes?: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[];
    updateConversation?: boolean;
    returnAnalysis?: boolean;
}>, z.ZodObject<{
    /** ID of the conversation to analyze */
    conversationId: z.ZodString;
    /** Include detailed flow metrics */
    includeFlowMetrics: z.ZodDefault<z.ZodBoolean>;
    /** Include productivity metrics */
    includeProductivityMetrics: z.ZodDefault<z.ZodBoolean>;
    /** Include knowledge gap analysis */
    includeKnowledgeGaps: z.ZodDefault<z.ZodBoolean>;
    /** Include decision tracking */
    includeDecisionTracking: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId?: string;
    includeFlowMetrics?: boolean;
    includeProductivityMetrics?: boolean;
    includeKnowledgeGaps?: boolean;
    includeDecisionTracking?: boolean;
}, {
    conversationId?: string;
    includeFlowMetrics?: boolean;
    includeProductivityMetrics?: boolean;
    includeKnowledgeGaps?: boolean;
    includeDecisionTracking?: boolean;
}>, z.ZodObject<{
    /** Start date for analysis (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for analysis (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Conversation IDs to analyze (if not provided, analyzes all) */
    conversationIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Granularity for time-based patterns */
    granularity: z.ZodDefault<z.ZodEnum<["hour", "day", "week", "month"]>>;
    /** Include peak hour analysis */
    includePeakHours: z.ZodDefault<z.ZodBoolean>;
    /** Include session length analysis */
    includeSessionAnalysis: z.ZodDefault<z.ZodBoolean>;
    /** Include question pattern analysis */
    includeQuestionPatterns: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    conversationIds?: string[];
    granularity?: "hour" | "day" | "week" | "month";
    includePeakHours?: boolean;
    includeSessionAnalysis?: boolean;
    includeQuestionPatterns?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    conversationIds?: string[];
    granularity?: "hour" | "day" | "week" | "month";
    includePeakHours?: boolean;
    includeSessionAnalysis?: boolean;
    includeQuestionPatterns?: boolean;
}>, z.ZodObject<{
    /** Start date for analysis (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for analysis (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Minimum frequency threshold for gaps */
    minFrequency: z.ZodDefault<z.ZodNumber>;
    /** Include resolved gaps in analysis */
    includeResolved: z.ZodDefault<z.ZodBoolean>;
    /** Topic areas to focus on */
    topicAreas: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Include gap resolution suggestions */
    includeSuggestions: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    minFrequency?: number;
    includeResolved?: boolean;
    topicAreas?: string[];
    includeSuggestions?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    minFrequency?: number;
    includeResolved?: boolean;
    topicAreas?: string[];
    includeSuggestions?: boolean;
}>, z.ZodObject<{
    /** Start date for analysis (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for analysis (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Decision types to analyze */
    decisionTypes: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    /** Include outcome tracking */
    includeOutcomes: z.ZodDefault<z.ZodBoolean>;
    /** Include reversal analysis */
    includeReversals: z.ZodDefault<z.ZodBoolean>;
    /** Include quality metrics */
    includeQualityMetrics: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    decisionTypes?: string[];
    includeOutcomes?: boolean;
    includeReversals?: boolean;
    includeQualityMetrics?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    decisionTypes?: string[];
    includeOutcomes?: boolean;
    includeReversals?: boolean;
    includeQualityMetrics?: boolean;
}>, z.ZodObject<{
    /** Start date for report (ISO 8601 string) */
    startDate: z.ZodOptional<z.ZodString>;
    /** End date for report (ISO 8601 string) */
    endDate: z.ZodOptional<z.ZodString>;
    /** Report format */
    format: z.ZodDefault<z.ZodEnum<["summary", "detailed", "executive"]>>;
    /** Sections to include in report */
    sections: z.ZodDefault<z.ZodArray<z.ZodEnum<["conversation_metrics", "productivity_insights", "knowledge_gaps", "decision_quality", "recommendations"]>, "many">>;
    /** Include charts and visualizations */
    includeCharts: z.ZodDefault<z.ZodBoolean>;
    /** Include raw data */
    includeRawData: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    startDate?: string;
    endDate?: string;
    format?: "detailed" | "summary" | "executive";
    sections?: ("knowledge_gaps" | "conversation_metrics" | "productivity_insights" | "decision_quality" | "recommendations")[];
    includeCharts?: boolean;
    includeRawData?: boolean;
}, {
    startDate?: string;
    endDate?: string;
    format?: "detailed" | "summary" | "executive";
    sections?: ("knowledge_gaps" | "conversation_metrics" | "productivity_insights" | "decision_quality" | "recommendations")[];
    includeCharts?: boolean;
    includeRawData?: boolean;
}>]>;
export type ToolInput = z.infer<typeof ToolInputSchema>;
//# sourceMappingURL=schemas.d.ts.map