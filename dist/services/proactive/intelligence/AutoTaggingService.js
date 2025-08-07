export class AutoTaggingService {
    config;
    dbManager;
    // Activity patterns for classification
    ACTIVITY_PATTERNS = {
        discussion: [
            /discuss(?:ing|ed)?/i,
            /talk(?:ing|ed)? about/i,
            /conversation about/i,
            /thoughts on/i
        ],
        decision: [
            /decid(?:e|ed|ing)/i,
            /choos(?:e|ing|en)/i,
            /select(?:ed|ing)?/i,
            /option(?:s)? (?:is|are)/i,
            /go with/i
        ],
        planning: [
            /plan(?:ning|ned)?/i,
            /schedul(?:e|ing|ed)/i,
            /roadmap/i,
            /timeline/i,
            /milestone/i
        ],
        problem_solving: [
            /problem/i,
            /issue/i,
            /fix(?:ing|ed)?/i,
            /solv(?:e|ing|ed)/i,
            /debug(?:ging)?/i,
            /error/i
        ],
        learning: [
            /learn(?:ing|ed)?/i,
            /understand(?:ing)?/i,
            /explain/i,
            /how (?:does|do|to)/i,
            /what (?:is|are)/i
        ],
        review: [
            /review(?:ing|ed)?/i,
            /evaluat(?:e|ing|ed)/i,
            /assess(?:ing|ed)?/i,
            /retrospective/i
        ],
        brainstorming: [
            /brainstorm(?:ing)?/i,
            /ideas?/i,
            /what if/i,
            /could we/i,
            /creativ(?:e|ity)/i
        ]
    };
    // Urgency keywords with scores
    URGENCY_KEYWORDS = {
        critical: [
            { pattern: /urgent(?:ly)?/i, score: 1.0 },
            { pattern: /critical/i, score: 0.9 },
            { pattern: /emergency/i, score: 1.0 },
            { pattern: /asap/i, score: 0.9 },
            { pattern: /immediately/i, score: 0.9 }
        ],
        high: [
            { pattern: /important/i, score: 0.7 },
            { pattern: /priority/i, score: 0.7 },
            { pattern: /deadline/i, score: 0.8 },
            { pattern: /by (?:tomorrow|today|tonight)/i, score: 0.8 },
            { pattern: /needs? (?:to be|this)/i, score: 0.6 }
        ],
        medium: [
            { pattern: /soon/i, score: 0.5 },
            { pattern: /this week/i, score: 0.5 },
            { pattern: /when you (?:can|get a chance)/i, score: 0.4 },
            { pattern: /next (?:week|sprint)/i, score: 0.4 }
        ]
    };
    constructor(dbManager, config = {}) {
        this.dbManager = dbManager;
        this.config = {
            minEntityRelevance: config.minEntityRelevance ?? 0.3,
            maxTopicTags: config.maxTopicTags ?? 5,
            minProjectConfidence: config.minProjectConfidence ?? 0.6,
            urgencyKeywords: config.urgencyKeywords ?? [],
            activityPatterns: config.activityPatterns ?? this.ACTIVITY_PATTERNS
        };
    }
    /**
     * Generate topic tags from entity analysis
     */
    async generateTopicTags(conversationId) {
        // Get entities from conversation
        const entities = await this.getConversationEntities(conversationId);
        const tags = [];
        // Primary entities become topic tags
        const primaryEntities = entities
            .filter(e => e.mentions >= 3)
            .sort((a, b) => b.mentions - a.mentions)
            .slice(0, this.config.maxTopicTags);
        for (const entity of primaryEntities) {
            tags.push({
                name: entity.name,
                type: 'entity',
                relevance: this.calculateEntityRelevance(entity, entities.length),
                source: 'primary_entity'
            });
        }
        // Find entity clusters (frequently co-occurring entities)
        const clusters = await this.findEntityClusters(conversationId);
        for (const cluster of clusters) {
            if (cluster.entities.length >= 3) {
                const clusterName = this.generateClusterName(cluster.entities);
                tags.push({
                    name: clusterName,
                    type: 'theme',
                    relevance: cluster.strength,
                    source: 'entity_cluster'
                });
            }
        }
        // Domain-based tags from entity types
        const domainTags = this.generateDomainTags(entities);
        tags.push(...domainTags);
        // Sort by relevance and limit
        return tags
            .sort((a, b) => b.relevance - a.relevance)
            .slice(0, this.config.maxTopicTags);
    }
    /**
     * Classify conversation activity type
     */
    async classifyActivity(conversationId) {
        const messages = await this.getConversationMessages(conversationId);
        const messageText = messages.map(m => m.content).join(' ');
        const scores = {};
        // Check each activity pattern
        for (const [activity, patterns] of Object.entries(this.config.activityPatterns)) {
            let score = 0;
            const indicators = [];
            for (const pattern of patterns) {
                const matches = messageText.match(pattern);
                if (matches) {
                    score += matches.length;
                    indicators.push(matches[0]);
                }
            }
            scores[activity] = { score, indicators };
        }
        // Find the highest scoring activity
        let bestActivity = 'discussion';
        let bestScore = 0;
        let bestIndicators = [];
        for (const [activity, data] of Object.entries(scores)) {
            if (data.score > bestScore) {
                bestActivity = activity;
                bestScore = data.score;
                bestIndicators = data.indicators;
            }
        }
        // Calculate confidence based on score and message count
        const confidence = Math.min(1, bestScore / (messages.length * 0.2));
        return {
            type: bestActivity,
            confidence,
            indicators: bestIndicators.slice(0, 5)
        };
    }
    /**
     * Detect urgency signals in conversation
     */
    async detectUrgencySignals(conversationId) {
        const messages = await this.getConversationMessages(conversationId);
        const recentMessages = messages.slice(-10); // Focus on recent messages
        let maxScore = 0;
        const allSignals = [];
        let deadline;
        for (const message of recentMessages) {
            for (const [level, keywords] of Object.entries(this.URGENCY_KEYWORDS)) {
                for (const { pattern, score } of keywords) {
                    const matches = message.content.match(pattern);
                    if (matches) {
                        maxScore = Math.max(maxScore, score);
                        allSignals.push(matches[0]);
                    }
                }
            }
            // Check for deadline mentions
            const deadlineMatch = message.content.match(/by\s+(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\w+\s+\d{1,2}(?:st|nd|rd|th)?)/i);
            if (deadlineMatch && !deadline) {
                deadline = this.parseDeadline(deadlineMatch[1]);
            }
        }
        // Add custom urgency keywords from config
        for (const keyword of this.config.urgencyKeywords) {
            const pattern = new RegExp(keyword, 'i');
            const matches = messages.some(m => pattern.test(m.content));
            if (matches) {
                maxScore = Math.max(maxScore, 0.6);
                allSignals.push(keyword);
            }
        }
        // Determine urgency level
        let level = 'none';
        if (maxScore >= 0.9)
            level = 'critical';
        else if (maxScore >= 0.7)
            level = 'high';
        else if (maxScore >= 0.5)
            level = 'medium';
        else if (maxScore >= 0.3)
            level = 'low';
        return {
            level,
            score: maxScore,
            signals: [...new Set(allSignals)].slice(0, 5),
            deadline
        };
    }
    /**
     * Identify project contexts from entity clustering
     */
    async identifyProjectContexts(conversationId) {
        const clusters = await this.findEntityClusters(conversationId);
        const projects = [];
        for (const cluster of clusters) {
            if (cluster.strength >= this.config.minProjectConfidence) {
                // Determine project type based on entity relationships
                const projectType = await this.determineProjectType(cluster.entities);
                projects.push({
                    name: this.generateClusterName(cluster.entities),
                    entities: cluster.entities,
                    confidence: cluster.strength,
                    type: projectType
                });
            }
        }
        return projects.sort((a, b) => b.confidence - a.confidence);
    }
    /**
     * Perform complete auto-tagging for a conversation
     */
    async autoTagConversation(conversationId) {
        const [topicTags, activity, urgency, projectContexts] = await Promise.all([
            this.generateTopicTags(conversationId),
            this.classifyActivity(conversationId),
            this.detectUrgencySignals(conversationId),
            this.identifyProjectContexts(conversationId)
        ]);
        return {
            conversationId,
            topicTags,
            activity,
            urgency,
            projectContexts,
            generatedAt: new Date()
        };
    }
    // Helper methods
    async getConversationEntities(conversationId) {
        const query = `
      SELECT 
        e.*,
        COUNT(em.id) as mentions
      FROM entities e
      JOIN entity_mentions em ON e.id = em.entity_id
      WHERE em.conversation_id = ?
      GROUP BY e.id
      ORDER BY mentions DESC
    `;
        return this.dbManager.getConnection().prepare(query).all(conversationId);
    }
    async getConversationMessages(conversationId) {
        const query = `
      SELECT content, created_at
      FROM messages
      WHERE conversation_id = ?
      ORDER BY created_at
    `;
        return this.dbManager.getConnection().prepare(query).all(conversationId);
    }
    calculateEntityRelevance(entity, totalEntities) {
        // Relevance based on mentions, entity type importance, and relative frequency
        const mentionScore = Math.min(1, entity.mentions / 10);
        const typeScore = this.getEntityTypeScore(entity.type);
        const frequencyScore = entity.mentions / Math.max(totalEntities, 1);
        return (mentionScore * 0.4 + typeScore * 0.3 + frequencyScore * 0.3);
    }
    getEntityTypeScore(type) {
        const scores = {
            person: 0.8,
            organization: 0.9,
            technical: 1.0,
            product: 0.9,
            location: 0.6,
            event: 0.7,
            decision: 0.9,
            concept: 0.8
        };
        return scores[type] || 0.5;
    }
    async findEntityClusters(conversationId) {
        // Find entities that frequently appear together
        const query = `
      WITH cooccurrence AS (
        SELECT 
          em1.entity_id as entity1_id,
          em2.entity_id as entity2_id,
          COUNT(*) as cooccurrence_count
        FROM entity_mentions em1
        JOIN entity_mentions em2 ON em1.message_id = em2.message_id
        WHERE em1.conversation_id = ?
          AND em2.conversation_id = ?
          AND em1.entity_id < em2.entity_id
        GROUP BY em1.entity_id, em2.entity_id
        HAVING cooccurrence_count >= 2
      )
      SELECT 
        e1.id as e1_id, e1.name as e1_name, e1.type as e1_type,
        e2.id as e2_id, e2.name as e2_name, e2.type as e2_type,
        c.cooccurrence_count
      FROM cooccurrence c
      JOIN entities e1 ON c.entity1_id = e1.id
      JOIN entities e2 ON c.entity2_id = e2.id
      ORDER BY c.cooccurrence_count DESC
    `;
        const rows = this.dbManager.getConnection().prepare(query).all(conversationId, conversationId);
        // Simple clustering algorithm
        const clusters = new Map();
        const entityMap = new Map();
        for (const row of rows) {
            // Store entity info
            entityMap.set(row.e1_id, { id: row.e1_id, name: row.e1_name, type: row.e1_type });
            entityMap.set(row.e2_id, { id: row.e2_id, name: row.e2_name, type: row.e2_type });
            // Find or create cluster
            let clusterId = null;
            for (const [id, cluster] of clusters) {
                if (cluster.has(row.e1_id) || cluster.has(row.e2_id)) {
                    clusterId = id;
                    break;
                }
            }
            if (clusterId) {
                clusters.get(clusterId).add(row.e1_id);
                clusters.get(clusterId).add(row.e2_id);
            }
            else {
                const newCluster = new Set([row.e1_id, row.e2_id]);
                clusters.set(row.e1_id, newCluster);
            }
        }
        // Convert to result format
        const result = [];
        for (const [_, entityIds] of clusters) {
            const entities = Array.from(entityIds).map(id => entityMap.get(id));
            const strength = Math.min(1, entities.length / 10);
            result.push({ entities, strength });
        }
        return result;
    }
    generateClusterName(entities) {
        // Generate a meaningful name from entity cluster
        const technicalEntities = entities.filter(e => e.type === 'technical');
        const productEntities = entities.filter(e => e.type === 'product');
        const conceptEntities = entities.filter(e => e.type === 'concept');
        if (technicalEntities.length > 0) {
            return technicalEntities.map(e => e.name).join(' + ');
        }
        else if (productEntities.length > 0) {
            return productEntities[0].name + ' Project';
        }
        else if (conceptEntities.length > 0) {
            return conceptEntities[0].name + ' Discussion';
        }
        else {
            return entities.slice(0, 2).map(e => e.name).join(' & ');
        }
    }
    generateDomainTags(entities) {
        const domainCounts = {};
        for (const entity of entities) {
            const domain = this.getEntityDomain(entity.type);
            domainCounts[domain] = (domainCounts[domain] || 0) + entity.mentions;
        }
        return Object.entries(domainCounts)
            .filter(([_, count]) => count >= 3)
            .map(([domain, count]) => ({
            name: domain,
            type: 'domain',
            relevance: Math.min(1, count / 20),
            source: 'keyword_analysis'
        }));
    }
    getEntityDomain(type) {
        const domains = {
            person: 'People & Teams',
            organization: 'Organizations',
            technical: 'Technology',
            product: 'Products',
            location: 'Places',
            event: 'Events',
            decision: 'Decisions',
            concept: 'Concepts'
        };
        return domains[type] || 'General';
    }
    parseDeadline(text) {
        try {
            // Simple deadline parsing - could be enhanced
            const today = new Date();
            if (text.toLowerCase().includes('tomorrow')) {
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                return tomorrow;
            }
            if (text.toLowerCase().includes('today')) {
                return today;
            }
            // Try to parse date format
            const parsed = new Date(text);
            if (!isNaN(parsed.getTime())) {
                return parsed;
            }
        }
        catch {
            // Ignore parsing errors
        }
        return undefined;
    }
    async determineProjectType(entities) {
        // Check if project has decision entities (likely completed)
        const hasDecisions = entities.some(e => e.type === 'decision');
        if (hasDecisions) {
            return 'completed';
        }
        // Check entity creation dates to determine if new
        const query = `
      SELECT MIN(created_at) as first_seen, MAX(created_at) as last_seen
      FROM entities
      WHERE id IN (${entities.map(() => '?').join(',')})
    `;
        const result = this.dbManager.getConnection().prepare(query).get(...entities.map(e => e.id));
        const ageInDays = (Date.now() - result.first_seen) / (1000 * 60 * 60 * 24);
        if (ageInDays < 7) {
            return 'new';
        }
        return 'ongoing';
    }
}
//# sourceMappingURL=AutoTaggingService.js.map