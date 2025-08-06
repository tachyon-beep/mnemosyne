const { HybridSearchTool } = require('./dist/tools/HybridSearchTool.js');
const { createTestDatabase, createTestEmbeddingManager } = require('./dist/tests/utils/test-helpers.js');
const { EnhancedSearchEngine } = require('./dist/search/EnhancedSearchEngine.js');
const { SearchEngine } = require('./dist/search/SearchEngine.js');
const { MessageRepository } = require('./dist/storage/repositories/MessageRepository.js');

async function test() {
  try {
    // Setup
    const dbManager = await createTestDatabase();
    const embeddingManager = await createTestEmbeddingManager(dbManager);
    const messageRepository = new MessageRepository(dbManager);
    const ftsEngine = new SearchEngine(messageRepository);
    const enhancedEngine = new EnhancedSearchEngine(dbManager, embeddingManager, ftsEngine);
    const hybridSearchTool = new HybridSearchTool(enhancedEngine);
    
    // Test
    const result = await hybridSearchTool.handle({
      query: 'test query',
      limit: 5
    }, {});
    
    console.log('Result structure:', JSON.stringify(result, null, 2));
    
    if (result.content && result.content[0] && result.content[0].text) {
      const response = JSON.parse(result.content[0].text);
      console.log('\nParsed response structure:', JSON.stringify(response, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();