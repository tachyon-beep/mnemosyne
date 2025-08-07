/**
 * Enhanced Cache Key Generator with Content-Based Hashing
 *
 * Provides collision-resistant cache key generation using cryptographic hashing
 * and consistent key normalization for reliable cache operations.
 */
import { createHash } from 'crypto';
/**
 * Enhanced cache key generator with collision resistance
 */
export class CacheKeyGenerator {
    static DEFAULT_ALGORITHM = 'sha256';
    static DEFAULT_MAX_LENGTH = 250; // Safe length for most cache systems
    static PARAM_SEPARATOR = '|';
    static NESTED_SEPARATOR = ':';
    /**
     * Generate a collision-resistant cache key using content-based hashing
     */
    static generateKey(operation, params = {}, options = {}) {
        const { includeTimestamp = false, algorithm = CacheKeyGenerator.DEFAULT_ALGORITHM, prefix = '', maxLength = CacheKeyGenerator.DEFAULT_MAX_LENGTH, salt = '' } = options;
        // Normalize parameters for consistent hashing
        const normalized = CacheKeyGenerator.normalizeParams(params);
        // Create base content for hashing
        const baseContent = [
            operation,
            normalized.hash,
            salt,
            includeTimestamp ? Date.now().toString() : ''
        ].filter(Boolean).join(CacheKeyGenerator.PARAM_SEPARATOR);
        // Generate hash
        const hash = createHash(algorithm)
            .update(baseContent, 'utf8')
            .digest('hex');
        // Construct final key
        let key = prefix ? `${prefix}:${operation}:${hash}` : `${operation}:${hash}`;
        // Truncate if needed
        if (key.length > maxLength) {
            key = key.substring(0, maxLength);
        }
        return key;
    }
    /**
     * Generate key for query operations with parameter consistency
     */
    static generateQueryKey(queryId, sql, params = {}, options = {}) {
        // Create a stable representation of the query
        const queryContent = {
            queryId,
            sql: CacheKeyGenerator.normalizeSql(sql),
            params: CacheKeyGenerator.normalizeParams(params).params
        };
        return CacheKeyGenerator.generateKey('query', queryContent, {
            prefix: 'q',
            ...options
        });
    }
    /**
     * Generate key for analytics operations
     */
    static generateAnalyticsKey(operation, datasetId, options = {}) {
        const { context = {}, dataSize, ...keyOptions } = options;
        const analyticsContent = {
            operation,
            datasetId: datasetId.toString(),
            context: CacheKeyGenerator.normalizeParams(context).params,
            ...(dataSize !== undefined && { dataSize })
        };
        return CacheKeyGenerator.generateKey('analytics', analyticsContent, {
            prefix: 'a',
            ...keyOptions
        });
    }
    /**
     * Generate key for conversation-based operations
     */
    static generateConversationKey(operation, conversationIds, messageCount, options = {}) {
        // Sort conversation IDs for consistency
        const sortedIds = [...conversationIds].sort();
        const conversationContent = {
            operation,
            conversations: sortedIds.join(','),
            ...(messageCount !== undefined && { messageCount })
        };
        return CacheKeyGenerator.generateKey('conversation', conversationContent, {
            prefix: 'c',
            ...options
        });
    }
    /**
     * Generate key with content hash for large objects
     */
    static generateContentKey(operation, content, options = {}) {
        // Create content hash for large/complex objects
        const contentHash = CacheKeyGenerator.hashContent(content);
        return CacheKeyGenerator.generateKey(operation, { contentHash }, {
            prefix: 'content',
            ...options
        });
    }
    /**
     * Normalize parameters for consistent hashing
     */
    static normalizeParams(params) {
        const normalized = CacheKeyGenerator.deepNormalizeObject(params);
        const hash = CacheKeyGenerator.hashContent(normalized);
        return {
            params: normalized,
            original: params,
            hash
        };
    }
    /**
     * Validate cache key for potential collisions or issues
     */
    static validateKey(key) {
        const issues = [];
        const recommendations = [];
        // Check length
        if (key.length > 250) {
            issues.push('Key length exceeds recommended maximum (250 characters)');
            recommendations.push('Use shorter prefixes or increase maxLength option');
        }
        if (key.length < 10) {
            issues.push('Key is very short and may have higher collision risk');
            recommendations.push('Consider adding more context to the key generation');
        }
        // Check for problematic characters
        if (!/^[a-zA-Z0-9:_-]+$/.test(key)) {
            issues.push('Key contains potentially problematic characters');
            recommendations.push('Stick to alphanumeric characters, colons, underscores, and hyphens');
        }
        // Check for obvious patterns that might cause collisions
        if (key.includes('undefined') || key.includes('null')) {
            issues.push('Key contains undefined/null values');
            recommendations.push('Ensure all parameters are properly defined before key generation');
        }
        return {
            valid: issues.length === 0,
            issues,
            recommendations
        };
    }
    /**
     * Extract operation info from cache key
     */
    static parseKey(key) {
        const parts = key.split(':');
        if (parts.length >= 3) {
            return {
                prefix: parts[0],
                operation: parts[1],
                hash: parts[2],
                valid: true
            };
        }
        if (parts.length === 2) {
            return {
                operation: parts[0],
                hash: parts[1],
                valid: true
            };
        }
        return { valid: false };
    }
    /**
     * Deep normalize object with consistent ordering and type handling
     */
    static deepNormalizeObject(obj) {
        if (obj === null || obj === undefined) {
            return obj;
        }
        if (Array.isArray(obj)) {
            // Sort arrays of primitives for consistency
            const normalized = obj.map(item => CacheKeyGenerator.deepNormalizeObject(item));
            // Sort if all elements are primitive values
            if (normalized.every(item => typeof item !== 'object' || item === null)) {
                return normalized.sort();
            }
            return normalized;
        }
        if (typeof obj === 'object') {
            const normalized = {};
            // Sort keys for consistent ordering
            const sortedKeys = Object.keys(obj).sort();
            for (const key of sortedKeys) {
                normalized[key] = CacheKeyGenerator.deepNormalizeObject(obj[key]);
            }
            return normalized;
        }
        if (typeof obj === 'function') {
            // Convert functions to their string representation
            return obj.toString();
        }
        if (typeof obj === 'bigint') {
            return obj.toString();
        }
        if (obj instanceof Date) {
            return obj.getTime();
        }
        if (obj instanceof RegExp) {
            return obj.toString();
        }
        // Handle primitive types
        return obj;
    }
    /**
     * Normalize SQL for consistent caching
     */
    static normalizeSql(sql) {
        return sql
            .replace(/\s+/g, ' ') // Normalize whitespace
            .replace(/\n/g, ' ') // Remove line breaks
            .trim() // Remove leading/trailing whitespace
            .toLowerCase(); // Case-insensitive
    }
    /**
     * Generate content hash with collision resistance
     */
    static hashContent(content, algorithm = CacheKeyGenerator.DEFAULT_ALGORITHM) {
        let serialized;
        try {
            // Use a deterministic serialization
            serialized = JSON.stringify(content, Object.keys(content).sort());
        }
        catch (error) {
            // Fallback for circular references or complex objects
            serialized = String(content);
        }
        return createHash(algorithm)
            .update(serialized, 'utf8')
            .digest('hex');
    }
}
/**
 * Static utility functions for common cache key patterns
 */
export class CacheKeys {
    /**
     * Generate key for flow analysis operations
     */
    static flowAnalysis(conversations) {
        const conversationIds = conversations.map(c => c.conversation.id);
        return CacheKeyGenerator.generateConversationKey('flow_analysis', conversationIds, conversations.reduce((sum, c) => sum + c.messages?.length || 0, 0));
    }
    /**
     * Generate key for productivity analysis
     */
    static productivityAnalysis(conversations) {
        const conversationIds = conversations.map(c => c.conversation.id);
        return CacheKeyGenerator.generateConversationKey('productivity_analysis', conversationIds, conversations.reduce((sum, c) => sum + c.messages?.length || 0, 0));
    }
    /**
     * Generate key for knowledge gap detection
     */
    static knowledgeGapDetection(conversations) {
        const conversationIds = conversations.map(c => c.conversation.id);
        return CacheKeyGenerator.generateConversationKey('knowledge_gaps', conversationIds);
    }
    /**
     * Generate key for decision tracking
     */
    static decisionTracking(conversations) {
        const conversationIds = conversations.map(c => c.conversation.id);
        return CacheKeyGenerator.generateConversationKey('decision_tracking', conversationIds);
    }
    /**
     * Generate key for topic extraction with memoization
     */
    static topicExtraction(messageContent) {
        return CacheKeyGenerator.generateContentKey('topic_extraction', messageContent, {
            algorithm: 'sha1', // Faster for content hashing
            maxLength: 200
        });
    }
}
//# sourceMappingURL=CacheKeyGenerator.js.map