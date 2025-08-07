/**
 * Test suite for enhanced cache key generation and size estimation
 */

import { CacheKeyGenerator, CacheKeys } from '../src/utils/CacheKeyGenerator.js';
import { SizeEstimator, SizeUtils } from '../src/utils/SizeEstimator.js';

describe('Enhanced Cache Key Generation', () => {
  describe('CacheKeyGenerator', () => {
    test('should generate consistent keys for identical inputs', () => {
      const params1 = { userId: '123', type: 'flow', limit: 50 };
      const params2 = { limit: 50, type: 'flow', userId: '123' }; // Different order
      
      const key1 = CacheKeyGenerator.generateKey('analysis', params1);
      const key2 = CacheKeyGenerator.generateKey('analysis', params2);
      
      expect(key1).toBe(key2);
      expect(key1.length).toBeGreaterThan(10);
      expect(key1).not.toContain('undefined');
    });

    test('should generate different keys for different inputs', () => {
      const key1 = CacheKeyGenerator.generateKey('analysis', { userId: '123' });
      const key2 = CacheKeyGenerator.generateKey('analysis', { userId: '456' });
      const key3 = CacheKeyGenerator.generateKey('summary', { userId: '123' });
      
      expect(key1).not.toBe(key2);
      expect(key1).not.toBe(key3);
      expect(key2).not.toBe(key3);
    });

    test('should handle complex nested objects consistently', () => {
      const complexObj1 = {
        conversations: [{ id: 'c1', messages: [{ id: 'm1', content: 'hello' }] }],
        options: { deep: { nested: { value: 42 } } },
        array: [3, 1, 2] // Will be sorted
      };
      
      const complexObj2 = {
        array: [1, 2, 3], // Different order, should be sorted the same
        options: { deep: { nested: { value: 42 } } },
        conversations: [{ id: 'c1', messages: [{ id: 'm1', content: 'hello' }] }]
      };
      
      const key1 = CacheKeyGenerator.generateKey('complex', complexObj1);
      const key2 = CacheKeyGenerator.generateKey('complex', complexObj2);
      
      expect(key1).toBe(key2);
    });

    test('should validate cache keys properly', () => {
      const goodKey = CacheKeyGenerator.generateKey('test', { valid: true });
      const validation = CacheKeyGenerator.validateKey(goodKey);
      
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
      
      // Test problematic key
      const badValidation = CacheKeyGenerator.validateKey('a');
      expect(badValidation.valid).toBe(false);
      expect(badValidation.issues.length).toBeGreaterThan(0);
    });

    test('should prevent collisions in high-volume scenarios', () => {
      const keys = new Set<string>();
      const collisionCases = [
        // Similar but different parameters
        { op: 'analyze', params: { id: '12', type: 'a' } },
        { op: 'analyze', params: { id: '1', type: '2a' } },
        { op: 'analyze', params: { id: 1, type: '2a' } }, // Different type
        
        // String concatenation edge cases
        { op: 'test', params: { a: 'hello', b: 'world' } },
        { op: 'test', params: { a: 'hellow', b: 'orld' } },
        
        // Empty/undefined values
        { op: 'test', params: { a: '', b: null } },
        { op: 'test', params: { a: null, b: '' } },
        
        // Numeric edge cases
        { op: 'calc', params: { value: 123 } },
        { op: 'calc', params: { value: '123' } },
        { op: 'calc', params: { value: 1.23e2 } } // 1.23e2 === 123 in JS
      ];
      
      for (const testCase of collisionCases) {
        const key = CacheKeyGenerator.generateKey(testCase.op, testCase.params);
        keys.add(key);
      }
      
      // 1.23e2 equals 123, so those two cases should produce identical keys
      // All others should be unique
      expect(keys.size).toBe(collisionCases.length - 1); // One mathematical duplicate
    });
  });

  describe('CacheKeys utility functions', () => {
    test('should generate consistent flow analysis keys', () => {
      const conversations = [
        { conversation: { id: 'c1' }, messages: [{}, {}] },
        { conversation: { id: 'c2' }, messages: [{}] }
      ];
      
      const key1 = CacheKeys.flowAnalysis(conversations);
      const key2 = CacheKeys.flowAnalysis(conversations);
      
      expect(key1).toBe(key2);
      // The key uses a hash-based approach, so check for consistency rather than specific content
      expect(key1.startsWith('c:conversation:')).toBe(true);
    });

    test('should handle different conversation orders consistently', () => {
      const conv1 = { conversation: { id: 'c1' } };
      const conv2 = { conversation: { id: 'c2' } };
      
      const key1 = CacheKeys.knowledgeGapDetection([conv1, conv2]);
      const key2 = CacheKeys.knowledgeGapDetection([conv2, conv1]); // Different order
      
      expect(key1).toBe(key2); // Should be same due to sorting
    });
  });
});

describe('Enhanced Size Estimation', () => {
  describe('SizeEstimator', () => {
    test('should provide accurate size estimates for primitive types', () => {
      expect(SizeEstimator.quickEstimate(42)).toBe(8);
      expect(SizeEstimator.quickEstimate(true)).toBe(8);
      expect(SizeEstimator.quickEstimate('hello')).toBe(10); // 5 chars * 2 bytes
      expect(SizeEstimator.quickEstimate(null)).toBe(0);
      expect(SizeEstimator.quickEstimate(undefined)).toBe(0);
    });

    test('should handle complex objects with detailed breakdown', () => {
      const complexObj = {
        name: 'test',
        values: [1, 2, 3, 4, 5],
        nested: {
          deep: {
            value: 'nested string'
          }
        },
        date: new Date()
      };
      
      const estimate = SizeEstimator.estimate(complexObj);
      
      expect(estimate.totalBytes).toBeGreaterThan(0);
      expect(estimate.breakdown.objects).toBeGreaterThan(0);
      expect(estimate.breakdown.arrays).toBeGreaterThan(0);
      expect(estimate.breakdown.strings).toBeGreaterThan(0);
      expect(estimate.analysis.objectCount).toBeGreaterThan(0);
      expect(estimate.analysis.stringCount).toBeGreaterThan(0);
    });

    test('should handle circular references gracefully', () => {
      const obj: any = { name: 'test' };
      obj.circular = obj; // Create circular reference
      
      const estimate = SizeEstimator.estimate(obj);
      
      expect(estimate.totalBytes).toBeGreaterThan(0);
      expect(estimate.analysis.circularReferences).toBeGreaterThan(0);
      expect(Number.isFinite(estimate.totalBytes)).toBe(true);
    });

    test('should provide consistent quick estimates', () => {
      const testObj = { a: 1, b: 'test', c: [1, 2, 3] };
      
      const size1 = SizeEstimator.quickEstimate(testObj);
      const size2 = SizeEstimator.quickEstimate(testObj);
      
      expect(size1).toBe(size2);
      expect(size1).toBeGreaterThan(0);
    });

    test('should handle edge cases without throwing', () => {
      const edgeCases = [
        BigInt(123456789),
        Symbol('test'),
        () => console.log('function'),
        new Map([['key', 'value']]),
        new Set([1, 2, 3]),
        new ArrayBuffer(100),
        /regex/g
      ];
      
      for (const edgeCase of edgeCases) {
        expect(() => {
          const size = SizeEstimator.quickEstimate(edgeCase);
          expect(typeof size).toBe('number');
          expect(size).toBeGreaterThanOrEqual(0);
        }).not.toThrow();
      }
    });
  });

  describe('SizeUtils', () => {
    test('should format bytes correctly', () => {
      expect(SizeUtils.formatBytes(1024)).toBe('1.00 KB');
      expect(SizeUtils.formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(SizeUtils.formatBytes(1536)).toBe('1.50 KB');
      expect(SizeUtils.formatBytes(0)).toBe('0.00 B');
    });

    test('should calculate cache efficiency', () => {
      expect(SizeUtils.calculateCacheEfficiency(100, 100)).toBe(1);
      expect(SizeUtils.calculateCacheEfficiency(50, 100)).toBe(0.5);
      expect(SizeUtils.calculateCacheEfficiency(200, 100)).toBe(1); // Capped at 1
      expect(SizeUtils.calculateCacheEfficiency(100, 0)).toBe(0);
    });

    test('should validate reasonable cache sizes', () => {
      expect(SizeUtils.isReasonableCacheSize(1024)).toBe(true);
      expect(SizeUtils.isReasonableCacheSize(0)).toBe(false);
      expect(SizeUtils.isReasonableCacheSize(-100)).toBe(false);
      expect(SizeUtils.isReasonableCacheSize(20 * 1024 * 1024)).toBe(false); // > 10MB default
    });
  });
});

describe('Cache Key Collision Prevention', () => {
  test('should maintain consistency across multiple runs', () => {
    // Same inputs should always generate same keys
    const testData = { userId: '123', action: 'analyze', timestamp: 1234567890 };
    
    const keys = [];
    for (let i = 0; i < 10; i++) {
      keys.push(CacheKeyGenerator.generateKey('consistent', testData));
    }
    
    // All keys should be identical
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(1);
  });

  test('should handle unicode and special characters safely', () => {
    const unicodeData = {
      emoji: '🚀💻🎉',
      chinese: '你好世界',
      special: 'test\n\t\r"\'\\/',
      mixed: 'Hello 🌍 世界'
    };
    
    expect(() => {
      const key = CacheKeyGenerator.generateKey('unicode', unicodeData);
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
      
      // Key should be consistent
      const key2 = CacheKeyGenerator.generateKey('unicode', unicodeData);
      expect(key).toBe(key2);
    }).not.toThrow();
  });

  test('should demonstrate improvement over simple concatenation', () => {
    // These would cause collisions with simple concatenation
    const cases = [
      { params: { a: 'ab', b: 'c' } },    // 'ab' + 'c'
      { params: { a: 'a', b: 'bc' } },    // 'a' + 'bc' 
      { params: { x: '1', y: '23' } },    // '1' + '23'
      { params: { x: '12', y: '3' } }     // '12' + '3'
    ];
    
    const keys = cases.map(c => CacheKeyGenerator.generateKey('test', c.params));
    const uniqueKeys = new Set(keys);
    
    // With proper hashing, all should be unique
    expect(uniqueKeys.size).toBe(cases.length);
  });
});