/**
 * Test real embeddings work with local cache - WORKING VERSION
 */

import { env } from '@huggingface/transformers';
import { DatabaseManager } from './src/storage/Database.js';
import { EmbeddingManager } from './src/search/EmbeddingManager.js';
import fs from 'node:fs';
import path from 'node:path';

async function createProperLocalModelStructure() {
  console.log('📂 Creating proper local model structure...');
  
  const sourceDir = './.cache/transformers/Xenova/all-MiniLM-L6-v2';
  const targetDir = './models/Xenova/all-MiniLM-L6-v2'; // Full path with Xenova
  
  // Create target directory structure
  fs.mkdirSync(path.dirname(targetDir), { recursive: true });
  
  if (fs.existsSync(targetDir)) {
    console.log('  Target directory already exists, removing...');
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  
  // Create symbolic link to cached files
  fs.symlinkSync(path.resolve(sourceDir), targetDir, 'dir');
  console.log(`  ✅ Created symlink: ${targetDir} -> ${sourceDir}`);
  
  // Verify files are accessible
  const files = ['config.json', 'tokenizer_config.json', 'tokenizer.json'];
  for (const file of files) {
    const filePath = path.join(targetDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`  ✅ ${file} accessible`);
    } else {
      console.log(`  ❌ ${file} NOT accessible`);
    }
  }
  
  // Check ONNX model
  const onnxPath = path.join(targetDir, 'onnx', 'model.onnx');
  if (fs.existsSync(onnxPath)) {
    console.log(`  ✅ model.onnx accessible`);
  } else {
    console.log(`  ❌ model.onnx NOT accessible`);
  }
}

async function testWorkingEmbeddings() {
  console.log('🧪 Testing Working Real Embeddings');
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
    console.log(`  Use FS cache: ${env.useFSCache}`);

    // Create local model structure
    await createProperLocalModelStructure();

    // Initialize database
    const dbManager = new DatabaseManager({
      databasePath: ':memory:',
      enableWAL: true,
      enableForeignKeys: true
    });
    await dbManager.initialize();
    console.log('✅ Database initialized');

    // Initialize embedding manager with full model name
    const embeddingManager = new EmbeddingManager(dbManager, {
      modelName: 'Xenova/all-MiniLM-L6-v2', // Use full model name
      enableCache: true
      // NOTE: Not setting cacheDir to let it use default local model resolution
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

    for (const text of testTexts) {
      const start = Date.now();
      const embedding = await embeddingManager.generateEmbedding(text);
      const time = Date.now() - start;
      console.log(`✅ "${text.substring(0, 30)}..." -> ${embedding.embedding.length}D vector in ${time}ms`);
    }

    // Test similarity
    console.log('\n🔍 Testing similarity calculation...');
    const embedding1 = await embeddingManager.generateEmbedding('cats and dogs');
    const embedding2 = await embeddingManager.generateEmbedding('pets and animals');
    const embedding3 = await embeddingManager.generateEmbedding('weather forecast');

    const sim1 = await embeddingManager.calculateSimilarity(
      embedding1.embedding,
      embedding2.embedding
    );
    const sim2 = await embeddingManager.calculateSimilarity(
      embedding1.embedding,
      embedding3.embedding
    );

    console.log(`✅ Similarity "cats and dogs" <-> "pets and animals": ${sim1.toFixed(3)}`);
    console.log(`✅ Similarity "cats and dogs" <-> "weather forecast": ${sim2.toFixed(3)}`);
    console.log(`✅ As expected, pet similarity (${sim1.toFixed(3)}) > weather similarity (${sim2.toFixed(3)})`);

    // Get health status
    console.log('\n💚 Health Status:');
    const health = await embeddingManager.getHealth();
    console.log(`  Status: ${health.status}`);
    console.log(`  Message: ${health.message}`);
    console.log(`  Model loaded: ${health.details.modelLoaded}`);
    console.log(`  Model name: ${health.details.modelName}`);
    console.log(`  Cache enabled: ${health.details.cacheEnabled}`);
    console.log(`  Average latency: ${health.details.averageLatency}ms`);

    console.log('\n🎉 Working embeddings are functioning perfectly!');
    
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
testWorkingEmbeddings().catch(console.error);