/**
 * SearchEngine Unit Tests
 * 
 * Tests for the main search engine functionality, integration, and performance
 */

import { SearchEngine, SearchEngineOptions } from '../../../src/search/SearchEngine';
import { MessageRepository } from '../../../src/storage/repositories/MessageRepository';
import { SearchOptions, SearchResult, Message, PaginatedResult } from '../../../src/types/interfaces';

// Mock MessageRepository
const createMockMessageRepository = (): jest.Mocked<MessageRepository> => {
  const mockRepo = {
    search: jest.fn(),
  } as unknown as jest.Mocked<MessageRepository>;

  return mockRepo;
};

// Helper function to create test messages
const createTestMessage = (
  id: string, 
  content: string, 
  conversationId: string = 'conv-1',
  role: 'user' | 'assistant' | 'system' = 'user'
): Message => ({
  id,
  conversationId,
  role,
  content,
  createdAt: Date.now(),
  metadata: {}
});

// Helper function to create mock search results
const createMockSearchResults = (
  messages: Message[],
  scores: number[] = [],
  hasMore: boolean = false
): PaginatedResult<SearchResult> => {
  const results: SearchResult[] = messages.map((message, index) => ({
    message,
    score: scores[index] || 1.0,
    snippet: message.content.substring(0, 50),
    conversationTitle: `Conversation ${message.conversationId}`
  }));

  return {
    data: results,
    hasMore,
    totalCount: results.length
  };
};

describe('SearchEngine', () => {
  let mockRepository: jest.Mocked<MessageRepository>;
  let searchEngine: SearchEngine;

  beforeEach(() => {
    mockRepository = createMockMessageRepository();
    searchEngine = new SearchEngine(mockRepository);
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (searchEngine) {
      searchEngine.destroy();
    }
  });

  describe('constructor and configuration', () => {
    it('should initialize with default options', () => {
      const engine = new SearchEngine(mockRepository);
      const config = engine.getConfiguration();

      expect(config.defaultLimit).toBe(20);
      expect(config.maxLimit).toBe(100);
      expect(config.enableEnhancedFormatting).toBe(true);
      expect(config.minScoreThreshold).toBe(0.01);
    });

    it('should initialize with custom options', () => {
      const customOptions: SearchEngineOptions = {
        defaultLimit: 10,
        maxLimit: 50,
        enableEnhancedFormatting: false,
        minScoreThreshold: 0.1
      };

      const engine = new SearchEngine(mockRepository, customOptions);
      const config = engine.getConfiguration();

      expect(config.defaultLimit).toBe(10);
      expect(config.maxLimit).toBe(50);
      expect(config.enableEnhancedFormatting).toBe(false);
      expect(config.minScoreThreshold).toBe(0.1);
    });

    it('should allow updating options', () => {
      const newOptions: Partial<SearchEngineOptions> = {
        defaultLimit: 30
      };

      searchEngine.updateOptions(newOptions);
      const config = searchEngine.getConfiguration();

      expect(config.defaultLimit).toBe(30);
    });
  });

  describe('search method', () => {
    it('should perform basic search successfully', async () => {
      const testMessages = [
        createTestMessage('msg-1', 'This is a test message'),
        createTestMessage('msg-2', 'Another test content')
      ];
      const mockResults = createMockSearchResults(testMessages, [1.5, 1.2]);

      mockRepository.search.mockResolvedValue(mockResults);

      const searchOptions: SearchOptions = {
        query: 'test',
        limit: 10
      };

      const result = await searchEngine.search(searchOptions);

      expect(result.results.data).toHaveLength(2);
      expect(result.stats.queryTime).toBeGreaterThan(0);
      expect(result.stats.totalResults).toBe(2);
      expect(result.stats.queryInfo.isValid).toBe(true);
      expect(result.stats.cached).toBe(false);
      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test',
          limit: 10
        })
      );
    });

    it('should handle invalid queries gracefully', async () => {
      const searchOptions: SearchOptions = {
        query: '', // Invalid empty query
      };

      const result = await searchEngine.search(searchOptions);

      expect(result.results.data).toHaveLength(0);
      expect(result.stats.queryInfo.isValid).toBe(false);
      expect(result.stats.queryInfo.error).toBeDefined();
      expect(mockRepository.search).not.toHaveBeenCalled();
    });

    it('should apply score filtering', async () => {
      const testMessages = [
        createTestMessage('msg-1', 'High relevance message'),
        createTestMessage('msg-2', 'Low relevance message')
      ];
      const mockResults = createMockSearchResults(testMessages, [0.5, 0.005]); // Second result below threshold

      mockRepository.search.mockResolvedValue(mockResults);

      const searchOptions: SearchOptions = {
        query: 'test'
      };

      const result = await searchEngine.search(searchOptions);

      // Should filter out low-score result (0.005 < 0.01 threshold)
      expect(result.results.data).toHaveLength(1);
      expect(result.results.data[0].score).toBe(0.5);
      expect(result.stats.totalResults).toBe(2);
      expect(result.stats.filteredResults).toBe(1);
    });

    it('should enforce limit constraints', async () => {
      const searchOptions: SearchOptions = {
        query: 'test',
        limit: 200 // Exceeds maxLimit of 100
      };

      await searchEngine.search(searchOptions);

      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 100 // Should be capped at maxLimit
        })
      );
    });

    it('should handle database errors gracefully', async () => {
      mockRepository.search.mockRejectedValue(new Error('Database connection failed'));

      const searchOptions: SearchOptions = {
        query: 'test'
      };

      const result = await searchEngine.search(searchOptions);

      expect(result.results.data).toHaveLength(0);
      expect(result.stats.queryInfo.error).toContain('Database connection failed');
    });

    it('should format results with enhanced formatting when enabled', async () => {
      const testMessages = [
        createTestMessage('msg-1', 'This is a test message with important content')
      ];
      const mockResults = createMockSearchResults(testMessages);

      mockRepository.search.mockResolvedValue(mockResults);

      const searchOptions: SearchOptions = {
        query: 'test important'
      };

      const result = await searchEngine.search(searchOptions);
      const formattedResult = result.results.data[0];

      expect(formattedResult).toHaveProperty('enhancedSnippet');
      expect(formattedResult).toHaveProperty('matchCount');
      expect(formattedResult).toHaveProperty('highlightedTerms');
      expect(formattedResult.enhancedSnippet).toContain('<mark>');
    });

    it('should skip enhanced formatting when disabled', async () => {
      const engineWithoutFormatting = new SearchEngine(mockRepository, {
        enableEnhancedFormatting: false
      });

      const testMessages = [
        createTestMessage('msg-1', 'This is a test message')
      ];
      const mockResults = createMockSearchResults(testMessages);

      mockRepository.search.mockResolvedValue(mockResults);

      const result = await engineWithoutFormatting.search({
        query: 'test'
      });

      const formattedResult = result.results.data[0];
      expect(formattedResult.enhancedSnippet).toBe(formattedResult.snippet);
      expect(formattedResult.matchCount).toBe(0);
    });
  });

  describe('caching functionality', () => {
    it('should cache search results', async () => {
      const testMessages = [createTestMessage('msg-1', 'Test message')];
      const mockResults = createMockSearchResults(testMessages);

      mockRepository.search.mockResolvedValue(mockResults);

      const searchOptions: SearchOptions = {
        query: 'test'
      };

      // First search
      await searchEngine.search(searchOptions);
      
      // Second search with same options
      const result = await searchEngine.search(searchOptions);

      // Repository should only be called once due to caching
      expect(mockRepository.search).toHaveBeenCalledTimes(1);
      expect(result.stats.cached).toBe(true);
    });

    it('should not cache different queries', async () => {
      const mockResults = createMockSearchResults([]);
      mockRepository.search.mockResolvedValue(mockResults);

      await searchEngine.search({ query: 'test1' });
      await searchEngine.search({ query: 'test2' });

      expect(mockRepository.search).toHaveBeenCalledTimes(2);
    });

    it('should clear cache manually', async () => {
      const mockResults = createMockSearchResults([]);
      mockRepository.search.mockResolvedValue(mockResults);

      await searchEngine.search({ query: 'test' });
      searchEngine.clearCache();
      await searchEngine.search({ query: 'test' });

      expect(mockRepository.search).toHaveBeenCalledTimes(2);
    });

    it('should provide cache statistics', () => {
      const stats = searchEngine.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.hitRate).toBe('number');
    });
  });

  describe('convenience search methods', () => {
    beforeEach(() => {
      const mockResults = createMockSearchResults([
        createTestMessage('msg-1', 'Test message content')
      ]);
      mockRepository.search.mockResolvedValue(mockResults);
    });

    describe('simpleSearch', () => {
      it('should perform simple fuzzy search', async () => {
        const results = await searchEngine.simpleSearch('test', 5);

        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test',
            limit: 5,
            matchType: 'fuzzy'
          })
        );
        expect(results).toHaveLength(1);
        expect(results[0]).toHaveProperty('message');
        expect(results[0]).toHaveProperty('score');
      });

      it('should include conversation filter when provided', async () => {
        await searchEngine.simpleSearch('test', 10, 'conv-123');

        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            conversationId: 'conv-123'
          })
        );
      });
    });

    describe('phraseSearch', () => {
      it('should perform exact phrase search', async () => {
        await searchEngine.phraseSearch('test phrase');

        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: '"test phrase"',
            matchType: 'exact'
          })
        );
      });
    });

    describe('prefixSearch', () => {
      it('should perform prefix search', async () => {
        await searchEngine.prefixSearch('test');

        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            query: 'test*',
            matchType: 'prefix'
          })
        );
      });
    });

    describe('searchByDateRange', () => {
      it('should include date filters', async () => {
        const startDate = '2023-01-01T00:00:00Z';
        const endDate = '2023-12-31T23:59:59Z';

        await searchEngine.searchByDateRange('test', startDate, endDate);

        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            startDate,
            endDate
          })
        );
      });
    });

    describe('searchWithHighlighting', () => {
      it('should use custom highlighting markers', async () => {
        const results = await searchEngine.searchWithHighlighting(
          'test', 
          '**', 
          '**'
        );

        expect(mockRepository.search).toHaveBeenCalledWith(
          expect.objectContaining({
            highlightStart: '**',
            highlightEnd: '**'
          })
        );
        expect(results[0]).toHaveProperty('enhancedSnippet');
      });
    });
  });

  describe('search suggestions', () => {
    it('should generate suggestions from search results', async () => {
      const testMessages = [
        createTestMessage('msg-1', 'testing framework for applications'),
        createTestMessage('msg-2', 'test case scenarios and methods'),
        createTestMessage('msg-3', 'automated testing tools')
      ];
      const mockResults = createMockSearchResults(testMessages);

      mockRepository.search.mockResolvedValue(mockResults);

      const suggestions = await searchEngine.getSuggestions('test', 3);

      expect(suggestions).toBeInstanceOf(Array);
      expect(suggestions.length).toBeLessThanOrEqual(3);
      // Should contain words that start with 'test'
      suggestions.forEach(suggestion => {
        expect(suggestion.toLowerCase()).toMatch(/^test/);
      });
    });

    it('should handle short queries', async () => {
      const suggestions = await searchEngine.getSuggestions('t');

      expect(suggestions).toEqual([]);
    });

    it('should handle empty queries', async () => {
      const suggestions = await searchEngine.getSuggestions('');

      expect(suggestions).toEqual([]);
    });

    it('should handle errors gracefully', async () => {
      mockRepository.search.mockRejectedValue(new Error('Search failed'));

      const suggestions = await searchEngine.getSuggestions('test');

      expect(suggestions).toEqual([]);
    });
  });

  describe('search analytics', () => {
    it('should provide query analytics', async () => {
      const mockResults = createMockSearchResults([
        createTestMessage('msg-1', 'Test content')
      ]);
      mockRepository.search.mockResolvedValue(mockResults);

      const analytics = await searchEngine.getSearchAnalytics('test query');

      expect(analytics).toHaveProperty('estimatedResults');
      expect(analytics).toHaveProperty('queryComplexity');
      expect(analytics).toHaveProperty('suggestedFilters');
      expect(typeof analytics.estimatedResults).toBe('number');
      expect(['simple', 'moderate', 'complex']).toContain(analytics.queryComplexity);
      expect(Array.isArray(analytics.suggestedFilters)).toBe(true);
    });

    it('should detect query complexity', async () => {
      mockRepository.search.mockResolvedValue(createMockSearchResults([]));

      const simpleAnalytics = await searchEngine.getSearchAnalytics('test');
      const moderateAnalytics = await searchEngine.getSearchAnalytics('test query');
      const complexAnalytics = await searchEngine.getSearchAnalytics('complex +query -with operators');

      expect(simpleAnalytics.queryComplexity).toBe('simple');
      expect(moderateAnalytics.queryComplexity).toBe('moderate');
      expect(complexAnalytics.queryComplexity).toBe('complex');
    });

    it('should handle invalid queries in analytics', async () => {
      const analytics = await searchEngine.getSearchAnalytics('');

      expect(analytics.estimatedResults).toBe(0);
      expect(analytics.queryComplexity).toBe('simple');
      expect(analytics.suggestedFilters).toEqual([]);
    });
  });

  describe('query validation', () => {
    it('should validate good queries', () => {
      const validation = searchEngine.validateQuery('hello world');

      expect(validation.isValid).toBe(true);
      expect(validation.error).toBeUndefined();
    });

    it('should provide validation errors', () => {
      const validation = searchEngine.validateQuery('');

      expect(validation.isValid).toBe(false);
      expect(validation.error).toBeDefined();
    });

    it('should provide suggestions for invalid queries', () => {
      const validation = searchEngine.validateQuery('   ');

      expect(validation.isValid).toBe(false);
      expect(validation.suggestions).toBeInstanceOf(Array);
      expect(validation.suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle repository errors', async () => {
      mockRepository.search.mockRejectedValue(new Error('Database error'));

      const result = await searchEngine.search({ query: 'test' });

      expect(result.results.data).toHaveLength(0);
      expect(result.stats.queryInfo.error).toContain('Database error');
    });

    it('should handle malformed search options', async () => {
      await searchEngine.search({
        query: 'test',
        limit: -1, // Invalid limit
        offset: -5 // Invalid offset
      });

      // Should correct invalid values
      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: expect.any(Number),
          offset: 0
        })
      );
    });
  });

  describe('performance', () => {
    it('should complete searches quickly', async () => {
      const mockResults = createMockSearchResults([
        createTestMessage('msg-1', 'Test message')
      ]);
      mockRepository.search.mockResolvedValue(mockResults);

      const start = Date.now();
      await searchEngine.search({ query: 'test' });
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100); // Should be fast
    });

    it('should handle multiple concurrent searches', async () => {
      const mockResults = createMockSearchResults([]);
      // Add a small delay to ensure measurable query time
      mockRepository.search.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(mockResults), 1))
      );

      const searches = Array.from({ length: 10 }, (_, i) => 
        searchEngine.search({ query: `test${i}` })
      );

      const results = await Promise.all(searches);

      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.stats.queryTime).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('integration edge cases', () => {
    it('should handle empty search results', async () => {
      mockRepository.search.mockResolvedValue(createMockSearchResults([]));

      const result = await searchEngine.search({ query: 'nonexistent' });

      expect(result.results.data).toHaveLength(0);
      expect(result.results.hasMore).toBe(false);
      expect(result.stats.totalResults).toBe(0);
    });

    it('should handle pagination correctly', async () => {
      const mockResults = createMockSearchResults([], [], true); // hasMore = true
      mockRepository.search.mockResolvedValue(mockResults);

      const result = await searchEngine.search({
        query: 'test',
        limit: 10,
        offset: 20
      });

      expect(result.results.hasMore).toBe(true);
      expect(mockRepository.search).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 10,
          offset: 20
        })
      );
    });

    it('should preserve all search result properties', async () => {
      const testMessage = createTestMessage('msg-1', 'Test content');
      const mockResults: PaginatedResult<SearchResult> = {
        data: [{
          message: testMessage,
          score: 1.5,
          snippet: 'Test snippet',
          conversationTitle: 'Test Conversation'
        }],
        hasMore: false,
        totalCount: 1
      };

      mockRepository.search.mockResolvedValue(mockResults);

      const result = await searchEngine.search({ query: 'test' });
      const searchResult = result.results.data[0];

      expect(searchResult.message).toEqual(testMessage);
      expect(searchResult.score).toBe(1.5);
      expect(searchResult.snippet).toBe('Test snippet');
      expect(searchResult.conversationTitle).toBe('Test Conversation');
    });
  });
});