/**
 * Base Repository Test Suite
 * 
 * Tests the abstract BaseRepository class functionality including:
 * - Database connection management
 * - Transaction handling
 * - Prepared statement management
 * - Common utility methods
 * - Error handling patterns
 */

import { describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { DatabaseManager } from '../../../../src/storage/Database';
import { BaseRepository } from '../../../../src/storage/repositories/BaseRepository';

// Concrete implementation of BaseRepository for testing
class TestRepository extends BaseRepository {
  // Expose protected methods for testing
  public testGetConnection() {
    return this.getConnection();
  }

  public testTransaction<T>(fn: (db: any) => T): T {
    return this.transaction(fn);
  }

  public testPrepare(key: string, sql: string) {
    return this.prepare(key, sql);
  }

  public testExecuteStatement<T>(key: string, sql: string, params?: any): T {
    return this.executeStatement<T>(key, sql, params);
  }

  public testExecuteStatementAll<T>(key: string, sql: string, params?: any): T[] {
    return this.executeStatementAll<T>(key, sql, params);
  }

  public testExecuteStatementRun(key: string, sql: string, params?: any) {
    return this.executeStatementRun(key, sql, params);
  }

  public testGenerateId(): string {
    return this.generateId();
  }

  public testGetCurrentTimestamp(): number {
    return this.getCurrentTimestamp();
  }

  public testIsValidUUID(uuid: string): boolean {
    return this.isValidUUID(uuid);
  }

  public testParseMetadata(metadataJson?: string): Record<string, any> {
    return this.parseMetadata(metadataJson);
  }

  public testStringifyMetadata(metadata?: Record<string, any>): string {
    return this.stringifyMetadata(metadata);
  }

  public testValidatePagination(limit?: number, offset?: number) {
    return this.validatePagination(limit, offset);
  }

  public testHandleConstraintError(error: Error, entityType: string): never {
    return this.handleConstraintError(error, entityType);
  }
}

describe('BaseRepository', () => {
  let dbManager: DatabaseManager;
  let repository: TestRepository;
  let tempDbPath: string;

  beforeEach(async () => {
    // Create temporary database for testing
    tempDbPath = `:memory:`; // Use in-memory database for tests
    dbManager = new DatabaseManager({ databasePath: tempDbPath });
    await dbManager.initialize();
    repository = new TestRepository(dbManager);
  });

  afterEach(async () => {
    repository.cleanup();
    dbManager.close();
  });

  describe('Database Connection Management', () => {
    it('should get database connection', () => {
      const connection = repository.testGetConnection();
      expect(connection).toBeDefined();
      expect(typeof connection.prepare).toBe('function');
    });

    it('should execute transactions', () => {
      const result = repository.testTransaction((db) => {
        // Create a test table and insert data
        db.prepare('CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT)').run();
        db.prepare('INSERT INTO test_table (name) VALUES (?)').run('test');
        return db.prepare('SELECT COUNT(*) as count FROM test_table').get();
      });

      expect(result).toEqual({ count: 1 });
    });

    it('should handle transaction errors', () => {
      expect(() => {
        repository.testTransaction(() => {
          throw new Error('Transaction error');
        });
      }).toThrow('Transaction error');
    });
  });

  describe('Prepared Statement Management', () => {
    beforeEach(() => {
      // Create a test table for prepared statement tests
      repository.testTransaction((db) => {
        db.prepare('CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, created_at INTEGER)').run();
      });
    });

    it('should create and reuse prepared statements', () => {
      const stmt1 = repository.testPrepare('test_insert', 'INSERT INTO test_table (name, created_at) VALUES (?, ?)');
      const stmt2 = repository.testPrepare('test_insert', 'INSERT INTO test_table (name, created_at) VALUES (?, ?)');
      
      expect(stmt1).toBe(stmt2); // Should be the same instance
    });

    it('should execute statement and return single result', () => {
      repository.testExecuteStatementRun('insert_test', 'INSERT INTO test_table (name, created_at) VALUES (?, ?)', ['test', Date.now()]);
      
      const result = repository.testExecuteStatement<{ id: number; name: string }>('select_test', 'SELECT id, name FROM test_table WHERE name = ?', ['test']);
      
      expect(result).toBeDefined();
      expect(result.name).toBe('test');
    });

    it('should execute statement and return all results', () => {
      const now = Date.now();
      repository.testExecuteStatementRun('insert_test1', 'INSERT INTO test_table (name, created_at) VALUES (?, ?)', ['test1', now]);
      repository.testExecuteStatementRun('insert_test2', 'INSERT INTO test_table (name, created_at) VALUES (?, ?)', ['test2', now]);
      
      const results = repository.testExecuteStatementAll<{ id: number; name: string }>('select_all_test', 'SELECT id, name FROM test_table ORDER BY name');
      
      expect(results).toHaveLength(2);
      expect(results[0].name).toBe('test1');
      expect(results[1].name).toBe('test2');
    });

    it('should execute run statement and return result info', () => {
      const result = repository.testExecuteStatementRun('insert_run_test', 'INSERT INTO test_table (name, created_at) VALUES (?, ?)', ['test', Date.now()]);
      
      expect(result.changes).toBe(1);
      expect(result.lastInsertRowid).toBeDefined();
    });

    it('should handle statement execution errors', () => {
      expect(() => {
        repository.testExecuteStatement('error_test', 'SELECT * FROM non_existent_table');
      }).toThrow(/Database query failed/);
    });
  });

  describe('Utility Methods', () => {
    describe('generateId', () => {
      it('should generate valid UUIDs', () => {
        const id1 = repository.testGenerateId();
        const id2 = repository.testGenerateId();
        
        expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(id2).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        expect(id1).not.toBe(id2);
      });
    });

    describe('getCurrentTimestamp', () => {
      it('should return current timestamp', () => {
        const before = Date.now();
        const timestamp = repository.testGetCurrentTimestamp();
        const after = Date.now();
        
        expect(timestamp).toBeGreaterThanOrEqual(before);
        expect(timestamp).toBeLessThanOrEqual(after);
      });
    });

    describe('isValidUUID', () => {
      it('should validate correct UUIDs', () => {
        expect(repository.testIsValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(repository.testIsValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
      });

      it('should reject invalid UUIDs', () => {
        expect(repository.testIsValidUUID('invalid-uuid')).toBe(false);
        expect(repository.testIsValidUUID('550e8400-e29b-41d4-a716-44665544000')).toBe(false); // too short
        expect(repository.testIsValidUUID('550e8400-e29b-41d4-a716-4466554400000')).toBe(false); // too long
        expect(repository.testIsValidUUID('')).toBe(false);
      });
    });

    describe('parseMetadata', () => {
      it('should parse valid JSON', () => {
        const metadata = repository.testParseMetadata('{"key": "value", "number": 123}');
        expect(metadata).toEqual({ key: 'value', number: 123 });
      });

      it('should return empty object for invalid JSON', () => {
        expect(repository.testParseMetadata('invalid json')).toEqual({});
        expect(repository.testParseMetadata(undefined)).toEqual({});
        expect(repository.testParseMetadata('')).toEqual({});
      });
    });

    describe('stringifyMetadata', () => {
      it('should stringify objects to JSON', () => {
        const result = repository.testStringifyMetadata({ key: 'value', number: 123 });
        expect(result).toBe('{"key":"value","number":123}');
      });

      it('should return empty object JSON for empty or undefined metadata', () => {
        expect(repository.testStringifyMetadata(undefined)).toBe('{}');
        expect(repository.testStringifyMetadata({})).toBe('{}');
      });

      it('should handle unstringifiable objects', () => {
        const circular: any = {};
        circular.self = circular;
        expect(repository.testStringifyMetadata(circular)).toBe('{}');
      });
    });

    describe('validatePagination', () => {
      it('should return valid pagination with defaults', () => {
        const result = repository.testValidatePagination();
        expect(result).toEqual({ limit: 50, offset: 0 });
      });

      it('should enforce limits', () => {
        expect(repository.testValidatePagination(0, -5)).toEqual({ limit: 1, offset: 0 });
        expect(repository.testValidatePagination(2000, 10)).toEqual({ limit: 1000, offset: 10 });
      });

      it('should use provided valid values', () => {
        expect(repository.testValidatePagination(25, 100)).toEqual({ limit: 25, offset: 100 });
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle unique constraint errors', () => {
      const error = new Error('UNIQUE constraint failed: table.column');
      expect(() => {
        repository.testHandleConstraintError(error, 'TestEntity');
      }).toThrow('TestEntity already exists');
    });

    it('should handle foreign key constraint errors', () => {
      const error = new Error('FOREIGN KEY constraint failed');
      expect(() => {
        repository.testHandleConstraintError(error, 'TestEntity');
      }).toThrow('Referenced TestEntity does not exist');
    });

    it('should handle check constraint errors', () => {
      const error = new Error('CHECK constraint failed: table.column');
      expect(() => {
        repository.testHandleConstraintError(error, 'TestEntity');
      }).toThrow('Invalid TestEntity data');
    });

    it('should re-throw unknown errors', () => {
      const error = new Error('Some other database error');
      expect(() => {
        repository.testHandleConstraintError(error, 'TestEntity');
      }).toThrow('Some other database error');
    });
  });

  describe('Cleanup', () => {
    it('should clear prepared statements on cleanup', () => {
      // Create some prepared statements
      repository.testPrepare('test1', 'SELECT 1');
      repository.testPrepare('test2', 'SELECT 2');
      
      // Cleanup should not throw
      expect(() => repository.cleanup()).not.toThrow();
    });
  });
});