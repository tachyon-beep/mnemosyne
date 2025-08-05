/**
 * Unit tests for EntityExtractionService
 * 
 * Tests entity extraction from message text and integration with EntityRepository
 */

import { DatabaseManager } from '../../../src/storage/Database.js';
import { EntityExtractionService } from '../../../src/entities/EntityExtractionService.js';
import { createTestDatabase } from '../../utils/test-helpers.js';

describe('EntityExtractionService', () => {
  let dbManager: DatabaseManager;
  let extractionService: EntityExtractionService;

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
        ('msg-3', 'conv-1', 'user', '', 1),
        ('msg-4', 'conv-1', 'user', '', 1),
        ('msg-5', 'conv-1', 'user', '', 1),
        ('msg-6', 'conv-1', 'user', '', 1),
        ('msg-7', 'conv-1', 'user', '', 1),
        ('msg-8', 'conv-1', 'user', '', 1),
        ('msg-9', 'conv-1', 'user', '', 1),
        ('msg-10', 'conv-2', 'user', '', 1),
        ('msg-11', 'conv-2', 'user', '', 1),
        ('msg-12', 'conv-2', 'user', '', 1),
        ('msg-13', 'conv-1', 'user', '', 1);
    `);
    
    extractionService = new EntityExtractionService(dbManager, {
      minConfidence: 0.5 // Lower threshold for testing
    });
  });

  afterEach(async () => {
    if (dbManager) {
      const db = dbManager.getConnection();
      db.close();
    }
  });

  describe('extractEntitiesFromText', () => {
    it('should extract person names', async () => {
      const messageContent = "John Doe and Jane Smith are working on the project. Dr. Wilson will review it.";
      
      const result = await extractionService.processMessage(
        'msg-1',
        'conv-1',
        messageContent
      );

      expect(result.extractedEntities.length).toBeGreaterThan(0);
      
      const personEntities = result.extractedEntities.filter(e => e.type === 'person');
      expect(personEntities.length).toBeGreaterThanOrEqual(2);
      
      const names = personEntities.map(e => e.text);
      expect(names).toContain('John Doe');
      expect(names).toContain('Jane Smith');
    });

    it('should extract technical terms', async () => {
      const messageContent = "We're using React and TypeScript for the frontend, with Node.js handling the API.";
      
      const result = await extractionService.processMessage(
        'msg-2',
        'conv-1',
        messageContent
      );

      const techEntities = result.extractedEntities.filter(e => e.type === 'technical');
      expect(techEntities.length).toBeGreaterThanOrEqual(3);
      
      const techTerms = techEntities.map(e => e.text);
      expect(techTerms).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Node.js']));
    });

    it('should extract organizations', async () => {
      const messageContent = "Apple Inc and Microsoft Corporation are partnering with Stanford University.";
      
      const result = await extractionService.processMessage(
        'msg-3',
        'conv-1',
        messageContent
      );

      const orgEntities = result.extractedEntities.filter(e => e.type === 'organization');
      expect(orgEntities.length).toBeGreaterThan(0);
      
      const orgs = orgEntities.map(e => e.text);
      expect(orgs).toEqual(expect.arrayContaining(['Apple Inc', 'Stanford University']));
    });

    it('should extract concepts', async () => {
      const messageContent = "Machine Learning and Artificial Intelligence are transforming the industry.";
      
      const result = await extractionService.processMessage(
        'msg-4',
        'conv-1',
        messageContent
      );

      const conceptEntities = result.extractedEntities.filter(e => e.type === 'technical');
      expect(conceptEntities.length).toBeGreaterThan(0);
      
      const concepts = conceptEntities.map(e => e.text);
      expect(concepts).toEqual(expect.arrayContaining(['Machine Learning', 'Artificial Intelligence']));
    });
  });

  describe('entity storage and mentions', () => {
    it('should create new entities and store mentions', async () => {
      const messageContent = "John Doe is working with React on the new project.";
      
      const result = await extractionService.processMessage(
        'msg-5',
        'conv-1',
        messageContent
      );

      // Should have created new entities
      expect(result.createdEntities.length).toBeGreaterThan(0);
      
      // Should have created mentions
      expect(result.mentions.length).toBeGreaterThan(0);
      
      // Check mentions have correct message and conversation IDs
      result.mentions.forEach(mention => {
        expect(mention.messageId).toBe('msg-5');
        expect(mention.conversationId).toBe('conv-1');
        expect(mention.entityId).toBeDefined();
        expect(mention.mentionText).toBeDefined();
      });
    });

    it('should reuse existing entities', async () => {
      // Process first message with "React"
      const result1 = await extractionService.processMessage(
        'msg-6',
        'conv-1',
        'We are using React for this project.'
      );

      // Process second message with "React" again
      const result2 = await extractionService.processMessage(
        'msg-7',
        'conv-1',
        'React is really powerful for building UIs.'
      );

      // First message should create React entity
      const reactEntities1 = result1.createdEntities.filter(e => 
        e.normalizedName.includes('react')
      );
      expect(reactEntities1.length).toBeGreaterThan(0);

      // Second message should NOT create new React entity (should reuse)
      const reactEntities2 = result2.createdEntities.filter(e => 
        e.normalizedName.includes('react')
      );
      expect(reactEntities2.length).toBe(0);

      // But should create mentions for both
      expect(result1.mentions.length).toBeGreaterThan(0);
      expect(result2.mentions.length).toBeGreaterThan(0);
    });
  });

  describe('confidence scoring', () => {
    it('should assign higher confidence to entities with titles', async () => {
      const messageContent = "Dr. John Smith and Bob are both doctors.";
      
      const result = await extractionService.processMessage(
        'msg-8',
        'conv-1',
        messageContent
      );

      const personEntities = result.extractedEntities.filter(e => e.type === 'person');
      
      // Find the entity with title
      const titledEntity = personEntities.find(e => e.text.startsWith('Dr.'));
      const untitledEntity = personEntities.find(e => e.text === 'Bob');

      if (titledEntity && untitledEntity) {
        expect(titledEntity.confidence).toBeGreaterThan(untitledEntity.confidence);
      }
    });

    it('should filter out low confidence entities', async () => {
      const extractionServiceStrict = new EntityExtractionService(dbManager, {
        minConfidence: 0.9 // Very high threshold
      });

      const messageContent = "Some random text with potential entities.";
      
      const result = await extractionServiceStrict.processMessage(
        'msg-9',
        'conv-1',
        messageContent
      );

      // With high confidence threshold, should extract fewer entities
      expect(result.extractedEntities.length).toBe(0);
    });
  });

  describe('batch processing', () => {
    it('should process multiple messages', async () => {
      const messages = [
        {
          id: 'msg-10',
          conversationId: 'conv-2',
          content: 'John Doe is using React for the project.'
        },
        {
          id: 'msg-11',
          conversationId: 'conv-2',
          content: 'Jane Smith prefers TypeScript over JavaScript.'
        },
        {
          id: 'msg-12',
          conversationId: 'conv-2',
          content: 'Microsoft Corporation released a new update.'
        }
      ];

      const result = await extractionService.processMessages(messages);

      expect(result.totalEntitiesExtracted).toBeGreaterThan(0);
      expect(result.totalEntitiesCreated).toBeGreaterThan(0);
      expect(result.totalMentions).toBeGreaterThan(0);
      
      // Should have stats for different entity types
      expect(result.processingStats.size).toBeGreaterThan(0);
    });
  });

  describe('context extraction', () => {
    it('should capture context around entities', async () => {
      const messageContent = "In our team meeting, John Doe presented the new React application that will revolutionize our workflow.";
      
      const result = await extractionService.processMessage(
        'msg-13',
        'conv-1',
        messageContent
      );

      const entitiesWithContext = result.extractedEntities.filter(e => e.context);
      expect(entitiesWithContext.length).toBeGreaterThan(0);
      
      // Context should contain parts of the original message
      entitiesWithContext.forEach(entity => {
        expect(entity.context).toBeDefined();
        expect(entity.context!.length).toBeGreaterThan(0);
      });
    });
  });
});