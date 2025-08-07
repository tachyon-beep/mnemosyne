/**
 * MCP (Model Context Protocol) related types for the persistence system
 *
 * This file contains types specific to MCP protocol implementation,
 * tool definitions, and server capabilities.
 */
import { z } from 'zod';
/**
 * Standard MCP error codes
 */
export var MCPErrorCode;
(function (MCPErrorCode) {
    // JSON-RPC standard errors
    MCPErrorCode[MCPErrorCode["PARSE_ERROR"] = -32700] = "PARSE_ERROR";
    MCPErrorCode[MCPErrorCode["INVALID_REQUEST"] = -32600] = "INVALID_REQUEST";
    MCPErrorCode[MCPErrorCode["METHOD_NOT_FOUND"] = -32601] = "METHOD_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["INVALID_PARAMS"] = -32602] = "INVALID_PARAMS";
    MCPErrorCode[MCPErrorCode["INTERNAL_ERROR"] = -32603] = "INTERNAL_ERROR";
    // MCP-specific errors
    MCPErrorCode[MCPErrorCode["TOOL_NOT_FOUND"] = -32000] = "TOOL_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["TOOL_EXECUTION_ERROR"] = -32001] = "TOOL_EXECUTION_ERROR";
    MCPErrorCode[MCPErrorCode["RESOURCE_NOT_FOUND"] = -32002] = "RESOURCE_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["RESOURCE_ACCESS_ERROR"] = -32003] = "RESOURCE_ACCESS_ERROR";
    MCPErrorCode[MCPErrorCode["PROMPT_NOT_FOUND"] = -32004] = "PROMPT_NOT_FOUND";
    MCPErrorCode[MCPErrorCode["PROMPT_EXECUTION_ERROR"] = -32005] = "PROMPT_EXECUTION_ERROR";
})(MCPErrorCode || (MCPErrorCode = {}));
/**
 * Tool definition for save_message
 */
export const SaveMessageTool = {
    name: 'save_message',
    description: 'Save a message to conversation history. Creates a new conversation if none specified.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                description: 'Optional conversation ID. If not provided, creates a new conversation.'
            },
            role: {
                type: 'string',
                enum: ['user', 'assistant', 'system'],
                description: 'Role of the message sender'
            },
            content: {
                type: 'string',
                description: 'Content of the message',
                minLength: 1
            },
            parentMessageId: {
                type: 'string',
                description: 'Optional parent message ID for threading'
            },
            metadata: {
                type: 'object',
                description: 'Optional metadata as key-value pairs',
                additionalProperties: true
            }
        },
        required: ['role', 'content'],
        additionalProperties: false
    }
};
/**
 * Tool definition for search_messages
 */
export const SearchMessagesTool = {
    name: 'search_messages',
    description: 'Search through conversation history using full-text search with optional filters.',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query string',
                minLength: 1
            },
            conversationId: {
                type: 'string',
                description: 'Optional conversation ID to limit search scope'
            },
            limit: {
                type: 'number',
                description: 'Maximum number of results to return',
                minimum: 1,
                maximum: 100,
                default: 20
            },
            offset: {
                type: 'number',
                description: 'Number of results to skip for pagination',
                minimum: 0,
                default: 0
            },
            startDate: {
                type: 'string',
                format: 'date-time',
                description: 'Start date for time-based filtering (ISO 8601)'
            },
            endDate: {
                type: 'string',
                format: 'date-time',
                description: 'End date for time-based filtering (ISO 8601)'
            },
            matchType: {
                type: 'string',
                enum: ['fuzzy', 'exact', 'prefix'],
                default: 'fuzzy',
                description: 'Type of matching to perform'
            }
        },
        required: ['query'],
        additionalProperties: false
    }
};
/**
 * Tool definition for get_conversation
 */
export const GetConversationTool = {
    name: 'get_conversation',
    description: 'Retrieve a specific conversation with its messages.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                description: 'ID of the conversation to retrieve',
                minLength: 1
            },
            includeMessages: {
                type: 'boolean',
                description: 'Whether to include messages in the response',
                default: true
            },
            messageLimit: {
                type: 'number',
                description: 'Maximum number of messages to return',
                minimum: 1,
                maximum: 1000,
                default: 100
            },
            beforeMessageId: {
                type: 'string',
                description: 'Return messages before this message ID (for pagination)'
            },
            afterMessageId: {
                type: 'string',
                description: 'Return messages after this message ID (for pagination)'
            }
        },
        required: ['conversationId'],
        additionalProperties: false
    }
};
/**
 * Tool definition for get_conversations
 */
export const GetConversationsTool = {
    name: 'get_conversations',
    description: 'List conversations with optional filtering and pagination.',
    inputSchema: {
        type: 'object',
        properties: {
            limit: {
                type: 'number',
                description: 'Maximum number of conversations to return',
                minimum: 1,
                maximum: 100,
                default: 20
            },
            offset: {
                type: 'number',
                description: 'Number of conversations to skip for pagination',
                minimum: 0,
                default: 0
            },
            startDate: {
                type: 'string',
                format: 'date-time',
                description: 'Start date for filtering conversations'
            },
            endDate: {
                type: 'string',
                format: 'date-time',
                description: 'End date for filtering conversations'
            },
            includeMessageCounts: {
                type: 'boolean',
                description: 'Whether to include message counts for each conversation',
                default: false
            }
        },
        required: [],
        additionalProperties: false
    }
};
/**
 * Tool definition for delete_conversation
 */
export const DeleteConversationTool = {
    name: 'delete_conversation',
    description: 'Delete a conversation and all its messages.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                description: 'ID of the conversation to delete',
                minLength: 1
            },
            permanent: {
                type: 'boolean',
                description: 'Whether to permanently delete (vs soft delete)',
                default: false
            }
        },
        required: ['conversationId'],
        additionalProperties: false
    }
};
/**
 * Tool definition for export_conversations
 */
export const ExportConversationsTool = {
    name: 'export_conversations',
    description: 'Export conversations to various formats (JSON, Markdown, CSV).',
    inputSchema: {
        type: 'object',
        properties: {
            format: {
                type: 'string',
                enum: ['json', 'markdown', 'csv'],
                default: 'json',
                description: 'Format for the export'
            },
            conversationIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional conversation IDs to include (if not specified, exports all)'
            },
            startDate: {
                type: 'string',
                format: 'date-time',
                description: 'Start date for filtering conversations'
            },
            endDate: {
                type: 'string',
                format: 'date-time',
                description: 'End date for filtering conversations'
            },
            includeMetadata: {
                type: 'boolean',
                description: 'Whether to include message metadata in the export',
                default: true
            }
        },
        required: [],
        additionalProperties: false
    }
};
/**
 * Tool definition for get_database_stats
 */
export const GetDatabaseStatsTool = {
    name: 'get_database_stats',
    description: 'Get statistics about the conversation database.',
    inputSchema: {
        type: 'object',
        properties: {
            includeDetails: {
                type: 'boolean',
                description: 'Whether to include detailed breakdown by conversation',
                default: false
            }
        },
        required: [],
        additionalProperties: false
    }
};
/**
 * Tool definition for semantic_search
 */
export const SemanticSearchTool = {
    name: 'semantic_search',
    description: 'Search messages using semantic similarity to find conceptually related content.',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query for semantic matching',
                minLength: 1,
                maxLength: 1000
            },
            limit: {
                type: 'number',
                description: 'Maximum results to return',
                minimum: 1,
                maximum: 100,
                default: 20
            },
            offset: {
                type: 'number',
                description: 'Number of results to skip for pagination',
                minimum: 0,
                default: 0
            },
            conversationId: {
                type: 'string',
                description: 'Limit search to specific conversation'
            },
            startDate: {
                type: 'string',
                format: 'date-time',
                description: 'Filter by start date (ISO 8601 format)'
            },
            endDate: {
                type: 'string',
                format: 'date-time',
                description: 'Filter by end date (ISO 8601 format)'
            },
            threshold: {
                type: 'number',
                description: 'Minimum similarity threshold (0-1)',
                minimum: 0,
                maximum: 1,
                default: 0.7
            },
            explainResults: {
                type: 'boolean',
                description: 'Include explanations for why results were selected',
                default: false
            }
        },
        required: ['query'],
        additionalProperties: false
    }
};
/**
 * Tool definition for hybrid_search
 */
export const HybridSearchTool = {
    name: 'hybrid_search',
    description: 'Advanced search combining semantic similarity and keyword matching for optimal results.',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Search query for hybrid matching',
                minLength: 1,
                maxLength: 1000
            },
            limit: {
                type: 'number',
                description: 'Maximum results to return',
                minimum: 1,
                maximum: 100,
                default: 20
            },
            offset: {
                type: 'number',
                description: 'Number of results to skip for pagination',
                minimum: 0,
                default: 0
            },
            conversationId: {
                type: 'string',
                description: 'Limit search to specific conversation'
            },
            startDate: {
                type: 'string',
                format: 'date-time',
                description: 'Filter by start date (ISO 8601 format)'
            },
            endDate: {
                type: 'string',
                format: 'date-time',
                description: 'Filter by end date (ISO 8601 format)'
            },
            strategy: {
                type: 'string',
                enum: ['auto', 'semantic', 'fts', 'hybrid'],
                default: 'auto',
                description: 'Search strategy: auto-select, semantic-only, FTS-only, or hybrid'
            },
            weights: {
                type: 'object',
                properties: {
                    semantic: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        default: 0.6
                    },
                    fts: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        default: 0.4
                    }
                },
                description: 'Relative weights for semantic vs FTS scores in hybrid mode'
            },
            semanticThreshold: {
                type: 'number',
                description: 'Minimum semantic similarity threshold',
                minimum: 0,
                maximum: 1,
                default: 0.6
            },
            matchType: {
                type: 'string',
                enum: ['fuzzy', 'exact', 'prefix'],
                default: 'fuzzy',
                description: 'FTS matching type: fuzzy, exact phrases, or prefix matching'
            },
            explainResults: {
                type: 'boolean',
                description: 'Include detailed explanations for result ranking',
                default: false
            },
            includeMetrics: {
                type: 'boolean',
                description: 'Include detailed performance metrics in response',
                default: false
            }
        },
        required: ['query'],
        additionalProperties: false
    }
};
/**
 * Tool definition for get_relevant_snippets
 */
export const GetRelevantSnippetsTool = {
    name: 'get_relevant_snippets',
    description: 'Retrieve context-aware snippets based on queries using intelligent context assembly.',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: 'Query to find relevant snippets for',
                minLength: 1
            },
            maxTokens: {
                type: 'number',
                description: 'Maximum token budget for selected snippets',
                minimum: 50,
                maximum: 16000,
                default: 4000
            },
            strategy: {
                type: 'string',
                enum: ['temporal', 'topical', 'entity-centric', 'hybrid'],
                default: 'hybrid',
                description: 'Assembly strategy to use for context selection'
            },
            conversationIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional conversation IDs to limit search scope'
            },
            minRelevance: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                default: 0.3,
                description: 'Minimum relevance threshold (0-1)'
            },
            includeRecent: {
                type: 'boolean',
                default: true,
                description: 'Include recent messages regardless of relevance'
            },
            focusEntities: {
                type: 'array',
                items: { type: 'string' },
                description: 'Entity names to focus on'
            },
            timeWindow: {
                type: 'number',
                minimum: 0,
                description: 'Time window for context in milliseconds'
            },
            model: {
                type: 'string',
                default: 'gpt-3.5-turbo',
                description: 'Model name for token counting'
            }
        },
        required: ['query'],
        additionalProperties: false
    }
};
/**
 * Tool definition for configure_llm_provider
 */
export const ConfigureLLMProviderTool = {
    name: 'configure_llm_provider',
    description: 'Manage LLM provider configurations at runtime for context generation and summarization.',
    inputSchema: {
        type: 'object',
        properties: {
            operation: {
                type: 'string',
                enum: ['add', 'update', 'remove', 'list'],
                description: 'Operation to perform on provider configurations'
            },
            config: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'Provider ID (required for update/remove operations)'
                    },
                    name: {
                        type: 'string',
                        minLength: 1,
                        description: 'Provider name'
                    },
                    type: {
                        type: 'string',
                        enum: ['local', 'external'],
                        description: 'Provider type'
                    },
                    endpoint: {
                        type: 'string',
                        format: 'uri',
                        description: 'API endpoint URL'
                    },
                    apiKeyEnv: {
                        type: 'string',
                        description: 'Environment variable name for API key'
                    },
                    modelName: {
                        type: 'string',
                        minLength: 1,
                        description: 'Model name to use'
                    },
                    maxTokens: {
                        type: 'number',
                        minimum: 1,
                        description: 'Maximum tokens for the model'
                    },
                    temperature: {
                        type: 'number',
                        minimum: 0,
                        maximum: 2,
                        description: 'Temperature setting (0-2)'
                    },
                    isActive: {
                        type: 'boolean',
                        description: 'Whether the provider is active'
                    },
                    priority: {
                        type: 'number',
                        description: 'Priority for provider selection (higher = preferred)'
                    },
                    costPer1kTokens: {
                        type: 'number',
                        minimum: 0,
                        description: 'Cost per 1000 tokens'
                    },
                    metadata: {
                        type: 'object',
                        description: 'Additional metadata',
                        additionalProperties: true
                    }
                },
                additionalProperties: false,
                description: 'Provider configuration (required for add/update operations)'
            }
        },
        required: ['operation'],
        additionalProperties: false
    }
};
/**
 * Tool definition for get_progressive_detail
 */
export const GetProgressiveDetailTool = {
    name: 'get_progressive_detail',
    description: 'Retrieve conversation details progressively, starting with summaries and drilling down to full messages.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                format: 'uuid',
                description: 'ID of the conversation to retrieve'
            },
            level: {
                type: 'string',
                enum: ['brief', 'standard', 'detailed', 'full'],
                description: 'Detail level to retrieve (default: brief)'
            },
            maxTokens: {
                type: 'number',
                minimum: 100,
                maximum: 16000,
                default: 2000,
                description: 'Maximum tokens to return'
            },
            focusMessageId: {
                type: 'string',
                format: 'uuid',
                description: 'Message ID to focus on for key message selection'
            },
            expandContext: {
                type: 'boolean',
                default: false,
                description: 'Whether to expand context for detailed/full levels'
            }
        },
        required: ['conversationId'],
        additionalProperties: false
    }
};
/**
 * Tool definition for get_proactive_insights
 */
export const GetProactiveInsightsToolDef = {
    name: 'get_proactive_insights',
    description: 'Returns unresolved actions, recurring questions, knowledge gaps, and stale commitments to provide proactive assistance.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                description: 'Optional conversation ID to limit analysis scope'
            },
            includeTypes: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments']
                },
                description: 'Types of insights to include',
                default: ['unresolved_actions', 'recurring_questions', 'knowledge_gaps', 'stale_commitments']
            },
            daysSince: {
                type: 'number',
                minimum: 1,
                maximum: 365,
                default: 30,
                description: 'Number of days to look back for patterns'
            },
            minConfidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                default: 0.6,
                description: 'Minimum confidence threshold for insights'
            },
            limit: {
                type: 'number',
                minimum: 1,
                maximum: 100,
                default: 20,
                description: 'Maximum number of insights per type to return'
            }
        },
        required: [],
        additionalProperties: false
    }
};
/**
 * Tool definition for check_for_conflicts
 */
export const CheckForConflictsToolDef = {
    name: 'check_for_conflicts',
    description: 'Detects contradictions in entity information across conversations, identifying conflicting statements and data inconsistencies.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                description: 'Optional conversation ID to focus analysis on specific conversation entities'
            },
            entityIds: {
                type: 'array',
                items: { type: 'string' },
                description: 'Optional list of specific entity IDs to check for conflicts'
            },
            conflictTypes: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['property_contradiction', 'status_inconsistency', 'temporal_impossibility', 'relationship_conflict', 'existence_dispute', 'identity_confusion', 'authority_disagreement']
                },
                description: 'Types of conflicts to detect',
                default: ['property_contradiction', 'status_inconsistency', 'temporal_impossibility', 'relationship_conflict']
            },
            minSeverity: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'critical'],
                default: 'medium',
                description: 'Minimum severity level of conflicts to return'
            },
            maxAge: {
                type: 'number',
                minimum: 1,
                maximum: 365,
                default: 90,
                description: 'Maximum age in days of information to consider for conflicts'
            },
            includeResolutions: {
                type: 'boolean',
                default: true,
                description: 'Whether to include suggested resolutions for detected conflicts'
            },
            limit: {
                type: 'number',
                minimum: 1,
                maximum: 100,
                default: 20,
                description: 'Maximum number of conflicts to return'
            }
        },
        required: [],
        additionalProperties: false
    }
};
/**
 * Tool definition for suggest_relevant_context
 */
export const SuggestRelevantContextToolDef = {
    name: 'suggest_relevant_context',
    description: 'Provides past conversations and insights relevant to current discussion by analyzing entity relationships and conversation patterns.',
    inputSchema: {
        type: 'object',
        properties: {
            currentConversationId: {
                type: 'string',
                description: 'ID of the current conversation to find relevant context for'
            },
            currentEntities: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of entity names or IDs currently being discussed'
            },
            contextTypes: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['related_conversation', 'expert_insight', 'similar_context', 'temporal_connection', 'relationship_network', 'follow_up_needed', 'missing_information', 'contradiction_alert']
                },
                description: 'Types of context suggestions to include',
                default: ['related_conversation', 'expert_insight', 'similar_context', 'contradiction_alert']
            },
            maxHistoryAge: {
                type: 'number',
                minimum: 1,
                maximum: 365,
                default: 90,
                description: 'Maximum age in days of historical context to consider'
            },
            minRelevanceScore: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                default: 0.4,
                description: 'Minimum relevance threshold for suggestions'
            },
            maxTokens: {
                type: 'number',
                minimum: 100,
                maximum: 16000,
                default: 4000,
                description: 'Maximum token budget for context window optimization'
            },
            includeExperts: {
                type: 'boolean',
                default: true,
                description: 'Whether to include expert recommendations'
            },
            includeMessages: {
                type: 'boolean',
                default: true,
                description: 'Whether to include relevant message excerpts in suggestions'
            },
            limit: {
                type: 'number',
                minimum: 1,
                maximum: 50,
                default: 10,
                description: 'Maximum number of context suggestions to return'
            }
        },
        required: [],
        additionalProperties: false
    }
};
/**
 * Tool definition for auto_tag_conversation
 */
export const AutoTagConversationToolDef = {
    name: 'auto_tag_conversation',
    description: 'Automatically generates tags, classifications, and urgency levels for conversations based on content analysis and entity patterns.',
    inputSchema: {
        type: 'object',
        properties: {
            conversationId: {
                type: 'string',
                description: 'ID of the conversation to analyze and tag'
            },
            analysisTypes: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['topic_tags', 'activity_classification', 'urgency_analysis', 'project_contexts']
                },
                description: 'Types of analysis to perform',
                default: ['topic_tags', 'activity_classification', 'urgency_analysis', 'project_contexts']
            },
            config: {
                type: 'object',
                properties: {
                    minEntityRelevance: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        default: 0.3,
                        description: 'Minimum relevance threshold for entity-based topic tags'
                    },
                    maxTopicTags: {
                        type: 'number',
                        minimum: 1,
                        maximum: 20,
                        default: 5,
                        description: 'Maximum number of topic tags to generate'
                    },
                    minProjectConfidence: {
                        type: 'number',
                        minimum: 0,
                        maximum: 1,
                        default: 0.6,
                        description: 'Minimum confidence threshold for project context detection'
                    },
                    urgencyKeywords: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Additional custom keywords that indicate urgency'
                    }
                },
                additionalProperties: false,
                description: 'Optional configuration overrides for auto-tagging behavior'
            },
            updateConversation: {
                type: 'boolean',
                default: false,
                description: 'Whether to update the conversation metadata with generated tags'
            },
            returnAnalysis: {
                type: 'boolean',
                default: true,
                description: 'Whether to return detailed analysis results'
            }
        },
        required: ['conversationId'],
        additionalProperties: false
    }
};
/**
 * All available tools in the persistence system
 */
export const AllTools = [
    SaveMessageTool,
    SearchMessagesTool,
    GetConversationTool,
    GetConversationsTool,
    DeleteConversationTool,
    ExportConversationsTool,
    GetDatabaseStatsTool,
    SemanticSearchTool,
    HybridSearchTool,
    GetRelevantSnippetsTool,
    ConfigureLLMProviderTool,
    GetProgressiveDetailTool,
    GetProactiveInsightsToolDef,
    CheckForConflictsToolDef,
    SuggestRelevantContextToolDef,
    AutoTagConversationToolDef
];
/**
 * Validation schema for MCP requests
 */
export const MCPRequestSchema = z.object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number()]),
    method: z.string(),
    params: z.any().optional()
});
/**
 * Validation schema for MCP responses
 */
export const MCPResponseSchema = z.object({
    jsonrpc: z.literal('2.0'),
    id: z.union([z.string(), z.number()]),
    result: z.any().optional(),
    error: z.object({
        code: z.number(),
        message: z.string(),
        data: z.any().optional()
    }).optional()
});
//# sourceMappingURL=mcp.js.map