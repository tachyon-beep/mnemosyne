/**
 * Tools Module - Export barrel and tool registry
 *
 * This module provides all MCP tool implementations for the persistence system
 * and includes a tool registry for easy instantiation and management.
 */
export { BaseTool } from './BaseTool.js';
export type { ToolContext } from './BaseTool.js';
export { ValidationError, NotFoundError, ConflictError, DatabaseError, isKnownError, wrapDatabaseOperation } from './BaseTool.js';
export { SaveMessageTool } from './SaveMessageTool.js';
export type { SaveMessageResponse, SaveMessageDependencies } from './SaveMessageTool.js';
export { SearchMessagesTool } from './SearchMessagesTool.js';
export type { SearchMessagesResponse, SearchMessagesDependencies, EnhancedSearchResult } from './SearchMessagesTool.js';
export { GetConversationTool } from './GetConversationTool.js';
export type { GetConversationResponse, GetConversationDependencies, MessageWithContext } from './GetConversationTool.js';
export { GetConversationsTool } from './GetConversationsTool.js';
export type { GetConversationsResponse, GetConversationsDependencies, ConversationWithMetadata } from './GetConversationsTool.js';
export { DeleteConversationTool } from './DeleteConversationTool.js';
export type { DeleteConversationResponse, DeleteConversationDependencies } from './DeleteConversationTool.js';
export { SemanticSearchTool } from './SemanticSearchTool.js';
export { HybridSearchTool } from './HybridSearchTool.js';
export { GetContextSummaryTool } from './GetContextSummaryTool.js';
export { GetRelevantSnippetsTool } from './GetRelevantSnippetsTool.js';
export type { GetRelevantSnippetsResponse, GetRelevantSnippetsDependencies } from './GetRelevantSnippetsTool.js';
export { ConfigureLLMProviderTool } from './ConfigureLLMProviderTool.js';
export type { ConfigureLLMProviderResponse, ConfigureLLMProviderDependencies } from './ConfigureLLMProviderTool.js';
export { GetEntityHistoryTool } from './GetEntityHistoryTool.js';
export type { GetEntityHistoryArgs } from './GetEntityHistoryTool.js';
export { FindRelatedConversationsTool } from './FindRelatedConversationsTool.js';
export type { FindRelatedConversationsArgs } from './FindRelatedConversationsTool.js';
export { GetKnowledgeGraphTool } from './GetKnowledgeGraphTool.js';
export type { GetKnowledgeGraphArgs } from './GetKnowledgeGraphTool.js';
export { GetProactiveInsightsTool, CheckForConflictsTool, SuggestRelevantContextTool, AutoTagConversationTool } from './proactive/index.js';
export type { GetProactiveInsightsResponse, GetProactiveInsightsDependencies, CheckForConflictsResponse, CheckForConflictsDependencies, SuggestRelevantContextResponse, SuggestRelevantContextDependencies, AutoTagConversationResponse, AutoTagConversationDependencies } from './proactive/index.js';
export { GetConversationAnalyticsTool } from './GetConversationAnalyticsTool.js';
export type { GetConversationAnalyticsResponse, GetConversationAnalyticsDependencies } from './GetConversationAnalyticsTool.js';
export { AnalyzeProductivityPatternsTool } from './AnalyzeProductivityPatternsTool.js';
export type { AnalyzeProductivityPatternsResponse, AnalyzeProductivityPatternsDependencies, ProductivityPattern, SessionAnalysis, QuestionPatternAnalysis } from './AnalyzeProductivityPatternsTool.js';
export { DetectKnowledgeGapsTool } from './DetectKnowledgeGapsTool.js';
export type { DetectKnowledgeGapsResponse, DetectKnowledgeGapsDependencies, KnowledgeGapCategory, TopicCoverage, ResolutionSuggestion } from './DetectKnowledgeGapsTool.js';
export { TrackDecisionEffectivenessTool } from './TrackDecisionEffectivenessTool.js';
export type { TrackDecisionEffectivenessResponse, TrackDecisionEffectivenessDependencies, DecisionQualityAnalysis, DecisionOutcomeAnalysis, DecisionReversalAnalysis, DecisionTypeAnalysis } from './TrackDecisionEffectivenessTool.js';
export { GenerateAnalyticsReportTool } from './GenerateAnalyticsReportTool.js';
export type { GenerateAnalyticsReportResponse, GenerateAnalyticsReportDependencies, ChartData, ReportSection, ExecutiveSummary } from './GenerateAnalyticsReportTool.js';
export { GetIndexPerformanceReportTool } from './GetIndexPerformanceReportTool.js';
export { ManageIndexOptimizationTool } from './ManageIndexOptimizationTool.js';
export type { SaveMessageInput, SearchMessagesInput, GetConversationInput, GetConversationsInput, DeleteConversationInput, GetRelevantSnippetsInput, ConfigureLLMProviderInput, GetProactiveInsightsInput, CheckForConflictsInput, SuggestRelevantContextInput, AutoTagConversationInput, GetConversationAnalyticsInput, AnalyzeProductivityPatternsInput, DetectKnowledgeGapsInput, TrackDecisionEffectivenessInput, GenerateAnalyticsReportInput } from '../types/schemas.js';
export { SaveMessageTool as SaveMessageToolDef, SearchMessagesTool as SearchMessagesToolDef, GetConversationTool as GetConversationToolDef, GetConversationsTool as GetConversationsToolDef, DeleteConversationTool as DeleteConversationToolDef, GetRelevantSnippetsTool as GetRelevantSnippetsToolDef, ConfigureLLMProviderTool as ConfigureLLMProviderToolDef, GetProgressiveDetailTool as GetProgressiveDetailToolDef, GetProactiveInsightsToolDef, CheckForConflictsToolDef, SuggestRelevantContextToolDef, AutoTagConversationToolDef, GetConversationAnalyticsToolDef, AnalyzeProductivityPatternsToolDef, DetectKnowledgeGapsToolDef, TrackDecisionEffectivenessToolDef, GenerateAnalyticsReportToolDef, AllTools, type MCPTool, type MCPToolResult, type ToolName } from '../types/mcp.js';
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { EnhancedSearchEngine } from '../search/EnhancedSearchEngine.js';
import { ToolName } from '../types/mcp.js';
import { BaseTool, ToolContext } from './BaseTool.js';
import { DatabaseManager } from '../storage/Database.js';
/**
 * Dependencies required by the tool registry
 */
export interface ToolRegistryDependencies {
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
    searchEngine: SearchEngine;
    enhancedSearchEngine?: EnhancedSearchEngine;
    knowledgeGraphService?: any;
    databaseManager?: DatabaseManager;
    enableAnalytics?: boolean;
}
/**
 * Tool registry for managing and instantiating MCP tools
 */
export declare class ToolRegistry {
    private readonly tools;
    private readonly dependencies;
    constructor(dependencies: ToolRegistryDependencies);
    /**
     * Initialize all available tools
     */
    private initializeTools;
    /**
     * Get a tool by name
     */
    getTool(name: ToolName): BaseTool | undefined;
    /**
     * Get all available tools
     */
    getAllTools(): BaseTool[];
    /**
     * Get all tool names
     */
    getToolNames(): ToolName[];
    /**
     * Check if a tool exists
     */
    hasTool(name: ToolName): boolean;
    /**
     * Execute a tool by name
     */
    executeTool(name: ToolName, input: unknown, context?: Partial<ToolContext>): Promise<any>;
    /**
     * Create analytics dependencies for analytics tools
     */
    private createAnalyticsDependencies;
    /**
     * Get tool definitions for MCP protocol
     */
    getToolDefinitions(): any[];
    /**
     * Get tool definition by name
     */
    getToolDefinition(name: ToolName): any | undefined;
    /**
     * Validate tool input
     */
    validateToolInput(name: ToolName, input: unknown): any;
}
/**
 * Factory function to create a tool registry
 */
export declare function createToolRegistry(dependencies: ToolRegistryDependencies): ToolRegistry;
/**
 * Factory function to create a tool registry with analytics enabled
 */
export declare function createToolRegistryWithAnalytics(dependencies: Omit<ToolRegistryDependencies, 'enableAnalytics'> & {
    databaseManager: DatabaseManager;
}): ToolRegistry;
/**
 * Utility function to get all tool definitions for MCP
 */
export declare function getAllToolDefinitions(): any[];
/**
 * Type guard to check if a string is a valid tool name
 */
export declare function isValidToolName(name: string): name is ToolName;
/**
 * Tool execution helper with error handling
 */
export declare function executeToolSafely(registry: ToolRegistry, toolName: string, input: unknown, context?: Partial<ToolContext>): Promise<{
    success: boolean;
    result?: any;
    error?: string;
    details?: any;
}>;
/**
 * Get tool statistics
 */
export declare function getToolStatistics(registry: ToolRegistry): {
    totalTools: number;
    toolNames: ToolName[];
    toolDescriptions: Record<ToolName, string>;
};
//# sourceMappingURL=index.d.ts.map