/**
 * Tests for the utils module index
 */

import {
  // Error exports
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  isAppError,
  normalizeError,
  
  // Logger exports
  Logger,
  LogLevel,
  getLogger,
  initializeLogger,
  log,
  
  // Error handler exports
  MCPErrorHandler,
  getErrorHandler,
  handleError,
  
  // Utility functions
  initializeUtils,
  createLogger,
  wrapDatabaseOperation,
  wrapOperation
} from '../../../src/utils';

// Mock logger setup
jest.mock('../../../src/utils/logger', () => {
  const mockLogger: any = {
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    timeOperation: jest.fn((fn: () => any) => fn()),
    child: jest.fn(),
    getConfig: jest.fn(() => ({ level: 1 })),
    setContext: jest.fn(),
    log: jest.fn(),
    performance: jest.fn()
  };
  
  // Make child return a similar mock
  mockLogger.child = jest.fn().mockReturnValue(mockLogger);
  
  return {
    ...jest.requireActual('../../../src/utils/logger'),
    getLogger: jest.fn().mockReturnValue(mockLogger)
  };
});


describe('Utils Module Index', () => {
  describe('Exports', () => {
    it('should export error classes', () => {
      expect(AppError).toBeDefined();
      expect(ValidationError).toBeDefined();
      expect(NotFoundError).toBeDefined();
      expect(ConflictError).toBeDefined();
      expect(DatabaseError).toBeDefined();
    });

    it('should export error utilities', () => {
      expect(isAppError).toBeInstanceOf(Function);
      expect(normalizeError).toBeInstanceOf(Function);
    });

    it('should export logger classes and utilities', () => {
      expect(Logger).toBeDefined();
      expect(LogLevel).toBeDefined();
      expect(typeof getLogger).toBe('function');
      expect(initializeLogger).toBeInstanceOf(Function);
      expect(log).toBeDefined();
    });

    it('should export error handler', () => {
      expect(MCPErrorHandler).toBeDefined();
      expect(getErrorHandler).toBeInstanceOf(Function);
      expect(handleError).toBeInstanceOf(Function);
    });

    it('should export utility functions', () => {
      expect(initializeUtils).toBeInstanceOf(Function);
      expect(createLogger).toBeInstanceOf(Function);
      expect(wrapDatabaseOperation).toBeInstanceOf(Function);
      expect(wrapOperation).toBeInstanceOf(Function);
    });
  });

  describe('initializeUtils', () => {
    it('should initialize all utilities with default config', () => {
      const result = initializeUtils();
      
      expect(result.logger).toBeInstanceOf(Logger);
      expect(result.errorHandler).toBeInstanceOf(MCPErrorHandler);
    });

    it('should initialize with custom config', () => {
      const config = {
        logger: { level: LogLevel.ERROR },
        errorHandler: { includeStackTrace: false }
      };
      
      const result = initializeUtils(config);
      
      expect(result.logger).toBeInstanceOf(Logger);
      expect(result.errorHandler).toBeInstanceOf(MCPErrorHandler);
    });
  });

  describe('createLogger', () => {
    it('should create logger with context', () => {
      const context = { requestId: '123', operation: 'test' };
      const logger = createLogger(context);
      
      expect(logger).toBeDefined();
    });
  });

  describe('wrapDatabaseOperation', () => {
    it('should execute operation successfully', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await wrapDatabaseOperation(operation, 'TEST_OP');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
    });

    it('should convert errors to DatabaseError', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('SQLite error'));
      
      await expect(wrapDatabaseOperation(operation, 'TEST_OP'))
        .rejects.toThrow(DatabaseError);
    });

    it('should handle non-Error rejections', async () => {
      const operation = jest.fn().mockRejectedValue('String error');
      
      await expect(wrapDatabaseOperation(operation, 'TEST_OP'))
        .rejects.toThrow(DatabaseError);
    });

    it('should include context in logging', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const context = { requestId: '123' };
      
      await wrapDatabaseOperation(operation, 'TEST_OP', context);
      
      expect(operation).toHaveBeenCalled();
    });
  });

  describe('wrapOperation', () => {
    let localMockLogger: any;

    beforeEach(() => {
      localMockLogger = {
        debug: jest.fn(),
        error: jest.fn(),
        timeOperation: jest.fn((fn) => fn())
      };
      (getLogger as jest.Mock).mockReturnValue(localMockLogger);
    });

    it('should execute operation successfully with logging', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await wrapOperation(operation, 'TEST_OP');
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalled();
      expect(localMockLogger.debug).toHaveBeenCalledWith(
        'Starting operation: TEST_OP',
        undefined,
        undefined
      );
      expect(localMockLogger.debug).toHaveBeenCalledWith(
        'Completed operation: TEST_OP',
        undefined,
        undefined
      );
    });

    it('should handle errors and normalize them', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(wrapOperation(operation, 'TEST_OP'))
        .rejects.toThrow(Error);
      
      expect(localMockLogger.error).toHaveBeenCalledWith(
        "Operation 'TEST_OP' failed",
        expect.any(Error),
        undefined,
        undefined
      );
    });

    it('should include context in logging', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      const context = { requestId: '123' };
      
      await wrapOperation(operation, 'TEST_OP', context);
      
      expect(localMockLogger.debug).toHaveBeenCalledWith(
        'Starting operation: TEST_OP',
        undefined,
        context
      );
    });

    it('should use timeOperation for performance tracking', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      await wrapOperation(operation, 'TEST_OP');
      
      expect(localMockLogger.timeOperation).toHaveBeenCalledWith(
        expect.any(Function),
        'TEST_OP',
        undefined
      );
    });
  });

  describe('Integration', () => {
    it('should work together as a complete system', async () => {
      // Test database operation wrapper
      const dbOperation = jest.fn().mockResolvedValue({ id: 1, name: 'test' });
      const dbResult = await wrapDatabaseOperation(dbOperation, 'SELECT');
      
      expect(dbResult).toEqual({ id: 1, name: 'test' });
      
      // Test error normalization
      const normalizedError = normalizeError('String error');
      expect(normalizedError).toBeInstanceOf(AppError);
    });

    it('should maintain consistency across different components', () => {
      // Create error
      const error = new ValidationError('Test error');
      
      // Check error classification
      expect(isAppError(error)).toBe(true);
      
      // Handle error
      const result = handleError(error);
      expect(result.isError).toBe(true);
      
      // Parse response
      const response = JSON.parse(result.content[0].text!);
      expect(response.success).toBe(false);
      expect(response.error).toBe('VALIDATION_ERROR');
    });
  });
});