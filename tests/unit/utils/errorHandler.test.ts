/**
 * Tests for the centralized error handler
 */

import {
  MCPErrorHandler,
  initializeErrorHandler,
  getErrorHandler,
  handleError,
  handleValidationError,
  handleDatabaseError,
  withErrorHandling,
  executeMCPTool,
  createSuccessResponse,
  isErrorResponse,
  extractErrorFromMCPResult
} from '../../../src/utils/errorHandler';
import { MCPToolResult } from '../../../src/types/mcp';
import { ErrorResponse } from '../../../src/types/interfaces';
import {
  ValidationError,
  NotFoundError,
  DatabaseError
} from '../../../src/utils/errors';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  getLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  })
}));

describe('MCPErrorHandler', () => {
  let errorHandler: MCPErrorHandler;

  beforeEach(() => {
    errorHandler = new MCPErrorHandler({
      includeStackTrace: false,
      includeErrorId: true,
      includeDetails: true,
      sanitizeInProduction: false
    });
  });

  describe('Error Handling', () => {
    it('should handle ValidationError correctly', () => {
      const error = new ValidationError('Invalid input', [
        { message: 'Required', path: ['name'] }
      ]);
      
      const result = errorHandler.handleError(error);
      
      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      expect(response.success).toBe(false);
      expect(response.error).toBe('VALIDATION_ERROR');
      expect(response.message).toBe('The request contains invalid parameters');
      expect(response.details).toEqual([{ message: 'Required', path: ['name'] }]);
    });

    it('should handle ValidationError without message overrides', () => {
      const handler = new MCPErrorHandler({ messageOverrides: {} });
      const error = new ValidationError('Original validation message');
      
      const result = handler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.message).toBe('Original validation message');
    });

    it('should handle NotFoundError correctly', () => {
      const error = new NotFoundError('User', '123');
      
      const result = errorHandler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.error).toBe('NOT_FOUND');
      expect(response.message).toBe("User with identifier '123' not found");
    });

    it('should handle DatabaseError correctly', () => {
      const originalError = new Error('SQLite constraint failed');
      const error = new DatabaseError('Database operation failed', originalError, 'INSERT');
      
      const result = errorHandler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.error).toBe('DATABASE_ERROR');
      expect(response.message).toBe('A database error occurred while processing your request');
    });

    it('should handle unknown errors', () => {
      const result = errorHandler.handleError('String error');
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.error).toBe('UNKNOWN_ERROR');
      expect(response.message).toBe('String error');
    });

    it('should include context information', () => {
      const error = new ValidationError('Test error');
      const context = { requestId: '123', userId: 'user1' };
      
      const result = errorHandler.handleError(error, context, 'test_tool');
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.requestId).toBe('123');
    });

    it('should include error ID when configured', () => {
      const error = new ValidationError('Test error');
      
      const result = errorHandler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.errorId).toBeDefined();
      expect(response.errorId).toMatch(/^VALIDATION_ERROR_\d+_[a-z0-9]{6}$/);
    });

    it('should exclude error ID when configured', () => {
      const handler = new MCPErrorHandler({ includeErrorId: false });
      const error = new ValidationError('Test error');
      
      const result = handler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.errorId).toBeUndefined();
    });
  });

  describe('Detail Inclusion', () => {
    it('should include details for validation errors', () => {
      const error = new ValidationError('Invalid input', { field: 'name' });
      
      const result = errorHandler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.details).toEqual({ field: 'name' });
    });

    it('should exclude details when configured', () => {
      const handler = new MCPErrorHandler({ includeDetails: false });
      const error = new ValidationError('Invalid input', { field: 'name' });
      
      const result = handler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.details).toBeUndefined();
    });

    it('should sanitize sensitive details', () => {
      const error = new ValidationError('Invalid input', {
        field: 'name',
        password: 'secret123',
        nested: { token: 'abc123', safe: 'value' }
      });
      
      const result = errorHandler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.details).toEqual({
        field: 'name',
        nested: { safe: 'value', token: '[REDACTED]' },
        password: '[REDACTED]'
      });
    });
  });

  describe('Production Mode', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    afterEach(() => {
      process.env.NODE_ENV = 'test';
    });

    it('should sanitize error messages in production', () => {
      const handler = new MCPErrorHandler({ 
        sanitizeInProduction: true,
        messageOverrides: {} // Remove overrides to test production sanitization
      });
      const error = new DatabaseError('Internal database constraint violation');
      
      const result = handler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.message).toBe('A data storage error occurred');
    });

    it('should use custom message overrides', () => {
      const handler = new MCPErrorHandler({
        messageOverrides: {
          'VALIDATION_ERROR': 'Custom validation message'
        }
      });
      const error = new ValidationError('Original message');
      
      const result = handler.handleError(error);
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.message).toBe('Custom validation message');
    });
  });

  describe('Specific Error Handlers', () => {
    it('should handle validation errors specifically', () => {
      const result = errorHandler.handleValidationError('Not a validation error');
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.error).toBe('VALIDATION_ERROR');
    });

    it('should handle database errors specifically', () => {
      const handler = new MCPErrorHandler({ messageOverrides: {} });
      const sqliteError = new Error('UNIQUE constraint failed');
      const result = handler.handleDatabaseError(sqliteError, 'INSERT');
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.error).toBe('DATABASE_ERROR');
      expect(response.message).toBe('Resource already exists');
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      errorHandler.updateConfig({ includeDetails: false });
      const config = errorHandler.getConfig();
      
      expect(config.includeDetails).toBe(false);
    });

    it('should get current configuration', () => {
      const config = errorHandler.getConfig();
      
      expect(config).toMatchObject({
        includeStackTrace: false,
        includeErrorId: true,
        includeDetails: true,
        sanitizeInProduction: false
      });
    });
  });
});

describe('Global Functions', () => {
  describe('initializeErrorHandler and getErrorHandler', () => {
    it('should initialize and return the same instance', () => {
      const handler1 = initializeErrorHandler();
      const handler2 = getErrorHandler();
      
      expect(handler1).toBe(handler2);
    });
  });

  describe('Convenience functions', () => {
    it('should handle error with convenience function', () => {
      const result = handleError(new ValidationError('Test error'));
      
      expect(result.isError).toBe(true);
    });

    it('should handle validation error with convenience function', () => {
      const result = handleValidationError('Invalid');
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.error).toBe('VALIDATION_ERROR');
    });

    it('should handle database error with convenience function', () => {
      const result = handleDatabaseError(new Error('DB error'), 'SELECT');
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      
      expect(response.error).toBe('DATABASE_ERROR');
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap function and return result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const wrapped = withErrorHandling(fn, 'test_tool');
      
      const result = await wrapped('arg1', 'arg2');
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('should log and re-throw errors', async () => {
      const fn = jest.fn().mockRejectedValue(new ValidationError('Test error'));
      const wrapped = withErrorHandling(fn, 'test_tool');
      
      await expect(wrapped()).rejects.toThrow(ValidationError);
    });
  });

  describe('executeMCPTool', () => {
    it('should execute tool and return success response', async () => {
      const operation = jest.fn().mockResolvedValue({ data: 'test' });
      
      const result = await executeMCPTool(operation, 'test_tool');
      
      expect(result.isError).toBeUndefined();
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ data: 'test' });
    });

    it('should handle errors and return error response', async () => {
      const operation = jest.fn().mockRejectedValue(new ValidationError('Test error'));
      
      const result = await executeMCPTool(operation, 'test_tool');
      
      expect(result.isError).toBe(true);
      
      const response = JSON.parse(result.content[0].text!) as ErrorResponse;
      expect(response.success).toBe(false);
      expect(response.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('createSuccessResponse', () => {
    it('should create formatted success response', () => {
      const result = createSuccessResponse({ test: 'data' });
      
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ test: 'data' });
    });
  });

  describe('isErrorResponse', () => {
    it('should identify error responses', () => {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'TEST_ERROR',
        message: 'Test error',
        timestamp: Date.now()
      };
      
      expect(isErrorResponse(errorResponse)).toBe(true);
    });

    it('should identify non-error responses', () => {
      expect(isErrorResponse({ success: true, data: {} })).toBe(false);
      expect(isErrorResponse(null)).toBeFalsy();
      expect(isErrorResponse('string')).toBe(false);
    });
  });

  describe('extractErrorFromMCPResult', () => {
    it('should extract error from MCP error result', () => {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'TEST_ERROR',
        message: 'Test error',
        timestamp: Date.now()
      };
      
      const mcpResult: MCPToolResult = {
        isError: true,
        content: [{
          type: 'text',
          text: JSON.stringify(errorResponse)
        }]
      };
      
      const extracted = extractErrorFromMCPResult(mcpResult);
      expect(extracted).toEqual(errorResponse);
    });

    it('should return null for success results', () => {
      const mcpResult: MCPToolResult = {
        content: [{
          type: 'text',
          text: JSON.stringify({ success: true, data: {} })
        }]
      };
      
      const extracted = extractErrorFromMCPResult(mcpResult);
      expect(extracted).toBeNull();
    });

    it('should return null for invalid results', () => {
      const mcpResult: MCPToolResult = {
        isError: true,
        content: [{
          type: 'text',
          text: 'invalid json'
        }]
      };
      
      const extracted = extractErrorFromMCPResult(mcpResult);
      expect(extracted).toBeNull();
    });
  });
});