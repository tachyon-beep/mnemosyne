/**
 * Debug transformers.js path resolution and cache behavior
 */

import { env } from '@huggingface/transformers';
import fs from 'node:fs';
import path from 'node:path';

async function debugTransformers() {
  console.log('🔍 Debugging Transformers.js Path Resolution');
  console.log('=' .repeat(50));

  // Configure environment
  env.cacheDir = './.cache/transformers';
  env.allowRemoteModels = false;
  env.allowLocalModels = true;
  env.localModelPath = './models/';

  console.log('\n📋 Environment Configuration:');
  console.log(`  cacheDir: ${env.cacheDir}`);
  console.log(`  allowRemoteModels: ${env.allowRemoteModels}`);
  console.log(`  allowLocalModels: ${env.allowLocalModels}`);
  console.log(`  localModelPath: ${env.localModelPath}`);
  console.log(`  useFS: ${env.useFS}`);
  console.log(`  useFSCache: ${env.useFSCache}`);

  const modelName = 'Xenova/all-MiniLM-L6-v2';
  console.log(`\n🎯 Testing model: ${modelName}`);

  // Check cache structure
  const cacheDir = './.cache/transformers';
  const modelCacheDir = path.join(cacheDir, modelName);
  console.log(`\n📁 Cache structure check:`);
  console.log(`  Model cache dir: ${modelCacheDir}`);
  console.log(`  Exists: ${fs.existsSync(modelCacheDir)}`);

  if (fs.existsSync(modelCacheDir)) {
    const files = fs.readdirSync(modelCacheDir, { recursive: true });
    console.log(`  Files found:`);
    for (const file of files) {
      const fullPath = path.join(modelCacheDir, file as string);
      const stats = fs.statSync(fullPath);
      console.log(`    ${file} (${stats.isDirectory() ? 'DIR' : 'FILE'}, ${stats.size} bytes)`);
    }
  }

  // Test local model path resolution
  const localModelPath = path.join(env.localModelPath, modelName);
  console.log(`\n🔍 Local model path resolution:`);
  console.log(`  Expected local path: ${localModelPath}`);
  console.log(`  Exists: ${fs.existsSync(localModelPath)}`);

  // Test direct file access to cached files
  const configFile = path.join(modelCacheDir, 'config.json');
  const tokenizerConfigFile = path.join(modelCacheDir, 'tokenizer_config.json');
  
  console.log(`\n📄 Direct file access test:`);
  console.log(`  config.json: ${fs.existsSync(configFile)}`);
  console.log(`  tokenizer_config.json: ${fs.existsSync(tokenizerConfigFile)}`);

  if (fs.existsSync(tokenizerConfigFile)) {
    try {
      const content = fs.readFileSync(tokenizerConfigFile, 'utf8');
      console.log(`  tokenizer_config.json content (first 100 chars): ${content.substring(0, 100)}...`);
    } catch (e) {
      console.log(`  Error reading tokenizer_config.json: ${e}`);
    }
  }

  // Try to manually import the hub utils and test getModelFile
  try {
    console.log(`\n🧪 Testing getModelFile directly...`);
    const { getModelFile } = await import('@huggingface/transformers/src/utils/hub.js');
    
    // Test with various configurations
    const options = {
      local_files_only: true,
      cache_dir: cacheDir
    };

    console.log(`  Attempting to load tokenizer_config.json...`);
    const result = await getModelFile(modelName, 'tokenizer_config.json', false, options);
    console.log(`  Result: ${result ? 'SUCCESS' : 'FAILED'}`);
    
  } catch (e) {
    console.log(`  getModelFile test failed: ${e}`);
  }

  console.log('\n✅ Debug complete');
}

// Run the debug
debugTransformers().catch(console.error);