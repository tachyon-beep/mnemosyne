/**
 * Tools Module - Export barrel and tool registry
 *
 * This module provides all MCP tool implementations for the persistence system
 * and includes a tool registry for easy instantiation and management.
 */
// Base tool classes and utilities
export { BaseTool } from './BaseTool.js';
export { ValidationError, NotFoundError, ConflictError, DatabaseError, isKnownError, wrapDatabaseOperation } from './BaseTool.js';
// Tool implementations
export { SaveMessageTool } from './SaveMessageTool.js';
export { SearchMessagesTool } from './SearchMessagesTool.js';
export { GetConversationTool } from './GetConversationTool.js';
export { GetConversationsTool } from './GetConversationsTool.js';
export { DeleteConversationTool } from './DeleteConversationTool.js';
export { SemanticSearchTool } from './SemanticSearchTool.js';
export { HybridSearchTool } from './HybridSearchTool.js';
export { GetContextSummaryTool } from './GetContextSummaryTool.js';
export { GetRelevantSnippetsTool } from './GetRelevantSnippetsTool.js';
export { ConfigureLLMProviderTool } from './ConfigureLLMProviderTool.js';
// Knowledge Graph tools
export { GetEntityHistoryTool } from './GetEntityHistoryTool.js';
export { FindRelatedConversationsTool } from './FindRelatedConversationsTool.js';
export { GetKnowledgeGraphTool } from './GetKnowledgeGraphTool.js';
// Proactive Assistance tools
export { GetProactiveInsightsTool, CheckForConflictsTool, SuggestRelevantContextTool, AutoTagConversationTool } from './proactive/index.js';
// Re-export MCP tool definitions
export { SaveMessageTool as SaveMessageToolDef, SearchMessagesTool as SearchMessagesToolDef, GetConversationTool as GetConversationToolDef, GetConversationsTool as GetConversationsToolDef, DeleteConversationTool as DeleteConversationToolDef, GetRelevantSnippetsTool as GetRelevantSnippetsToolDef, ConfigureLLMProviderTool as ConfigureLLMProviderToolDef, GetProgressiveDetailTool as GetProgressiveDetailToolDef, GetProactiveInsightsToolDef, CheckForConflictsToolDef, SuggestRelevantContextToolDef, AutoTagConversationToolDef, AllTools } from '../types/mcp.js';
import { SaveMessageTool } from './SaveMessageTool.js';
import { SearchMessagesTool } from './SearchMessagesTool.js';
import { GetConversationTool } from './GetConversationTool.js';
import { GetConversationsTool } from './GetConversationsTool.js';
import { DeleteConversationTool } from './DeleteConversationTool.js';
import { SemanticSearchTool } from './SemanticSearchTool.js';
import { HybridSearchTool } from './HybridSearchTool.js';
import { BaseTool } from './BaseTool.js';
/**
 * Tool registry for managing and instantiating MCP tools
 */
export class ToolRegistry {
    tools;
    dependencies;
    constructor(dependencies) {
        this.dependencies = dependencies;
        this.tools = new Map();
        this.initializeTools();
    }
    /**
     * Initialize all available tools
     */
    initializeTools() {
        // Create tool instances with their dependencies
        const saveMessageTool = SaveMessageTool.create({
            conversationRepository: this.dependencies.conversationRepository,
            messageRepository: this.dependencies.messageRepository,
            searchEngine: this.dependencies.searchEngine
        });
        const searchMessagesTool = SearchMessagesTool.create({
            searchEngine: this.dependencies.searchEngine
        });
        const getConversationTool = GetConversationTool.create({
            conversationRepository: this.dependencies.conversationRepository,
            messageRepository: this.dependencies.messageRepository
        });
        const getConversationsTool = GetConversationsTool.create({
            conversationRepository: this.dependencies.conversationRepository,
            messageRepository: this.dependencies.messageRepository
        });
        const deleteConversationTool = DeleteConversationTool.create({
            conversationRepository: this.dependencies.conversationRepository,
            messageRepository: this.dependencies.messageRepository,
            searchEngine: this.dependencies.searchEngine
        });
        // Register core tools
        this.tools.set('save_message', saveMessageTool);
        this.tools.set('search_messages', searchMessagesTool);
        this.tools.set('get_conversation', getConversationTool);
        this.tools.set('get_conversations', getConversationsTool);
        this.tools.set('delete_conversation', deleteConversationTool);
        // Register enhanced search tools if available
        if (this.dependencies.enhancedSearchEngine) {
            const semanticSearchTool = new SemanticSearchTool(this.dependencies.enhancedSearchEngine);
            const hybridSearchTool = new HybridSearchTool(this.dependencies.enhancedSearchEngine);
            this.tools.set('semantic_search', semanticSearchTool);
            this.tools.set('hybrid_search', hybridSearchTool);
        }
        // Register knowledge graph tools if available
        if (this.dependencies.knowledgeGraphService) {
            const { GetEntityHistoryTool } = require('./GetEntityHistoryTool.js');
            const { FindRelatedConversationsTool } = require('./FindRelatedConversationsTool.js');
            const { GetKnowledgeGraphTool } = require('./GetKnowledgeGraphTool.js');
            const getEntityHistoryTool = new GetEntityHistoryTool(this.dependencies.knowledgeGraphService);
            const findRelatedConversationsTool = new FindRelatedConversationsTool(this.dependencies.knowledgeGraphService);
            const getKnowledgeGraphTool = new GetKnowledgeGraphTool(this.dependencies.knowledgeGraphService);
            this.tools.set('get_entity_history', getEntityHistoryTool);
            this.tools.set('find_related_conversations', findRelatedConversationsTool);
            this.tools.set('get_knowledge_graph', getKnowledgeGraphTool);
            // Register proactive assistance tools
            try {
                const { GetProactiveInsightsTool, CheckForConflictsTool, SuggestRelevantContextTool, AutoTagConversationTool } = require('./proactive/index.js');
                const getProactiveInsightsTool = new GetProactiveInsightsTool(this.dependencies);
                const checkForConflictsTool = new CheckForConflictsTool(this.dependencies);
                const suggestRelevantContextTool = new SuggestRelevantContextTool(this.dependencies);
                const autoTagConversationTool = new AutoTagConversationTool(this.dependencies);
                this.tools.set('get_proactive_insights', getProactiveInsightsTool);
                this.tools.set('check_for_conflicts', checkForConflictsTool);
                this.tools.set('suggest_relevant_context', suggestRelevantContextTool);
                this.tools.set('auto_tag_conversation', autoTagConversationTool);
            }
            catch (error) {
                console.warn('Failed to register proactive tools:', error);
            }
        }
    }
    /**
     * Get a tool by name
     */
    getTool(name) {
        return this.tools.get(name);
    }
    /**
     * Get all available tools
     */
    getAllTools() {
        return Array.from(this.tools.values());
    }
    /**
     * Get all tool names
     */
    getToolNames() {
        return Array.from(this.tools.keys());
    }
    /**
     * Check if a tool exists
     */
    hasTool(name) {
        return this.tools.has(name);
    }
    /**
     * Execute a tool by name
     */
    async executeTool(name, input, context) {
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }
        const executionContext = BaseTool.createContext(context);
        return await tool.execute(input, executionContext);
    }
    /**
     * Get tool definitions for MCP protocol
     */
    getToolDefinitions() {
        return this.getAllTools().map(tool => tool.getTool());
    }
    /**
     * Get tool definition by name
     */
    getToolDefinition(name) {
        const tool = this.getTool(name);
        return tool?.getTool();
    }
    /**
     * Validate tool input
     */
    validateToolInput(name, input) {
        const tool = this.getTool(name);
        if (!tool) {
            throw new Error(`Tool '${name}' not found`);
        }
        // Use the tool's validation method
        return tool.validateInput(input);
    }
}
/**
 * Factory function to create a tool registry
 */
export function createToolRegistry(dependencies) {
    return new ToolRegistry(dependencies);
}
/**
 * Utility function to get all tool definitions for MCP
 */
export function getAllToolDefinitions() {
    // Import tool definitions from MCP types
    const { AllTools } = require('../types/mcp');
    return AllTools;
}
/**
 * Type guard to check if a string is a valid tool name
 */
export function isValidToolName(name) {
    const validNames = [
        'save_message',
        'search_messages',
        'get_conversation',
        'get_conversations',
        'delete_conversation',
        'semantic_search',
        'hybrid_search',
        'get_context_summary',
        'get_relevant_snippets',
        'configure_llm_provider',
        'get_progressive_detail',
        'get_entity_history',
        'find_related_conversations',
        'get_knowledge_graph',
        'get_proactive_insights',
        'check_for_conflicts',
        'suggest_relevant_context',
        'auto_tag_conversation'
    ];
    return validNames.includes(name);
}
/**
 * Tool execution helper with error handling
 */
export async function executeToolSafely(registry, toolName, input, context) {
    try {
        if (!isValidToolName(toolName)) {
            return {
                success: false,
                error: 'InvalidToolName',
                details: `'${toolName}' is not a valid tool name`
            };
        }
        const result = await registry.executeTool(toolName, input, context);
        return {
            success: true,
            result
        };
    }
    catch (error) {
        console.error(`Error executing tool '${toolName}':`, error);
        return {
            success: false,
            error: error instanceof Error ? error.name : 'UnknownError',
            details: error instanceof Error ? error.message : 'An unknown error occurred'
        };
    }
}
/**
 * Get tool statistics
 */
export function getToolStatistics(registry) {
    const tools = registry.getAllTools();
    const toolNames = registry.getToolNames();
    const toolDescriptions = {};
    tools.forEach(tool => {
        const name = tool.getName();
        toolDescriptions[name] = tool.getDescription();
    });
    return {
        totalTools: tools.length,
        toolNames,
        toolDescriptions
    };
}
//# sourceMappingURL=index.js.map