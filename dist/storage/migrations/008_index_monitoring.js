/**
 * Migration 008: Index Usage Monitoring and Performance Tracking
 *
 * Adds comprehensive index monitoring and performance tracking tables:
 * - Index usage statistics and effectiveness tracking
 * - Query plan analysis and performance history
 * - Index optimization logging and audit trail
 * - Performance alerts and notification system
 * - Automated maintenance scheduling
 */
export const indexMonitoringMigration = {
    version: 8,
    description: 'Add comprehensive index usage monitoring and performance tracking system',
    up: [
        // 1. Index Usage Monitoring Table - Track real index usage and effectiveness
        `CREATE TABLE index_usage_monitoring (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      index_name TEXT NOT NULL,
      table_name TEXT NOT NULL,
      usage_count INTEGER DEFAULT 0,
      hit_count INTEGER DEFAULT 0,
      miss_count INTEGER DEFAULT 0,
      last_used INTEGER,
      avg_query_time REAL DEFAULT 0,
      effectiveness_score REAL DEFAULT 0 CHECK(effectiveness_score >= 0 AND effectiveness_score <= 1),
      query_types TEXT, -- JSON array of query types using this index
      size_bytes INTEGER DEFAULT 0,
      maintenance_cost REAL DEFAULT 0,
      health_score REAL DEFAULT 100 CHECK(health_score >= 0 AND health_score <= 100),
      
      -- Metadata
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      
      -- Constraints
      UNIQUE(index_name)
    )`,
        // 2. Query Plan Analysis Table - Store EXPLAIN QUERY PLAN results
        `CREATE TABLE query_plan_analysis (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      query_id TEXT NOT NULL,
      sql_pattern TEXT NOT NULL, -- Normalized SQL pattern
      execution_time REAL NOT NULL,
      result_count INTEGER DEFAULT 0,
      
      -- Plan analysis results
      indexes_used TEXT, -- JSON array of indexes used
      table_scans TEXT, -- JSON array of tables scanned
      temp_operations TEXT, -- JSON array of temp operations
      estimated_cost REAL DEFAULT 0,
      
      -- Optimization insights
      recommendations TEXT, -- JSON array of optimization recommendations
      performance_issues TEXT, -- JSON array of detected issues
      optimization_potential REAL DEFAULT 0,
      
      -- Context
      peak_memory_usage INTEGER DEFAULT 0,
      cache_hit BOOLEAN DEFAULT FALSE,
      parallel_execution BOOLEAN DEFAULT FALSE,
      
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )`,
        // 3. Index Optimization Log - Track optimization actions and results
        `CREATE TABLE index_optimization_log (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      index_name TEXT NOT NULL,
      table_name TEXT NOT NULL,
      action_type TEXT NOT NULL CHECK(action_type IN ('create', 'drop', 'rebuild', 'modify', 'analyze')),
      
      -- Action details
      sql_executed TEXT,
      reason TEXT NOT NULL,
      expected_impact TEXT CHECK(expected_impact IN ('high', 'medium', 'low')),
      risk_level TEXT CHECK(risk_level IN ('low', 'medium', 'high')),
      
      -- Execution results
      status TEXT NOT NULL CHECK(status IN ('planned', 'executing', 'completed', 'failed', 'rolled_back')),
      execution_time REAL,
      error_message TEXT,
      rollback_sql TEXT,
      
      -- Impact measurement
      before_metrics TEXT, -- JSON with metrics before optimization
      after_metrics TEXT, -- JSON with metrics after optimization
      actual_impact REAL, -- Measured performance improvement
      
      -- Automation context
      automated BOOLEAN DEFAULT FALSE,
      approved_by TEXT,
      automation_confidence REAL DEFAULT 0,
      
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )`,
        // 4. Performance Alerts Table - Track system alerts and responses
        `CREATE TABLE performance_alerts (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      alert_type TEXT NOT NULL CHECK(alert_type IN ('slow_query', 'unused_index', 'index_degradation', 'write_impact', 'storage_growth', 'memory_pressure')),
      severity TEXT NOT NULL CHECK(severity IN ('critical', 'high', 'medium', 'low')),
      
      -- Alert content
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      details TEXT, -- JSON with detailed alert information
      affected_components TEXT, -- JSON array of affected indexes/tables
      
      -- Context and metrics
      trigger_threshold TEXT,
      current_value REAL,
      historical_baseline REAL,
      trend_direction TEXT CHECK(trend_direction IN ('improving', 'stable', 'degrading')),
      
      -- Response tracking
      resolved BOOLEAN DEFAULT FALSE,
      resolution_time INTEGER,
      resolution_action TEXT,
      resolved_by TEXT,
      auto_resolved BOOLEAN DEFAULT FALSE,
      
      -- Escalation
      escalated BOOLEAN DEFAULT FALSE,
      escalation_level INTEGER DEFAULT 0,
      escalated_to TEXT,
      escalated_at INTEGER,
      
      -- Notification
      notification_sent BOOLEAN DEFAULT FALSE,
      notification_channels TEXT, -- JSON array
      acknowledgment_required BOOLEAN DEFAULT FALSE,
      acknowledged_by TEXT,
      acknowledged_at INTEGER,
      
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )`,
        // 5. Performance Metrics History - Time-series performance data
        `CREATE TABLE performance_metrics_history (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      metric_type TEXT NOT NULL CHECK(metric_type IN ('query_performance', 'index_usage', 'system_load', 'storage_usage', 'cache_performance')),
      
      -- Metric identification
      target_name TEXT NOT NULL, -- index name, table name, or 'system'
      metric_name TEXT NOT NULL,
      
      -- Values
      metric_value REAL NOT NULL,
      metric_unit TEXT,
      baseline_value REAL,
      threshold_value REAL,
      
      -- Context
      sample_size INTEGER DEFAULT 1,
      confidence_level REAL DEFAULT 1.0,
      measurement_duration INTEGER DEFAULT 0, -- ms
      
      -- Aggregation info
      aggregation_type TEXT CHECK(aggregation_type IN ('instant', 'avg', 'min', 'max', 'sum', 'count')),
      aggregation_window INTEGER DEFAULT 0, -- seconds
      
      recorded_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )`,
        // 6. Automated Maintenance Schedule - Track scheduled maintenance tasks
        `CREATE TABLE automated_maintenance_schedule (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      task_type TEXT NOT NULL CHECK(task_type IN ('reindex', 'analyze', 'vacuum', 'optimize', 'cleanup')),
      target_name TEXT NOT NULL, -- index name, table name, or 'database'
      
      -- Scheduling
      scheduled_at INTEGER NOT NULL,
      recurrence_pattern TEXT, -- cron-like pattern for recurring tasks
      estimated_duration INTEGER NOT NULL, -- milliseconds
      maintenance_window TEXT, -- JSON with allowed execution windows
      
      -- Priority and constraints
      priority TEXT NOT NULL CHECK(priority IN ('critical', 'high', 'medium', 'low')),
      prerequisites TEXT, -- JSON array of prerequisite conditions
      max_concurrent INTEGER DEFAULT 1,
      resource_requirements TEXT, -- JSON with resource needs
      
      -- Execution tracking
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'running', 'completed', 'failed', 'cancelled', 'deferred')),
      started_at INTEGER,
      completed_at INTEGER,
      actual_duration INTEGER,
      
      -- Results
      success_metrics TEXT, -- JSON with success indicators
      failure_reason TEXT,
      rollback_performed BOOLEAN DEFAULT FALSE,
      next_scheduled_at INTEGER,
      
      -- Automation
      auto_approved BOOLEAN DEFAULT FALSE,
      approval_required BOOLEAN DEFAULT TRUE,
      approved_by TEXT,
      approved_at INTEGER,
      automation_rules_applied TEXT, -- JSON array of rules used
      
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
    )`,
        // 7. System Configuration - Store monitoring and optimization settings
        `CREATE TABLE performance_configuration (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      config_category TEXT NOT NULL CHECK(config_category IN ('monitoring', 'optimization', 'alerts', 'maintenance')),
      config_key TEXT NOT NULL,
      config_value TEXT NOT NULL,
      value_type TEXT NOT NULL CHECK(value_type IN ('string', 'number', 'boolean', 'json')),
      
      -- Validation and constraints
      validation_rules TEXT, -- JSON with validation rules
      default_value TEXT,
      
      -- Metadata
      description TEXT,
      last_modified_by TEXT,
      requires_restart BOOLEAN DEFAULT FALSE,
      
      created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
      
      -- Constraints
      UNIQUE(config_category, config_key)
    )`,
        // Create indexes for performance_metrics_history table
        `CREATE INDEX idx_metrics_history_type_target 
     ON performance_metrics_history(metric_type, target_name, recorded_at DESC)`,
        `CREATE INDEX idx_metrics_history_time 
     ON performance_metrics_history(recorded_at DESC)`,
        // Create optimized indexes for monitoring queries
        // Index usage monitoring indexes
        `CREATE INDEX idx_index_usage_table_health 
     ON index_usage_monitoring(table_name, health_score ASC, usage_count DESC)`,
        `CREATE INDEX idx_index_usage_effectiveness_usage 
     ON index_usage_monitoring(effectiveness_score DESC, usage_count DESC)`,
        `CREATE INDEX idx_index_usage_last_used 
     ON index_usage_monitoring(last_used DESC) 
     WHERE last_used IS NOT NULL`,
        // Query plan analysis indexes
        `CREATE INDEX idx_query_plan_pattern_time 
     ON query_plan_analysis(sql_pattern, created_at DESC)`,
        `CREATE INDEX idx_query_plan_slow_queries 
     ON query_plan_analysis(execution_time DESC, created_at DESC) 
     WHERE execution_time > 1000`,
        `CREATE INDEX idx_query_plan_optimization_potential 
     ON query_plan_analysis(optimization_potential DESC, execution_time DESC)`,
        // Performance alerts indexes
        `CREATE INDEX idx_performance_alerts_severity_unresolved 
     ON performance_alerts(severity, created_at DESC) 
     WHERE resolved = FALSE`,
        `CREATE INDEX idx_performance_alerts_type_status 
     ON performance_alerts(alert_type, severity, created_at DESC)`,
        `CREATE INDEX idx_performance_alerts_escalation 
     ON performance_alerts(escalated, escalation_level, created_at DESC) 
     WHERE escalated = TRUE`,
        // Optimization log indexes
        `CREATE INDEX idx_optimization_log_table_action 
     ON index_optimization_log(table_name, action_type, status, created_at DESC)`,
        `CREATE INDEX idx_optimization_log_automated_success 
     ON index_optimization_log(automated, status, actual_impact DESC) 
     WHERE automated = TRUE`,
        // Maintenance schedule indexes
        `CREATE INDEX idx_maintenance_schedule_status_time 
     ON automated_maintenance_schedule(status, scheduled_at ASC)`,
        `CREATE INDEX idx_maintenance_schedule_priority_target 
     ON automated_maintenance_schedule(priority, target_name, scheduled_at ASC) 
     WHERE status IN ('scheduled', 'running')`,
        // Create views for common monitoring queries
        // View: Current index health overview
        `CREATE VIEW v_index_health_overview AS
     SELECT 
       ium.index_name,
       ium.table_name,
       ium.health_score,
       ium.effectiveness_score,
       ium.usage_count,
       ium.last_used,
       CASE 
         WHEN ium.health_score >= 80 THEN 'excellent'
         WHEN ium.health_score >= 60 THEN 'good'
         WHEN ium.health_score >= 40 THEN 'fair'
         WHEN ium.health_score >= 20 THEN 'poor'
         ELSE 'critical'
       END as health_status,
       CASE 
         WHEN ium.last_used IS NULL OR ium.last_used < (unixepoch() * 1000) - (30 * 24 * 60 * 60 * 1000) THEN 'unused'
         WHEN ium.last_used > (unixepoch() * 1000) - (24 * 60 * 60 * 1000) THEN 'active'
         ELSE 'occasional'
       END as usage_status
     FROM index_usage_monitoring ium
     ORDER BY ium.health_score ASC, ium.usage_count DESC`,
        // View: Active performance issues
        `CREATE VIEW v_active_performance_issues AS
     SELECT 
       pa.id,
       pa.alert_type,
       pa.severity,
       pa.title,
       pa.message,
       pa.created_at,
       pa.escalated,
       pa.escalation_level,
       (unixepoch() * 1000) - pa.created_at as age_ms,
       CASE 
         WHEN pa.severity = 'critical' THEN 1
         WHEN pa.severity = 'high' THEN 2
         WHEN pa.severity = 'medium' THEN 3
         ELSE 4
       END as priority_order
     FROM performance_alerts pa
     WHERE pa.resolved = FALSE
     ORDER BY priority_order ASC, pa.created_at DESC`,
        // View: Optimization opportunities
        `CREATE VIEW v_optimization_opportunities AS
     SELECT 
       qpa.sql_pattern,
       COUNT(*) as frequency,
       AVG(qpa.execution_time) as avg_execution_time,
       MAX(qpa.execution_time) as max_execution_time,
       AVG(qpa.optimization_potential) as avg_optimization_potential,
       GROUP_CONCAT(DISTINCT json_each.value) as table_scans
     FROM query_plan_analysis qpa,
          json_each(COALESCE(qpa.table_scans, '[]'))
     WHERE qpa.optimization_potential > 0.3
       AND qpa.created_at > (unixepoch() * 1000) - (7 * 24 * 60 * 60 * 1000)
     GROUP BY qpa.sql_pattern
     HAVING frequency > 5 OR avg_execution_time > 500
     ORDER BY avg_optimization_potential DESC, frequency DESC`,
        // View: Maintenance task summary
        `CREATE VIEW v_maintenance_task_summary AS
     SELECT 
       ams.task_type,
       ams.priority,
       COUNT(*) as total_tasks,
       COUNT(CASE WHEN ams.status = 'scheduled' THEN 1 END) as scheduled_tasks,
       COUNT(CASE WHEN ams.status = 'running' THEN 1 END) as running_tasks,
       COUNT(CASE WHEN ams.status = 'completed' THEN 1 END) as completed_tasks,
       COUNT(CASE WHEN ams.status = 'failed' THEN 1 END) as failed_tasks,
       MIN(CASE WHEN ams.status = 'scheduled' THEN ams.scheduled_at END) as next_scheduled,
       AVG(CASE WHEN ams.status = 'completed' THEN ams.actual_duration END) as avg_duration
     FROM automated_maintenance_schedule ams
     WHERE ams.created_at > (unixepoch() * 1000) - (30 * 24 * 60 * 60 * 1000)
     GROUP BY ams.task_type, ams.priority
     ORDER BY ams.priority, ams.task_type`,
        // Initialize default configuration
        `INSERT INTO performance_configuration 
     (config_category, config_key, config_value, value_type, description) VALUES
     ('monitoring', 'enabled', 'true', 'boolean', 'Enable performance monitoring'),
     ('monitoring', 'interval_minutes', '15', 'number', 'Monitoring check interval in minutes'),
     ('monitoring', 'retention_days', '30', 'number', 'Days to retain monitoring data'),
     ('optimization', 'auto_optimize_enabled', 'false', 'boolean', 'Enable automated optimizations'),
     ('optimization', 'auto_drop_unused_indexes', 'false', 'boolean', 'Automatically drop unused indexes'),
     ('optimization', 'max_concurrent_optimizations', '3', 'number', 'Maximum concurrent optimization tasks'),
     ('alerts', 'email_notifications', 'false', 'boolean', 'Send email notifications for alerts'),
     ('alerts', 'critical_alert_threshold', '3', 'number', 'Number of critical alerts before escalation'),
     ('maintenance', 'maintenance_window_hours', '[2,3,4]', 'json', 'Allowed maintenance hours (24h format)')`
    ],
    down: [
        // Drop views first
        'DROP VIEW IF EXISTS v_maintenance_task_summary',
        'DROP VIEW IF EXISTS v_optimization_opportunities',
        'DROP VIEW IF EXISTS v_active_performance_issues',
        'DROP VIEW IF EXISTS v_index_health_overview',
        // Drop indexes
        'DROP INDEX IF EXISTS idx_metrics_history_time',
        'DROP INDEX IF EXISTS idx_metrics_history_type_target',
        'DROP INDEX IF EXISTS idx_maintenance_schedule_priority_target',
        'DROP INDEX IF EXISTS idx_maintenance_schedule_status_time',
        'DROP INDEX IF EXISTS idx_optimization_log_automated_success',
        'DROP INDEX IF EXISTS idx_optimization_log_table_action',
        'DROP INDEX IF EXISTS idx_performance_alerts_escalation',
        'DROP INDEX IF EXISTS idx_performance_alerts_type_status',
        'DROP INDEX IF EXISTS idx_performance_alerts_severity_unresolved',
        'DROP INDEX IF EXISTS idx_query_plan_optimization_potential',
        'DROP INDEX IF EXISTS idx_query_plan_slow_queries',
        'DROP INDEX IF EXISTS idx_query_plan_pattern_time',
        'DROP INDEX IF EXISTS idx_index_usage_last_used',
        'DROP INDEX IF EXISTS idx_index_usage_effectiveness_usage',
        'DROP INDEX IF EXISTS idx_index_usage_table_health',
        // Drop tables in reverse dependency order
        'DROP TABLE IF EXISTS performance_configuration',
        'DROP TABLE IF EXISTS automated_maintenance_schedule',
        'DROP TABLE IF EXISTS performance_metrics_history',
        'DROP TABLE IF EXISTS performance_alerts',
        'DROP TABLE IF EXISTS index_optimization_log',
        'DROP TABLE IF EXISTS query_plan_analysis',
        'DROP TABLE IF EXISTS index_usage_monitoring'
    ]
};
//# sourceMappingURL=008_index_monitoring.js.map