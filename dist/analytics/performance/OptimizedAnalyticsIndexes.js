/**
 * Optimized Analytics Indexes
 *
 * Additional database indexes for improved analytics query performance:
 * - Composite indexes for multi-column queries
 * - Partial indexes for filtered queries
 * - Expression indexes for computed values
 * - Covering indexes to avoid table lookups
 * - Performance monitoring for index effectiveness
 */
export const optimizedAnalyticsIndexes = {
    version: 7,
    description: 'Add performance-optimized indexes for analytics queries',
    up: [
        // === CONVERSATION ANALYTICS OPTIMIZATIONS ===
        // Composite index for dashboard queries with time ranges
        `CREATE INDEX idx_conversation_analytics_dashboard_metrics 
     ON conversation_analytics(analyzed_at DESC, productivity_score DESC, depth_score DESC)`,
        // Partial index for high-productivity conversations
        `CREATE INDEX idx_conversation_analytics_high_productivity 
     ON conversation_analytics(conversation_id, analyzed_at DESC, metadata) 
     WHERE productivity_score > 75`,
        // Covering index for summary reports - using all columns instead of INCLUDE for compatibility
        `CREATE INDEX idx_conversation_analytics_summary_covering 
     ON conversation_analytics(analyzed_at DESC, productivity_score, depth_score, insight_count, breakthrough_count)`,
        // Index for trend analysis over time
        `CREATE INDEX idx_conversation_analytics_time_series 
     ON conversation_analytics(analyzed_at, productivity_score, depth_score)`,
        // === PRODUCTIVITY PATTERNS OPTIMIZATIONS ===
        // Composite index for time window queries
        `CREATE INDEX idx_productivity_patterns_time_window_metrics 
     ON productivity_patterns(window_type, window_start DESC, avg_productivity_score DESC)`,
        // Partial index for recent high-performance periods
        `CREATE INDEX idx_productivity_patterns_recent_peaks 
     ON productivity_patterns(window_end DESC, peak_productivity_score DESC) 
     WHERE window_end >= (unixepoch() * 1000) - (7 * 24 * 60 * 60 * 1000)`,
        // Index for confidence-based filtering
        `CREATE INDEX idx_productivity_patterns_confidence_filter 
     ON productivity_patterns(confidence_level DESC, window_type, avg_productivity_score DESC) 
     WHERE confidence_level > 0.7`,
        // Expression index for productivity trend calculation
        `CREATE INDEX idx_productivity_patterns_trend_calc 
     ON productivity_patterns(window_type, window_start, 
       peak_productivity_score, avg_productivity_score)`,
        // === KNOWLEDGE GAPS OPTIMIZATIONS ===
        // Multi-column index for active gap analysis
        `CREATE INDEX idx_knowledge_gaps_active_analysis 
     ON knowledge_gaps(resolved, gap_type, frequency DESC, last_occurrence DESC)`,
        // Partial index for critical unresolved gaps
        `CREATE INDEX idx_knowledge_gaps_critical_unresolved 
     ON knowledge_gaps(frequency DESC, exploration_depth ASC, last_occurrence DESC) 
     WHERE resolved = 0 AND frequency >= 3`,
        // Text search index for content clustering
        `CREATE INDEX idx_knowledge_gaps_content_similarity 
     ON knowledge_gaps(normalized_content, gap_type) 
     WHERE resolved = 0`,
        // Index for learning curve analysis
        `CREATE INDEX idx_knowledge_gaps_learning_progression 
     ON knowledge_gaps(exploration_depth, learning_curve_gradient, 
       estimated_time_to_mastery)`,
        // Composite index for related gaps clustering
        `CREATE INDEX idx_knowledge_gaps_related_clustering 
     ON knowledge_gaps(normalized_content, related_gaps, related_entities)`,
        // === DECISION TRACKING OPTIMIZATIONS ===
        // Timeline analysis index
        `CREATE INDEX idx_decision_tracking_timeline_analysis 
     ON decision_tracking(decision_made_at DESC, decision_type, 
       outcome_assessed_at) 
     WHERE outcome_assessed_at IS NOT NULL`,
        // Quality metrics composite index
        `CREATE INDEX idx_decision_tracking_quality_composite 
     ON decision_tracking(clarity_score DESC, confidence_level DESC, 
       information_completeness DESC, outcome_score DESC)`,
        // Partial index for successful decisions
        `CREATE INDEX idx_decision_tracking_successful_patterns 
     ON decision_tracking(decision_type, alternatives_considered, 
       information_completeness, success_factors) 
     WHERE outcome_score > 70`,
        // Index for reversal and modification analysis
        `CREATE INDEX idx_decision_tracking_change_analysis 
     ON decision_tracking(reversal_count, modification_count, 
       decision_made_at DESC, decision_type)`,
        // Expression index for decision complexity
        `CREATE INDEX idx_decision_tracking_complexity_calc 
     ON decision_tracking(decision_type, 
       (alternatives_considered + stakeholder_count + 
        CASE WHEN risk_assessed THEN 2 ELSE 0 END))`,
        // === TOPIC EVOLUTION OPTIMIZATIONS ===
        // Learning progression index
        `CREATE INDEX idx_topic_evolution_learning_progression 
     ON topic_evolution(normalized_topic, understanding_level DESC, 
       total_mentions DESC, last_discussed_at DESC)`,
        // Partial index for recently active topics
        `CREATE INDEX idx_topic_evolution_recent_activity 
     ON topic_evolution(last_discussed_at DESC, understanding_level, 
       branching_factor) 
     WHERE last_discussed_at >= (unixepoch() * 1000) - (30 * 24 * 60 * 60 * 1000)`,
        // Hierarchical relationships index
        `CREATE INDEX idx_topic_evolution_hierarchy_navigation 
     ON topic_evolution(parent_topic_id, importance_score DESC, 
       understanding_level DESC) 
     WHERE parent_topic_id IS NOT NULL`,
        // Expression index for topic momentum
        `CREATE INDEX idx_topic_evolution_momentum_calc 
     ON topic_evolution(normalized_topic, 
       total_mentions, understanding_level)`,
        // === INSIGHTS OPTIMIZATIONS ===
        // High-value insights index
        `CREATE INDEX idx_insights_high_value 
     ON insights(significance_score DESC, novelty_score DESC, 
       applicability_score DESC, created_at DESC) 
     WHERE validated = TRUE`,
        // Conversation-based insights clustering
        `CREATE INDEX idx_insights_conversation_clustering 
     ON insights(conversation_id, insight_type, created_at DESC, 
       significance_score DESC)`,
        // Impact tracking index
        `CREATE INDEX idx_insights_impact_tracking 
     ON insights(influenced_decisions, resolved_gaps, 
       significance_score DESC) 
     WHERE influenced_decisions IS NOT NULL OR resolved_gaps IS NOT NULL`,
        // === CROSS-TABLE ANALYTICAL INDEXES ===
        // Performance correlation index (conversations + analytics)
        `CREATE INDEX idx_conversations_analytics_correlation 
     ON conversations(created_at, id)`,
        // Message count optimization for analytics
        `CREATE INDEX idx_messages_analytics_optimization 
     ON messages(conversation_id, created_at, role)`,
        // === MATERIALIZED VIEWS FOR COMMON QUERIES ===
        // Recent analytics summary view
        `CREATE VIEW v_recent_analytics_summary AS
     SELECT 
       ca.conversation_id,
       c.title,
       ca.productivity_score,
       ca.depth_score,
       ca.insight_count,
       ca.analyzed_at,
       COUNT(m.id) as message_count,
       (ca.analyzed_at - c.created_at) / (1000 * 60 * 60) as analysis_delay_hours
     FROM conversation_analytics ca
     JOIN conversations c ON ca.conversation_id = c.id
     LEFT JOIN messages m ON c.id = m.conversation_id
     WHERE ca.analyzed_at >= (unixepoch() * 1000) - (7 * 24 * 60 * 60 * 1000)
     GROUP BY ca.conversation_id, c.title, ca.productivity_score, 
              ca.depth_score, ca.insight_count, ca.analyzed_at, c.created_at
     ORDER BY ca.analyzed_at DESC`,
        // Knowledge gap urgency matrix view
        `CREATE VIEW v_knowledge_gap_urgency_matrix AS
     SELECT 
       kg.gap_type,
       kg.normalized_content,
       kg.frequency,
       kg.exploration_depth,
       CASE 
         WHEN kg.frequency >= 5 AND kg.exploration_depth < 30 THEN 'critical'
         WHEN kg.frequency >= 3 AND kg.exploration_depth < 50 THEN 'high'
         WHEN kg.frequency >= 2 OR kg.exploration_depth < 40 THEN 'medium'
         ELSE 'low'
       END as urgency_level,
       kg.last_occurrence,
       (unixepoch() * 1000) - kg.last_occurrence as days_since_last
     FROM knowledge_gaps kg
     WHERE kg.resolved = FALSE
     ORDER BY 
       CASE urgency_level 
         WHEN 'critical' THEN 1 
         WHEN 'high' THEN 2 
         WHEN 'medium' THEN 3 
         ELSE 4 
       END,
       kg.frequency DESC`,
        // Productivity trend analysis view - simplified without CTE for SQLite compatibility
        `CREATE VIEW v_productivity_trend_analysis AS
     SELECT 
       pp.window_type,
       pp.window_start,
       pp.window_end,
       pp.avg_productivity_score,
       pp.peak_productivity_score,
       pp.confidence_level,
       LAG(pp.avg_productivity_score) OVER (PARTITION BY pp.window_type ORDER BY pp.window_start) as prev_avg_score,
       pp.avg_productivity_score - LAG(pp.avg_productivity_score) OVER (PARTITION BY pp.window_type ORDER BY pp.window_start) as score_change,
       CASE 
         WHEN pp.avg_productivity_score > LAG(pp.avg_productivity_score) OVER (PARTITION BY pp.window_type ORDER BY pp.window_start) THEN 'improving'
         WHEN pp.avg_productivity_score < LAG(pp.avg_productivity_score) OVER (PARTITION BY pp.window_type ORDER BY pp.window_start) THEN 'declining'
         ELSE 'stable'
       END as trend_direction
     FROM productivity_patterns pp
     WHERE pp.confidence_level > 0.5
     ORDER BY pp.window_type, pp.window_start DESC`,
        // Decision effectiveness overview view
        `CREATE VIEW v_decision_effectiveness_overview AS
     SELECT 
       dt.decision_type,
       COUNT(dt.id) as total_decisions,
       AVG(dt.clarity_score) as avg_clarity,
       AVG(dt.confidence_level) as avg_confidence,
       AVG(dt.information_completeness) as avg_completeness,
       AVG(dt.outcome_score) as avg_outcome,
       COUNT(CASE WHEN dt.outcome_score > 70 THEN 1 END) * 100.0 / COUNT(dt.id) as success_rate,
       AVG(dt.alternatives_considered) as avg_alternatives,
       COUNT(CASE WHEN dt.reversal_count > 0 THEN 1 END) * 100.0 / COUNT(dt.id) as reversal_rate
     FROM decision_tracking dt
     WHERE dt.outcome_assessed_at IS NOT NULL
     GROUP BY dt.decision_type
     ORDER BY avg_outcome DESC, success_rate DESC`
    ],
    down: [
        // Drop views first
        'DROP VIEW IF EXISTS v_decision_effectiveness_overview',
        'DROP VIEW IF EXISTS v_productivity_trend_analysis',
        'DROP VIEW IF EXISTS v_knowledge_gap_urgency_matrix',
        'DROP VIEW IF EXISTS v_recent_analytics_summary',
        // Drop indexes in reverse order
        'DROP INDEX IF EXISTS idx_messages_analytics_optimization',
        'DROP INDEX IF EXISTS idx_conversations_analytics_correlation',
        'DROP INDEX IF EXISTS idx_insights_impact_tracking',
        'DROP INDEX IF EXISTS idx_insights_conversation_clustering',
        'DROP INDEX IF EXISTS idx_insights_high_value',
        'DROP INDEX IF EXISTS idx_topic_evolution_momentum_calc',
        'DROP INDEX IF EXISTS idx_topic_evolution_hierarchy_navigation',
        'DROP INDEX IF EXISTS idx_topic_evolution_recent_activity',
        'DROP INDEX IF EXISTS idx_topic_evolution_learning_progression',
        'DROP INDEX IF EXISTS idx_decision_tracking_complexity_calc',
        'DROP INDEX IF EXISTS idx_decision_tracking_change_analysis',
        'DROP INDEX IF EXISTS idx_decision_tracking_successful_patterns',
        'DROP INDEX IF EXISTS idx_decision_tracking_quality_composite',
        'DROP INDEX IF EXISTS idx_decision_tracking_timeline_analysis',
        'DROP INDEX IF EXISTS idx_knowledge_gaps_related_clustering',
        'DROP INDEX IF EXISTS idx_knowledge_gaps_learning_progression',
        'DROP INDEX IF EXISTS idx_knowledge_gaps_content_similarity',
        'DROP INDEX IF EXISTS idx_knowledge_gaps_critical_unresolved',
        'DROP INDEX IF EXISTS idx_knowledge_gaps_active_analysis',
        'DROP INDEX IF EXISTS idx_productivity_patterns_trend_calc',
        'DROP INDEX IF EXISTS idx_productivity_patterns_confidence_filter',
        'DROP INDEX IF EXISTS idx_productivity_patterns_recent_peaks',
        'DROP INDEX IF EXISTS idx_productivity_patterns_time_window_metrics',
        'DROP INDEX IF EXISTS idx_conversation_analytics_time_series',
        'DROP INDEX IF EXISTS idx_conversation_analytics_summary_covering',
        'DROP INDEX IF EXISTS idx_conversation_analytics_high_productivity',
        'DROP INDEX IF EXISTS idx_conversation_analytics_dashboard_metrics'
    ]
};
//# sourceMappingURL=OptimizedAnalyticsIndexes.js.map