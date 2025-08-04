/**
 * Jest Configuration for Phase 2 Integration Tests
 * 
 * Specialized configuration for running Phase 2 integration tests with
 * appropriate timeouts, setup, and environment configuration.
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/integration/phase2/**/*.integration.test.ts'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform configuration
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  
  // Module name mapping for ES modules
  moduleNameMapping: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/__tests__/setup.ts'
  ],
  
  // Test timeout (Phase 2 tests may take longer due to complexity)
  testTimeout: 30000,
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/storage/repositories/SummaryRepository.ts',
    'src/storage/repositories/ProviderConfigRepository.ts',
    'src/storage/repositories/CacheRepository.ts',
    'src/storage/repositories/SummaryHistoryRepository.ts',
    'src/context/SummaryGenerator.ts',
    'src/context/ContextAssembler.ts',
    'src/tools/GetRelevantSnippetsTool.ts',
    'src/tools/ConfigureLLMProviderTool.ts',
    'src/tools/GetProgressiveDetailTool.ts'
  ],
  
  // Coverage thresholds for Phase 2 components
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    // Specific thresholds for critical components
    'src/context/SummaryGenerator.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    'src/context/ContextAssembler.ts': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    }
  },
  
  // Verbose output for integration tests
  verbose: true,
  
  // Detect open handles (useful for database connections)
  detectOpenHandles: true,
  
  // Force exit after tests (helpful for database cleanup)
  forceExit: true,
  
  // Global setup and teardown
  globalSetup: '<rootDir>/__tests__/integration/phase2/globalSetup.js',
  globalTeardown: '<rootDir>/__tests__/integration/phase2/globalTeardown.js',
  
  // Test environment options
  testEnvironmentOptions: {
    // Node.js environment options
    NODE_ENV: 'test'
  },
  
  // Module directories
  moduleDirectories: ['node_modules', '<rootDir>/src'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/build/'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Reporters
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/test-results/phase2',
      outputName: 'junit.xml',
      suiteName: 'Phase 2 Integration Tests'
    }]
  ],
  
  // Max workers for parallel execution
  maxWorkers: 4,
  
  // Bail after first test suite failure (for CI)
  bail: false,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Reset modules between tests
  resetModules: true,
  
  // Restore mocks after each test
  restoreMocks: true
};