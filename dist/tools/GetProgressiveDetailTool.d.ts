/**
 * GetProgressiveDetail Tool Implementation
 *
 * This tool provides progressive detail retrieval for conversations,
 * allowing users to start with summaries and drill down to specifics.
 * It manages token budgets while progressively revealing more detail.
 */
import { BaseTool, ToolContext } from './BaseTool.js';
import { GetProgressiveDetailInput } from '../types/schemas.js';
import { ConversationRepository, MessageRepository, SummaryRepository } from '../storage/repositories/index.js';
/**
 * Response interface for get_progressive_detail tool
 */
export interface GetProgressiveDetailResponse {
    /** Conversation ID */
    conversationId: string;
    /** Current detail level */
    currentLevel: 'brief' | 'standard' | 'detailed' | 'full';
    /** Progressive content */
    content: {
        /** Summary text (if applicable) */
        summary?: string;
        /** Key messages */
        keyMessages?: Array<{
            id: string;
            role: string;
            content: string;
            timestamp: number;
            relevance?: number;
        }>;
        /** Additional context messages */
        contextMessages?: Array<{
            id: string;
            role: string;
            content: string;
            timestamp: number;
        }>;
    };
    /** Token usage information */
    tokens: {
        used: number;
        remaining: number;
        breakdown: {
            summary: number;
            keyMessages: number;
            context: number;
        };
    };
    /** Navigation options */
    navigation: {
        canExpand: boolean;
        nextLevel?: 'standard' | 'detailed' | 'full';
        estimatedNextTokens?: number;
    };
    /** Metadata */
    metadata: {
        conversationTitle: string;
        messageCount: number;
        timeRange: {
            start: number;
            end: number;
        };
    };
}
/**
 * Dependencies required by GetProgressiveDetailTool
 */
export interface GetProgressiveDetailDependencies {
    conversationRepository: ConversationRepository;
    messageRepository: MessageRepository;
    summaryRepository: SummaryRepository;
}
/**
 * Implementation of the get_progressive_detail MCP tool
 */
export declare class GetProgressiveDetailTool extends BaseTool<GetProgressiveDetailInput, GetProgressiveDetailResponse> {
    private conversationRepo;
    private messageRepo;
    private summaryRepo;
    private tokenCounter;
    constructor(dependencies: GetProgressiveDetailDependencies);
    /**
     * Execute the get_progressive_detail tool
     */
    protected executeImpl(input: GetProgressiveDetailInput, _context: ToolContext): Promise<GetProgressiveDetailResponse>;
    /**
     * Build progressive content based on detail level
     */
    private buildProgressiveContent;
    /**
     * Select key messages based on importance
     */
    private selectKeyMessages;
    /**
     * Select additional context messages
     */
    private selectContextMessages;
    /**
     * Score message importance
     */
    private scoreMessageImportance;
    /**
     * Fit messages to token budget
     */
    private fitMessagesToTokenBudget;
    /**
     * Calculate token usage
     */
    private calculateTokenUsage;
    /**
     * Determine navigation options
     */
    private determineNavigation;
    /**
     * Get name for tool registration
     */
    getName(): string;
    /**
     * Get description for tool
     */
    getDescription(): string;
    /**
     * Static factory method
     */
    static create(dependencies: GetProgressiveDetailDependencies): GetProgressiveDetailTool;
}
//# sourceMappingURL=GetProgressiveDetailTool.d.ts.map