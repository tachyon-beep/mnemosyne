/**
 * Unit tests for SearchMessagesTool
 * 
 * Tests the search_messages tool functionality including full-text search,
 * filtering, pagination, and result enhancement.
 */

import {
  SearchMessagesTool,
  SearchMessagesDependencies,
  SearchMessagesResponse
} from '../../../src/tools/SearchMessagesTool';
import { BaseTool } from '../../../src/tools/BaseTool';
import { SearchEngine } from '../../../src/search/SearchEngine';
import { FormattedSearchResult } from '../../../src/search/SearchResultFormatter';

// Mock dependencies
const mockSearchEngine = {
  search: jest.fn(),
  simpleSearch: jest.fn(),
  phraseSearch: jest.fn(),
  prefixSearch: jest.fn(),
  searchByDateRange: jest.fn(),
  searchInConversation: jest.fn(),
  searchWithinTimeRange: jest.fn(),
  indexMessage: jest.fn(),
  removeMessage: jest.fn(),
  updateMessage: jest.fn(),
  indexConversation: jest.fn(),
  removeConversation: jest.fn(),
  clearIndex: jest.fn(),
  rebuildIndex: jest.fn(),
  getStats: jest.fn(),
  destroy: jest.fn()
} as unknown as jest.Mocked<SearchEngine>;

// Sample search results for testing
const sampleSearchResults: FormattedSearchResult[] = [
  {
    message: {
      id: 'msg-1',
      conversationId: 'conv-1',
      role: 'user',
      content: 'How do I test JavaScript functions?',
      createdAt: Date.now() - 1000
    },
    score: 0.95,
    snippet: 'How do I <mark>test</mark> JavaScript functions?',
    conversationTitle: 'Testing Discussion',
    enhancedSnippet: 'How do I <mark>test</mark> JavaScript functions?',
    matchCount: 1,
    highlightedTerms: ['test'],
    snippetStart: 0,
    snippetEnd: 34
  },
  {
    message: {
      id: 'msg-2',
      conversationId: 'conv-1',
      role: 'assistant',
      content: 'You can test JavaScript functions using Jest framework...',
      createdAt: Date.now() - 500
    },
    score: 0.85,
    snippet: 'You can <mark>test</mark> JavaScript functions using Jest framework...',
    conversationTitle: 'Testing Discussion',
    enhancedSnippet: 'You can <mark>test</mark> JavaScript functions using Jest framework...',
    matchCount: 1,
    highlightedTerms: ['test'],
    snippetStart: 8,
    snippetEnd: 55
  },
  {
    message: {
      id: 'msg-3',
      conversationId: 'conv-2',
      role: 'user',
      content: 'What are unit tests and how to write them?',
      createdAt: Date.now() - 200
    },
    score: 0.75,
    snippet: 'What are unit <mark>tests</mark> and how to write them?',
    conversationTitle: 'Unit Testing Guide',
    enhancedSnippet: 'What are unit <mark>tests</mark> and how to write them?',
    matchCount: 1,
    highlightedTerms: ['tests'],
    snippetStart: 14,
    snippetEnd: 42
  }
];

// Mock enhanced search result
const mockEnhancedSearchResult = {
  results: {
    data: sampleSearchResults,
    hasMore: false
  },
  stats: {
    queryTime: 50,
    totalResults: sampleSearchResults.length,
    filteredResults: sampleSearchResults.length,
    queryInfo: { query: 'test', isValid: true, original: 'test', matchType: 'fuzzy' as const, hasOperators: false },
    cached: false
  },
  options: {
    query: 'test',
    limit: 20,
    offset: 0
  }
};

describe('SearchMessagesTool', () => {
  let searchMessagesTool: SearchMessagesTool;
  let dependencies: SearchMessagesDependencies;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    dependencies = {
      searchEngine: mockSearchEngine
    };
    
    searchMessagesTool = new SearchMessagesTool(dependencies);
  });

  describe('constructor and basic properties', () => {
    test('should initialize correctly', () => {
      expect(searchMessagesTool.getName()).toBe('search_messages');
      expect(searchMessagesTool.getDescription()).toContain('Search through conversation history');
    });

    test('should create instance using factory method', () => {
      const tool = SearchMessagesTool.create(dependencies);
      expect(tool).toBeInstanceOf(SearchMessagesTool);
    });
  });

  describe('input validation', () => {
    test('should accept valid basic search input', async () => {
      mockSearchEngine.search.mockResolvedValue(mockEnhancedSearchResult);

      const input = {
        query: 'test'
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SearchMessagesResponse };
      expect(response.success).toBe(true);
      expect(response.data.results).toHaveLength(3);
    });

    test('should accept valid input with all optional parameters', async () => {
      mockSearchEngine.search.mockResolvedValue(mockEnhancedSearchResult);

      const input = {
        query: 'test functions',
        conversationId: 'conv-1',
        limit: 10,
        offset: 0,
        startDate: new Date('2024-01-01').toISOString(),
        endDate: new Date('2024-12-31').toISOString(),
        matchType: 'exact',
        highlightStart: '<strong>',
        highlightEnd: '</strong>'
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      expect(mockSearchEngine.search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'test functions',
          conversationId: 'conv-1',
          limit: 10,
          offset: 0,
          matchType: 'exact',
          highlightStart: '<strong>',
          highlightEnd: '</strong>'
        })
      );
    });

    test('should reject empty query', async () => {
      const input = {
        query: ''
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should reject query with only whitespace', async () => {
      const input = {
        query: '   '
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should reject invalid limit values', async () => {
      const input = {
        query: 'test',
        limit: 0
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should reject limit exceeding maximum', async () => {
      const input = {
        query: 'test',
        limit: 150
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should reject negative offset', async () => {
      const input = {
        query: 'test',
        offset: -1
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });
  });

  describe('date range validation', () => {
    test('should accept valid date range', async () => {
      mockSearchEngine.search.mockResolvedValue(mockEnhancedSearchResult);

      const input = {
        query: 'test',
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-01-02T00:00:00Z'
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBeUndefined();
    });

    test('should reject start date after end date', async () => {
      const input = {
        query: 'test',
        startDate: '2024-01-02T00:00:00Z',
        endDate: '2024-01-01T00:00:00Z'
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('Start date must be before end date');
    });
  });

  describe('search execution', () => {
    test('should perform search with correct options', async () => {
      mockSearchEngine.search.mockResolvedValue(mockEnhancedSearchResult);

      const input = {
        query: 'JavaScript testing',
        conversationId: 'conv-1',
        limit: 15,
        offset: 5,
        matchType: 'fuzzy'
      };

      const context = BaseTool.createContext();
      await searchMessagesTool.execute(input, context);

      expect(mockSearchEngine.search).toHaveBeenCalledWith({
        query: 'JavaScript testing',
        conversationId: 'conv-1',
        limit: 15,
        offset: 5,
        matchType: 'fuzzy',
        highlightStart: '<mark>',
        highlightEnd: '</mark>',
        startDate: undefined,
        endDate: undefined
      });
    });

    test('should handle search engine errors', async () => {
      mockSearchEngine.search.mockRejectedValue(new Error('Search engine error'));

      const input = {
        query: 'test'
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
    });

    test('should reject overly long queries', async () => {
      const longQuery = 'a'.repeat(1001);
      const input = {
        query: longQuery
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('too long');
    });
  });

  describe('result enhancement', () => {
    test('should enhance results with rank and context', async () => {
      mockSearchEngine.search.mockResolvedValue(mockEnhancedSearchResult);

      const input = {
        query: 'test'
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SearchMessagesResponse };
      const enhancedResults = response.data.results;

      expect(enhancedResults[0].rank).toBe(1);
      expect(enhancedResults[1].rank).toBe(2);
      expect(enhancedResults[2].rank).toBe(3);

      expect(enhancedResults[0].context).toBeDefined();
      expect(enhancedResults[0].context!.query).toBe('test');
      expect(enhancedResults[0].context!.totalResults).toBe(3);
    });

    test('should extract matched terms from snippets', async () => {
      mockSearchEngine.search.mockResolvedValue(mockEnhancedSearchResult);

      const input = {
        query: 'test functions'
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SearchMessagesResponse };
      const enhancedResults = response.data.results;

      expect(enhancedResults[0].matchedTerms).toContain('test');
      // Note: 'functions' might not be in the snippet, so it might not be extracted
    });
  });

  describe('response metadata', () => {
    test('should include correct metadata in response', async () => {
      mockSearchEngine.search.mockResolvedValue(mockEnhancedSearchResult);

      const input = {
        query: 'test functions',
        limit: 10,
        offset: 5
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SearchMessagesResponse };
      
      expect(response.data.metadata).toBeDefined();
      expect(response.data.metadata.processedQuery).toBe('test functions');
      expect(response.data.metadata.searchDuration).toBeGreaterThanOrEqual(0);
      expect(response.data.metadata.conversationsSearched).toBe(2); // conv-1 and conv-2
      expect(response.data.metadata.searchOptions.limit).toBe(10);
      expect(response.data.metadata.searchOptions.offset).toBe(5);
    });

    test('should calculate pagination correctly', async () => {
      mockSearchEngine.search.mockResolvedValue(mockEnhancedSearchResult);

      const input = {
        query: 'test',
        limit: 20,
        offset: 10
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SearchMessagesResponse };
      
      expect(response.data.pagination.offset).toBe(10);
      expect(response.data.pagination.limit).toBe(20);
      expect(response.data.hasMore).toBe(false); // Only 3 results, less than limit
    });

    test('should indicate hasMore when results equal limit', async () => {
      // Return results equal to the limit to simulate more available
      const manyResults = Array(20).fill(null).map((_, index) => ({
        ...sampleSearchResults[0],
        message: { ...sampleSearchResults[0].message, id: `msg-${index}` }
      })) as FormattedSearchResult[];
      
      mockSearchEngine.search.mockResolvedValue({
        results: { data: manyResults, hasMore: false },
        stats: { queryTime: 50, totalResults: manyResults.length, filteredResults: manyResults.length, queryInfo: { query: 'test', isValid: true, original: 'test', matchType: 'fuzzy' as const, hasOperators: false }, cached: false },
        options: { query: 'test', limit: 20, offset: 0 }
      });

      const input = {
        query: 'test',
        limit: 20,
        offset: 0
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SearchMessagesResponse };
      
      expect(response.data.hasMore).toBe(true);
      expect(response.data.pagination.nextOffset).toBe(20);
    });
  });

  describe('empty results handling', () => {
    test('should handle empty search results', async () => {
      mockSearchEngine.search.mockResolvedValue({
        results: { data: [], hasMore: false },
        stats: { queryTime: 10, totalResults: 0, filteredResults: 0, queryInfo: { query: 'test', isValid: true, original: 'test', matchType: 'fuzzy' as const, hasOperators: false }, cached: false },
        options: { query: 'test', limit: 20, offset: 0 }
      });

      const input = {
        query: 'nonexistent term'
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SearchMessagesResponse };
      
      expect(response.success).toBe(true);
      expect(response.data.results).toHaveLength(0);
      expect(response.data.totalCount).toBe(0);
      expect(response.data.hasMore).toBe(false);
      expect(response.data.metadata.conversationsSearched).toBe(0);
    });
  });

  describe('security validation', () => {
    test('should reject queries with SQL injection patterns', async () => {
      const maliciousQueries = [
        "test'; DROP TABLE messages; --",
        "test UNION SELECT * FROM conversations",
        "test /* comment */ SELECT",
        'test" OR 1=1 --'
      ];

      for (const query of maliciousQueries) {
        const input = { query };
        const context = BaseTool.createContext();
        const result = await searchMessagesTool.execute(input, context);

        expect(result.isError).toBe(true);
        const response = JSON.parse(result.content[0].text!);
        expect(response.success).toBe(false);
        expect(response.error).toBe('ValidationError');
        expect(response.message).toContain('dangerous patterns');
      }
    });

    test('should accept safe queries that might look suspicious', async () => {
      mockSearchEngine.search.mockResolvedValue({
        results: { data: [], hasMore: false },
        stats: { queryTime: 10, totalResults: 0, filteredResults: 0, queryInfo: { query: 'test', isValid: true, original: 'test', matchType: 'fuzzy' as const, hasOperators: false }, cached: false },
        options: { query: 'test', limit: 20, offset: 0 }
      });

      const safeQueries = [
        "What's the difference between INSERT and UPDATE?",
        "How to SELECT data from database?",
        "SQL tutorial for beginners"
      ];

      for (const query of safeQueries) {
        const input = { query };
        const context = BaseTool.createContext();
        const result = await searchMessagesTool.execute(input, context);

        expect(result.isError).toBeUndefined();
      }
    });

    test('should reject excessive offset values', async () => {
      const input = {
        query: 'test',
        offset: 10001
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('cannot exceed 10,000');
    });
  });

  describe('total count estimation', () => {
    test('should estimate total count when results equal limit', async () => {
      const fullResults = Array(20).fill(null).map((_, index) => ({
        ...sampleSearchResults[0],
        message: { ...sampleSearchResults[0].message, id: `msg-${index}` }
      })) as FormattedSearchResult[];
      
      mockSearchEngine.search.mockResolvedValue({
        results: { data: fullResults, hasMore: false },
        stats: { queryTime: 50, totalResults: fullResults.length, filteredResults: fullResults.length, queryInfo: { query: 'test', isValid: true, original: 'test', matchType: 'fuzzy' as const, hasOperators: false }, cached: false },
        options: { query: 'test', limit: 20, offset: 10 }
      });

      const input = {
        query: 'test',
        limit: 20,
        offset: 10
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SearchMessagesResponse };
      
      // When results equal limit, estimate at least offset + limit + 1
      expect(response.data.totalCount).toBe(31); // 10 + 20 + 1
    });

    test('should return exact count when results are less than limit', async () => {
      mockSearchEngine.search.mockResolvedValue(mockEnhancedSearchResult);

      const input = {
        query: 'test',
        limit: 20,
        offset: 5
      };

      const context = BaseTool.createContext();
      const result = await searchMessagesTool.execute(input, context);

      const response = JSON.parse(result.content[0].text!) as { success: boolean; data: SearchMessagesResponse };
      
      // When results < limit, total = offset + actual results
      expect(response.data.totalCount).toBe(8); // 5 + 3
    });
  });
});