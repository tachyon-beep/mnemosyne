# Enhanced Search Testing Suite

This directory contains comprehensive tests for the Enhanced Search & Discovery functionality of the MCP Persistence System.

## Test Structure

### Unit Tests (`/unit/`)

#### Search Engine Tests
- **`EnhancedSearchEngine.test.ts`** - Core hybrid search engine functionality
  - Strategy selection and auto-routing
  - Result merging and ranking algorithms
  - Performance metrics and monitoring
  - Query analysis and optimization
  - Error handling and recovery

#### Tool Tests
- **`SemanticSearchTool.test.ts`** - MCP semantic search tool
  - Parameter validation and schema compliance
  - Semantic similarity search execution
  - Result formatting and metadata
  - Date filtering and pagination
  - Error handling and edge cases

- **`HybridSearchTool.test.ts`** - MCP hybrid search tool
  - Strategy selection (auto, semantic, FTS, hybrid)
  - Custom weighting and ranking
  - Advanced search features
  - Query intelligence and recommendations
  - Performance optimization

### Integration Tests (`/integration/`)

- **`enhanced-search-integration.test.ts`** - End-to-end system integration
  - Complete search pipeline testing
  - Cross-component interactions
  - Real-world usage scenarios
  - MCP protocol compliance
  - Data consistency and reliability

### Performance Tests (`/performance/`)

- **`search-performance.test.ts`** - Performance benchmarking
  - Individual search method targets (semantic <500ms, FTS <100ms, hybrid <750ms)
  - Concurrent request handling
  - Large dataset performance
  - Memory usage optimization
  - Scaling characteristics

### Stress Tests (`/stress/`)

- **`search-stress.test.ts`** - Extreme condition testing
  - Edge cases and boundary conditions
  - Resource exhaustion scenarios
  - Error recovery and resilience
  - System limits and constraints
  - Long-running stability

### Utilities (`/utils/`)

- **`test-helpers.ts`** - Shared testing utilities
  - Test database creation and setup
  - Mock data generation
  - Performance timing helpers
  - Mock transport for MCP testing
  - Validation utilities

## Running Tests

### Individual Test Suites

```bash
# Enhanced search unit tests
npm run test:enhanced-search

# Integration tests
npm run test:integration

# Performance tests (run serially)
npm run test:performance

# Stress tests (run serially)
npm run test:stress

# All search-related tests
npm run test:all-search
```

### Standard Test Commands

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## Test Data

### Test Conversations
The test suite uses realistic conversation data covering various topics:

1. **Technical Discussions** (`conv-tech-1`)
   - React, TypeScript, state management
   - Web development best practices

2. **Cooking & Recipes** (`conv-cooking-1`)
   - Pasta carbonara recipe
   - Cooking techniques and tips

3. **Machine Learning** (`conv-science-1`)
   - Neural networks and deep learning
   - Backpropagation and training

4. **Travel Planning** (`conv-travel-1`)
   - Tokyo destinations and attractions
   - Japanese cuisine recommendations

5. **Philosophy** (`conv-philosophy-1`)
   - Meaning of life discussions
   - Different philosophical traditions

### Test Queries
Predefined test queries validate different search scenarios:

- **Semantic queries**: Conceptual similarity searches
- **FTS queries**: Exact phrase and keyword matching
- **Hybrid queries**: Combined semantic and text matching
- **Complex queries**: Multi-term with operators
- **Edge cases**: Special characters, Unicode, empty queries

## Performance Targets

The test suite validates adherence to performance targets from HLD-Search.md:

| Search Type | Target | Validation |
|-------------|--------|------------|
| Semantic Search | <500ms | ✓ Tested |
| FTS Search | <100ms | ✓ Tested |
| Hybrid Search | <750ms | ✓ Tested |
| Embedding Generation | <100ms | ✓ Tested |
| Batch Embeddings | <50ms/item | ✓ Tested |
| Concurrent Requests | 10+ simultaneous | ✓ Tested |

## Coverage Goals

- **Target Coverage**: >80% for all enhanced search components
- **Critical Paths**: 100% coverage for core search algorithms
- **Error Paths**: All error conditions and edge cases tested
- **Integration**: Complete pipeline coverage from MCP tools to database

## Test Environment

### Requirements
- Node.js 18+
- In-memory SQLite database
- ONNX runtime for embeddings
- Hugging Face Transformers.js

### Setup
Tests automatically:
1. Create isolated in-memory databases
2. Initialize embedding models (cached)
3. Generate test data and embeddings
4. Clean up resources after completion

### Configuration
- **Test Timeout**: 60 seconds (for embedding model initialization)
- **Cache Directory**: `.test-cache-*` (cleaned up automatically)
- **Parallel Execution**: Most tests run in parallel, performance/stress tests run serially

## Development Guidelines

### Adding New Tests

1. **Unit Tests**: Test individual components in isolation
2. **Integration Tests**: Test component interactions
3. **Performance Tests**: Validate timing requirements
4. **Stress Tests**: Test extreme conditions and recovery

### Test Patterns

```typescript
// Unit test pattern
describe('ComponentName', () => {
  let component: ComponentType;
  
  beforeEach(() => {
    component = createTestComponent();
  });
  
  test('should handle normal case', () => {
    // Test implementation
  });
  
  test('should handle error case', () => {
    // Error handling test
  });
});

// Performance test pattern
test('should meet performance target', async () => {
  const timer = new PerformanceTimer();
  
  await performOperation();
  
  timer.expectUnder(TARGET_MS, 'Operation description');
});
```

### Mock Strategies

1. **Database**: In-memory SQLite with complete schema
2. **Embeddings**: Real ONNX model with caching
3. **Transport**: Mock MCP transport for protocol testing
4. **Time**: Jest fake timers for time-sensitive tests

## Debugging Tests

### Environment Variables

```bash
# Enable debug output
DEBUG=1 npm test

# Run specific test file
npm test -- tests/unit/search/EnhancedSearchEngine.test.ts

# Run with verbose output
npm test -- --verbose

# Run single test case
npm test -- --testNamePattern="should handle semantic search"
```

### Common Issues

1. **Model Download**: First run may take time to download embedding model
2. **Memory Usage**: Large datasets may require increased Node.js memory
3. **Timeout**: Embedding generation may exceed default timeouts
4. **Concurrency**: Some tests require serial execution to avoid resource conflicts

## Continuous Integration

### GitHub Actions
The test suite is designed to run in CI environments:

- Caches embedding models for faster execution
- Uses appropriate timeouts for cloud environments
- Provides detailed performance metrics
- Generates coverage reports

### Test Reports
Generated artifacts:
- Coverage reports (HTML, LCOV)
- Performance metrics
- Test execution logs
- Benchmark results

## Maintenance

### Regular Tasks
1. **Update test data** when new features are added
2. **Review performance targets** as system evolves
3. **Add stress tests** for new edge cases discovered
4. **Update mock data** to reflect real usage patterns

### Version Compatibility
Tests validate compatibility with:
- MCP Protocol versions
- Embedding model versions
- Database schema migrations
- Node.js runtime versions