/**
 * Query Optimizer - Advanced query optimization and caching
 * 
 * Provides intelligent query optimization, result caching, and
 * performance monitoring for database operations.
 */

import Database from 'better-sqlite3';
import { DatabaseManager } from './Database.js';

interface QueryPlan {
  sql: string;
  estimatedCost: number;
  usesFTS: boolean;
  usesIndexes: string[];
  recommendations: string[];
}

interface QueryCache {
  result: any;
  timestamp: number;
  ttl: number;
  hitCount: number;
  lastAccess: number;
}

interface QueryMetrics {
  query: string;
  executionTime: number;
  resultCount: number;
  cacheHit: boolean;
  timestamp: number;
}

export class QueryOptimizer {
  private dbManager: DatabaseManager;
  private queryCache = new Map<string, QueryCache>();
  private queryMetrics: QueryMetrics[] = [];
  private maxCacheSize: number;
  private defaultTTL: number;

  constructor(dbManager: DatabaseManager, options: {
    maxCacheSize?: number;
    defaultTTL?: number;
  } = {}) {
    this.dbManager = dbManager;
    this.maxCacheSize = options.maxCacheSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
  }

  /**
   * Create optimized indexes for common query patterns
   */
  async createOptimizedIndexes(): Promise<void> {
    const db = this.dbManager.getConnection();
    
    const optimizedIndexes = [
      // Covering indexes for conversation queries
      {
        name: 'idx_conversations_full',
        sql: `CREATE INDEX IF NOT EXISTS idx_conversations_full 
              ON conversations(id, title, created_at, updated_at, metadata)`
      },
      
      // Covering index for message queries with content
      {
        name: 'idx_messages_conversation_full',
        sql: `CREATE INDEX IF NOT EXISTS idx_messages_conversation_full 
              ON messages(conversation_id, created_at, id, role, content)`
      },
      
      // Index for recent messages (optimized for time-based queries)
      {
        name: 'idx_messages_recent',
        sql: `CREATE INDEX IF NOT EXISTS idx_messages_recent 
              ON messages(conversation_id, created_at DESC, role)`
      },
      
      // Index for embedding-enabled messages
      {
        name: 'idx_messages_with_embeddings',
        sql: `CREATE INDEX IF NOT EXISTS idx_messages_with_embeddings 
              ON messages(conversation_id, created_at DESC) 
              WHERE embedding IS NOT NULL`
      },
      
      // Composite index for entity queries
      {
        name: 'idx_entities_search',
        sql: `CREATE INDEX IF NOT EXISTS idx_entities_search 
              ON entities(normalized_name, type, mention_count DESC)`
      },
      
      // Index for high-confidence entity mentions
      {
        name: 'idx_mentions_high_confidence',
        sql: `CREATE INDEX IF NOT EXISTS idx_mentions_high_confidence 
              ON entity_mentions(entity_id, conversation_id, confidence_score DESC) 
              WHERE confidence_score > 0.7`
      },
      
      // Index for strong entity relationships
      {
        name: 'idx_relationships_strong',
        sql: `CREATE INDEX IF NOT EXISTS idx_relationships_strong 
              ON entity_relationships(source_entity_id, strength DESC, relationship_type) 
              WHERE strength > 0.5`
      }
    ];

    for (const index of optimizedIndexes) {
      try {
        const startTime = Date.now();
        db.exec(index.sql);
        const duration = Date.now() - startTime;
        console.log(`Created index ${index.name} in ${duration}ms`);
      } catch (error) {
        console.error(`Failed to create index ${index.name}:`, error);
      }
    }
  }

  /**
   * Analyze query performance and provide recommendations
   */
  analyzeQuery(sql: string, params: any[] = []): QueryPlan {
    const db = this.dbManager.getConnection();
    
    try {
      // Get query plan
      const planStmt = db.prepare(`EXPLAIN QUERY PLAN ${sql}`);
      const plan = planStmt.all(...params) as any[];
      
      let estimatedCost = 0;
      let usesFTS = false;
      const usesIndexes: string[] = [];
      const recommendations: string[] = [];
      
      for (const step of plan) {
        const detail = step.detail || '';
        
        // Detect table scans (expensive)
        if (detail.includes('SCAN TABLE')) {
          estimatedCost += 1000;
          const tableName = detail.match(/SCAN TABLE (\w+)/)?.[1];
          if (tableName) {
            recommendations.push(`Consider adding an index for table: ${tableName}`);
          }
        }
        
        // Detect index usage
        if (detail.includes('USING INDEX')) {
          const indexName = detail.match(/USING INDEX (\w+)/)?.[1];
          if (indexName) {
            usesIndexes.push(indexName);
            estimatedCost += 10; // Index lookups are cheap
          }
        }
        
        // Detect FTS usage
        if (detail.includes('VIRTUAL TABLE') && detail.includes('fts')) {
          usesFTS = true;
          estimatedCost += 50; // FTS is moderately expensive
        }
        
        // Detect sorting without index
        if (detail.includes('USE TEMP B-TREE FOR ORDER BY')) {
          estimatedCost += 100;
          recommendations.push('Consider adding an index to eliminate sorting');
        }
      }
      
      return {
        sql,
        estimatedCost,
        usesFTS,
        usesIndexes,
        recommendations
      };
    } catch (error) {
      return {
        sql,
        estimatedCost: -1,
        usesFTS: false,
        usesIndexes: [],
        recommendations: ['Query analysis failed - check syntax']
      };
    }
  }

  /**
   * Execute query with caching and metrics
   */
  async executeWithCache<T>(
    sql: string, 
    params: any[] = [], 
    options: {
      cacheKey?: string;
      ttl?: number;
      forceRefresh?: boolean;
    } = {}
  ): Promise<T> {
    const cacheKey = options.cacheKey || this.generateCacheKey(sql, params);
    const startTime = Date.now();
    
    // Check cache first
    if (!options.forceRefresh) {
      const cached = this.getCached<T>(cacheKey);
      if (cached !== null) {
        this.recordMetrics(sql, Date.now() - startTime, 0, true);
        return cached;
      }
    }
    
    // Execute query
    const db = this.dbManager.getConnection();
    const stmt = db.prepare(sql);
    const result = stmt.all(...params) as T;
    
    const executionTime = Date.now() - startTime;
    const resultCount = Array.isArray(result) ? result.length : 1;
    
    // Cache result
    this.setCached(cacheKey, result, options.ttl);
    
    // Record metrics
    this.recordMetrics(sql, executionTime, resultCount, false);
    
    return result;
  }

  /**
   * Optimize bulk insert operations
   */
  async bulkInsert(
    tableName: string,
    columns: string[],
    data: any[][],
    options: {
      batchSize?: number;
      useTransaction?: boolean;
    } = {}
  ): Promise<void> {
    const batchSize = options.batchSize || 1000;
    const useTransaction = options.useTransaction !== false;
    
    const db = this.dbManager.getConnection();
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    const stmt = db.prepare(sql);
    
    if (useTransaction) {
      const transaction = db.transaction((batch: any[][]) => {
        for (const row of batch) {
          stmt.run(...row);
        }
      });
      
      // Process in batches
      for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        transaction(batch);
      }
    } else {
      // Process without transaction (faster but less safe)
      for (const row of data) {
        stmt.run(...row);
      }
    }
  }

  /**
   * Get query performance recommendations
   */
  getPerformanceReport(): {
    slowQueries: Array<{
      query: string;
      avgExecutionTime: number;
      executionCount: number;
      recommendations: string[];
    }>;
    cacheStats: {
      hitRate: number;
      totalQueries: number;
      cacheSize: number;
    };
    indexRecommendations: string[];
  } {
    // Analyze slow queries
    const queryStats = new Map<string, {
      totalTime: number;
      count: number;
      resultCounts: number[];
    }>();
    
    for (const metric of this.queryMetrics) {
      const key = this.normalizeQuery(metric.query);
      if (!queryStats.has(key)) {
        queryStats.set(key, { totalTime: 0, count: 0, resultCounts: [] });
      }
      
      const stats = queryStats.get(key)!;
      stats.totalTime += metric.executionTime;
      stats.count++;
      stats.resultCounts.push(metric.resultCount);
    }
    
    const slowQueries = Array.from(queryStats.entries())
      .map(([query, stats]) => ({
        query,
        avgExecutionTime: stats.totalTime / stats.count,
        executionCount: stats.count,
        recommendations: this.analyzeQuery(query).recommendations
      }))
      .filter(q => q.avgExecutionTime > 100) // Only queries taking >100ms
      .sort((a, b) => b.avgExecutionTime - a.avgExecutionTime);
    
    // Calculate cache stats
    const totalQueries = this.queryMetrics.length;
    const cacheHits = this.queryMetrics.filter(m => m.cacheHit).length;
    const hitRate = totalQueries > 0 ? cacheHits / totalQueries : 0;
    
    return {
      slowQueries: slowQueries.slice(0, 10), // Top 10 slow queries
      cacheStats: {
        hitRate,
        totalQueries,
        cacheSize: this.queryCache.size
      },
      indexRecommendations: [
        'Consider adding covering indexes for frequently accessed columns',
        'Use partial indexes for commonly filtered subsets',
        'Create composite indexes for multi-column WHERE clauses',
        'Add indexes for ORDER BY and GROUP BY clauses'
      ]
    };
  }

  /**
   * Clear query cache
   */
  clearCache(): void {
    this.queryCache.clear();
  }

  /**
   * Clear performance metrics
   */
  clearMetrics(): void {
    this.queryMetrics = [];
  }

  private generateCacheKey(sql: string, params: any[]): string {
    return `${sql}:${JSON.stringify(params)}`;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    const now = Date.now();
    if (now - cached.timestamp > cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    cached.hitCount++;
    cached.lastAccess = now;
    return cached.result as T;
  }

  private setCached<T>(key: string, result: T, ttl?: number): void {
    // Evict old entries if cache is full
    if (this.queryCache.size >= this.maxCacheSize) {
      this.evictOldEntries();
    }
    
    this.queryCache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hitCount: 0,
      lastAccess: Date.now()
    });
  }

  private evictOldEntries(): void {
    // Remove 25% of least recently used entries
    const entries = Array.from(this.queryCache.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess);
    
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.queryCache.delete(entries[i][0]);
    }
  }

  private recordMetrics(
    query: string,
    executionTime: number,
    resultCount: number,
    cacheHit: boolean
  ): void {
    this.queryMetrics.push({
      query: this.normalizeQuery(query),
      executionTime,
      resultCount,
      cacheHit,
      timestamp: Date.now()
    });
    
    // Keep only last 10000 metrics to prevent memory bloat
    if (this.queryMetrics.length > 10000) {
      this.queryMetrics = this.queryMetrics.slice(-5000);
    }
  }

  private normalizeQuery(sql: string): string {
    return sql
      .replace(/\s+/g, ' ')
      .replace(/\?/g, '?')
      .trim()
      .toLowerCase();
  }
}