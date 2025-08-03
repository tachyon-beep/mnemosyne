/**
 * Conversation Repository Test Suite
 * 
 * Tests the ConversationRepository class functionality including:
 * - CRUD operations for conversations
 * - Pagination and filtering
 * - Statistics and metadata management
 * - Cascade operations
 * - Error handling and validation
 */

import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { DatabaseManager } from '../../../../src/storage/Database';
import { ConversationRepository } from '../../../../src/storage/repositories/ConversationRepository';
import { MessageRepository } from '../../../../src/storage/repositories/MessageRepository';
import { Conversation } from '../../../../src/types/interfaces';

describe('ConversationRepository', () => {
  let dbManager: DatabaseManager;
  let conversationRepo: ConversationRepository;
  let messageRepo: MessageRepository;
  let tempDbPath: string;

  beforeEach(async () => {
    // Create temporary database for testing
    tempDbPath = `:memory:`; // Use in-memory database for tests
    dbManager = new DatabaseManager({ databasePath: tempDbPath });
    await dbManager.initialize();
    conversationRepo = new ConversationRepository(dbManager);
    messageRepo = new MessageRepository(dbManager);
  });

  afterEach(async () => {
    conversationRepo.cleanup();
    messageRepo.cleanup();
    dbManager.close();
  });

  describe('Create Operations', () => {
    it('should create a conversation with auto-generated ID', async () => {
      const params = {
        title: 'Test Conversation',
        metadata: { tag: 'test' }
      };

      const conversation = await conversationRepo.create(params);

      expect(conversation.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
      expect(conversation.title).toBe('Test Conversation');
      expect(conversation.metadata).toEqual({ tag: 'test' });
      expect(conversation.createdAt).toBeDefined();
      expect(conversation.updatedAt).toBe(conversation.createdAt);
    });

    it('should create a conversation with provided ID', async () => {
      const customId = '550e8400-e29b-41d4-a716-446655440000';
      const params = {
        id: customId,
        title: 'Test Conversation'
      };

      const conversation = await conversationRepo.create(params);

      expect(conversation.id).toBe(customId);
      expect(conversation.title).toBe('Test Conversation');
    });

    it('should create a conversation without title', async () => {
      const params = {
        metadata: { type: 'untitled' }
      };

      const conversation = await conversationRepo.create(params);

      expect(conversation.title).toBeUndefined();
      expect(conversation.metadata).toEqual({ type: 'untitled' });
    });

    it('should handle duplicate ID error', async () => {
      const customId = '550e8400-e29b-41d4-a716-446655440000';
      
      await conversationRepo.create({ id: customId, title: 'First' });
      
      await expect(conversationRepo.create({ id: customId, title: 'Second' }))
        .rejects.toThrow('Conversation already exists');
    });
  });

  describe('Read Operations', () => {
    let testConversation: Conversation;

    beforeEach(async () => {
      testConversation = await conversationRepo.create({
        title: 'Test Conversation',
        metadata: { tag: 'test' }
      });
    });

    it('should find conversation by ID', async () => {
      const found = await conversationRepo.findById(testConversation.id);

      expect(found).toBeDefined();
      expect(found!.id).toBe(testConversation.id);
      expect(found!.title).toBe('Test Conversation');
      expect(found!.metadata).toEqual({ tag: 'test' });
    });

    it('should return null for non-existent ID', async () => {
      const found = await conversationRepo.findById('550e8400-e29b-41d4-a716-446655440000');
      expect(found).toBeNull();
    });

    it('should return null for invalid UUID', async () => {
      const found = await conversationRepo.findById('invalid-uuid');
      expect(found).toBeNull();
    });

    it('should find all conversations with pagination', async () => {
      // Create additional conversations with small delays to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      await conversationRepo.create({ title: 'Conversation 2' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await conversationRepo.create({ title: 'Conversation 3' });

      const result = await conversationRepo.findAll(2, 0, 'created_at', 'ASC');

      expect(result.data).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.data[0].title).toBe('Test Conversation'); // First created
    });

    it('should find conversations by title', async () => {
      await conversationRepo.create({ title: 'Important Meeting' });
      await conversationRepo.create({ title: 'Daily Standup' });

      const result = await conversationRepo.findByTitle('Meeting', 10, 0);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Important Meeting');
    });

    it('should find conversations by date range', async () => {
      const startDate = Date.now() - 86400000; // 24 hours ago
      const endDate = Date.now() + 86400000;   // 24 hours from now

      const result = await conversationRepo.findByDateRange(startDate, endDate, 10, 0);

      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0].id).toBe(testConversation.id);
    });

    it('should check if conversation exists', async () => {
      const exists = await conversationRepo.exists(testConversation.id);
      const notExists = await conversationRepo.exists('550e8400-e29b-41d4-a716-446655440000');

      expect(exists).toBe(true);
      expect(notExists).toBe(false);
    });

    it('should count conversations', async () => {
      await conversationRepo.create({ title: 'Conversation 2' });
      
      const count = await conversationRepo.count();
      expect(count).toBe(2);
    });
  });

  describe('Update Operations', () => {
    let testConversation: Conversation;

    beforeEach(async () => {
      testConversation = await conversationRepo.create({
        title: 'Original Title',
        metadata: { tag: 'original' }
      });
    });

    it('should update conversation title', async () => {
      // Add a small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 1));
      
      const updated = await conversationRepo.update(testConversation.id, {
        title: 'Updated Title'
      });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.metadata).toEqual({ tag: 'original' }); // Unchanged
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(testConversation.updatedAt);
    });

    it('should update conversation metadata', async () => {
      const updated = await conversationRepo.update(testConversation.id, {
        metadata: { tag: 'updated', priority: 'high' }
      });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Original Title'); // Unchanged
      expect(updated!.metadata).toEqual({ tag: 'updated', priority: 'high' });
    });

    it('should not change title when updating with undefined', async () => {
      const updated = await conversationRepo.update(testConversation.id, {
        title: undefined
      });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Original Title'); // Unchanged because undefined means "don't change"
    });

    it('should return null for non-existent conversation', async () => {
      const updated = await conversationRepo.update('550e8400-e29b-41d4-a716-446655440000', {
        title: 'New Title'
      });

      expect(updated).toBeNull();
    });

    it('should return null for invalid UUID', async () => {
      const updated = await conversationRepo.update('invalid-uuid', {
        title: 'New Title'
      });

      expect(updated).toBeNull();
    });
  });

  describe('Delete Operations', () => {
    let testConversation: Conversation;

    beforeEach(async () => {
      testConversation = await conversationRepo.create({
        title: 'Test Conversation'
      });
    });

    it('should delete conversation without messages', async () => {
      const deleted = await conversationRepo.delete(testConversation.id);

      expect(deleted).toBe(true);
      
      const found = await conversationRepo.findById(testConversation.id);
      expect(found).toBeNull();
    });

    it('should delete conversation with messages (cascade)', async () => {
      // Add messages to the conversation
      const message1 = await messageRepo.create({
        conversationId: testConversation.id,
        role: 'user',
        content: 'Hello'
      });
      const message2 = await messageRepo.create({
        conversationId: testConversation.id,
        role: 'assistant',
        content: 'Hi there!'
      });

      const deleted = await conversationRepo.delete(testConversation.id);

      expect(deleted).toBe(true);
      
      // Verify conversation is deleted
      const foundConversation = await conversationRepo.findById(testConversation.id);
      expect(foundConversation).toBeNull();
      
      // Verify messages are also deleted
      const foundMessage1 = await messageRepo.findById(message1.id);
      const foundMessage2 = await messageRepo.findById(message2.id);
      expect(foundMessage1).toBeNull();
      expect(foundMessage2).toBeNull();
    });

    it('should return false for non-existent conversation', async () => {
      const deleted = await conversationRepo.delete('550e8400-e29b-41d4-a716-446655440000');
      expect(deleted).toBe(false);
    });

    it('should return false for invalid UUID', async () => {
      const deleted = await conversationRepo.delete('invalid-uuid');
      expect(deleted).toBe(false);
    });
  });

  describe('Statistics Operations', () => {
    let testConversation: Conversation;

    beforeEach(async () => {
      testConversation = await conversationRepo.create({
        title: 'Test Conversation'
      });
    });

    it('should get stats for conversation without messages', async () => {
      const stats = await conversationRepo.getStats(testConversation.id);

      expect(stats).toBeDefined();
      expect(stats!.messageCount).toBe(0);
      expect(stats!.firstMessageAt).toBeUndefined();
      expect(stats!.lastMessageAt).toBeUndefined();
      expect(stats!.participantRoles).toEqual([]);
    });

    it('should get stats for conversation with messages', async () => {
      // Create timestamp variables for potential future use
      Date.now() - 1000; // message1 timestamp
      Date.now(); // message2 timestamp
      
      await messageRepo.create({
        conversationId: testConversation.id,
        role: 'user',
        content: 'Hello'
      });
      
      await messageRepo.create({
        conversationId: testConversation.id,
        role: 'assistant',
        content: 'Hi there!'
      });

      const stats = await conversationRepo.getStats(testConversation.id);

      expect(stats).toBeDefined();
      expect(stats!.messageCount).toBe(2);
      expect(stats!.participantRoles).toEqual(['assistant', 'user']);
      expect(stats!.firstMessageAt).toBeDefined();
      expect(stats!.lastMessageAt).toBeDefined();
    });

    it('should return null for non-existent conversation', async () => {
      const stats = await conversationRepo.getStats('550e8400-e29b-41d4-a716-446655440000');
      expect(stats).toBeNull();
    });

    it('should return null for invalid UUID', async () => {
      const stats = await conversationRepo.getStats('invalid-uuid');
      expect(stats).toBeNull();
    });
  });

  describe('Validation and Edge Cases', () => {
    it('should handle empty metadata correctly', async () => {
      const conversation = await conversationRepo.create({});

      expect(conversation.metadata).toEqual({});
      expect(conversation.title).toBeUndefined();
    });

    it('should validate pagination parameters', async () => {
      await conversationRepo.create({ title: 'Test' });

      // Test invalid pagination values are corrected
      const result = await conversationRepo.findAll(-1, -5);
      
      expect(result.data).toBeDefined();
      // Should use default/corrected values without throwing
    });

    it('should handle invalid orderBy parameter', async () => {
      await expect(conversationRepo.findAll(10, 0, 'invalid_column' as any))
        .rejects.toThrow('Invalid orderBy parameter');
    });

    it('should handle invalid orderDir parameter', async () => {
      await expect(conversationRepo.findAll(10, 0, 'created_at', 'INVALID' as any))
        .rejects.toThrow('Invalid orderDir parameter');
    });

    it('should handle special characters in title search', async () => {
      await conversationRepo.create({ title: "Test with 'quotes' and \"double quotes\"" });
      
      const result = await conversationRepo.findByTitle('quotes');
      expect(result.data).toHaveLength(1);
    });
  });

  describe('Concurrency and Transactions', () => {
    it('should handle concurrent conversation creation', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        conversationRepo.create({ title: `Conversation ${i}` })
      );

      const conversations = await Promise.all(promises);
      
      expect(conversations).toHaveLength(10);
      
      // All IDs should be unique
      const ids = conversations.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(10);
    });

    it('should maintain consistency during cascade delete', async () => {
      // Create conversation with messages
      const conversation = await conversationRepo.create({ title: 'Test' });
      await messageRepo.create({
        conversationId: conversation.id,
        role: 'user',
        content: 'Message 1'
      });
      await messageRepo.create({
        conversationId: conversation.id,
        role: 'user',
        content: 'Message 2'
      });

      // Delete should be atomic
      await conversationRepo.delete(conversation.id);

      // Verify everything is cleaned up
      const messageCount = await messageRepo.countByConversation(conversation.id);
      expect(messageCount).toBe(0);
    });
  });
});