/**
 * Knowledge Gaps Repository
 * 
 * Handles database operations for knowledge gap detection and tracking:
 * - Gap identification and clustering
 * - Learning curve tracking
 * - Resolution monitoring
 * - Topic coverage analysis
 * - Expertise mapping
 */

import { AnalyticsRepository, TimeRange, PaginationOptions } from './AnalyticsRepository.js';
import { DatabaseManager } from '../../storage/Database.js';

export interface KnowledgeGap {
  id: string;
  gapType: 'question' | 'topic' | 'skill' | 'concept';
  content: string;
  normalizedContent: string;
  
  // Metrics
  frequency: number;
  firstOccurrence: number;
  lastOccurrence: number;
  explorationDepth: number;
  
  // Resolution tracking
  resolved: boolean;
  resolutionConversationId?: string;
  resolutionDate?: number;
  resolutionQuality: number;
  
  // Learning metrics
  learningCurveGradient: number;
  estimatedTimeToMastery?: number; // hours
  
  // Related information
  relatedEntities: string[];
  relatedGaps: string[];
  suggestedActions: string[];
  suggestedResources: string[];
  
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeGapInput {
  gapType: 'question' | 'topic' | 'skill' | 'concept';
  content: string;
  normalizedContent?: string;
  frequency?: number;
  firstOccurrence?: number;
  lastOccurrence?: number;
  explorationDepth?: number;
  relatedEntities?: string[];
  suggestedActions?: string[];
  suggestedResources?: string[];
}

export interface GapCluster {
  clusterId: string;
  gaps: KnowledgeGap[];
  centroidContent: string;
  totalFrequency: number;
  averageExploration: number;
  resolvedCount: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface LearningProgress {
  gapId: string;
  topic: string;
  progressPoints: Array<{
    timestamp: number;
    understandingLevel: number;
    conversationId: string;
  }>;
  currentLevel: number;
  gradient: number;
  plateauDetected: boolean;
  estimatedCompletion?: number;
}

export interface TopicCoverage {
  topic: string;
  mentionCount: number;
  explorationDepth: number;
  relatedTopics: string[];
  gapCount: number;
  averageResolutionTime: number;
  coverageScore: number; // 0-100
}

/**
 * Repository for knowledge gap detection and learning analytics
 */
export class KnowledgeGapsRepository extends AnalyticsRepository {
  
  constructor(databaseManager: DatabaseManager) {
    super(databaseManager);
  }

  /**
   * Save or update a knowledge gap
   */
  async saveGap(input: KnowledgeGapInput): Promise<string> {
    // Check if gap already exists (similar content)
    const existingGap = await this.findSimilarGap(input.normalizedContent || input.content);
    
    if (existingGap) {
      // Update existing gap
      await this.incrementGapFrequency(existingGap.id, input.lastOccurrence || Date.now());
      return existingGap.id;
    }

    // Create new gap
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    
    const sql = `
      INSERT INTO knowledge_gaps (
        id, gap_type, content, normalized_content,
        frequency, first_occurrence, last_occurrence, exploration_depth,
        resolved, resolution_quality, learning_curve_gradient,
        estimated_time_to_mastery, related_entities, related_gaps,
        suggested_actions, suggested_resources, created_at, updated_at
      ) VALUES (
        @id, @gapType, @content, @normalizedContent,
        @frequency, @firstOccurrence, @lastOccurrence, @explorationDepth,
        @resolved, @resolutionQuality, @learningCurveGradient,
        @estimatedTimeToMastery, @relatedEntities, @relatedGaps,
        @suggestedActions, @suggestedResources, @createdAt, @updatedAt
      )
    `;

    const params = {
      id,
      gapType: input.gapType,
      content: input.content,
      normalizedContent: input.normalizedContent || this.normalizeContent(input.content),
      frequency: input.frequency || 1,
      firstOccurrence: input.firstOccurrence || now,
      lastOccurrence: input.lastOccurrence || now,
      explorationDepth: input.explorationDepth || 0,
      resolved: false,
      resolutionQuality: 0,
      learningCurveGradient: 0,
      estimatedTimeToMastery: null,
      relatedEntities: JSON.stringify(input.relatedEntities || []),
      relatedGaps: JSON.stringify([]),
      suggestedActions: JSON.stringify(input.suggestedActions || []),
      suggestedResources: JSON.stringify(input.suggestedResources || []),
      createdAt: now,
      updatedAt: now
    };

    try {
      this.executeStatementRun('save_knowledge_gap', sql, params);
      return id;
    } catch (error) {
      this.handleConstraintError(error as Error, 'knowledge gap');
    }
  }

  /**
   * Find gaps that need resolution
   */
  async getUnresolvedGaps(
    gapType?: 'question' | 'topic' | 'skill' | 'concept',
    options?: PaginationOptions
  ): Promise<KnowledgeGap[]> {
    const { limit, offset } = this.validatePagination(options?.limit, options?.offset);
    
    let whereClause = 'WHERE resolved = FALSE';
    const params: any = { limit, offset };
    
    if (gapType) {
      whereClause += ' AND gap_type = @gapType';
      params.gapType = gapType;
    }
    
    const sql = `
      SELECT 
        id, gap_type, content, normalized_content,
        frequency, first_occurrence, last_occurrence, exploration_depth,
        resolved, resolution_conversation_id, resolution_date, resolution_quality,
        learning_curve_gradient, estimated_time_to_mastery,
        related_entities, related_gaps, suggested_actions, suggested_resources,
        created_at, updated_at
      FROM knowledge_gaps
      ${whereClause}
      ORDER BY frequency DESC, last_occurrence DESC
      LIMIT @limit OFFSET @offset
    `;

    const results = this.executeStatementAll<any>('get_unresolved_gaps', sql, params);
    return results.map(row => this.mapRowToGap(row));
  }

  /**
   * Get gaps by priority (frequency and recency weighted)
   */
  async getGapsByPriority(
    timeRange?: TimeRange,
    options?: PaginationOptions
  ): Promise<Array<KnowledgeGap & { priority: number }>> {
    const validTimeRange = this.validateTimeRange(timeRange);
    const { limit, offset } = this.validatePagination(options?.limit, options?.offset);
    
    const sql = `
      WITH gap_priorities AS (
        SELECT 
          *,
          -- Priority calculation: frequency weight + recency weight + exploration deficit
          (
            -- Frequency weight (0-40 points)
            LEAST(frequency * 5.0, 40) +
            -- Recency weight (0-30 points) 
            (30 * (1 - ((@end - last_occurrence) / CAST(@end - @start AS REAL)))) +
            -- Exploration deficit weight (0-30 points)
            (30 * (1 - exploration_depth / 100.0))
          ) as priority_score
        FROM knowledge_gaps
        WHERE resolved = FALSE
          AND last_occurrence BETWEEN @start AND @end
      )
      SELECT 
        id, gap_type, content, normalized_content,
        frequency, first_occurrence, last_occurrence, exploration_depth,
        resolved, resolution_conversation_id, resolution_date, resolution_quality,
        learning_curve_gradient, estimated_time_to_mastery,
        related_entities, related_gaps, suggested_actions, suggested_resources,
        created_at, updated_at, priority_score
      FROM gap_priorities
      ORDER BY priority_score DESC, frequency DESC
      LIMIT @limit OFFSET @offset
    `;

    const results = this.executeStatementAll<any>(
      'gaps_by_priority',
      sql,
      { ...validTimeRange, limit, offset }
    );

    return results.map(row => ({
      ...this.mapRowToGap(row),
      priority: Math.round(row.priority_score * 10) / 10
    }));
  }

  /**
   * Cluster similar gaps
   */
  async getGapClusters(
    minClusterSize: number = 2,
    similarityThreshold: number = 0.7
  ): Promise<GapCluster[]> {
    // Get unresolved gaps
    const gaps = await this.getUnresolvedGaps();
    
    if (gaps.length === 0) {
      return [];
    }

    // Simple clustering based on normalized content similarity
    const clusters = new Map<string, KnowledgeGap[]>();
    const processed = new Set<string>();
    
    for (const gap of gaps) {
      if (processed.has(gap.id)) {
        continue;
      }

      const cluster: KnowledgeGap[] = [gap];
      processed.add(gap.id);
      
      // Find similar gaps
      for (const otherGap of gaps) {
        if (processed.has(otherGap.id)) {
          continue;
        }

        const similarity = this.calculateStringSimilarity(
          gap.normalizedContent,
          otherGap.normalizedContent
        );

        if (similarity >= similarityThreshold) {
          cluster.push(otherGap);
          processed.add(otherGap.id);
        }
      }

      if (cluster.length >= minClusterSize) {
        clusters.set(gap.id, cluster);
      }
    }

    // Convert to GapCluster objects
    const gapClusters: GapCluster[] = [];
    
    for (const [clusterId, clusterGaps] of clusters.entries()) {
      const totalFrequency = clusterGaps.reduce((sum, g) => sum + g.frequency, 0);
      const averageExploration = clusterGaps.reduce((sum, g) => sum + g.explorationDepth, 0) / clusterGaps.length;
      const resolvedCount = clusterGaps.filter(g => g.resolved).length;
      
      // Determine priority
      let priority: 'critical' | 'high' | 'medium' | 'low' = 'low';
      if (totalFrequency >= 10 && averageExploration < 30) {
        priority = 'critical';
      } else if (totalFrequency >= 5 && averageExploration < 50) {
        priority = 'high';
      } else if (totalFrequency >= 3) {
        priority = 'medium';
      }

      gapClusters.push({
        clusterId,
        gaps: clusterGaps,
        centroidContent: clusterGaps[0].content, // Use first as representative
        totalFrequency,
        averageExploration,
        resolvedCount,
        priority
      });
    }

    return gapClusters.sort((a, b) => b.totalFrequency - a.totalFrequency);
  }

  /**
   * Track learning progress for a gap
   */
  async getLearningProgress(gapId: string): Promise<LearningProgress | null> {
    const gap = await this.getGap(gapId);
    if (!gap) {
      return null;
    }

    // Get related conversations and extract understanding progression
    const sql = `
      WITH gap_conversations AS (
        SELECT DISTINCT c.id, c.created_at, c.title
        FROM conversations c
        JOIN messages m ON c.id = m.conversation_id
        WHERE LOWER(m.content) LIKE '%' || LOWER(@searchTerm) || '%'
          OR LOWER(c.title) LIKE '%' || LOWER(@searchTerm) || '%'
        ORDER BY c.created_at
      ),
      progress_points AS (
        SELECT 
          gc.id as conversation_id,
          gc.created_at,
          -- Estimate understanding level based on message complexity and insights
          CASE 
            WHEN ca.insight_count > 0 AND ca.depth_score > 70 THEN 85
            WHEN ca.depth_score > 60 THEN 70
            WHEN ca.depth_score > 40 THEN 55
            WHEN ca.depth_score > 20 THEN 35
            ELSE 15
          END as understanding_level
        FROM gap_conversations gc
        LEFT JOIN conversation_analytics ca ON gc.id = ca.conversation_id
      )
      SELECT 
        conversation_id,
        created_at,
        understanding_level
      FROM progress_points
      ORDER BY created_at
    `;

    const progressResults = this.executeStatementAll<{
      conversation_id: string;
      created_at: number;
      understanding_level: number;
    }>('learning_progress', sql, { 
      searchTerm: gap.normalizedContent.split(' ').slice(0, 3).join(' ') 
    });

    if (progressResults.length === 0) {
      return null;
    }

    const progressPoints = progressResults.map(row => ({
      timestamp: row.created_at,
      understandingLevel: row.understanding_level,
      conversationId: row.conversation_id
    }));

    // Calculate gradient (learning rate)
    const gradient = this.calculateLearningGradient(progressPoints);
    
    // Detect plateau (no improvement in last 3 data points)
    const plateauDetected = this.detectPlateau(progressPoints);
    
    // Estimate completion time
    const currentLevel = progressPoints[progressPoints.length - 1]?.understandingLevel || 0;
    const estimatedCompletion = this.estimateCompletionTime(gradient, currentLevel);

    return {
      gapId: gap.id,
      topic: gap.content,
      progressPoints,
      currentLevel,
      gradient,
      plateauDetected,
      estimatedCompletion
    };
  }

  /**
   * Get topic coverage analysis
   */
  async getTopicCoverage(timeRange?: TimeRange): Promise<TopicCoverage[]> {
    const validTimeRange = this.validateTimeRange(timeRange);
    
    const sql = `
      WITH topic_mentions AS (
        SELECT 
          kg.normalized_content as topic,
          COUNT(DISTINCT m.conversation_id) as mention_count,
          AVG(kg.exploration_depth) as avg_exploration,
          COUNT(kg.id) as gap_count,
          AVG(CASE WHEN kg.resolved THEN 
                (kg.resolution_date - kg.first_occurrence) / (1000 * 60 * 60.0)
              ELSE NULL END) as avg_resolution_hours
        FROM knowledge_gaps kg
        LEFT JOIN messages m ON (
          LOWER(m.content) LIKE '%' || LOWER(kg.normalized_content) || '%'
          AND m.created_at BETWEEN @start AND @end
        )
        WHERE kg.gap_type IN ('topic', 'concept')
        GROUP BY kg.normalized_content
        HAVING mention_count > 0
      )
      SELECT 
        topic,
        mention_count,
        avg_exploration as exploration_depth,
        gap_count,
        COALESCE(avg_resolution_hours, 0) as avg_resolution_time,
        -- Coverage score: high mentions + high exploration - many gaps
        LEAST(100, 
          (mention_count * 10) + 
          (avg_exploration * 0.8) - 
          (gap_count * 5)
        ) as coverage_score
      FROM topic_mentions
      WHERE mention_count >= 2
      ORDER BY coverage_score DESC, mention_count DESC
      LIMIT 50
    `;

    const results = this.executeStatementAll<any>('topic_coverage', sql, validTimeRange);
    
    return results.map(row => ({
      topic: row.topic,
      mentionCount: row.mention_count,
      explorationDepth: Math.round(row.exploration_depth),
      relatedTopics: [], // Could be enhanced with similarity analysis
      gapCount: row.gap_count,
      averageResolutionTime: Math.round(row.avg_resolution_time * 10) / 10,
      coverageScore: Math.max(0, Math.round(row.coverage_score))
    }));
  }

  /**
   * Mark gap as resolved
   */
  async markResolved(
    gapId: string,
    resolutionConversationId: string,
    resolutionQuality: number = 80
  ): Promise<void> {
    const now = this.getCurrentTimestamp();
    
    const sql = `
      UPDATE knowledge_gaps 
      SET 
        resolved = TRUE,
        resolution_conversation_id = @resolutionConversationId,
        resolution_date = @resolutionDate,
        resolution_quality = @resolutionQuality,
        updated_at = @updatedAt
      WHERE id = @gapId
    `;

    this.executeStatementRun('mark_gap_resolved', sql, {
      gapId,
      resolutionConversationId,
      resolutionDate: now,
      resolutionQuality,
      updatedAt: now
    });
  }

  /**
   * Update gap exploration depth
   */
  async updateExplorationDepth(gapId: string, depth: number): Promise<void> {
    const sql = `
      UPDATE knowledge_gaps 
      SET 
        exploration_depth = @depth,
        updated_at = @updatedAt
      WHERE id = @gapId
    `;

    this.executeStatementRun('update_exploration_depth', sql, {
      gapId,
      depth: Math.max(0, Math.min(100, depth)),
      updatedAt: this.getCurrentTimestamp()
    });
  }

  /**
   * Get gap by ID
   */
  async getGap(gapId: string): Promise<KnowledgeGap | null> {
    const sql = `
      SELECT 
        id, gap_type, content, normalized_content,
        frequency, first_occurrence, last_occurrence, exploration_depth,
        resolved, resolution_conversation_id, resolution_date, resolution_quality,
        learning_curve_gradient, estimated_time_to_mastery,
        related_entities, related_gaps, suggested_actions, suggested_resources,
        created_at, updated_at
      FROM knowledge_gaps
      WHERE id = @gapId
    `;

    const result = this.executeStatement<any>('get_gap', sql, { gapId });
    return result ? this.mapRowToGap(result) : null;
  }

  /**
   * Find similar gap by content
   */
  private async findSimilarGap(content: string): Promise<KnowledgeGap | null> {
    const normalizedContent = this.normalizeContent(content);
    
    const sql = `
      SELECT 
        id, gap_type, content, normalized_content,
        frequency, first_occurrence, last_occurrence, exploration_depth,
        resolved, resolution_conversation_id, resolution_date, resolution_quality,
        learning_curve_gradient, estimated_time_to_mastery,
        related_entities, related_gaps, suggested_actions, suggested_resources,
        created_at, updated_at
      FROM knowledge_gaps
      WHERE normalized_content = @normalizedContent
        OR (
          LENGTH(@normalizedContent) > 10 
          AND normalized_content LIKE '%' || @normalizedContent || '%'
        )
      ORDER BY frequency DESC
      LIMIT 1
    `;

    const result = this.executeStatement<any>('find_similar_gap', sql, { normalizedContent });
    return result ? this.mapRowToGap(result) : null;
  }

  /**
   * Increment gap frequency
   */
  private async incrementGapFrequency(gapId: string, lastOccurrence: number): Promise<void> {
    const sql = `
      UPDATE knowledge_gaps 
      SET 
        frequency = frequency + 1,
        last_occurrence = @lastOccurrence,
        updated_at = @updatedAt
      WHERE id = @gapId
    `;

    this.executeStatementRun('increment_gap_frequency', sql, {
      gapId,
      lastOccurrence,
      updatedAt: this.getCurrentTimestamp()
    });
  }

  /**
   * Normalize content for similarity comparison
   */
  private normalizeContent(content: string): string {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Calculate learning gradient from progress points
   */
  private calculateLearningGradient(
    points: Array<{ timestamp: number; understandingLevel: number }>
  ): number {
    if (points.length < 2) {
      return 0;
    }

    // Simple linear regression
    const n = points.length;
    const sumX = points.reduce((sum, p) => sum + p.timestamp, 0);
    const sumY = points.reduce((sum, p) => sum + p.understandingLevel, 0);
    const sumXY = points.reduce((sum, p) => sum + p.timestamp * p.understandingLevel, 0);
    const sumX2 = points.reduce((sum, p) => sum + p.timestamp * p.timestamp, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      return 0;
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;
    
    // Convert to understanding points per day
    return slope * (24 * 60 * 60 * 1000);
  }

  /**
   * Detect if learning has plateaued
   */
  private detectPlateau(
    points: Array<{ timestamp: number; understandingLevel: number }>
  ): boolean {
    if (points.length < 4) {
      return false;
    }

    // Check if last 3 points show minimal improvement
    const recentPoints = points.slice(-3);
    const improvements = [];
    
    for (let i = 1; i < recentPoints.length; i++) {
      improvements.push(recentPoints[i].understandingLevel - recentPoints[i - 1].understandingLevel);
    }

    // Plateau if average improvement is less than 2 points
    const avgImprovement = improvements.reduce((sum, imp) => sum + imp, 0) / improvements.length;
    return avgImprovement < 2;
  }

  /**
   * Estimate completion time based on gradient and current level
   */
  private estimateCompletionTime(gradient: number, currentLevel: number): number | undefined {
    if (gradient <= 0 || currentLevel >= 90) {
      return undefined;
    }

    const targetLevel = 85;
    const remainingPoints = targetLevel - currentLevel;
    
    // Days to completion
    const daysToCompletion = remainingPoints / gradient;
    
    // Return hours, capped at reasonable maximum
    return Math.min(daysToCompletion * 24, 720); // Max 30 days
  }

  /**
   * Map database row to KnowledgeGap interface
   */
  private mapRowToGap(row: any): KnowledgeGap {
    return {
      id: row.id,
      gapType: row.gap_type,
      content: row.content,
      normalizedContent: row.normalized_content,
      frequency: row.frequency,
      firstOccurrence: row.first_occurrence,
      lastOccurrence: row.last_occurrence,
      explorationDepth: row.exploration_depth,
      resolved: Boolean(row.resolved),
      resolutionConversationId: row.resolution_conversation_id,
      resolutionDate: row.resolution_date,
      resolutionQuality: row.resolution_quality || 0,
      learningCurveGradient: row.learning_curve_gradient || 0,
      estimatedTimeToMastery: row.estimated_time_to_mastery,
      relatedEntities: this.parseJSONArray(row.related_entities),
      relatedGaps: this.parseJSONArray(row.related_gaps),
      suggestedActions: this.parseJSONArray(row.suggested_actions),
      suggestedResources: this.parseJSONArray(row.suggested_resources),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Parse JSON array safely
   */
  private parseJSONArray(jsonString?: string): string[] {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /**
   * Batch save knowledge gaps with optimized performance
   */
  async batchSaveGaps(
    gapInputs: KnowledgeGapInput[],
    options: {
      batchSize?: number;
      conflictResolution?: 'IGNORE' | 'REPLACE' | 'UPDATE';
      onProgress?: (processed: number, total: number) => void;
      deduplication?: boolean;
    } = {}
  ): Promise<{ inserted: number; updated: number; failed: number; duplicates: number; errors: Error[] }> {
    if (gapInputs.length === 0) {
      return { inserted: 0, updated: 0, failed: 0, duplicates: 0, errors: [] };
    }

    const { batchSize = 100, conflictResolution = 'UPDATE', onProgress, deduplication = true } = options;
    const now = this.getCurrentTimestamp();
    
    let processedInputs = gapInputs;
    let duplicates = 0;

    // Deduplicate similar gaps if enabled
    if (deduplication) {
      const { uniqueGaps, duplicateCount } = await this.deduplicateGaps(gapInputs);
      processedInputs = uniqueGaps;
      duplicates = duplicateCount;
    }
    
    // Prepare gap records with IDs and timestamps
    const dbRecords = processedInputs.map(input => ({
      id: this.generateId(),
      gap_type: input.gapType,
      content: input.content,
      normalized_content: input.normalizedContent || this.normalizeContent(input.content),
      frequency: input.frequency || 1,
      first_occurrence: input.firstOccurrence || now,
      last_occurrence: input.lastOccurrence || now,
      exploration_depth: input.explorationDepth || 0,
      resolved: false,
      resolution_quality: 0,
      learning_curve_gradient: 0,
      estimated_time_to_mastery: null,
      related_entities: JSON.stringify(input.relatedEntities || []),
      related_gaps: JSON.stringify([]),
      suggested_actions: JSON.stringify(input.suggestedActions || []),
      suggested_resources: JSON.stringify(input.suggestedResources || []),
      created_at: now,
      updated_at: now
    }));

    try {
      if (conflictResolution === 'UPDATE') {
        // Use upsert for update behavior based on normalized content
        const result = this.batchUpsert(
          'knowledge_gaps',
          dbRecords,
          ['normalized_content', 'gap_type'],
          {
            batchSize,
            onProgress
          }
        );
        return { 
          inserted: result.inserted, 
          updated: result.updated, 
          failed: result.failed,
          duplicates,
          errors: []
        };
      } else {
        // Use batch insert for other conflict resolutions
        const result = this.batchInsert(
          'knowledge_gaps',
          dbRecords,
          {
            batchSize,
            conflictResolution: conflictResolution as 'IGNORE' | 'REPLACE',
            onProgress
          }
        );
        return {
          inserted: result.inserted,
          updated: 0,
          failed: result.failed,
          duplicates,
          errors: result.errors
        };
      }
    } catch (error) {
      throw new Error(`Batch knowledge gaps save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch update gap exploration depth
   */
  async batchUpdateExplorationDepth(
    updates: Array<{
      gapId: string;
      depth: number;
    }>,
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{ updated: number; failed: number }> {
    if (updates.length === 0) {
      return { updated: 0, failed: 0 };
    }

    const { batchSize = 100, onProgress } = options;
    let totalUpdated = 0;
    let totalFailed = 0;

    // Process updates in batches
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      
      await this.transaction((db) => {
        const stmt = db.prepare(`
          UPDATE knowledge_gaps 
          SET 
            exploration_depth = @depth,
            updated_at = @updatedAt
          WHERE id = @gapId
        `);
        
        for (const { gapId, depth } of batch) {
          try {
            const result = stmt.run({
              gapId,
              depth: Math.max(0, Math.min(100, depth)),
              updatedAt: this.getCurrentTimestamp()
            });

            if (result.changes > 0) {
              totalUpdated++;
            }
          } catch (error) {
            totalFailed++;
            console.error(`Failed to update exploration depth for gap ${gapId}:`, error);
          }
        }
      });

      if (onProgress) {
        onProgress(Math.min(i + batchSize, updates.length), updates.length);
      }
    }

    return { updated: totalUpdated, failed: totalFailed };
  }

  /**
   * Batch mark gaps as resolved
   */
  async batchMarkResolved(
    resolutions: Array<{
      gapId: string;
      resolutionConversationId: string;
      resolutionQuality?: number;
    }>,
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{ updated: number; failed: number }> {
    if (resolutions.length === 0) {
      return { updated: 0, failed: 0 };
    }

    const { batchSize = 100, onProgress } = options;
    let totalUpdated = 0;
    let totalFailed = 0;

    // Process updates in batches
    for (let i = 0; i < resolutions.length; i += batchSize) {
      const batch = resolutions.slice(i, i + batchSize);
      
      await this.transaction((db) => {
        const stmt = db.prepare(`
          UPDATE knowledge_gaps 
          SET 
            resolved = TRUE,
            resolution_conversation_id = @resolutionConversationId,
            resolution_date = @resolutionDate,
            resolution_quality = @resolutionQuality,
            updated_at = @updatedAt
          WHERE id = @gapId
        `);
        
        for (const { gapId, resolutionConversationId, resolutionQuality = 80 } of batch) {
          try {
            const result = stmt.run({
              gapId,
              resolutionConversationId,
              resolutionDate: this.getCurrentTimestamp(),
              resolutionQuality,
              updatedAt: this.getCurrentTimestamp()
            });

            if (result.changes > 0) {
              totalUpdated++;
            }
          } catch (error) {
            totalFailed++;
            console.error(`Failed to mark gap ${gapId} as resolved:`, error);
          }
        }
      });

      if (onProgress) {
        onProgress(Math.min(i + batchSize, resolutions.length), resolutions.length);
      }
    }

    return { updated: totalUpdated, failed: totalFailed };
  }

  /**
   * Batch increment gap frequencies
   */
  async batchIncrementFrequency(
    gapIds: string[],
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{ updated: number; failed: number }> {
    if (gapIds.length === 0) {
      return { updated: 0, failed: 0 };
    }

    const { batchSize = 100, onProgress } = options;
    let totalUpdated = 0;
    let totalFailed = 0;
    const now = this.getCurrentTimestamp();

    // Process updates in batches
    for (let i = 0; i < gapIds.length; i += batchSize) {
      const batch = gapIds.slice(i, i + batchSize);
      
      await this.transaction((db) => {
        const stmt = db.prepare(`
          UPDATE knowledge_gaps 
          SET 
            frequency = frequency + 1,
            last_occurrence = @lastOccurrence,
            updated_at = @updatedAt
          WHERE id = @gapId
        `);
        
        for (const gapId of batch) {
          try {
            const result = stmt.run({
              gapId,
              lastOccurrence: now,
              updatedAt: now
            });

            if (result.changes > 0) {
              totalUpdated++;
            }
          } catch (error) {
            totalFailed++;
            console.error(`Failed to increment frequency for gap ${gapId}:`, error);
          }
        }
      });

      if (onProgress) {
        onProgress(Math.min(i + batchSize, gapIds.length), gapIds.length);
      }
    }

    return { updated: totalUpdated, failed: totalFailed };
  }

  /**
   * Batch process knowledge gaps from conversation analysis
   */
  async batchProcessGapsFromConversations(
    conversationGaps: Array<{
      conversationId: string;
      gaps: any[];
      conversationMetadata?: any;
    }>,
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
      deduplication?: boolean;
    } = {}
  ): Promise<{ processed: number; failed: number; duplicates: number }> {
    if (conversationGaps.length === 0) {
      return { processed: 0, failed: 0, duplicates: 0 };
    }

    const { batchSize = 50, onProgress, deduplication = true } = options;
    let totalProcessed = 0;
    let totalFailed = 0;
    let totalDuplicates = 0;

    // Flatten all gaps into batch-ready format
    const allGapInputs: KnowledgeGapInput[] = [];
    
    for (const { conversationId, gaps, conversationMetadata } of conversationGaps) {
      for (const gap of gaps) {
        const gapInput: KnowledgeGapInput = {
          gapType: gap.type || 'question',
          content: gap.content || gap.description || gap.question || 'Unknown gap',
          normalizedContent: gap.normalizedContent,
          frequency: gap.frequency || 1,
          firstOccurrence: gap.firstOccurrence || Date.now(),
          lastOccurrence: gap.lastOccurrence || Date.now(),
          explorationDepth: gap.explorationDepth || this.estimateExplorationDepth(gap, conversationMetadata),
          relatedEntities: gap.relatedEntities || this.extractRelatedEntities(gap),
          suggestedActions: gap.suggestedActions || this.generateSuggestedActions(gap),
          suggestedResources: gap.suggestedResources || this.generateSuggestedResources(gap)
        };
        
        allGapInputs.push(gapInput);
      }
    }

    if (allGapInputs.length > 0) {
      try {
        const result = await this.batchSaveGaps(allGapInputs, {
          batchSize,
          conflictResolution: 'UPDATE', // Merge with existing gaps
          onProgress,
          deduplication
        });
        
        totalProcessed = result.inserted + result.updated;
        totalFailed = result.failed;
        totalDuplicates = result.duplicates;
      } catch (error) {
        console.error('Batch gap processing failed:', error);
        totalFailed = allGapInputs.length;
      }
    }

    return { processed: totalProcessed, failed: totalFailed, duplicates: totalDuplicates };
  }

  /**
   * Deduplicate similar gaps based on normalized content
   */
  private async deduplicateGaps(
    gaps: KnowledgeGapInput[]
  ): Promise<{ uniqueGaps: KnowledgeGapInput[]; duplicateCount: number }> {
    const uniqueGaps: KnowledgeGapInput[] = [];
    const seenContent = new Set<string>();
    let duplicateCount = 0;

    // Group by normalized content and merge similar gaps
    const contentGroups = new Map<string, KnowledgeGapInput[]>();
    
    for (const gap of gaps) {
      const normalizedContent = gap.normalizedContent || this.normalizeContent(gap.content);
      
      if (!contentGroups.has(normalizedContent)) {
        contentGroups.set(normalizedContent, []);
      }
      contentGroups.get(normalizedContent)!.push(gap);
    }

    // Merge similar gaps in each group
    for (const [normalizedContent, groupGaps] of contentGroups.entries()) {
      if (seenContent.has(normalizedContent)) {
        duplicateCount += groupGaps.length;
        continue;
      }

      if (groupGaps.length === 1) {
        uniqueGaps.push(groupGaps[0]);
      } else {
        // Merge multiple similar gaps
        const mergedGap = this.mergeGaps(groupGaps);
        uniqueGaps.push(mergedGap);
        duplicateCount += groupGaps.length - 1;
      }
      
      seenContent.add(normalizedContent);
    }

    return { uniqueGaps, duplicateCount };
  }

  /**
   * Merge multiple similar gaps into one
   */
  private mergeGaps(gaps: KnowledgeGapInput[]): KnowledgeGapInput {
    const firstGap = gaps[0];
    
    return {
      gapType: firstGap.gapType,
      content: firstGap.content, // Use first gap's content as primary
      normalizedContent: firstGap.normalizedContent,
      frequency: gaps.reduce((sum, gap) => sum + (gap.frequency || 1), 0),
      firstOccurrence: Math.min(...gaps.map(gap => gap.firstOccurrence || Date.now())),
      lastOccurrence: Math.max(...gaps.map(gap => gap.lastOccurrence || Date.now())),
      explorationDepth: Math.max(...gaps.map(gap => gap.explorationDepth || 0)),
      relatedEntities: Array.from(new Set(gaps.flatMap(gap => gap.relatedEntities || []))),
      suggestedActions: Array.from(new Set(gaps.flatMap(gap => gap.suggestedActions || []))),
      suggestedResources: Array.from(new Set(gaps.flatMap(gap => gap.suggestedResources || [])))
    };
  }

  /**
   * Estimate exploration depth from gap and conversation metadata
   */
  private estimateExplorationDepth(gap: any, conversationMetadata?: any): number {
    let depth = 10; // Base depth
    
    const content = (gap.content || gap.description || '').toLowerCase();
    
    // Content complexity indicators
    if (content.length > 200) depth += 20;
    if (content.includes('complex') || content.includes('complicated')) depth += 15;
    if (content.includes('detailed') || content.includes('thorough')) depth += 15;
    if (content.includes('analysis') || content.includes('research')) depth += 20;
    
    // Question depth indicators  
    if (content.includes('why') || content.includes('how')) depth += 10;
    if (content.includes('what if') || content.includes('suppose')) depth += 15;
    if (content.includes('implications') || content.includes('consequences')) depth += 20;
    
    // Conversation context boost
    if (conversationMetadata?.depthScore) {
      depth += Math.floor(conversationMetadata.depthScore * 0.3);
    }
    if (conversationMetadata?.messageCount && conversationMetadata.messageCount > 10) {
      depth += 10;
    }
    
    return Math.min(100, depth);
  }

  /**
   * Extract related entities from gap content
   */
  private extractRelatedEntities(gap: any): string[] {
    const content = (gap.content || gap.description || '').toLowerCase();
    const entities: string[] = [];
    
    // Technical terms and concepts
    const techPatterns = [
      /\b(api|database|algorithm|framework|library|protocol)\b/gi,
      /\b(machine learning|ai|neural network|deep learning)\b/gi,
      /\b(blockchain|cryptocurrency|web3|smart contract)\b/gi
    ];
    
    for (const pattern of techPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        entities.push(...matches.map((m: string) => m.toLowerCase()));
      }
    }
    
    // Programming languages and technologies
    const languages = ['python', 'javascript', 'java', 'react', 'node', 'sql', 'html', 'css'];
    for (const lang of languages) {
      if (content.includes(lang)) {
        entities.push(lang);
      }
    }
    
    return Array.from(new Set(entities));
  }

  /**
   * Generate suggested actions for a gap
   */
  private generateSuggestedActions(gap: any): string[] {
    const content = (gap.content || gap.description || '').toLowerCase();
    const actions: string[] = [];
    
    // Research actions
    if (content.includes('what is') || content.includes('define')) {
      actions.push('Research basic concepts and definitions');
    }
    if (content.includes('how to') || content.includes('how do')) {
      actions.push('Find tutorials or step-by-step guides');
    }
    if (content.includes('why') || content.includes('reason')) {
      actions.push('Investigate underlying principles and causes');
    }
    
    // Learning actions
    actions.push('Review relevant documentation');
    actions.push('Find practical examples');
    
    if (gap.gapType === 'skill') {
      actions.push('Practice with hands-on exercises');
      actions.push('Build a small project to apply the concept');
    }
    
    if (gap.gapType === 'concept') {
      actions.push('Break down into smaller sub-concepts');
      actions.push('Connect to existing knowledge');
    }
    
    return actions;
  }

  /**
   * Generate suggested resources for a gap
   */
  private generateSuggestedResources(gap: any): string[] {
    const content = (gap.content || gap.description || '').toLowerCase();
    const resources: string[] = [];
    
    // Resource type suggestions based on content
    if (content.includes('programming') || content.includes('code')) {
      resources.push('Official documentation');
      resources.push('GitHub repositories with examples');
      resources.push('Stack Overflow discussions');
    }
    
    if (content.includes('concept') || content.includes('theory')) {
      resources.push('Academic papers or articles');
      resources.push('Educational videos or courses');
      resources.push('Book chapters on the topic');
    }
    
    if (content.includes('tool') || content.includes('software')) {
      resources.push('User manuals and guides');
      resources.push('Community forums');
      resources.push('Video tutorials');
    }
    
    // General resources
    resources.push('Expert blogs and articles');
    resources.push('Community discussions');
    
    return Array.from(new Set(resources));
  }
}