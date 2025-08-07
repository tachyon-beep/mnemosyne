/**
 * Search Result Formatter - Handles result formatting with snippets and highlighting
 *
 * This module provides:
 * - Snippet generation with configurable length
 * - Custom highlighting with configurable markers
 * - Result ranking and sorting
 * - Text truncation with context preservation
 * - HTML/Markdown safe highlighting
 * - Multiple highlight styles support
 */
/**
 * Search result formatter with advanced snippet generation
 */
export class SearchResultFormatter {
    static DEFAULT_SNIPPET_OPTIONS = {
        maxLength: 200,
        contextLength: 50,
        highlightStart: '<mark>',
        highlightEnd: '</mark>',
        ellipsis: '...',
        preserveWords: true,
        maxHighlights: 10
    };
    /**
     * Format search results with enhanced snippets
     */
    static formatResults(results, query, options) {
        const opts = { ...this.DEFAULT_SNIPPET_OPTIONS, ...options };
        return results.map(result => this.formatSingleResult(result, query, opts));
    }
    /**
     * Format a single search result
     */
    static formatSingleResult(result, query, options) {
        const { message, score, snippet, conversationTitle } = result;
        // Parse query to extract search terms
        const searchTerms = this.extractSearchTerms(query);
        // Generate enhanced snippet
        const snippetInfo = this.generateEnhancedSnippet(message.content, searchTerms, options);
        return {
            message,
            score,
            snippet: snippet || snippetInfo.snippet,
            conversationTitle,
            enhancedSnippet: snippetInfo.snippet,
            matchCount: snippetInfo.matchCount,
            highlightedTerms: snippetInfo.highlightedTerms,
            snippetStart: snippetInfo.start,
            snippetEnd: snippetInfo.end
        };
    }
    /**
     * Generate an enhanced snippet with highlighting
     */
    static generateEnhancedSnippet(content, searchTerms, options) {
        const opts = { ...this.DEFAULT_SNIPPET_OPTIONS, ...options };
        if (!content || !searchTerms.length) {
            return {
                snippet: this.truncateText(content, opts.maxLength, opts.ellipsis, opts.preserveWords),
                matchCount: 0,
                highlightedTerms: [],
                start: 0,
                end: Math.min(content.length, opts.maxLength)
            };
        }
        // Find all matches for all search terms
        const matches = this.findAllMatches(content, searchTerms);
        if (matches.length === 0) {
            const truncated = this.truncateText(content, opts.maxLength, opts.ellipsis, opts.preserveWords);
            return {
                snippet: truncated,
                matchCount: 0,
                highlightedTerms: [],
                start: 0,
                end: Math.min(content.length, opts.maxLength)
            };
        }
        // Find the best snippet region
        const bestRegion = this.findBestSnippetRegion(content, matches, opts);
        // Extract snippet content
        const snippetContent = content.slice(bestRegion.start, bestRegion.end);
        // Apply highlighting
        const highlightedSnippet = this.applyHighlighting(snippetContent, searchTerms, bestRegion.start, opts);
        // Add ellipsis if needed
        const finalSnippet = this.addEllipsis(highlightedSnippet, bestRegion.start > 0, bestRegion.end < content.length, opts.ellipsis);
        return {
            snippet: finalSnippet,
            matchCount: matches.length,
            highlightedTerms: [...new Set(matches.map(m => m.term))],
            start: bestRegion.start,
            end: bestRegion.end
        };
    }
    /**
     * Find all matches for search terms in content
     */
    static findAllMatches(content, searchTerms) {
        const matches = [];
        for (const term of searchTerms) {
            if (!term.trim())
                continue;
            // Create case-insensitive regex for the term
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escapedTerm, 'gi');
            let match;
            while ((match = regex.exec(content)) !== null) {
                matches.push({
                    start: match.index,
                    end: match.index + match[0].length,
                    term: match[0],
                    length: match[0].length
                });
                // Prevent infinite loop on zero-length matches
                if (match[0].length === 0) {
                    regex.lastIndex++;
                }
            }
        }
        // Sort matches by position
        return matches.sort((a, b) => a.start - b.start);
    }
    /**
     * Find the best region for snippet extraction
     */
    static findBestSnippetRegion(content, matches, options) {
        if (matches.length === 0) {
            return { start: 0, end: Math.min(content.length, options.maxLength) };
        }
        // Find the region with the highest density of matches
        let bestStart = 0;
        let bestEnd = Math.min(content.length, options.maxLength);
        let bestScore = 0;
        // Try different starting positions around matches
        for (const match of matches.slice(0, 5)) { // Limit to first few matches
            const regionStart = Math.max(0, match.start - options.contextLength);
            const regionEnd = Math.min(content.length, regionStart + options.maxLength);
            // Count matches in this region
            const matchesInRegion = matches.filter(m => m.start >= regionStart && m.end <= regionEnd);
            // Score based on number of matches and their coverage
            const score = matchesInRegion.length +
                (matchesInRegion.reduce((sum, m) => sum + m.length, 0) / options.maxLength);
            if (score > bestScore) {
                bestScore = score;
                bestStart = regionStart;
                bestEnd = regionEnd;
            }
        }
        // Adjust boundaries to preserve word boundaries if requested
        if (options.preserveWords) {
            const adjusted = this.adjustBoundariesForWords(content, bestStart, bestEnd);
            bestStart = adjusted.start;
            bestEnd = adjusted.end;
        }
        return { start: bestStart, end: bestEnd };
    }
    /**
     * Adjust snippet boundaries to preserve word boundaries
     */
    static adjustBoundariesForWords(content, start, end) {
        let adjustedStart = start;
        let adjustedEnd = end;
        // Adjust start to not break words (unless at beginning)
        if (start > 0 && !/\s/.test(content[start - 1]) && !/\s/.test(content[start])) {
            // Find previous word boundary
            while (adjustedStart > 0 && !/\s/.test(content[adjustedStart - 1])) {
                adjustedStart--;
            }
        }
        // Adjust end to not break words (unless at end)
        if (end < content.length && !/\s/.test(content[end - 1]) && !/\s/.test(content[end])) {
            // Find next word boundary
            while (adjustedEnd < content.length && !/\s/.test(content[adjustedEnd])) {
                adjustedEnd++;
            }
        }
        return { start: adjustedStart, end: adjustedEnd };
    }
    /**
     * Apply highlighting to snippet content
     */
    static applyHighlighting(content, searchTerms, _contentOffset, options) {
        // Find matches in the snippet content
        const matches = this.findAllMatches(content, searchTerms);
        if (matches.length === 0) {
            return content;
        }
        // Sort matches by position (descending) to replace from end to start
        const sortedMatches = matches
            .slice(0, options.maxHighlights)
            .sort((a, b) => b.start - a.start);
        let highlightedContent = content;
        // Apply highlights from end to start to preserve positions
        for (const match of sortedMatches) {
            const before = highlightedContent.slice(0, match.start);
            const highlighted = options.highlightStart + match.term + options.highlightEnd;
            const after = highlightedContent.slice(match.end);
            highlightedContent = before + highlighted + after;
        }
        return highlightedContent;
    }
    /**
     * Add ellipsis to snippet if needed
     */
    static addEllipsis(snippet, hasContentBefore, hasContentAfter, ellipsis) {
        let result = snippet;
        if (hasContentBefore) {
            result = ellipsis + result;
        }
        if (hasContentAfter) {
            result = result + ellipsis;
        }
        return result;
    }
    /**
     * Extract search terms from query string
     */
    static extractSearchTerms(query) {
        if (!query || typeof query !== 'string') {
            return [];
        }
        // Handle quoted phrases
        const quotedPhrases = [];
        const quotedMatches = query.match(/"([^"]*)"/g);
        if (quotedMatches) {
            quotedMatches.forEach(match => {
                const phrase = match.slice(1, -1); // Remove quotes
                if (phrase.trim()) {
                    quotedPhrases.push(phrase);
                }
            });
        }
        // Remove quoted phrases from query and get individual terms
        let remainingQuery = query;
        if (quotedMatches) {
            quotedMatches.forEach(match => {
                remainingQuery = remainingQuery.replace(match, ' ');
            });
        }
        // Extract individual terms
        const individualTerms = remainingQuery
            .split(/\s+/)
            .map(term => term.replace(/['"*(){}[\]\\]/g, '').trim())
            .filter(term => term.length > 0);
        // Combine quoted phrases and individual terms
        return [...quotedPhrases, ...individualTerms];
    }
    /**
     * Truncate text to specified length
     */
    static truncateText(text, maxLength, ellipsis = '...', preserveWords = true) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        let truncated = text.slice(0, maxLength);
        if (preserveWords) {
            // Find the last space within the limit
            const lastSpace = truncated.lastIndexOf(' ');
            if (lastSpace > maxLength * 0.8) { // Only if it's not too short
                truncated = truncated.slice(0, lastSpace);
            }
        }
        return truncated + ellipsis;
    }
    /**
     * Remove highlighting from text
     */
    static removeHighlighting(text, highlightStart, highlightEnd) {
        const start = highlightStart || this.DEFAULT_SNIPPET_OPTIONS.highlightStart;
        const end = highlightEnd || this.DEFAULT_SNIPPET_OPTIONS.highlightEnd;
        const startRegex = new RegExp(this.escapeRegex(start), 'g');
        const endRegex = new RegExp(this.escapeRegex(end), 'g');
        return text.replace(startRegex, '').replace(endRegex, '');
    }
    /**
     * Escape special regex characters
     */
    static escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /**
     * Create a plain text snippet from HTML content
     */
    static createPlainTextSnippet(htmlContent, searchTerms, options) {
        // Strip HTML tags
        const plainText = htmlContent.replace(/<[^>]*>/g, '');
        // Generate snippet
        const snippetInfo = this.generateEnhancedSnippet(plainText, searchTerms, {
            ...options,
            highlightStart: '',
            highlightEnd: ''
        });
        return snippetInfo.snippet;
    }
    /**
     * Get snippet statistics
     */
    static getSnippetStats(content, searchTerms) {
        const matches = this.findAllMatches(content, searchTerms);
        const uniqueTerms = new Set(matches.map(m => m.term.toLowerCase()));
        return {
            totalMatches: matches.length,
            uniqueTermsMatched: uniqueTerms.size,
            matchDensity: content.length > 0 ? matches.length / content.length : 0
        };
    }
}
//# sourceMappingURL=SearchResultFormatter.js.map