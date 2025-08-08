/**
 * Entity Linking Service
 * 
 * Handles fuzzy matching, alias resolution, and entity consolidation.
 * Links entity variations across conversations (e.g., "John", "John Doe", "JD").
 */

import { EntityRepository, Entity, EntityType } from '../storage/repositories/EntityRepository.js';
import { DatabaseManager } from '../storage/Database.js';

export interface EntityAlias {
  id: string;
  entityId: string;
  alias: string;
  aliasType: AliasType;
  confidenceScore: number;
  createdAt: number;
}

export type AliasType = 'formal' | 'informal' | 'abbreviation' | 'nickname' | 'variation';

export interface LinkingCandidate {
  entity: Entity;
  similarity: number;
  matchType: 'exact' | 'fuzzy' | 'semantic' | 'alias' | 'pattern';
  explanation: string;
}

export interface LinkingConfig {
  fuzzyThreshold: number;
  enableAliasGeneration: boolean;
  enableSemanticMatching: boolean;
  maxCandidates: number;
}

export class EntityLinker {
  private entityRepository: EntityRepository;
  private dbManager: DatabaseManager;
  private config: LinkingConfig;

  constructor(dbManager: DatabaseManager, config: Partial<LinkingConfig> = {}) {
    this.dbManager = dbManager;
    this.entityRepository = new EntityRepository(dbManager);
    this.config = {
      fuzzyThreshold: 0.8,
      enableAliasGeneration: true,
      enableSemanticMatching: false, // Can be enabled when we have embeddings
      maxCandidates: 5,
      ...config
    };
  }

  /**
   * Find the best matching entity for a given text and type
   */
  async linkEntity(
    text: string, 
    type: EntityType, 
    context?: string
  ): Promise<{
    linkedEntity: Entity | null;
    candidates: LinkingCandidate[];
    shouldCreateNew: boolean;
    suggestedAliases: string[];
  }> {
    const normalizedText = this.normalizeText(text);
    
    // 1. Try exact match first
    const exactMatch = await this.entityRepository.findByNormalizedName(normalizedText, type);
    if (exactMatch) {
      return {
        linkedEntity: exactMatch,
        candidates: [{ 
          entity: exactMatch, 
          similarity: 1.0, 
          matchType: 'exact',
          explanation: 'Exact normalized name match'
        }],
        shouldCreateNew: false,
        suggestedAliases: []
      };
    }

    // 2. Check for alias matches
    const aliasMatch = await this.findByAlias(text, type);
    if (aliasMatch) {
      return {
        linkedEntity: aliasMatch,
        candidates: [{ 
          entity: aliasMatch, 
          similarity: 0.95, 
          matchType: 'alias',
          explanation: 'Matched existing alias'
        }],
        shouldCreateNew: false,
        suggestedAliases: []
      };
    }

    // 3. Find fuzzy matches
    const candidates = await this.findFuzzyCandidates(text, type, context);
    
    // 4. Determine best candidate
    const bestCandidate = candidates.length > 0 ? candidates[0] : null;
    const shouldLink = bestCandidate && bestCandidate.similarity >= this.config.fuzzyThreshold;

    // 5. Generate suggested aliases if we're linking
    const suggestedAliases = shouldLink && this.config.enableAliasGeneration
      ? this.generateAliases(text, bestCandidate!.entity.name, type)
      : [];

    return {
      linkedEntity: shouldLink ? bestCandidate!.entity : null,
      candidates: candidates.slice(0, this.config.maxCandidates),
      shouldCreateNew: !shouldLink,
      suggestedAliases
    };
  }

  /**
   * Create aliases for an entity
   */
  async createAlias(
    entityId: string,
    alias: string,
    aliasType: AliasType,
    confidence: number = 0.9
  ): Promise<EntityAlias> {
    const aliasRecord: EntityAlias = {
      id: this.generateId(),
      entityId,
      alias: alias.trim(),
      aliasType,
      confidenceScore: confidence,
      createdAt: Date.now()
    };

    const db = this.dbManager.getConnection();
    const stmt = db.prepare(`
      INSERT INTO entity_aliases (id, entity_id, alias, alias_type, confidence_score, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      aliasRecord.id,
      aliasRecord.entityId,
      aliasRecord.alias,
      aliasRecord.aliasType,
      aliasRecord.confidenceScore,
      aliasRecord.createdAt
    );

    return aliasRecord;
  }

  /**
   * Batch create aliases for an entity
   */
  async createAliases(entityId: string, aliases: Array<{
    alias: string;
    type: AliasType;
    confidence?: number;
  }>): Promise<EntityAlias[]> {
    const results: EntityAlias[] = [];

    for (const aliasData of aliases) {
      try {
        const alias = await this.createAlias(
          entityId,
          aliasData.alias,
          aliasData.type,
          aliasData.confidence
        );
        results.push(alias);
      } catch (error) {
        // Skip duplicates or errors
        console.warn(`Failed to create alias "${aliasData.alias}":`, error);
      }
    }

    return results;
  }

  /**
   * Merge two entities by moving all mentions to the target entity
   */
  async mergeEntities(sourceEntityId: string, targetEntityId: string): Promise<boolean> {
    const sourceEntity = await this.entityRepository.getById(sourceEntityId);
    const targetEntity = await this.entityRepository.getById(targetEntityId);

    if (!sourceEntity || !targetEntity) {
      return false;
    }

    const db = this.dbManager.getConnection();
    
    try {
      const transaction = db.transaction(() => {
        // Move all mentions to target entity
        db.prepare(`
          UPDATE entity_mentions 
          SET entity_id = ? 
          WHERE entity_id = ?
        `).run(targetEntityId, sourceEntityId);

        // Move all relationship references
        db.prepare(`
          UPDATE entity_relationships 
          SET source_entity_id = ? 
          WHERE source_entity_id = ?
        `).run(targetEntityId, sourceEntityId);

        db.prepare(`
          UPDATE entity_relationships 
          SET target_entity_id = ? 
          WHERE target_entity_id = ?
        `).run(targetEntityId, sourceEntityId);

        // Create alias from source to target
        const aliasId = this.generateId();
        db.prepare(`
          INSERT OR IGNORE INTO entity_aliases (id, entity_id, alias, alias_type, confidence_score, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(aliasId, targetEntityId, sourceEntity.name, 'variation', 0.9, Date.now());

        // Delete source entity
        db.prepare('DELETE FROM entities WHERE id = ?').run(sourceEntityId);
      });

      transaction();
      return true;

    } catch (error) {
      console.error('Failed to merge entities:', error);
      return false;
    }
  }

  /**
   * Get all aliases for an entity
   */
  async getEntityAliases(entityId: string): Promise<EntityAlias[]> {
    const db = this.dbManager.getConnection();
    const stmt = db.prepare(`
      SELECT * FROM entity_aliases 
      WHERE entity_id = ? 
      ORDER BY confidence_score DESC, created_at ASC
    `);

    const rows = stmt.all(entityId) as any[];
    return rows.map(row => this.mapRowToAlias(row));
  }

  /**
   * Find entity by alias
   */
  private async findByAlias(text: string, type: EntityType): Promise<Entity | null> {
    const db = this.dbManager.getConnection();
    const stmt = db.prepare(`
      SELECT e.* FROM entities e
      JOIN entity_aliases ea ON e.id = ea.entity_id
      WHERE ea.alias = ? AND e.type = ?
      ORDER BY ea.confidence_score DESC
      LIMIT 1
    `);

    const row = stmt.get(text.trim(), type) as any;
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      normalizedName: row.normalized_name,
      type: row.type as EntityType,
      canonicalForm: row.canonical_form,
      confidenceScore: row.confidence_score,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: JSON.parse(row.metadata || '{}'),
      mentionCount: row.mention_count,
      lastMentionedAt: row.last_mentioned_at
    };
  }

  /**
   * Find fuzzy matching candidates
   */
  private async findFuzzyCandidates(
    text: string,
    type: EntityType,
    _context?: string
  ): Promise<LinkingCandidate[]> {
    const candidates: LinkingCandidate[] = [];
    
    // Get all entities of the same type
    const entities = await this.entityRepository.search({ 
      type, 
      limit: 50 // Reasonable limit for fuzzy matching
    });

    for (const entity of entities.entities) {
      // First check for pattern matches (abbreviations, nicknames)
      let isPatternMatch = false;
      let matchType: LinkingCandidate['matchType'] = 'fuzzy';
      let explanation = '';
      let similarity = 0;

      // Check for abbreviation pattern
      if (this.isAbbreviation(text, entity.name)) {
        isPatternMatch = true;
        matchType = 'pattern';
        explanation = 'Detected abbreviation pattern';
        similarity = 0.8; // High confidence for abbreviations
      } 
      // Check for nickname pattern
      else if (entity.type === 'person' && this.isNickname(text, entity.name, type)) {
        isPatternMatch = true;
        matchType = 'pattern';
        explanation = 'Detected nickname pattern';
        similarity = 0.75; // Good confidence for nicknames
      }

      // If no pattern match, calculate text similarity
      if (!isPatternMatch) {
        const nameSimilarity = this.calculateLevenshteinSimilarity(text, entity.name);
        const normalizedSimilarity = this.calculateLevenshteinSimilarity(
          this.normalizeText(text), 
          entity.normalizedName
        );
        similarity = Math.max(nameSimilarity, normalizedSimilarity);
        explanation = `${Math.round(similarity * 100)}% text similarity`;
      }

      // Add as candidate if pattern match OR similarity is high enough
      if (isPatternMatch || similarity > 0.5) {
        candidates.push({
          entity,
          similarity,
          matchType,
          explanation
        });
      }
    }

    // Sort by similarity descending
    return candidates.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Generate potential aliases for an entity
   */
  private generateAliases(newText: string, existingName: string, type: EntityType): string[] {
    const aliases: string[] = [];

    // For persons, generate common nickname patterns
    if (type === 'person') {
      const parts = existingName.split(' ');
      if (parts.length >= 2) {
        // First name only
        aliases.push(parts[0]);
        // First + last initial
        aliases.push(`${parts[0]} ${parts[parts.length - 1][0]}.`);
        // Initials
        aliases.push(parts.map(p => p[0]).join('.'));
      }
    }

    // For technical terms, generate variations
    if (type === 'technical') {
      const variations = this.generateTechnicalVariations(existingName);
      aliases.push(...variations);
    }

    // For organizations, generate abbreviations
    if (type === 'organization') {
      const abbrev = this.generateOrganizationAbbreviation(existingName);
      if (abbrev) aliases.push(abbrev);
    }

    // Always add the new text as a potential alias
    if (!aliases.includes(newText) && newText !== existingName) {
      aliases.push(newText);
    }

    return aliases.filter(alias => alias.length > 1); // Filter out single characters
  }

  /**
   * Generate technical term variations
   */
  private generateTechnicalVariations(name: string): string[] {
    const variations: string[] = [];
    
    // Common technical variations
    const techPatterns = [
      [/JavaScript/gi, ['JS', 'javascript']],
      [/TypeScript/gi, ['TS', 'typescript']],
      [/React/gi, ['ReactJS', 'React.js']],
      [/Node\.js/gi, ['NodeJS', 'Node', 'node']],
      [/Machine Learning/gi, ['ML', 'machine learning']],
      [/Artificial Intelligence/gi, ['AI', 'artificial intelligence']]
    ];

    for (const [pattern, vars] of techPatterns) {
      if ((pattern as RegExp).test(name)) {
        variations.push(...(vars as string[]));
      }
    }

    return variations;
  }

  /**
   * Generate organization abbreviation
   */
  private generateOrganizationAbbreviation(name: string): string | null {
    // Extract capital letters from organization names
    const words = name.split(' ').filter(word => 
      !['Inc', 'Corp', 'Corporation', 'LLC', 'Ltd', 'Company', 'Group'].includes(word)
    );
    
    if (words.length >= 2) {
      return words.map(word => word[0]).join('').toUpperCase();
    }
    
    return null;
  }

  /**
   * Check if text is an abbreviation of name
   */
  private isAbbreviation(text: string, name: string): boolean {
    if (text.length >= name.length) return false;
    
    const nameWords = name.split(' ').filter(word => word.length > 0);
    const textUpper = text.toUpperCase().replace(/\./g, '');
    
    // Check if text matches first letters of words
    const initials = nameWords.map(word => word[0].toUpperCase()).join('');
    return textUpper === initials;
  }

  /**
   * Check if text is a nickname of name
   */
  private isNickname(text: string, name: string, type: EntityType): boolean {
    if (type !== 'person') return false;
    
    const nameParts = name.split(' ');
    const firstName = nameParts[0];
    
    // Common nickname patterns
    return text === firstName || 
           firstName.toLowerCase().startsWith(text.toLowerCase()) ||
           text.toLowerCase().startsWith(firstName.toLowerCase());
  }

  /**
   * Calculate Levenshtein similarity between two strings
   */
  private calculateLevenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Normalize text for comparison
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ');
  }

  /**
   * Generate UUID
   */
  private generateId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Map database row to EntityAlias
   */
  private mapRowToAlias(row: any): EntityAlias {
    return {
      id: row.id,
      entityId: row.entity_id,
      alias: row.alias,
      aliasType: row.alias_type as AliasType,
      confidenceScore: row.confidence_score,
      createdAt: row.created_at
    };
  }
}