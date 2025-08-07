/**
 * Global Teardown for Phase 2 Integration Tests
 * 
 * Performs cleanup after all Phase 2 integration tests complete.
 * This includes cleaning up any global resources, test artifacts,
 * and ensuring proper test environment cleanup.
 */

module.exports = async () => {
  console.log('🧹 Cleaning up Phase 2 Integration Tests...');
  
  // Clean up any global test artifacts
  // (In-memory databases are automatically cleaned up per test)
  
  // Reset environment variables
  delete process.env.USE_MOCK_EMBEDDINGS;
  delete process.env.DISABLE_EMBEDDING_TESTS;
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  console.log('✅ Phase 2 Integration Tests cleanup complete');
};