/**
 * Unit tests for BaseTool abstract class
 * 
 * Tests the base functionality including validation, error handling,
 * and response formatting that all concrete tools inherit.
 */

import { z } from 'zod';
import {
  BaseTool,
  ToolContext,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  isKnownError,
  wrapDatabaseOperation
} from '../../../src/tools/BaseTool';
import { MCPTool } from '../../../src/types/mcp';

// Mock tool for testing
const mockToolDef: MCPTool = {
  name: 'test_tool',
  description: 'A test tool for unit testing',
  inputSchema: {
    type: 'object',
    properties: {
      testParam: { type: 'string' },
      optionalParam: { type: 'number' }
    },
    required: ['testParam'],
    additionalProperties: false
  }
};

const mockInputSchema = z.object({
  testParam: z.string(),
  optionalParam: z.number().optional()
}).strict();

type MockInput = z.infer<typeof mockInputSchema>;

interface MockOutput {
  result: string;
  processed: boolean;
}

// Concrete implementation for testing
class TestTool extends BaseTool<MockInput, MockOutput> {
  private shouldThrowError: Error | null = null;
  private mockOutput: MockOutput = { result: 'success', processed: true };

  constructor() {
    super(mockToolDef, mockInputSchema);
  }

  // Method to control behavior for testing
  setThrowError(error: Error | null): void {
    this.shouldThrowError = error;
  }

  setMockOutput(output: MockOutput): void {
    this.mockOutput = output;
  }

  protected async executeImpl(_input: MockInput, _context: ToolContext): Promise<MockOutput> {
    if (this.shouldThrowError) {
      throw this.shouldThrowError;
    }
    return this.mockOutput;
  }
}

describe('BaseTool', () => {
  let testTool: TestTool;
  let mockContext: ToolContext;

  beforeEach(() => {
    testTool = new TestTool();
    mockContext = BaseTool.createContext({
      requestId: 'test-request-123',
      timestamp: Date.now()
    });
  });

  describe('constructor and basic properties', () => {
    test('should initialize with tool definition and schema', () => {
      expect(testTool.getTool()).toEqual(mockToolDef);
      expect(testTool.getName()).toBe('test_tool');
      expect(testTool.getDescription()).toBe('A test tool for unit testing');
    });
  });

  describe('input validation', () => {
    test('should accept valid input', async () => {
      const validInput = { testParam: 'test value' };
      const result = await testTool.execute(validInput, mockContext);
      
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      expect(response.data).toEqual({ result: 'success', processed: true });
    });

    test('should accept valid input with optional parameters', async () => {
      const validInput = { testParam: 'test value', optionalParam: 42 };
      const result = await testTool.execute(validInput, mockContext);
      
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
    });

    test('should reject input missing required parameters', async () => {
      const invalidInput = { optionalParam: 42 }; // missing testParam
      const result = await testTool.execute(invalidInput, mockContext);
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toContain('Invalid input parameters');
    });

    test('should reject input with wrong types', async () => {
      const invalidInput = { testParam: 123 }; // should be string
      const result = await testTool.execute(invalidInput, mockContext);
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });

    test('should reject additional properties when not allowed', async () => {
      const invalidInput = { 
        testParam: 'test', 
        unexpectedParam: 'not allowed' 
      };
      const result = await testTool.execute(invalidInput, mockContext);
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
    });
  });

  describe('error handling', () => {
    test('should handle ValidationError correctly', async () => {
      testTool.setThrowError(new ValidationError('Custom validation error', { field: 'testParam' }));
      
      const result = await testTool.execute({ testParam: 'test' }, mockContext);
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ValidationError');
      expect(response.message).toBe('Custom validation error');
      expect(response.details).toEqual({ field: 'testParam' });
    });

    test('should handle NotFoundError correctly', async () => {
      testTool.setThrowError(new NotFoundError('Resource not found'));
      
      const result = await testTool.execute({ testParam: 'test' }, mockContext);
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('NotFoundError');
      expect(response.message).toBe('Resource not found');
    });

    test('should handle ConflictError correctly', async () => {
      testTool.setThrowError(new ConflictError('Resource conflict'));
      
      const result = await testTool.execute({ testParam: 'test' }, mockContext);
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('ConflictError');
      expect(response.message).toBe('Resource conflict');
    });

    test('should handle DatabaseError correctly and not expose internal details', async () => {
      const originalError = new Error('Internal database connection failed');
      testTool.setThrowError(new DatabaseError('Database operation failed', originalError));
      
      const result = await testTool.execute({ testParam: 'test' }, mockContext);
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('DatabaseError');
      expect(response.message).toBe('A database error occurred while processing your request');
      expect(response.details).toBeUndefined(); // Should not expose internal error
    });

    test('should handle generic Error correctly and not expose internal details', async () => {
      testTool.setThrowError(new Error('Internal system error'));
      
      const result = await testTool.execute({ testParam: 'test' }, mockContext);
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('InternalError');
      expect(response.message).toBe('An internal error occurred while processing your request');
    });

    test('should handle non-Error objects', async () => {
      testTool.setThrowError('string error' as any);
      
      const result = await testTool.execute({ testParam: 'test' }, mockContext);
      
      expect(result.isError).toBe(true);
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('UnknownError');
      expect(response.message).toBe('An unknown error occurred while processing your request');
    });
  });

  describe('response formatting', () => {
    test('should format successful response correctly', async () => {
      const mockOutput = { result: 'custom result', processed: false };
      testTool.setMockOutput(mockOutput);
      
      const result = await testTool.execute({ testParam: 'test' }, mockContext);
      
      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockOutput);
    });

    test('should include proper content structure', async () => {
      const result = await testTool.execute({ testParam: 'test' }, mockContext);
      
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.any(String)
      });
      
      // Verify the text is valid JSON
      expect(() => JSON.parse(result.content[0].text!)).not.toThrow();
    });
  });

  describe('context creation and management', () => {
    test('should create context with default values', () => {
      const context = BaseTool.createContext();
      
      expect(context.requestId).toBeDefined();
      expect(context.timestamp).toBeDefined();
      expect(typeof context.requestId).toBe('string');
      expect(typeof context.timestamp).toBe('number');
    });

    test('should create context with overrides', () => {
      const overrides = {
        requestId: 'custom-request-id',
        metadata: { customField: 'value' }
      };
      
      const context = BaseTool.createContext(overrides);
      
      expect(context.requestId).toBe('custom-request-id');
      expect(context.metadata).toEqual({ customField: 'value' });
      expect(context.timestamp).toBeDefined();
    });

    test('should generate unique request IDs', () => {
      const context1 = BaseTool.createContext();
      const context2 = BaseTool.createContext();
      
      expect(context1.requestId).not.toBe(context2.requestId);
    });
  });

  describe('utility methods', () => {
    test('safeString should validate string input', () => {
      expect(() => testTool['safeString']('valid string', 'testField')).not.toThrow();
      expect(() => testTool['safeString'](123, 'testField')).toThrow(ValidationError);
      expect(() => testTool['safeString'](null, 'testField')).toThrow(ValidationError);
    });

    test('safeNumber should validate number input', () => {
      expect(() => testTool['safeNumber'](42, 'testField')).not.toThrow();
      expect(() => testTool['safeNumber']('not a number', 'testField')).toThrow(ValidationError);
      expect(() => testTool['safeNumber'](NaN, 'testField')).toThrow(ValidationError);
    });

    test('safeBoolean should validate boolean input', () => {
      expect(() => testTool['safeBoolean'](true, 'testField')).not.toThrow();
      expect(() => testTool['safeBoolean'](false, 'testField')).not.toThrow();
      expect(() => testTool['safeBoolean']('not a boolean', 'testField')).toThrow(ValidationError);
      expect(() => testTool['safeBoolean'](1, 'testField')).toThrow(ValidationError);
    });
  });
});

describe('Error utility functions', () => {
  describe('isKnownError', () => {
    test('should identify known error types', () => {
      expect(isKnownError(new ValidationError('test'))).toBe(true);
      expect(isKnownError(new NotFoundError('test'))).toBe(true);
      expect(isKnownError(new ConflictError('test'))).toBe(true);
      expect(isKnownError(new DatabaseError('test'))).toBe(true);
    });

    test('should reject unknown error types', () => {
      expect(isKnownError(new Error('generic error'))).toBe(false);
      expect(isKnownError(new TypeError('type error'))).toBe(false);
      expect(isKnownError('string error')).toBe(false);
      expect(isKnownError(null)).toBe(false);
    });
  });

  describe('wrapDatabaseOperation', () => {
    test('should pass through successful operation result', async () => {
      const operation = jest.fn().mockResolvedValue('success result');
      
      const result = await wrapDatabaseOperation(operation, 'test operation');
      
      expect(result).toBe('success result');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should wrap Error in DatabaseError', async () => {
      const originalError = new Error('connection failed');
      const operation = jest.fn().mockRejectedValue(originalError);
      
      await expect(
        wrapDatabaseOperation(operation, 'test operation')
      ).rejects.toThrow(DatabaseError);
      
      try {
        await wrapDatabaseOperation(operation, 'test operation');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).message).toBe('test operation');
        expect((error as DatabaseError).originalError).toBe(originalError);
      }
    });

    test('should wrap non-Error objects in DatabaseError', async () => {
      const operation = jest.fn().mockRejectedValue('string error');
      
      await expect(
        wrapDatabaseOperation(operation, 'test operation')
      ).rejects.toThrow(DatabaseError);
      
      try {
        await wrapDatabaseOperation(operation, 'test operation');
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        expect((error as DatabaseError).message).toBe('test operation');
        expect((error as DatabaseError).originalError).toBeUndefined();
      }
    });
  });
});

describe('Custom Error Classes', () => {
  test('ValidationError should store details', () => {
    const details = { field: 'test', reason: 'invalid format' };
    const error = new ValidationError('Validation failed', details);
    
    expect(error.name).toBe('ValidationError');
    expect(error.message).toBe('Validation failed');
    expect(error.details).toEqual(details);
  });

  test('NotFoundError should work without details', () => {
    const error = new NotFoundError('Resource not found');
    
    expect(error.name).toBe('NotFoundError');
    expect(error.message).toBe('Resource not found');
  });

  test('ConflictError should work without details', () => {
    const error = new ConflictError('Resource conflict');
    
    expect(error.name).toBe('ConflictError');
    expect(error.message).toBe('Resource conflict');
  });

  test('DatabaseError should store original error', () => {
    const originalError = new Error('connection timeout');
    const error = new DatabaseError('Database operation failed', originalError);
    
    expect(error.name).toBe('DatabaseError');
    expect(error.message).toBe('Database operation failed');
    expect(error.originalError).toBe(originalError);
  });
});