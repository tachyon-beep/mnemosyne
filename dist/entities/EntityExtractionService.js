/**
 * Entity Extraction Service for Phase 3
 *
 * Extracts entities from message text using pattern matching.
 * Integrates with EntityRepository for storage and management.
 */
import { EntityRepository } from '../storage/repositories/EntityRepository.js';
export class EntityExtractionService {
    entityRepository;
    dbManager;
    config;
    entityPatterns = new Map();
    stopWords = new Set();
    constructor(dbManager, config = {}) {
        this.dbManager = dbManager;
        this.entityRepository = new EntityRepository(dbManager);
        this.config = {
            minConfidence: 0.6,
            maxEntitiesPerMessage: 20,
            enableContextCapture: true,
            contextWindowSize: 50,
            ...config
        };
        this.initializePatterns();
        this.initializeStopWords();
    }
    /**
     * Extract and process entities from message text
     */
    async processMessage(messageId, conversationId, content) {
        // Extract entities using pattern matching
        const extractedEntities = this.extractEntitiesFromText(content);
        const createdEntities = [];
        const mentions = [];
        // Process each extracted entity
        for (const extracted of extractedEntities) {
            try {
                // Check if entity already exists
                let entity = await this.entityRepository.findByNormalizedName(extracted.normalizedText, extracted.type);
                // Create new entity if not found
                if (!entity) {
                    entity = await this.entityRepository.create({
                        name: extracted.text,
                        type: extracted.type,
                        confidenceScore: extracted.confidence,
                        metadata: {
                            firstSeenIn: conversationId,
                            extractionMethod: 'pattern'
                        }
                    });
                    createdEntities.push(entity);
                }
                // Create mention record
                const mention = {
                    entityId: entity.id,
                    messageId,
                    conversationId,
                    mentionText: extracted.text,
                    startPosition: extracted.startPosition,
                    endPosition: extracted.endPosition,
                    confidence: extracted.confidence
                };
                // Store mention in database
                await this.storeMention(mention);
                mentions.push(mention);
            }
            catch (error) {
                console.warn(`Failed to process entity "${extracted.text}":`, error);
            }
        }
        return {
            extractedEntities,
            createdEntities,
            mentions
        };
    }
    /**
     * Extract entities from text using pattern matching
     */
    extractEntitiesFromText(text) {
        const entities = [];
        const processedText = new Set();
        const occupiedPositions = [];
        // Process each entity type in order (more specific first)
        for (const [entityType, patterns] of this.entityPatterns.entries()) {
            for (const pattern of patterns) {
                const matches = this.findMatches(text, pattern);
                for (const match of matches) {
                    const normalized = this.normalizeEntityText(match.text);
                    // Skip if already processed, too short, or is a stop word
                    if (processedText.has(normalized) ||
                        normalized.length < 2 ||
                        this.stopWords.has(normalized.toLowerCase())) {
                        continue;
                    }
                    // Skip if this position overlaps with an already-matched entity
                    const overlaps = occupiedPositions.some(pos => (match.startPosition >= pos.start && match.startPosition < pos.end) ||
                        (match.endPosition > pos.start && match.endPosition <= pos.end) ||
                        (match.startPosition <= pos.start && match.endPosition >= pos.end));
                    if (overlaps) {
                        continue;
                    }
                    processedText.add(normalized);
                    const confidence = this.calculateConfidence(match.text, entityType);
                    // Only include entities above confidence threshold
                    if (confidence >= this.config.minConfidence) {
                        const entity = {
                            text: match.text,
                            normalizedText: normalized,
                            type: entityType,
                            confidence,
                            startPosition: match.startPosition,
                            endPosition: match.endPosition
                        };
                        // Add context if enabled
                        if (this.config.enableContextCapture) {
                            entity.context = this.extractContext(text, match.startPosition, match.endPosition);
                        }
                        entities.push(entity);
                        // Mark this position as occupied
                        occupiedPositions.push({
                            start: match.startPosition,
                            end: match.endPosition
                        });
                    }
                }
            }
        }
        // Sort by confidence and position, limit results
        return entities
            .sort((a, b) => {
            if (b.confidence !== a.confidence) {
                return b.confidence - a.confidence;
            }
            return a.startPosition - b.startPosition;
        })
            .slice(0, this.config.maxEntitiesPerMessage);
    }
    /**
     * Store entity mention in database
     */
    async storeMention(mention) {
        const db = this.dbManager.getConnection();
        // Use raw SQL for now since we don't have EntityMentionRepository
        const stmt = db.prepare(`
      INSERT OR IGNORE INTO entity_mentions (
        id, entity_id, message_id, conversation_id,
        mention_text, start_position, end_position,
        confidence_score, extraction_method, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const id = this.generateId();
        const now = Date.now();
        stmt.run(id, mention.entityId, mention.messageId, mention.conversationId, mention.mentionText, mention.startPosition, mention.endPosition, mention.confidence, 'pattern', now);
    }
    /**
     * Initialize entity recognition patterns
     * Order matters! More specific patterns should come before general ones.
     */
    initializePatterns() {
        // Technical terms (process first to catch specific technical terms)
        this.entityPatterns.set('technical', [
            // Specific technical terms (case-sensitive)
            /\b(?:JavaScript|TypeScript|Python|Java|React|Node\.js|Docker|Kubernetes|AWS|Azure|SQL|GraphQL|REST|API|Git|GitHub)\b/g,
            // Technical concepts (case-insensitive)
            /\b(?:Machine Learning|Artificial Intelligence|Data Science|Cloud Computing|DevOps|Microservices|Database|Backend|Frontend)\b/gi,
            // Additional patterns for compound terms
            /\b(?:frontend|backend|fullstack|full-stack)\b/gi
        ]);
        // Organizations (process before general person names)
        this.entityPatterns.set('organization', [
            // Company names with suffixes
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|Corp|Corporation|LLC|Ltd|Limited|Co|Company|Group)\b/g,
            // Universities and schools
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:University|College|Institute|School)\b/g
        ]);
        // Locations (process before general patterns)
        this.entityPatterns.set('location', [
            // City, State/Country
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2,3}\b/g,
            // Well-known places
            /\b(?:United States|United Kingdom|Canada|Australia|Germany|France|Japan|China|California|New York|Texas|Florida|London|Paris|Tokyo)\b/g
        ]);
        // Events (process before general patterns)
        this.entityPatterns.set('event', [
            // Meeting types
            /\b(?:meeting|conference|workshop|seminar|webinar|standup|retrospective|sprint planning|demo|review)\b/gi,
            // Named events
            /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Conference|Summit|Expo|Convention)\b/g
        ]);
        // Products and technologies
        this.entityPatterns.set('product', [
            // CamelCase product names (but exclude already matched technical terms)
            /\b[A-Z][a-z]*[A-Z][A-Za-z]*\b/g,
            // Quoted product names
            /"([A-Z][^"]{2,30})"/g
        ]);
        // Concepts (specific business/technical concepts)
        this.entityPatterns.set('concept', [
            // Business and technical terms (case-insensitive)
            /\b(?:Agile|Scrum|Kanban|Design Thinking|User Experience|Digital Transformation|Business Intelligence)\b/gi
        ]);
        // Person names (process last to avoid false positives)
        this.entityPatterns.set('person', [
            // Names with titles (high confidence)
            /\b(?:Mr|Ms|Mrs|Dr|Prof|President|CEO|CTO|Director|Manager)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
            // Full names (but avoid common technical/business terms)
            /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g
        ]);
        // Decisions
        this.entityPatterns.set('decision', [
            // Decision language patterns
            /\b(?:decided|decision|resolved|agreed|approved)\s+(?:to|that|on)\s+([^.!?]{5,50})/gi,
            // Action items
            /\b(?:action item|todo|task):\s*([^.!?\n]{5,50})/gi
        ]);
    }
    /**
     * Initialize stop words
     */
    initializeStopWords() {
        this.stopWords = new Set([
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us',
            'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'a', 'an',
            'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
            'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'can',
            'when', 'where', 'why', 'how', 'what', 'which', 'who', 'very', 'more',
            'most', 'good', 'bad', 'new', 'old', 'big', 'small'
        ]);
    }
    /**
     * Find pattern matches in text
     */
    findMatches(text, pattern) {
        const matches = [];
        let match;
        // Create a new regex to avoid modifying the original
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(text)) !== null) {
            const matchText = match[1] || match[0]; // Use capture group if available
            if (matchText && matchText.trim().length > 0) {
                matches.push({
                    text: matchText.trim(),
                    startPosition: match.index,
                    endPosition: match.index + matchText.length
                });
            }
            // Prevent infinite loops on global regexes
            if (!pattern.global)
                break;
        }
        return matches;
    }
    /**
     * Calculate confidence score for an entity
     */
    calculateConfidence(text, type) {
        let confidence = 0.5; // Base confidence
        // Length-based adjustments
        if (text.length >= 3 && text.length <= 50) {
            confidence += 0.1;
        }
        if (text.length >= 5 && text.length <= 30) {
            confidence += 0.1;
        }
        // Type-specific adjustments
        switch (type) {
            case 'person':
                if (/^(?:Mr|Ms|Mrs|Dr|Prof|President|CEO|CTO)\.?\s+/.test(text)) {
                    confidence += 0.2;
                }
                if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(text)) {
                    confidence += 0.15;
                }
                break;
            case 'organization':
                if (/(?:Inc|Corp|LLC|Ltd|Company)$/i.test(text)) {
                    confidence += 0.2;
                }
                break;
            case 'technical':
                // Well-known technical terms get higher confidence
                const wellKnownTech = [
                    'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js',
                    'Machine Learning', 'Artificial Intelligence', 'Database'
                ];
                if (wellKnownTech.some(term => text.toLowerCase().includes(term.toLowerCase()))) {
                    confidence += 0.2;
                }
                break;
        }
        return Math.min(1.0, confidence);
    }
    /**
     * Extract context around entity mention
     */
    extractContext(text, startPos, endPos) {
        const contextStart = Math.max(0, startPos - this.config.contextWindowSize);
        const contextEnd = Math.min(text.length, endPos + this.config.contextWindowSize);
        return text.substring(contextStart, contextEnd).trim();
    }
    /**
     * Normalize entity text for consistent matching
     */
    normalizeEntityText(text) {
        return text
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, ' ');
    }
    /**
     * Generate UUID for mentions
     */
    generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    /**
     * Batch process multiple messages
     */
    async processMessages(messages) {
        let totalExtracted = 0;
        let totalCreated = 0;
        let totalMentions = 0;
        const processingStats = new Map();
        for (const message of messages) {
            try {
                const result = await this.processMessage(message.id, message.conversationId, message.content);
                totalExtracted += result.extractedEntities.length;
                totalCreated += result.createdEntities.length;
                totalMentions += result.mentions.length;
                // Track stats by entity type
                for (const entity of result.extractedEntities) {
                    const count = processingStats.get(entity.type) || 0;
                    processingStats.set(entity.type, count + 1);
                }
            }
            catch (error) {
                console.warn(`Failed to process message ${message.id}:`, error);
            }
        }
        return {
            totalEntitiesExtracted: totalExtracted,
            totalEntitiesCreated: totalCreated,
            totalMentions,
            processingStats
        };
    }
}
//# sourceMappingURL=EntityExtractionService.js.map