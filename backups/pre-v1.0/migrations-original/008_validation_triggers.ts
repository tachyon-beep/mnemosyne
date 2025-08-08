/**
 * Migration 007: Database Validation Triggers
 * 
 * Implements comprehensive data consistency validation triggers to ensure:
 * - Temporal sequence consistency (decision_made_at >= problem_identified_at)
 * - Resolution date validation for resolved gaps
 * - Time window validation (window_end > window_start)
 * - Positive frequency validation for knowledge gaps
 * - Score range validation beyond CHECK constraints
 * - Cross-table consistency validation
 */

import { Migration } from './Migration.js';

export const validationTriggersMigration: Migration = {
  version: 8,
  description: 'Add comprehensive database validation triggers for data integrity and consistency',
  
  up: [
    // 1. Temporal Sequence Validation for Decision Tracking
    `CREATE TRIGGER trg_decision_temporal_sequence
     BEFORE INSERT ON decision_tracking
     WHEN NEW.problem_identified_at IS NOT NULL 
      AND NEW.decision_made_at IS NOT NULL
      AND NEW.problem_identified_at > NEW.decision_made_at
     BEGIN
       SELECT RAISE(ABORT, 'Decision cannot be made before problem is identified. problem_identified_at must be <= decision_made_at');
     END`,

    `CREATE TRIGGER trg_decision_temporal_sequence_update
     BEFORE UPDATE ON decision_tracking
     WHEN NEW.problem_identified_at IS NOT NULL 
      AND NEW.decision_made_at IS NOT NULL
      AND NEW.problem_identified_at > NEW.decision_made_at
     BEGIN
       SELECT RAISE(ABORT, 'Decision cannot be made before problem is identified. problem_identified_at must be <= decision_made_at');
     END`,

    // 2. Options Consideration Sequence Validation
    `CREATE TRIGGER trg_decision_options_sequence
     BEFORE INSERT ON decision_tracking
     WHEN NEW.options_considered_at IS NOT NULL 
      AND NEW.decision_made_at IS NOT NULL
      AND NEW.options_considered_at > NEW.decision_made_at
     BEGIN
       SELECT RAISE(ABORT, 'Options must be considered before decision is made. options_considered_at must be <= decision_made_at');
     END`,

    `CREATE TRIGGER trg_decision_options_sequence_update
     BEFORE UPDATE ON decision_tracking
     WHEN NEW.options_considered_at IS NOT NULL 
      AND NEW.decision_made_at IS NOT NULL
      AND NEW.options_considered_at > NEW.decision_made_at
     BEGIN
       SELECT RAISE(ABORT, 'Options must be considered before decision is made. options_considered_at must be <= decision_made_at');
     END`,

    // 3. Implementation Sequence Validation
    `CREATE TRIGGER trg_decision_implementation_sequence
     BEFORE INSERT ON decision_tracking
     WHEN NEW.implementation_started_at IS NOT NULL 
      AND NEW.decision_made_at IS NOT NULL
      AND NEW.implementation_started_at < NEW.decision_made_at
     BEGIN
       SELECT RAISE(ABORT, 'Implementation cannot start before decision is made. implementation_started_at must be >= decision_made_at');
     END`,

    `CREATE TRIGGER trg_decision_implementation_sequence_update
     BEFORE UPDATE ON decision_tracking
     WHEN NEW.implementation_started_at IS NOT NULL 
      AND NEW.decision_made_at IS NOT NULL
      AND NEW.implementation_started_at < NEW.decision_made_at
     BEGIN
       SELECT RAISE(ABORT, 'Implementation cannot start before decision is made. implementation_started_at must be >= decision_made_at');
     END`,

    // 4. Outcome Assessment Sequence Validation
    `CREATE TRIGGER trg_decision_outcome_sequence
     BEFORE INSERT ON decision_tracking
     WHEN NEW.outcome_assessed_at IS NOT NULL 
      AND NEW.decision_made_at IS NOT NULL
      AND NEW.outcome_assessed_at < NEW.decision_made_at
     BEGIN
       SELECT RAISE(ABORT, 'Outcome cannot be assessed before decision is made. outcome_assessed_at must be >= decision_made_at');
     END`,

    `CREATE TRIGGER trg_decision_outcome_sequence_update
     BEFORE UPDATE ON decision_tracking
     WHEN NEW.outcome_assessed_at IS NOT NULL 
      AND NEW.decision_made_at IS NOT NULL
      AND NEW.outcome_assessed_at < NEW.decision_made_at
     BEGIN
       SELECT RAISE(ABORT, 'Outcome cannot be assessed before decision is made. outcome_assessed_at must be >= decision_made_at');
     END`,

    // 5. Knowledge Gaps Resolution Validation
    `CREATE TRIGGER trg_knowledge_gap_resolution_date
     BEFORE INSERT ON knowledge_gaps
     WHEN NEW.resolved = TRUE AND NEW.resolution_date IS NULL
     BEGIN
       SELECT RAISE(ABORT, 'Resolution date is required when knowledge gap is marked as resolved');
     END`,

    `CREATE TRIGGER trg_knowledge_gap_resolution_date_update
     BEFORE UPDATE ON knowledge_gaps
     WHEN NEW.resolved = TRUE AND NEW.resolution_date IS NULL
     BEGIN
       SELECT RAISE(ABORT, 'Resolution date is required when knowledge gap is marked as resolved');
     END`,

    // 6. Knowledge Gap Resolution Conversation Validation
    `CREATE TRIGGER trg_knowledge_gap_resolution_conversation
     BEFORE INSERT ON knowledge_gaps
     WHEN NEW.resolved = TRUE AND NEW.resolution_conversation_id IS NULL
     BEGIN
       SELECT RAISE(ABORT, 'Resolution conversation ID is required when knowledge gap is marked as resolved');
     END`,

    `CREATE TRIGGER trg_knowledge_gap_resolution_conversation_update
     BEFORE UPDATE ON knowledge_gaps
     WHEN NEW.resolved = TRUE AND NEW.resolution_conversation_id IS NULL
     BEGIN
       SELECT RAISE(ABORT, 'Resolution conversation ID is required when knowledge gap is marked as resolved');
     END`,

    // 7. Knowledge Gap Frequency Validation
    `CREATE TRIGGER trg_knowledge_gap_frequency_positive
     BEFORE INSERT ON knowledge_gaps
     WHEN NEW.frequency IS NOT NULL AND NEW.frequency <= 0
     BEGIN
       SELECT RAISE(ABORT, 'Knowledge gap frequency must be positive (greater than 0)');
     END`,

    `CREATE TRIGGER trg_knowledge_gap_frequency_positive_update
     BEFORE UPDATE ON knowledge_gaps
     WHEN NEW.frequency IS NOT NULL AND NEW.frequency <= 0
     BEGIN
       SELECT RAISE(ABORT, 'Knowledge gap frequency must be positive (greater than 0)');
     END`,

    // 8. Productivity Pattern Time Window Validation
    `CREATE TRIGGER trg_productivity_pattern_window_validation
     BEFORE INSERT ON productivity_patterns
     WHEN NEW.window_start >= NEW.window_end
     BEGIN
       SELECT RAISE(ABORT, 'Productivity pattern window_end must be greater than window_start');
     END`,

    `CREATE TRIGGER trg_productivity_pattern_window_validation_update
     BEFORE UPDATE ON productivity_patterns
     WHEN NEW.window_start >= NEW.window_end
     BEGIN
       SELECT RAISE(ABORT, 'Productivity pattern window_end must be greater than window_start');
     END`,

    // 9. Topic Evolution Timeline Validation
    `CREATE TRIGGER trg_topic_evolution_timeline
     BEFORE INSERT ON topic_evolution
     WHEN NEW.first_mentioned_at > NEW.last_discussed_at
     BEGIN
       SELECT RAISE(ABORT, 'Topic first_mentioned_at cannot be after last_discussed_at');
     END`,

    `CREATE TRIGGER trg_topic_evolution_timeline_update
     BEFORE UPDATE ON topic_evolution
     WHEN NEW.first_mentioned_at > NEW.last_discussed_at
     BEGIN
       SELECT RAISE(ABORT, 'Topic first_mentioned_at cannot be after last_discussed_at');
     END`,

    // 10. Knowledge Gap Occurrence Timeline Validation
    `CREATE TRIGGER trg_knowledge_gap_occurrence_timeline
     BEFORE INSERT ON knowledge_gaps
     WHEN NEW.first_occurrence > NEW.last_occurrence
     BEGIN
       SELECT RAISE(ABORT, 'Knowledge gap first_occurrence cannot be after last_occurrence');
     END`,

    `CREATE TRIGGER trg_knowledge_gap_occurrence_timeline_update
     BEFORE UPDATE ON knowledge_gaps
     WHEN NEW.first_occurrence > NEW.last_occurrence
     BEGIN
       SELECT RAISE(ABORT, 'Knowledge gap first_occurrence cannot be after last_occurrence');
     END`,

    // 11. Message Parent Relationship Validation (prevent circular references)
    `CREATE TRIGGER trg_message_parent_circular_reference
     BEFORE INSERT ON messages
     WHEN NEW.parent_message_id IS NOT NULL AND NEW.parent_message_id = NEW.id
     BEGIN
       SELECT RAISE(ABORT, 'Message cannot be its own parent (circular reference not allowed)');
     END`,

    `CREATE TRIGGER trg_message_parent_circular_reference_update
     BEFORE UPDATE ON messages
     WHEN NEW.parent_message_id IS NOT NULL AND NEW.parent_message_id = NEW.id
     BEGIN
       SELECT RAISE(ABORT, 'Message cannot be its own parent (circular reference not allowed)');
     END`,

    // 12. Conversation Summary Message Relationship Validation
    `CREATE TRIGGER trg_conversation_summary_message_relationship
     BEFORE INSERT ON conversation_summaries
     WHEN NEW.start_message_id IS NOT NULL 
      AND NEW.end_message_id IS NOT NULL
      AND NEW.start_message_id = NEW.end_message_id
      AND NEW.message_count > 1
     BEGIN
       SELECT RAISE(ABORT, 'Conversation summary with more than 1 message cannot have same start and end message');
     END`,

    `CREATE TRIGGER trg_conversation_summary_message_relationship_update
     BEFORE UPDATE ON conversation_summaries
     WHEN NEW.start_message_id IS NOT NULL 
      AND NEW.end_message_id IS NOT NULL
      AND NEW.start_message_id = NEW.end_message_id
      AND NEW.message_count > 1
     BEGIN
       SELECT RAISE(ABORT, 'Conversation summary with more than 1 message cannot have same start and end message');
     END`,

    // 13. Analytics Score Range Validation (additional to CHECK constraints)
    `CREATE TRIGGER trg_analytics_score_comprehensive_validation
     BEFORE INSERT ON conversation_analytics
     WHEN (NEW.depth_score < 0 OR NEW.depth_score > 100)
       OR (NEW.circularity_index < 0 OR NEW.circularity_index > 1)
       OR (NEW.productivity_score < 0 OR NEW.productivity_score > 100)
       OR (NEW.question_quality_avg IS NOT NULL AND (NEW.question_quality_avg < 0 OR NEW.question_quality_avg > 100))
       OR (NEW.response_quality_avg IS NOT NULL AND (NEW.response_quality_avg < 0 OR NEW.response_quality_avg > 100))
       OR (NEW.engagement_score IS NOT NULL AND (NEW.engagement_score < 0 OR NEW.engagement_score > 100))
     BEGIN
       SELECT RAISE(ABORT, 'Analytics scores must be within valid ranges: depth_score (0-100), circularity_index (0-1), productivity_score (0-100), quality scores (0-100)');
     END`,

    `CREATE TRIGGER trg_analytics_score_comprehensive_validation_update
     BEFORE UPDATE ON conversation_analytics
     WHEN (NEW.depth_score < 0 OR NEW.depth_score > 100)
       OR (NEW.circularity_index < 0 OR NEW.circularity_index > 1)
       OR (NEW.productivity_score < 0 OR NEW.productivity_score > 100)
       OR (NEW.question_quality_avg IS NOT NULL AND (NEW.question_quality_avg < 0 OR NEW.question_quality_avg > 100))
       OR (NEW.response_quality_avg IS NOT NULL AND (NEW.response_quality_avg < 0 OR NEW.response_quality_avg > 100))
       OR (NEW.engagement_score IS NOT NULL AND (NEW.engagement_score < 0 OR NEW.engagement_score > 100))
     BEGIN
       SELECT RAISE(ABORT, 'Analytics scores must be within valid ranges: depth_score (0-100), circularity_index (0-1), productivity_score (0-100), quality scores (0-100)');
     END`,

    // 14. Insight Score Validation
    `CREATE TRIGGER trg_insight_score_validation
     BEFORE INSERT ON insights
     WHEN (NEW.significance_score < 0 OR NEW.significance_score > 100)
       OR (NEW.novelty_score < 0 OR NEW.novelty_score > 100)
       OR (NEW.applicability_score < 0 OR NEW.applicability_score > 100)
     BEGIN
       SELECT RAISE(ABORT, 'Insight scores must be within range 0-100 (significance_score, novelty_score, applicability_score)');
     END`,

    `CREATE TRIGGER trg_insight_score_validation_update
     BEFORE UPDATE ON insights
     WHEN (NEW.significance_score < 0 OR NEW.significance_score > 100)
       OR (NEW.novelty_score < 0 OR NEW.novelty_score > 100)
       OR (NEW.applicability_score < 0 OR NEW.applicability_score > 100)
     BEGIN
       SELECT RAISE(ABORT, 'Insight scores must be within range 0-100 (significance_score, novelty_score, applicability_score)');
     END`,

    // 15. Decision Quality Score Validation
    `CREATE TRIGGER trg_decision_quality_validation
     BEFORE INSERT ON decision_tracking
     WHEN (NEW.clarity_score IS NOT NULL AND (NEW.clarity_score < 0 OR NEW.clarity_score > 100))
       OR (NEW.confidence_level IS NOT NULL AND (NEW.confidence_level < 0 OR NEW.confidence_level > 100))
       OR (NEW.consensus_level IS NOT NULL AND (NEW.consensus_level < 0 OR NEW.consensus_level > 100))
       OR (NEW.outcome_score IS NOT NULL AND (NEW.outcome_score < 0 OR NEW.outcome_score > 100))
       OR (NEW.information_completeness IS NOT NULL AND (NEW.information_completeness < 0 OR NEW.information_completeness > 100))
     BEGIN
       SELECT RAISE(ABORT, 'Decision quality scores must be within range 0-100 (clarity_score, confidence_level, consensus_level, outcome_score, information_completeness)');
     END`,

    `CREATE TRIGGER trg_decision_quality_validation_update
     BEFORE UPDATE ON decision_tracking
     WHEN (NEW.clarity_score IS NOT NULL AND (NEW.clarity_score < 0 OR NEW.clarity_score > 100))
       OR (NEW.confidence_level IS NOT NULL AND (NEW.confidence_level < 0 OR NEW.confidence_level > 100))
       OR (NEW.consensus_level IS NOT NULL AND (NEW.consensus_level < 0 OR NEW.consensus_level > 100))
       OR (NEW.outcome_score IS NOT NULL AND (NEW.outcome_score < 0 OR NEW.outcome_score > 100))
       OR (NEW.information_completeness IS NOT NULL AND (NEW.information_completeness < 0 OR NEW.information_completeness > 100))
     BEGIN
       SELECT RAISE(ABORT, 'Decision quality scores must be within range 0-100 (clarity_score, confidence_level, consensus_level, outcome_score, information_completeness)');
     END`,

    // 16. Knowledge Gap Exploration Depth Validation
    `CREATE TRIGGER trg_knowledge_gap_exploration_validation
     BEFORE INSERT ON knowledge_gaps
     WHEN NEW.exploration_depth IS NOT NULL 
      AND (NEW.exploration_depth < 0 OR NEW.exploration_depth > 100)
     BEGIN
       SELECT RAISE(ABORT, 'Knowledge gap exploration_depth must be within range 0-100');
     END`,

    `CREATE TRIGGER trg_knowledge_gap_exploration_validation_update
     BEFORE UPDATE ON knowledge_gaps
     WHEN NEW.exploration_depth IS NOT NULL 
      AND (NEW.exploration_depth < 0 OR NEW.exploration_depth > 100)
     BEGIN
       SELECT RAISE(ABORT, 'Knowledge gap exploration_depth must be within range 0-100');
     END`,

    // 17. Topic Evolution Understanding Level Validation
    `CREATE TRIGGER trg_topic_evolution_understanding_validation
     BEFORE INSERT ON topic_evolution
     WHEN NEW.understanding_level IS NOT NULL 
      AND (NEW.understanding_level < 0 OR NEW.understanding_level > 100)
     BEGIN
       SELECT RAISE(ABORT, 'Topic evolution understanding_level must be within range 0-100');
     END`,

    `CREATE TRIGGER trg_topic_evolution_understanding_validation_update
     BEFORE UPDATE ON topic_evolution
     WHEN NEW.understanding_level IS NOT NULL 
      AND (NEW.understanding_level < 0 OR NEW.understanding_level > 100)
     BEGIN
       SELECT RAISE(ABORT, 'Topic evolution understanding_level must be within range 0-100');
     END`,

    // 18. Cross-Table Consistency: Message Conversation Relationship
    `CREATE TRIGGER trg_message_conversation_consistency
     BEFORE INSERT ON messages
     WHEN NEW.conversation_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM conversations WHERE id = NEW.conversation_id)
     BEGIN
       SELECT RAISE(ABORT, 'Referenced conversation_id does not exist in conversations table');
     END`,

    // 19. Cross-Table Consistency: Parent Message Relationship
    `CREATE TRIGGER trg_message_parent_consistency
     BEFORE INSERT ON messages
     WHEN NEW.parent_message_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM messages WHERE id = NEW.parent_message_id)
     BEGIN
       SELECT RAISE(ABORT, 'Referenced parent_message_id does not exist in messages table');
     END`,

    // 20. Productivity Pattern Count Consistency
    `CREATE TRIGGER trg_productivity_pattern_count_consistency
     BEFORE INSERT ON productivity_patterns
     WHEN NEW.total_conversations < 0 
      OR NEW.total_messages < 0
      OR NEW.sample_size < 0
      OR (NEW.total_decisions IS NOT NULL AND NEW.total_decisions < 0)
      OR (NEW.total_insights IS NOT NULL AND NEW.total_insights < 0)
     BEGIN
       SELECT RAISE(ABORT, 'Productivity pattern counts must be non-negative (total_conversations, total_messages, sample_size, total_decisions, total_insights)');
     END`,

    `CREATE TRIGGER trg_productivity_pattern_count_consistency_update
     BEFORE UPDATE ON productivity_patterns
     WHEN NEW.total_conversations < 0 
      OR NEW.total_messages < 0
      OR NEW.sample_size < 0
      OR (NEW.total_decisions IS NOT NULL AND NEW.total_decisions < 0)
      OR (NEW.total_insights IS NOT NULL AND NEW.total_insights < 0)
     BEGIN
       SELECT RAISE(ABORT, 'Productivity pattern counts must be non-negative (total_conversations, total_messages, sample_size, total_decisions, total_insights)');
     END`,

    // 21. Conversation Analytics Count Consistency
    `CREATE TRIGGER trg_conversation_analytics_count_consistency
     BEFORE INSERT ON conversation_analytics
     WHEN NEW.topic_count < 0 
      OR NEW.topic_transitions < 0
      OR (NEW.insight_count IS NOT NULL AND NEW.insight_count < 0)
      OR (NEW.breakthrough_count IS NOT NULL AND NEW.breakthrough_count < 0)
     BEGIN
       SELECT RAISE(ABORT, 'Conversation analytics counts must be non-negative (topic_count, topic_transitions, insight_count, breakthrough_count)');
     END`,

    `CREATE TRIGGER trg_conversation_analytics_count_consistency_update
     BEFORE UPDATE ON conversation_analytics
     WHEN NEW.topic_count < 0 
      OR NEW.topic_transitions < 0
      OR (NEW.insight_count IS NOT NULL AND NEW.insight_count < 0)
      OR (NEW.breakthrough_count IS NOT NULL AND NEW.breakthrough_count < 0)
     BEGIN
       SELECT RAISE(ABORT, 'Conversation analytics counts must be non-negative (topic_count, topic_transitions, insight_count, breakthrough_count)');
     END`,

    // 22. Decision Tracking Count Consistency
    `CREATE TRIGGER trg_decision_tracking_count_consistency
     BEFORE INSERT ON decision_tracking
     WHEN (NEW.reversal_count IS NOT NULL AND NEW.reversal_count < 0)
      OR (NEW.modification_count IS NOT NULL AND NEW.modification_count < 0)
      OR (NEW.stakeholder_count IS NOT NULL AND NEW.stakeholder_count < 0)
      OR (NEW.alternatives_considered IS NOT NULL AND NEW.alternatives_considered < 0)
     BEGIN
       SELECT RAISE(ABORT, 'Decision tracking counts must be non-negative (reversal_count, modification_count, stakeholder_count, alternatives_considered)');
     END`,

    `CREATE TRIGGER trg_decision_tracking_count_consistency_update
     BEFORE UPDATE ON decision_tracking
     WHEN (NEW.reversal_count IS NOT NULL AND NEW.reversal_count < 0)
      OR (NEW.modification_count IS NOT NULL AND NEW.modification_count < 0)
      OR (NEW.stakeholder_count IS NOT NULL AND NEW.stakeholder_count < 0)
      OR (NEW.alternatives_considered IS NOT NULL AND NEW.alternatives_considered < 0)
     BEGIN
       SELECT RAISE(ABORT, 'Decision tracking counts must be non-negative (reversal_count, modification_count, stakeholder_count, alternatives_considered)');
     END`,

    // 23. Create trigger performance monitoring table
    `CREATE TABLE trigger_performance_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      trigger_name TEXT NOT NULL,
      table_name TEXT NOT NULL,
      operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
      execution_time_ms REAL,
      error_message TEXT,
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )`,

    // 24. Create index for performance monitoring
    `CREATE INDEX idx_trigger_performance_log_time 
     ON trigger_performance_log(created_at DESC)`,

    `CREATE INDEX idx_trigger_performance_log_trigger 
     ON trigger_performance_log(trigger_name, table_name)`
  ],

  down: [
    // Drop performance monitoring
    'DROP INDEX IF EXISTS idx_trigger_performance_log_trigger',
    'DROP INDEX IF EXISTS idx_trigger_performance_log_time',
    'DROP TABLE IF EXISTS trigger_performance_log',

    // Drop all validation triggers
    'DROP TRIGGER IF EXISTS trg_decision_tracking_count_consistency_update',
    'DROP TRIGGER IF EXISTS trg_decision_tracking_count_consistency',
    'DROP TRIGGER IF EXISTS trg_conversation_analytics_count_consistency_update',
    'DROP TRIGGER IF EXISTS trg_conversation_analytics_count_consistency',
    'DROP TRIGGER IF EXISTS trg_productivity_pattern_count_consistency_update',
    'DROP TRIGGER IF EXISTS trg_productivity_pattern_count_consistency',
    'DROP TRIGGER IF EXISTS trg_message_parent_consistency',
    'DROP TRIGGER IF EXISTS trg_message_conversation_consistency',
    'DROP TRIGGER IF EXISTS trg_topic_evolution_understanding_validation_update',
    'DROP TRIGGER IF EXISTS trg_topic_evolution_understanding_validation',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_exploration_validation_update',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_exploration_validation',
    'DROP TRIGGER IF EXISTS trg_decision_quality_validation_update',
    'DROP TRIGGER IF EXISTS trg_decision_quality_validation',
    'DROP TRIGGER IF EXISTS trg_insight_score_validation_update',
    'DROP TRIGGER IF EXISTS trg_insight_score_validation',
    'DROP TRIGGER IF EXISTS trg_analytics_score_comprehensive_validation_update',
    'DROP TRIGGER IF EXISTS trg_analytics_score_comprehensive_validation',
    'DROP TRIGGER IF EXISTS trg_conversation_summary_message_relationship_update',
    'DROP TRIGGER IF EXISTS trg_conversation_summary_message_relationship',
    'DROP TRIGGER IF EXISTS trg_message_parent_circular_reference_update',
    'DROP TRIGGER IF EXISTS trg_message_parent_circular_reference',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_occurrence_timeline_update',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_occurrence_timeline',
    'DROP TRIGGER IF EXISTS trg_topic_evolution_timeline_update',
    'DROP TRIGGER IF EXISTS trg_topic_evolution_timeline',
    'DROP TRIGGER IF EXISTS trg_productivity_pattern_window_validation_update',
    'DROP TRIGGER IF EXISTS trg_productivity_pattern_window_validation',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_frequency_positive_update',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_frequency_positive',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_resolution_conversation_update',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_resolution_conversation',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_resolution_date_update',
    'DROP TRIGGER IF EXISTS trg_knowledge_gap_resolution_date',
    'DROP TRIGGER IF EXISTS trg_decision_outcome_sequence_update',
    'DROP TRIGGER IF EXISTS trg_decision_outcome_sequence',
    'DROP TRIGGER IF EXISTS trg_decision_implementation_sequence_update',
    'DROP TRIGGER IF EXISTS trg_decision_implementation_sequence',
    'DROP TRIGGER IF EXISTS trg_decision_options_sequence_update',
    'DROP TRIGGER IF EXISTS trg_decision_options_sequence',
    'DROP TRIGGER IF EXISTS trg_decision_temporal_sequence_update',
    'DROP TRIGGER IF EXISTS trg_decision_temporal_sequence'
  ]
};