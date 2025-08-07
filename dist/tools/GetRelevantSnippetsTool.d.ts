/**
 * Get Relevant Snippets Tool
 *
 * MCP tool for retrieving context-aware snippets based on queries using intelligent
 * context assembly. This tool provides the core context retrieval functionality for Phase 2.
 */
import { BaseTool, ToolContext } from './BaseTool.js';
import { GetRelevantSnippetsInput } from '../types/schemas.js';
import { ContextAssembler } from '../context/ContextAssembler.js';
import { EmbeddingManager } from '../search/EmbeddingManager.js';
import { MessageRepository } from '../storage/repositories/MessageRepository.js';
import { SummaryRepository } from '../storage/repositories/SummaryRepository.js';
/**
 * Dependencies required by GetRelevantSnippetsTool
 */
export interface GetRelevantSnippetsDependencies {
    contextAssembler: ContextAssembler;
    embeddingManager: EmbeddingManager;
    messageRepository: MessageRepository;
    summaryRepository: SummaryRepository;
}
/**
 * Response format for get_relevant_snippets tool
 */
export interface GetRelevantSnippetsResponse {
    /** The assembled context text */
    contextText: string;
    /** Total token count of the assembled context */
    tokenCount: number;
    /** Breakdown of token usage by category */
    tokenBreakdown: {
        query: number;
        summaries: number;
        messages: number;
        metadata: number;
        buffer: number;
    };
    /** Array of included snippets with metadata */
    snippets: Array<{
        /** Unique identifier of the snippet */
        id: string;
        /** Type of snippet (summary or message) */
        type: 'summary' | 'message';
        /** Relevance score (0-1) */
        relevanceScore: number;
        /** Token count of this snippet */
        tokenCount: number;
        /** Position in the assembled context */
        position: number;
        /** Source conversation ID */
        conversationId: string;
        /** Creation timestamp */
        createdAt: number;
        /** Preview of the content */
        preview: string;
    }>;
    /** Assembly strategy used */
    strategy: string;
    /** Total number of candidates evaluated */
    candidatesEvaluated: number;
    /** Average relevance score of included snippets */
    averageRelevance: number;
    /** Token efficiency (used tokens / max tokens) */
    tokenEfficiency: number;
    /** Processing time in milliseconds */
    processingTime: number;
}
/**
 * Get Relevant Snippets Tool implementation
 */
export declare class GetRelevantSnippetsTool extends BaseTool<GetRelevantSnippetsInput, GetRelevantSnippetsResponse> {
    private contextAssembler;
    constructor(dependencies: GetRelevantSnippetsDependencies);
    /**
     * Execute the tool implementation
     */
    protected executeImpl(params: GetRelevantSnippetsInput, _context: ToolContext): Promise<GetRelevantSnippetsResponse>;
    /**
     * Format the assembled context into tool response format
     */
    private formatResponse;
    /**
     * Merge multiple contexts into a single response
     */
    private mergeContexts;
    /**
     * Generate a preview of content around a specific position
     */
    private generatePreview;
    /**
     * Factory method to create the tool
     */
    static create(dependencies: GetRelevantSnippetsDependencies): GetRelevantSnippetsTool;
}
//# sourceMappingURL=GetRelevantSnippetsTool.d.ts.map