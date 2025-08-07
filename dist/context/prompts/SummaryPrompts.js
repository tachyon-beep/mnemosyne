/**
 * Summary Prompts - Prompt templates for hierarchical conversation summarization
 *
 * This module provides carefully crafted prompts for generating high-quality
 * conversation summaries at different levels of detail, with specialized
 * prompts for different conversation types.
 */
/**
 * Summary prompt generator
 */
export class SummaryPrompts {
    templateVersion = '1.0.0';
    /**
     * Generate prompt for brief summary (50-100 tokens)
     */
    generateBriefPrompt(messages, config) {
        const systemPrompt = this.getBriefSystemPrompt(config.conversationType);
        const userPrompt = this.buildUserPrompt(messages, config, 'brief');
        return {
            systemPrompt,
            userPrompt,
            expectedTokens: config.targetTokens,
            metadata: {
                level: 'brief',
                conversationType: config.conversationType,
                templateVersion: this.templateVersion
            }
        };
    }
    /**
     * Generate prompt for standard summary (200-300 tokens)
     */
    generateStandardPrompt(messages, config) {
        const systemPrompt = this.getStandardSystemPrompt(config.conversationType);
        const userPrompt = this.buildUserPrompt(messages, config, 'standard');
        return {
            systemPrompt,
            userPrompt,
            expectedTokens: config.targetTokens,
            metadata: {
                level: 'standard',
                conversationType: config.conversationType,
                templateVersion: this.templateVersion
            }
        };
    }
    /**
     * Generate prompt for detailed summary (500-1000 tokens)
     */
    generateDetailedPrompt(messages, config) {
        const systemPrompt = this.getDetailedSystemPrompt(config.conversationType);
        const userPrompt = this.buildUserPrompt(messages, config, 'detailed');
        return {
            systemPrompt,
            userPrompt,
            expectedTokens: config.targetTokens,
            metadata: {
                level: 'detailed',
                conversationType: config.conversationType,
                templateVersion: this.templateVersion
            }
        };
    }
    /**
     * Get system prompt for brief summaries
     */
    getBriefSystemPrompt(conversationType) {
        const basePrompt = `You are an expert conversation summarizer. Your task is to create a BRIEF summary that captures only the most essential points of the conversation.

CRITICAL REQUIREMENTS:
- Keep summary between 50-100 tokens
- Focus ONLY on key decisions, outcomes, and action items
- Use clear, concise language
- Do NOT add information not present in the conversation
- Do NOT include opinions or interpretations
- Preserve important names, dates, and numbers exactly as mentioned

OUTPUT FORMAT:
Provide only the summary text. No preamble, no explanations, no metadata.`;
        const typeSpecificAdditions = this.getTypeSpecificAdditions(conversationType, 'brief');
        return basePrompt + typeSpecificAdditions;
    }
    /**
     * Get system prompt for standard summaries
     */
    getStandardSystemPrompt(conversationType) {
        const basePrompt = `You are an expert conversation summarizer. Your task is to create a STANDARD summary that captures the main points and context of the conversation.

CRITICAL REQUIREMENTS:
- Keep summary between 200-300 tokens
- Include key topics, decisions, outcomes, and important context
- Maintain logical flow and structure
- Preserve important names, dates, numbers, and technical terms exactly
- Do NOT add information not present in the conversation
- Do NOT include opinions or interpretations beyond what was explicitly stated
- Use clear, professional language

STRUCTURE:
- Start with the main topic/purpose
- Cover key discussion points
- Include decisions made and action items
- End with outcomes or next steps if mentioned

OUTPUT FORMAT:
Provide only the summary text. No preamble, no explanations, no metadata.`;
        const typeSpecificAdditions = this.getTypeSpecificAdditions(conversationType, 'standard');
        return basePrompt + typeSpecificAdditions;
    }
    /**
     * Get system prompt for detailed summaries
     */
    getDetailedSystemPrompt(conversationType) {
        const basePrompt = `You are an expert conversation summarizer. Your task is to create a DETAILED summary that comprehensively captures the conversation while maintaining clarity and structure.

CRITICAL REQUIREMENTS:
- Keep summary between 500-1000 tokens
- Include comprehensive coverage of all major topics and subtopics
- Preserve context, rationale, and reasoning behind decisions
- Maintain chronological flow where relevant
- Include all important names, dates, numbers, and technical details exactly
- Capture different perspectives or viewpoints discussed
- Do NOT add information not present in the conversation
- Do NOT include personal opinions or interpretations beyond what was explicitly stated
- Use professional, clear language with appropriate technical terminology

STRUCTURE:
- Opening: Main topic, purpose, and participants (if clear)
- Main Content: Organized by major topics or chronologically
  - Key discussion points with context
  - Arguments, reasoning, and perspectives presented
  - Decisions made with rationale
  - Technical details and specifications
  - Challenges or issues raised
- Closing: Outcomes, action items, and next steps

OUTPUT FORMAT:
Provide only the summary text with clear paragraph breaks. No preamble, no explanations, no metadata.`;
        const typeSpecificAdditions = this.getTypeSpecificAdditions(conversationType, 'detailed');
        return basePrompt + typeSpecificAdditions;
    }
    /**
     * Get type-specific additions for different conversation types
     */
    getTypeSpecificAdditions(conversationType, level) {
        const additions = {
            technical: {
                brief: '\n\nFOCUS: Code changes, bug fixes, technical decisions, and implementation details.',
                standard: '\n\nTECHNICAL FOCUS:\n- Emphasize code changes, algorithms, and technical solutions\n- Include version numbers, file names, and system specifications\n- Highlight bugs found and fixes implemented',
                detailed: '\n\nTECHNICAL FOCUS:\n- Document all technical details: code snippets, file paths, version numbers\n- Include system architecture decisions and design patterns\n- Cover testing approaches, deployment steps, and configuration changes\n- Preserve exact error messages and debugging information'
            },
            planning: {
                brief: '\n\nFOCUS: Project goals, timelines, assignments, and key milestones.',
                standard: '\n\nPLANNING FOCUS:\n- Emphasize project scope, timelines, and resource allocation\n- Include roles, responsibilities, and deliverables\n- Highlight risks, dependencies, and mitigation strategies',
                detailed: '\n\nPLANNING FOCUS:\n- Document complete project scope, phases, and deliverables\n- Include detailed timeline with milestones and dependencies\n- Cover resource requirements, budget considerations, and risk assessments\n- Preserve specific dates, deadlines, and assignment details'
            },
            support: {
                brief: '\n\nFOCUS: Problem description, solution provided, and resolution status.',
                standard: '\n\nSUPPORT FOCUS:\n- Emphasize problem symptoms, troubleshooting steps, and solutions\n- Include system details and error conditions\n- Highlight resolution status and follow-up actions',
                detailed: '\n\nSUPPORT FOCUS:\n- Document complete problem description with symptoms and impact\n- Include all troubleshooting steps attempted and their results\n- Cover system configuration, error logs, and diagnostic information\n- Preserve exact error messages, system versions, and environmental details'
            },
            general: {
                brief: '\n\nFOCUS: Main topics discussed, key points, and any decisions or outcomes.',
                standard: '\n\nGENERAL FOCUS:\n- Cover all major topics with appropriate context\n- Include different viewpoints and perspectives discussed\n- Highlight consensus reached and action items',
                detailed: '\n\nGENERAL FOCUS:\n- Provide comprehensive coverage of all topics and subtopics\n- Include context, background information, and reasoning\n- Document different perspectives, debates, and how consensus was reached\n- Cover all action items, assignments, and follow-up plans'
            }
        };
        return additions[conversationType]?.[level] || additions.general[level];
    }
    /**
     * Build user prompt with conversation content
     */
    buildUserPrompt(messages, config, level) {
        let prompt = '';
        // Add previous summary context if provided
        if (config.previousSummary) {
            prompt += `PREVIOUS SUMMARY:\n${config.previousSummary}\n\n`;
        }
        // Add focus topics if specified
        if (config.focusTopics && config.focusTopics.length > 0) {
            prompt += `FOCUS TOPICS: ${config.focusTopics.join(', ')}\n\n`;
        }
        // Add temporal context if enabled
        if (config.includeTemporalContext) {
            const timespan = this.getConversationTimespan(messages);
            if (timespan) {
                prompt += `CONVERSATION TIMESPAN: ${timespan}\n\n`;
            }
        }
        // Add conversation content
        prompt += 'CONVERSATION TO SUMMARIZE:\n\n';
        messages.forEach((message, index) => {
            const timestamp = config.includeTemporalContext
                ? this.formatTimestamp(message.createdAt)
                : '';
            const role = message.role.toUpperCase();
            prompt += `[${index + 1}] ${role}${timestamp ? ` (${timestamp})` : ''}:\n`;
            prompt += `${message.content}\n\n`;
        });
        // Add specific instructions based on level
        prompt += this.getLevelSpecificInstructions(level, config.targetTokens);
        return prompt.trim();
    }
    /**
     * Get level-specific instructions
     */
    getLevelSpecificInstructions(level, targetTokens) {
        const instructions = {
            brief: `\nCreate a brief summary (${targetTokens} tokens max) focusing only on the most critical points.`,
            standard: `\nCreate a standard summary (${targetTokens} tokens max) covering all important topics and context.`,
            detailed: `\nCreate a detailed summary (${targetTokens} tokens max) providing comprehensive coverage with full context and reasoning.`
        };
        return instructions[level];
    }
    /**
     * Get conversation timespan
     */
    getConversationTimespan(messages) {
        if (messages.length === 0)
            return null;
        const timestamps = messages.map(m => m.createdAt).sort((a, b) => a - b);
        const start = new Date(timestamps[0]);
        const end = new Date(timestamps[timestamps.length - 1]);
        const duration = end.getTime() - start.getTime();
        const minutes = Math.floor(duration / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        if (hours > 0) {
            return `${this.formatTimestamp(start.getTime())} to ${this.formatTimestamp(end.getTime())} (${hours}h ${minutes % 60}m)`;
        }
        else if (minutes > 0) {
            return `${this.formatTimestamp(start.getTime())} to ${this.formatTimestamp(end.getTime())} (${minutes}m)`;
        }
        else {
            return `${this.formatTimestamp(start.getTime())} to ${this.formatTimestamp(end.getTime())} (brief exchange)`;
        }
    }
    /**
     * Format timestamp for display
     */
    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    }
    /**
     * Estimate prompt token count
     */
    estimatePromptTokens(prompt) {
        // Rough estimation: ~4 characters per token
        const totalChars = prompt.systemPrompt.length + prompt.userPrompt.length;
        return Math.ceil(totalChars / 4);
    }
    /**
     * Validate prompt length
     */
    validatePromptLength(prompt, maxTokens) {
        const estimatedTokens = this.estimatePromptTokens(prompt);
        return estimatedTokens <= maxTokens;
    }
}
//# sourceMappingURL=SummaryPrompts.js.map