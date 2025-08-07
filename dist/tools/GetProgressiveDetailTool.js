/**
 * GetProgressiveDetail Tool Implementation
 *
 * This tool provides progressive detail retrieval for conversations,
 * allowing users to start with summaries and drill down to specifics.
 * It manages token budgets while progressively revealing more detail.
 */
import { BaseTool } from './BaseTool.js';
import { GetProgressiveDetailTool as GetProgressiveDetailToolDef } from '../types/mcp.js';
import { GetProgressiveDetailSchema } from '../types/schemas.js';
import { TokenCounter } from '../context/TokenCounter.js';
/**
 * Implementation of the get_progressive_detail MCP tool
 */
export class GetProgressiveDetailTool extends BaseTool {
    conversationRepo;
    messageRepo;
    summaryRepo;
    tokenCounter;
    constructor(dependencies) {
        super(GetProgressiveDetailToolDef, GetProgressiveDetailSchema);
        this.conversationRepo = dependencies.conversationRepository;
        this.messageRepo = dependencies.messageRepository;
        this.summaryRepo = dependencies.summaryRepository;
        this.tokenCounter = new TokenCounter({ model: 'gpt-3.5-turbo' });
    }
    /**
     * Execute the get_progressive_detail tool
     */
    async executeImpl(input, _context) {
        // Validate conversation exists
        const conversation = await this.conversationRepo.findById(input.conversationId);
        if (!conversation) {
            throw new Error(`Conversation not found: ${input.conversationId}`);
        }
        // Determine current level based on input or start with brief
        const currentLevel = input.level || 'brief';
        const maxTokens = input.maxTokens || 2000;
        // Build progressive content based on level
        const content = await this.buildProgressiveContent(input.conversationId, currentLevel, maxTokens, input.focusMessageId, input.expandContext);
        // Calculate token usage
        const tokens = this.calculateTokenUsage(content, maxTokens);
        // Determine navigation options
        const navigation = await this.determineNavigation(currentLevel, tokens.used, maxTokens, conversation.id);
        // Get metadata
        const messages = await this.messageRepo.findByConversationId(conversation.id);
        const metadata = {
            conversationTitle: conversation.title || 'Untitled Conversation',
            messageCount: messages.length,
            timeRange: {
                start: messages.length > 0 ? messages[0].createdAt : conversation.createdAt,
                end: messages.length > 0 ? messages[messages.length - 1].createdAt : conversation.updatedAt
            }
        };
        return {
            conversationId: conversation.id,
            currentLevel,
            content,
            tokens,
            navigation,
            metadata
        };
    }
    /**
     * Build progressive content based on detail level
     */
    async buildProgressiveContent(conversationId, level, maxTokens, focusMessageId, expandContext) {
        const content = {};
        let tokensUsed = 0;
        // Level 1: Brief - Just the summary
        if (level === 'brief') {
            const summary = await this.summaryRepo.findByConversationAndLevel(conversationId, 'brief');
            if (summary) {
                content.summary = summary.summaryText;
                tokensUsed += summary.tokenCount;
            }
            return content;
        }
        // Level 2: Standard - Standard summary + key messages
        if (level === 'standard' || level === 'detailed' || level === 'full') {
            const summary = await this.summaryRepo.findByConversationAndLevel(conversationId, level === 'standard' ? 'standard' : 'detailed');
            if (summary) {
                content.summary = summary.summaryText;
                tokensUsed += summary.tokenCount;
            }
            // Add key messages
            const keyMessages = await this.selectKeyMessages(conversationId, maxTokens - tokensUsed, focusMessageId);
            if (keyMessages.length > 0) {
                content.keyMessages = keyMessages;
                tokensUsed += keyMessages.reduce((sum, msg) => sum + this.tokenCounter.countText(msg.content).count, 0);
            }
        }
        // Level 3: Detailed - Add more context
        if ((level === 'detailed' || level === 'full') && expandContext) {
            const contextMessages = await this.selectContextMessages(conversationId, maxTokens - tokensUsed, content.keyMessages?.map(m => m.id) || []);
            if (contextMessages.length > 0) {
                content.contextMessages = contextMessages;
            }
        }
        // Level 4: Full - Return all messages (within token limit)
        if (level === 'full') {
            const allMessages = await this.messageRepo.findByConversationId(conversationId, { limit: 1000, offset: 0 });
            // Filter and truncate to fit token budget
            const fullMessages = this.fitMessagesToTokenBudget(allMessages, maxTokens - tokensUsed);
            content.contextMessages = fullMessages.map(msg => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: msg.createdAt
            }));
        }
        return content;
    }
    /**
     * Select key messages based on importance
     */
    async selectKeyMessages(conversationId, tokenBudget, focusMessageId) {
        const messages = await this.messageRepo.findByConversationId(conversationId);
        // Score messages by importance
        const scoredMessages = messages.map(msg => ({
            message: msg,
            score: this.scoreMessageImportance(msg, focusMessageId)
        }));
        // Sort by score and select within token budget
        scoredMessages.sort((a, b) => b.score - a.score);
        const selected = [];
        let tokensUsed = 0;
        for (const { message, score } of scoredMessages) {
            const tokens = this.tokenCounter.countText(message.content).count;
            if (tokensUsed + tokens <= tokenBudget) {
                selected.push({
                    id: message.id,
                    role: message.role,
                    content: message.content,
                    timestamp: message.createdAt,
                    relevance: score
                });
                tokensUsed += tokens;
            }
            // Limit to top 10 key messages
            if (selected.length >= 10)
                break;
        }
        return selected;
    }
    /**
     * Select additional context messages
     */
    async selectContextMessages(conversationId, tokenBudget, excludeIds) {
        const messages = await this.messageRepo.findByConversationId(conversationId);
        // Filter out already included messages
        const contextMessages = messages.filter(msg => !excludeIds.includes(msg.id));
        // Select messages that fit within budget
        return this.fitMessagesToTokenBudget(contextMessages, tokenBudget)
            .map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: msg.createdAt
        }));
    }
    /**
     * Score message importance
     */
    scoreMessageImportance(message, focusId) {
        let score = 0;
        // Focus message gets highest score
        if (message.id === focusId)
            return 1.0;
        // Questions and answers are important
        if (message.content.includes('?'))
            score += 0.3;
        if (message.role === 'assistant' && message.content.length > 200)
            score += 0.2;
        // Messages with code blocks
        if (message.content.includes('```'))
            score += 0.2;
        // Messages with action items or decisions
        const actionKeywords = ['todo', 'will', 'should', 'must', 'need to', 'decided'];
        const hasAction = actionKeywords.some(keyword => message.content.toLowerCase().includes(keyword));
        if (hasAction)
            score += 0.2;
        // Longer messages might be more substantive
        if (message.content.length > 500)
            score += 0.1;
        return Math.min(score, 0.9); // Cap below focus message
    }
    /**
     * Fit messages to token budget
     */
    fitMessagesToTokenBudget(messages, tokenBudget) {
        const selected = [];
        let tokensUsed = 0;
        for (const message of messages) {
            const tokens = this.tokenCounter.countText(message.content).count;
            if (tokensUsed + tokens <= tokenBudget) {
                selected.push(message);
                tokensUsed += tokens;
            }
            else {
                break; // Stop when budget exceeded
            }
        }
        return selected;
    }
    /**
     * Calculate token usage
     */
    calculateTokenUsage(content, maxTokens) {
        let summaryTokens = 0;
        let keyMessageTokens = 0;
        let contextTokens = 0;
        if (content.summary) {
            summaryTokens = this.tokenCounter.countText(content.summary).count;
        }
        if (content.keyMessages) {
            keyMessageTokens = content.keyMessages.reduce((sum, msg) => sum + this.tokenCounter.countText(msg.content).count, 0);
        }
        if (content.contextMessages) {
            contextTokens = content.contextMessages.reduce((sum, msg) => sum + this.tokenCounter.countText(msg.content).count, 0);
        }
        const used = summaryTokens + keyMessageTokens + contextTokens;
        return {
            used,
            remaining: maxTokens - used,
            breakdown: {
                summary: summaryTokens,
                keyMessages: keyMessageTokens,
                context: contextTokens
            }
        };
    }
    /**
     * Determine navigation options
     */
    async determineNavigation(currentLevel, tokensUsed, maxTokens, conversationId) {
        const levelProgression = {
            'brief': 'standard',
            'standard': 'detailed',
            'detailed': 'full',
            'full': undefined
        };
        const nextLevel = levelProgression[currentLevel];
        if (!nextLevel) {
            return { canExpand: false };
        }
        // Estimate tokens for next level
        let estimatedNextTokens = tokensUsed;
        if (nextLevel === 'standard') {
            const summary = await this.summaryRepo.findByConversationAndLevel(conversationId, 'standard');
            estimatedNextTokens = (summary?.tokenCount || 300) + 500; // Summary + key messages
        }
        else if (nextLevel === 'detailed') {
            estimatedNextTokens = tokensUsed + 1000; // Add context
        }
        else if (nextLevel === 'full') {
            const messageCount = await this.messageRepo.countByConversation(conversationId);
            estimatedNextTokens = messageCount * 50; // Rough estimate
        }
        return {
            canExpand: estimatedNextTokens <= maxTokens,
            nextLevel,
            estimatedNextTokens
        };
    }
    /**
     * Get name for tool registration
     */
    getName() {
        return 'get_progressive_detail';
    }
    /**
     * Get description for tool
     */
    getDescription() {
        return 'Retrieve conversation details progressively, starting with summaries and drilling down to full messages';
    }
    /**
     * Static factory method
     */
    static create(dependencies) {
        return new GetProgressiveDetailTool(dependencies);
    }
}
//# sourceMappingURL=GetProgressiveDetailTool.js.map