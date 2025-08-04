# MCP Persistence System - Embedding Infrastructure

This document describes the implementation of the local embedding system for semantic search in the MCP Persistence System.

## Overview

The embedding system provides privacy-preserving semantic search capabilities using the all-MiniLM-L6-v2 sentence transformer model running locally via ONNX runtime. This enables intelligent content discovery without sending data to external services.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                 MCP Client (Claude Desktop)             │
└────────────────────┬───────────────────────────────────┘
                     │ MCP Protocol
┌────────────────────┴───────────────────────────────────┐
│              Enhanced Search Engine                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ Embedding    │  │    FTS      │  │   Hybrid     │  │
│  │ Manager      │  │  Enhanced   │  │   Ranker     │  │
│  └──────────────┘  └─────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                     │ Local Storage
┌─────────────────────────────────────────────────────────┐
│          SQLite Database with Embeddings                │
│  ┌────────────┐ ┌────────────┐ ┌─────────────────────┐ │
│  │Messages    │ │Embeddings  │ │    Search Indexes   │ │
│  │& Content   │ │(384D)      │ │    (FTS + Vector)   │ │
│  └────────────┘ └────────────┘ └─────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Key Components

### EmbeddingManager
- **Model**: all-MiniLM-L6-v2 (384 dimensions)
- **Runtime**: ONNX via Transformers.js
- **Features**: Batch processing, caching, performance monitoring
- **Target**: <100ms per embedding

### Model Specifications
- **Name**: `Xenova/all-MiniLM-L6-v2`
- **Dimensions**: 384
- **Max Input**: 512 tokens
- **Normalization**: L2 normalized for cosine similarity
- **Format**: ONNX for optimal Node.js performance

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `@huggingface/transformers` (v3.7.0+) - ONNX model runtime
- Other existing dependencies

### 2. Initialize Models

```bash
npm run init:models
```

This script:
- Downloads the all-MiniLM-L6-v2 model (~90MB)
- Caches it locally in `./.cache/transformers/`
- Tests model functionality and performance
- Provides performance benchmarks

### 3. Run Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:coverage

# Performance benchmarks
npm run benchmark
```

## Usage

### Basic Embedding Generation

```typescript
import { EmbeddingManager } from './src/search/EmbeddingManager';
import { DatabaseManager } from './src/storage/Database';

// Initialize
const dbManager = new DatabaseManager('./data.db');
await dbManager.initialize();

const embeddingManager = new EmbeddingManager(dbManager);
await embeddingManager.initialize();

// Generate single embedding
const embedding = await embeddingManager.generateEmbedding(
  "This is a test sentence for semantic search."
);

// Generate batch embeddings
const embeddings = await embeddingManager.generateBatchEmbeddings([
  "First sentence",
  "Second sentence",
  "Third sentence"
]);

// Find similar content
const queryEmbedding = await embeddingManager.generateEmbedding("machine learning");
const similar = await embeddingManager.findSimilarMessages(queryEmbedding, {
  limit: 10,
  threshold: 0.7
});
```

### Configuration Options

```typescript
const config = {
  modelName: 'Xenova/all-MiniLM-L6-v2',  // Model identifier
  dimensions: 384,                        // Embedding dimensions
  maxLength: 512,                        // Max input length
  enableCache: true,                     // Enable memory caching
  maxCacheSize: 50,                      // Cache size in MB
  cacheDir: './.cache/transformers',     // Model cache directory
  performanceTarget: 100                 // Target ms per embedding
};

const embeddingManager = new EmbeddingManager(dbManager, config);
```

## Performance Targets

### Embedding Generation
- **Single embedding**: <100ms
- **Batch (10 texts)**: <500ms
- **Model loading**: <5 seconds

### Resource Usage
- **Model size**: ~90MB download, ~200MB in memory
- **Memory per embedding**: ~1.5KB (as JSON)
- **Peak memory**: <500MB during batch processing

### Benchmarks

Run benchmarks to measure performance on your system:

```bash
npm run benchmark
```

Expected results on modern hardware:
- **Average time**: 50-150ms per embedding
- **Throughput**: 10-20 embeddings/second
- **Cache hit speedup**: 10-100x faster
- **Batch efficiency**: 20-50% faster than individual

## Database Schema

### Enhanced Messages Table

```sql
ALTER TABLE messages ADD COLUMN embedding TEXT; -- JSON array of floats

-- Index for embedding queries
CREATE INDEX idx_messages_embedding 
  ON messages(conversation_id, created_at DESC) 
  WHERE embedding IS NOT NULL;
```

### Search Configuration

```sql
CREATE TABLE search_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Default values
INSERT OR REPLACE INTO search_config VALUES
  ('embedding_model', '"Xenova/all-MiniLM-L6-v2"', unixepoch()),
  ('embedding_dimensions', '384', unixepoch()),
  ('hybrid_search_weights', '{"semantic": 0.6, "fts": 0.4}', unixepoch());
```

## API Reference

### EmbeddingManager Methods

#### `initialize(): Promise<void>`
Initializes the ONNX model and prepares for embedding generation.

#### `generateEmbedding(text: string): Promise<number[]>`
Generates a 384-dimensional embedding for the input text.

#### `generateBatchEmbeddings(texts: string[]): Promise<number[][]>`
Efficiently generates embeddings for multiple texts.

#### `findSimilarMessages(queryEmbedding: number[], options): Promise<SimilarityResult[]>`
Finds messages with similar semantic content using cosine similarity.

#### `cosineSimilarity(a: number[], b: number[]): number`
Calculates cosine similarity between two embeddings (0-1 range).

#### `getEmbeddingStats(): Promise<EmbeddingStats>`
Returns comprehensive statistics about embedding coverage and performance.

### Error Handling

The system includes comprehensive error handling:

- **Automatic retry**: Failed embeddings are retried with exponential backoff
- **Fallback mechanisms**: Graceful degradation when model is unavailable
- **Health monitoring**: Automatic detection of performance degradation
- **Recovery procedures**: Model reset capabilities for error recovery

## Security & Privacy

### Local-Only Processing
- All embeddings generated locally using ONNX runtime
- No external API calls or data transmission
- Model files cached locally for offline operation

### Data Protection
- Embeddings stored only in local SQLite database
- No telemetry or usage tracking
- Memory cleared after processing
- Secure model file handling

## Troubleshooting

### Common Issues

#### Model Download Fails
```bash
# Check internet connection and retry
npm run init:models

# Manual cache cleanup
rm -rf ./.cache/transformers
npm run init:models
```

#### Performance Issues
```bash
# Run benchmark to identify bottlenecks
npm run benchmark

# Check system resources
node -e "console.log(process.memoryUsage())"

# Clear embedding cache
# (handled automatically in EmbeddingManager)
```

#### Out of Memory
- Reduce batch size in configuration
- Increase Node.js memory limit: `node --max-old-space-size=4096`
- Clear cache more frequently

### Performance Optimization

#### For Better Performance
1. **Use SSD storage** for model cache
2. **Increase Node.js memory** for larger batches
3. **Enable caching** for repeated content
4. **Use batch processing** when possible

#### For Lower Memory Usage
1. **Reduce cache size** in configuration
2. **Process smaller batches** (5-10 texts)
3. **Clear cache periodically**
4. **Disable caching** for memory-constrained environments

## Testing

### Unit Tests
- Model initialization and loading
- Embedding generation accuracy
- Batch processing efficiency
- Caching mechanisms
- Database operations
- Error handling

### Integration Tests
- End-to-end embedding workflow
- Semantic search accuracy
- Performance under load
- Error recovery scenarios

### Performance Tests
- Embedding generation speed
- Memory usage patterns
- Batch processing efficiency
- Cache performance impact

## Migration Guide

### From Mock to Real Embeddings

The system is designed to work with both mock embeddings (for development) and real ONNX embeddings (for production).

1. **Install dependencies**: `npm install`
2. **Initialize models**: `npm run init:models`
3. **Run migration**: Existing data will be automatically processed
4. **Verify functionality**: `npm test`

### Database Migration

The enhanced schema is applied automatically:
- Adds `embedding` column to `messages` table
- Creates search configuration tables
- Sets up performance indexes
- Maintains backward compatibility

## Roadmap

### Phase 1 (Current)
- ✅ Local ONNX model integration
- ✅ Basic semantic search
- ✅ Performance optimization
- ✅ Comprehensive testing

### Phase 2 (Future)
- Multi-language model support
- Custom model fine-tuning
- Advanced similarity metrics
- Query expansion techniques

### Phase 3 (Future)
- Distributed processing
- Model quantization
- Hardware acceleration
- Real-time embedding updates

## Support

For issues, questions, or contributions:

1. **Check the troubleshooting section** above
2. **Run diagnostics**: `npm run benchmark`
3. **Review test output**: `npm test`
4. **Check system requirements**: Node.js 18+, sufficient memory

The embedding system is designed to be robust, performant, and privacy-preserving, enabling powerful semantic search capabilities while maintaining local control of all data.