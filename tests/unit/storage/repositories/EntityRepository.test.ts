/**
 * Unit tests for EntityRepository
 * 
 * Tests the basic CRUD operations for entities in the knowledge graph system
 */

import { DatabaseManager } from '../../../../src/storage/Database.js';
import { EntityRepository, EntityType } from '../../../../src/storage/repositories/EntityRepository.js';
import { createTestDatabase } from '../../../utils/test-helpers.js';

describe('EntityRepository', () => {
  let dbManager: DatabaseManager;
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
    `);
    
    entityRepository = new EntityRepository(dbManager);
  });

  afterEach(async () => {
    // Clean up
    if (dbManager) {
      const db = dbManager.getConnection();
      db.close();
    }
  });

  describe('create', () => {
    it('should create a new entity successfully', async () => {
      const input = {
        name: 'John Doe',
        type: 'person' as EntityType,
        confidenceScore: 0.95,
        metadata: { occupation: 'Engineer' }
      };

      const entity = await entityRepository.create(input);

      expect(entity).toMatchObject({
        name: 'John Doe',
        normalizedName: 'john doe',
        type: 'person',
        confidenceScore: 0.95,
        metadata: { occupation: 'Engineer' },
        mentionCount: 0
      });
      expect(entity.id).toBeDefined();
      expect(entity.createdAt).toBeDefined();
      expect(entity.updatedAt).toBeDefined();
    });

    it('should normalize entity names correctly', async () => {
      const input = {
        name: 'John-Doe@Example.com!',
        type: 'person' as EntityType
      };

      const entity = await entityRepository.create(input);

      expect(entity.normalizedName).toBe('john-doeexamplecom');
    });

    it('should set default values correctly', async () => {
      const input = {
        name: 'Test Entity',
        type: 'concept' as EntityType
      };

      const entity = await entityRepository.create(input);

      expect(entity.confidenceScore).toBe(1.0);
      expect(entity.metadata).toEqual({});
      expect(entity.mentionCount).toBe(0);
      expect(entity.lastMentionedAt).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('should retrieve an entity by ID', async () => {
      const input = {
        name: 'Test Entity',
        type: 'product' as EntityType,
        metadata: { version: '1.0' }
      };

      const created = await entityRepository.create(input);
      const retrieved = await entityRepository.getById(created.id);

      expect(retrieved).toMatchObject({
        id: created.id,
        name: 'Test Entity',
        type: 'product',
        metadata: { version: '1.0' }
      });
    });

    it('should return null for non-existent ID', async () => {
      const result = await entityRepository.getById('00000000-0000-4000-8000-000000000000');
      expect(result).toBeNull();
    });

    it('should return null for invalid UUID', async () => {
      const result = await entityRepository.getById('invalid-uuid');
      expect(result).toBeNull();
    });
  });

  describe('findByNormalizedName', () => {
    it('should find entity by normalized name', async () => {
      const input = {
        name: 'John Doe',
        type: 'person' as EntityType
      };

      await entityRepository.create(input);
      const found = await entityRepository.findByNormalizedName('john doe');

      expect(found).toMatchObject({
        name: 'John Doe',
        normalizedName: 'john doe',
        type: 'person'
      });
    });

    it('should find entity by normalized name and type', async () => {
      // Create two entities with same normalized name but different types
      await entityRepository.create({
        name: 'Apple',
        type: 'organization' as EntityType
      });
      
      await entityRepository.create({
        name: 'Apple',
        type: 'product' as EntityType
      });

      const found = await entityRepository.findByNormalizedName('apple', 'product');

      expect(found?.type).toBe('product');
    });

    it('should return null if not found', async () => {
      const result = await entityRepository.findByNormalizedName('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update entity properties', async () => {
      const entity = await entityRepository.create({
        name: 'Old Name',
        type: 'person' as EntityType,
        confidenceScore: 0.5,
        metadata: { old: 'value' }
      });

      // Add small delay to ensure updatedAt changes
      await new Promise(resolve => setTimeout(resolve, 2));

      const updated = await entityRepository.update(entity.id, {
        name: 'New Name',
        confidenceScore: 0.9,
        metadata: { new: 'value' }
      });

      expect(updated).toMatchObject({
        id: entity.id,
        name: 'New Name',
        normalizedName: 'new name',
        confidenceScore: 0.9,
        metadata: { new: 'value' }
      });
      expect(updated!.updatedAt).toBeGreaterThan(entity.updatedAt);
    });

    it('should return null for non-existent entity', async () => {
      const result = await entityRepository.update('00000000-0000-4000-8000-000000000000', {
        name: 'New Name'
      });
      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    beforeEach(async () => {
      // Create test entities
      await entityRepository.create({
        name: 'John Doe',
        type: 'person' as EntityType,
        confidenceScore: 0.9
      });

      await entityRepository.create({
        name: 'Jane Smith',
        type: 'person' as EntityType,
        confidenceScore: 0.8
      });

      await entityRepository.create({
        name: 'Apple Inc',
        type: 'organization' as EntityType,
        confidenceScore: 0.95
      });
    });

    it('should search entities without filters', async () => {
      const result = await entityRepository.search();

      expect(result.entities.length).toBe(3);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });

    it('should filter by entity type', async () => {
      const result = await entityRepository.search({
        type: 'person'
      });

      expect(result.entities.length).toBe(2);
      expect(result.entities.every(e => e.type === 'person')).toBe(true);
    });

    it('should filter by minimum confidence', async () => {
      const result = await entityRepository.search({
        minConfidence: 0.85
      });

      expect(result.entities.length).toBe(2);
      expect(result.entities.every(e => e.confidenceScore >= 0.85)).toBe(true);
    });

    it('should support pagination', async () => {
      const result = await entityRepository.search({
        limit: 2,
        offset: 1
      });

      expect(result.entities.length).toBe(2);
      expect(result.total).toBe(3);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete an entity', async () => {
      const entity = await entityRepository.create({
        name: 'To Delete',
        type: 'concept' as EntityType
      });

      const deleted = await entityRepository.delete(entity.id);
      expect(deleted).toBe(true);

      const retrieved = await entityRepository.getById(entity.id);
      expect(retrieved).toBeNull();
    });

    it('should return false for non-existent entity', async () => {
      const result = await entityRepository.delete('00000000-0000-4000-8000-000000000000');
      expect(result).toBe(false);
    });
  });

  describe('getMostMentioned', () => {
    it('should return empty array when no entities exist', async () => {
      const result = await entityRepository.getMostMentioned();
      expect(result).toEqual([]);
    });

    it('should order by mention count', async () => {
      // Create entities (they start with 0 mentions)
      const entity1 = await entityRepository.create({
        name: 'Entity 1',
        type: 'concept' as EntityType
      });

      const entity2 = await entityRepository.create({
        name: 'Entity 2',
        type: 'concept' as EntityType
      });

      // Update mention counts directly (normally done by triggers)
      const db = dbManager.getConnection();
      db.prepare('UPDATE entities SET mention_count = ? WHERE id = ?').run(5, entity1.id);
      db.prepare('UPDATE entities SET mention_count = ? WHERE id = ?').run(3, entity2.id);

      const result = await entityRepository.getMostMentioned();

      expect(result.length).toBe(2);
      expect(result[0].mentionCount).toBe(5);
      expect(result[1].mentionCount).toBe(3);
    });
  });
});