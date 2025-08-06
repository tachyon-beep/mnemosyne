/**
 * Jest Test Environment Setup
 * 
 * Configures the test environment for proper execution including:
 * - Text encoding/decoding for ONNX runtime
 * - Environment variables for test behavior
 * - Mock configuration for CI environments
 */

import { TextEncoder, TextDecoder } from 'util';

// Fix for ONNX runtime in Node.js test environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Configure test environment
if (process.env.CI || !process.env.USE_REAL_EMBEDDINGS) {
  // In CI or when real embeddings are disabled, use mocks
  process.env.DISABLE_REAL_EMBEDDINGS = 'true';
}

// Suppress console errors in tests unless debugging
if (!process.env.DEBUG_TESTS) {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    // Still log critical errors
    if (args[0]?.toString().includes('CRITICAL')) {
      originalError(...args);
    }
  };
}

// Add custom matchers if needed
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}