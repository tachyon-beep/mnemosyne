/**
 * Ontology Performance Benchmark Suite
 * 
 * Comprehensive performance testing framework to evaluate the impact of 
 * ontological enhancements on the MCP Persistence System.
 * 
 * Tests performance across different scales and ontological approaches:
 * - Current pragmatic approach
 * - Formal ontological foundations
 * - Enhanced pragmatic approach
 */

import { DatabaseManager } from '../storage/Database.js';
import { KnowledgeGraphService } from '../knowledge-graph/KnowledgeGraphService.js';
import { performance } from 'perf_hooks';

// Benchmark configuration constants
const BENCHMARK_CONSTANTS = {
  // Test iteration counts
  ENTITY_LOOKUP_ITERATIONS: 100,
  RELATIONSHIP_QUERY_ITERATIONS: 50,
  ENTITY_SAMPLE_SIZE: 50,
  
  // Query limits
  DEFAULT_QUERY_LIMIT: 100,
  RELATIONSHIP_QUERY_LIMIT: 20,
  FORMAL_ONTOLOGY_LIMIT: 50, // Reduced due to performance overhead
  
  // Graph traversal settings
  MAX_GRAPH_DEPTH: 4,
  MIN_RELATIONSHIP_STRENGTH: 0.3,
  MIN_SEMANTIC_WEIGHT: 0.5,
  
  // Memory conversion
  BYTES_TO_MB: 1024 * 1024,
  
  // Warm-up settings
  WARM_UP_ITERATIONS: 3,
  WARM_UP_DELAY_MS: 100,
  
  // Concurrency settings
  DEFAULT_CONCURRENT_REQUESTS: 10,
  CONCURRENCY_TEST_DURATION_MS: 5000,
  
  // Validation simulation delays (ms)
  TYPE_HIERARCHY_DELAY: 5,
  DOMAIN_RANGE_DELAY: 8,
  CONSTRAINT_VALIDATION_DELAY: 10
} as const;

interface BenchmarkResult {
  operation: string;
  approach: 'current' | 'formal' | 'enhanced';
  scale: 'small' | 'medium' | 'large';
  executionTimeMs: number;
  memoryUsageMB: number;
  queriesExecuted: number;
  cacheHitRate: number;
  errorCount: number;
}

interface ScaleConfig {
  conversationCount: number;
  entityCount: number;
  relationshipCount: number;
  messageCount: number;
}

interface PerformanceThresholds {
  maxQueryTimeMs: number;
  maxMemoryMB: number;
  minCacheHitRate: number;
  maxConcurrentRequests: number;
}

export interface BenchmarkConfig {
  /** Number of warm-up runs before actual benchmarking */
  warmupRuns?: number;
  /** Number of iterations for each test */
  iterations?: number;
  /** Timeout for individual operations (ms) */
  timeout?: number;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Output format for results */
  outputFormat?: 'json' | 'markdown' | 'csv';
  /** Scales to test */
  scales?: Array<'small' | 'medium' | 'large'>;
  /** Enable memory profiling */
  profileMemory?: boolean;
  /** Enable concurrency testing */
  testConcurrency?: boolean;
}

/**
 * Performance benchmark suite for ontological enhancements
 */
export class OntologyPerformanceBenchmark {
  private databaseManager: DatabaseManager;
  private knowledgeGraphService: KnowledgeGraphService | null = null;
  private results: BenchmarkResult[] = [];
  private performanceThresholds: Record<string, PerformanceThresholds>;
  private config: Required<BenchmarkConfig>;

  constructor(databaseManager: DatabaseManager, config?: BenchmarkConfig) {
    this.databaseManager = databaseManager;
    
    // Apply default configuration
    this.config = {
      warmupRuns: config?.warmupRuns ?? BENCHMARK_CONSTANTS.WARM_UP_ITERATIONS,
      iterations: config?.iterations ?? BENCHMARK_CONSTANTS.ENTITY_LOOKUP_ITERATIONS,
      timeout: config?.timeout ?? 30000,
      verbose: config?.verbose ?? false,
      outputFormat: config?.outputFormat ?? 'markdown',
      scales: config?.scales ?? ['small', 'medium', 'large'],
      profileMemory: config?.profileMemory ?? true,
      testConcurrency: config?.testConcurrency ?? true
    };
    
    // Define performance thresholds for different scales
    this.performanceThresholds = {
      small: {
        maxQueryTimeMs: 200,
        maxMemoryMB: 300,
        minCacheHitRate: 0.7,
        maxConcurrentRequests: 30
      },
      medium: {
        maxQueryTimeMs: 500,
        maxMemoryMB: 500,
        minCacheHitRate: 0.6,
        maxConcurrentRequests: 25
      },
      large: {
        maxQueryTimeMs: 1000,
        maxMemoryMB: 800,
        minCacheHitRate: 0.5,
        maxConcurrentRequests: 15
      }
    };
  }

  /**
   * Run warm-up iterations to stabilize performance
   */
  private async runWarmUp(): Promise<void> {
    if (this.config.warmupRuns === 0) {
      return;
    }
    
    if (this.config.verbose) {
      console.log(`🔥 Running ${this.config.warmupRuns} warm-up iterations...`);
    }
    
    for (let i = 0; i < this.config.warmupRuns; i++) {
      // Run simple queries to warm up database cache
      await this.databaseManager.executeOptimized(
        'SELECT COUNT(*) FROM entities',
        []
      );
      
      await this.databaseManager.executeOptimized(
        'SELECT * FROM entities LIMIT 10',
        []
      );
      
      // Small delay between warm-up runs
      await new Promise(resolve => setTimeout(resolve, BENCHMARK_CONSTANTS.WARM_UP_DELAY_MS));
    }
    
    if (this.config.verbose) {
      console.log('✅ Warm-up complete');
    }
  }

  /**
   * Run comprehensive benchmark suite
   */
  async runBenchmarks(): Promise<{
    results: BenchmarkResult[];
    summary: {
      passedTests: number;
      failedTests: number;
      performanceRegression: number;
      recommendations: string[];
    };
  }> {
    console.log('🚀 Starting Ontology Performance Benchmark Suite');
    
    // Initialize test database
    await this.initializeTestDatabase();
    
    try {
      // Run warm-up iterations
      await this.runWarmUp();
      
      // Run benchmarks across configured scales
      for (const scale of this.config.scales) {
        if (!['small', 'medium', 'large'].includes(scale)) continue;
        
        console.log(`\n📊 Running ${scale} scale benchmarks...`);
        
        await this.setupTestData(scale);
        
        // Test current approach
        await this.benchmarkCurrentApproach(scale);
        
        // Simulate formal ontology approach
        await this.benchmarkFormalOntologyApproach(scale);
        
        // Test enhanced pragmatic approach
        await this.benchmarkEnhancedPragmaticApproach(scale);
        
        await this.cleanupTestData(scale);
      }
      
      // Run concurrency tests
      await this.benchmarkConcurrency();
      
      // Generate summary and recommendations
      const summary = this.generateSummary();
      
      return {
        results: this.results,
        summary
      };
      
    } finally {
      await this.cleanupTestDatabase();
    }
  }

  /**
   * Benchmark current pragmatic approach
   */
  private async benchmarkCurrentApproach(scale: 'small' | 'medium' | 'large'): Promise<void> {
    const startMemory = process.memoryUsage().heapUsed / BENCHMARK_CONSTANTS.BYTES_TO_MB;
    
    // Entity lookup performance
    await this.benchmarkOperation(
      'entity_lookup_current',
      'current',
      scale,
      async () => {
        const startTime = performance.now();
        
        // Simulate typical entity lookups
        for (let i = 0; i < BENCHMARK_CONSTANTS.ENTITY_LOOKUP_ITERATIONS; i++) {
          await this.databaseManager.executeOptimized(
            'SELECT * FROM entities WHERE normalized_name = ? LIMIT 1',
            [`test_entity_${i % BENCHMARK_CONSTANTS.ENTITY_SAMPLE_SIZE}`]
          );
        }
        
        return performance.now() - startTime;
      }
    );

    // Graph traversal performance
    await this.benchmarkOperation(
      'graph_traversal_current',
      'current',
      scale,
      async () => {
        const startTime = performance.now();
        
        // Current recursive CTE approach
        await this.databaseManager.executeOptimized(`
          WITH RECURSIVE entity_graph(entity_id, target_id, path, degree, strength) AS (
            SELECT 
              r.source_entity_id,
              r.target_entity_id,
              json_array(r.source_entity_id, r.target_entity_id),
              1,
              r.strength
            FROM entity_relationships r
            WHERE r.source_entity_id = ? AND r.strength >= ${BENCHMARK_CONSTANTS.MIN_RELATIONSHIP_STRENGTH}
            
            UNION ALL
            
            SELECT 
              eg.entity_id,
              r.target_entity_id,
              json_insert(eg.path, '$[#]', r.target_entity_id),
              eg.degree + 1,
              r.strength * eg.strength
            FROM entity_graph eg
            JOIN entity_relationships r ON eg.target_id = r.source_entity_id
            WHERE eg.degree < ${BENCHMARK_CONSTANTS.MAX_GRAPH_DEPTH} 
              AND r.strength >= ${BENCHMARK_CONSTANTS.MIN_RELATIONSHIP_STRENGTH}
              AND json_extract(eg.path, '$') NOT LIKE '%' || r.target_entity_id || '%'
          )
          SELECT * FROM entity_graph
          ORDER BY degree ASC, strength DESC
          LIMIT ${BENCHMARK_CONSTANTS.DEFAULT_QUERY_LIMIT}
        `, ['test_entity_1']);
        
        return performance.now() - startTime;
      }
    );

    // Relationship queries
    await this.benchmarkOperation(
      'relationship_query_current',
      'current',
      scale,
      async () => {
        const startTime = performance.now();
        
        for (let i = 0; i < BENCHMARK_CONSTANTS.RELATIONSHIP_QUERY_ITERATIONS; i++) {
          await this.databaseManager.executeOptimized(`
            SELECT r.*, e1.name as source_name, e2.name as target_name
            FROM entity_relationships r
            JOIN entities e1 ON r.source_entity_id = e1.id
            JOIN entities e2 ON r.target_entity_id = e2.id
            WHERE r.source_entity_id = ? OR r.target_entity_id = ?
            ORDER BY r.strength DESC
            LIMIT ${BENCHMARK_CONSTANTS.RELATIONSHIP_QUERY_LIMIT}
          `, [`test_entity_${i}`, `test_entity_${i}`]);
        }
        
        return performance.now() - startTime;
      }
    );

    const endMemory = process.memoryUsage().heapUsed / BENCHMARK_CONSTANTS.BYTES_TO_MB;
    console.log(`Current approach memory usage: ${(endMemory - startMemory).toFixed(2)}MB`);
  }

  /**
   * Simulate formal ontology approach with validation overhead
   */
  private async benchmarkFormalOntologyApproach(scale: 'small' | 'medium' | 'large'): Promise<void> {
    const startMemory = process.memoryUsage().heapUsed / BENCHMARK_CONSTANTS.BYTES_TO_MB;
    
    // Entity lookup with type hierarchy validation
    await this.benchmarkOperation(
      'entity_lookup_formal',
      'formal',
      scale,
      async () => {
        const startTime = performance.now();
        
        for (let i = 0; i < BENCHMARK_CONSTANTS.ENTITY_LOOKUP_ITERATIONS; i++) {
          // Simulate type hierarchy lookup overhead
          await this.simulateTypeHierarchyValidation();
          
          await this.databaseManager.executeOptimized(
            'SELECT * FROM entities WHERE normalized_name = ? LIMIT 1',
            [`test_entity_${i % BENCHMARK_CONSTANTS.ENTITY_SAMPLE_SIZE}`]
          );
          
          // Simulate domain/range validation
          await this.simulateDomainRangeValidation();
        }
        
        return performance.now() - startTime;
      }
    );

    // Graph traversal with constraint checking
    await this.benchmarkOperation(
      'graph_traversal_formal',
      'formal',
      scale,
      async () => {
        const startTime = performance.now();
        
        // Simulate formal ontology validation overhead
        await this.simulateOntologyValidation();
        
        // Same query but with additional validation overhead
        await this.databaseManager.executeOptimized(`
          WITH RECURSIVE 
          type_hierarchy AS (
            SELECT 'person' as entity_type, 'agent' as parent_type, 1 as level
            UNION ALL SELECT 'organization', 'agent', 1
            UNION ALL SELECT 'product', 'artifact', 1
            UNION ALL SELECT 'concept', 'abstract_entity', 1
          ),
          validated_relationships AS (
            SELECT r.*, e1.type as source_type, e2.type as target_type
            FROM entity_relationships r
            JOIN entities e1 ON r.source_entity_id = e1.id
            JOIN entities e2 ON r.target_entity_id = e2.id
            WHERE r.source_entity_id = ? AND r.strength >= ${BENCHMARK_CONSTANTS.MIN_RELATIONSHIP_STRENGTH}
          ),
          entity_graph AS (
            SELECT source_entity_id, target_entity_id, 
                   json_array(source_entity_id, target_entity_id) as path,
                   1 as degree, strength
            FROM validated_relationships
            
            UNION ALL
            
            SELECT eg.source_entity_id, vr.target_entity_id,
                   json_insert(eg.path, '$[#]', vr.target_entity_id),
                   eg.degree + 1, vr.strength * eg.strength
            FROM entity_graph eg
            JOIN validated_relationships vr ON eg.target_entity_id = vr.source_entity_id
            WHERE eg.degree < 3  -- Reduced depth due to validation overhead
              AND json_extract(eg.path, '$') NOT LIKE '%' || vr.target_entity_id || '%'
          )
          SELECT * FROM entity_graph
          ORDER BY degree ASC, strength DESC
          LIMIT ${BENCHMARK_CONSTANTS.FORMAL_ONTOLOGY_LIMIT}  -- Reduced limit due to performance
        `, ['test_entity_1']);
        
        return performance.now() - startTime;
      }
    );

    const endMemory = process.memoryUsage().heapUsed / BENCHMARK_CONSTANTS.BYTES_TO_MB;
    console.log(`Formal ontology approach memory usage: ${(endMemory - startMemory).toFixed(2)}MB`);
  }

  /**
   * Benchmark enhanced pragmatic approach
   */
  private async benchmarkEnhancedPragmaticApproach(scale: 'small' | 'medium' | 'large'): Promise<void> {
    const startMemory = process.memoryUsage().heapUsed / BENCHMARK_CONSTANTS.BYTES_TO_MB;
    
    // Entity lookup with semantic categories
    await this.benchmarkOperation(
      'entity_lookup_enhanced',
      'enhanced',
      scale,
      async () => {
        const startTime = performance.now();
        
        for (let i = 0; i < BENCHMARK_CONSTANTS.ENTITY_LOOKUP_ITERATIONS; i++) {
          await this.databaseManager.executeOptimized(`
            SELECT e.*, 
                   CASE 
                     WHEN e.type IN ('person', 'organization') THEN 'agent'
                     WHEN e.type IN ('product', 'technical') THEN 'artifact'
                     ELSE 'concept'
                   END as entity_category
            FROM entities e
            WHERE e.normalized_name = ?
            LIMIT 1
          `, [`test_entity_${i % 50}`]);
        }
        
        return performance.now() - startTime;
      }
    );

    // Optimized graph traversal with materialized views
    await this.benchmarkOperation(
      'graph_traversal_enhanced',
      'enhanced',
      scale,
      async () => {
        const startTime = performance.now();
        
        // Use materialized connection summary for faster traversal
        await this.databaseManager.executeOptimized(`
          WITH RECURSIVE entity_graph AS (
            SELECT 
              r.source_entity_id,
              r.target_entity_id,
              json_array(r.source_entity_id, r.target_entity_id) as path,
              1 as degree,
              r.strength * r.semantic_weight as weighted_strength
            FROM entity_relationships r
            WHERE r.source_entity_id = ? 
              AND r.strength >= ${BENCHMARK_CONSTANTS.MIN_RELATIONSHIP_STRENGTH} 
              AND r.semantic_weight >= ${BENCHMARK_CONSTANTS.MIN_SEMANTIC_WEIGHT}
            
            UNION ALL
            
            SELECT 
              eg.source_entity_id,
              r.target_entity_id,
              json_insert(eg.path, '$[#]', r.target_entity_id),
              eg.degree + 1,
              eg.weighted_strength * r.strength * r.semantic_weight
            FROM entity_graph eg
            JOIN entity_relationships r ON eg.target_entity_id = r.source_entity_id
            WHERE eg.degree < ${BENCHMARK_CONSTANTS.MAX_GRAPH_DEPTH}
              AND r.strength >= ${BENCHMARK_CONSTANTS.MIN_RELATIONSHIP_STRENGTH}
              AND r.semantic_weight >= ${BENCHMARK_CONSTANTS.MIN_SEMANTIC_WEIGHT}
              AND json_extract(eg.path, '$') NOT LIKE '%' || r.target_entity_id || '%'
          )
          SELECT eg.*, e.name, e.type
          FROM entity_graph eg
          JOIN entities e ON eg.target_entity_id = e.id
          ORDER BY degree ASC, weighted_strength DESC
          LIMIT ${BENCHMARK_CONSTANTS.DEFAULT_QUERY_LIMIT}
        `, ['test_entity_1']);
        
        return performance.now() - startTime;
      }
    );

    const endMemory = process.memoryUsage().heapUsed / BENCHMARK_CONSTANTS.BYTES_TO_MB;
    console.log(`Enhanced pragmatic approach memory usage: ${(endMemory - startMemory).toFixed(2)}MB`);
  }

  /**
   * Benchmark concurrent operations
   */
  private async benchmarkConcurrency(): Promise<void> {
    console.log('\n🔄 Running concurrency benchmarks...');
    
    const concurrentOperations = [5, 10, 20, 30];
    
    for (const concurrency of concurrentOperations) {
      const startTime = performance.now();
      const startMemory = process.memoryUsage().heapUsed / BENCHMARK_CONSTANTS.BYTES_TO_MB;
      
      try {
        const operations = Array.from({ length: concurrency }, (_, i) => 
          this.simulateMCPToolOperation(i)
        );
        
        await Promise.all(operations);
        
        const endTime = performance.now();
        const endMemory = process.memoryUsage().heapUsed / BENCHMARK_CONSTANTS.BYTES_TO_MB;
        
        this.results.push({
          operation: `concurrency_${concurrency}`,
          approach: 'current',
          scale: 'medium',
          executionTimeMs: endTime - startTime,
          memoryUsageMB: endMemory - startMemory,
          queriesExecuted: concurrency * 5, // Each operation runs ~5 queries
          cacheHitRate: 0.8, // Estimated
          errorCount: 0
        });
        
        console.log(`✓ ${concurrency} concurrent operations: ${(endTime - startTime).toFixed(2)}ms`);
        
      } catch (error) {
        console.error(`✗ Failed concurrency test for ${concurrency} operations:`, error);
      }
    }
  }

  /**
   * Simulate MCP tool operation
   */
  private async simulateMCPToolOperation(operationId: number): Promise<void> {
    // Simulate typical MCP tool operations
    const operations = [
      () => this.databaseManager.executeOptimized('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT 10'),
      () => this.databaseManager.executeOptimized('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at', [`conv_${operationId}`]),
      () => this.databaseManager.executeOptimized('SELECT * FROM entities WHERE type = ? LIMIT 20', ['person']),
      () => this.databaseManager.executeOptimized(`
        SELECT COUNT(*) FROM entity_relationships 
        WHERE source_entity_id IN (SELECT id FROM entities WHERE type = ?)
      `, ['concept']),
      () => this.databaseManager.executeOptimized('SELECT * FROM messages_fts WHERE messages_fts MATCH ? LIMIT 10', [`query_${operationId}`])
    ];
    
    // Execute random operations
    for (let i = 0; i < 5; i++) {
      const operation = operations[i % operations.length];
      await operation();
    }
  }

  /**
   * Simulate type hierarchy validation overhead
   */
  private async simulateTypeHierarchyValidation(): Promise<void> {
    // Simulate 2-5ms validation overhead
    await new Promise(resolve => setTimeout(resolve, Math.random() * 3 + 2));
  }

  /**
   * Simulate domain/range validation overhead
   */
  private async simulateDomainRangeValidation(): Promise<void> {
    // Simulate 1-3ms validation overhead
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2 + 1));
  }

  /**
   * Simulate ontology validation overhead
   */
  private async simulateOntologyValidation(): Promise<void> {
    // Simulate 5-15ms validation overhead for complex operations
    await new Promise(resolve => setTimeout(resolve, Math.random() * 10 + 5));
  }

  /**
   * Generic benchmark operation wrapper
   */
  private async benchmarkOperation(
    operationName: string,
    approach: 'current' | 'formal' | 'enhanced',
    scale: 'small' | 'medium' | 'large',
    operation: () => Promise<number>
  ): Promise<void> {
    const iterations = 5;
    const times: number[] = [];
    let errorCount = 0;
    
    for (let i = 0; i < iterations; i++) {
      try {
        const executionTime = await operation();
        times.push(executionTime);
      } catch (error) {
        errorCount++;
        console.error(`Error in ${operationName} iteration ${i}:`, error);
      }
    }
    
    if (times.length > 0) {
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;
      
      this.results.push({
        operation: operationName,
        approach,
        scale,
        executionTimeMs: avgTime,
        memoryUsageMB: memoryUsage,
        queriesExecuted: times.length,
        cacheHitRate: 0.7, // Estimated based on operation type
        errorCount
      });
      
      const status = avgTime <= this.performanceThresholds[scale].maxQueryTimeMs ? '✓' : '✗';
      console.log(`${status} ${operationName}: ${avgTime.toFixed(2)}ms (${approach}, ${scale})`);
    }
  }

  /**
   * Get scale configuration
   */
  private getScaleConfig(scale: 'small' | 'medium' | 'large'): ScaleConfig {
    const configs: Record<string, ScaleConfig> = {
      small: {
        conversationCount: 1000,
        entityCount: 10000,
        relationshipCount: 20000,
        messageCount: 10000
      },
      medium: {
        conversationCount: 10000,
        entityCount: 100000,
        relationshipCount: 200000,
        messageCount: 100000
      },
      large: {
        conversationCount: 50000,
        entityCount: 500000,
        relationshipCount: 1000000,
        messageCount: 500000
      }
    };
    
    return configs[scale];
  }

  /**
   * Setup test data for benchmarking
   */
  private async setupTestData(scale: 'small' | 'medium' | 'large'): Promise<void> {
    const config = this.getScaleConfig(scale);
    console.log(`Setting up ${scale} scale test data...`);
    
    // Create test entities
    const entityInserts = [];
    for (let i = 0; i < Math.min(config.entityCount, 1000); i++) { // Limit for test performance
      entityInserts.push([
        `test_entity_${i}`,
        `Test Entity ${i}`,
        `test_entity_${i}`,
        ['person', 'organization', 'product', 'concept'][i % 4],
        null,
        0.8,
        Date.now(),
        Date.now(),
        JSON.stringify({ test: true }),
        i % 10,
        Date.now()
      ]);
    }
    
    const entityStmt = this.databaseManager.getConnection().prepare(`
      INSERT OR REPLACE INTO entities 
      (id, name, normalized_name, type, canonical_form, confidence_score, created_at, updated_at, metadata, mention_count, last_mentioned_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const params of entityInserts) {
      entityStmt.run(...params);
    }
    
    // Create test relationships
    const relationshipInserts = [];
    for (let i = 0; i < Math.min(config.relationshipCount, 2000); i++) {
      relationshipInserts.push([
        `test_rel_${i}`,
        `test_entity_${i % 500}`,
        `test_entity_${(i + 1) % 500}`,
        ['related_to', 'works_for', 'discussed_with'][i % 3],
        0.3 + (Math.random() * 0.7),
        Date.now(),
        Date.now(),
        1,
        JSON.stringify([]),
        Date.now(),
        Date.now()
      ]);
    }
    
    const relationshipStmt = this.databaseManager.getConnection().prepare(`
      INSERT OR REPLACE INTO entity_relationships 
      (id, source_entity_id, target_entity_id, relationship_type, strength, first_mentioned_at, last_mentioned_at, mention_count, context_messages, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    for (const params of relationshipInserts) {
      relationshipStmt.run(...params);
    }
    
    console.log(`✓ Created ${entityInserts.length} entities and ${relationshipInserts.length} relationships`);
  }

  /**
   * Cleanup test data
   */
  private async cleanupTestData(_scale: 'small' | 'medium' | 'large'): Promise<void> {
    await this.databaseManager.getConnection().prepare('DELETE FROM entity_relationships WHERE id LIKE ?').run('test_rel_%');
    await this.databaseManager.getConnection().prepare('DELETE FROM entities WHERE id LIKE ?').run('test_entity_%');
  }

  /**
   * Initialize test database
   */
  private async initializeTestDatabase(): Promise<void> {
    // Ensure database is initialized
    if (!this.databaseManager.isConnected()) {
      await this.databaseManager.initialize();
    }
  }

  /**
   * Cleanup test database
   */
  private async cleanupTestDatabase(): Promise<void> {
    // Clean up any remaining test data
    const db = this.databaseManager.getConnection();
    db.prepare('DELETE FROM entity_relationships WHERE id LIKE ?').run('test_%');
    db.prepare('DELETE FROM entities WHERE id LIKE ?').run('test_%');
  }

  /**
   * Generate performance summary and recommendations
   */
  private generateSummary(): {
    passedTests: number;
    failedTests: number;
    performanceRegression: number;
    recommendations: string[];
  } {
    let passedTests = 0;
    let failedTests = 0;
    let totalRegression = 0;
    const recommendations: string[] = [];
    
    // Group results by operation and approach
    const operationGroups = new Map<string, BenchmarkResult[]>();
    
    for (const result of this.results) {
      const key = result.operation.replace(/_current|_formal|_enhanced/, '');
      if (!operationGroups.has(key)) {
        operationGroups.set(key, []);
      }
      operationGroups.get(key)!.push(result);
    }
    
    // Analyze performance regressions
    for (const [operation, results] of operationGroups) {
      const current = results.find(r => r.approach === 'current');
      const formal = results.find(r => r.approach === 'formal');
      const enhanced = results.find(r => r.approach === 'enhanced');
      
      if (current && formal) {
        const regression = ((formal.executionTimeMs - current.executionTimeMs) / current.executionTimeMs) * 100;
        totalRegression += regression;
        
        if (regression > 50) {
          failedTests++;
          recommendations.push(`Formal ontology approach causes ${regression.toFixed(1)}% performance regression in ${operation}`);
        } else {
          passedTests++;
        }
      }
      
      if (current && enhanced) {
        const improvement = ((current.executionTimeMs - enhanced.executionTimeMs) / current.executionTimeMs) * 100;
        
        if (improvement > 10) {
          recommendations.push(`Enhanced approach improves ${operation} performance by ${improvement.toFixed(1)}%`);
        }
      }
    }
    
    // Memory analysis
    const highMemoryResults = this.results.filter(r => r.memoryUsageMB > 500);
    if (highMemoryResults.length > 0) {
      recommendations.push('Consider memory optimization for operations exceeding 500MB usage');
    }
    
    // Concurrency analysis
    const concurrencyResults = this.results.filter(r => r.operation.startsWith('concurrency_'));
    const maxConcurrency = Math.max(...concurrencyResults.map(r => parseInt(r.operation.split('_')[1])));
    
    if (maxConcurrency < 25) {
      recommendations.push('System may not meet concurrent load requirements (target: 25+ concurrent operations)');
    }
    
    // General recommendations
    if (totalRegression / operationGroups.size > 30) {
      recommendations.push('Formal ontological approach not recommended due to significant performance impact');
      recommendations.push('Consider enhanced pragmatic approach as optimal balance');
    }
    
    return {
      passedTests,
      failedTests,
      performanceRegression: totalRegression / operationGroups.size,
      recommendations
    };
  }

  /**
   * Export results for analysis
   */
  exportResults(): string {
    const csvHeader = 'Operation,Approach,Scale,ExecutionTimeMs,MemoryUsageMB,QueriesExecuted,CacheHitRate,ErrorCount\n';
    const csvRows = this.results.map(r => 
      `${r.operation},${r.approach},${r.scale},${r.executionTimeMs},${r.memoryUsageMB},${r.queriesExecuted},${r.cacheHitRate},${r.errorCount}`
    ).join('\n');
    
    return csvHeader + csvRows;
  }
}