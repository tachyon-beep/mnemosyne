#!/usr/bin/env tsx

/**
 * Model Initialization Script
 * 
 * This script downloads and initializes the embedding model for the MCP Persistence System.
 * It ensures the all-MiniLM-L6-v2 model is available locally and tests its functionality.
 * 
 * Usage:
 *   npm run init:models
 *   or
 *   tsx src/scripts/init-models.ts
 */

import { pipeline, env } from '@huggingface/transformers';
import { existsSync, mkdirSync } from 'fs';
// import { join } from 'path'; // Removed unused import

interface InitializationConfig {
  modelName: string;
  cacheDir: string;
  testTexts: string[];
  expectedDimensions: number;
}

const config: InitializationConfig = {
  modelName: 'Xenova/all-MiniLM-L6-v2',
  cacheDir: './.cache/transformers',
  expectedDimensions: 384,
  testTexts: [
    "Hello world, this is a test sentence.",
    "The weather is beautiful today.",
    "Machine learning models help us understand text semantically.",
    "This sentence tests the embedding model's functionality."
  ]
};

/**
 * Initialize the cache directory
 */
function initializeCacheDirectory(): void {
  console.log(`📁 Setting up cache directory: ${config.cacheDir}`);
  
  if (!existsSync(config.cacheDir)) {
    mkdirSync(config.cacheDir, { recursive: true });
    console.log(`✅ Created cache directory: ${config.cacheDir}`);
  } else {
    console.log(`✅ Cache directory already exists: ${config.cacheDir}`);
  }
  
  // Configure Transformers.js environment
  env.cacheDir = config.cacheDir;
  env.allowRemoteModels = true;
  env.allowLocalModels = true;
  
  console.log(`🔧 Configured Transformers.js environment`);
}

/**
 * Download and initialize the embedding model
 */
async function downloadModel(): Promise<any> {
  console.log(`🔄 Downloading model: ${config.modelName}`);
  console.log(`📦 This may take a few minutes on first run...`);
  
  let downloadProgress = 0;
  
  try {
    const model = await pipeline(
      'feature-extraction',
      config.modelName,
      {
        progress_callback: (data: any) => {
          if (data.status === 'downloading') {
            const progress = Math.round((data.progress || 0) * 100);
            if (progress > downloadProgress + 5) { // Only log every 5% to reduce noise
              downloadProgress = progress;
              console.log(`📥 Downloading: ${progress}%`);
            }
          } else if (data.status === 'loading') {
            console.log(`🔄 Loading model into memory...`);
          } else if (data.status === 'ready') {
            console.log(`✅ Model ready for use`);
          }
        }
      }
    );
    
    console.log(`✅ Model downloaded and loaded successfully`);
    return model;
  } catch (error) {
    console.error(`❌ Failed to download model:`, error);
    throw error;
  }
}

/**
 * Test the model functionality
 */
async function testModel(model: any): Promise<void> {
  console.log(`🧪 Testing model functionality...`);
  
  for (let i = 0; i < config.testTexts.length; i++) {
    const text = config.testTexts[i];
    console.log(`📝 Test ${i + 1}/${config.testTexts.length}: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    try {
      const startTime = Date.now();
      
      const output = await model(text, {
        pooling: 'mean',
        normalize: true
      });
      
      const processingTime = Date.now() - startTime;
      
      // Extract embedding array
      let embedding: number[];
      if (output && typeof output === 'object' && 'data' in output) {
        embedding = Array.from(output.data as Float32Array);
      } else if (Array.isArray(output)) {
        embedding = output;
      } else {
        throw new Error('Unexpected output format');
      }
      
      // Validate embedding
      if (!Array.isArray(embedding)) {
        throw new Error('Output is not an array');
      }
      
      if (embedding.length !== config.expectedDimensions) {
        throw new Error(`Expected ${config.expectedDimensions} dimensions, got ${embedding.length}`);
      }
      
      // Check normalization (should be close to 1.0)
      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
      if (Math.abs(magnitude - 1.0) > 0.1) {
        console.warn(`⚠️  Embedding may not be properly normalized: magnitude = ${magnitude.toFixed(4)}`);
      }
      
      console.log(`   ✅ Generated ${embedding.length}D embedding in ${processingTime}ms (magnitude: ${magnitude.toFixed(4)})`);
      
      // Performance check
      if (processingTime > 500) {
        console.warn(`   ⚠️  Processing time (${processingTime}ms) exceeds recommended threshold (500ms)`);
      }
      
    } catch (error) {
      console.error(`   ❌ Test failed:`, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }
  
  console.log(`✅ All model tests passed successfully`);
}

/**
 * Test batch processing
 */
async function testBatchProcessing(model: any): Promise<void> {
  console.log(`🔄 Testing batch processing...`);
  
  try {
    const startTime = Date.now();
    
    const batchOutput = await model(config.testTexts, {
      pooling: 'mean',
      normalize: true
    });
    
    const processingTime = Date.now() - startTime;
    
    // Handle batch output
    if (batchOutput && typeof batchOutput === 'object' && 'dims' in batchOutput && 'data' in batchOutput) {
      const dims = batchOutput.dims as number[];
      // const _data = batchOutput.data as Float32Array; // Commented out unused variable
      
      if (dims.length === 2 && dims[0] === config.testTexts.length && dims[1] === config.expectedDimensions) {
        console.log(`✅ Batch processing successful: processed ${dims[0]} texts in ${processingTime}ms (${Math.round(processingTime / dims[0])}ms per text)`);
      } else {
        throw new Error(`Unexpected batch dimensions: [${dims.join(', ')}]`);
      }
    } else {
      console.log(`⚠️  Batch processing may not be optimally supported, falling back to individual processing`);
    }
  } catch (error) {
    console.log(`⚠️  Batch processing failed, individual processing will be used:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Performance benchmark
 */
async function runBenchmark(model: any): Promise<void> {
  console.log(`🏃 Running performance benchmark...`);
  
  const benchmarkTexts = [
    "Short text.",
    "This is a medium length sentence that contains some typical content.",
    "This is a longer text passage that simulates a typical message or conversation snippet that might be encountered in real usage scenarios. It contains multiple sentences and represents the kind of content that would commonly be processed by the embedding system.",
    "Very short",
    "Another medium-length example sentence for testing purposes.",
  ];
  
  const results: number[] = [];
  
  for (const text of benchmarkTexts) {
    const startTime = Date.now();
    await model(text, { pooling: 'mean', normalize: true });
    const processingTime = Date.now() - startTime;
    results.push(processingTime);
  }
  
  const avgTime = results.reduce((sum, time) => sum + time, 0) / results.length;
  const minTime = Math.min(...results);
  const maxTime = Math.max(...results);
  
  console.log(`📊 Benchmark Results:`);
  console.log(`   • Average time: ${avgTime.toFixed(1)}ms`);
  console.log(`   • Min time: ${minTime}ms`);
  console.log(`   • Max time: ${maxTime}ms`);
  console.log(`   • Individual times: [${results.map(t => `${t}ms`).join(', ')}]`);
  
  // Performance assessment
  if (avgTime <= 100) {
    console.log(`✅ Excellent performance (target: <100ms)`);
  } else if (avgTime <= 200) {
    console.log(`✅ Good performance (target: <100ms, actual: ${avgTime.toFixed(1)}ms)`);
  } else if (avgTime <= 500) {
    console.log(`⚠️  Acceptable performance (target: <100ms, actual: ${avgTime.toFixed(1)}ms)`);
  } else {
    console.log(`❌ Poor performance (target: <100ms, actual: ${avgTime.toFixed(1)}ms)`);
    console.log(`   Consider using a more powerful device or adjusting performance targets`);
  }
}

/**
 * Display system information
 */
function displaySystemInfo(): void {
  console.log(`💻 System Information:`);
  console.log(`   • Node.js version: ${process.version}`);
  console.log(`   • Platform: ${process.platform}`);
  console.log(`   • Architecture: ${process.arch}`);
  console.log(`   • Memory: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB RSS`);
  
  // Check for specific performance-affecting factors
  if (process.platform === 'darwin' && process.arch === 'arm64') {
    console.log(`   ✅ Apple Silicon detected - good performance expected`);
  } else if (process.platform === 'win32') {
    console.log(`   💡 Windows detected - ensure Windows Subsystem for Linux for best performance`);
  }
}

/**
 * Main initialization function
 */
async function main(): Promise<void> {
  console.log(`🚀 MCP Persistence System - Model Initialization`);
  console.log(`🤖 Initializing all-MiniLM-L6-v2 embedding model\n`);
  
  try {
    // Display system information
    displaySystemInfo();
    console.log();
    
    // Initialize cache directory
    initializeCacheDirectory();
    console.log();
    
    // Download and load model
    const model = await downloadModel();
    console.log();
    
    // Test model functionality
    await testModel(model);
    console.log();
    
    // Test batch processing
    await testBatchProcessing(model);
    console.log();
    
    // Run performance benchmark
    await runBenchmark(model);
    console.log();
    
    console.log(`🎉 Model initialization completed successfully!`);
    console.log(`💡 The model is now cached and ready for use.`);
    console.log(`📁 Cache location: ${config.cacheDir}`);
    console.log(`🔧 You can now start the MCP Persistence Server.`);
    
  } catch (error) {
    console.error(`❌ Model initialization failed:`, error);
    console.log(`\n🔧 Troubleshooting tips:`);
    console.log(`   • Check your internet connection`);
    console.log(`   • Ensure you have sufficient disk space`);
    console.log(`   • Try running again (temporary network issues)`);
    console.log(`   • Check firewall settings if download fails`);
    
    process.exit(1);
  }
}

// Handle CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main as initializeModels, config as modelConfig };