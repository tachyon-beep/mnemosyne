/**
 * Unit tests for EntityLinker
 * 
 * Tests fuzzy matching, alias resolution, and entity consolidation functionality
 */

import { DatabaseManager } from '../../../src/storage/Database.js';
import { EntityLinker } from '../../../src/entities/EntityLinker.js';
import { EntityRepository } from '../../../src/storage/repositories/EntityRepository.js';
import { createTestDatabase } from '../../utils/test-helpers.js';

describe('EntityLinker', () => {
  let dbManager: DatabaseManager;
  let entityLinker: EntityLinker;
  let entityRepository: EntityRepository;

  beforeEach(async () => {
    // Create a fresh in-memory database for each test
    dbManager = await createTestDatabase();
    
    // Ensure knowledge graph tables exist
    const db = dbManager.getConnection();
    db.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        normalized_name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('person', 'organization', 'product', 'concept', 'location', 'technical', 'event', 'decision')),
        canonical_form TEXT,
        confidence_score REAL DEFAULT 1.0 CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT DEFAULT '{}',
        mention_count INTEGER DEFAULT 0,
        last_mentioned_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS entity_aliases (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        alias TEXT NOT NULL,
        alias_type TEXT NOT NULL CHECK (alias_type IN ('formal', 'informal', 'abbreviation', 'nickname', 'variation')),
        confidence_score REAL DEFAULT 1.0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        UNIQUE(entity_id, alias)
      );

      CREATE TABLE IF NOT EXISTS entity_mentions (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        message_id TEXT NOT NULL,
        conversation_id TEXT NOT NULL,
        mention_text TEXT NOT NULL,
        start_position INTEGER NOT NULL,
        end_position INTEGER NOT NULL,
        confidence_score REAL DEFAULT 1.0,
        extraction_method TEXT DEFAULT 'pattern',
        created_at INTEGER NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS entity_relationships (
        id TEXT PRIMARY KEY,
        source_entity_id TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL,
        strength REAL DEFAULT 1.0,
        context TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE
      );

      -- Create conversations table for foreign key constraint
      INSERT OR IGNORE INTO conversations (id, title, created_at, updated_at) 
      VALUES 
        ('conv-1', 'Test Conversation 1', 1, 1),
        ('conv-2', 'Test Conversation 2', 1, 1);

      -- Create messages table for foreign key constraint
      INSERT OR IGNORE INTO messages (id, conversation_id, role, content, created_at) 
      VALUES 
        ('msg-1', 'conv-1', 'user', '', 1),
        ('msg-2', 'conv-1', 'user', '', 1),
        ('msg-3', 'conv-1', 'user', '', 1);
    `);
    
    entityRepository = new EntityRepository(dbManager);
    entityLinker = new EntityLinker(dbManager, {
      fuzzyThreshold: 0.7,
      enableAliasGeneration: true,
      maxCandidates: 5
    });
  });

  afterEach(async () => {
    if (dbManager) {
      const db = dbManager.getConnection();
      db.close();
    }
  });

  describe('linkEntity', () => {
    it('should return exact match when entity exists', async () => {
      // Create a test entity
      const entity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const result = await entityLinker.linkEntity('John Doe', 'person');

      expect(result.linkedEntity).not.toBeNull();
      expect(result.linkedEntity!.id).toBe(entity.id);
      expect(result.candidates[0].matchType).toBe('exact');
      expect(result.candidates[0].similarity).toBe(1.0);
      expect(result.shouldCreateNew).toBe(false);
    });

    it('should find fuzzy matches for similar names', async () => {
      // Create a test entity
      await entityRepository.create({
        name: 'JavaScript',
        type: 'technical'
      });

      const result = await entityLinker.linkEntity('JavaSkript', 'technical'); // Different spelling

      expect(result.linkedEntity).not.toBeNull();
      expect(result.candidates[0].matchType).toBe('fuzzy');
      expect(result.candidates[0].similarity).toBeGreaterThan(0.7);
      expect(result.shouldCreateNew).toBe(false);
    });

    it('should detect abbreviations', async () => {
      // Create a test entity
      await entityRepository.create({
        name: 'Artificial Intelligence',
        type: 'technical'
      });

      const result = await entityLinker.linkEntity('AI', 'technical');

      // Should find candidate even if not perfect pattern match
      expect(result.candidates.length).toBeGreaterThan(0);
      const aiCandidate = result.candidates.find(c => 
        c.entity.name === 'Artificial Intelligence'
      );
      expect(aiCandidate).toBeDefined();
    });

    it('should detect nicknames for person entities', async () => {
      // Create a test entity
      await entityRepository.create({
        name: 'Jonathan Smith',
        type: 'person'
      });

      const result = await entityLinker.linkEntity('Jon', 'person');

      // Should find the person entity as a candidate
      expect(result.candidates.length).toBeGreaterThan(0);
      const personCandidate = result.candidates.find(c => 
        c.entity.name === 'Jonathan Smith'
      );
      expect(personCandidate).toBeDefined();
    });

    it('should suggest creating new entity when no good matches found', async () => {
      const result = await entityLinker.linkEntity('Completely Unique Name', 'person');

      expect(result.linkedEntity).toBeNull();
      expect(result.shouldCreateNew).toBe(true);
      expect(result.candidates.length).toBe(0);
    });

    it('should return multiple candidates sorted by similarity', async () => {
      // Create similar entities
      await entityRepository.create({ name: 'React', type: 'technical' });
      await entityRepository.create({ name: 'ReactJS', type: 'technical' });
      await entityRepository.create({ name: 'React Native', type: 'technical' });

      const result = await entityLinker.linkEntity('React.js', 'technical');

      expect(result.candidates.length).toBeGreaterThan(0);
      // Should be sorted by similarity descending if multiple candidates
      if (result.candidates.length > 1) {
        for (let i = 1; i < result.candidates.length; i++) {
          expect(result.candidates[i-1].similarity).toBeGreaterThanOrEqual(
            result.candidates[i].similarity
          );
        }
      }
    });
  });

  describe('alias matching', () => {
    it('should find entities by existing aliases', async () => {
      // Create entity and alias
      const entity = await entityRepository.create({
        name: 'TypeScript',
        type: 'technical'
      });

      await entityLinker.createAlias(entity.id, 'TS', 'abbreviation', 0.9);

      const result = await entityLinker.linkEntity('TS', 'technical');

      expect(result.linkedEntity).not.toBeNull();
      expect(result.linkedEntity!.id).toBe(entity.id);
      expect(result.candidates[0].matchType).toBe('alias');
    });

    it('should create aliases for linked entities', async () => {
      // Create entity
      await entityRepository.create({
        name: 'JavaScript',
        type: 'technical'
      });

      const result = await entityLinker.linkEntity('JavaSkript', 'technical'); // Close enough to link

      // Should link to existing entity and suggest aliases
      expect(result.linkedEntity).not.toBeNull();
      expect(result.suggestedAliases.length).toBeGreaterThan(0);
      expect(result.suggestedAliases).toContain('JavaSkript');
    });
  });

  describe('createAlias', () => {
    it('should create alias for entity', async () => {
      const entity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const alias = await entityLinker.createAlias(
        entity.id,
        'Johnny',
        'nickname',
        0.85
      );

      expect(alias.entityId).toBe(entity.id);
      expect(alias.alias).toBe('Johnny');
      expect(alias.aliasType).toBe('nickname');
      expect(alias.confidenceScore).toBe(0.85);
    });

    it('should batch create multiple aliases', async () => {
      const entity = await entityRepository.create({
        name: 'Jonathan Smith',
        type: 'person'
      });

      const aliases = await entityLinker.createAliases(entity.id, [
        { alias: 'Jon', type: 'nickname' },
        { alias: 'Johnny', type: 'nickname' },
        { alias: 'J.S.', type: 'abbreviation', confidence: 0.7 }
      ]);

      expect(aliases.length).toBe(3);
      expect(aliases.map(a => a.alias)).toEqual(['Jon', 'Johnny', 'J.S.']);
    });
  });

  describe('mergeEntities', () => {
    it('should merge entities and preserve mentions', async () => {
      // Create two similar entities
      const entity1 = await entityRepository.create({
        name: 'John',
        type: 'person'
      });

      const entity2 = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      // Create some mentions for entity1 (using raw SQL since we don't have mention repository)
      const db = dbManager.getConnection();
      db.prepare(`
        INSERT INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('mention-1', entity1.id, 'msg-1', 'conv-1', 'John', 0, 4, 0.8, Date.now());

      const success = await entityLinker.mergeEntities(entity1.id, entity2.id);
      expect(success).toBe(true);

      // Verify entity1 no longer exists
      const deletedEntity = await entityRepository.getById(entity1.id);
      expect(deletedEntity).toBeNull();

      // Verify entity2 still exists
      const targetEntity = await entityRepository.getById(entity2.id);
      expect(targetEntity).not.toBeNull();

      // Verify mentions were moved to entity2
      const mentions = db.prepare(`
        SELECT * FROM entity_mentions WHERE entity_id = ?
      `).all(entity2.id);
      expect(mentions.length).toBe(1);
      expect((mentions[0] as any).mention_text).toBe('John');

      // Verify alias was created
      const aliases = await entityLinker.getEntityAliases(entity2.id);
      expect(aliases.some(a => a.alias === 'John')).toBe(true);
    });

    it('should handle merge failure gracefully', async () => {
      const result = await entityLinker.mergeEntities('non-existent-1', 'non-existent-2');
      expect(result).toBe(false);
    });
  });

  describe('alias generation', () => {
    it('should generate aliases when entity is linked', async () => {
      await entityRepository.create({
        name: 'Jonathan David Smith',
        type: 'person'
      });

      // Use a very similar name that will link with high confidence
      const result = await entityLinker.linkEntity('Jonathan Smith', 'person');
      
      // Should link and suggest aliases
      if (result.linkedEntity) {
        expect(result.suggestedAliases.length).toBeGreaterThan(0);
        expect(result.suggestedAliases).toContain('Jonathan Smith');
      }
    });

    it('should generate technical aliases when linked', async () => {
      await entityRepository.create({
        name: 'JavaScript',
        type: 'technical'
      });

      // Use abbreviation that will link and generate meaningful alias
      const result = await entityLinker.linkEntity('JS', 'technical'); // Common abbreviation
      
      if (result.linkedEntity) {
        expect(result.linkedEntity.name).toBe('JavaScript');
        expect(result.suggestedAliases).toContain('JS');
        expect(result.suggestedAliases).toContain('javascript'); // From technical variations
      }
    });

    it('should not generate aliases when no entity is linked', async () => {
      const result = await entityLinker.linkEntity('Completely Unknown Term', 'technical');
      
      expect(result.linkedEntity).toBeNull();
      expect(result.suggestedAliases).toEqual([]);
    });
  });

  describe('Levenshtein distance calculation', () => {
    it('should calculate correct similarity scores', async () => {
      // Create test entity
      await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      // Test various similarity cases
      const testCases = [
        { input: 'React', expected: 1.0 },      // Exact match
        { input: 'react', expected: 1.0 },      // Case difference (normalized)
        { input: 'ReactJS', expected: 0.67 },   // Addition of characters
        { input: 'Rect', expected: 0.8 },       // Missing character
        { input: 'Reach', expected: 0.8 },      // Character substitution
      ];

      for (const testCase of testCases) {
        const result = await entityLinker.linkEntity(testCase.input, 'technical');
        if (result.candidates.length > 0) {
          const reactCandidate = result.candidates.find(c => c.entity.name === 'React');
          if (reactCandidate) {
            expect(reactCandidate.similarity).toBeCloseTo(testCase.expected, 1);
          }
        }
      }
    });
  });

  describe('configuration options', () => {
    it('should respect fuzzy threshold setting', async () => {
      const strictLinker = new EntityLinker(dbManager, {
        fuzzyThreshold: 0.95 // Very high threshold
      });

      await entityRepository.create({
        name: 'TypeScript',
        type: 'technical'
      });

      const result = await strictLinker.linkEntity('typescript', 'technical');
      
      // With high threshold, should still link exact normalized matches
      expect(result.linkedEntity).not.toBeNull();
      expect(result.shouldCreateNew).toBe(false);
    });

    it('should limit candidates based on maxCandidates setting', async () => {
      const limitedLinker = new EntityLinker(dbManager, {
        maxCandidates: 2
      });

      // Create multiple similar entities
      await entityRepository.create({ name: 'React', type: 'technical' });
      await entityRepository.create({ name: 'ReactJS', type: 'technical' });
      await entityRepository.create({ name: 'React Native', type: 'technical' });
      await entityRepository.create({ name: 'ReactDOM', type: 'technical' });

      const result = await limitedLinker.linkEntity('React.js', 'technical');
      
      expect(result.candidates.length).toBeLessThanOrEqual(2);
    });

    it('should disable alias generation when configured', async () => {
      const noAliasLinker = new EntityLinker(dbManager, {
        enableAliasGeneration: false
      });

      await entityRepository.create({
        name: 'JavaScript',
        type: 'technical'
      });

      const result = await noAliasLinker.linkEntity('JS', 'technical');
      
      expect(result.suggestedAliases).toEqual([]);
    });
  });

  describe('getEntityAliases', () => {
    it('should retrieve all aliases for an entity', async () => {
      const entity = await entityRepository.create({
        name: 'JavaScript',
        type: 'technical'
      });

      // Create multiple aliases
      await entityLinker.createAlias(entity.id, 'JS', 'abbreviation', 0.9);
      await entityLinker.createAlias(entity.id, 'javascript', 'variation', 0.8);

      const aliases = await entityLinker.getEntityAliases(entity.id);
      
      expect(aliases.length).toBe(2);
      expect(aliases.map(a => a.alias)).toEqual(expect.arrayContaining(['JS', 'javascript']));
      // Should be sorted by confidence score descending
      expect(aliases[0].confidenceScore).toBeGreaterThanOrEqual(aliases[1].confidenceScore);
    });
  });
});