/**
 * Global Setup for Phase 2 Integration Tests
 * 
 * Performs one-time setup before all Phase 2 integration tests run.
 * This includes environment configuration, mock setup, and any global
 * test infrastructure initialization.
 */

module.exports = async () => {
  console.log('🚀 Setting up Phase 2 Integration Tests...');
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.USE_MOCK_EMBEDDINGS = 'true';
  process.env.DISABLE_EMBEDDING_TESTS = 'true';
  process.env.TZ = 'UTC';
  
  // Disable console output during tests unless DEBUG is set
  if (!process.env.DEBUG) {
    console.log('📵 Suppressing console output during tests (set DEBUG=1 to enable)');
  }
  
  // Set longer timeouts for integration tests
  jest.setTimeout(30000);
  
  console.log('✅ Phase 2 Integration Tests setup complete');
};