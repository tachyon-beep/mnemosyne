# Phase 2 Integration Tests

This directory contains comprehensive integration tests for Phase 2 features of the MCP Persistence Server. These tests verify the complete functionality, integration, and performance of all Phase 2 components.

## Test Coverage

### 1. Repositories Integration (`repositories.integration.test.ts`)

Tests for all Phase 2 repository components:

- **SummaryRepository**: CRUD operations, batch processing, quality filtering
- **ProviderConfigRepository**: Configuration management, activation/deactivation
- **CacheRepository**: Context caching, expiration, cleanup, statistics
- **SummaryHistoryRepository**: Generation lifecycle tracking, statistics
- **Cross-Repository Integration**: Referential integrity, concurrent operations

**Key Test Scenarios:**
- Creating and retrieving conversation summaries at different levels
- Batch summary operations and transaction handling
- Provider configuration lifecycle management
- Cache hit/miss scenarios and TTL expiration
- Generation history tracking for success/failure cases
- Concurrent repository operations and data consistency

### 2. Summary Generator Integration (`summary-generator.integration.test.ts`)

Tests for the hierarchical summarization service:

- **Single Summary Generation**: Quality validation, temporal compression, retry logic
- **Batch Processing**: Sequential/parallel strategies, mixed success/failure handling
- **Cache Integration**: Cache hits, invalidation, performance optimization
- **History Tracking**: Success/failure tracking, statistics
- **Advanced Features**: Focus topics, incremental summaries, provider strategies

**Key Test Scenarios:**
- Temporal compression logic (brief for old, detailed for recent conversations)
- Quality validation with configurable thresholds
- Provider failure handling with automatic retries
- Batch processing with concurrency limits
- Cache lifecycle management and invalidation
- Generation history tracking and statistics

### 3. Context Assembler Integration (`context-assembler.integration.test.ts`)

Tests for intelligent context assembly:

- **Assembly Strategies**: Temporal, topical, entity-centric, hybrid approaches
- **Relevance Scoring**: Semantic similarity, temporal weighting, multi-factor scoring
- **Token Management**: Budget constraints, optimization, breakdown reporting
- **Performance**: Large-scale assembly, concurrent requests, efficiency metrics

**Key Test Scenarios:**
- Different assembly strategies with various content types
- Token budget management and optimization
- Relevance scoring with semantic and temporal factors
- Performance under high-volume data scenarios
- Error handling for embedding service failures
- Concurrent assembly request handling

### 4. MCP Tools Integration (`mcp-tools.integration.test.ts`)

Tests for Phase 2 MCP tools:

- **GetRelevantSnippetsTool**: Context-aware snippet retrieval
- **ConfigureLLMProviderTool**: Runtime provider configuration management
- **GetProgressiveDetailTool**: Progressive detail retrieval with fallbacks

**Key Test Scenarios:**
- End-to-end context retrieval with assembly strategies
- Provider configuration CRUD operations
- Progressive detail retrieval from brief to detailed levels
- Input validation and error handling
- Tool integration and workflow scenarios

### 5. End-to-End Integration (`end-to-end.integration.test.ts`)

Comprehensive end-to-end tests covering complete workflows:

- **Complete Conversation Lifecycle**: Messages → Summaries → Context Assembly
- **Multi-Provider Configuration**: Provider setup, selection, fallback
- **Cache Management**: Performance optimization, expiration handling
- **Performance Under Load**: Concurrent operations, scalability testing
- **Error Recovery**: Failure handling, resilience, data consistency

**Key Test Scenarios:**
- Full conversation evolution with progressive summarization
- Multi-provider configuration and intelligent selection
- Cache performance optimization and expiration management
- High-volume concurrent operations
- Cascading failure recovery and error handling
- Data consistency across all components

## Running the Tests

### Prerequisites

1. Node.js environment with TypeScript support
2. SQLite database capabilities
3. Jest testing framework configured

### Environment Setup

The tests use environment variables for configuration:

```bash
export NODE_ENV=test
export USE_MOCK_EMBEDDINGS=true
export DISABLE_EMBEDDING_TESTS=true
export DEBUG=1  # Optional: Enable console output during tests
```

### Running Individual Test Suites

```bash
# Run all Phase 2 integration tests
npm test -- __tests__/integration/phase2/

# Run specific test suite
npm test -- __tests__/integration/phase2/repositories.integration.test.ts
npm test -- __tests__/integration/phase2/summary-generator.integration.test.ts
npm test -- __tests__/integration/phase2/context-assembler.integration.test.ts
npm test -- __tests__/integration/phase2/mcp-tools.integration.test.ts
npm test -- __tests__/integration/phase2/end-to-end.integration.test.ts
```

### Running with Custom Configuration

```bash
# Use the Phase 2 specific Jest config
npx jest --config __tests__/integration/phase2/jest.config.js

# Run with coverage
npx jest --config __tests__/integration/phase2/jest.config.js --coverage

# Run in watch mode for development
npx jest --config __tests__/integration/phase2/jest.config.js --watch
```

## Test Architecture

### Database Isolation

Each test uses an in-memory SQLite database (`:memory:`) for complete isolation:

- No persistent state between tests
- Fast setup and teardown
- No cleanup required
- Consistent test environment

### Mock Strategy

External dependencies are mocked to ensure test reliability:

- **EmbeddingManager**: Mocked to avoid model dependencies
- **ProviderManager**: Mocked to avoid external API calls
- **LLM Providers**: Simulated responses for predictable testing

### Test Data Management

Helper functions create realistic test data:

- Conversations with varied message counts and topics
- Summaries at different detail levels
- Provider configurations with realistic settings
- Cache entries with controlled TTL values

## Performance Benchmarks

The tests include performance benchmarks to ensure scalability:

### Expected Performance Targets

- **Summary Generation**: < 2 seconds per summary
- **Context Assembly**: < 1 second for 1000 token budget
- **Batch Operations**: < 10 seconds for 5 concurrent summaries
- **Cache Operations**: < 100ms for cache hits
- **Database Operations**: < 50ms for typical CRUD operations

### Load Testing Scenarios

- **Concurrent Summaries**: 5 simultaneous generations
- **High-Volume Context**: 50 messages + 10 summaries assembly
- **Batch Processing**: 10 parallel context assembly requests
- **Cache Stress**: Rapid creation and expiration cycles

## Debugging and Troubleshooting

### Common Issues

1. **Test Timeouts**: Increase timeout in jest.config.js if needed
2. **Database Locks**: Ensure proper cleanup in afterEach hooks
3. **Mock Failures**: Verify mock setup in beforeEach hooks
4. **Memory Leaks**: Check for unclosed database connections

### Debugging Tools

```bash
# Enable debug output
DEBUG=1 npm test

# Run single test with verbose output
npm test -- --testNamePattern="should generate a standard summary" --verbose

# Run with Node.js debugging
node --inspect-brk node_modules/.bin/jest --runInBand --no-cache
```

### Log Analysis

Test logs include:

- Database operation timing
- Mock call verification
- Performance metrics
- Error details and stack traces

## Coverage Requirements

Phase 2 integration tests maintain high coverage standards:

- **Global Coverage**: 80% minimum (branches, functions, lines, statements)
- **Critical Components**: 85% minimum for SummaryGenerator and ContextAssembler
- **Repository Layer**: 80% minimum for all Phase 2 repositories
- **Tool Layer**: 80% minimum for all MCP tools

### Coverage Reports

```bash
# Generate coverage report
npm test -- --coverage

# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html

# View coverage by component
npm test -- --coverage --coverageReporters=text-summary
```

## Integration with CI/CD

The tests are designed for continuous integration:

- **Parallel Execution**: Tests can run concurrently with proper isolation
- **Deterministic Results**: Mocked dependencies ensure consistent outcomes
- **Fast Execution**: In-memory databases and efficient test design
- **Comprehensive Reporting**: JUnit XML output for CI integration

### CI Configuration Example

```yaml
test-phase2-integration:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm run test:integration:phase2
      env:
        NODE_ENV: test
        USE_MOCK_EMBEDDINGS: true
        DISABLE_EMBEDDING_TESTS: true
```

## Future Enhancements

Planned improvements for the Phase 2 integration tests:

1. **Real Provider Testing**: Optional tests with actual LLM providers
2. **Performance Regression Detection**: Automated performance monitoring
3. **Chaos Testing**: Random failure injection for resilience testing
4. **Visual Test Reports**: Enhanced reporting with charts and metrics
5. **Integration with Monitoring**: Real-time test health monitoring

## Contributing

When adding new Phase 2 features:

1. Add corresponding integration tests
2. Maintain coverage requirements
3. Include performance benchmarks
4. Update documentation
5. Verify CI/CD compatibility

For questions or issues with the integration tests, refer to the main project documentation or create an issue in the repository.