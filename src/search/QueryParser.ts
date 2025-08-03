/**
 * Query Parser - Handles FTS5 query parsing and sanitization
 * 
 * This module provides:
 * - Query sanitization for FTS5 safety
 * - Support for different match types (exact, fuzzy, prefix)
 * - Special character handling
 * - Query validation and transformation
 * - Phrase search support with quotes
 * - Wildcard handling for prefix search
 */

export interface ParsedQuery {
  /** The sanitized FTS5 query string */
  query: string;
  /** Whether the query is valid */
  isValid: boolean;
  /** Original query before processing */
  original: string;
  /** Detected match type */
  matchType: 'exact' | 'fuzzy' | 'prefix';
  /** Whether the query contains special operators */
  hasOperators: boolean;
  /** Error message if query is invalid */
  error?: string;
}

/**
 * Query parser for FTS5 with proper sanitization and transformation
 */
export class QueryParser {
  
  // FTS5 special characters that need escaping
  private static readonly FTS5_SPECIAL_CHARS = /['"*(){}[\]\\]/g;
  
  // Characters that indicate FTS5 operators
  private static readonly FTS5_OPERATORS = /[+\-^]/;
  
  // Minimum query length
  private static readonly MIN_QUERY_LENGTH = 1;
  
  // Maximum query length to prevent DoS
  private static readonly MAX_QUERY_LENGTH = 1000;

  /**
   * Parse and sanitize a search query for FTS5
   */
  static parseQuery(query: string, matchType?: 'exact' | 'fuzzy' | 'prefix'): ParsedQuery {
    const original = query;
    
    // Basic validation
    if (!query || typeof query !== 'string') {
      return {
        query: '',
        isValid: false,
        original,
        matchType: 'fuzzy',
        hasOperators: false,
        error: 'Query must be a non-empty string'
      };
    }

    // Trim whitespace
    query = query.trim();

    // Check length constraints
    if (query.length < this.MIN_QUERY_LENGTH) {
      return {
        query: '',
        isValid: false,
        original,
        matchType: 'fuzzy',
        hasOperators: false,
        error: 'Query is too short'
      };
    }

    if (query.length > this.MAX_QUERY_LENGTH) {
      return {
        query: '',
        isValid: false,
        original,
        matchType: 'fuzzy',
        hasOperators: false,
        error: 'Query is too long'
      };
    }

    // Detect match type if not specified
    const detectedMatchType = matchType || this.detectMatchType(query);
    
    // Check for operators
    const hasOperators = this.FTS5_OPERATORS.test(query);

    try {
      const sanitizedQuery = this.sanitizeQuery(query, detectedMatchType);
      
      return {
        query: sanitizedQuery,
        isValid: true,
        original,
        matchType: detectedMatchType,
        hasOperators
      };
    } catch (error) {
      return {
        query: '',
        isValid: false,
        original,
        matchType: detectedMatchType,
        hasOperators,
        error: error instanceof Error ? error.message : 'Query parsing failed'
      };
    }
  }

  /**
   * Detect the intended match type from query syntax
   */
  private static detectMatchType(query: string): 'exact' | 'fuzzy' | 'prefix' {
    // Check for exact match (quoted strings)
    if (this.isQuotedString(query)) {
      return 'exact';
    }
    
    // Check for prefix match (ends with *)
    if (query.endsWith('*')) {
      return 'prefix';
    }
    
    // Default to fuzzy matching
    return 'fuzzy';
  }

  /**
   * Check if query is a quoted string
   */
  private static isQuotedString(query: string): boolean {
    return (query.startsWith('"') && query.endsWith('"') && query.length > 1) ||
           (query.startsWith("'") && query.endsWith("'") && query.length > 1);
  }

  /**
   * Sanitize query based on match type
   */
  private static sanitizeQuery(query: string, matchType: 'exact' | 'fuzzy' | 'prefix'): string {
    switch (matchType) {
      case 'exact':
        return this.sanitizeExactQuery(query);
      case 'prefix':
        return this.sanitizePrefixQuery(query);
      case 'fuzzy':
      default:
        return this.sanitizeFuzzyQuery(query);
    }
  }

  /**
   * Sanitize query for exact matching
   */
  private static sanitizeExactQuery(query: string): string {
    // Remove existing quotes if present
    if (this.isQuotedString(query)) {
      query = query.slice(1, -1);
    }
    
    // Escape any remaining special characters except spaces
    const escaped = query.replace(/"/g, '""');
    
    // Wrap in quotes for exact matching
    return `"${escaped}"`;
  }

  /**
   * Sanitize query for prefix matching
   */
  private static sanitizePrefixQuery(query: string): string {
    // Remove trailing * if present
    query = query.replace(/\*+$/, '');
    
    // Escape special characters
    const escaped = this.escapeSpecialChars(query);
    
    // Add single * for prefix matching
    return `${escaped}*`;
  }

  /**
   * Sanitize query for fuzzy matching
   */
  private static sanitizeFuzzyQuery(query: string): string {
    // Split into terms and process each
    const terms = query.split(/\s+/).filter(term => term.length > 0);
    
    if (terms.length === 0) {
      throw new Error('No valid search terms found');
    }

    // Process each term
    const processedTerms = terms
      .map(term => {
        // Remove only special characters first to check if there's actual content
        const cleaned = term.replace(this.FTS5_SPECIAL_CHARS, '');
        if (cleaned.length === 0) {
          return '';
        }
        // Escape special characters
        return this.escapeSpecialChars(term);
      })
      .filter(term => term.length > 0);

    if (processedTerms.length === 0) {
      throw new Error('No valid search terms found');
    }

    // Join terms with AND operator (FTS5 default)
    return processedTerms.join(' ');
  }

  /**
   * Escape FTS5 special characters
   */
  private static escapeSpecialChars(input: string): string {
    return input.replace(this.FTS5_SPECIAL_CHARS, '\\$&');
  }

  /**
   * Validate that a query is safe for FTS5 execution
   */
  static validateQuery(query: string): { isValid: boolean; error?: string } {
    if (!query || typeof query !== 'string') {
      return { isValid: false, error: 'Query must be a string' };
    }

    // Check for potentially dangerous patterns
    const dangerousPatterns = [
      /^\s*$/,                    // Empty or whitespace-only
      /^[\s"'*(){}[\]\\]*$/,      // Only special characters
      /[\x00-\x1F]/,              // Control characters
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(query)) {
        return { isValid: false, error: 'Query contains invalid characters or patterns' };
      }
    }

    return { isValid: true };
  }

  /**
   * Create a phrase search query from multiple terms
   */
  static createPhraseQuery(terms: string[]): ParsedQuery {
    if (!Array.isArray(terms) || terms.length === 0) {
      return {
        query: '',
        isValid: false,
        original: '',
        matchType: 'exact',
        hasOperators: false,
        error: 'Terms must be a non-empty array'
      };
    }

    const phrase = terms.join(' ');
    return this.parseQuery(`"${phrase}"`, 'exact');
  }

  /**
   * Create a prefix search query
   */
  static createPrefixQuery(term: string): ParsedQuery {
    if (!term || typeof term !== 'string') {
      return {
        query: '',
        isValid: false,
        original: term || '',
        matchType: 'prefix',
        hasOperators: false,
        error: 'Term must be a non-empty string'
      };
    }

    return this.parseQuery(term, 'prefix');
  }

  /**
   * Create a fuzzy search query with multiple terms
   */
  static createFuzzyQuery(terms: string[]): ParsedQuery {
    if (!Array.isArray(terms) || terms.length === 0) {
      return {
        query: '',
        isValid: false,
        original: '',
        matchType: 'fuzzy',
        hasOperators: false,
        error: 'Terms must be a non-empty array'
      };
    }

    const query = terms.join(' ');
    return this.parseQuery(query, 'fuzzy');
  }

  /**
   * Extract individual terms from a query
   */
  static extractTerms(query: string): string[] {
    if (!query || typeof query !== 'string') {
      return [];
    }

    // Handle quoted phrases
    const quotes = query.match(/"([^"]*)"/g);
    let remaining = query;
    const terms: string[] = [];

    // Extract quoted phrases first
    if (quotes) {
      quotes.forEach(quote => {
        const content = quote.slice(1, -1); // Remove quotes
        if (content.trim()) {
          terms.push(content);
        }
        remaining = remaining.replace(quote, ' ');
      });
    }

    // Extract remaining individual terms
    const remainingTerms = remaining.split(/\s+/).filter(term => term.trim().length > 0).map(term => {
      // Remove special characters but keep the core word
      return term.replace(/['"*(){}[\]\\]/g, '');
    }).filter(term => term.length > 0);

    terms.push(...remainingTerms);
    return terms;
  }

  /**
   * Check if a query contains only safe characters for logging
   */
  static isSafeForLogging(query: string): boolean {
    // Only allow alphanumeric, spaces, and basic punctuation
    const safePattern = /^[a-zA-Z0-9\s.,!?;:()\-_'"]*$/;
    return safePattern.test(query);
  }
}