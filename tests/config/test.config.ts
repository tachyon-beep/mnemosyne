/**
 * Test Configuration
 * 
 * Centralized configuration for test behavior across the test suite
 */

export const TEST_CONFIG = {
  // Embedding configuration
  embeddings: {
    useReal: process.env.USE_REAL_EMBEDDINGS === 'true' && !process.env.CI,
    timeout: 30000,
    retries: 2,
    mockDelay: 10 // Simulate processing time in mocks
  },
  
  // Timing test configuration
  timing: {
    useHighResolution: true,
    skipIfTooFast: true, // Skip timing assertions if operations < 1ms
    minMeasurableTime: 0.1, // Minimum time (ms) for reliable measurement
    artificialDelay: 1 // Add 1ms delay for update tests
  },
  
  // Performance test configuration
  performance: {
    enableInCI: process.env.CI !== 'true',
    targets: {
      searchQuery: 100,
      embeddingGeneration: 200,
      batchEmbedding: 50,
      concurrentRequests: 15
    }
  },
  
  // Database configuration
  database: {
    path: ':memory:',
    verbose: process.env.DEBUG_TESTS === 'true'
  },
  
  // General test configuration
  general: {
    cleanupAfterEach: true,
    logLevel: process.env.TEST_LOG_LEVEL || 'error',
    throwOnConsoleError: false
  }
};

/**
 * Helper to check if we should skip timing assertions
 */
export function shouldSkipTimingTest(): boolean {
  return process.env.CI === 'true' || process.env.SKIP_TIMING_TESTS === 'true';
}

/**
 * Helper to get high-resolution time
 */
export function getHighResTime(): number {
  if (typeof performance !== 'undefined' && performance.now) {
    return performance.now();
  }
  // Fallback to Date.now() with warning
  console.warn('performance.now() not available, using Date.now()');
  return Date.now();
}

/**
 * Measure operation time with high resolution
 */
export async function measureHighRes<T>(
  operation: () => Promise<T>
): Promise<{ result: T; elapsed: number }> {
  const start = getHighResTime();
  const result = await operation();
  const elapsed = getHighResTime() - start;
  return { result, elapsed };
}

/**
 * Assert timing with intelligent skipping
 */
export function assertTiming(
  actual: number,
  expected: number,
  operator: 'lessThan' | 'greaterThan' | 'approximately' = 'lessThan',
  message?: string
): void {
  if (shouldSkipTimingTest()) {
    console.log(`Skipping timing assertion: ${message || 'CI environment'}`);
    return;
  }
  
  if (actual < TEST_CONFIG.timing.minMeasurableTime && expected < TEST_CONFIG.timing.minMeasurableTime) {
    console.log(`Operations too fast to measure reliably: ${actual}ms, ${expected}ms`);
    return;
  }
  
  switch (operator) {
    case 'lessThan':
      expect(actual).toBeLessThan(expected);
      break;
    case 'greaterThan':
      expect(actual).toBeGreaterThan(expected);
      break;
    case 'approximately':
      expect(actual).toBeCloseTo(expected, 1);
      break;
  }
}