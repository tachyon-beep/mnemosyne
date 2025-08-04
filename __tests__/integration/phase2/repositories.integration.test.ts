/**
 * Phase 2 Repositories Integration Tests
 * 
 * Comprehensive integration tests for all Phase 2 repository components:
 * - SummaryRepository
 * - ProviderConfigRepository
 * - CacheRepository
 * - SummaryHistoryRepository
 */

import { describe, beforeEach, afterEach, test, expect } from '@jest/globals';
import Database from 'better-sqlite3';
import { DatabaseManager } from '../../../src/storage/Database.js';
import { SummaryRepository } from '../../../src/storage/repositories/SummaryRepository.js';
import { ProviderConfigRepository } from '../../../src/storage/repositories/ProviderConfigRepository.js';
import { CacheRepository } from '../../../src/storage/repositories/CacheRepository.js';
import { SummaryHistoryRepository } from '../../../src/storage/repositories/SummaryHistoryRepository.js';
import { ConversationRepository } from '../../../src/storage/repositories/ConversationRepository.js';

describe('Phase 2 Repositories Integration Tests', () => {
  let db: Database.Database;
  let dbManager: DatabaseManager;
  let summaryRepo: SummaryRepository;
  let providerConfigRepo: ProviderConfigRepository;
  let cacheRepo: CacheRepository;
  let historyRepo: SummaryHistoryRepository;
  let conversationRepo: ConversationRepository;

  beforeEach(async () => {
    // Use in-memory database for isolation
    db = new Database(':memory:');
    
    dbManager = new DatabaseManager({
      databasePath: ':memory:',
      enableWAL: false,
      enableForeignKeys: true
    });
    
    // Override with our in-memory database
    (dbManager as any).db = db;
    
    await dbManager.initialize();

    // Initialize repositories
    summaryRepo = new SummaryRepository(dbManager);
    providerConfigRepo = new ProviderConfigRepository(dbManager);
    cacheRepo = new CacheRepository(dbManager);
    historyRepo = new SummaryHistoryRepository(dbManager);
    conversationRepo = new ConversationRepository(dbManager);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
  });

  describe('SummaryRepository Integration', () => {
    let conversationId: string;

    beforeEach(async () => {
      // Create a test conversation
      const conversation = await conversationRepo.create({
        title: 'Test Conversation for Summaries'
      });
      conversationId = conversation.id;
    });

    test('should create and retrieve conversation summaries', async () => {
      const summaryData = {
        conversationId,
        level: 'standard' as const,
        summaryText: 'This is a test summary of the conversation discussing AI and technology.',
        tokenCount: 15,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 5,
        qualityScore: 0.85,
        metadata: { topics: ['AI', 'technology'], sentiment: 'positive' }
      };

      const summary = await summaryRepo.create(summaryData);

      expect(summary.id).toBeDefined();
      expect(summary.conversationId).toBe(conversationId);
      expect(summary.level).toBe('standard');
      expect(summary.summaryText).toBe(summaryData.summaryText);
      expect(summary.tokenCount).toBe(15);
      expect(summary.qualityScore).toBe(0.85);
      expect(summary.metadata).toEqual(summaryData.metadata);

      // Test retrieval
      const retrieved = await summaryRepo.findById(summary.id);
      expect(retrieved).toEqual(summary);
    });

    test('should find summaries by conversation and level', async () => {
      // Create multiple summaries at different levels
      const briefSummary = await summaryRepo.create({
        conversationId,
        level: 'brief' as const,
        summaryText: 'Brief summary',
        tokenCount: 10,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messageCount: 3
      });

      const standardSummary = await summaryRepo.create({
        conversationId,
        level: 'standard' as const,
        summaryText: 'Standard summary',
        tokenCount: 25,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 5
      });

      const detailedSummary = await summaryRepo.create({
        conversationId,
        level: 'detailed' as const,
        summaryText: 'Detailed summary',
        tokenCount: 50,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 8
      });

      // Test finding by conversation
      const allSummaries = await summaryRepo.findByConversation(conversationId);
      expect(allSummaries.data).toHaveLength(3);

      // Test finding by level
      const briefSummaries = await summaryRepo.findByConversation(conversationId, 'brief');
      expect(briefSummaries.data).toHaveLength(1);
      expect(briefSummaries.data[0].id).toBe(briefSummary.id);

      // Test finding specific level
      const standardFound = await summaryRepo.findByConversationAndLevel(conversationId, 'standard');
      expect(standardFound?.id).toBe(standardSummary.id);
    });

    test('should handle batch summary creation', async () => {
      const batchData = {
        summaries: [
          {
            conversationId,
            level: 'brief' as const,
            summaryText: 'First batch summary',
            tokenCount: 12,
            provider: 'openai',
            model: 'gpt-3.5-turbo',
            messageCount: 2
          },
          {
            conversationId,
            level: 'standard' as const,
            summaryText: 'Second batch summary',
            tokenCount: 28,
            provider: 'anthropic',
            model: 'claude-3-sonnet',
            messageCount: 4
          }
        ]
      };

      const createdSummaries = await summaryRepo.createBatch(batchData);
      expect(createdSummaries).toHaveLength(2);
      
      // Verify both summaries were created
      const allSummaries = await summaryRepo.findByConversation(conversationId);
      expect(allSummaries.data).toHaveLength(2);
    });

    test('should update and delete summaries', async () => {
      const summary = await summaryRepo.create({
        conversationId,
        level: 'standard' as const,
        summaryText: 'Original summary',
        tokenCount: 20,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 3,
        qualityScore: 0.7
      });

      // Test update
      const updated = await summaryRepo.update(summary.id, {
        summaryText: 'Updated summary',
        qualityScore: 0.9,
        metadata: { updated: true }
      });

      expect(updated?.summaryText).toBe('Updated summary');
      expect(updated?.qualityScore).toBe(0.9);
      expect(updated?.metadata).toEqual({ updated: true });

      // Test delete
      const deleted = await summaryRepo.delete(summary.id);
      expect(deleted).toBe(true);

      const notFound = await summaryRepo.findById(summary.id);
      expect(notFound).toBeNull();
    });

    test('should handle quality score filtering', async () => {
      // Create summaries with different quality scores
      await summaryRepo.create({
        conversationId,
        level: 'standard' as const,
        summaryText: 'Low quality summary',
        tokenCount: 15,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messageCount: 2,
        qualityScore: 0.4
      });

      await summaryRepo.create({
        conversationId,
        level: 'standard' as const,
        summaryText: 'High quality summary',
        tokenCount: 25,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 5,
        qualityScore: 0.9
      });

      // Test filtering by quality score
      const highQualitySummaries = await summaryRepo.findRecent(50, 0.8);
      expect(highQualitySummaries).toHaveLength(1);
      expect(highQualitySummaries[0].qualityScore).toBe(0.9);
    });

    test('should invalidate conversation summaries', async () => {
      // Create multiple summaries
      await summaryRepo.create({
        conversationId,
        level: 'brief' as const,
        summaryText: 'Brief summary',
        tokenCount: 10,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messageCount: 2
      });

      await summaryRepo.create({
        conversationId,
        level: 'standard' as const,
        summaryText: 'Standard summary',
        tokenCount: 20,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 4
      });

      // Verify summaries exist
      const beforeInvalidation = await summaryRepo.findByConversation(conversationId);
      expect(beforeInvalidation.data).toHaveLength(2);

      // Invalidate all summaries for conversation
      const deletedCount = await summaryRepo.invalidateForConversation(conversationId);
      expect(deletedCount).toBe(2);

      // Verify summaries are gone
      const afterInvalidation = await summaryRepo.findByConversation(conversationId);
      expect(afterInvalidation.data).toHaveLength(0);
    });
  });

  describe('ProviderConfigRepository Integration', () => {
    test('should create and retrieve provider configurations', async () => {
      const configData = {
        providerId: 'openai',
        config: {
          apiKey: 'sk-test-key',
          model: 'gpt-4',
          maxTokens: 4000,
          temperature: 0.7
        },
        metadata: {
          description: 'OpenAI GPT-4 configuration',
          costPerToken: 0.00003
        }
      };

      const config = await providerConfigRepo.create(configData);

      expect(config.id).toBeDefined();
      expect(config.providerId).toBe('openai');
      expect(config.config).toEqual(configData.config);
      expect(config.metadata).toEqual(configData.metadata);
      expect(config.isActive).toBe(true);

      // Test retrieval
      const retrieved = await providerConfigRepo.findById(config.id);
      expect(retrieved).toEqual(config);
    });

    test('should manage provider configurations by provider ID', async () => {
      // Create multiple configurations for same provider
      const config1 = await providerConfigRepo.create({
        providerId: 'openai',
        config: { model: 'gpt-3.5-turbo' }
      });

      const config2 = await providerConfigRepo.create({
        providerId: 'openai',
        config: { model: 'gpt-4' }
      });

      const config3 = await providerConfigRepo.create({
        providerId: 'anthropic',
        config: { model: 'claude-3-sonnet' }
      });

      // Test finding by provider
      const openaiConfigs = await providerConfigRepo.findByProviderId('openai');
      expect(openaiConfigs).toHaveLength(2);

      const anthropicConfigs = await providerConfigRepo.findByProviderId('anthropic');
      expect(anthropicConfigs).toHaveLength(1);

      // Test getting active configuration
      const activeOpenAI = await providerConfigRepo.getActiveConfig('openai');
      expect(activeOpenAI).toBeDefined();
    });

    test('should update and activate configurations', async () => {
      const config = await providerConfigRepo.create({
        providerId: 'openai',
        config: { model: 'gpt-3.5-turbo', temperature: 0.5 }
      });

      // Test update
      const updated = await providerConfigRepo.update(config.id, {
        config: { model: 'gpt-4', temperature: 0.7 },
        metadata: { updated: true }
      });

      expect(updated?.config.model).toBe('gpt-4');
      expect(updated?.config.temperature).toBe(0.7);
      expect(updated?.metadata).toEqual({ updated: true });

      // Test activation
      const activated = await providerConfigRepo.setActive(config.id, true);
      expect(activated).toBe(true);

      const deactivated = await providerConfigRepo.setActive(config.id, false);
      expect(deactivated).toBe(true);
    });

    test('should handle configuration validation', async () => {
      // Test with invalid provider ID
      await expect(providerConfigRepo.create({
        providerId: '', // Empty provider ID should fail
        config: { model: 'test' }
      })).rejects.toThrow();

      // Test successful creation
      const validConfig = await providerConfigRepo.create({
        providerId: 'test-provider',
        config: { model: 'test-model' }
      });

      expect(validConfig.providerId).toBe('test-provider');
    });
  });

  describe('CacheRepository Integration', () => {
    test('should store and retrieve cached contexts', async () => {
      const cacheData = {
        summaryIds: ['sum1', 'sum2'],
        assembledContext: 'This is assembled context about AI and machine learning.',
        tokenCount: 25
      };

      const cacheKey = 'context:test-query:12345';
      const ttlHours = 24;

      const cached = await cacheRepo.set(cacheKey, cacheData, ttlHours);

      expect(cached.id).toBeDefined();
      expect(cached.cacheKey).toBe(cacheKey);
      expect(cached.summaryIds).toEqual(cacheData.summaryIds);
      expect(cached.assembledContext).toBe(cacheData.assembledContext);
      expect(cached.tokenCount).toBe(25);

      // Test retrieval
      const retrieved = await cacheRepo.get(cacheKey);
      expect(retrieved).toEqual(cached);
    });

    test('should handle cache expiration', async () => {
      const cacheData = {
        summaryIds: ['sum1'],
        assembledContext: 'Test context',
        tokenCount: 10
      };

      const cacheKey = 'expiry-test';
      
      // Set with very short TTL
      await cacheRepo.set(cacheKey, cacheData, 0.001); // ~3.6 seconds

      // Should still be available immediately
      const immediate = await cacheRepo.get(cacheKey);
      expect(immediate).toBeDefined();

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Should be expired now
      const expired = await cacheRepo.get(cacheKey);
      expect(expired).toBeNull();
    });

    test('should update and delete cache entries', async () => {
      const cacheData = {
        summaryIds: ['original'],
        assembledContext: 'Original context',
        tokenCount: 15
      };

      const cached = await cacheRepo.set('update-test', cacheData, 24);

      // Test update
      const updated = await cacheRepo.update(cached.id, {
        assembledContext: 'Updated context',
        tokenCount: 20
      });

      expect(updated?.assembledContext).toBe('Updated context');
      expect(updated?.tokenCount).toBe(20);

      // Test delete
      const deleted = await cacheRepo.delete('update-test');
      expect(deleted).toBe(true);

      const notFound = await cacheRepo.get('update-test');
      expect(notFound).toBeNull();
    });

    test('should handle cache statistics and cleanup', async () => {
      // Create multiple cache entries
      await cacheRepo.set('stats-1', { summaryIds: [], assembledContext: 'Test 1', tokenCount: 10 }, 24);
      await cacheRepo.set('stats-2', { summaryIds: [], assembledContext: 'Test 2', tokenCount: 15 }, 24);
      await cacheRepo.set('stats-3', { summaryIds: [], assembledContext: 'Test 3', tokenCount: 20 }, 0.001); // Will expire

      // Wait for one to expire
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test cleanup of expired entries
      const cleanedCount = await cacheRepo.cleanupExpired();
      expect(cleanedCount).toBeGreaterThanOrEqual(1);

      // Test statistics
      const stats = await cacheRepo.getStats();
      expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
      expect(stats.totalTokens).toBeGreaterThanOrEqual(25);
    });

    test('should handle cache key patterns and bulk operations', async () => {
      // Create entries with pattern
      await cacheRepo.set('pattern:test:1', { summaryIds: [], assembledContext: 'Test 1', tokenCount: 10 }, 24);
      await cacheRepo.set('pattern:test:2', { summaryIds: [], assembledContext: 'Test 2', tokenCount: 15 }, 24);
      await cacheRepo.set('other:key', { summaryIds: [], assembledContext: 'Other', tokenCount: 5 }, 24);

      // Test finding by pattern
      const patternResults = await cacheRepo.findByKeyPattern('pattern:test:%');
      expect(patternResults).toHaveLength(2);

      // Test bulk delete by pattern
      const deletedCount = await cacheRepo.deleteByPattern('pattern:test:%');
      expect(deletedCount).toBe(2);

      // Verify deletion
      const remainingPattern = await cacheRepo.findByKeyPattern('pattern:test:%');
      expect(remainingPattern).toHaveLength(0);

      const otherStillExists = await cacheRepo.get('other:key');
      expect(otherStillExists).toBeDefined();
    });
  });

  describe('SummaryHistoryRepository Integration', () => {
    test('should track summary generation lifecycle', async () => {
      const startData = {
        summaryId: 'test-summary-123',
        providerId: 'openai',
        inputTokens: 1500
      };

      // Record start
      const history = await historyRepo.recordStart(startData);
      
      expect(history.id).toBeDefined();
      expect(history.summaryId).toBe(startData.summaryId);
      expect(history.providerId).toBe(startData.providerId);
      expect(history.inputTokens).toBe(1500);
      expect(history.status).toBe('started');
      expect(history.startedAt).toBeDefined();

      // Record completion
      const completeData = {
        outputTokens: 300,
        cost: 0.045
      };

      const completed = await historyRepo.recordComplete(history.id, completeData);
      
      expect(completed?.status).toBe('completed');
      expect(completed?.outputTokens).toBe(300);
      expect(completed?.cost).toBe(0.045);
      expect(completed?.completedAt).toBeDefined();

      // Verify retrieval
      const retrieved = await historyRepo.findById(history.id);
      expect(retrieved?.status).toBe('completed');
    });

    test('should handle generation failures', async () => {
      const history = await historyRepo.recordStart({
        summaryId: 'failing-summary',
        providerId: 'test-provider',
        inputTokens: 100
      });

      // Record failure
      const errorMessage = 'API rate limit exceeded';
      const failed = await historyRepo.recordFailure(history.id, errorMessage);

      expect(failed?.status).toBe('failed');
      expect(failed?.errorMessage).toBe(errorMessage);
      expect(failed?.failedAt).toBeDefined();

      // Test retrieval
      const retrieved = await historyRepo.findById(history.id);
      expect(retrieved?.status).toBe('failed');
      expect(retrieved?.errorMessage).toBe(errorMessage);
    });

    test('should query history by various criteria', async () => {
      // Create multiple history entries
      const openaiHistory = await historyRepo.recordStart({
        summaryId: 'openai-summary',
        providerId: 'openai',
        inputTokens: 1000
      });
      await historyRepo.recordComplete(openaiHistory.id, { outputTokens: 200, cost: 0.03 });

      const anthropicHistory = await historyRepo.recordStart({
        summaryId: 'anthropic-summary',
        providerId: 'anthropic',
        inputTokens: 1200
      });
      await historyRepo.recordComplete(anthropicHistory.id, { outputTokens: 250, cost: 0.04 });

      const failedHistory = await historyRepo.recordStart({
        summaryId: 'failed-summary',
        providerId: 'openai',
        inputTokens: 800
      });
      await historyRepo.recordFailure(failedHistory.id, 'Test error');

      // Test finding by summary ID
      const bySummary = await historyRepo.findBySummaryId('openai-summary');
      expect(bySummary).toHaveLength(1);
      expect(bySummary[0].providerId).toBe('openai');

      // Test finding by provider
      const byProvider = await historyRepo.findByProvider('openai');
      expect(byProvider.data).toHaveLength(2); // One completed, one failed

      // Test finding by status
      const completed = await historyRepo.findByStatus('completed');
      expect(completed.data).toHaveLength(2);

      const failed = await historyRepo.findByStatus('failed');
      expect(failed.data).toHaveLength(1);
    });

    test('should calculate generation statistics', async () => {
      // Create multiple completed generations
      const history1 = await historyRepo.recordStart({
        summaryId: 'stats-1',
        providerId: 'openai',
        inputTokens: 1000
      });
      await historyRepo.recordComplete(history1.id, { outputTokens: 200, cost: 0.03 });

      const history2 = await historyRepo.recordStart({
        summaryId: 'stats-2',
        providerId: 'openai',
        inputTokens: 1500
      });
      await historyRepo.recordComplete(history2.id, { outputTokens: 300, cost: 0.045 });

      // Get statistics
      const stats = await historyRepo.getStatistics();
      
      expect(stats.totalGenerations).toBeGreaterThanOrEqual(2);
      expect(stats.completedGenerations).toBeGreaterThanOrEqual(2);
      expect(stats.totalCost).toBeGreaterThanOrEqual(0.075);
      expect(stats.totalInputTokens).toBeGreaterThanOrEqual(2500);
      expect(stats.totalOutputTokens).toBeGreaterThanOrEqual(500);
      expect(stats.averageInputTokens).toBeGreaterThan(0);
      expect(stats.averageOutputTokens).toBeGreaterThan(0);
    });

    test('should handle history cleanup and archiving', async () => {
      // Create old history entries
      const oldHistory = await historyRepo.recordStart({
        summaryId: 'old-summary',
        providerId: 'test',
        inputTokens: 100
      });
      
      // Manually set old timestamp to simulate age
      const oldTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000); // 31 days ago
      db.prepare(`UPDATE summary_history SET started_at = ? WHERE id = ?`)
        .run(oldTimestamp, oldHistory.id);

      // Create recent history
      const recentHistory = await historyRepo.recordStart({
        summaryId: 'recent-summary',
        providerId: 'test',
        inputTokens: 200
      });

      // Test cleanup (remove entries older than 30 days)
      const cleanedCount = await historyRepo.cleanupOld(30);
      expect(cleanedCount).toBe(1);

      // Verify old entry is gone
      const oldNotFound = await historyRepo.findById(oldHistory.id);
      expect(oldNotFound).toBeNull();

      // Verify recent entry still exists
      const recentExists = await historyRepo.findById(recentHistory.id);
      expect(recentExists).toBeDefined();
    });
  });

  describe('Cross-Repository Integration', () => {
    test('should maintain referential integrity between repositories', async () => {
      // Create conversation
      const conversation = await conversationRepo.create({
        title: 'Cross-repo test conversation'
      });

      // Create summary
      const summary = await summaryRepo.create({
        conversationId: conversation.id,
        level: 'standard' as const,
        summaryText: 'Test summary for cross-repo integration',
        tokenCount: 20,
        provider: 'openai',
        model: 'gpt-4',
        messageCount: 3
      });

      // Create generation history
      const history = await historyRepo.recordStart({
        summaryId: summary.id,
        providerId: 'openai',
        inputTokens: 800
      });
      await historyRepo.recordComplete(history.id, { outputTokens: 150, cost: 0.025 });

      // Cache the summary
      await cacheRepo.set(`summary:${conversation.id}:standard`, {
        summaryIds: [summary.id],
        assembledContext: summary.summaryText,
        tokenCount: summary.tokenCount
      }, 24);

      // Verify all relationships exist
      const retrievedSummary = await summaryRepo.findById(summary.id);
      expect(retrievedSummary?.conversationId).toBe(conversation.id);

      const retrievedHistory = await historyRepo.findBySummaryId(summary.id);
      expect(retrievedHistory).toHaveLength(1);
      expect(retrievedHistory[0].status).toBe('completed');

      const retrievedCache = await cacheRepo.get(`summary:${conversation.id}:standard`);
      expect(retrievedCache?.summaryIds).toContain(summary.id);

      // Test cascade behavior - invalidate summaries should affect cache
      await summaryRepo.invalidateForConversation(conversation.id);
      
      const invalidatedSummary = await summaryRepo.findById(summary.id);
      expect(invalidatedSummary).toBeNull();

      // History should still exist (separate lifecycle)
      const historyStillExists = await historyRepo.findById(history.id);
      expect(historyStillExists).toBeDefined();
    });

    test('should handle concurrent operations across repositories', async () => {
      const conversation = await conversationRepo.create({
        title: 'Concurrency test'
      });

      // Test concurrent summary creation
      const concurrentPromises = Array.from({ length: 5 }, (_, i) => 
        summaryRepo.create({
          conversationId: conversation.id,
          level: 'brief' as const,
          summaryText: `Concurrent summary ${i + 1}`,
          tokenCount: 10 + i,
          provider: 'test',
          model: 'test-model',
          messageCount: i + 1
        })
      );

      const summaries = await Promise.all(concurrentPromises);
      expect(summaries).toHaveLength(5);

      // Verify all summaries have unique IDs
      const ids = summaries.map(s => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);

      // Test concurrent cache operations
      const cachePromises = summaries.map((summary, i) =>
        cacheRepo.set(`concurrent:${i}`, {
          summaryIds: [summary.id],
          assembledContext: summary.summaryText,
          tokenCount: summary.tokenCount
        }, 24)
      );

      const cacheResults = await Promise.all(cachePromises);
      expect(cacheResults).toHaveLength(5);

      // Verify all cache entries exist
      for (let i = 0; i < 5; i++) {
        const cached = await cacheRepo.get(`concurrent:${i}`);
        expect(cached).toBeDefined();
        expect(cached?.summaryIds).toContain(summaries[i].id);
      }
    });
  });
});