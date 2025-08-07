/**
 * Tools Module - Export barrel and tool registry
 * 
 * This module provides all MCP tool implementations for the persistence system
 * and includes a tool registry for easy instantiation and management.
 */

// Base tool classes and utilities
export { BaseTool } from './BaseTool.js';
export type { ToolContext } from './BaseTool.js';
export {
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  isKnownError,
  wrapDatabaseOperation
} from './BaseTool.js';

// Tool implementations
export { SaveMessageTool } from './SaveMessageTool.js';
export type {
  SaveMessageResponse,
  SaveMessageDependencies
} from './SaveMessageTool.js';

export { SearchMessagesTool } from './SearchMessagesTool.js';
export type {
  SearchMessagesResponse,
  SearchMessagesDependencies,
  EnhancedSearchResult
} from './SearchMessagesTool.js';

export { GetConversationTool } from './GetConversationTool.js';
export type {
  GetConversationResponse,
  GetConversationDependencies,
  MessageWithContext
} from './GetConversationTool.js';

export { GetConversationsTool } from './GetConversationsTool.js';
export type {
  GetConversationsResponse,
  GetConversationsDependencies,
  ConversationWithMetadata
} from './GetConversationsTool.js';

export { DeleteConversationTool } from './DeleteConversationTool.js';
export type {
  DeleteConversationResponse,
  DeleteConversationDependencies
} from './DeleteConversationTool.js';

export { SemanticSearchTool } from './SemanticSearchTool.js';
export { HybridSearchTool } from './HybridSearchTool.js';
export { GetContextSummaryTool } from './GetContextSummaryTool.js';
export { GetRelevantSnippetsTool } from './GetRelevantSnippetsTool.js';
export type {
  GetRelevantSnippetsResponse,
  GetRelevantSnippetsDependencies
} from './GetRelevantSnippetsTool.js';
export { ConfigureLLMProviderTool } from './ConfigureLLMProviderTool.js';
export type {
  ConfigureLLMProviderResponse,
  ConfigureLLMProviderDependencies
} from './ConfigureLLMProviderTool.js';

// Knowledge Graph tools
export { GetEntityHistoryTool } from './GetEntityHistoryTool.js';
export type { GetEntityHistoryArgs } from './GetEntityHistoryTool.js';

export { FindRelatedConversationsTool } from './FindRelatedConversationsTool.js';
export type { FindRelatedConversationsArgs } from './FindRelatedConversationsTool.js';

export { GetKnowledgeGraphTool } from './GetKnowledgeGraphTool.js';
export type { GetKnowledgeGraphArgs } from './GetKnowledgeGraphTool.js';

// Proactive Assistance tools
export { 
  GetProactiveInsightsTool,
  CheckForConflictsTool,
  SuggestRelevantContextTool,
  AutoTagConversationTool
} from './proactive/index.js';
export type {
  GetProactiveInsightsResponse,
  GetProactiveInsightsDependencies,
  CheckForConflictsResponse,
  CheckForConflictsDependencies,
  SuggestRelevantContextResponse,
  SuggestRelevantContextDependencies,
  AutoTagConversationResponse,
  AutoTagConversationDependencies
} from './proactive/index.js';

// Analytics tools
export { GetConversationAnalyticsTool } from './GetConversationAnalyticsTool.js';
export type {
  GetConversationAnalyticsResponse,
  GetConversationAnalyticsDependencies
} from './GetConversationAnalyticsTool.js';

export { AnalyzeProductivityPatternsTool } from './AnalyzeProductivityPatternsTool.js';
export type {
  AnalyzeProductivityPatternsResponse,
  AnalyzeProductivityPatternsDependencies,
  ProductivityPattern,
  SessionAnalysis,
  QuestionPatternAnalysis
} from './AnalyzeProductivityPatternsTool.js';

export { DetectKnowledgeGapsTool } from './DetectKnowledgeGapsTool.js';
export type {
  DetectKnowledgeGapsResponse,
  DetectKnowledgeGapsDependencies,
  KnowledgeGapCategory,
  TopicCoverage,
  ResolutionSuggestion
} from './DetectKnowledgeGapsTool.js';

export { TrackDecisionEffectivenessTool } from './TrackDecisionEffectivenessTool.js';
export type {
  TrackDecisionEffectivenessResponse,
  TrackDecisionEffectivenessDependencies,
  DecisionQualityAnalysis,
  DecisionOutcomeAnalysis,
  DecisionReversalAnalysis,
  DecisionTypeAnalysis
} from './TrackDecisionEffectivenessTool.js';

export { GenerateAnalyticsReportTool } from './GenerateAnalyticsReportTool.js';
export type {
  GenerateAnalyticsReportResponse,
  GenerateAnalyticsReportDependencies,
  ChartData,
  ReportSection,
  ExecutiveSummary
} from './GenerateAnalyticsReportTool.js';

// Performance Monitoring tools
export { GetIndexPerformanceReportTool } from './GetIndexPerformanceReportTool.js';
export { ManageIndexOptimizationTool } from './ManageIndexOptimizationTool.js';

// Re-export tool schemas and types for convenience
export type {
  SaveMessageInput,
  SearchMessagesInput,
  GetConversationInput,
  GetConversationsInput,
  DeleteConversationInput,
  GetRelevantSnippetsInput,
  ConfigureLLMProviderInput,
  GetProactiveInsightsInput,
  CheckForConflictsInput,
  SuggestRelevantContextInput,
  AutoTagConversationInput,
  GetConversationAnalyticsInput,
  AnalyzeProductivityPatternsInput,
  DetectKnowledgeGapsInput,
  TrackDecisionEffectivenessInput,
  GenerateAnalyticsReportInput
} from '../types/schemas.js';

// Re-export MCP tool definitions
export {
  SaveMessageTool as SaveMessageToolDef,
  SearchMessagesTool as SearchMessagesToolDef,
  GetConversationTool as GetConversationToolDef,
  GetConversationsTool as GetConversationsToolDef,
  DeleteConversationTool as DeleteConversationToolDef,
  GetRelevantSnippetsTool as GetRelevantSnippetsToolDef,
  ConfigureLLMProviderTool as ConfigureLLMProviderToolDef,
  GetProgressiveDetailTool as GetProgressiveDetailToolDef,
  GetProactiveInsightsToolDef,
  CheckForConflictsToolDef,
  SuggestRelevantContextToolDef,
  AutoTagConversationToolDef,
  GetConversationAnalyticsToolDef,
  AnalyzeProductivityPatternsToolDef,
  DetectKnowledgeGapsToolDef,
  TrackDecisionEffectivenessToolDef,
  GenerateAnalyticsReportToolDef,
  AllTools,
  type MCPTool,
  type MCPToolResult,
  type ToolName
} from '../types/mcp.js';

// Import required dependencies for the registry
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { SearchEngine } from '../search/SearchEngine.js';
import { EnhancedSearchEngine } from '../search/EnhancedSearchEngine.js';
import { SaveMessageTool } from './SaveMessageTool.js';
import { SearchMessagesTool } from './SearchMessagesTool.js';
import { GetConversationTool } from './GetConversationTool.js';
import { GetConversationsTool } from './GetConversationsTool.js';
import { DeleteConversationTool } from './DeleteConversationTool.js';
import { SemanticSearchTool } from './SemanticSearchTool.js';
import { HybridSearchTool } from './HybridSearchTool.js';
// Import tools that are registered dynamically in the ToolRegistry
import { GetRelevantSnippetsTool as _GetRelevantSnippetsTool } from './GetRelevantSnippetsTool.js';
import { ConfigureLLMProviderTool as _ConfigureLLMProviderTool } from './ConfigureLLMProviderTool.js';
import { GetProgressiveDetailTool as _GetProgressiveDetailTool } from './GetProgressiveDetailTool.js';
// Analytics tools imports - temporarily disabled for build
// import { GetConversationAnalyticsTool } from './GetConversationAnalyticsTool.js';
// import { AnalyzeProductivityPatternsTool } from './AnalyzeProductivityPatternsTool.js';
// import { DetectKnowledgeGapsTool } from './DetectKnowledgeGapsTool.js';
// import { TrackDecisionEffectivenessTool } from './TrackDecisionEffectivenessTool.js';
// import { GenerateAnalyticsReportTool } from './GenerateAnalyticsReportTool.js';
import { ToolName } from '../types/mcp.js';
import { BaseTool, ToolContext } from './BaseTool.js';
// Analytics dependencies - temporarily disabled for build
import { DatabaseManager } from '../storage/Database.js';
// import { createOptimizedAnalyticsSystem } from '../analytics/performance/index.js';
// import { AnalyticsEngine } from '../analytics/services/AnalyticsEngine.js';
// import { 
//   ConversationFlowAnalyzer,
//   ProductivityAnalyzer,
//   KnowledgeGapDetector,
//   DecisionTracker
// } from '../analytics/analyzers/index.js';
// import {
//   ConversationAnalyticsRepository,
//   ProductivityPatternsRepository,
//   KnowledgeGapsRepository,
//   DecisionTrackingRepository
// } from '../analytics/repositories/index.js';

/**
 * Dependencies required by the tool registry
 */
export interface ToolRegistryDependencies {
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  searchEngine: SearchEngine;
  enhancedSearchEngine?: EnhancedSearchEngine; // Optional for enhanced search features
  knowledgeGraphService?: any; // Optional for knowledge graph features
  databaseManager?: DatabaseManager; // Optional for analytics features
  enableAnalytics?: boolean; // Feature flag for analytics tools
}

/**
 * Tool registry for managing and instantiating MCP tools
 */
export class ToolRegistry {
  private readonly tools: Map<ToolName, BaseTool>;
  private readonly dependencies: ToolRegistryDependencies;

  constructor(dependencies: ToolRegistryDependencies) {
    this.dependencies = dependencies;
    this.tools = new Map();
    this.initializeTools();
  }

  /**
   * Initialize all available tools
   */
  private initializeTools(): void {
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
        const { 
          GetProactiveInsightsTool,
          CheckForConflictsTool,
          SuggestRelevantContextTool,
          AutoTagConversationTool
        } = require('./proactive/index.js');
        
        const getProactiveInsightsTool = new GetProactiveInsightsTool(this.dependencies);
        const checkForConflictsTool = new CheckForConflictsTool(this.dependencies);  
        const suggestRelevantContextTool = new SuggestRelevantContextTool(this.dependencies);
        const autoTagConversationTool = new AutoTagConversationTool(this.dependencies);
        
        this.tools.set('get_proactive_insights', getProactiveInsightsTool);
        this.tools.set('check_for_conflicts', checkForConflictsTool);
        this.tools.set('suggest_relevant_context', suggestRelevantContextTool);
        this.tools.set('auto_tag_conversation', autoTagConversationTool);
      } catch (error) {
        console.warn('Failed to register proactive tools:', error);
      }
    }

    // Analytics tools temporarily disabled for build
    /* 
    if (this.dependencies.enableAnalytics && this.dependencies.databaseManager) {
      try {
        // Create analytics dependencies
        const analyticsDeps = this.createAnalyticsDependencies(this.dependencies.databaseManager);
        
        // Create analytics tool instances
        const getConversationAnalyticsTool = new GetConversationAnalyticsTool({
          analyticsEngine: analyticsDeps.analyticsEngine,
          conversationRepository: this.dependencies.conversationRepository,
          messageRepository: this.dependencies.messageRepository,
          conversationFlowAnalyzer: analyticsDeps.conversationFlowAnalyzer,
          productivityAnalyzer: analyticsDeps.productivityAnalyzer,
          knowledgeGapDetector: analyticsDeps.knowledgeGapDetector,
          decisionTracker: analyticsDeps.decisionTracker
        });
        
        const analyzeProductivityPatternsTool = new AnalyzeProductivityPatternsTool({
          analyticsEngine: analyticsDeps.analyticsEngine,
          conversationRepository: this.dependencies.conversationRepository,
          messageRepository: this.dependencies.messageRepository,
          productivityAnalyzer: analyticsDeps.productivityAnalyzer,
          productivityPatternsRepository: analyticsDeps.productivityPatternsRepository
        });
        
        const detectKnowledgeGapsTool = new DetectKnowledgeGapsTool({
          analyticsEngine: analyticsDeps.analyticsEngine,
          conversationRepository: this.dependencies.conversationRepository,
          messageRepository: this.dependencies.messageRepository,
          knowledgeGapDetector: analyticsDeps.knowledgeGapDetector,
          knowledgeGapsRepository: analyticsDeps.knowledgeGapsRepository
        });
        
        const trackDecisionEffectivenessTool = new TrackDecisionEffectivenessTool({
          analyticsEngine: analyticsDeps.analyticsEngine,
          conversationRepository: this.dependencies.conversationRepository,
          messageRepository: this.dependencies.messageRepository,
          decisionTracker: analyticsDeps.decisionTracker,
          decisionTrackingRepository: analyticsDeps.decisionTrackingRepository
        });
        
        const generateAnalyticsReportTool = new GenerateAnalyticsReportTool({
          analyticsEngine: analyticsDeps.analyticsEngine,
          conversationRepository: this.dependencies.conversationRepository,
          messageRepository: this.dependencies.messageRepository
        });
        
        // Register analytics tools
        this.tools.set('get_conversation_analytics', getConversationAnalyticsTool);
        this.tools.set('analyze_productivity_patterns', analyzeProductivityPatternsTool);
        this.tools.set('detect_knowledge_gaps', detectKnowledgeGapsTool);
        this.tools.set('track_decision_effectiveness', trackDecisionEffectivenessTool);
        this.tools.set('generate_analytics_report', generateAnalyticsReportTool);
        
        console.log('Analytics tools successfully registered');
      } catch (error) {
        console.warn('Failed to register analytics tools:', error);
        // Analytics tools are optional - continue without them
      }
    } else if (this.dependencies.enableAnalytics && !this.dependencies.databaseManager) {
      console.warn('Analytics enabled but DatabaseManager not provided - analytics tools will not be available');
    }
    */
  }

  /**
   * Get a tool by name
   */
  public getTool(name: ToolName): BaseTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all available tools
   */
  public getAllTools(): BaseTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get all tool names
   */
  public getToolNames(): ToolName[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if a tool exists
   */
  public hasTool(name: ToolName): boolean {
    return this.tools.has(name);
  }

  /**
   * Execute a tool by name
   */
  public async executeTool(
    name: ToolName,
    input: unknown,
    context?: Partial<ToolContext>
  ): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    const executionContext = BaseTool.createContext(context);
    return await tool.execute(input, executionContext);
  }

  /**
   * Create analytics dependencies for analytics tools
   * Temporarily disabled for build
   */
  /* 
  private createAnalyticsDependencies(databaseManager: DatabaseManager) {
    // Create analyzers (stateless)
    const conversationFlowAnalyzer = new ConversationFlowAnalyzer();
    const productivityAnalyzer = new ProductivityAnalyzer();
    const knowledgeGapDetector = new KnowledgeGapDetector();
    const decisionTracker = new DecisionTracker();
    
    // Create repositories (require DatabaseManager)
    const conversationAnalyticsRepository = new ConversationAnalyticsRepository(databaseManager);
    const productivityPatternsRepository = new ProductivityPatternsRepository(databaseManager);
    const knowledgeGapsRepository = new KnowledgeGapsRepository(databaseManager);
    const decisionTrackingRepository = new DecisionTrackingRepository(databaseManager);
    
    // Create analytics engine
    const analyticsEngine = new AnalyticsEngine(databaseManager, {
      enableIncrementalProcessing: true,
      cacheExpirationMinutes: 30,
      batchProcessingSize: 100,
      maxProcessingTimeMs: 30000
    });
    
    return {
      analyticsEngine,
      conversationFlowAnalyzer,
      productivityAnalyzer,
      knowledgeGapDetector,
      decisionTracker,
      conversationAnalyticsRepository,
      productivityPatternsRepository,
      knowledgeGapsRepository,
      decisionTrackingRepository
    };
  }
  */

  /**
   * Get tool definitions for MCP protocol
   */
  public getToolDefinitions(): any[] {
    return this.getAllTools().map(tool => tool.getTool());
  }

  /**
   * Get tool definition by name
   */
  public getToolDefinition(name: ToolName): any | undefined {
    const tool = this.getTool(name);
    return tool?.getTool();
  }

  /**
   * Validate tool input
   */
  public validateToolInput(name: ToolName, input: unknown): any {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    // Use the tool's validation method
    return (tool as any).validateInput(input);
  }
}

/**
 * Factory function to create a tool registry
 */
export function createToolRegistry(dependencies: ToolRegistryDependencies): ToolRegistry {
  return new ToolRegistry(dependencies);
}

/**
 * Factory function to create a tool registry with analytics enabled
 */
export function createToolRegistryWithAnalytics(
  dependencies: Omit<ToolRegistryDependencies, 'enableAnalytics'> & {
    databaseManager: DatabaseManager;
  }
): ToolRegistry {
  return new ToolRegistry({
    ...dependencies,
    enableAnalytics: true
  });
}

/**
 * Utility function to get all tool definitions for MCP
 */
export function getAllToolDefinitions(): any[] {
  // Import tool definitions from MCP types
  const { AllTools } = require('../types/mcp');
  return AllTools;
}

/**
 * Type guard to check if a string is a valid tool name
 */
export function isValidToolName(name: string): name is ToolName {
  const validNames: ToolName[] = [
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
    'auto_tag_conversation',
    'get_conversation_analytics',
    'analyze_productivity_patterns',
    'detect_knowledge_gaps',
    'track_decision_effectiveness',
    'generate_analytics_report'
  ];
  return validNames.includes(name as ToolName);
}

/**
 * Tool execution helper with error handling
 */
export async function executeToolSafely(
  registry: ToolRegistry,
  toolName: string,
  input: unknown,
  context?: Partial<ToolContext>
): Promise<{
  success: boolean;
  result?: any;
  error?: string;
  details?: any;
}> {
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
  } catch (error) {
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
export function getToolStatistics(registry: ToolRegistry): {
  totalTools: number;
  toolNames: ToolName[];
  toolDescriptions: Record<ToolName, string>;
} {
  const tools = registry.getAllTools();
  const toolNames = registry.getToolNames();
  
  const toolDescriptions: Record<ToolName, string> = {} as Record<ToolName, string>;
  tools.forEach(tool => {
    const name = tool.getName() as ToolName;
    toolDescriptions[name] = tool.getDescription();
  });

  return {
    totalTools: tools.length,
    toolNames,
    toolDescriptions
  };
}