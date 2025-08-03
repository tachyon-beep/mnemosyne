/**
 * QueryParser Unit Tests
 * 
 * Tests for query parsing, sanitization, and validation functionality
 */

import { QueryParser } from '../../../src/search/QueryParser';

describe('QueryParser', () => {
  describe('parseQuery', () => {
    describe('basic validation', () => {
      it('should reject empty queries', () => {
        const result = QueryParser.parseQuery('');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('non-empty string');
      });

      it('should reject null/undefined queries', () => {
        const result1 = QueryParser.parseQuery(null as any);
        const result2 = QueryParser.parseQuery(undefined as any);
        
        expect(result1.isValid).toBe(false);
        expect(result2.isValid).toBe(false);
      });

      it('should reject queries that are too long', () => {
        const longQuery = 'a'.repeat(1001);
        const result = QueryParser.parseQuery(longQuery);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('too long');
      });

      it('should handle whitespace-only queries', () => {
        const result = QueryParser.parseQuery('   ');
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('too short');
      });
    });

    describe('match type detection', () => {
      it('should detect exact match for quoted strings', () => {
        const result1 = QueryParser.parseQuery('"hello world"');
        const result2 = QueryParser.parseQuery("'hello world'");
        
        expect(result1.matchType).toBe('exact');
        expect(result2.matchType).toBe('exact');
        expect(result1.isValid).toBe(true);
        expect(result2.isValid).toBe(true);
      });

      it('should detect prefix match for asterisk suffix', () => {
        const result = QueryParser.parseQuery('hello*');
        
        expect(result.matchType).toBe('prefix');
        expect(result.isValid).toBe(true);
      });

      it('should default to fuzzy match', () => {
        const result = QueryParser.parseQuery('hello world');
        
        expect(result.matchType).toBe('fuzzy');
        expect(result.isValid).toBe(true);
      });

      it('should respect explicit match type parameter', () => {
        const result = QueryParser.parseQuery('hello', 'exact');
        
        expect(result.matchType).toBe('exact');
        expect(result.query).toBe('"hello"');
      });
    });

    describe('operator detection', () => {
      it('should detect FTS5 operators', () => {
        const result1 = QueryParser.parseQuery('hello +world');
        const result2 = QueryParser.parseQuery('hello -world');
        const result3 = QueryParser.parseQuery('hello ^world');
        
        expect(result1.hasOperators).toBe(true);
        expect(result2.hasOperators).toBe(true);
        expect(result3.hasOperators).toBe(true);
      });

      it('should not detect operators in regular text', () => {
        const result = QueryParser.parseQuery('hello world');
        
        expect(result.hasOperators).toBe(false);
      });
    });

    describe('query sanitization', () => {
      it('should escape special characters in fuzzy mode', () => {
        const result = QueryParser.parseQuery('hello[world]');
        
        expect(result.isValid).toBe(true);
        expect(result.query).toBe('hello\\[world\\]');
      });

      it('should handle parentheses and other special chars', () => {
        const result = QueryParser.parseQuery('test(query)');
        
        expect(result.isValid).toBe(true);
        expect(result.query).toBe('test\\(query\\)');
      });

      it('should preserve quotes properly in exact mode', () => {
        const result = QueryParser.parseQuery('"hello world"', 'exact');
        
        expect(result.isValid).toBe(true);
        expect(result.query).toBe('"hello world"');
      });

      it('should escape quotes within quoted strings', () => {
        const result = QueryParser.parseQuery('"hello "nested" world"', 'exact');
        
        expect(result.isValid).toBe(true);
        expect(result.query).toBe('"hello ""nested"" world"');
      });
    });
  });

  describe('exact query sanitization', () => {
    it('should wrap unquoted strings in quotes', () => {
      const result = QueryParser.parseQuery('hello world', 'exact');
      
      expect(result.query).toBe('"hello world"');
    });

    it('should preserve existing quotes', () => {
      const result = QueryParser.parseQuery('"hello world"', 'exact');
      
      expect(result.query).toBe('"hello world"');
    });

    it('should handle mixed quotes', () => {
      const result = QueryParser.parseQuery("'hello world'", 'exact');
      
      expect(result.query).toBe('"hello world"');
    });
  });

  describe('prefix query sanitization', () => {
    it('should add asterisk to unadorned terms', () => {
      const result = QueryParser.parseQuery('hello', 'prefix');
      
      expect(result.query).toBe('hello*');
    });

    it('should handle existing asterisk', () => {
      const result = QueryParser.parseQuery('hello*', 'prefix');
      
      expect(result.query).toBe('hello*');
    });

    it('should remove multiple trailing asterisks', () => {
      const result = QueryParser.parseQuery('hello***', 'prefix');
      
      expect(result.query).toBe('hello*');
    });

    it('should escape special characters before adding asterisk', () => {
      const result = QueryParser.parseQuery('hello[world]', 'prefix');
      
      expect(result.query).toBe('hello\\[world\\]*');
    });
  });

  describe('fuzzy query sanitization', () => {
    it('should join multiple terms with spaces', () => {
      const result = QueryParser.parseQuery('hello world test', 'fuzzy');
      
      expect(result.query).toBe('hello world test');
    });

    it('should handle extra whitespace', () => {
      const result = QueryParser.parseQuery('  hello    world  ', 'fuzzy');
      
      expect(result.query).toBe('hello world');
    });

    it('should escape special characters in each term', () => {
      const result = QueryParser.parseQuery('hello[test] world(query)', 'fuzzy');
      
      expect(result.query).toBe('hello\\[test\\] world\\(query\\)');
    });

    it('should reject queries with no valid terms', () => {
      const result = QueryParser.parseQuery('   [](){}\\"   ', 'fuzzy');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('No valid search terms found');
    });
  });

  describe('validateQuery', () => {
    it('should validate normal queries', () => {
      const result = QueryParser.validateQuery('hello world');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty queries', () => {
      const result = QueryParser.validateQuery('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should reject whitespace-only queries', () => {
      const result = QueryParser.validateQuery('   ');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject queries with only special characters', () => {
      const result = QueryParser.validateQuery('[](){}*"');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });

    it('should reject queries with control characters', () => {
      const result = QueryParser.validateQuery('hello\x00world');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('invalid characters');
    });
  });

  describe('helper methods', () => {
    describe('createPhraseQuery', () => {
      it('should create phrase query from term array', () => {
        const result = QueryParser.createPhraseQuery(['hello', 'world', 'test']);
        
        expect(result.isValid).toBe(true);
        expect(result.query).toBe('"hello world test"');
        expect(result.matchType).toBe('exact');
      });

      it('should handle empty array', () => {
        const result = QueryParser.createPhraseQuery([]);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('non-empty array');
      });

      it('should handle invalid input', () => {
        const result = QueryParser.createPhraseQuery(null as any);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('non-empty array');
      });
    });

    describe('createPrefixQuery', () => {
      it('should create prefix query from term', () => {
        const result = QueryParser.createPrefixQuery('hello');
        
        expect(result.isValid).toBe(true);
        expect(result.query).toBe('hello*');
        expect(result.matchType).toBe('prefix');
      });

      it('should handle empty term', () => {
        const result = QueryParser.createPrefixQuery('');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('non-empty string');
      });
    });

    describe('createFuzzyQuery', () => {
      it('should create fuzzy query from term array', () => {
        const result = QueryParser.createFuzzyQuery(['hello', 'world']);
        
        expect(result.isValid).toBe(true);
        expect(result.query).toBe('hello world');
        expect(result.matchType).toBe('fuzzy');
      });

      it('should handle empty array', () => {
        const result = QueryParser.createFuzzyQuery([]);
        
        expect(result.isValid).toBe(false);
        expect(result.error).toContain('non-empty array');
      });
    });

    describe('extractTerms', () => {
      it('should extract terms from simple query', () => {
        const terms = QueryParser.extractTerms('hello world test');
        
        expect(terms).toEqual(['hello', 'world', 'test']);
      });

      it('should extract quoted phrases', () => {
        const terms = QueryParser.extractTerms('hello "world test" foo');
        
        expect(terms).toContain('world test');
        expect(terms).toContain('hello');
        expect(terms).toContain('foo');
      });

      it('should handle multiple quoted phrases', () => {
        const terms = QueryParser.extractTerms('"first phrase" "second phrase" term');
        
        expect(terms).toContain('first phrase');
        expect(terms).toContain('second phrase');
        expect(terms).toContain('term');
      });

      it('should filter out special characters', () => {
        const terms = QueryParser.extractTerms('hello [world] (test)');
        
        expect(terms).toEqual(['hello', 'world', 'test']);
      });

      it('should handle empty query', () => {
        const terms = QueryParser.extractTerms('');
        
        expect(terms).toEqual([]);
      });
    });

    describe('isSafeForLogging', () => {
      it('should approve safe queries', () => {
        const result = QueryParser.isSafeForLogging('hello world 123');
        
        expect(result).toBe(true);
      });

      it('should approve queries with basic punctuation', () => {
        const result = QueryParser.isSafeForLogging('hello, world! How are you?');
        
        expect(result).toBe(true);
      });

      it('should reject queries with dangerous characters', () => {
        const result = QueryParser.isSafeForLogging('hello<script>alert(1)</script>');
        
        expect(result).toBe(false);
      });

      it('should reject queries with control characters', () => {
        const result = QueryParser.isSafeForLogging('hello\x00world');
        
        expect(result).toBe(false);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle Unicode characters', () => {
      const result = QueryParser.parseQuery('café résumé 日本語');
      
      expect(result.isValid).toBe(true);
      expect(result.query).toBe('café résumé 日本語');
    });

    it('should handle very short queries', () => {
      const result = QueryParser.parseQuery('a');
      
      expect(result.isValid).toBe(true);
      expect(result.query).toBe('a');
    });

    it('should handle queries at maximum length', () => {
      const maxQuery = 'a'.repeat(1000);
      const result = QueryParser.parseQuery(maxQuery);
      
      expect(result.isValid).toBe(true);
    });

    it('should preserve original query in result', () => {
      const original = '"hello world"';
      const result = QueryParser.parseQuery(original);
      
      expect(result.original).toBe(original);
    });

    it('should handle nested quotes safely', () => {
      const result = QueryParser.parseQuery('hello "world with "nested" quotes" test');
      
      expect(result.isValid).toBe(true);
      // Should handle this gracefully without breaking
    });

    it('should handle unmatched quotes', () => {
      const result = QueryParser.parseQuery('hello "world without closing quote');
      
      expect(result.isValid).toBe(true);
      // Should not treat as exact match if quote is unmatched
      expect(result.matchType).toBe('fuzzy');
    });
  });

  describe('performance considerations', () => {
    it('should handle moderately complex queries efficiently', () => {
      const complexQuery = 'hello world "exact phrase" prefix* +required -excluded';
      const start = Date.now();
      
      const result = QueryParser.parseQuery(complexQuery);
      const elapsed = Date.now() - start;
      
      expect(result.isValid).toBe(true);
      expect(elapsed).toBeLessThan(10); // Should be very fast
    });

    it('should handle repeated parsing efficiently', () => {
      const query = 'hello world test';
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        QueryParser.parseQuery(query);
      }
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(100); // Should be fast even with repetition
    });
  });
});