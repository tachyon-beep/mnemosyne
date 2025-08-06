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

    // Try to generate summary using provider manager
    let summaryResponse;
    try {
      summaryResponse = await this.providerManager.generateSummary({
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
    } catch (error) {
      // Fallback when no LLM providers are configured
      const fallbackSummary = this.generateFallbackSummary(messages, params);
      summaryResponse = {
        summary: fallbackSummary,
        tokenCount: fallbackSummary.length, // Rough estimate
        inputTokens: messages.reduce((sum, m) => sum + m.content.length, 0),
        outputTokens: fallbackSummary.length,
        cost: 0,
        qualityScore: 0.5,
        processingTime: Date.now(),
        metadata: { model: 'fallback', error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }

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
   * Generate a basic summary without LLM
   */
  private generateFallbackSummary(messages: any[], params: GetContextSummaryInput): string {
    // Sort messages by timestamp
    const sortedMessages = messages.sort((a, b) => a.createdAt - b.createdAt);
    
    // Build a basic summary based on the level
    const messageCount = sortedMessages.length;
    const firstMessage = sortedMessages[0];
    const lastMessage = sortedMessages[messageCount - 1];
    
    let summary = `Context Summary (${params.level} level):\n\n`;
    
    if (params.level === 'brief') {
      summary += `Found ${messageCount} messages related to "${params.query}".\n`;
      summary += `Time range: ${new Date(firstMessage.createdAt).toLocaleDateString()} to ${new Date(lastMessage.createdAt).toLocaleDateString()}.\n`;
      
      // Extract key topics from messages
      const topics = this.extractTopics(messages);
      if (topics.length > 0) {
        summary += `Key topics: ${topics.slice(0, 5).join(', ')}.`;
      }
      
    } else if (params.level === 'standard') {
      summary += `Query: "${params.query}"\n`;
      summary += `Total messages: ${messageCount}\n`;
      summary += `Time period: ${new Date(firstMessage.createdAt).toISOString()} to ${new Date(lastMessage.createdAt).toISOString()}\n\n`;
      
      // Include first and last message previews
      summary += `First message (${firstMessage.role}): ${firstMessage.content.substring(0, 150)}...\n\n`;
      summary += `Last message (${lastMessage.role}): ${lastMessage.content.substring(0, 150)}...\n\n`;
      
      // Extract and include topics
      const topics = this.extractTopics(messages);
      if (topics.length > 0) {
        summary += `Main topics discussed: ${topics.slice(0, 10).join(', ')}.`;
      }
      
    } else { // detailed
      summary += `Detailed Context for: "${params.query}"\n`;
      summary += `Message count: ${messageCount}\n`;
      summary += `Full time range: ${new Date(firstMessage.createdAt).toISOString()} to ${new Date(lastMessage.createdAt).toISOString()}\n\n`;
      
      // Include more message samples
      const sampleIndices = [0, Math.floor(messageCount / 3), Math.floor(2 * messageCount / 3), messageCount - 1];
      summary += 'Message samples:\n';
      
      for (const idx of sampleIndices) {
        if (idx < messageCount) {
          const msg = sortedMessages[idx];
          summary += `\n[${new Date(msg.createdAt).toLocaleString()}] ${msg.role}:\n`;
          summary += `${msg.content.substring(0, 200)}...\n`;
        }
      }
      
      // Extract comprehensive topic list
      const topics = this.extractTopics(messages);
      if (topics.length > 0) {
        summary += `\nAll topics: ${topics.join(', ')}.`;
      }
    }
    
    if (params.focusTopics && params.focusTopics.length > 0) {
      summary += `\n\nFocus topics requested: ${params.focusTopics.join(', ')}`;
    }
    
    return summary;
  }
  
  /**
   * Extract topics from messages (basic implementation)
   */
  private extractTopics(messages: any[]): string[] {
    const wordFreq = new Map<string, number>();
    
    // Count word frequencies
    for (const msg of messages) {
      const words = msg.content.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length > 4); // Only words > 4 chars
      
      for (const word of words) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    }
    
    // Sort by frequency and return top words as topics
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([word]) => word);
  }

  /**
   * Create factory method for tool
   */
  static create(dependencies: GetContextSummaryDependencies): GetContextSummaryTool {
    return new GetContextSummaryTool(dependencies);
  }
}