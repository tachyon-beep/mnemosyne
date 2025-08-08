/**
 * Context Change Detector - Intelligence Services Expert specializing in context analysis
 *
 * This service detects when conversation context shifts, identifies relevant historical
 * context, finds conflicting information, and optimizes context windows for current
 * conversations by leveraging our knowledge graph infrastructure.
 */
import { BaseRepository } from '../../../storage/repositories/BaseRepository.js';
/**
 * Context Change Detection Service
 */
export class ContextChangeDetector extends BaseRepository {
    entityRepository;
    knowledgeGraphRepo;
    config;
    constructor(databaseManager, entityRepository, knowledgeGraphRepo, config = {}) {
        super(databaseManager);
        this.entityRepository = entityRepository;
        this.knowledgeGraphRepo = knowledgeGraphRepo;
        this.config = {
            minShiftConfidence: 0.6,
            entityPatternWindow: 20,
            minRelevanceScore: 0.4,
            maxHistoryAgeDays: 90,
            minConflictSeverity: 0.5,
            maxContextTokens: 4000,
            ...config
        };
    }
    /**
     * Detect topic shifts by analyzing entity frequency changes
     */
    async detectTopicShifts(conversationId, options = {}) {
        const { lookbackMessages = this.config.entityPatternWindow, minShiftConfidence = this.config.minShiftConfidence } = options;
        // Get recent messages for this conversation
        const messages = this.executeStatementAll('get_recent_messages_for_shift_detection', `SELECT * FROM messages 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC 
       LIMIT ?`, [conversationId, lookbackMessages]);
        if (messages.length < 4) {
            return []; // Need sufficient messages to detect shifts
        }
        const shifts = [];
        const messageObjects = messages.map(row => this.mapRowToMessage(row)).reverse(); // Chronological order
        // Analyze entity patterns in sliding windows
        const windowSize = Math.min(6, Math.floor(messages.length / 3));
        for (let i = windowSize; i < messageObjects.length - windowSize; i++) {
            const previousWindow = messageObjects.slice(i - windowSize, i);
            const currentWindow = messageObjects.slice(i, i + windowSize);
            const shift = await this.analyzeWindowShift(previousWindow, currentWindow, messageObjects[i], minShiftConfidence);
            if (shift) {
                shifts.push(shift);
            }
        }
        return shifts.sort((a, b) => b.shiftConfidence - a.shiftConfidence);
    }
    /**
     * Identify relevant historical conversations about current entities
     */
    async identifyRelevantHistory(conversationId, options = {}) {
        const { maxHistoryAge = this.config.maxHistoryAgeDays, minRelevanceScore = this.config.minRelevanceScore, limit = 10 } = options;
        // Get current conversation entities
        const currentEntities = await this.getCurrentConversationEntities(conversationId);
        if (currentEntities.length === 0) {
            return [];
        }
        const cutoffTimestamp = Date.now() - (maxHistoryAge * 24 * 60 * 60 * 1000);
        const entityIds = currentEntities.map(e => e.id);
        // Find conversations with overlapping entities
        const historicalConversations = this.executeStatementAll('find_historical_conversations_with_entities', `SELECT 
         c.id as conversation_id,
         COUNT(DISTINCT em.entity_id) as entity_count,
         MAX(em.created_at) as last_mentioned_at,
         c.title, c.created_at, c.updated_at, c.metadata
       FROM conversations c
       JOIN entity_mentions em ON c.id = em.conversation_id
       WHERE em.entity_id IN (${entityIds.map(() => '?').join(',')})
         AND c.id != ?
         AND c.updated_at > ?
       GROUP BY c.id
       HAVING entity_count >= 2
       ORDER BY entity_count DESC, last_mentioned_at DESC
       LIMIT ?`, [...entityIds, conversationId, cutoffTimestamp, limit * 2]);
        const relevantHistory = [];
        for (const histConv of historicalConversations) {
            const conversation = {
                id: histConv.conversation_id,
                title: histConv.title || undefined,
                createdAt: histConv.created_at,
                updatedAt: histConv.updated_at,
                metadata: this.parseMetadata(histConv.metadata)
            };
            // Get connecting entities and their mentions
            const connectingData = await this.getConnectingEntitiesAndMessages(histConv.conversation_id, currentEntities);
            if (connectingData.entities.length === 0) {
                continue;
            }
            // Calculate relevance score
            const relevanceScore = this.calculateHistoryRelevanceScore(connectingData.entities, currentEntities, connectingData.messages, histConv.last_mentioned_at);
            if (relevanceScore >= minRelevanceScore) {
                const daysSinceLastMention = Math.floor((Date.now() - histConv.last_mentioned_at) / (24 * 60 * 60 * 1000));
                relevantHistory.push({
                    id: this.generateId(),
                    conversation,
                    relevantMessages: connectingData.messages,
                    connectingEntities: connectingData.entities,
                    relevanceScore,
                    relevanceType: this.determineRelevanceType(connectingData.entities, currentEntities),
                    daysSinceLastMention
                });
            }
        }
        return relevantHistory
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, limit);
    }
    /**
     * Find conflicting information about entities across conversations
     */
    async findConflictingInformation(options = {}) {
        const { conversationId, entityIds, minSeverity = this.config.minConflictSeverity, limit = 20 } = options;
        let targetEntities;
        if (entityIds) {
            targetEntities = [];
            for (const id of entityIds) {
                const entity = await this.entityRepository.getById(id);
                if (entity)
                    targetEntities.push(entity);
            }
        }
        else if (conversationId) {
            targetEntities = await this.getCurrentConversationEntities(conversationId);
        }
        else {
            // Get most mentioned entities
            targetEntities = await this.entityRepository.getMostMentioned(50);
        }
        const conflicts = [];
        for (const entity of targetEntities) {
            // Get all messages mentioning this entity
            const mentions = await this.knowledgeGraphRepo.getEntityMentions(entity.id, 100);
            if (mentions.length < 2)
                continue; // Need at least 2 mentions to find conflicts
            // Group mentions by conversation and analyze for conflicts
            const conversationGroups = new Map();
            for (const mention of mentions) {
                if (!conversationGroups.has(mention.conversation_id)) {
                    conversationGroups.set(mention.conversation_id, []);
                }
                conversationGroups.get(mention.conversation_id).push(mention);
            }
            // Detect conflicts between different conversations
            const conflictMessages = await this.detectEntityConflicts(entity, conversationGroups);
            if (conflictMessages.length >= 2) {
                const severity = this.calculateConflictSeverity(conflictMessages);
                if (severity >= minSeverity) {
                    conflicts.push({
                        id: this.generateId(),
                        entity,
                        conflictingMessages: conflictMessages,
                        conflictType: this.classifyConflictType(conflictMessages),
                        conflictSeverity: severity,
                        suggestedResolution: this.generateResolutionSuggestion(entity, conflictMessages),
                        detectedAt: Date.now()
                    });
                }
            }
        }
        return conflicts
            .sort((a, b) => b.conflictSeverity - a.conflictSeverity)
            .slice(0, limit);
    }
    /**
     * Analyze optimal context window for current conversation
     */
    async analyzeContextWindow(conversationId, options = {}) {
        const { maxTokens = this.config.maxContextTokens, includeHistory = true } = options;
        // Get current conversation entities and their importance
        const coreEntities = await this.getCurrentConversationEntities(conversationId);
        // Get recent messages from current conversation
        const recentMessages = this.executeStatementAll('get_recent_conversation_messages', `SELECT * FROM messages 
       WHERE conversation_id = ? 
       ORDER BY created_at DESC 
       LIMIT 20`, [conversationId]).map(row => this.mapRowToMessage(row));
        let recommendedMessages = recentMessages.reverse(); // Chronological order
        let estimatedTokens = this.estimateTokenCount(recommendedMessages);
        // If including history and we have token budget left
        if (includeHistory && estimatedTokens < maxTokens * 0.7) {
            const relevantHistory = await this.identifyRelevantHistory(conversationId, { limit: 5 });
            for (const history of relevantHistory) {
                const historyTokens = this.estimateTokenCount(history.relevantMessages);
                if (estimatedTokens + historyTokens <= maxTokens) {
                    recommendedMessages = [...history.relevantMessages, ...recommendedMessages];
                    estimatedTokens += historyTokens;
                }
            }
        }
        // Identify potential entities that might become relevant
        const potentialEntities = await this.identifyPotentialEntities(coreEntities);
        // Calculate context metrics
        const contextRelevance = this.calculateContextRelevance(coreEntities, recommendedMessages);
        const freshness = this.calculateFreshness(recommendedMessages);
        return {
            id: this.generateId(),
            coreEntities,
            recommendedMessages,
            contextRelevance,
            estimatedTokens,
            freshness,
            potentialEntities
        };
    }
    /**
     * Analyze entity patterns within a conversation
     */
    async analyzeEntityPatterns(messages) {
        const patterns = [];
        const entityMentions = new Map();
        if (messages.length === 0)
            return patterns;
        const messageIds = messages.map(m => m.id);
        // Get all entity mentions for these messages
        const allMentions = [];
        if (messageIds.length > 0) {
            try {
                // Handle large message sets by batching queries (SQLite has a limit on IN clause size)
                const batchSize = 100;
                for (let i = 0; i < messageIds.length; i += batchSize) {
                    const batch = messageIds.slice(i, i + batchSize);
                    const batchMentions = this.executeStatementAll(`get_entity_mentions_batch_${Math.floor(i / batchSize)}`, `SELECT entity_id, message_id, created_at
             FROM entity_mentions 
             WHERE message_id IN (${batch.map(() => '?').join(',')})
             ORDER BY created_at ASC`, batch);
                    allMentions.push(...batchMentions);
                }
            }
            catch (error) {
                console.warn('Failed to get entity mentions for messages:', error);
                // Continue with empty mentions array
            }
        }
        // Collect mention positions for each entity
        for (const mention of allMentions) {
            const messageIndex = messages.findIndex(m => m.id === mention.message_id);
            if (messageIndex >= 0) {
                if (!entityMentions.has(mention.entity_id)) {
                    entityMentions.set(mention.entity_id, []);
                }
                entityMentions.get(mention.entity_id).push(messageIndex);
            }
        }
        for (const [entityId, positions] of entityMentions.entries()) {
            const entity = await this.entityRepository.getById(entityId);
            if (!entity || positions.length < 1)
                continue;
            const frequency = positions.length;
            const firstMention = positions[0];
            const lastMention = positions[positions.length - 1];
            // Calculate mention trend
            const mentionTrend = this.calculateMentionTrend(positions, messages.length);
            // Calculate average gap between mentions
            const gaps = positions.slice(1).map((pos, i) => pos - positions[i]);
            const averageGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
            patterns.push({
                entity,
                frequency,
                firstMention: messages[firstMention].createdAt,
                lastMention: messages[lastMention].createdAt,
                mentionTrend,
                averageGapBetweenMentions: averageGap,
                coOccurringEntities: [] // Would be populated by analyzing co-occurrences
            });
        }
        return patterns.sort((a, b) => b.frequency - a.frequency);
    }
    /**
     * Analyze potential shift between two message windows
     */
    async analyzeWindowShift(previousWindow, currentWindow, shiftMessage, minConfidence) {
        const previousPatterns = await this.analyzeEntityPatterns(previousWindow);
        const currentPatterns = await this.analyzeEntityPatterns(currentWindow);
        const previousEntities = previousPatterns.map(p => p.entity);
        const currentEntities = currentPatterns.map(p => p.entity);
        // Calculate entity overlap
        const previousEntityIds = new Set(previousEntities.map(e => e.id));
        const currentEntityIds = new Set(currentEntities.map(e => e.id));
        const intersection = new Set([...previousEntityIds].filter(id => currentEntityIds.has(id)));
        const union = new Set([...previousEntityIds, ...currentEntityIds]);
        const overlapRatio = intersection.size / union.size;
        const shiftConfidence = 1 - overlapRatio; // Lower overlap = higher shift confidence
        if (shiftConfidence < minConfidence) {
            return null;
        }
        // Identify entities that triggered the shift
        const newEntityIds = [...currentEntityIds].filter(id => !previousEntityIds.has(id));
        const triggerEntities = currentEntities.filter(e => newEntityIds.includes(e.id));
        // Classify shift type
        const shiftType = this.classifyShiftType(previousEntities.length, currentEntities.length, intersection.size, triggerEntities.length);
        return {
            id: this.generateId(),
            shiftMessage,
            previousEntities,
            newEntities: currentEntities,
            shiftConfidence,
            shiftType,
            triggerEntities,
            detectedAt: Date.now()
        };
    }
    /**
     * Get entities currently active in conversation
     */
    async getCurrentConversationEntities(conversationId) {
        const entityData = this.executeStatementAll('get_conversation_entities', `SELECT entity_id, COUNT(*) as mention_count, MAX(created_at) as last_mentioned_at
       FROM entity_mentions 
       WHERE conversation_id = ?
       GROUP BY entity_id
       ORDER BY mention_count DESC, last_mentioned_at DESC
       LIMIT 20`, [conversationId]);
        const entities = [];
        for (const row of entityData) {
            const entity = await this.entityRepository.getById(row.entity_id);
            if (entity)
                entities.push(entity);
        }
        return entities;
    }
    /**
     * Get connecting entities and messages between conversations
     */
    async getConnectingEntitiesAndMessages(historicalConversationId, currentEntities) {
        const currentEntityIds = currentEntities.map(e => e.id);
        // Find entity mentions in historical conversation
        const mentions = this.executeStatementAll('get_connecting_mentions', `SELECT em.*, m.content, m.role, m.created_at as message_created_at
       FROM entity_mentions em
       JOIN messages m ON em.message_id = m.id
       WHERE em.conversation_id = ? 
         AND em.entity_id IN (${currentEntityIds.map(() => '?').join(',')})
       ORDER BY em.created_at DESC
       LIMIT 10`, [historicalConversationId, ...currentEntityIds]);
        const connectingEntities = [];
        const messages = [];
        const seenEntityIds = new Set();
        const seenMessageIds = new Set();
        for (const mention of mentions) {
            // Add entity if not already seen
            if (!seenEntityIds.has(mention.entity_id)) {
                const entity = currentEntities.find(e => e.id === mention.entity_id);
                if (entity) {
                    connectingEntities.push(entity);
                    seenEntityIds.add(mention.entity_id);
                }
            }
            // Add message if not already seen
            if (!seenMessageIds.has(mention.message_id)) {
                messages.push({
                    id: mention.message_id,
                    conversationId: mention.conversation_id,
                    role: mention.role,
                    content: mention.content,
                    createdAt: mention.message_created_at
                });
                seenMessageIds.add(mention.message_id);
            }
        }
        return { entities: connectingEntities, messages };
    }
    /**
     * Calculate relevance score for historical context
     */
    calculateHistoryRelevanceScore(connectingEntities, currentEntities, messages, lastMentionTimestamp) {
        let score = 0;
        // Entity overlap score (0.4 weight)
        const overlapRatio = connectingEntities.length / currentEntities.length;
        score += Math.min(overlapRatio, 1) * 0.4;
        // Recency score (0.3 weight)
        const daysSinceLastMention = (Date.now() - lastMentionTimestamp) / (24 * 60 * 60 * 1000);
        const recencyScore = Math.max(0, 1 - daysSinceLastMention / this.config.maxHistoryAgeDays);
        score += recencyScore * 0.3;
        // Message relevance score (0.3 weight)
        const messageScore = Math.min(messages.length / 5, 1); // Up to 5 messages is ideal
        score += messageScore * 0.3;
        return Math.min(score, 1);
    }
    /**
     * Detect conflicts between entity mentions
     */
    async detectEntityConflicts(entity, conversationGroups) {
        const conflictMessages = [];
        // Simple conflict detection - look for contradictory patterns
        const conflictPatterns = [
            { pattern: /is\s+(?:a|an)\s+([^.!?]+)/gi, type: 'type_assertion' },
            { pattern: /works\s+(?:at|for)\s+([^.!?]+)/gi, type: 'employment' },
            { pattern: /located\s+(?:in|at)\s+([^.!?]+)/gi, type: 'location' },
            { pattern: /(?:costs?|price[sd]?)\s+(?:is|at)\s*\$?([0-9,]+)/gi, type: 'price' }
        ];
        const claimsByType = new Map();
        // Extract claims from all mentions
        for (const mentions of conversationGroups.values()) {
            for (const mention of mentions) {
                const message = {
                    id: mention.message_id,
                    conversationId: mention.conversation_id,
                    role: 'user', // Simplified
                    content: mention.content || '',
                    createdAt: mention.created_at
                };
                for (const { pattern, type } of conflictPatterns) {
                    const matches = [...mention.content.matchAll(pattern)];
                    for (const match of matches) {
                        const claim = match[1]?.trim();
                        if (claim && claim.length > 2 && claim.length < 50) {
                            if (!claimsByType.has(type)) {
                                claimsByType.set(type, []);
                            }
                            claimsByType.get(type).push({
                                claim: claim.toLowerCase(),
                                message,
                                confidence: 0.8
                            });
                        }
                    }
                }
            }
        }
        // Find conflicts within each claim type
        for (const [type, claims] of claimsByType.entries()) {
            if (claims.length < 2)
                continue;
            // Simple conflict detection - different claims of same type
            const uniqueClaims = new Set(claims.map(c => c.claim));
            if (uniqueClaims.size > 1) {
                // Add all claims as potentially conflicting
                for (const claim of claims) {
                    conflictMessages.push({
                        message: claim.message,
                        extractedClaim: `${entity.name} ${type.replace('_', ' ')}: ${claim.claim}`,
                        confidence: claim.confidence
                    });
                }
            }
        }
        return conflictMessages;
    }
    /**
     * Calculate conflict severity
     */
    calculateConflictSeverity(conflictMessages) {
        let severity = 0.3; // Base severity
        // More messages = higher severity
        severity += Math.min(conflictMessages.length * 0.1, 0.3);
        // Higher confidence claims = higher severity
        const avgConfidence = conflictMessages.reduce((sum, cm) => sum + cm.confidence, 0) / conflictMessages.length;
        severity += avgConfidence * 0.2;
        // Recent conflicts are more severe
        const newestMessage = Math.max(...conflictMessages.map(cm => cm.message.createdAt));
        const daysSinceNewest = (Date.now() - newestMessage) / (24 * 60 * 60 * 1000);
        severity += Math.max(0, (30 - daysSinceNewest) / 30) * 0.2;
        return Math.min(severity, 1);
    }
    /**
     * Classify type of conflict
     */
    classifyConflictType(conflictMessages) {
        // Simple classification based on claim content
        const claims = conflictMessages.map(cm => cm.extractedClaim.toLowerCase());
        if (claims.some(c => c.includes('type') || c.includes('is a'))) {
            return 'property_contradiction';
        }
        if (claims.some(c => c.includes('works') || c.includes('employment'))) {
            return 'relationship_conflict';
        }
        if (claims.some(c => c.includes('location') || c.includes('located'))) {
            return 'property_contradiction';
        }
        return 'status_inconsistency';
    }
    /**
     * Generate resolution suggestion for conflicts
     */
    generateResolutionSuggestion(entity, conflictMessages) {
        const mostRecent = conflictMessages.reduce((latest, current) => current.message.createdAt > latest.message.createdAt ? current : latest);
        return `Consider verifying current information about ${entity.name}. ` +
            `Most recent claim: "${mostRecent.extractedClaim}" ` +
            `(${new Date(mostRecent.message.createdAt).toLocaleDateString()})`;
    }
    /**
     * Identify entities that might become relevant
     */
    async identifyPotentialEntities(coreEntities) {
        if (coreEntities.length === 0)
            return [];
        const coreEntityIds = coreEntities.map(e => e.id);
        // Find entities related to core entities through relationships
        const relatedData = this.executeStatementAll('find_potential_entities', `SELECT 
         er.target_entity_id,
         COUNT(*) as relationship_count,
         AVG(er.strength) as avg_strength
       FROM entity_relationships er
       WHERE er.source_entity_id IN (${coreEntityIds.map(() => '?').join(',')})
         AND er.target_entity_id NOT IN (${coreEntityIds.map(() => '?').join(',')})
       GROUP BY er.target_entity_id
       HAVING avg_strength > 0.4
       ORDER BY relationship_count DESC, avg_strength DESC
       LIMIT 10`, [...coreEntityIds, ...coreEntityIds]);
        const potentialEntities = [];
        for (const row of relatedData) {
            const entity = await this.entityRepository.getById(row.target_entity_id);
            if (entity)
                potentialEntities.push(entity);
        }
        return potentialEntities;
    }
    /**
     * Estimate token count for messages
     */
    estimateTokenCount(messages) {
        // Rough estimation: ~4 characters per token
        const totalChars = messages.reduce((sum, msg) => sum + msg.content.length, 0);
        return Math.ceil(totalChars / 4);
    }
    /**
     * Calculate context relevance score
     */
    calculateContextRelevance(entities, messages) {
        if (entities.length === 0 || messages.length === 0)
            return 0;
        // Count entity mentions in messages
        let mentionCount = 0;
        const entityNames = entities.map(e => e.name.toLowerCase());
        for (const message of messages) {
            const content = message.content.toLowerCase();
            for (const name of entityNames) {
                if (content.includes(name)) {
                    mentionCount++;
                }
            }
        }
        return Math.min(mentionCount / (messages.length * entities.length), 1);
    }
    /**
     * Calculate freshness score based on message ages
     */
    calculateFreshness(messages) {
        if (messages.length === 0)
            return 0;
        const now = Date.now();
        const avgAge = messages.reduce((sum, msg) => sum + (now - msg.createdAt), 0) / messages.length;
        const daysSinceAvg = avgAge / (24 * 60 * 60 * 1000);
        // Fresher = higher score (exponential decay)
        return Math.max(0, Math.exp(-daysSinceAvg / 7)); // 7-day half-life
    }
    /**
     * Calculate mention trend for entity
     */
    calculateMentionTrend(positions, totalMessages) {
        if (positions.length < 3)
            return 'stable';
        const firstHalf = positions.filter(p => p < totalMessages / 2);
        const secondHalf = positions.filter(p => p >= totalMessages / 2);
        const firstHalfDensity = firstHalf.length / (totalMessages / 2);
        const secondHalfDensity = secondHalf.length / (totalMessages / 2);
        const ratio = secondHalfDensity / (firstHalfDensity || 0.001);
        if (ratio > 1.5)
            return 'increasing';
        if (ratio < 0.67)
            return 'decreasing';
        // Check for sporadic pattern (large gaps)
        const gaps = positions.slice(1).map((pos, i) => pos - positions[i]);
        const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        const maxGap = Math.max(...gaps);
        if (maxGap > avgGap * 3)
            return 'sporadic';
        return 'stable';
    }
    /**
     * Classify type of topic shift
     */
    classifyShiftType(prevCount, currentCount, intersectionCount, newEntityCount) {
        const replacementRatio = intersectionCount / prevCount;
        const additionRatio = newEntityCount / currentCount;
        if (replacementRatio < 0.3 && newEntityCount > prevCount * 0.5) {
            return 'topic_pivot';
        }
        if (additionRatio > 0.6 && intersectionCount > 0) {
            return 'context_expansion';
        }
        if (replacementRatio < 0.5) {
            return 'entity_replacement';
        }
        return 'entity_addition';
    }
    /**
     * Determine type of historical relevance
     */
    determineRelevanceType(connectingEntities, currentEntities) {
        const overlapRatio = connectingEntities.length / currentEntities.length;
        if (overlapRatio > 0.7)
            return 'entity_overlap';
        if (overlapRatio > 0.3)
            return 'topic_continuation';
        // Simple heuristic - could be enhanced with relationship analysis
        return 'relationship_chain';
    }
    /**
     * Map database row to Message object
     */
    mapRowToMessage(row) {
        return {
            id: row.id,
            conversationId: row.conversation_id,
            role: row.role,
            content: row.content,
            createdAt: row.created_at,
            parentMessageId: row.parent_message_id || undefined,
            metadata: this.parseMetadata(row.metadata)
        };
    }
}
//# sourceMappingURL=ContextChangeDetector.js.map