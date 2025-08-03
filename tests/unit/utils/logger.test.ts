/**
 * Tests for the logging system
 */

import * as fs from 'fs';
import { 
  Logger, 
  LogLevel,
  initializeLogger,
  getLogger,
  parseLogLevel,
  log,
  PerformanceTimer
} from '../../../src/utils/logger';
import { ValidationError } from '../../../src/utils/errors';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('Logger', () => {
  let testLogger: Logger;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    testLogger = new Logger({
      level: LogLevel.DEBUG,
      enableConsole: true,
      enableFile: false,
      enableColors: false,
      outputFormat: 'text'
    });
    
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('Log Levels', () => {
    it('should respect log level filtering', () => {
      const logger = new Logger({ level: LogLevel.WARN });
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      expect(consoleSpy).toHaveBeenCalledTimes(2); // Only warn and error
    });

    it('should log all levels when set to DEBUG', () => {
      testLogger.debug('debug message');
      testLogger.info('info message');
      testLogger.warn('warn message');
      testLogger.error('error message');
      
      expect(consoleSpy).toHaveBeenCalledTimes(4);
    });

    it('should not log anything when set to SILENT', () => {
      const logger = new Logger({ level: LogLevel.SILENT });
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Context Management', () => {
    it('should set and use global context', () => {
      testLogger.setContext({ requestId: '123', userId: 'user1' });
      testLogger.info('test message');
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('requestId=123');
      expect(logCall).toContain('userId=user1');
    });

    it('should merge local context with global context', () => {
      testLogger.setContext({ requestId: '123' });
      testLogger.info('test message', undefined, { operation: 'test' });
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('requestId=123');
      expect(logCall).toContain('operation=test');
    });

    it('should allow local context to override global context', () => {
      testLogger.setContext({ requestId: '123' });
      testLogger.info('test message', undefined, { requestId: '456' });
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('requestId=456');
      expect(logCall).not.toContain('requestId=123');
    });

    it('should clear context', () => {
      testLogger.setContext({ requestId: '123' });
      testLogger.clearContext();
      testLogger.info('test message');
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).not.toContain('requestId=123');
    });
  });

  describe('Output Formats', () => {
    it('should format text output correctly', () => {
      testLogger.info('test message', { key: 'value' });
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toMatch(/^\[.+\] INFO: test message \| {"key":"value"}$/);
    });

    it('should format JSON output correctly', () => {
      const logger = new Logger({ outputFormat: 'json' });
      logger.info('test message', { key: 'value' });
      
      const logCall = consoleSpy.mock.calls[0][0];
      const parsed = JSON.parse(logCall);
      
      expect(parsed).toMatchObject({
        level: LogLevel.INFO,
        message: 'test message',
        metadata: { key: 'value' },
        timestamp: expect.any(Number)
      });
    });

    it('should include context in text format', () => {
      testLogger.info('test message', undefined, { requestId: '123' });
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('requestId=123');
    });
  });

  describe('Error Logging', () => {
    it('should log error with error object', () => {
      const error = new ValidationError('Validation failed');
      testLogger.error('Test error', error);
      
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('Test error');
    });

    it('should include stack trace when enabled', () => {
      const logger = new Logger({ enableStackTrace: true });
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      expect(consoleSpy).toHaveBeenCalledTimes(2); // Message + stack trace
    });

    it('should not include stack trace when disabled', () => {
      const logger = new Logger({ enableStackTrace: false });
      const error = new Error('Test error');
      logger.error('Error occurred', error);
      
      expect(consoleSpy).toHaveBeenCalledTimes(1); // Only message
    });
  });

  describe('Performance Logging', () => {
    it('should log performance metrics', () => {
      const metrics = {
        operation: 'test_operation',
        duration: 123.45,
        timestamp: Date.now(),
        requestId: '123'
      };
      
      testLogger.performance(metrics);
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('Performance: test_operation took 123.45ms');
    });

    it('should time operations and log performance', async () => {
      const operation = jest.fn().mockResolvedValue('result');
      
      const result = await testLogger.timeOperation(operation, 'test_op');
      
      expect(result).toBe('result');
      expect(operation).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('Performance: test_op took');
    });

    it('should log performance even when operation fails', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));
      
      await expect(testLogger.timeOperation(operation, 'test_op')).rejects.toThrow();
      
      expect(consoleSpy).toHaveBeenCalled();
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('Performance: test_op (failed) took');
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger with additional context', () => {
      testLogger.setContext({ globalKey: 'global' });
      const childLogger = testLogger.child({ childKey: 'child' });
      
      childLogger.info('test message');
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).toContain('globalKey=global');
      expect(logCall).toContain('childKey=child');
    });

    it('should not affect parent logger context', () => {
      testLogger.child({ childKey: 'child' });
      testLogger.info('parent message');
      
      const logCall = consoleSpy.mock.calls[0][0];
      expect(logCall).not.toContain('childKey=child');
    });
  });

  describe('File Logging', () => {
    beforeEach(() => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.mkdirSync.mockImplementation();
      mockFs.appendFileSync.mockImplementation();
      mockFs.statSync.mockReturnValue({ size: 1000 } as fs.Stats);
    });

    it('should write to file when enabled', () => {
      const logger = new Logger({
        enableFile: true,
        filePath: '/tmp/test.log',
        outputFormat: 'text'
      });
      
      logger.info('test message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        '/tmp/test.log',
        expect.stringMatching(/INFO: test message/),
        'utf8'
      );
    });

    it('should write JSON to file when format is JSON', () => {
      const logger = new Logger({
        enableFile: true,
        filePath: '/tmp/test.log',
        outputFormat: 'json'
      });
      
      logger.info('test message');
      
      expect(mockFs.appendFileSync).toHaveBeenCalledWith(
        '/tmp/test.log',
        expect.stringMatching(/^{.*}\n$/),
        'utf8'
      );
    });

    it('should handle file write errors gracefully', () => {
      mockFs.appendFileSync.mockImplementation(() => {
        throw new Error('Write failed');
      });
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const logger = new Logger({
        enableFile: true,
        filePath: '/tmp/test.log'
      });
      
      logger.info('test message');
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to write to log file:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Configuration', () => {
    it('should update configuration', () => {
      testLogger.updateConfig({ level: LogLevel.ERROR });
      
      testLogger.info('info message');
      testLogger.error('error message');
      
      expect(consoleSpy).toHaveBeenCalledTimes(1); // Only error message
    });

    it('should get current configuration', () => {
      const config = testLogger.getConfig();
      
      expect(config).toMatchObject({
        level: LogLevel.DEBUG,
        enableConsole: true,
        enableFile: false,
        enableColors: false,
        outputFormat: 'text'
      });
    });
  });
});

describe('Utility Functions', () => {
  describe('parseLogLevel', () => {
    it('should parse valid log levels', () => {
      expect(parseLogLevel('DEBUG')).toBe(LogLevel.DEBUG);
      expect(parseLogLevel('info')).toBe(LogLevel.INFO);
      expect(parseLogLevel('WARN')).toBe(LogLevel.WARN);
      expect(parseLogLevel('warning')).toBe(LogLevel.WARN);
      expect(parseLogLevel('ERROR')).toBe(LogLevel.ERROR);
      expect(parseLogLevel('SILENT')).toBe(LogLevel.SILENT);
      expect(parseLogLevel('none')).toBe(LogLevel.SILENT);
    });

    it('should return INFO for invalid levels', () => {
      expect(parseLogLevel('invalid')).toBe(LogLevel.INFO);
      expect(parseLogLevel('')).toBe(LogLevel.INFO);
      expect(parseLogLevel(undefined)).toBe(LogLevel.INFO);
    });
  });

  describe('initializeLogger', () => {
    it('should initialize logger with default config', () => {
      const logger = initializeLogger();
      expect(logger).toBeInstanceOf(Logger);
    });

    it('should initialize logger with custom config', () => {
      const logger = initializeLogger({ level: LogLevel.ERROR });
      expect(logger.getConfig().level).toBe(LogLevel.ERROR);
    });
  });

  describe('getLogger', () => {
    it('should return the same instance', () => {
      const logger1 = getLogger();
      const logger2 = getLogger();
      expect(logger1).toBe(logger2);
    });
  });

  describe('log convenience functions', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should provide convenience logging functions', () => {
      log.debug('debug message');
      log.info('info message');
      log.warn('warn message');
      log.error('error message');
      
      expect(consoleSpy).toHaveBeenCalled();
    });
  });
});

describe('PerformanceTimer', () => {
  let loggerSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock the performance method on the logger
    loggerSpy = jest.spyOn(Logger.prototype, 'performance').mockImplementation();
  });

  afterEach(() => {
    loggerSpy.mockRestore();
  });

  it('should measure and log performance', () => {
    const timer = new PerformanceTimer('test_operation');
    
    const duration = timer.stop();
    
    expect(duration).toBeGreaterThan(0);
    expect(loggerSpy).toHaveBeenCalled();
    
    const [metrics] = loggerSpy.mock.calls[0];
    expect(metrics.operation).toBe('test_operation');
    expect(metrics.duration).toBeGreaterThan(0);
  });

  it('should use custom logger', () => {
    const customLogger = new Logger({ level: LogLevel.DEBUG });
    const loggerPerformanceSpy = jest.spyOn(customLogger, 'performance').mockImplementation();
    const timer = new PerformanceTimer('test_operation', customLogger);
    
    const duration = timer.stop();
    
    expect(duration).toBeGreaterThan(0);
    expect(loggerPerformanceSpy).toHaveBeenCalled();
    
    loggerPerformanceSpy.mockRestore();
  });

  it('should include context and metadata', () => {
    const timer = new PerformanceTimer('test_operation');
    
    const duration = timer.stop(
      { requestId: '123' },
      { additional: 'data' }
    );
    
    expect(duration).toBeGreaterThan(0);
    expect(loggerSpy).toHaveBeenCalled();
    
    const [metrics, context] = loggerSpy.mock.calls[0];
    expect(metrics.metadata).toEqual({ additional: 'data' });
    expect(context?.requestId).toBe('123');
  });
});