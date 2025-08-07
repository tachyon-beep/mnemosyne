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
    role: "user" | "assistant" | "system";
    content: string;
    conversationId?: string | undefined;
    parentMessageId?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    role: "user" | "assistant" | "system";
    content: string;
    conversationId?: string | undefined;
    parentMessageId?: string | undefined;
    metadata?: Record<string, any> | undefined;
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
    query: string;
    limit: number;
    offset: number;
    matchType: "fuzzy" | "exact" | "prefix";
    highlightStart: string;
    highlightEnd: string;
    conversationId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    query: string;
    conversationId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    matchType?: "fuzzy" | "exact" | "prefix" | undefined;
    highlightStart?: string | undefined;
    highlightEnd?: string | undefined;
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
    conversationId: string;
    includeMessages: boolean;
    messageLimit: number;
    beforeMessageId?: string | undefined;
    afterMessageId?: string | undefined;
}, {
    conversationId: string;
    includeMessages?: boolean | undefined;
    messageLimit?: number | undefined;
    beforeMessageId?: string | undefined;
    afterMessageId?: string | undefined;
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
    limit: number;
    offset: number;
    includeMessageCounts: boolean;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    includeMessageCounts?: boolean | undefined;
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
    conversationId: string;
    permanent: boolean;
}, {
    conversationId: string;
    permanent?: boolean | undefined;
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
    permanent: boolean;
    messageId: string;
}, {
    messageId: string;
    permanent?: boolean | undefined;
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
    conversationId: string;
    metadata?: Record<string, any> | undefined;
    title?: string | undefined;
}, {
    conversationId: string;
    metadata?: Record<string, any> | undefined;
    title?: string | undefined;
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
    messageId: string;
    content?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    messageId: string;
    content?: string | undefined;
    metadata?: Record<string, any> | undefined;
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
    format: "json" | "markdown" | "csv";
    includeMetadata: boolean;
    startDate?: string | undefined;
    endDate?: string | undefined;
    conversationIds?: string[] | undefined;
}, {
    startDate?: string | undefined;
    endDate?: string | undefined;
    format?: "json" | "markdown" | "csv" | undefined;
    conversationIds?: string[] | undefined;
    includeMetadata?: boolean | undefined;
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
    data: string;
    isFilePath: boolean;
    overwrite: boolean;
    validate: boolean;
}, {
    data: string;
    isFilePath?: boolean | undefined;
    overwrite?: boolean | undefined;
    validate?: boolean | undefined;
}>;
/**
 * Schema for validating get_database_stats tool input
 */
export declare const GetDatabaseStatsSchema: z.ZodObject<{
    /** Whether to include detailed breakdown by conversation */
    includeDetails: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeDetails: boolean;
}, {
    includeDetails?: boolean | undefined;
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
    vacuum: boolean;
    analyze: boolean;
    optimizeFTS: boolean;
}, {
    vacuum?: boolean | undefined;
    analyze?: boolean | undefined;
    optimizeFTS?: boolean | undefined;
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
    retentionDays: number;
    applyImmediately: boolean;
}, {
    retentionDays: number;
    applyImmediately?: boolean | undefined;
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
    force: boolean;
    batchSize: number;
    conversationId?: string | undefined;
}, {
    conversationId?: string | undefined;
    force?: boolean | undefined;
    batchSize?: number | undefined;
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
    query: string;
    maxTokens: number;
    strategy: "temporal" | "topical" | "entity-centric" | "hybrid";
    minRelevance: number;
    includeRecent: boolean;
    model: string;
    conversationIds?: string[] | undefined;
    focusEntities?: string[] | undefined;
    timeWindow?: number | undefined;
}, {
    query: string;
    conversationIds?: string[] | undefined;
    maxTokens?: number | undefined;
    strategy?: "temporal" | "topical" | "entity-centric" | "hybrid" | undefined;
    minRelevance?: number | undefined;
    includeRecent?: boolean | undefined;
    focusEntities?: string[] | undefined;
    timeWindow?: number | undefined;
    model?: string | undefined;
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
    type?: "local" | "external" | undefined;
    metadata?: Record<string, any> | undefined;
    maxTokens?: number | undefined;
    id?: string | undefined;
    name?: string | undefined;
    endpoint?: string | undefined;
    apiKeyEnv?: string | undefined;
    modelName?: string | undefined;
    temperature?: number | undefined;
    isActive?: boolean | undefined;
    priority?: number | undefined;
    costPer1kTokens?: number | undefined;
}, {
    type?: "local" | "external" | undefined;
    metadata?: Record<string, any> | undefined;
    maxTokens?: number | undefined;
    id?: string | undefined;
    name?: string | undefined;
    endpoint?: string | undefined;
    apiKeyEnv?: string | undefined;
    modelName?: string | undefined;
    temperature?: number | undefined;
    isActive?: boolean | undefined;
    priority?: number | undefined;
    costPer1kTokens?: number | undefined;
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
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    }, {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    operation: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    } | undefined;
}, {
    operation: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    } | undefined;
}>, {
    operation: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    } | undefined;
}, {
    operation: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    } | undefined;
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
        conversationId: string;
        role: "user" | "assistant" | "system";
        content: string;
        id: string;
        createdAt: number;
        parentMessageId?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }, {
        conversationId: string;
        role: "user" | "assistant" | "system";
        content: string;
        id: string;
        createdAt: number;
        parentMessageId?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    metadata: Record<string, any>;
    id: string;
    createdAt: number;
    updatedAt: number;
    title?: string | undefined;
    messages?: {
        conversationId: string;
        role: "user" | "assistant" | "system";
        content: string;
        id: string;
        createdAt: number;
        parentMessageId?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }[] | undefined;
}, {
    metadata: Record<string, any>;
    id: string;
    createdAt: number;
    updatedAt: number;
    title?: string | undefined;
    messages?: {
        conversationId: string;
        role: "user" | "assistant" | "system";
        content: string;
        id: string;
        createdAt: number;
        parentMessageId?: string | undefined;
        metadata?: Record<string, any> | undefined;
    }[] | undefined;
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
    databasePath: string;
    maxDatabaseSizeMB: number;
    maxConversationAgeDays: number;
    maxMessagesPerConversation: number;
    enableEmbeddings: boolean;
    enableAutoSummarization: boolean;
    vacuumInterval: number;
    checkpointInterval: number;
    encryptionEnabled: boolean;
    defaultRetentionDays: number;
    logLevel: "debug" | "info" | "warn" | "error";
    embeddingModel?: string | undefined;
}, {
    databasePath: string;
    maxDatabaseSizeMB?: number | undefined;
    maxConversationAgeDays?: number | undefined;
    maxMessagesPerConversation?: number | undefined;
    enableEmbeddings?: boolean | undefined;
    embeddingModel?: string | undefined;
    enableAutoSummarization?: boolean | undefined;
    vacuumInterval?: number | undefined;
    checkpointInterval?: number | undefined;
    encryptionEnabled?: boolean | undefined;
    defaultRetentionDays?: number | undefined;
    logLevel?: "debug" | "info" | "warn" | "error" | undefined;
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
    conversationId: string;
    maxTokens?: number | undefined;
    level?: "brief" | "standard" | "detailed" | "full" | undefined;
    focusMessageId?: string | undefined;
    expandContext?: boolean | undefined;
}, {
    conversationId: string;
    maxTokens?: number | undefined;
    level?: "brief" | "standard" | "detailed" | "full" | undefined;
    focusMessageId?: string | undefined;
    expandContext?: boolean | undefined;
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
    limit: number;
    includeTypes: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[];
    daysSince: number;
    minConfidence: number;
    conversationId?: string | undefined;
}, {
    conversationId?: string | undefined;
    limit?: number | undefined;
    includeTypes?: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[] | undefined;
    daysSince?: number | undefined;
    minConfidence?: number | undefined;
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
    limit: number;
    conflictTypes: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[];
    minSeverity: "low" | "medium" | "high" | "critical";
    maxAge: number;
    includeResolutions: boolean;
    conversationId?: string | undefined;
    entityIds?: string[] | undefined;
}, {
    conversationId?: string | undefined;
    limit?: number | undefined;
    entityIds?: string[] | undefined;
    conflictTypes?: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[] | undefined;
    minSeverity?: "low" | "medium" | "high" | "critical" | undefined;
    maxAge?: number | undefined;
    includeResolutions?: boolean | undefined;
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
    limit: number;
    includeMessages: boolean;
    maxTokens: number;
    contextTypes: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[];
    maxHistoryAge: number;
    minRelevanceScore: number;
    includeExperts: boolean;
    currentConversationId?: string | undefined;
    currentEntities?: string[] | undefined;
}, {
    limit?: number | undefined;
    includeMessages?: boolean | undefined;
    maxTokens?: number | undefined;
    currentConversationId?: string | undefined;
    currentEntities?: string[] | undefined;
    contextTypes?: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[] | undefined;
    maxHistoryAge?: number | undefined;
    minRelevanceScore?: number | undefined;
    includeExperts?: boolean | undefined;
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
        minEntityRelevance: number;
        maxTopicTags: number;
        minProjectConfidence: number;
        urgencyKeywords?: string[] | undefined;
    }, {
        minEntityRelevance?: number | undefined;
        maxTopicTags?: number | undefined;
        minProjectConfidence?: number | undefined;
        urgencyKeywords?: string[] | undefined;
    }>>;
    updateConversation: z.ZodDefault<z.ZodBoolean>;
    returnAnalysis: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    analysisTypes: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[];
    updateConversation: boolean;
    returnAnalysis: boolean;
    config?: {
        minEntityRelevance: number;
        maxTopicTags: number;
        minProjectConfidence: number;
        urgencyKeywords?: string[] | undefined;
    } | undefined;
}, {
    conversationId: string;
    config?: {
        minEntityRelevance?: number | undefined;
        maxTopicTags?: number | undefined;
        minProjectConfidence?: number | undefined;
        urgencyKeywords?: string[] | undefined;
    } | undefined;
    analysisTypes?: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[] | undefined;
    updateConversation?: boolean | undefined;
    returnAnalysis?: boolean | undefined;
}>;
export type GetProactiveInsightsInput = z.infer<typeof GetProactiveInsightsSchema>;
export type CheckForConflictsInput = z.infer<typeof CheckForConflictsSchema>;
export type SuggestRelevantContextInput = z.infer<typeof SuggestRelevantContextSchema>;
export type AutoTagConversationInput = z.infer<typeof AutoTagConversationSchema>;
export type ConversationData = z.infer<typeof ConversationDataSchema>;
export type PersistenceServerConfigInput = z.infer<typeof PersistenceServerConfigSchema>;
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
    role: "user" | "assistant" | "system";
    content: string;
    conversationId?: string | undefined;
    parentMessageId?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    role: "user" | "assistant" | "system";
    content: string;
    conversationId?: string | undefined;
    parentMessageId?: string | undefined;
    metadata?: Record<string, any> | undefined;
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
    query: string;
    limit: number;
    offset: number;
    matchType: "fuzzy" | "exact" | "prefix";
    highlightStart: string;
    highlightEnd: string;
    conversationId?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    query: string;
    conversationId?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    matchType?: "fuzzy" | "exact" | "prefix" | undefined;
    highlightStart?: string | undefined;
    highlightEnd?: string | undefined;
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
    conversationId: string;
    includeMessages: boolean;
    messageLimit: number;
    beforeMessageId?: string | undefined;
    afterMessageId?: string | undefined;
}, {
    conversationId: string;
    includeMessages?: boolean | undefined;
    messageLimit?: number | undefined;
    beforeMessageId?: string | undefined;
    afterMessageId?: string | undefined;
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
    limit: number;
    offset: number;
    includeMessageCounts: boolean;
    startDate?: string | undefined;
    endDate?: string | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    includeMessageCounts?: boolean | undefined;
}>, z.ZodObject<{
    /** ID of the conversation to delete */
    conversationId: z.ZodString;
    /** Whether to permanently delete (vs soft delete) */
    permanent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    permanent: boolean;
}, {
    conversationId: string;
    permanent?: boolean | undefined;
}>, z.ZodObject<{
    /** ID of the message to delete */
    messageId: z.ZodString;
    /** Whether to permanently delete (vs soft delete) */
    permanent: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    permanent: boolean;
    messageId: string;
}, {
    messageId: string;
    permanent?: boolean | undefined;
}>, z.ZodObject<{
    /** ID of the conversation to update */
    conversationId: z.ZodString;
    /** New title for the conversation */
    title: z.ZodOptional<z.ZodString>;
    /** Metadata to merge with existing metadata */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    metadata?: Record<string, any> | undefined;
    title?: string | undefined;
}, {
    conversationId: string;
    metadata?: Record<string, any> | undefined;
    title?: string | undefined;
}>, z.ZodObject<{
    /** ID of the message to update */
    messageId: z.ZodString;
    /** New content for the message */
    content: z.ZodOptional<z.ZodString>;
    /** Metadata to merge with existing metadata */
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    messageId: string;
    content?: string | undefined;
    metadata?: Record<string, any> | undefined;
}, {
    messageId: string;
    content?: string | undefined;
    metadata?: Record<string, any> | undefined;
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
    format: "json" | "markdown" | "csv";
    includeMetadata: boolean;
    startDate?: string | undefined;
    endDate?: string | undefined;
    conversationIds?: string[] | undefined;
}, {
    startDate?: string | undefined;
    endDate?: string | undefined;
    format?: "json" | "markdown" | "csv" | undefined;
    conversationIds?: string[] | undefined;
    includeMetadata?: boolean | undefined;
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
    data: string;
    isFilePath: boolean;
    overwrite: boolean;
    validate: boolean;
}, {
    data: string;
    isFilePath?: boolean | undefined;
    overwrite?: boolean | undefined;
    validate?: boolean | undefined;
}>, z.ZodObject<{
    /** Whether to include detailed breakdown by conversation */
    includeDetails: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    includeDetails: boolean;
}, {
    includeDetails?: boolean | undefined;
}>, z.ZodObject<{
    /** Whether to run VACUUM operation */
    vacuum: z.ZodDefault<z.ZodBoolean>;
    /** Whether to run ANALYZE operation */
    analyze: z.ZodDefault<z.ZodBoolean>;
    /** Whether to optimize FTS indexes */
    optimizeFTS: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    vacuum: boolean;
    analyze: boolean;
    optimizeFTS: boolean;
}, {
    vacuum?: boolean | undefined;
    analyze?: boolean | undefined;
    optimizeFTS?: boolean | undefined;
}>, z.ZodObject<{
    /** Number of days to retain conversations */
    retentionDays: z.ZodNumber;
    /** Whether to apply the policy immediately */
    applyImmediately: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    retentionDays: number;
    applyImmediately: boolean;
}, {
    retentionDays: number;
    applyImmediately?: boolean | undefined;
}>, z.ZodObject<{
    /** Optional conversation ID to limit embedding generation */
    conversationId: z.ZodOptional<z.ZodString>;
    /** Whether to regenerate existing embeddings */
    force: z.ZodDefault<z.ZodBoolean>;
    /** Maximum number of messages to process in this batch */
    batchSize: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    force: boolean;
    batchSize: number;
    conversationId?: string | undefined;
}, {
    conversationId?: string | undefined;
    force?: boolean | undefined;
    batchSize?: number | undefined;
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
    query: string;
    maxTokens: number;
    strategy: "temporal" | "topical" | "entity-centric" | "hybrid";
    minRelevance: number;
    includeRecent: boolean;
    model: string;
    conversationIds?: string[] | undefined;
    focusEntities?: string[] | undefined;
    timeWindow?: number | undefined;
}, {
    query: string;
    conversationIds?: string[] | undefined;
    maxTokens?: number | undefined;
    strategy?: "temporal" | "topical" | "entity-centric" | "hybrid" | undefined;
    minRelevance?: number | undefined;
    includeRecent?: boolean | undefined;
    focusEntities?: string[] | undefined;
    timeWindow?: number | undefined;
    model?: string | undefined;
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
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    }, {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    operation: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    } | undefined;
}, {
    operation: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    } | undefined;
}>, {
    operation: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    } | undefined;
}, {
    operation: "add" | "update" | "remove" | "list";
    config?: {
        type?: "local" | "external" | undefined;
        metadata?: Record<string, any> | undefined;
        maxTokens?: number | undefined;
        id?: string | undefined;
        name?: string | undefined;
        endpoint?: string | undefined;
        apiKeyEnv?: string | undefined;
        modelName?: string | undefined;
        temperature?: number | undefined;
        isActive?: boolean | undefined;
        priority?: number | undefined;
        costPer1kTokens?: number | undefined;
    } | undefined;
}>, z.ZodObject<{
    conversationId: z.ZodString;
    level: z.ZodOptional<z.ZodEnum<["brief", "standard", "detailed", "full"]>>;
    maxTokens: z.ZodOptional<z.ZodNumber>;
    focusMessageId: z.ZodOptional<z.ZodString>;
    expandContext: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    maxTokens?: number | undefined;
    level?: "brief" | "standard" | "detailed" | "full" | undefined;
    focusMessageId?: string | undefined;
    expandContext?: boolean | undefined;
}, {
    conversationId: string;
    maxTokens?: number | undefined;
    level?: "brief" | "standard" | "detailed" | "full" | undefined;
    focusMessageId?: string | undefined;
    expandContext?: boolean | undefined;
}>, z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    includeTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["unresolved_actions", "recurring_questions", "knowledge_gaps", "stale_commitments"]>, "many">>;
    daysSince: z.ZodDefault<z.ZodNumber>;
    minConfidence: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    includeTypes: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[];
    daysSince: number;
    minConfidence: number;
    conversationId?: string | undefined;
}, {
    conversationId?: string | undefined;
    limit?: number | undefined;
    includeTypes?: ("unresolved_actions" | "recurring_questions" | "knowledge_gaps" | "stale_commitments")[] | undefined;
    daysSince?: number | undefined;
    minConfidence?: number | undefined;
}>, z.ZodObject<{
    conversationId: z.ZodOptional<z.ZodString>;
    entityIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    conflictTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["property_contradiction", "status_inconsistency", "temporal_impossibility", "relationship_conflict", "existence_dispute", "identity_confusion", "authority_disagreement"]>, "many">>;
    minSeverity: z.ZodDefault<z.ZodEnum<["low", "medium", "high", "critical"]>>;
    maxAge: z.ZodDefault<z.ZodNumber>;
    includeResolutions: z.ZodDefault<z.ZodBoolean>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    conflictTypes: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[];
    minSeverity: "low" | "medium" | "high" | "critical";
    maxAge: number;
    includeResolutions: boolean;
    conversationId?: string | undefined;
    entityIds?: string[] | undefined;
}, {
    conversationId?: string | undefined;
    limit?: number | undefined;
    entityIds?: string[] | undefined;
    conflictTypes?: ("property_contradiction" | "status_inconsistency" | "temporal_impossibility" | "relationship_conflict" | "existence_dispute" | "identity_confusion" | "authority_disagreement")[] | undefined;
    minSeverity?: "low" | "medium" | "high" | "critical" | undefined;
    maxAge?: number | undefined;
    includeResolutions?: boolean | undefined;
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
    limit: number;
    includeMessages: boolean;
    maxTokens: number;
    contextTypes: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[];
    maxHistoryAge: number;
    minRelevanceScore: number;
    includeExperts: boolean;
    currentConversationId?: string | undefined;
    currentEntities?: string[] | undefined;
}, {
    limit?: number | undefined;
    includeMessages?: boolean | undefined;
    maxTokens?: number | undefined;
    currentConversationId?: string | undefined;
    currentEntities?: string[] | undefined;
    contextTypes?: ("related_conversation" | "expert_insight" | "similar_context" | "temporal_connection" | "relationship_network" | "follow_up_needed" | "missing_information" | "contradiction_alert")[] | undefined;
    maxHistoryAge?: number | undefined;
    minRelevanceScore?: number | undefined;
    includeExperts?: boolean | undefined;
}>, z.ZodObject<{
    conversationId: z.ZodString;
    analysisTypes: z.ZodDefault<z.ZodArray<z.ZodEnum<["topic_tags", "activity_classification", "urgency_analysis", "project_contexts"]>, "many">>;
    config: z.ZodOptional<z.ZodObject<{
        minEntityRelevance: z.ZodDefault<z.ZodNumber>;
        maxTopicTags: z.ZodDefault<z.ZodNumber>;
        minProjectConfidence: z.ZodDefault<z.ZodNumber>;
        urgencyKeywords: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        minEntityRelevance: number;
        maxTopicTags: number;
        minProjectConfidence: number;
        urgencyKeywords?: string[] | undefined;
    }, {
        minEntityRelevance?: number | undefined;
        maxTopicTags?: number | undefined;
        minProjectConfidence?: number | undefined;
        urgencyKeywords?: string[] | undefined;
    }>>;
    updateConversation: z.ZodDefault<z.ZodBoolean>;
    returnAnalysis: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    conversationId: string;
    analysisTypes: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[];
    updateConversation: boolean;
    returnAnalysis: boolean;
    config?: {
        minEntityRelevance: number;
        maxTopicTags: number;
        minProjectConfidence: number;
        urgencyKeywords?: string[] | undefined;
    } | undefined;
}, {
    conversationId: string;
    config?: {
        minEntityRelevance?: number | undefined;
        maxTopicTags?: number | undefined;
        minProjectConfidence?: number | undefined;
        urgencyKeywords?: string[] | undefined;
    } | undefined;
    analysisTypes?: ("topic_tags" | "activity_classification" | "urgency_analysis" | "project_contexts")[] | undefined;
    updateConversation?: boolean | undefined;
    returnAnalysis?: boolean | undefined;
}>]>;
export type ToolInput = z.infer<typeof ToolInputSchema>;
//# sourceMappingURL=schemas.d.ts.map