/**
 * SearchResultFormatter Unit Tests
 * 
 * Tests for result formatting, snippet generation, and highlighting functionality
 */

import { SearchResultFormatter, SnippetOptions } from '../../../src/search/SearchResultFormatter';
import { SearchResult, Message } from '../../../src/types/interfaces';

describe('SearchResultFormatter', () => {
  // Helper function to create test messages
  const createTestMessage = (id: string, content: string, conversationId: string = 'conv-1'): Message => ({
    id,
    conversationId,
    role: 'user',
    content,
    createdAt: Date.now(),
    metadata: {}
  });

  // Helper function to create test search results
  const createTestSearchResult = (messageContent: string, score: number = 1.0, snippet?: string): SearchResult => ({
    message: createTestMessage('msg-1', messageContent),
    score,
    snippet: snippet || messageContent.substring(0, 50),
    conversationTitle: 'Test Conversation'
  });

  describe('formatResults', () => {
    it('should format basic search results', () => {
      const results: SearchResult[] = [
        createTestSearchResult('Hello world this is a test message'),
        createTestSearchResult('Another test message with different content')
      ];

      const formatted = SearchResultFormatter.formatResults(results, 'test');

      expect(formatted).toHaveLength(2);
      expect(formatted[0]).toHaveProperty('enhancedSnippet');
      expect(formatted[0]).toHaveProperty('matchCount');
      expect(formatted[0]).toHaveProperty('highlightedTerms');
    });

    it('should apply custom highlighting options', () => {
      const results = [createTestSearchResult('Hello world test message')];
      const options: SnippetOptions = {
        highlightStart: '**',
        highlightEnd: '**',
        maxLength: 50
      };

      const formatted = SearchResultFormatter.formatResults(results, 'test', options);

      expect(formatted[0].enhancedSnippet).toContain('**test**');
    });

    it('should handle empty results', () => {
      const formatted = SearchResultFormatter.formatResults([], 'test');

      expect(formatted).toHaveLength(0);
    });
  });

  describe('generateEnhancedSnippet', () => {
    describe('basic functionality', () => {
      it('should generate snippet with highlighting', () => {
        const content = 'This is a test message with some important content';
        const searchTerms = ['test', 'important'];

        const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms);

        expect(result.snippet).toContain('<mark>test</mark>');
        expect(result.snippet).toContain('<mark>important</mark>');
        expect(result.matchCount).toBe(2);
        expect(result.highlightedTerms).toContain('test');
        expect(result.highlightedTerms).toContain('important');
      });

      it('should handle case-insensitive matching', () => {
        const content = 'This is a TEST message with IMPORTANT content';
        const searchTerms = ['test', 'important'];

        const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms);

        expect(result.snippet).toContain('<mark>TEST</mark>');
        expect(result.snippet).toContain('<mark>IMPORTANT</mark>');
        expect(result.matchCount).toBe(2);
      });

      it('should handle no matches gracefully', () => {
        const content = 'This is some content without the search terms';
        const searchTerms = ['missing', 'absent'];

        const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms);

        expect(result.snippet).toBe(content);
        expect(result.matchCount).toBe(0);
        expect(result.highlightedTerms).toHaveLength(0);
      });

      it('should handle empty content', () => {
        const result = SearchResultFormatter.generateEnhancedSnippet('', ['test']);

        expect(result.snippet).toBe('');
        expect(result.matchCount).toBe(0);
        expect(result.start).toBe(0);
        expect(result.end).toBe(0);
      });

      it('should handle empty search terms', () => {
        const content = 'This is some test content';
        const result = SearchResultFormatter.generateEnhancedSnippet(content, []);

        expect(result.snippet).toBe(content);
        expect(result.matchCount).toBe(0);
      });
    });

    describe('snippet length management', () => {
      it('should truncate long content', () => {
        const longContent = 'This is a very long piece of content that should be truncated. '.repeat(10);
        const searchTerms = ['content'];
        const options: SnippetOptions = { maxLength: 100 };

        const result = SearchResultFormatter.generateEnhancedSnippet(longContent, searchTerms, options);

        expect(result.snippet.length).toBeLessThanOrEqual(150); // Account for highlighting markup and ellipsis
      });

      it('should preserve short content fully', () => {
        const shortContent = 'Short test content';
        const searchTerms = ['test'];

        const result = SearchResultFormatter.generateEnhancedSnippet(shortContent, searchTerms);

        expect(result.snippet).toContain('<mark>test</mark>');
        expect(result.snippet.replace(/<[^>]*>/g, '')).toBe(shortContent);
      });

      it('should find best region with multiple matches', () => {
        const content = 'Start test middle another test and more test content at the end';
        const searchTerms = ['test'];
        const options: SnippetOptions = { maxLength: 30, contextLength: 10 };

        const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms, options);

        // Should include multiple matches if possible
        const matchCount = (result.snippet.match(/<mark>test<\/mark>/g) || []).length;
        expect(matchCount).toBeGreaterThanOrEqual(1);
      });
    });

    describe('word boundary preservation', () => {
      it('should preserve word boundaries when enabled', () => {
        const content = 'This is a test message with important content that should be preserved';
        const searchTerms = ['important'];
        const options: SnippetOptions = { 
          maxLength: 40, 
          preserveWords: true 
        };

        const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms, options);

        // Should not cut words in the middle
        const plainSnippet = result.snippet.replace(/<[^>]*>/g, '');
        const words = plainSnippet.split(/\s+/);
        
        // Words should be complete (not empty and containing actual content)
        expect(words[0].length).toBeGreaterThan(0);
        expect(words[words.length - 1].length).toBeGreaterThan(0);
      });

      it('should break words when preservation is disabled', () => {
        const content = 'This is a test message with important content';
        const searchTerms = ['test'];
        const options: SnippetOptions = { 
          maxLength: 20, 
          preserveWords: false 
        };

        const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms, options);

        expect(result.snippet).toContain('<mark>test</mark>');
        // Length should be closer to maxLength when not preserving words
      });
    });

    describe('ellipsis handling', () => {
      it('should add ellipsis when content is truncated', () => {
        const longContent = 'Start of content with test in middle and more content at the end that will be truncated';
        const searchTerms = ['test'];
        const options: SnippetOptions = { 
          maxLength: 40,
          ellipsis: '...'
        };

        const result = SearchResultFormatter.generateEnhancedSnippet(longContent, searchTerms, options);

        expect(result.snippet).toContain('...');
      });

      it('should use custom ellipsis character', () => {
        const longContent = 'Very long content with test that needs truncation';
        const searchTerms = ['test'];
        const options: SnippetOptions = { 
          maxLength: 20,
          ellipsis: '>>>>'
        };

        const result = SearchResultFormatter.generateEnhancedSnippet(longContent, searchTerms, options);

        expect(result.snippet).toContain('>>>>');
      });

      it('should not add ellipsis for short content', () => {
        const shortContent = 'Short test';
        const searchTerms = ['test'];
        const options: SnippetOptions = { ellipsis: '...' };

        const result = SearchResultFormatter.generateEnhancedSnippet(shortContent, searchTerms, options);

        expect(result.snippet).not.toContain('...');
      });
    });

    describe('highlighting customization', () => {
      it('should use custom highlight markers', () => {
        const content = 'This is a test message';
        const searchTerms = ['test'];
        const options: SnippetOptions = {
          highlightStart: '[[',
          highlightEnd: ']]'
        };

        const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms, options);

        expect(result.snippet).toContain('[[test]]');
        expect(result.snippet).not.toContain('<mark>');
      });

      it('should limit number of highlights', () => {
        const content = 'test test test test test test';
        const searchTerms = ['test'];
        const options: SnippetOptions = { maxHighlights: 3 };

        const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms, options);

        const highlightCount = (result.snippet.match(/<mark>/g) || []).length;
        expect(highlightCount).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('utility methods', () => {
    describe('removeHighlighting', () => {
      it('should remove default highlighting', () => {
        const highlighted = 'This is a <mark>test</mark> message';
        const result = SearchResultFormatter.removeHighlighting(highlighted);

        expect(result).toBe('This is a test message');
      });

      it('should remove custom highlighting', () => {
        const highlighted = 'This is a **test** message';
        const result = SearchResultFormatter.removeHighlighting(highlighted, '**', '**');

        expect(result).toBe('This is a test message');
      });

      it('should handle multiple highlights', () => {
        const highlighted = 'This <mark>is</mark> a <mark>test</mark> message';
        const result = SearchResultFormatter.removeHighlighting(highlighted);

        expect(result).toBe('This is a test message');
      });
    });

    describe('createPlainTextSnippet', () => {
      it('should strip HTML tags', () => {
        const htmlContent = '<p>This is a <strong>test</strong> message</p>';
        const searchTerms = ['test'];

        const result = SearchResultFormatter.createPlainTextSnippet(htmlContent, searchTerms);

        expect(result).not.toContain('<p>');
        expect(result).not.toContain('<strong>');
        expect(result).toContain('test');
      });

      it('should generate snippet from plain text', () => {
        const htmlContent = '<div>This is a test message with <em>formatting</em></div>';
        const searchTerms = ['test'];

        const result = SearchResultFormatter.createPlainTextSnippet(htmlContent, searchTerms);

        expect(result).toContain('test');
        expect(result).not.toContain('<div>');
        expect(result).not.toContain('<em>');
      });
    });

    describe('getSnippetStats', () => {
      it('should calculate match statistics', () => {
        const content = 'This is a test message with test content and more test words';
        const searchTerms = ['test', 'content'];

        const stats = SearchResultFormatter.getSnippetStats(content, searchTerms);

        expect(stats.totalMatches).toBe(4); // 3 'test' + 1 'content'
        expect(stats.uniqueTermsMatched).toBe(2); // 'test' and 'content'
        expect(stats.matchDensity).toBeGreaterThan(0);
      });

      it('should handle no matches', () => {
        const content = 'This is some content';
        const searchTerms = ['missing', 'absent'];

        const stats = SearchResultFormatter.getSnippetStats(content, searchTerms);

        expect(stats.totalMatches).toBe(0);
        expect(stats.uniqueTermsMatched).toBe(0);
        expect(stats.matchDensity).toBe(0);
      });

      it('should handle empty content', () => {
        const stats = SearchResultFormatter.getSnippetStats('', ['test']);

        expect(stats.totalMatches).toBe(0);
        expect(stats.uniqueTermsMatched).toBe(0);
        expect(stats.matchDensity).toBe(0);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in search terms', () => {
      const content = 'This is a test with (parentheses) and [brackets]';
      const searchTerms = ['(parentheses)', '[brackets]'];

      const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms);

      expect(result.matchCount).toBe(2);
      expect(result.snippet).toContain('<mark>(parentheses)</mark>');
      expect(result.snippet).toContain('<mark>[brackets]</mark>');
    });

    it('should handle overlapping matches gracefully', () => {
      const content = 'testing test and more tests';
      const searchTerms = ['test', 'testing', 'tests'];

      const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms);

      expect(result.matchCount).toBeGreaterThan(0);
      expect(result.snippet).toContain('<mark>');
    });

    it('should handle Unicode characters', () => {
      const content = 'Café résumé with 日本語 test content';
      const searchTerms = ['test', 'résumé', '日本語'];

      const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms);

      expect(result.matchCount).toBe(3);
      expect(result.snippet).toContain('<mark>test</mark>');
      expect(result.snippet).toContain('<mark>résumé</mark>');
      expect(result.snippet).toContain('<mark>日本語</mark>');
    });

    it('should handle very short search terms', () => {
      const content = 'This is a test with i and a in it';
      const searchTerms = ['i', 'a'];

      const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms);

      expect(result.matchCount).toBeGreaterThan(0);
    });

    it('should handle repeated search terms', () => {
      const content = 'test test test message';
      const searchTerms = ['test', 'test', 'test'];

      const result = SearchResultFormatter.generateEnhancedSnippet(content, searchTerms);

      expect(result.matchCount).toBe(9); // Each 'test' in the array finds all 3 matches
      expect(result.highlightedTerms).toContain('test');
    });
  });

  describe('performance', () => {
    it('should handle large content efficiently', () => {
      const largeContent = 'This is a test message. '.repeat(1000) + 'Important content here.';
      const searchTerms = ['test', 'important'];
      const start = Date.now();

      const result = SearchResultFormatter.generateEnhancedSnippet(largeContent, searchTerms);
      const elapsed = Date.now() - start;

      expect(result.matchCount).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100); // Should complete quickly
    });

    it('should handle many search terms efficiently', () => {
      const content = 'This is a test message with many different words to search for';
      const manyTerms = content.split(' ');
      const start = Date.now();

      const result = SearchResultFormatter.generateEnhancedSnippet(content, manyTerms);
      const elapsed = Date.now() - start;

      expect(result.matchCount).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(50);
    });
  });
});