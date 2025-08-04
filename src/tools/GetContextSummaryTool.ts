/**
 * Get Context Summary Tool
 * 
 * MCP tool for retrieving intelligent conversation summaries with context management.
 * Supports hierarchical summarization and token budget optimization.
 */

import { BaseTool, ToolContext } from './BaseTool.js';
import { MCPTool } from '../types/mcp.js';
import { ProviderManager } from '../context/ProviderManager.js';
import { ConversationRepository, MessageRepository } from '../storage/repositories/index.js';
import { createTokenCounter } from '../context/TokenCounter.js';
import { z } from 'zod';

/**
 * Input schema for get_context_summary tool
 */
const GetContextSummarySchema = z.object({
  query: z.string().min(1).describe('Query to contextualize the summary'),
  conversationIds: z.array(z.string()).optional().describe('Specific conversations to summarize'),
  timeRange: z.object({
    start: z.string().datetime().describe('Start date (ISO 8601)'),
    end: z.string().datetime().describe('End date (ISO 8601)')
  }).optional().describe('Time range filter'),
  maxTokens: z.number().min(50).max(8000).default(2000).describe('Maximum tokens for the summary'),
  level: z.enum(['brief', 'standard', 'detailed']).default('standard').describe('Summary detail level'),
  strategy: z.enum(['priority', 'cost-optimal', 'performance', 'quality']).optional().describe('Provider selection strategy'),
  focusTopics: z.array(z.string()).optional().describe('Topics to emphasize in summary'),
  includeMetadata: z.boolean().default(false).describe('Include conversation metadata')
});

type GetContextSummaryInput = z.infer<typeof GetContextSummarySchema>;

/**
 * Tool dependencies
 */
interface GetContextSummaryDependencies {
  providerManager: ProviderManager;
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
}

/**
 * Get Context Summary Tool implementation
 */
export class GetContextSummaryTool extends BaseTool<GetContextSummaryInput, any> {
  private providerManager: ProviderManager;
  private conversationRepository: ConversationRepository;
  private messageRepository: MessageRepository;

  constructor(dependencies: GetContextSummaryDependencies) {
    const tool: MCPTool = {
      name: 'get_context_summary',
      description: 'Get intelligent summary of conversations with context management and token optimization',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Query to contextualize the summary'
          },
          conversationIds: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific conversations to summarize'
          },
          timeRange: {
            type: 'object',
            properties: {
              start: { type: 'string', format: 'date-time' },
              end: { type: 'string', format: 'date-time' }
            },
            description: 'Time range filter'
          },
          maxTokens: {
            type: 'number',
            minimum: 50,
            maximum: 8000,
            default: 2000,
            description: 'Maximum tokens for the summary'
          },
          level: {
            type: 'string',
            enum: ['brief', 'standard', 'detailed'],
            default: 'standard',
            description: 'Summary detail level'
          },
          strategy: {
            type: 'string',
            enum: ['priority', 'cost-optimal', 'performance', 'quality'],
            description: 'Provider selection strategy'
          },
          focusTopics: {
            type: 'array',
            items: { type: 'string' },
            description: 'Topics to emphasize in summary'
          },
          includeMetadata: {
            type: 'boolean',
            default: false,
            description: 'Include conversation metadata'
          }
        },
        required: ['query']
      }
    };

    super(tool, GetContextSummarySchema);
    this.providerManager = dependencies.providerManager;
    this.conversationRepository = dependencies.conversationRepository;
    this.messageRepository = dependencies.messageRepository;
  }

  /**
   * Execute the tool implementation
   */
  protected async executeImpl(params: GetContextSummaryInput, _context: ToolContext): Promise<any> {
    // Find relevant conversations
    const conversations = await this.findRelevantConversations(params);
    
    if (conversations.length === 0) {
      return {
        summary: 'No conversations found matching the specified criteria.',
        conversationCount: 0,
        tokenCount: 0,
        level: params.level,
        metadata: { query: params.query }
      };
    }

    // Retrieve messages for conversations
    const messages = await this.retrieveMessages(conversations, params);
    
    if (messages.length === 0) {
      return {
        summary: 'No messages found in the specified conversations.',
        conversationCount: conversations.length,
        tokenCount: 0,
        level: params.level,
        metadata: { query: params.query }
      };
    }

    // Generate summary using provider manager
    const summaryResponse = await this.providerManager.generateSummary({
      messages,
      level: params.level,
      maxTokens: Math.min(params.maxTokens, 4000), // Reasonable limit
      focusTopics: params.focusTopics,
      context: {
        conversationId: conversations[0].id, // Primary conversation
        timeRange: params.timeRange ? {
          start: new Date(params.timeRange.start),
          end: new Date(params.timeRange.end)
        } : undefined
      }
    }, params.strategy);

    // Prepare response
    return {
      summary: summaryResponse.summary,
      conversationCount: conversations.length,
      messageCount: messages.length,
      tokenCount: summaryResponse.tokenCount,
      inputTokens: summaryResponse.inputTokens,
      outputTokens: summaryResponse.outputTokens,
      level: params.level,
      cost: summaryResponse.cost,
      qualityScore: summaryResponse.qualityScore,
      processingTime: summaryResponse.processingTime,
      metadata: {
        query: params.query,
        conversations: conversations.map((c: any) => ({
          id: c.id,
          title: c.title,
          messageCount: c.message_count,
          createdAt: c.created_at
        })),
        provider: summaryResponse.metadata?.model,
        ...(params.includeMetadata && summaryResponse.metadata)
      }
    };
  }


  /**
   * Find relevant conversations based on parameters
   */
  private async findRelevantConversations(params: GetContextSummaryInput) {
    try {
      // If specific conversation IDs provided, retrieve those
      if (params.conversationIds && params.conversationIds.length > 0) {
        const conversations = [];
        for (const id of params.conversationIds) {
          const conversation = await this.conversationRepository.findById(id);
          if (conversation) {
            conversations.push(conversation);
          }
        }
        return conversations;
      }

      // Otherwise, get recent conversations
      const result = await this.conversationRepository.findAll(10, 0, 'updated_at', 'DESC');
      return result.data;

    } catch (error) {
      console.error('Error finding conversations:', error);
      throw new Error('Failed to find relevant conversations');
    }
  }

  /**
   * Retrieve messages from conversations
   */
  private async retrieveMessages(conversations: any[], params: GetContextSummaryInput) {
    try {
      const allMessages = [];
      const tokenCounter = createTokenCounter('gpt-3.5-turbo'); // Default model for counting

      let totalTokens = 0;
      const tokenBudget = Math.floor(params.maxTokens * 0.8); // 80% for input, 20% for output

      // Sort conversations by relevance/recency
      const sortedConversations = conversations.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      for (const conversation of sortedConversations) {
        const messages = await this.messageRepository.findByConversationId(
          conversation.id,
          { limit: 100, orderBy: 'created_at', orderDir: 'ASC' }
        );

        // Add messages while respecting token budget
        for (const message of messages) {
          const messageTokens = tokenCounter.countText(message.content).count;
          
          if (totalTokens + messageTokens > tokenBudget) {
            console.log(`Token budget reached: ${totalTokens}/${tokenBudget}`);
            break;
          }

          allMessages.push(message);
          totalTokens += messageTokens;
        }

        if (totalTokens >= tokenBudget) {
          break;
        }
      }

      // Sort messages chronologically
      return allMessages.sort((a, b) => a.createdAt - b.createdAt);

    } catch (error) {
      console.error('Error retrieving messages:', error);
      throw new Error('Failed to retrieve conversation messages');
    }
  }

  /**
   * Create factory method for tool
   */
  static create(dependencies: GetContextSummaryDependencies): GetContextSummaryTool {
    return new GetContextSummaryTool(dependencies);
  }
}