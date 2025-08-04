/**
 * State Repository Test Suite
 * 
 * Tests the StateRepository class functionality including:
 * - Key-value storage operations
 * - JSON serialization/deserialization
 * - Batch operations
 * - Pattern matching and filtering
 * - Atomic operations and transactions
 * - Error handling and validation
 */

import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { DatabaseManager } from '../../../../src/storage/Database';
import { StateRepository, BatchStateOperation } from '../../../../src/storage/repositories/StateRepository';

describe('StateRepository', () => {
  let dbManager: DatabaseManager;
  let stateRepo: StateRepository;
  let tempDbPath: string;

  beforeEach(async () => {
    // Create temporary database for testing
    tempDbPath = `:memory:`; // Use in-memory database for tests
    dbManager = new DatabaseManager({ databasePath: tempDbPath });
    await dbManager.initialize();
    stateRepo = new StateRepository(dbManager);
    
    // Clear default configuration values inserted by migrations for clean test state
    await stateRepo.clear();
  });

  afterEach(async () => {
    stateRepo.cleanup();
    dbManager.close();
  });

  describe('Basic CRUD Operations', () => {
    it('should set and get a string value', async () => {
      await stateRepo.set('test_key', 'test_value');
      
      const value = await stateRepo.get<string>('test_key');
      expect(value).toBe('test_value');
    });

    it('should set and get an object value', async () => {
      const testObject = { name: 'John', age: 30, active: true };
      await stateRepo.set('user_data', testObject);
      
      const value = await stateRepo.get<typeof testObject>('user_data');
      expect(value).toEqual(testObject);
    });

    it('should set and get an array value', async () => {
      const testArray = [1, 2, 3, 'hello', { nested: true }];
      await stateRepo.set('array_data', testArray);
      
      const value = await stateRepo.get<typeof testArray>('array_data');
      expect(value).toEqual(testArray);
    });

    it('should set and get numeric values', async () => {
      await stateRepo.set('number_int', 42);
      await stateRepo.set('number_float', 3.14159);
      
      const intValue = await stateRepo.get<number>('number_int');
      const floatValue = await stateRepo.get<number>('number_float');
      
      expect(intValue).toBe(42);
      expect(floatValue).toBe(3.14159);
    });

    it('should set and get boolean values', async () => {
      await stateRepo.set('bool_true', true);
      await stateRepo.set('bool_false', false);
      
      const trueValue = await stateRepo.get<boolean>('bool_true');
      const falseValue = await stateRepo.get<boolean>('bool_false');
      
      expect(trueValue).toBe(true);
      expect(falseValue).toBe(false);
    });

    it('should return null for non-existent key', async () => {
      const value = await stateRepo.get('non_existent_key');
      expect(value).toBeNull();
    });

    it('should overwrite existing values', async () => {
      await stateRepo.set('overwrite_key', 'original');
      await stateRepo.set('overwrite_key', 'updated');
      
      const value = await stateRepo.get<string>('overwrite_key');
      expect(value).toBe('updated');
    });

    it('should delete a key-value pair', async () => {
      await stateRepo.set('delete_me', 'value');
      
      const deleted = await stateRepo.delete('delete_me');
      expect(deleted).toBe(true);
      
      const value = await stateRepo.get('delete_me');
      expect(value).toBeNull();
    });

    it('should return false when deleting non-existent key', async () => {
      const deleted = await stateRepo.delete('non_existent');
      expect(deleted).toBe(false);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should handle invalid keys gracefully', async () => {
      expect(await stateRepo.get('')).toBeNull();
      expect(await stateRepo.get(null as any)).toBeNull();
      expect(await stateRepo.get(undefined as any)).toBeNull();
      
      expect(await stateRepo.delete('')).toBe(false);
      expect(await stateRepo.delete(null as any)).toBe(false);
    });

    it('should throw error for invalid keys in set operation', async () => {
      await expect(stateRepo.set('', 'value')).rejects.toThrow('Key must be a non-empty string');
      await expect(stateRepo.set(null as any, 'value')).rejects.toThrow('Key must be a non-empty string');
    });

    it('should handle complex nested objects', async () => {
      const complexObject = {
        level1: {
          level2: {
            level3: {
              array: [1, 2, { nested: 'value' }],
              nullValue: null,
              undefinedValue: undefined
            }
          }
        }
      };
      
      await stateRepo.set('complex', complexObject);
      const retrieved = await stateRepo.get('complex');
      
      // Note: undefined values become null when JSON serialized/deserialized
      expect(retrieved.level1.level2.level3.array).toEqual([1, 2, { nested: 'value' }]);
      expect(retrieved.level1.level2.level3.nullValue).toBeNull();
    });

    it('should handle JSON parsing errors gracefully', async () => {
      // Manually insert invalid JSON into the database
      const db = dbManager.getConnection();
      db.prepare('INSERT INTO persistence_state (key, value, updated_at) VALUES (?, ?, ?)')
        .run('invalid_json', 'invalid json string', Date.now());
      
      const value = await stateRepo.get('invalid_json');
      expect(value).toBe('invalid json string'); // Should return raw string
    });
  });

  describe('Bulk Operations', () => {
    it('should get all key-value pairs', async () => {
      await stateRepo.set('key1', 'value1');
      await stateRepo.set('key2', { data: 'value2' });
      await stateRepo.set('key3', [1, 2, 3]);
      
      const all = await stateRepo.getAll();
      
      expect(all).toEqual({
        key1: 'value1',
        key2: { data: 'value2' },
        key3: [1, 2, 3]
      });
    });

    it('should get multiple values by keys', async () => {
      await stateRepo.set('key1', 'value1');
      await stateRepo.set('key2', 'value2');
      await stateRepo.set('key3', 'value3');
      
      const values = await stateRepo.getMultiple(['key1', 'key3', 'non_existent']);
      
      expect(values).toEqual({
        key1: 'value1',
        key3: 'value3',
        non_existent: null
      });
    });

    it('should handle empty keys array in getMultiple', async () => {
      const values = await stateRepo.getMultiple([]);
      expect(values).toEqual({});
    });

    it('should filter out invalid keys in getMultiple', async () => {
      await stateRepo.set('valid_key', 'value');
      
      const values = await stateRepo.getMultiple(['valid_key', '', null as any, undefined as any]);
      
      expect(values).toEqual({
        valid_key: 'value',
        '': null,
        null: null,
        undefined: null
      });
    });

    it('should set multiple values atomically', async () => {
      const operations: BatchStateOperation[] = [
        { key: 'batch1', value: 'value1' },
        { key: 'batch2', value: { nested: 'object' } },
        { key: 'batch3', value: [1, 2, 3] }
      ];
      
      await stateRepo.setMultiple(operations);
      
      const value1 = await stateRepo.get('batch1');
      const value2 = await stateRepo.get('batch2');
      const value3 = await stateRepo.get('batch3');
      
      expect(value1).toBe('value1');
      expect(value2).toEqual({ nested: 'object' });
      expect(value3).toEqual([1, 2, 3]);
    });

    it('should handle empty operations array in setMultiple', async () => {
      await expect(stateRepo.setMultiple([])).resolves.not.toThrow();
    });

    it('should throw error for invalid keys in setMultiple', async () => {
      const operations: BatchStateOperation[] = [
        { key: 'valid', value: 'value' },
        { key: '', value: 'invalid' }
      ];
      
      await expect(stateRepo.setMultiple(operations)).rejects.toThrow('All operations must have valid string keys');
    });

    it('should delete multiple keys atomically', async () => {
      await stateRepo.set('delete1', 'value1');
      await stateRepo.set('delete2', 'value2');
      await stateRepo.set('delete3', 'value3');
      await stateRepo.set('keep', 'keepvalue');
      
      const deletedCount = await stateRepo.deleteMultiple(['delete1', 'delete2', 'non_existent']);
      
      expect(deletedCount).toBe(2);
      
      expect(await stateRepo.get('delete1')).toBeNull();
      expect(await stateRepo.get('delete2')).toBeNull();
      expect(await stateRepo.get('delete3')).toBe('value3');
      expect(await stateRepo.get('keep')).toBe('keepvalue');
    });
  });

  describe('Pattern Matching', () => {
    beforeEach(async () => {
      await stateRepo.set('user:1:name', 'John');
      await stateRepo.set('user:1:email', 'john@example.com');
      await stateRepo.set('user:2:name', 'Jane');
      await stateRepo.set('user:2:email', 'jane@example.com');
      await stateRepo.set('config:database:host', 'localhost');
      await stateRepo.set('config:database:port', 5432);
    });

    it('should find keys by pattern', async () => {
      const userKeys = await stateRepo.getByPattern('user:%');
      
      expect(Object.keys(userKeys)).toHaveLength(4);
      expect(userKeys['user:1:name']).toBe('John');
      expect(userKeys['user:2:email']).toBe('jane@example.com');
    });

    it('should find keys by specific pattern', async () => {
      const user1Keys = await stateRepo.getByPattern('user:1:%');
      
      expect(Object.keys(user1Keys)).toHaveLength(2);
      expect(user1Keys['user:1:name']).toBe('John');
      expect(user1Keys['user:1:email']).toBe('john@example.com');
    });

    it('should handle pattern with no matches', async () => {
      const noMatches = await stateRepo.getByPattern('nomatch:%');
      expect(noMatches).toEqual({});
    });
  });

  describe('Utility Functions', () => {
    it('should check if key exists', async () => {
      await stateRepo.set('exists_key', 'value');
      
      expect(await stateRepo.exists('exists_key')).toBe(true);
      expect(await stateRepo.exists('non_existent')).toBe(false);
      expect(await stateRepo.exists('')).toBe(false);
    });

    it('should get timestamp of last update', async () => {
      const beforeSet = Date.now();
      await stateRepo.set('timestamp_key', 'value');
      const afterSet = Date.now();
      
      const timestamp = await stateRepo.getTimestamp('timestamp_key');
      
      expect(timestamp).toBeGreaterThanOrEqual(beforeSet);
      expect(timestamp).toBeLessThanOrEqual(afterSet);
      
      expect(await stateRepo.getTimestamp('non_existent')).toBeNull();
    });

    it('should count total keys', async () => {
      await stateRepo.set('count1', 'value1');
      await stateRepo.set('count2', 'value2');
      await stateRepo.set('count3', 'value3');
      
      const count = await stateRepo.count();
      expect(count).toBe(3);
    });

    it('should get keys with pagination', async () => {
      await stateRepo.set('a_key', 'value');
      await stateRepo.set('b_key', 'value');
      await stateRepo.set('c_key', 'value');
      await stateRepo.set('d_key', 'value');
      
      const firstPage = await stateRepo.getKeys(2, 0);
      const secondPage = await stateRepo.getKeys(2, 2);
      
      expect(firstPage).toHaveLength(2);
      expect(secondPage).toHaveLength(2);
      expect(firstPage[0]).toBe('a_key'); // Should be ordered
      expect(secondPage[0]).toBe('c_key');
    });

    it('should get all state with metadata', async () => {
      await stateRepo.set('meta1', 'value1');
      await stateRepo.set('meta2', { data: 'value2' });
      
      const allWithMetadata = await stateRepo.getAllWithMetadata();
      
      expect(allWithMetadata).toHaveLength(2);
      allWithMetadata.forEach(state => {
        expect(state.key).toBeDefined();
        expect(state.value).toBeDefined();
        expect(state.updatedAt).toBeDefined();
        expect(typeof state.updatedAt).toBe('number');
      });
    });

    it('should clear all state', async () => {
      await stateRepo.set('clear1', 'value1');
      await stateRepo.set('clear2', 'value2');
      await stateRepo.set('clear3', 'value3');
      
      const clearedCount = await stateRepo.clear();
      expect(clearedCount).toBe(3);
      
      const count = await stateRepo.count();
      expect(count).toBe(0);
    });
  });

  describe('Atomic Operations', () => {
    it('should increment numeric value', async () => {
      await stateRepo.set('counter', 10);
      
      const newValue1 = await stateRepo.increment('counter', 5);
      expect(newValue1).toBe(15);
      
      const newValue2 = await stateRepo.increment('counter'); // Default delta of 1
      expect(newValue2).toBe(16);
      
      const retrievedValue = await stateRepo.get<number>('counter');
      expect(retrievedValue).toBe(16);
    });

    it('should increment non-existent key starting from 0', async () => {
      const newValue = await stateRepo.increment('new_counter', 5);
      expect(newValue).toBe(5);
      
      const retrievedValue = await stateRepo.get<number>('new_counter');
      expect(retrievedValue).toBe(5);
    });

    it('should handle negative increments (decrement)', async () => {
      await stateRepo.set('counter', 20);
      
      const newValue = await stateRepo.increment('counter', -5);
      expect(newValue).toBe(15);
    });

    it('should handle floating point increments', async () => {
      await stateRepo.set('float_counter', 1.5);
      
      const newValue = await stateRepo.increment('float_counter', 2.7);
      expect(newValue).toBeCloseTo(4.2, 10);
    });

    it('should throw error for invalid increment parameters', async () => {
      await expect(stateRepo.increment('', 1)).rejects.toThrow('Key must be a non-empty string');
      await expect(stateRepo.increment('key', NaN)).rejects.toThrow('Delta must be a finite number');
      await expect(stateRepo.increment('key', Infinity)).rejects.toThrow('Delta must be a finite number');
    });

    it('should handle increment on non-numeric value', async () => {
      await stateRepo.set('string_key', 'not a number');
      
      const newValue = await stateRepo.increment('string_key', 5);
      expect(newValue).toBe(5); // Should treat as 0 + 5
    });
  });

  describe('Concurrency and Performance', () => {
    it('should handle concurrent operations', async () => {
      const promises = Array.from({ length: 100 }, (_, i) => 
        stateRepo.set(`concurrent_${i}`, `value_${i}`)
      );
      
      await Promise.all(promises);
      
      const count = await stateRepo.count();
      expect(count).toBe(100);
    });

    it('should maintain atomicity in batch operations', async () => {
      const operations: BatchStateOperation[] = Array.from({ length: 50 }, (_, i) => ({
        key: `batch_${i}`,
        value: `value_${i}`
      }));
      
      await stateRepo.setMultiple(operations);
      
      const count = await stateRepo.count();
      expect(count).toBe(50);
      
      // Verify all values were set correctly
      const all = await stateRepo.getAll();
      for (let i = 0; i < 50; i++) {
        expect(all[`batch_${i}`]).toBe(`value_${i}`);
      }
    });

    it('should handle concurrent increments correctly', async () => {
      await stateRepo.set('concurrent_counter', 0);
      
      const promises = Array.from({ length: 100 }, () => 
        stateRepo.increment('concurrent_counter', 1)
      );
      
      await Promise.all(promises);
      
      const finalValue = await stateRepo.get<number>('concurrent_counter');
      expect(finalValue).toBe(100);
    });
  });

  describe('Data Types and Edge Cases', () => {
    it('should handle null values', async () => {
      await stateRepo.set('null_value', null);
      
      const value = await stateRepo.get('null_value');
      expect(value).toBeNull();
    });

    it('should handle empty string values', async () => {
      await stateRepo.set('empty_string', '');
      
      const value = await stateRepo.get<string>('empty_string');
      expect(value).toBe('');
    });

    it('should handle empty object values', async () => {
      await stateRepo.set('empty_object', {});
      
      const value = await stateRepo.get('empty_object');
      expect(value).toEqual({});
    });

    it('should handle empty array values', async () => {
      await stateRepo.set('empty_array', []);
      
      const value = await stateRepo.get('empty_array');
      expect(value).toEqual([]);
    });

    it('should handle very long keys', async () => {
      const longKey = 'a'.repeat(1000);
      await stateRepo.set(longKey, 'value');
      
      const value = await stateRepo.get(longKey);
      expect(value).toBe('value');
    });

    it('should handle very large values', async () => {
      const largeObject = {
        data: 'x'.repeat(10000),
        nested: {
          array: new Array(1000).fill('item')
        }
      };
      
      await stateRepo.set('large_value', largeObject);
      
      const retrieved = await stateRepo.get('large_value');
      expect(retrieved.data.length).toBe(10000);
      expect(retrieved.nested.array.length).toBe(1000);
    });
  });
});