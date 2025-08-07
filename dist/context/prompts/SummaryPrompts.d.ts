/**
 * Summary Prompts - Prompt templates for hierarchical conversation summarization
 *
 * This module provides carefully crafted prompts for generating high-quality
 * conversation summaries at different levels of detail, with specialized
 * prompts for different conversation types.
 */
import { Message } from '../../types/interfaces.js';
/**
 * Prompt template configuration
 */
export interface PromptConfig {
    /** Target token count for the summary */
    targetTokens: number;
    /** Conversation type (affects prompt selection) */
    conversationType: string;
    /** Focus topics to emphasize */
    focusTopics?: string[];
    /** Previous summary to build upon */
    previousSummary?: string;
    /** Whether to include temporal context */
    includeTemporalContext: boolean;
}
/**
 * Generated prompt with metadata
 */
export interface GeneratedPrompt {
    /** System prompt for the LLM */
    systemPrompt: string;
    /** User prompt with conversation content */
    userPrompt: string;
    /** Expected token count */
    expectedTokens: number;
    /** Prompt metadata */
    metadata: {
        level: 'brief' | 'standard' | 'detailed';
        conversationType: string;
        templateVersion: string;
    };
}
/**
 * Summary prompt generator
 */
export declare class SummaryPrompts {
    private readonly templateVersion;
    /**
     * Generate prompt for brief summary (50-100 tokens)
     */
    generateBriefPrompt(messages: Message[], config: PromptConfig): GeneratedPrompt;
    /**
     * Generate prompt for standard summary (200-300 tokens)
     */
    generateStandardPrompt(messages: Message[], config: PromptConfig): GeneratedPrompt;
    /**
     * Generate prompt for detailed summary (500-1000 tokens)
     */
    generateDetailedPrompt(messages: Message[], config: PromptConfig): GeneratedPrompt;
    /**
     * Get system prompt for brief summaries
     */
    private getBriefSystemPrompt;
    /**
     * Get system prompt for standard summaries
     */
    private getStandardSystemPrompt;
    /**
     * Get system prompt for detailed summaries
     */
    private getDetailedSystemPrompt;
    /**
     * Get type-specific additions for different conversation types
     */
    private getTypeSpecificAdditions;
    /**
     * Build user prompt with conversation content
     */
    private buildUserPrompt;
    /**
     * Get level-specific instructions
     */
    private getLevelSpecificInstructions;
    /**
     * Get conversation timespan
     */
    private getConversationTimespan;
    /**
     * Format timestamp for display
     */
    private formatTimestamp;
    /**
     * Estimate prompt token count
     */
    estimatePromptTokens(prompt: GeneratedPrompt): number;
    /**
     * Validate prompt length
     */
    validatePromptLength(prompt: GeneratedPrompt, maxTokens: number): boolean;
}
//# sourceMappingURL=SummaryPrompts.d.ts.map