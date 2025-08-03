/**
 * Jest test setup file for the MCP Persistence System
 * 
 * This file configures the testing environment and provides
 * global setup for all test files.
 */

// Extend Jest matchers if needed
// import '@testing-library/jest-dom';

// Global test configuration
beforeAll(() => {
  // Set timezone to UTC for consistent date testing
  process.env.TZ = 'UTC';
});

// Clean up after each test
afterEach(() => {
  // Reset any modules if needed
  jest.clearAllMocks();
});

// Suppress console output during tests unless DEBUG is set
if (!process.env.DEBUG) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn,
    error: jest.fn(), // Suppress intentional test console.error outputs
  };
}

// Global test utilities (if needed in the future)
export {};