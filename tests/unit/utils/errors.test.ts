/**
 * Tests for error handling utilities
 */

import { z } from 'zod';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  QuotaError,
  ProtocolError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  TimeoutError,
  isAppError,
  isOperationalError,
  getErrorCategory,
  extractErrorInfo,
  normalizeError,
  ErrorUtils
} from '../../../src/utils/errors';

describe('Error Classes', () => {
  describe('AppError', () => {
    it('should create a base error with all properties', () => {
      const error = new ValidationError('Test error', { field: 'value' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(AppError);
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual({ field: 'value' });
      expect(error.timestamp).toBeGreaterThan(0);
      expect(error.errorId).toMatch(/^VALIDATION_ERROR_\d+_[a-z0-9]{6}$/);
      expect(error.isOperational).toBe(true);
    });

    it('should generate unique error IDs', () => {
      const error1 = new ValidationError('Test 1');
      const error2 = new ValidationError('Test 2');
      
      expect(error1.errorId).not.toBe(error2.errorId);
    });

    it('should serialize to JSON correctly', () => {
      const error = new ValidationError('Test error', { field: 'value' });
      const json = error.toJSON();
      
      expect(json).toMatchObject({
        name: 'ValidationError',
        message: 'Test error',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: { field: 'value' },
        timestamp: expect.any(Number),
        errorId: expect.any(String),
        stack: expect.any(String)
      });
    });

    it('should sanitize sensitive data in toSanitized()', () => {
      const error = new ValidationError('Test error', {
        field: 'value',
        password: 'secret123',
        token: 'abc123',
        normalField: 'normal'
      });
      
      const sanitized = error.toSanitized();
      
      expect(sanitized.details).toEqual({
        field: 'value',
        normalField: 'normal'
      });
      expect(sanitized.details.password).toBeUndefined();
      expect(sanitized.details.token).toBeUndefined();
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with default properties', () => {
      const error = new ValidationError('Invalid input');
      
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('should create from Zod error', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });
      
      try {
        schema.parse({ name: 123, age: 'invalid' });
      } catch (zodError) {
        const error = ValidationError.fromZodError(zodError as z.ZodError);
        
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toContain('Validation failed');
        expect(error.details).toEqual((zodError as z.ZodError).errors);
      }
    });
  });

  describe('NotFoundError', () => {
    it('should create not found error without identifier', () => {
      const error = new NotFoundError('User');
      
      expect(error.code).toBe('NOT_FOUND');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe('User not found');
      expect(error.details).toEqual({ resource: 'User', identifier: undefined });
    });

    it('should create not found error with identifier', () => {
      const error = new NotFoundError('User', '123');
      
      expect(error.message).toBe("User with identifier '123' not found");
      expect(error.details).toEqual({ resource: 'User', identifier: '123' });
    });
  });

  describe('DatabaseError', () => {
    it('should create database error with original error', () => {
      const originalError = new Error('SQLite error');
      const error = new DatabaseError('Database failed', originalError, 'SELECT');
      
      expect(error.code).toBe('DATABASE_ERROR');
      expect(error.statusCode).toBe(500);
      expect(error.originalError).toBe(originalError);
      expect(error.details).toEqual({ operation: 'SELECT' });
    });

    it('should create from SQLite UNIQUE constraint error', () => {
      const sqliteError = new Error('UNIQUE constraint failed');
      const error = DatabaseError.fromSQLiteError(sqliteError, 'INSERT');
      
      expect(error.message).toBe('Resource already exists');
      expect(error.originalError).toBe(sqliteError);
      expect(error.details).toEqual({ operation: 'INSERT' });
    });

    it('should create from SQLite FOREIGN KEY constraint error', () => {
      const sqliteError = new Error('FOREIGN KEY constraint failed');
      const error = DatabaseError.fromSQLiteError(sqliteError);
      
      expect(error.message).toBe('Referenced resource not found');
    });

    it('should create from database locked error', () => {
      const sqliteError = new Error('database is locked');
      const error = DatabaseError.fromSQLiteError(sqliteError);
      
      expect(error.message).toBe('Database is temporarily unavailable');
    });
  });

  describe('QuotaError', () => {
    it('should create quota error with usage information', () => {
      const error = new QuotaError('messages', 1000, 1050, { conversationId: '123' });
      
      expect(error.code).toBe('QUOTA_EXCEEDED');
      expect(error.statusCode).toBe(429);
      expect(error.message).toBe('messages quota exceeded: 1050/1000');
      expect(error.details).toEqual({
        resourceType: 'messages',
        limit: 1000,
        current: 1050,
        conversationId: '123'
      });
    });
  });

  describe('TimeoutError', () => {
    it('should create timeout error with operation details', () => {
      const error = new TimeoutError('database_query', 5000, { queryId: '123' });
      
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.statusCode).toBe(408);
      expect(error.message).toBe("Operation 'database_query' timed out after 5000ms");
      expect(error.details).toEqual({
        operation: 'database_query',
        timeoutMs: 5000,
        queryId: '123'
      });
    });
  });
});

describe('Error Utilities', () => {
  describe('isAppError', () => {
    it('should return true for AppError instances', () => {
      expect(isAppError(new ValidationError('test'))).toBe(true);
      expect(isAppError(new NotFoundError('resource'))).toBe(true);
    });

    it('should return false for non-AppError instances', () => {
      expect(isAppError(new Error('test'))).toBe(false);
      expect(isAppError('string')).toBe(false);
      expect(isAppError(null)).toBe(false);
    });
  });

  describe('isOperationalError', () => {
    it('should return true for operational errors', () => {
      expect(isOperationalError(new ValidationError('test'))).toBe(true);
      expect(isOperationalError(new NotFoundError('resource'))).toBe(true);
    });

    it('should return false for non-operational errors', () => {
      expect(isOperationalError(new Error('test'))).toBe(false);
      expect(isOperationalError('string')).toBe(false);
    });
  });

  describe('getErrorCategory', () => {
    it('should categorize validation errors as client_error', () => {
      expect(getErrorCategory(new ValidationError('test'))).toBe('client_error');
      expect(getErrorCategory(new ProtocolError('test'))).toBe('client_error');
    });

    it('should categorize not found errors as not_found', () => {
      expect(getErrorCategory(new NotFoundError('resource'))).toBe('not_found');
    });

    it('should categorize conflict errors as conflict', () => {
      expect(getErrorCategory(new ConflictError('test'))).toBe('conflict');
    });

    it('should categorize auth errors as auth_error', () => {
      expect(getErrorCategory(new AuthenticationError())).toBe('auth_error');
      expect(getErrorCategory(new AuthorizationError())).toBe('auth_error');
    });

    it('should categorize database errors as database_error', () => {
      expect(getErrorCategory(new DatabaseError('test'))).toBe('database_error');
    });

    it('should categorize limit errors as limit_error', () => {
      expect(getErrorCategory(new QuotaError('messages', 100, 150))).toBe('limit_error');
      expect(getErrorCategory(new RateLimitError(60))).toBe('limit_error');
    });

    it('should categorize system errors correctly', () => {
      expect(getErrorCategory(new Error('test'))).toBe('system_error');
      expect(getErrorCategory('string')).toBe('system_error');
    });
  });

  describe('extractErrorInfo', () => {
    it('should extract info from AppError', () => {
      const error = new ValidationError('Test error', { field: 'value' });
      const info = extractErrorInfo(error);
      
      expect(info).toMatchObject({
        message: 'Test error',
        stack: expect.any(String),
        code: 'VALIDATION_ERROR',
        category: 'client_error',
        statusCode: 400,
        errorId: expect.any(String),
        details: { field: 'value' }
      });
    });

    it('should extract info from regular Error', () => {
      const error = new Error('Regular error');
      const info = extractErrorInfo(error);
      
      expect(info).toMatchObject({
        message: 'Regular error',
        stack: expect.any(String),
        category: 'system_error'
      });
    });

    it('should extract info from non-Error objects', () => {
      const info = extractErrorInfo('String error');
      
      expect(info).toEqual({
        message: 'String error',
        category: 'unknown_error'
      });
    });
  });

  describe('normalizeError', () => {
    it('should return AppError as-is', () => {
      const error = new ValidationError('test');
      expect(normalizeError(error)).toBe(error);
    });

    it('should convert Zod error to ValidationError', () => {
      const schema = z.string();
      try {
        schema.parse(123);
      } catch (zodError) {
        const normalized = normalizeError(zodError);
        expect(normalized).toBeInstanceOf(ValidationError);
      }
    });

    it('should categorize error based on message', () => {
      expect(normalizeError(new Error('validation failed'))).toBeInstanceOf(ValidationError);
      expect(normalizeError(new Error('not found'))).toBeInstanceOf(NotFoundError);
      expect(normalizeError(new Error('duplicate entry'))).toBeInstanceOf(ConflictError);
      expect(normalizeError(new Error('timeout occurred'))).toBeInstanceOf(TimeoutError);
      expect(normalizeError(new Error('database error'))).toBeInstanceOf(DatabaseError);
    });

    it('should create generic AppError for unknown errors', () => {
      const normalized = normalizeError(new Error('unknown error'));
      expect(normalized).toBeInstanceOf(AppError);
      expect(normalized.code).toBe('UNKNOWN_ERROR');
    });

    it('should handle non-Error objects', () => {
      const normalized = normalizeError('string error');
      expect(normalized).toBeInstanceOf(AppError);
      expect(normalized.message).toBe('string error');
    });
  });
});

describe('ErrorUtils', () => {
  describe('wrapAsync', () => {
    it('should return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await ErrorUtils.wrapAsync(operation, 'test');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should normalize and re-throw errors', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('test error'));
      
      await expect(ErrorUtils.wrapAsync(operation, 'test')).rejects.toThrow(Error);
    });

    it('should add context to error details', async () => {
      const operation = jest.fn().mockRejectedValue(new ValidationError('test'));
      
      try {
        await ErrorUtils.wrapAsync(operation, 'test context');
      } catch (error) {
        expect(isAppError(error)).toBe(true);
        if (isAppError(error)) {
          expect(error.details).toMatchObject({ context: 'test context' });
        }
      }
    });
  });

  describe('wrapSync', () => {
    it('should return result on success', () => {
      const operation = jest.fn().mockReturnValue('success');
      const result = ErrorUtils.wrapSync(operation, 'test');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should normalize and re-throw errors', () => {
      const operation = jest.fn().mockImplementation(() => {
        throw new Error('test error');
      });
      
      expect(() => ErrorUtils.wrapSync(operation, 'test')).toThrow(Error);
    });
  });

  describe('wrapDatabaseOperation', () => {
    it('should return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const result = await ErrorUtils.wrapDatabaseOperation(operation, 'SELECT');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should convert errors to DatabaseError', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('SQLite error'));
      
      await expect(ErrorUtils.wrapDatabaseOperation(operation, 'SELECT'))
        .rejects.toThrow(DatabaseError);
    });

    it('should handle non-Error objects', async () => {
      const operation = jest.fn().mockRejectedValue('string error');
      
      try {
        await ErrorUtils.wrapDatabaseOperation(operation, 'SELECT');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).details).toMatchObject({ operation: 'SELECT' });
      }
    });
  });
});