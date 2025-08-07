/**
 * Decision Tracking Repository
 * 
 * Handles database operations for decision quality analytics:
 * - Decision identification and classification
 * - Timeline tracking (problem -> decision -> outcome)
 * - Quality metrics and factor analysis
 * - Outcome assessment and learning
 * - Decision pattern recognition
 */

import { AnalyticsRepository, TimeRange, PaginationOptions } from './AnalyticsRepository.js';
import { DatabaseManager } from '../../storage/Database.js';

export interface DecisionTracking {
  id: string;
  decisionSummary: string;
  decisionType?: 'strategic' | 'tactical' | 'operational' | 'personal';
  conversationIds: string[];
  
  // Timeline tracking
  problemIdentifiedAt?: number;
  optionsConsideredAt?: number;
  decisionMadeAt: number;
  implementationStartedAt?: number;
  outcomeAssessedAt?: number;
  
  // Quality metrics
  clarityScore: number;
  confidenceLevel: number;
  consensusLevel: number;
  
  // Outcome tracking
  reversalCount: number;
  modificationCount: number;
  outcomeScore?: number;
  outcomeAssessment: Record<string, any>;
  
  // Decision factors
  informationCompleteness: number;
  stakeholderCount: number;
  alternativesConsidered: number;
  riskAssessed: boolean;
  
  // Analysis
  successFactors: string[];
  failureFactors: string[];
  lessonsLearned: string;
  
  // Metadata
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'decided' | 'implemented' | 'assessed' | 'reversed';
  
  createdAt: number;
  updatedAt: number;
}

export interface DecisionInput {
  decisionSummary: string;
  decisionType?: 'strategic' | 'tactical' | 'operational' | 'personal';
  conversationIds: string[];
  problemIdentifiedAt?: number;
  optionsConsideredAt?: number;
  decisionMadeAt?: number;
  clarityScore?: number;
  confidenceLevel?: number;
  informationCompleteness?: number;
  stakeholderCount?: number;
  alternativesConsidered?: number;
  riskAssessed?: boolean;
  tags?: string[];
  priority?: 'critical' | 'high' | 'medium' | 'low';
}

export interface DecisionOutcome {
  decisionId: string;
  outcomeScore: number; // 0-100
  implementationStartedAt?: number;
  outcomeAssessedAt: number;
  successFactors: string[];
  failureFactors: string[];
  lessonsLearned: string;
  modifications: string[];
}

export interface DecisionAnalysis {
  totalDecisions: number;
  averageQuality: number;
  averageOutcome: number;
  averageTimeToDecision: number; // hours
  averageTimeToImplementation: number; // hours
  reversalRate: number; // percentage
  topSuccessFactors: Array<{ factor: string; frequency: number; successRate: number }>;
  commonPitfalls: Array<{ pitfall: string; frequency: number; impactScore: number }>;
  decisionVelocityTrend: number; // decisions per week trend
}

export interface DecisionPattern {
  pattern: string;
  frequency: number;
  averageQuality: number;
  averageOutcome: number;
  confidence: number;
}

/**
 * Repository for decision tracking and quality analytics
 */
export class DecisionTrackingRepository extends AnalyticsRepository {
  
  constructor(databaseManager: DatabaseManager) {
    super(databaseManager);
  }

  /**
   * Save a new decision
   */
  async saveDecision(input: DecisionInput): Promise<string> {
    const id = this.generateId();
    const now = this.getCurrentTimestamp();
    
    const sql = `
      INSERT INTO decision_tracking (
        id, decision_summary, decision_type, conversation_ids,
        problem_identified_at, options_considered_at, decision_made_at,
        clarity_score, confidence_level, consensus_level,
        reversal_count, modification_count, 
        information_completeness, stakeholder_count, alternatives_considered, risk_assessed,
        success_factors, failure_factors, lessons_learned,
        tags, priority, status, created_at, updated_at
      ) VALUES (
        @id, @decisionSummary, @decisionType, @conversationIds,
        @problemIdentifiedAt, @optionsConsideredAt, @decisionMadeAt,
        @clarityScore, @confidenceLevel, @consensusLevel,
        @reversalCount, @modificationCount,
        @informationCompleteness, @stakeholderCount, @alternativesConsidered, @riskAssessed,
        @successFactors, @failureFactors, @lessonsLearned,
        @tags, @priority, @status, @createdAt, @updatedAt
      )
    `;

    const params = {
      id,
      decisionSummary: input.decisionSummary,
      decisionType: input.decisionType || null,
      conversationIds: JSON.stringify(input.conversationIds),
      problemIdentifiedAt: input.problemIdentifiedAt || null,
      optionsConsideredAt: input.optionsConsideredAt || null,
      decisionMadeAt: input.decisionMadeAt || now,
      clarityScore: input.clarityScore || 50,
      confidenceLevel: input.confidenceLevel || 50,
      consensusLevel: 100, // Default for single-person decisions
      reversalCount: 0,
      modificationCount: 0,
      informationCompleteness: input.informationCompleteness || 50,
      stakeholderCount: input.stakeholderCount || 1,
      alternativesConsidered: input.alternativesConsidered || 1,
      riskAssessed: input.riskAssessed || false,
      successFactors: JSON.stringify([]),
      failureFactors: JSON.stringify([]),
      lessonsLearned: '',
      tags: JSON.stringify(input.tags || []),
      priority: input.priority || 'medium',
      status: 'decided',
      createdAt: now,
      updatedAt: now
    };

    try {
      this.executeStatementRun('save_decision', sql, params);
      return id;
    } catch (error) {
      this.handleConstraintError(error as Error, 'decision');
    }
  }

  /**
   * Update decision outcome
   */
  async updateOutcome(outcome: DecisionOutcome): Promise<void> {
    const now = this.getCurrentTimestamp();
    
    const sql = `
      UPDATE decision_tracking 
      SET 
        outcome_score = @outcomeScore,
        implementation_started_at = @implementationStartedAt,
        outcome_assessed_at = @outcomeAssessedAt,
        success_factors = @successFactors,
        failure_factors = @failureFactors,
        lessons_learned = @lessonsLearned,
        modification_count = modification_count + @modificationCount,
        status = 'assessed',
        updated_at = @updatedAt
      WHERE id = @decisionId
    `;

    this.executeStatementRun('update_decision_outcome', sql, {
      decisionId: outcome.decisionId,
      outcomeScore: Math.max(0, Math.min(100, outcome.outcomeScore)),
      implementationStartedAt: outcome.implementationStartedAt || null,
      outcomeAssessedAt: outcome.outcomeAssessedAt,
      successFactors: JSON.stringify(outcome.successFactors),
      failureFactors: JSON.stringify(outcome.failureFactors),
      lessonsLearned: outcome.lessonsLearned,
      modificationCount: outcome.modifications.length,
      updatedAt: now
    });
  }

  /**
   * Mark decision as reversed
   */
  async markReversed(decisionId: string, reason: string): Promise<void> {
    const sql = `
      UPDATE decision_tracking 
      SET 
        reversal_count = reversal_count + 1,
        status = 'reversed',
        lessons_learned = CASE 
          WHEN lessons_learned = '' THEN @reason
          ELSE lessons_learned || '; ' || @reason
        END,
        updated_at = @updatedAt
      WHERE id = @decisionId
    `;

    this.executeStatementRun('mark_decision_reversed', sql, {
      decisionId,
      reason,
      updatedAt: this.getCurrentTimestamp()
    });
  }

  /**
   * Get decisions for analysis
   */
  async getDecisions(
    status?: 'pending' | 'decided' | 'implemented' | 'assessed' | 'reversed',
    timeRange?: TimeRange,
    options?: PaginationOptions
  ): Promise<DecisionTracking[]> {
    const validTimeRange = this.validateTimeRange(timeRange);
    const { limit, offset } = this.validatePagination(options?.limit, options?.offset);
    
    let whereClause = 'WHERE decision_made_at BETWEEN @start AND @end';
    const params: any = { ...validTimeRange, limit, offset };
    
    if (status) {
      whereClause += ' AND status = @status';
      params.status = status;
    }
    
    const sql = `
      SELECT 
        id, decision_summary, decision_type, conversation_ids,
        problem_identified_at, options_considered_at, decision_made_at,
        implementation_started_at, outcome_assessed_at,
        clarity_score, confidence_level, consensus_level,
        reversal_count, modification_count, outcome_score, outcome_assessment,
        information_completeness, stakeholder_count, alternatives_considered, risk_assessed,
        success_factors, failure_factors, lessons_learned,
        tags, priority, status, created_at, updated_at
      FROM decision_tracking
      ${whereClause}
      ORDER BY decision_made_at DESC
      LIMIT @limit OFFSET @offset
    `;

    const results = this.executeStatementAll<any>('get_decisions', sql, params);
    return results.map(row => this.mapRowToDecision(row));
  }

  /**
   * Get decision analysis summary
   */
  async getDecisionAnalysis(timeRange?: TimeRange): Promise<DecisionAnalysis> {
    const validTimeRange = this.validateTimeRange(timeRange);
    
    const sql = `
      WITH decision_metrics AS (
        SELECT 
          dt.*,
          CASE 
            WHEN problem_identified_at IS NOT NULL 
            THEN (decision_made_at - problem_identified_at) / (1000.0 * 60 * 60)
            ELSE NULL 
          END as hours_to_decision,
          CASE 
            WHEN implementation_started_at IS NOT NULL 
            THEN (implementation_started_at - decision_made_at) / (1000.0 * 60 * 60)
            ELSE NULL 
          END as hours_to_implementation
        FROM decision_tracking dt
        WHERE decision_made_at BETWEEN @start AND @end
      ),
      quality_stats AS (
        SELECT 
          COUNT(*) as total_decisions,
          AVG(clarity_score) as avg_quality,
          AVG(outcome_score) as avg_outcome,
          AVG(hours_to_decision) as avg_time_to_decision,
          AVG(hours_to_implementation) as avg_time_to_implementation,
          (SUM(CASE WHEN reversal_count > 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as reversal_rate
        FROM decision_metrics
      ),
      velocity_trend AS (
        SELECT 
          COUNT(*) / ((@end - @start) / (1000.0 * 60 * 60 * 24 * 7)) as decisions_per_week
        FROM decision_metrics
      )
      SELECT 
        qs.total_decisions,
        qs.avg_quality,
        qs.avg_outcome,
        qs.avg_time_to_decision,
        qs.avg_time_to_implementation,
        qs.reversal_rate,
        vt.decisions_per_week
      FROM quality_stats qs
      CROSS JOIN velocity_trend vt
    `;

    const result = this.executeStatement<any>('decision_analysis', sql, validTimeRange);
    
    // Get success factors and pitfalls
    const successFactors = await this.getTopSuccessFactors(validTimeRange);
    const commonPitfalls = await this.getCommonPitfalls(validTimeRange);

    return {
      totalDecisions: result?.total_decisions || 0,
      averageQuality: Math.round((result?.avg_quality || 0) * 10) / 10,
      averageOutcome: Math.round((result?.avg_outcome || 0) * 10) / 10,
      averageTimeToDecision: Math.round((result?.avg_time_to_decision || 0) * 10) / 10,
      averageTimeToImplementation: Math.round((result?.avg_time_to_implementation || 0) * 10) / 10,
      reversalRate: Math.round((result?.reversal_rate || 0) * 10) / 10,
      topSuccessFactors: successFactors,
      commonPitfalls: commonPitfalls,
      decisionVelocityTrend: Math.round((result?.decisions_per_week || 0) * 10) / 10
    };
  }

  /**
   * Get decision patterns
   */
  async getDecisionPatterns(timeRange?: TimeRange): Promise<DecisionPattern[]> {
    const validTimeRange = this.validateTimeRange(timeRange);
    
    const sql = `
      WITH decision_patterns AS (
        SELECT 
          CASE 
            WHEN decision_type IS NOT NULL THEN decision_type
            WHEN priority = 'critical' THEN 'urgent'
            WHEN alternatives_considered > 3 THEN 'analytical'
            WHEN confidence_level > 80 THEN 'confident'
            WHEN information_completeness < 50 THEN 'incomplete-info'
            ELSE 'standard'
          END as pattern,
          clarity_score,
          outcome_score,
          1 as frequency
        FROM decision_tracking
        WHERE decision_made_at BETWEEN @start AND @end
          AND clarity_score IS NOT NULL
      ),
      pattern_stats AS (
        SELECT 
          pattern,
          SUM(frequency) as total_frequency,
          AVG(clarity_score) as avg_quality,
          AVG(outcome_score) as avg_outcome,
          COUNT(*) as sample_size
        FROM decision_patterns
        GROUP BY pattern
        HAVING total_frequency >= 3
      )
      SELECT 
        pattern,
        total_frequency as frequency,
        avg_quality,
        avg_outcome,
        CASE 
          WHEN sample_size >= 10 THEN 0.9
          WHEN sample_size >= 5 THEN 0.7
          ELSE 0.5
        END as confidence
      FROM pattern_stats
      ORDER BY total_frequency DESC, avg_outcome DESC
    `;

    const results = this.executeStatementAll<any>('decision_patterns', sql, validTimeRange);
    
    return results.map(row => ({
      pattern: row.pattern,
      frequency: row.frequency,
      averageQuality: Math.round((row.avg_quality || 0) * 10) / 10,
      averageOutcome: Math.round((row.avg_outcome || 0) * 10) / 10,
      confidence: row.confidence
    }));
  }

  /**
   * Get decisions needing follow-up
   */
  async getDecisionsNeedingFollowUp(daysOld: number = 30): Promise<DecisionTracking[]> {
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    const sql = `
      SELECT 
        id, decision_summary, decision_type, conversation_ids,
        problem_identified_at, options_considered_at, decision_made_at,
        implementation_started_at, outcome_assessed_at,
        clarity_score, confidence_level, consensus_level,
        reversal_count, modification_count, outcome_score, outcome_assessment,
        information_completeness, stakeholder_count, alternatives_considered, risk_assessed,
        success_factors, failure_factors, lessons_learned,
        tags, priority, status, created_at, updated_at
      FROM decision_tracking
      WHERE status IN ('decided', 'implemented')
        AND decision_made_at < @cutoffTime
        AND (outcome_assessed_at IS NULL OR outcome_score IS NULL)
      ORDER BY decision_made_at ASC
      LIMIT 20
    `;

    const results = this.executeStatementAll<any>(
      'decisions_needing_followup',
      sql,
      { cutoffTime }
    );

    return results.map(row => this.mapRowToDecision(row));
  }

  /**
   * Get decision by ID
   */
  async getDecision(decisionId: string): Promise<DecisionTracking | null> {
    const sql = `
      SELECT 
        id, decision_summary, decision_type, conversation_ids,
        problem_identified_at, options_considered_at, decision_made_at,
        implementation_started_at, outcome_assessed_at,
        clarity_score, confidence_level, consensus_level,
        reversal_count, modification_count, outcome_score, outcome_assessment,
        information_completeness, stakeholder_count, alternatives_considered, risk_assessed,
        success_factors, failure_factors, lessons_learned,
        tags, priority, status, created_at, updated_at
      FROM decision_tracking
      WHERE id = @decisionId
    `;

    const result = this.executeStatement<any>('get_decision', sql, { decisionId });
    return result ? this.mapRowToDecision(result) : null;
  }

  /**
   * Delete decision
   */
  async deleteDecision(decisionId: string): Promise<number> {
    const sql = 'DELETE FROM decision_tracking WHERE id = @decisionId';
    const result = this.executeStatementRun('delete_decision', sql, { decisionId });
    return result.changes;
  }

  /**
   * Get top success factors
   */
  private async getTopSuccessFactors(
    timeRange: TimeRange
  ): Promise<Array<{ factor: string; frequency: number; successRate: number }>> {
    const sql = `
      WITH successful_decisions AS (
        SELECT success_factors
        FROM decision_tracking
        WHERE decision_made_at BETWEEN @start AND @end
          AND outcome_score >= 70
          AND success_factors != '[]'
      ),
      all_factors AS (
        SELECT 
          json_each.value as factor
        FROM successful_decisions, json_each(successful_decisions.success_factors)
      ),
      factor_stats AS (
        SELECT 
          factor,
          COUNT(*) as frequency
        FROM all_factors
        GROUP BY factor
        HAVING frequency >= 2
      )
      SELECT 
        factor,
        frequency,
        90.0 as success_rate -- Simplified - could be calculated more precisely
      FROM factor_stats
      ORDER BY frequency DESC
      LIMIT 10
    `;

    const results = this.executeStatementAll<any>('top_success_factors', sql, timeRange);
    
    return results.map(row => ({
      factor: row.factor,
      frequency: row.frequency,
      successRate: row.success_rate
    }));
  }

  /**
   * Get common pitfalls
   */
  private async getCommonPitfalls(
    timeRange: TimeRange
  ): Promise<Array<{ pitfall: string; frequency: number; impactScore: number }>> {
    const sql = `
      WITH failed_decisions AS (
        SELECT failure_factors, outcome_score
        FROM decision_tracking
        WHERE decision_made_at BETWEEN @start AND @end
          AND (outcome_score < 50 OR reversal_count > 0)
          AND failure_factors != '[]'
      ),
      all_pitfalls AS (
        SELECT 
          json_each.value as pitfall,
          outcome_score
        FROM failed_decisions, json_each(failed_decisions.failure_factors)
      ),
      pitfall_stats AS (
        SELECT 
          pitfall,
          COUNT(*) as frequency,
          AVG(100 - outcome_score) as avg_impact
        FROM all_pitfalls
        GROUP BY pitfall
        HAVING frequency >= 2
      )
      SELECT 
        pitfall,
        frequency,
        avg_impact as impact_score
      FROM pitfall_stats
      ORDER BY frequency DESC, avg_impact DESC
      LIMIT 10
    `;

    const results = this.executeStatementAll<any>('common_pitfalls', sql, timeRange);
    
    return results.map(row => ({
      pitfall: row.pitfall,
      frequency: row.frequency,
      impactScore: Math.round(row.impact_score)
    }));
  }

  /**
   * Map database row to DecisionTracking interface
   */
  private mapRowToDecision(row: any): DecisionTracking {
    return {
      id: row.id,
      decisionSummary: row.decision_summary,
      decisionType: row.decision_type,
      conversationIds: this.parseJSONArray(row.conversation_ids),
      problemIdentifiedAt: row.problem_identified_at,
      optionsConsideredAt: row.options_considered_at,
      decisionMadeAt: row.decision_made_at,
      implementationStartedAt: row.implementation_started_at,
      outcomeAssessedAt: row.outcome_assessed_at,
      clarityScore: row.clarity_score || 0,
      confidenceLevel: row.confidence_level || 0,
      consensusLevel: row.consensus_level || 0,
      reversalCount: row.reversal_count || 0,
      modificationCount: row.modification_count || 0,
      outcomeScore: row.outcome_score,
      outcomeAssessment: this.parseAnalyticsMetadata(row.outcome_assessment),
      informationCompleteness: row.information_completeness || 0,
      stakeholderCount: row.stakeholder_count || 0,
      alternativesConsidered: row.alternatives_considered || 0,
      riskAssessed: Boolean(row.risk_assessed),
      successFactors: this.parseJSONArray(row.success_factors),
      failureFactors: this.parseJSONArray(row.failure_factors),
      lessonsLearned: row.lessons_learned || '',
      tags: this.parseJSONArray(row.tags),
      priority: row.priority || 'medium',
      status: row.status || 'pending',
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
   * Batch save decisions with optimized performance
   */
  async batchSaveDecisions(
    decisionInputs: DecisionInput[],
    options: {
      batchSize?: number;
      conflictResolution?: 'IGNORE' | 'REPLACE' | 'UPDATE';
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{ inserted: number; updated: number; failed: number; errors: Error[] }> {
    if (decisionInputs.length === 0) {
      return { inserted: 0, updated: 0, failed: 0, errors: [] };
    }

    const { batchSize = 100, conflictResolution = 'IGNORE', onProgress } = options;
    const now = this.getCurrentTimestamp();
    
    // Prepare decision records with IDs and timestamps
    const dbRecords = decisionInputs.map(input => ({
      id: this.generateId(),
      decision_summary: input.decisionSummary,
      decision_type: input.decisionType || null,
      conversation_ids: JSON.stringify(input.conversationIds),
      problem_identified_at: input.problemIdentifiedAt || null,
      options_considered_at: input.optionsConsideredAt || null,
      decision_made_at: input.decisionMadeAt || now,
      clarity_score: input.clarityScore || 50,
      confidence_level: input.confidenceLevel || 50,
      consensus_level: 100, // Default for single-person decisions
      reversal_count: 0,
      modification_count: 0,
      information_completeness: input.informationCompleteness || 50,
      stakeholder_count: input.stakeholderCount || 1,
      alternatives_considered: input.alternativesConsidered || 1,
      risk_assessed: input.riskAssessed || false,
      success_factors: JSON.stringify([]),
      failure_factors: JSON.stringify([]),
      lessons_learned: '',
      tags: JSON.stringify(input.tags || []),
      priority: input.priority || 'medium',
      status: 'decided',
      created_at: now,
      updated_at: now
    }));

    try {
      if (conflictResolution === 'UPDATE') {
        // Use upsert for update behavior
        const result = this.batchUpsert(
          'decision_tracking',
          dbRecords,
          ['decision_summary', 'decision_made_at'], // Unique constraint
          {
            batchSize,
            onProgress
          }
        );
        return { 
          inserted: result.inserted, 
          updated: result.updated, 
          failed: result.failed,
          errors: []
        };
      } else {
        // Use batch insert for other conflict resolutions
        const result = this.batchInsert(
          'decision_tracking',
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
          errors: result.errors
        };
      }
    } catch (error) {
      throw new Error(`Batch decisions save failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Batch update decision outcomes
   */
  async batchUpdateOutcomes(
    outcomes: DecisionOutcome[],
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{ updated: number; failed: number }> {
    if (outcomes.length === 0) {
      return { updated: 0, failed: 0 };
    }

    const { batchSize = 100, onProgress } = options;
    let totalUpdated = 0;
    let totalFailed = 0;

    // Process updates in batches
    for (let i = 0; i < outcomes.length; i += batchSize) {
      const batch = outcomes.slice(i, i + batchSize);
      
      await this.transaction((db) => {
        const stmt = db.prepare(`
          UPDATE decision_tracking 
          SET 
            outcome_score = @outcomeScore,
            implementation_started_at = @implementationStartedAt,
            outcome_assessed_at = @outcomeAssessedAt,
            success_factors = @successFactors,
            failure_factors = @failureFactors,
            lessons_learned = @lessonsLearned,
            modification_count = modification_count + @modificationCount,
            status = 'assessed',
            updated_at = @updatedAt
          WHERE id = @decisionId
        `);
        
        for (const outcome of batch) {
          try {
            const params = {
              decisionId: outcome.decisionId,
              outcomeScore: Math.max(0, Math.min(100, outcome.outcomeScore)),
              implementationStartedAt: outcome.implementationStartedAt || null,
              outcomeAssessedAt: outcome.outcomeAssessedAt,
              successFactors: JSON.stringify(outcome.successFactors),
              failureFactors: JSON.stringify(outcome.failureFactors),
              lessonsLearned: outcome.lessonsLearned,
              modificationCount: outcome.modifications.length,
              updatedAt: this.getCurrentTimestamp()
            };

            const result = stmt.run(params);
            if (result.changes > 0) {
              totalUpdated++;
            }
          } catch (error) {
            totalFailed++;
            console.error(`Failed to update outcome for decision ${outcome.decisionId}:`, error);
          }
        }
      });

      if (onProgress) {
        onProgress(Math.min(i + batchSize, outcomes.length), outcomes.length);
      }
    }

    return { updated: totalUpdated, failed: totalFailed };
  }

  /**
   * Batch mark decisions as reversed
   */
  async batchMarkReversed(
    reversals: Array<{
      decisionId: string;
      reason: string;
    }>,
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{ updated: number; failed: number }> {
    if (reversals.length === 0) {
      return { updated: 0, failed: 0 };
    }

    const { batchSize = 100, onProgress } = options;
    let totalUpdated = 0;
    let totalFailed = 0;

    // Process updates in batches
    for (let i = 0; i < reversals.length; i += batchSize) {
      const batch = reversals.slice(i, i + batchSize);
      
      await this.transaction((db) => {
        const stmt = db.prepare(`
          UPDATE decision_tracking 
          SET 
            reversal_count = reversal_count + 1,
            status = 'reversed',
            lessons_learned = CASE 
              WHEN lessons_learned = '' THEN @reason
              ELSE lessons_learned || '; ' || @reason
            END,
            updated_at = @updatedAt
          WHERE id = @decisionId
        `);
        
        for (const { decisionId, reason } of batch) {
          try {
            const result = stmt.run({
              decisionId,
              reason,
              updatedAt: this.getCurrentTimestamp()
            });

            if (result.changes > 0) {
              totalUpdated++;
            }
          } catch (error) {
            totalFailed++;
            console.error(`Failed to mark decision ${decisionId} as reversed:`, error);
          }
        }
      });

      if (onProgress) {
        onProgress(Math.min(i + batchSize, reversals.length), reversals.length);
      }
    }

    return { updated: totalUpdated, failed: totalFailed };
  }

  /**
   * Batch delete decisions
   */
  async batchDeleteDecisions(
    decisionIds: string[],
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{ deleted: number; failed: number }> {
    if (decisionIds.length === 0) {
      return { deleted: 0, failed: 0 };
    }

    const { batchSize = 100, onProgress } = options;
    let totalDeleted = 0;
    let totalFailed = 0;

    // Process deletions in batches
    for (let i = 0; i < decisionIds.length; i += batchSize) {
      const batch = decisionIds.slice(i, i + batchSize);
      
      try {
        const placeholders = batch.map((_, index) => `@id${index}`).join(', ');
        const params = batch.reduce((acc, id, index) => {
          acc[`id${index}`] = id;
          return acc;
        }, {} as Record<string, string>);

        const sql = `
          DELETE FROM decision_tracking 
          WHERE id IN (${placeholders})
        `;

        const result = this.executeStatementRun(
          `batch_delete_decisions_${i}`,
          sql,
          params
        );

        totalDeleted += result.changes;
      } catch (error) {
        totalFailed += batch.length;
        console.error(`Failed to delete decisions batch ${i}:`, error);
      }

      if (onProgress) {
        onProgress(Math.min(i + batchSize, decisionIds.length), decisionIds.length);
      }
    }

    return { deleted: totalDeleted, failed: totalFailed };
  }

  /**
   * Batch track decisions from conversation analysis
   */
  async batchTrackDecisions(
    conversationDecisions: Array<{
      conversationId: string;
      decisions: any[];
      conversationMetadata?: any;
    }>,
    options: {
      batchSize?: number;
      onProgress?: (processed: number, total: number) => void;
    } = {}
  ): Promise<{ tracked: number; failed: number }> {
    if (conversationDecisions.length === 0) {
      return { tracked: 0, failed: 0 };
    }

    const { batchSize = 50, onProgress } = options;
    let totalTracked = 0;
    let totalFailed = 0;

    // Flatten all decisions into batch-ready format
    const allDecisionInputs: DecisionInput[] = [];
    
    for (const { conversationId, decisions, conversationMetadata } of conversationDecisions) {
      for (const decision of decisions) {
        const decisionInput: DecisionInput = {
          decisionSummary: decision.summary || decision.content || 'Automated decision detection',
          decisionType: decision.type || 'operational',
          conversationIds: [conversationId],
          problemIdentifiedAt: decision.problemIdentifiedAt,
          optionsConsideredAt: decision.optionsConsideredAt,
          decisionMadeAt: decision.timestamp || decision.decisionMadeAt || Date.now(),
          clarityScore: decision.clarityScore || this.estimateDecisionClarity(decision),
          confidenceLevel: decision.confidenceLevel || this.estimateConfidenceLevel(decision),
          informationCompleteness: decision.informationCompleteness || 
            this.estimateInformationCompleteness(decision, conversationMetadata),
          stakeholderCount: decision.stakeholderCount || 1,
          alternativesConsidered: decision.alternativesConsidered || 
            this.countAlternatives(decision),
          riskAssessed: decision.riskAssessed || this.detectRiskAssessment(decision),
          tags: decision.tags || this.extractDecisionTags(decision),
          priority: decision.priority || this.assessDecisionPriority(decision)
        };
        
        allDecisionInputs.push(decisionInput);
      }
    }

    if (allDecisionInputs.length > 0) {
      try {
        const result = await this.batchSaveDecisions(allDecisionInputs, {
          batchSize,
          conflictResolution: 'IGNORE', // Avoid duplicates
          onProgress
        });
        
        totalTracked = result.inserted + result.updated;
        totalFailed = result.failed;
      } catch (error) {
        console.error('Batch decision tracking failed:', error);
        totalFailed = allDecisionInputs.length;
      }
    }

    return { tracked: totalTracked, failed: totalFailed };
  }

  /**
   * Estimate decision clarity from content
   */
  private estimateDecisionClarity(decision: any): number {
    const content = (decision.content || decision.summary || '').toLowerCase();
    let clarity = 50;
    
    // Positive indicators
    if (content.includes('decided') || content.includes('choose') || content.includes('select')) {
      clarity += 20;
    }
    if (content.includes('because') || content.includes('since') || content.includes('due to')) {
      clarity += 15;
    }
    if (content.includes('will') || content.includes('plan to') || content.includes('going to')) {
      clarity += 10;
    }
    
    // Negative indicators
    if (content.includes('maybe') || content.includes('might') || content.includes('perhaps')) {
      clarity -= 20;
    }
    if (content.includes('not sure') || content.includes('unsure') || content.includes('unclear')) {
      clarity -= 15;
    }
    
    return Math.max(0, Math.min(100, clarity));
  }

  /**
   * Estimate confidence level from content
   */
  private estimateConfidenceLevel(decision: any): number {
    const content = (decision.content || decision.summary || '').toLowerCase();
    let confidence = 50;
    
    // High confidence indicators
    if (content.includes('definitely') || content.includes('certainly') || content.includes('absolutely')) {
      confidence += 30;
    }
    if (content.includes('confident') || content.includes('sure') || content.includes('convinced')) {
      confidence += 20;
    }
    
    // Low confidence indicators
    if (content.includes('uncertain') || content.includes('doubt') || content.includes('hesitant')) {
      confidence -= 25;
    }
    if (content.includes('risky') || content.includes('gamble') || content.includes('unsure')) {
      confidence -= 20;
    }
    
    return Math.max(0, Math.min(100, confidence));
  }

  /**
   * Estimate information completeness
   */
  private estimateInformationCompleteness(decision: any, metadata?: any): number {
    let completeness = 40;
    
    const content = (decision.content || decision.summary || '').toLowerCase();
    
    // Information indicators
    if (content.includes('research') || content.includes('analysis') || content.includes('data')) {
      completeness += 20;
    }
    if (content.includes('compare') || content.includes('evaluate') || content.includes('consider')) {
      completeness += 15;
    }
    if (content.includes('expert') || content.includes('advisor') || content.includes('consultant')) {
      completeness += 10;
    }
    
    // Incomplete information indicators
    if (content.includes('assume') || content.includes('guess') || content.includes('estimate')) {
      completeness -= 15;
    }
    if (content.includes('limited info') || content.includes('not enough') || content.includes('incomplete')) {
      completeness -= 20;
    }
    
    // Boost based on conversation depth
    if (metadata?.depthScore && metadata.depthScore > 70) {
      completeness += 15;
    }
    
    return Math.max(0, Math.min(100, completeness));
  }

  /**
   * Count alternatives mentioned in decision
   */
  private countAlternatives(decision: any): number {
    const content = (decision.content || decision.summary || '').toLowerCase();
    let alternatives = 1;
    
    // Look for alternative indicators
    const altIndicators = ['or', 'option', 'alternative', 'choice', 'instead', 'versus', 'vs'];
    for (const indicator of altIndicators) {
      const regex = new RegExp(indicator, 'gi');
      const matches = content.match(regex);
      if (matches) {
        alternatives += matches.length;
      }
    }
    
    return Math.min(alternatives, 10); // Cap at 10
  }

  /**
   * Detect if risk was assessed
   */
  private detectRiskAssessment(decision: any): boolean {
    const content = (decision.content || decision.summary || '').toLowerCase();
    const riskKeywords = [
      'risk', 'danger', 'threat', 'consequence', 'downside', 
      'problem', 'issue', 'concern', 'drawback', 'disadvantage'
    ];
    
    return riskKeywords.some(keyword => content.includes(keyword));
  }

  /**
   * Extract decision tags from content
   */
  private extractDecisionTags(decision: any): string[] {
    const content = (decision.content || decision.summary || '').toLowerCase();
    const tags: string[] = [];
    
    // Category tags
    if (content.includes('strategic') || content.includes('strategy')) tags.push('strategic');
    if (content.includes('technical') || content.includes('technology')) tags.push('technical');
    if (content.includes('business') || content.includes('commercial')) tags.push('business');
    if (content.includes('personal') || content.includes('individual')) tags.push('personal');
    if (content.includes('financial') || content.includes('budget') || content.includes('cost')) tags.push('financial');
    if (content.includes('urgent') || content.includes('immediate')) tags.push('urgent');
    if (content.includes('long-term') || content.includes('future')) tags.push('long-term');
    if (content.includes('team') || content.includes('group') || content.includes('collaboration')) tags.push('collaborative');
    
    return tags;
  }

  /**
   * Assess decision priority
   */
  private assessDecisionPriority(decision: any): 'critical' | 'high' | 'medium' | 'low' {
    const content = (decision.content || decision.summary || '').toLowerCase();
    
    // Critical priority indicators
    if (content.includes('critical') || content.includes('urgent') || content.includes('emergency')) {
      return 'critical';
    }
    if (content.includes('deadline') || content.includes('asap') || content.includes('immediately')) {
      return 'critical';
    }
    
    // High priority indicators
    if (content.includes('important') || content.includes('significant') || content.includes('major')) {
      return 'high';
    }
    if (content.includes('soon') || content.includes('quickly') || content.includes('priority')) {
      return 'high';
    }
    
    // Low priority indicators
    if (content.includes('eventually') || content.includes('someday') || content.includes('later')) {
      return 'low';
    }
    if (content.includes('minor') || content.includes('small') || content.includes('trivial')) {
      return 'low';
    }
    
    return 'medium'; // Default
  }
}