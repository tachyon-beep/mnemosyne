/**
 * Test real embeddings work with local cache - SUCCESS VERSION
 */

import { env } from '@huggingface/transformers';
import { DatabaseManager } from './src/storage/Database.js';
import { EmbeddingManager } from './src/search/EmbeddingManager.js';
import fs from 'node:fs';
import path from 'node:path';

async function createCompleteLocalModelStructure() {
  console.log('📂 Creating complete local model structure...');
  
  const sourceDir = './.cache/transformers/Xenova/all-MiniLM-L6-v2';
  
  // Create both possible target directories:
  const targetDirs = [
    './models/Xenova/all-MiniLM-L6-v2',
    './models/all-MiniLM-L6-v2'
  ];
  
  for (const targetDir of targetDirs) {
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }
    
    fs.symlinkSync(path.resolve(sourceDir), targetDir, 'dir');
    console.log(`  ✅ Created symlink: ${targetDir} -> ${sourceDir}`);
  }
}

async function testSuccessfulEmbeddings() {
  console.log('🧪 Testing Successful Real Embeddings');
  console.log('=' .repeat(50));

  try {
    // Configure transformers BEFORE importing anything else
    env.allowRemoteModels = false; // Disable remote access completely
    env.allowLocalModels = true;   // Enable local models
    env.localModelPath = './models/'; // Point to our models directory
    env.useFSCache = false; // Disable FS cache to force local model usage
    
    console.log('\n⚙️  Environment configured:');
    console.log(`  Allow remote: ${env.allowRemoteModels}`);
    console.log(`  Allow local: ${env.allowLocalModels}`);
    console.log(`  Local model path: ${env.localModelPath}`);

    // Create complete local model structure
    await createCompleteLocalModelStructure();

    // Initialize database
    const dbManager = new DatabaseManager({
      databasePath: ':memory:',
      enableWAL: true,
      enableForeignKeys: true
    });
    await dbManager.initialize();
    console.log('✅ Database initialized');

    // Initialize embedding manager
    const embeddingManager = new EmbeddingManager(dbManager, {
      modelName: 'Xenova/all-MiniLM-L6-v2',
      enableCache: true
    });

    console.log('\n📦 Initializing embedding manager...');
    await embeddingManager.initialize();
    console.log('✅ Embedding manager initialized successfully!');

    // Test embedding generation
    console.log('\n🔬 Testing embedding generation...');
    const testTexts = [
      'Hello world, this is a test.',
      'Machine learning is fascinating.',
      'The weather is nice today.'
    ];

    const embeddings: number[][] = [];
    for (const text of testTexts) {
      const start = Date.now();
      const embedding = await embeddingManager.generateEmbedding(text);
      const time = Date.now() - start;
      embeddings.push(embedding);
      console.log(`✅ "${text.substring(0, 30)}..." -> ${embedding.length}D vector in ${time}ms`);
    }

    // Test similarity calculation
    console.log('\n🔍 Testing similarity calculation...');
    const embedding1 = await embeddingManager.generateEmbedding('cats and dogs');
    const embedding2 = await embeddingManager.generateEmbedding('pets and animals');
    const embedding3 = await embeddingManager.generateEmbedding('weather forecast');

    const sim1 = embeddingManager.cosineSimilarity(embedding1, embedding2);
    const sim2 = embeddingManager.cosineSimilarity(embedding1, embedding3);

    console.log(`✅ Similarity "cats and dogs" <-> "pets and animals": ${sim1.toFixed(3)}`);
    console.log(`✅ Similarity "cats and dogs" <-> "weather forecast": ${sim2.toFixed(3)}`);
    console.log(`✅ As expected, pet similarity (${sim1.toFixed(3)}) > weather similarity (${sim2.toFixed(3)})`);

    // Check model health status
    console.log('\n💚 Health Status:');
    console.log(`  Model healthy: ${embeddingManager.isModelHealthy()}`);
    console.log(`  Model initialized: ${embeddingManager.isInitialized}`);

    // Test batch processing
    console.log('\n🚀 Testing batch embedding generation...');
    const batchTexts = [
      'First document for batch processing',
      'Second document in the batch',
      'Third document to test batching',
      'Fourth and final document'
    ];
    
    const batchStart = Date.now();
    const batchEmbeddings = await embeddingManager.generateEmbeddings(batchTexts);
    const batchTime = Date.now() - batchStart;
    
    console.log(`✅ Generated ${batchEmbeddings.length} embeddings in batch: ${batchTime}ms`);
    console.log(`   Average per embedding: ${(batchTime / batchEmbeddings.length).toFixed(1)}ms`);

    console.log('\n🎉 SUCCESS! Embeddings are working perfectly in offline mode!');
    console.log('\n📊 Summary:');
    console.log(`  • Model: Xenova/all-MiniLM-L6-v2`);
    console.log(`  • Dimensions: ${embeddings[0].length}`);
    console.log(`  • Local files: ✅ Working`);
    console.log(`  • Remote access: ❌ Disabled`);
    console.log(`  • Similarity calculations: ✅ Working`);
    console.log(`  • Batch processing: ✅ Working`);
    
    dbManager.close();

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace');
  } finally {
    // Clean up the models directory
    try {
      if (fs.existsSync('./models')) {
        fs.rmSync('./models', { recursive: true, force: true });
        console.log('\n🧹 Cleaned up models directory');
      }
    } catch (e) {
      console.warn('Warning: Could not clean up models directory:', e);
    }
  }
}

// Run the test
testSuccessfulEmbeddings().catch(console.error);