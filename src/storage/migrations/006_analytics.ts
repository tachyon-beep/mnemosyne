/**
 * Migration 006: Analytics and Intelligence
 * 
 * Adds tables and indexes for Phase 5 - Advanced Analytics & Intelligence:
 * - Conversation flow analytics
 * - Productivity patterns tracking
 * - Knowledge gap detection
 * - Decision quality metrics
 */

import type { Database } from 'better-sqlite3';
import { Migration } from './Migration.js';

export class AnalyticsMigration extends Migration {
  getVersion(): number {
    return 6;
  }

  getName(): string {
    return 'analytics_and_intelligence';
  }

  up(db: Database): void {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // 1. Conversation Analytics Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_analytics (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        conversation_id TEXT NOT NULL,
        analyzed_at INTEGER NOT NULL,
        
        -- Flow metrics
        topic_count INTEGER NOT NULL DEFAULT 0,
        topic_transitions INTEGER NOT NULL DEFAULT 0,
        depth_score REAL NOT NULL DEFAULT 0 CHECK(depth_score >= 0 AND depth_score <= 100),
        circularity_index REAL NOT NULL DEFAULT 0 CHECK(circularity_index >= 0 AND circularity_index <= 1),
        
        -- Productivity metrics
        productivity_score REAL NOT NULL DEFAULT 0 CHECK(productivity_score >= 0 AND productivity_score <= 100),
        resolution_time INTEGER, -- milliseconds
        insight_count INTEGER DEFAULT 0,
        breakthrough_count INTEGER DEFAULT 0,
        
        -- Quality metrics
        question_quality_avg REAL DEFAULT 0,
        response_quality_avg REAL DEFAULT 0,
        engagement_score REAL DEFAULT 0,
        
        -- Metadata
        metadata TEXT, -- JSON with detailed metrics
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // 2. Productivity Patterns Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS productivity_patterns (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        
        -- Time window
        window_start INTEGER NOT NULL,
        window_end INTEGER NOT NULL,
        window_type TEXT NOT NULL CHECK(window_type IN ('hour', 'day', 'week', 'month')),
        
        -- Aggregate metrics
        total_conversations INTEGER NOT NULL DEFAULT 0,
        total_messages INTEGER NOT NULL DEFAULT 0,
        total_decisions INTEGER DEFAULT 0,
        total_insights INTEGER DEFAULT 0,
        
        -- Productivity scores
        avg_productivity_score REAL NOT NULL DEFAULT 0,
        peak_productivity_score REAL DEFAULT 0,
        min_productivity_score REAL DEFAULT 0,
        
        -- Patterns
        peak_hours TEXT, -- JSON array of peak hours
        effective_question_patterns TEXT, -- JSON with patterns and scores
        breakthrough_indicators TEXT, -- JSON with indicator patterns
        optimal_session_length INTEGER, -- minutes
        
        -- Metadata
        sample_size INTEGER NOT NULL DEFAULT 0,
        confidence_level REAL DEFAULT 0,
        
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )
    `);

    // 3. Knowledge Gaps Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_gaps (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        
        -- Gap identification
        gap_type TEXT NOT NULL CHECK(gap_type IN ('question', 'topic', 'skill', 'concept')),
        content TEXT NOT NULL,
        normalized_content TEXT NOT NULL, -- For clustering similar gaps
        
        -- Metrics
        frequency INTEGER NOT NULL DEFAULT 1,
        first_occurrence INTEGER NOT NULL,
        last_occurrence INTEGER NOT NULL,
        exploration_depth REAL DEFAULT 0 CHECK(exploration_depth >= 0 AND exploration_depth <= 100),
        
        -- Resolution tracking
        resolved BOOLEAN DEFAULT FALSE,
        resolution_conversation_id TEXT,
        resolution_date INTEGER,
        resolution_quality REAL DEFAULT 0,
        
        -- Learning metrics
        learning_curve_gradient REAL DEFAULT 0,
        estimated_time_to_mastery INTEGER, -- hours
        
        -- Related information
        related_entities TEXT, -- JSON array of related entities
        related_gaps TEXT, -- JSON array of related gap IDs
        suggested_actions TEXT, -- JSON with recommended actions
        suggested_resources TEXT, -- JSON with learning resources
        
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        
        FOREIGN KEY (resolution_conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
      )
    `);

    // 4. Decision Tracking Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS decision_tracking (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        
        -- Decision identification
        decision_summary TEXT NOT NULL,
        decision_type TEXT CHECK(decision_type IN ('strategic', 'tactical', 'operational', 'personal')),
        conversation_ids TEXT NOT NULL, -- JSON array of related conversation IDs
        
        -- Timeline tracking
        problem_identified_at INTEGER,
        options_considered_at INTEGER,
        decision_made_at INTEGER NOT NULL,
        implementation_started_at INTEGER,
        outcome_assessed_at INTEGER,
        
        -- Quality metrics
        clarity_score REAL DEFAULT 0 CHECK(clarity_score >= 0 AND clarity_score <= 100),
        confidence_level REAL DEFAULT 0 CHECK(confidence_level >= 0 AND confidence_level <= 100),
        consensus_level REAL DEFAULT 0 CHECK(consensus_level >= 0 AND consensus_level <= 100),
        
        -- Outcome tracking
        reversal_count INTEGER DEFAULT 0,
        modification_count INTEGER DEFAULT 0,
        outcome_score REAL CHECK(outcome_score >= 0 AND outcome_score <= 100),
        outcome_assessment TEXT, -- JSON with detailed assessment
        
        -- Decision factors
        information_completeness REAL DEFAULT 0 CHECK(information_completeness >= 0 AND information_completeness <= 100),
        stakeholder_count INTEGER DEFAULT 0,
        alternatives_considered INTEGER DEFAULT 0,
        risk_assessed BOOLEAN DEFAULT FALSE,
        
        -- Analysis
        success_factors TEXT, -- JSON array of contributing factors
        failure_factors TEXT, -- JSON array of detrimental factors
        lessons_learned TEXT, -- Text summary of learnings
        
        -- Metadata
        tags TEXT, -- JSON array of tags
        priority TEXT CHECK(priority IN ('critical', 'high', 'medium', 'low')),
        status TEXT CHECK(status IN ('pending', 'decided', 'implemented', 'assessed', 'reversed')),
        
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
      )
    `);

    // 5. Topic Evolution Table (for tracking topic development over time)
    db.exec(`
      CREATE TABLE IF NOT EXISTS topic_evolution (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        
        -- Topic identification
        topic TEXT NOT NULL,
        normalized_topic TEXT NOT NULL,
        
        -- Evolution metrics
        first_mentioned_at INTEGER NOT NULL,
        last_discussed_at INTEGER NOT NULL,
        total_mentions INTEGER DEFAULT 1,
        conversation_count INTEGER DEFAULT 1,
        
        -- Development tracking
        understanding_level REAL DEFAULT 0 CHECK(understanding_level >= 0 AND understanding_level <= 100),
        complexity_score REAL DEFAULT 0,
        branching_factor REAL DEFAULT 0, -- How many subtopics emerged
        
        -- Related topics
        parent_topic_id TEXT,
        child_topic_ids TEXT, -- JSON array
        related_topic_ids TEXT, -- JSON array
        
        -- Metadata
        tags TEXT, -- JSON array
        importance_score REAL DEFAULT 0,
        
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        
        FOREIGN KEY (parent_topic_id) REFERENCES topic_evolution(id) ON DELETE SET NULL
      )
    `);

    // 6. Insight Detection Table
    db.exec(`
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        
        -- Insight identification
        conversation_id TEXT NOT NULL,
        message_id TEXT,
        insight_type TEXT CHECK(insight_type IN ('breakthrough', 'connection', 'pattern', 'solution', 'realization')),
        
        -- Content
        insight_summary TEXT NOT NULL,
        trigger_pattern TEXT, -- What led to the insight
        
        -- Quality metrics
        significance_score REAL DEFAULT 0 CHECK(significance_score >= 0 AND significance_score <= 100),
        novelty_score REAL DEFAULT 0 CHECK(novelty_score >= 0 AND novelty_score <= 100),
        applicability_score REAL DEFAULT 0 CHECK(applicability_score >= 0 AND applicability_score <= 100),
        
        -- Impact tracking
        influenced_decisions TEXT, -- JSON array of decision IDs
        resolved_gaps TEXT, -- JSON array of gap IDs
        
        -- Metadata
        tags TEXT, -- JSON array
        validated BOOLEAN DEFAULT FALSE,
        
        created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
        
        FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    db.exec(`
      -- Conversation analytics indexes
      CREATE INDEX IF NOT EXISTS idx_conversation_analytics_conversation 
        ON conversation_analytics(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_conversation_analytics_productivity 
        ON conversation_analytics(productivity_score DESC);
      CREATE INDEX IF NOT EXISTS idx_conversation_analytics_analyzed 
        ON conversation_analytics(analyzed_at DESC);
      
      -- Productivity patterns indexes
      CREATE INDEX IF NOT EXISTS idx_productivity_patterns_window 
        ON productivity_patterns(window_start, window_end);
      CREATE INDEX IF NOT EXISTS idx_productivity_patterns_type 
        ON productivity_patterns(window_type);
      CREATE INDEX IF NOT EXISTS idx_productivity_patterns_score 
        ON productivity_patterns(avg_productivity_score DESC);
      
      -- Knowledge gaps indexes
      CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_type 
        ON knowledge_gaps(gap_type, resolved);
      CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_frequency 
        ON knowledge_gaps(frequency DESC);
      CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_normalized 
        ON knowledge_gaps(normalized_content);
      CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_resolution 
        ON knowledge_gaps(resolved, resolution_quality);
      
      -- Decision tracking indexes
      CREATE INDEX IF NOT EXISTS idx_decision_tracking_timeline 
        ON decision_tracking(decision_made_at DESC);
      CREATE INDEX IF NOT EXISTS idx_decision_tracking_quality 
        ON decision_tracking(outcome_score DESC) WHERE outcome_score IS NOT NULL;
      CREATE INDEX IF NOT EXISTS idx_decision_tracking_status 
        ON decision_tracking(status);
      CREATE INDEX IF NOT EXISTS idx_decision_tracking_type 
        ON decision_tracking(decision_type);
      
      -- Topic evolution indexes
      CREATE INDEX IF NOT EXISTS idx_topic_evolution_normalized 
        ON topic_evolution(normalized_topic);
      CREATE INDEX IF NOT EXISTS idx_topic_evolution_mentions 
        ON topic_evolution(total_mentions DESC);
      CREATE INDEX IF NOT EXISTS idx_topic_evolution_understanding 
        ON topic_evolution(understanding_level DESC);
      
      -- Insights indexes
      CREATE INDEX IF NOT EXISTS idx_insights_conversation 
        ON insights(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_insights_type 
        ON insights(insight_type);
      CREATE INDEX IF NOT EXISTS idx_insights_significance 
        ON insights(significance_score DESC);
    `);

    // Create views for common analytics queries
    db.exec(`
      -- Productivity dashboard view
      CREATE VIEW IF NOT EXISTS v_productivity_dashboard AS
      SELECT 
        pp.window_type,
        pp.window_start,
        pp.window_end,
        pp.avg_productivity_score,
        pp.total_conversations,
        pp.total_messages,
        pp.peak_hours,
        pp.optimal_session_length
      FROM productivity_patterns pp
      WHERE pp.window_end >= (unixepoch() * 1000) - (30 * 24 * 60 * 60 * 1000) -- Last 30 days
      ORDER BY pp.window_end DESC;
      
      -- Active knowledge gaps view
      CREATE VIEW IF NOT EXISTS v_active_knowledge_gaps AS
      SELECT 
        kg.gap_type,
        kg.content,
        kg.frequency,
        kg.exploration_depth,
        kg.last_occurrence,
        kg.suggested_actions
      FROM knowledge_gaps kg
      WHERE kg.resolved = FALSE
      ORDER BY kg.frequency DESC, kg.last_occurrence DESC;
      
      -- Recent decisions view
      CREATE VIEW IF NOT EXISTS v_recent_decisions AS
      SELECT 
        dt.id,
        dt.decision_summary,
        dt.decision_type,
        dt.decision_made_at,
        dt.confidence_level,
        dt.outcome_score,
        dt.status
      FROM decision_tracking dt
      ORDER BY dt.decision_made_at DESC
      LIMIT 20;
    `);
  }

  down(db: Database): void {
    // Drop views first
    db.exec(`
      DROP VIEW IF EXISTS v_recent_decisions;
      DROP VIEW IF EXISTS v_active_knowledge_gaps;
      DROP VIEW IF EXISTS v_productivity_dashboard;
    `);

    // Drop tables in reverse order due to foreign keys
    db.exec(`
      DROP TABLE IF EXISTS insights;
      DROP TABLE IF EXISTS topic_evolution;
      DROP TABLE IF EXISTS decision_tracking;
      DROP TABLE IF EXISTS knowledge_gaps;
      DROP TABLE IF EXISTS productivity_patterns;
      DROP TABLE IF EXISTS conversation_analytics;
    `);
  }
}

// Export default instance
export default new AnalyticsMigration();