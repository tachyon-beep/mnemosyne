/**
 * FTS (Full-Text Search) Integration Tests
 * 
 * End-to-end tests that validate FTS functionality works correctly
 * with real database operations and search indexing.
 * 
 * These tests ensure that:
 * - Messages are immediately searchable after being saved
 * - FTS triggers work correctly for insert/update/delete operations
 * - Search results match expected content
 * - FTS index consistency is maintained
 */

import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { DatabaseManager } from '../../src/storage/Database';
import { MessageRepository } from '../../src/storage/repositories/MessageRepository';
import { ConversationRepository } from '../../src/storage/repositories/ConversationRepository';
import { SaveMessageTool } from '../../src/tools/SaveMessageTool';
import { SearchMessagesTool } from '../../src/tools/SearchMessagesTool';
import { SearchEngine } from '../../src/search/SearchEngine';
import { Conversation } from '../../src/types/interfaces';
import { BaseTool } from '../../src/tools/BaseTool';

describe('FTS Integration Tests', () => {
  let dbManager: DatabaseManager;
  let messageRepo: MessageRepository;
  let conversationRepo: ConversationRepository;
  let searchEngine: SearchEngine;
  let saveMessageTool: SaveMessageTool;
  let searchMessagesTool: SearchMessagesTool;
  let testConversation: Conversation;

  beforeEach(async () => {
    // Create in-memory database for testing
    dbManager = new DatabaseManager({ databasePath: ':memory:' });
    await dbManager.initialize();
    
    messageRepo = new MessageRepository(dbManager);
    conversationRepo = new ConversationRepository(dbManager);
    searchEngine = new SearchEngine(messageRepo);
    
    // Initialize tools with real dependencies
    const saveMessageDependencies = {
      conversationRepository: conversationRepo,
      messageRepository: messageRepo,
      searchEngine: searchEngine
    };
    
    const searchMessagesDependencies = {
      searchEngine: searchEngine
    };
    
    saveMessageTool = new SaveMessageTool(saveMessageDependencies);
    searchMessagesTool = new SearchMessagesTool(searchMessagesDependencies);
    
    // Create a test conversation
    testConversation = await conversationRepo.create({
      title: 'FTS Integration Test Conversation'
    });
  });

  afterEach(async () => {
    messageRepo.cleanup();
    conversationRepo.cleanup();
    searchEngine.destroy();
    dbManager.close();
  });

  describe('End-to-End Message Save and Search', () => {
    it('should save message and make it immediately searchable', async () => {
      // Create a message directly using repository (like our working debug test)
      const message = await messageRepo.create({
        conversationId: testConversation.id,
        role: 'user',
        content: 'How do I implement a quicksort algorithm in Python?'
      });

      // Wait for FTS triggers to process
      await new Promise(resolve => setTimeout(resolve, 200));

      // Test direct repository search first
      const repoSearchResult = await messageRepo.search({
        query: 'quicksort algorithm',
        limit: 10
      });

      expect(repoSearchResult.data.length).toBe(1);
      expect(repoSearchResult.data[0].message.id).toBe(message.id);

      // Now test via SearchMessagesTool
      const context = BaseTool.createContext();
      const searchResult = await searchMessagesTool.execute({
        query: 'quicksort algorithm',
        limit: 10
      }, context);

      expect(searchResult.isError).toBeUndefined();
      const searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.success).toBe(true);
      expect(searchResponse.data.results.length).toBe(1);
      expect(searchResponse.data.results[0].message.id).toBe(message.id);
      expect(searchResponse.data.results[0].message.content).toContain('quicksort algorithm');
    });

    it('should support multiple search terms and ranking', async () => {
      const context = BaseTool.createContext();
      
      // Create multiple messages with different relevance
      const messages = [
        { role: 'user', content: 'What is machine learning and how does it work?' },
        { role: 'assistant', content: 'Machine learning is a branch of artificial intelligence that enables computers to learn without explicit programming.' },
        { role: 'user', content: 'Can you explain deep learning neural networks?' },
        { role: 'assistant', content: 'Deep learning uses neural networks with multiple layers to model complex patterns in data.' },
        { role: 'user', content: 'How do I cook pasta?' },
        { role: 'assistant', content: 'To cook pasta, boil water in a large pot, add salt, then add the pasta and cook according to package directions.' }
      ];

      // Save all messages
      const savedMessages = [];
      for (const msg of messages) {
        const result = await saveMessageTool.execute({
          conversationId: testConversation.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }, context);
        
        const response = JSON.parse(result.content[0].text!);
        savedMessages.push(response.data.message);
      }

      // Search for machine learning related content
      const mlSearchResult = await searchMessagesTool.execute({
        query: 'machine learning artificial intelligence',
        limit: 10
      }, context);

      const mlResponse = JSON.parse(mlSearchResult.content[0].text!);
      expect(mlResponse.success).toBe(true);
      expect(mlResponse.data.results.length).toBeGreaterThan(0);
      
      // Should find ML-related messages, not cooking
      const foundContent = mlResponse.data.results.map((r: any) => r.message.content);
      expect(foundContent.some((content: string) => content.includes('machine learning'))).toBe(true);
      expect(foundContent.some((content: string) => content.includes('pasta'))).toBe(false);

      // Search for cooking content
      const cookingSearchResult = await searchMessagesTool.execute({
        query: 'cooking pasta',
        limit: 10
      }, context);

      const cookingResponse = JSON.parse(cookingSearchResult.content[0].text!);
      expect(cookingResponse.success).toBe(true);
      expect(cookingResponse.data.results.length).toBeGreaterThan(0);
      
      const cookingContent = cookingResponse.data.results.map((r: any) => r.message.content);
      expect(cookingContent.some((content: string) => content.includes('pasta'))).toBe(true);
      expect(cookingContent.some((content: string) => content.includes('machine learning'))).toBe(false);
    });

    it('should handle message updates and maintain search index', async () => {
      const context = BaseTool.createContext();
      
      // Save initial message
      const saveResult = await saveMessageTool.execute({
        conversationId: testConversation.id,
        role: 'user',
        content: 'Original content about databases'
      }, context);

      const saveResponse = JSON.parse(saveResult.content[0].text!);
      const messageId = saveResponse.data.message.id;

      // Verify original content is searchable
      let searchResult = await searchMessagesTool.execute({
        query: 'databases',
        limit: 10
      }, context);

      let searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.data.results.length).toBe(1);
      expect(searchResponse.data.results[0].message.id).toBe(messageId);

      // Update the message
      await messageRepo.update(messageId, {
        content: 'Updated content about artificial intelligence'
      });

      // Wait for FTS triggers to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Original content should not be found
      searchResult = await searchMessagesTool.execute({
        query: 'databases',
        limit: 10
      }, context);

      searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.data.results.length).toBe(0);

      // New content should be searchable
      searchResult = await searchMessagesTool.execute({
        query: 'artificial intelligence',
        limit: 10
      }, context);

      searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.data.results.length).toBe(1);
      expect(searchResponse.data.results[0].message.id).toBe(messageId);
      expect(searchResponse.data.results[0].message.content).toContain('artificial intelligence');
    });

    it('should handle message deletion and clean up search index', async () => {
      const context = BaseTool.createContext();
      
      // Save a message
      const saveResult = await saveMessageTool.execute({
        conversationId: testConversation.id,
        role: 'user',
        content: 'Message to be deleted about blockchain technology'
      }, context);

      const saveResponse = JSON.parse(saveResult.content[0].text!);
      const messageId = saveResponse.data.message.id;

      // Verify message is searchable
      let searchResult = await searchMessagesTool.execute({
        query: 'blockchain technology',
        limit: 10
      }, context);

      let searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.data.results.length).toBe(1);

      // Delete the message
      await messageRepo.delete(messageId);

      // Wait for FTS triggers to process
      await new Promise(resolve => setTimeout(resolve, 100));

      // Message should no longer be searchable
      searchResult = await searchMessagesTool.execute({
        query: 'blockchain technology',
        limit: 10
      }, context);

      searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.data.results.length).toBe(0);
    });
  });

  describe('Search Features and Edge Cases', () => {
    beforeEach(async () => {
      const context = BaseTool.createContext();
      
      // Create a diverse set of test messages
      const testMessages = [
        { role: 'user', content: 'What is the difference between SQL and NoSQL databases?' },
        { role: 'assistant', content: 'SQL databases use structured query language and have fixed schemas, while NoSQL databases are more flexible.' },
        { role: 'user', content: 'Can you explain REST API design principles?' },
        { role: 'assistant', content: 'REST APIs should be stateless, use HTTP methods correctly, and have predictable URL structures.' },
        { role: 'user', content: 'How do I optimize database queries for performance?' },
        { role: 'assistant', content: 'Use indexes, avoid N+1 queries, optimize joins, and consider query execution plans.' },
        { role: 'user', content: 'What are microservices and their benefits?' },
        { role: 'assistant', content: 'Microservices are small, independent services that communicate over networks, offering scalability and maintainability.' }
      ];

      for (const msg of testMessages) {
        await saveMessageTool.execute({
          conversationId: testConversation.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }, context);
      }
    });

    it('should support phrase search', async () => {
      const context = BaseTool.createContext();
      
      const searchResult = await searchMessagesTool.execute({
        query: '"REST API"',
        limit: 10
      }, context);

      const searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.success).toBe(true);
      expect(searchResponse.data.results.length).toBeGreaterThan(0);
      
      // Should find exact phrase matches
      const foundContent = searchResponse.data.results[0].message.content;
      expect(foundContent).toContain('REST API');
    });

    it('should support prefix matching', async () => {
      const context = BaseTool.createContext();
      
      const searchResult = await searchMessagesTool.execute({
        query: 'databas*',
        limit: 10
      }, context);

      const searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.success).toBe(true);
      expect(searchResponse.data.results.length).toBeGreaterThan(0);
      
      // Should match "database" and "databases"
      const allContent = searchResponse.data.results.map((r: any) => r.message.content.toLowerCase()).join(' ');
      expect(allContent).toMatch(/database[s]?/);
    });

    it('should handle special characters and punctuation', async () => {
      const context = BaseTool.createContext();
      
      // Save message with special characters
      const saveResult = await saveMessageTool.execute({
        conversationId: testConversation.id,
        role: 'user',
        content: 'What is C++ and how does it differ from C#? Also, what about Node.js?'
      }, context);

      expect(JSON.parse(saveResult.content[0].text!).success).toBe(true);

      // Search for terms with special characters
      const searchResult = await searchMessagesTool.execute({
        query: 'C++',
        limit: 10
      }, context);

      const searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.success).toBe(true);
      expect(searchResponse.data.results.length).toBeGreaterThan(0);
    });

    it('should handle empty search queries gracefully', async () => {
      const context = BaseTool.createContext();
      
      const searchResult = await searchMessagesTool.execute({
        query: '',
        limit: 10
      }, context);

      // Should handle empty query without error
      expect(searchResult.isError).toBe(true);
      const searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.success).toBe(false);
    });

    it('should handle non-existent terms', async () => {
      const context = BaseTool.createContext();
      
      const searchResult = await searchMessagesTool.execute({
        query: 'nonexistentterm12345',
        limit: 10
      }, context);

      const searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.success).toBe(true);
      expect(searchResponse.data.results.length).toBe(0);
    });
  });

  describe('Performance and Consistency', () => {
    it('should maintain consistent search results under concurrent operations', async () => {
      const context = BaseTool.createContext();
      
      // Create multiple messages concurrently
      const promises = Array.from({ length: 20 }, (_, i) => 
        saveMessageTool.execute({
          conversationId: testConversation.id,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Test message ${i} about concurrent operations and database consistency`
        }, context)
      );

      const results = await Promise.all(promises);
      
      // All saves should succeed
      results.forEach(result => {
        expect(result.isError).toBeUndefined();
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(true);
      });

      // Wait for all FTS updates to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Search should find all messages
      const searchResult = await searchMessagesTool.execute({
        query: 'concurrent operations',
        limit: 50
      }, context);

      const searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.success).toBe(true);
      expect(searchResponse.data.results.length).toBe(20);
    });

    it('should validate FTS index integrity', async () => {
      const context = BaseTool.createContext();
      
      // Create several messages
      const messageContents = [
        'Machine learning algorithms',
        'Data structures and algorithms', 
        'Web development frameworks',
        'Database optimization techniques',
        'Software architecture patterns'
      ];

      const messageIds = [];
      for (const content of messageContents) {
        const result = await saveMessageTool.execute({
          conversationId: testConversation.id,
          role: 'user',
          content
        }, context);
        
        const response = JSON.parse(result.content[0].text!);
        messageIds.push(response.data.message.id);
      }

      // Validate FTS index consistency
      const db = dbManager.getConnection();
      
      // Check that FTS table has correct number of entries
      const ftsCount = db.prepare('SELECT COUNT(*) as count FROM messages_fts').get() as { count: number };
      const messagesCount = db.prepare('SELECT COUNT(*) as count FROM messages').get() as { count: number };
      
      expect(ftsCount.count).toBe(messagesCount.count);

      // Verify each message is in FTS index
      for (const messageId of messageIds) {
        const message = await messageRepo.findById(messageId);
        expect(message).not.toBeNull();
        
        // Search for unique content from this message
        const uniqueWord = message!.content.split(' ')[0].toLowerCase();
        const ftsResult = db.prepare(`
          SELECT rowid FROM messages_fts WHERE messages_fts MATCH ?
        `).all(uniqueWord);
        
        expect(ftsResult.length).toBeGreaterThan(0);
      }
    });

    it('should handle FTS rebuild operations', async () => {
      const context = BaseTool.createContext();
      const db = dbManager.getConnection();
      
      // Create some messages
      await saveMessageTool.execute({
        conversationId: testConversation.id,
        role: 'user',
        content: 'Test message for FTS rebuild validation'
      }, context);

      // Verify message is searchable
      let searchResult = await searchMessagesTool.execute({
        query: 'rebuild validation',
        limit: 10
      }, context);

      let searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.data.results.length).toBe(1);

      // Perform FTS rebuild
      db.prepare("INSERT INTO messages_fts(messages_fts) VALUES('rebuild')").run();

      // Message should still be searchable after rebuild
      searchResult = await searchMessagesTool.execute({
        query: 'rebuild validation',
        limit: 10
      }, context);

      searchResponse = JSON.parse(searchResult.content[0].text!);
      expect(searchResponse.data.results.length).toBe(1);
    });
  });
});