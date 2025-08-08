/**
 * Entity Extraction Service
 * 
 * Extracts entities from text using pattern matching and NLP approaches.
 * Integrates with the existing EntityCentricStrategy patterns and extends
 * them for knowledge graph population.
 */

import { EntityType, ExtractionMethod } from '../storage/repositories/KnowledgeGraphRepository.js';

/**
 * Extracted entity with position and confidence information
 */
export interface ExtractedEntity {
  text: string;
  normalizedText: string;
  type: EntityType;
  confidence: number;
  startPosition: number;
  endPosition: number;
  extractionMethod: ExtractionMethod;
  context?: string; // Surrounding text context
}

/**
 * Entity extraction configuration
 */
export interface ExtractionConfig {
  minConfidence: number;
  maxEntitiesPerMessage: number;
  enableContextCapture: boolean;
  contextWindowSize: number;
}

/**
 * Entity extraction service
 */
export class EntityExtractor {
  private entityPatterns: Map<EntityType, RegExp[]> = new Map();
  private stopWords: Set<string> = new Set();
  private config: ExtractionConfig;

  constructor(config: Partial<ExtractionConfig> = {}) {
    this.config = {
      minConfidence: 0.5,
      maxEntitiesPerMessage: 50,
      enableContextCapture: true,
      contextWindowSize: 50,
      ...config
    };

    this.initializePatterns();
    this.initializeStopWords();
  }

  /**
   * Extract entities from text
   */
  extractEntities(text: string, _messageId?: string): ExtractedEntity[] {
    const entities: ExtractedEntity[] = [];
    const processed = new Set<string>();

    // Extract entities using pattern matching
    for (const [entityType, patterns] of this.entityPatterns) {
      for (const pattern of patterns) {
        const matches = this.findMatches(text, pattern, entityType);
        
        for (const match of matches) {
          const normalized = this.normalizeEntityText(match.text);
          
          // Skip if already processed, too short, or is a stop word
          if (processed.has(normalized) || 
              normalized.length < 2 || 
              this.stopWords.has(normalized.toLowerCase())) {
            continue;
          }

          processed.add(normalized);
          
          const entity: ExtractedEntity = {
            text: match.text,
            normalizedText: normalized,
            type: entityType,
            confidence: this.calculateConfidence(match.text, entityType, pattern),
            startPosition: match.startPosition,
            endPosition: match.endPosition,
            extractionMethod: 'pattern'
          };

          // Add context if enabled
          if (this.config.enableContextCapture) {
            entity.context = this.extractContext(text, match.startPosition, match.endPosition);
          }

          // Only include entities above confidence threshold
          if (entity.confidence >= this.config.minConfidence) {
            entities.push(entity);
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
   * Initialize entity recognition patterns
   * Based on EntityCentricStrategy patterns but extended for knowledge graph
   */
  private initializePatterns(): void {
    // Person names - enhanced patterns
    this.entityPatterns.set('person', [
      // Full names
      /\b[A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
      // Names with middle initial
      /\b[A-Z][a-z]+ [A-Z]\. [A-Z][a-z]+\b/g,
      // Titles with names
      /\b(?:Mr|Ms|Mrs|Dr|Prof|President|CEO|CTO|Director|Manager)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
      // @mentions (social media style)
      /@([A-Za-z0-9_]+)/g
    ]);

    // Organizations - comprehensive patterns
    this.entityPatterns.set('organization', [
      // Company names with suffixes
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Inc|Corp|Corporation|LLC|Ltd|Limited|Co|Company|Group|Industries|Systems|Solutions|Technologies|Tech)\b/g,
      // Acronym companies
      /\b[A-Z]{2,}(?:\s+[A-Z][a-z]+)*\b/g,
      // Educational institutions
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:University|College|Institute|School|Academy)\b/g,
      // Government agencies
      /\b(?:Department|Ministry|Agency|Bureau|Office)\s+of\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
    ]);

    // Products and technologies
    this.entityPatterns.set('product', [
      // Software products with versions
      /\b[A-Z][a-z]+(?:[A-Z][a-z]*)*\s+(?:\d+(?:\.\d+)*|v\d+(?:\.\d+)*)\b/g,
      // Brand names (CamelCase)
      /\b[A-Z][a-z]*[A-Z][A-Za-z]*\b/g,
      // Quoted product names
      /"([A-Z][^"]{2,30})"/g,
      // API/SDK names
      /\b[A-Z][a-z]+(?:[A-Z][a-z]*)*\s*(?:API|SDK|Framework|Library|Tool|Platform)\b/g
    ]);

    // Technical terms and concepts
    this.entityPatterns.set('technical', [
      // Programming languages and technologies
      /\b(?:JavaScript|TypeScript|Python|Java|React|Node\.js|Docker|Kubernetes|AWS|Azure|GCP|SQL|NoSQL|GraphQL|REST|API|HTTP|HTTPS|JSON|XML|HTML|CSS|Git|GitHub|GitLab)\b/g,
      // Function calls
      /\b[a-zA-Z_]\w*\([^)]*\)/g,
      // File extensions and paths
      /\b\w+\.[a-zA-Z]{2,4}\b/g,
      // URLs and domains
      /\b(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+/g,
      // Technical acronyms
      /\b[A-Z]{2,6}(?:\s+[A-Z]{2,6})*\b/g
    ]);

    // Locations
    this.entityPatterns.set('location', [
      // City, State/Country
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2,3}\b/g,
      // Street addresses
      /\b\d+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Way|Court|Ct)\b/g,
      // Countries and states
      /\b(?:United States|United Kingdom|Canada|Australia|Germany|France|Japan|China|India|Brazil|California|New York|Texas|Florida)\b/g
    ]);

    // Concepts and topics
    this.entityPatterns.set('concept', [
      // Multi-word capitalized concepts
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g,
      // Business terms
      /\b(?:Machine Learning|Artificial Intelligence|Data Science|Cloud Computing|Digital Transformation|Agile|DevOps|Microservices|Blockchain|Cryptocurrency)\b/gi,
      // Quoted concepts
      /"([A-Z][^"]{5,50})"/g
    ]);

    // Events and meetings
    this.entityPatterns.set('event', [
      // Meeting types
      /\b(?:meeting|conference|workshop|seminar|webinar|standup|retrospective|sprint planning|demo|review)\b/gi,
      // Named events
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Conference|Summit|Expo|Convention|Symposium|Workshop)\b/g,
      // Date-based events
      /\b(?:Q[1-4]|quarter|quarterly|annual|monthly|weekly|daily)\s+[a-z]+\b/gi
    ]);

    // Decisions and outcomes
    this.entityPatterns.set('decision', [
      // Decision language
      /\b(?:decided|decision|resolved|agreed|approved|rejected|postponed|deferred)\s+(?:to|that|on)\s+([^.!?]{5,50})/gi,
      // Action items
      /\b(?:action item|todo|task|follow-up|next step):\s*([^.!?\n]{5,100})/gi,
      // Outcomes
      /\b(?:outcome|result|conclusion|resolution):\s*([^.!?\n]{5,100})/gi
    ]);
  }

  /**
   * Initialize stop words to filter out common words
   */
  private initializeStopWords(): void {
    this.stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 
      'after', 'above', 'below', 'between', 'among', 'within', 'without',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 
      'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 
      'its', 'our', 'their', 'mine', 'yours', 'ours', 'theirs',
      'a', 'an', 'some', 'any', 'all', 'each', 'every', 'no', 'none', 'one',
      'two', 'three', 'first', 'second', 'last', 'next', 'previous',
      'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 
      'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 
      'might', 'must', 'can', 'cannot', 'can\'t', 'won\'t', 'don\'t', 'doesn\'t',
      'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'whose',
      'if', 'then', 'else', 'while', 'since', 'until', 'unless', 'because', 'so',
      'yes', 'no', 'not', 'now', 'here', 'there', 'today', 'tomorrow', 'yesterday',
      'very', 'more', 'most', 'less', 'least', 'much', 'many', 'few', 'little',
      'good', 'bad', 'better', 'best', 'worse', 'worst', 'new', 'old', 'young',
      'big', 'small', 'large', 'great', 'long', 'short', 'high', 'low'
    ]);
  }

  /**
   * Find pattern matches in text
   */
  private findMatches(text: string, pattern: RegExp, _entityType: EntityType): Array<{
    text: string;
    startPosition: number;
    endPosition: number;
  }> {
    const matches: Array<{ text: string; startPosition: number; endPosition: number }> = [];
    let match;

    // Reset regex lastIndex
    pattern.lastIndex = 0;

    while ((match = pattern.exec(text)) !== null) {
      const matchText = match[1] || match[0]; // Use capture group if available
      
      if (matchText && matchText.trim().length > 0) {
        matches.push({
          text: matchText.trim(),
          startPosition: match.index!,
          endPosition: match.index! + matchText.length
        });
      }

      // Prevent infinite loops on global regexes
      if (!pattern.global) break;
    }

    return matches;
  }

  /**
   * Calculate confidence score for an extracted entity
   */
  private calculateConfidence(text: string, type: EntityType, _pattern: RegExp): number {
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
        // Names with titles get higher confidence
        if (/^(?:Mr|Ms|Mrs|Dr|Prof|President|CEO|CTO)\.?\s+/.test(text)) {
          confidence += 0.2;
        }
        // Full names (first + last) get higher confidence
        if (/^[A-Z][a-z]+\s+[A-Z][a-z]+$/.test(text)) {
          confidence += 0.15;
        }
        break;

      case 'organization':
        // Company suffixes increase confidence
        if (/(?:Inc|Corp|LLC|Ltd|Company)$/i.test(text)) {
          confidence += 0.2;
        }
        // Well-known patterns
        if (/^[A-Z]{2,}$/.test(text) && text.length <= 6) {
          confidence += 0.1;
        }
        break;

      case 'technical':
        // Known technical terms get high confidence
        const knownTech = ['JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'Docker', 'AWS', 'API', 'HTTP', 'JSON'];
        if (knownTech.some(tech => text.toLowerCase() === tech.toLowerCase())) {
          confidence += 0.3;
        }
        break;

      case 'product':
        // Version numbers increase confidence
        if (/\d+(?:\.\d+)+/.test(text)) {
          confidence += 0.2;
        }
        break;

      case 'location':
        // City, State format gets high confidence
        if (/^[A-Z][a-z]+,\s*[A-Z]{2}$/.test(text)) {
          confidence += 0.3;
        }
        break;
    }

    // Capitalization patterns
    if (/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/.test(text)) {
      confidence += 0.1; // Proper case
    }

    // Penalize very common words even if they match patterns
    const commonWords = ['Home', 'User', 'Data', 'Test', 'Main', 'New', 'Old', 'First', 'Last'];
    if (commonWords.includes(text)) {
      confidence -= 0.2;
    }

    return Math.max(0.0, Math.min(1.0, confidence));
  }

  /**
   * Normalize entity text for consistent matching
   */
  private normalizeEntityText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .toLowerCase();
  }

  /**
   * Extract context around an entity mention
   */
  private extractContext(text: string, startPos: number, endPos: number): string {
    const contextStart = Math.max(0, startPos - this.config.contextWindowSize);
    const contextEnd = Math.min(text.length, endPos + this.config.contextWindowSize);
    
    return text.substring(contextStart, contextEnd).trim();
  }

  /**
   * Update extraction configuration
   */
  updateConfig(config: Partial<ExtractionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ExtractionConfig {
    return { ...this.config };
  }

  /**
   * Add custom pattern for entity type
   */
  addCustomPattern(entityType: EntityType, pattern: RegExp): void {
    if (!this.entityPatterns.has(entityType)) {
      this.entityPatterns.set(entityType, []);
    }
    this.entityPatterns.get(entityType)!.push(pattern);
  }

  /**
   * Get statistics about pattern usage
   */
  getPatternStats(): Record<EntityType, number> {
    const stats: Record<string, number> = {};
    
    for (const [type, patterns] of this.entityPatterns) {
      stats[type] = patterns.length;
    }
    
    return stats as Record<EntityType, number>;
  }
}