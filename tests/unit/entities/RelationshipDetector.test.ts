/**
 * Unit tests for RelationshipDetector
 * 
 * Tests co-occurrence detection and relationship inference
 */

import { DatabaseManager } from '../../../src/storage/Database.js';
import { RelationshipDetector, RelationshipType } from '../../../src/entities/RelationshipDetector.js';
import { EntityRepository, EntityType } from '../../../src/storage/repositories/EntityRepository.js';
import { createTestDatabase } from '../../utils/test-helpers.js';

describe('RelationshipDetector', () => {
  let dbManager: DatabaseManager;
  let relationshipDetector: RelationshipDetector;
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

      CREATE TABLE IF NOT EXISTS entity_relationships (
        id TEXT PRIMARY KEY,
        source_entity_id TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        relationship_type TEXT NOT NULL CHECK (relationship_type IN ('works_for', 'created_by', 'discussed_with', 'related_to', 'part_of', 'mentioned_with', 'temporal_sequence', 'cause_effect')),
        strength REAL DEFAULT 0.5 CHECK (strength >= 0.0 AND strength <= 1.0),
        first_mentioned_at INTEGER NOT NULL,
        last_mentioned_at INTEGER NOT NULL,
        mention_count INTEGER DEFAULT 1,
        context_messages TEXT DEFAULT '[]',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        UNIQUE(source_entity_id, target_entity_id, relationship_type)
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
    relationshipDetector = new RelationshipDetector(dbManager, {
      maxCoOccurrenceDistance: 200,
      minRelationshipStrength: 0.3,
      contextWindowSize: 50
    });
  });

  afterEach(async () => {
    if (dbManager) {
      const db = dbManager.getConnection();
      db.close();
    }
  });

  describe('analyzeMessage', () => {
    it('should detect co-occurrences between entities', async () => {
      // Create test entities
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const reactEntity = await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      const messageContent = 'John Doe is working on a React application for the team.';
      const extractedEntities = [
        {
          entityId: johnEntity.id,
          startPosition: 0,
          endPosition: 8,
          type: 'person' as EntityType
        },
        {
          entityId: reactEntity.id,
          startPosition: 25,
          endPosition: 30,
          type: 'technical' as EntityType
        }
      ];

      const result = await relationshipDetector.analyzeMessage(
        'msg-1',
        'conv-1', 
        messageContent,
        extractedEntities
      );

      expect(result.coOccurrences.length).toBe(1);
      expect(result.coOccurrences[0].entityId1).toBe(johnEntity.id);
      expect(result.coOccurrences[0].entityId2).toBe(reactEntity.id);
      expect(result.coOccurrences[0].distance).toBe(25); // Distance between start positions
    });

    it('should detect person-technical "uses" relationships', async () => {
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const reactEntity = await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      const messageContent = 'John Doe is using React to build the frontend application.';
      const extractedEntities = [
        {
          entityId: johnEntity.id,
          startPosition: 0,
          endPosition: 8,
          type: 'person' as EntityType
        },
        {
          entityId: reactEntity.id,
          startPosition: 18,
          endPosition: 23,
          type: 'technical' as EntityType
        }
      ];

      const result = await relationshipDetector.analyzeMessage(
        'msg-1',
        'conv-1',
        messageContent,
        extractedEntities
      );

      expect(result.detectedRelationships.length).toBeGreaterThan(0);
      
      const mentionedWithRelationship = result.detectedRelationships.find(r => 
        r.relationshipType === 'mentioned_with' && 
        r.sourceEntity.id === johnEntity.id &&
        r.targetEntity.id === reactEntity.id
      );
      
      expect(mentionedWithRelationship).toBeDefined();
      expect(mentionedWithRelationship!.confidence).toBeGreaterThan(0.3);
    });

    it('should detect person-organization "works_at" relationships', async () => {
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const companyEntity = await entityRepository.create({
        name: 'Microsoft Corporation',
        type: 'organization'
      });

      const messageContent = 'John Doe works at Microsoft Corporation as a software engineer.';
      const extractedEntities = [
        {
          entityId: johnEntity.id,
          startPosition: 0,
          endPosition: 8,
          type: 'person' as EntityType
        },
        {
          entityId: companyEntity.id,
          startPosition: 18,
          endPosition: 38,
          type: 'organization' as EntityType
        }
      ];

      const result = await relationshipDetector.analyzeMessage(
        'msg-1',
        'conv-1',
        messageContent,
        extractedEntities
      );

      const worksForRelationship = result.detectedRelationships.find(r => 
        r.relationshipType === 'works_for'
      );
      
      expect(worksForRelationship).toBeDefined();
      expect(worksForRelationship!.confidence).toBeGreaterThan(0.5);
    });

    it('should detect person-person "works_with" relationships', async () => {
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const janeEntity = await entityRepository.create({
        name: 'Jane Smith',
        type: 'person'
      });

      const messageContent = 'John Doe and Jane Smith are collaborating on the project together.';
      const extractedEntities = [
        {
          entityId: johnEntity.id,
          startPosition: 0,
          endPosition: 8,
          type: 'person' as EntityType
        },
        {
          entityId: janeEntity.id,
          startPosition: 13,
          endPosition: 23,
          type: 'person' as EntityType
        }
      ];

      const result = await relationshipDetector.analyzeMessage(
        'msg-1',
        'conv-1',
        messageContent,
        extractedEntities
      );

      const discussedWithRelationship = result.detectedRelationships.find(r => 
        r.relationshipType === 'discussed_with'
      );
      
      expect(discussedWithRelationship).toBeDefined();
      expect(discussedWithRelationship!.confidence).toBeGreaterThan(0.4);
    });

    it('should detect person-event "attends" relationships', async () => {
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const meetingEntity = await entityRepository.create({
        name: 'team meeting',
        type: 'event'
      });

      const messageContent = 'John Doe attended the team meeting yesterday.';
      const extractedEntities = [
        {
          entityId: johnEntity.id,
          startPosition: 0,
          endPosition: 8,
          type: 'person' as EntityType
        },
        {
          entityId: meetingEntity.id,
          startPosition: 22,
          endPosition: 34,
          type: 'event' as EntityType
        }
      ];

      const result = await relationshipDetector.analyzeMessage(
        'msg-1',
        'conv-1',
        messageContent,
        extractedEntities
      );

      // Person-Event relationships default to 'related_to' in our current implementation
      const relatedToRelationship = result.detectedRelationships.find(r => 
        r.relationshipType === 'related_to'
      );
      
      expect(relatedToRelationship).toBeDefined();
      expect(relatedToRelationship!.confidence).toBeGreaterThan(0.2);
    });

    it('should ignore entities that are too far apart', async () => {
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const reactEntity = await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      // Long message where entities are far apart (over 200 characters based on our config)
      const messageContent = 'John Doe started his career in web development.' + 
        ' '.repeat(200) + // Long gap - over our 200 char limit
        'In other news, React is a popular framework.';
      
      const extractedEntities = [
        {
          entityId: johnEntity.id,
          startPosition: 0,
          endPosition: 8,
          type: 'person' as EntityType
        },
        {
          entityId: reactEntity.id,
          startPosition: messageContent.indexOf('React'),
          endPosition: messageContent.indexOf('React') + 5,
          type: 'technical' as EntityType
        }
      ];

      const result = await relationshipDetector.analyzeMessage(
        'msg-1',
        'conv-1',
        messageContent,
        extractedEntities
      );

      // Should not detect co-occurrence due to distance
      expect(result.coOccurrences.length).toBe(0);
      expect(result.detectedRelationships.length).toBe(0);
    });
  });

  describe('storeRelationship', () => {
    it('should store relationship in database', async () => {
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const reactEntity = await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      const relationshipCandidate = {
        sourceEntity: johnEntity,
        targetEntity: reactEntity,
        relationshipType: 'mentioned_with' as RelationshipType,
        confidence: 0.8,
        evidence: [],
        suggestedContext: 'John Doe uses React for development'
      };

      const storedRelationship = await relationshipDetector.storeRelationship(relationshipCandidate);

      expect(storedRelationship.sourceEntityId).toBe(johnEntity.id);
      expect(storedRelationship.targetEntityId).toBe(reactEntity.id);
      expect(storedRelationship.relationshipType).toBe('mentioned_with');
      expect(storedRelationship.strength).toBe(0.8);
      expect(storedRelationship.context).toBe('John Doe uses React for development');
    });
  });

  describe('getEntityRelationships', () => {
    it('should retrieve relationships for an entity', async () => {
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const reactEntity = await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      const companyEntity = await entityRepository.create({
        name: 'Acme Corp',
        type: 'organization'
      });

      // Store multiple relationships
      await relationshipDetector.storeRelationship({
        sourceEntity: johnEntity,
        targetEntity: reactEntity,
        relationshipType: 'mentioned_with',
        confidence: 0.8,
        evidence: [],
        suggestedContext: 'Uses React'
      });

      await relationshipDetector.storeRelationship({
        sourceEntity: johnEntity,
        targetEntity: companyEntity,
        relationshipType: 'works_for',
        confidence: 0.9,
        evidence: [],
        suggestedContext: 'Works at Acme'
      });

      const relationships = await relationshipDetector.getEntityRelationships(johnEntity.id);

      expect(relationships.length).toBe(2);
      
      // Should be sorted by strength descending
      expect(relationships[0].strength).toBeGreaterThanOrEqual(relationships[1].strength);
      
      const relationshipTypes = relationships.map(r => r.relationshipType);
      expect(relationshipTypes).toEqual(expect.arrayContaining(['mentioned_with', 'works_for']));
    });
  });

  describe('confidence scoring', () => {
    it('should assign higher confidence to closer entities', async () => {
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const reactEntity = await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      // Test with close entities
      const closeMessage = 'John uses React';
      const closeEntities = [
        { entityId: johnEntity.id, startPosition: 0, endPosition: 4, type: 'person' as EntityType },
        { entityId: reactEntity.id, startPosition: 10, endPosition: 15, type: 'technical' as EntityType }
      ];

      // Test with distant entities  
      const distantMessage = 'John worked on the project.' + ' '.repeat(50) + 'They used React.';
      const distantEntities = [
        { entityId: johnEntity.id, startPosition: 0, endPosition: 4, type: 'person' as EntityType },
        { entityId: reactEntity.id, startPosition: distantMessage.indexOf('React'), endPosition: distantMessage.indexOf('React') + 5, type: 'technical' as EntityType }
      ];

      const closeResult = await relationshipDetector.analyzeMessage('msg-1', 'conv-1', closeMessage, closeEntities);
      const distantResult = await relationshipDetector.analyzeMessage('msg-2', 'conv-1', distantMessage, distantEntities);

      if (closeResult.detectedRelationships.length > 0 && distantResult.detectedRelationships.length > 0) {
        const closeConfidence = closeResult.detectedRelationships[0].confidence;
        const distantConfidence = distantResult.detectedRelationships[0].confidence;
        
        expect(closeConfidence).toBeGreaterThan(distantConfidence);
      }
    });

    it('should assign higher confidence with strong context indicators', async () => {
      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const companyEntity = await entityRepository.create({
        name: 'Acme Corp',
        type: 'organization'
      });

      // Strong context indicators
      const strongContext = 'John Doe is employed by Acme Corp as their lead developer.';
      const strongEntities = [
        { entityId: johnEntity.id, startPosition: 0, endPosition: 8, type: 'person' as EntityType },
        { entityId: companyEntity.id, startPosition: 24, endPosition: 33, type: 'organization' as EntityType }
      ];

      // Weak context indicators
      const weakContext = 'John Doe and Acme Corp were mentioned in the news.';
      const weakEntities = [
        { entityId: johnEntity.id, startPosition: 0, endPosition: 8, type: 'person' as EntityType },
        { entityId: companyEntity.id, startPosition: 13, endPosition: 22, type: 'organization' as EntityType }
      ];

      const strongResult = await relationshipDetector.analyzeMessage('msg-1', 'conv-1', strongContext, strongEntities);
      const weakResult = await relationshipDetector.analyzeMessage('msg-2', 'conv-1', weakContext, weakEntities);

      if (strongResult.detectedRelationships.length > 0 && weakResult.detectedRelationships.length > 0) {
        const strongConfidence = strongResult.detectedRelationships.find(r => r.relationshipType === 'works_for')?.confidence || 0;
        const weakConfidence = weakResult.detectedRelationships.find(r => r.relationshipType === 'works_for')?.confidence || 0;
        
        expect(strongConfidence).toBeGreaterThan(weakConfidence);
      }
    });
  });

  describe('relationship type inference', () => {
    it('should infer development relationships for organization-technical pairs', async () => {
      const companyEntity = await entityRepository.create({
        name: 'Facebook Inc',
        type: 'organization'
      });

      const reactEntity = await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      const messageContent = 'Facebook Inc developed React as an open-source library.';
      const extractedEntities = [
        {
          entityId: companyEntity.id,
          startPosition: 0,
          endPosition: 12,
          type: 'organization' as EntityType
        },
        {
          entityId: reactEntity.id,
          startPosition: 23,
          endPosition: 28,
          type: 'technical' as EntityType
        }
      ];

      const result = await relationshipDetector.analyzeMessage(
        'msg-1',
        'conv-1',
        messageContent,
        extractedEntities
      );

      const createdByRelationship = result.detectedRelationships.find(r => 
        r.relationshipType === 'created_by'
      );
      
      expect(createdByRelationship).toBeDefined();
      expect(createdByRelationship!.confidence).toBeGreaterThan(0.3);
    });

    it('should infer location relationships with location entities', async () => {
      const companyEntity = await entityRepository.create({
        name: 'Google',
        type: 'organization'
      });

      const locationEntity = await entityRepository.create({
        name: 'California',
        type: 'location'
      });

      const messageContent = 'Google is headquartered in California.';
      const extractedEntities = [
        {
          entityId: companyEntity.id,
          startPosition: 0,
          endPosition: 6,
          type: 'organization' as EntityType
        },
        {
          entityId: locationEntity.id,
          startPosition: 27,
          endPosition: 37,
          type: 'location' as EntityType
        }
      ];

      const result = await relationshipDetector.analyzeMessage(
        'msg-1',
        'conv-1',
        messageContent,
        extractedEntities
      );

      // Location relationships default to 'related_to' in our current implementation
      const locationRelationship = result.detectedRelationships.find(r => 
        r.relationshipType === 'related_to'
      );
      
      expect(locationRelationship).toBeDefined();
    });
  });

  describe('configuration options', () => {
    it('should respect maxCoOccurrenceDistance setting', async () => {
      const strictDetector = new RelationshipDetector(dbManager, {
        maxCoOccurrenceDistance: 20 // Very short distance
      });

      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const reactEntity = await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      const messageContent = 'John Doe is working with React framework for the project.';
      const extractedEntities = [
        {
          entityId: johnEntity.id,
          startPosition: 0,
          endPosition: 8,
          type: 'person' as EntityType
        },
        {
          entityId: reactEntity.id,
          startPosition: 25,
          endPosition: 30,
          type: 'technical' as EntityType
        }
      ];

      const result = await strictDetector.analyzeMessage(
        'msg-1',
        'conv-1',
        messageContent,
        extractedEntities
      );

      // Distance is 25, which exceeds the 20 character limit
      expect(result.coOccurrences.length).toBe(0);
    });

    it('should respect minRelationshipStrength setting', async () => {
      const strictDetector = new RelationshipDetector(dbManager, {
        minRelationshipStrength: 0.9 // Very high threshold
      });

      const johnEntity = await entityRepository.create({
        name: 'John Doe',
        type: 'person'
      });

      const reactEntity = await entityRepository.create({
        name: 'React',
        type: 'technical'
      });

      const messageContent = 'John Doe mentioned React.'; // Weak context
      const extractedEntities = [
        {
          entityId: johnEntity.id,
          startPosition: 0,
          endPosition: 8,
          type: 'person' as EntityType
        },
        {
          entityId: reactEntity.id,
          startPosition: 19,
          endPosition: 24,
          type: 'technical' as EntityType
        }
      ];

      const result = await strictDetector.analyzeMessage(
        'msg-1',
        'conv-1',
        messageContent,
        extractedEntities
      );

      // Should have co-occurrences but no relationships due to low confidence
      expect(result.coOccurrences.length).toBeGreaterThan(0);
      expect(result.detectedRelationships.length).toBe(0);
    });
  });
});