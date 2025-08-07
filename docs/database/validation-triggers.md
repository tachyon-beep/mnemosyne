# Database Validation Triggers

## Overview

The MCP Persistence System implements comprehensive database validation triggers to ensure data integrity and consistency across all analytics and tracking tables. These triggers prevent invalid data states that could compromise the reliability of insights and analytics.

## Implemented Validations

### 1. Temporal Sequence Validation

#### Decision Tracking Timeline
- **Problem → Decision**: `problem_identified_at` must be ≤ `decision_made_at`
- **Options → Decision**: `options_considered_at` must be ≤ `decision_made_at`  
- **Decision → Implementation**: `implementation_started_at` must be ≥ `decision_made_at`
- **Decision → Assessment**: `outcome_assessed_at` must be ≥ `decision_made_at`

**Triggers:**
- `trg_decision_temporal_sequence`
- `trg_decision_options_sequence`
- `trg_decision_implementation_sequence`
- `trg_decision_outcome_sequence`

#### Knowledge Gap Timeline
- **First → Last Occurrence**: `first_occurrence` must be ≤ `last_occurrence`

**Trigger:** `trg_knowledge_gap_occurrence_timeline`

#### Topic Evolution Timeline
- **First → Last Discussion**: `first_mentioned_at` must be ≤ `last_discussed_at`

**Trigger:** `trg_topic_evolution_timeline`

### 2. Resolution Validation

#### Knowledge Gap Resolution Requirements
When a knowledge gap is marked as `resolved = TRUE`:
- `resolution_date` must be provided
- `resolution_conversation_id` must be provided

**Triggers:**
- `trg_knowledge_gap_resolution_date`
- `trg_knowledge_gap_resolution_conversation`

### 3. Data Quality Validation

#### Positive Value Constraints
- Knowledge gap `frequency` must be > 0
- All count fields must be ≥ 0 (conversations, messages, insights, etc.)

**Triggers:**
- `trg_knowledge_gap_frequency_positive`
- `trg_productivity_pattern_count_consistency`
- `trg_conversation_analytics_count_consistency`
- `trg_decision_tracking_count_consistency`

#### Time Window Validation
- Productivity patterns: `window_end` must be > `window_start`

**Trigger:** `trg_productivity_pattern_window_validation`

### 4. Score Range Validation

#### Analytics Scores (0-100)
- `depth_score`, `productivity_score`: 0-100
- `question_quality_avg`, `response_quality_avg`: 0-100
- `engagement_score`: 0-100

#### Special Range Validations
- `circularity_index`: 0-1
- All insight scores: 0-100
- All decision quality scores: 0-100

**Triggers:**
- `trg_analytics_score_comprehensive_validation`
- `trg_insight_score_validation`
- `trg_decision_quality_validation`

### 5. Referential Integrity

#### Cross-Table Consistency
- Messages must reference existing conversations
- Parent messages must exist before being referenced
- Circular parent references are prevented

**Triggers:**
- `trg_message_conversation_consistency`
- `trg_message_parent_consistency`
- `trg_message_parent_circular_reference`

#### Conversation Summary Validation
- Multi-message summaries cannot have identical start/end messages

**Trigger:** `trg_conversation_summary_message_relationship`

## Performance Monitoring

### Trigger Performance Logging

All trigger executions are logged to the `trigger_performance_log` table:

```sql
CREATE TABLE trigger_performance_log (
    id TEXT PRIMARY KEY,
    trigger_name TEXT NOT NULL,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    execution_time_ms REAL,
    error_message TEXT,
    created_at INTEGER NOT NULL
);
```

### Monitoring Tools

#### CLI Tool Usage
```bash
# Generate performance report
npm run validate-triggers:report

# Run comprehensive validation tests
npm run validate-triggers:test

# Cleanup old performance logs
npm run validate-triggers:cleanup

# Custom options
tsx src/cli/validate-triggers.ts --test --report --verbose
```

#### Programmatic Monitoring
```typescript
import { TriggerValidationMonitor } from './storage/validation/TriggerValidationMonitor.js';

const monitor = new TriggerValidationMonitor(db);

// Get performance statistics
const stats = monitor.getTriggerPerformanceStats(30); // Last 30 days

// Identify slow triggers
const slowTriggers = monitor.getSlowTriggers(100); // >100ms average

// Get recent errors
const errors = monitor.getValidationErrors(7); // Last 7 days

// Generate comprehensive report
const report = monitor.generatePerformanceReport();
```

## Error Messages

### Common Validation Errors

#### Temporal Sequence Violations
```
Decision cannot be made before problem is identified. problem_identified_at must be <= decision_made_at
```

#### Resolution Requirement Violations
```
Resolution date is required when knowledge gap is marked as resolved
Resolution conversation ID is required when knowledge gap is marked as resolved
```

#### Score Range Violations
```
Analytics scores must be within valid ranges: depth_score (0-100), circularity_index (0-1), productivity_score (0-100)
```

#### Referential Integrity Violations
```
Referenced conversation_id does not exist in conversations table
Message cannot be its own parent (circular reference not allowed)
```

## Performance Considerations

### Trigger Optimization

1. **Conditional Execution**: Triggers only fire when relevant conditions are met
2. **Minimal Logic**: Simple validation checks to minimize execution time
3. **Indexed Columns**: Validation queries use indexed columns where possible
4. **Batch Operations**: Triggers are optimized for bulk insert scenarios

### Performance Thresholds

- **Acceptable**: < 50ms average execution time
- **Warning**: 50-100ms average execution time  
- **Critical**: > 100ms average execution time

### Monitoring Best Practices

1. **Regular Reports**: Generate weekly performance reports
2. **Error Tracking**: Monitor validation error patterns
3. **Cleanup Schedule**: Clean up logs older than 90 days
4. **Threshold Alerts**: Alert on triggers exceeding performance thresholds

## Testing

### Automated Test Suite

The validation triggers are covered by comprehensive tests in:
- `tests/storage/validation-triggers.test.ts`
- Individual trigger test cases for each validation rule
- Performance threshold testing
- Error message verification

### Manual Testing

```bash
# Run all validation tests
npm run validate-triggers:test

# Test specific scenarios
tsx src/cli/validate-triggers.ts --test --verbose
```

### Test Coverage

- ✅ Temporal sequence validation (all combinations)
- ✅ Resolution requirement validation
- ✅ Score range validation (boundary conditions)
- ✅ Cross-table consistency validation
- ✅ Performance monitoring functionality
- ✅ Error handling and reporting

## Maintenance

### Regular Tasks

1. **Weekly**: Generate performance reports
2. **Monthly**: Review and optimize slow triggers
3. **Quarterly**: Cleanup old performance logs
4. **As Needed**: Investigate validation error patterns

### Trigger Updates

When modifying triggers:

1. Update the migration file
2. Update test cases
3. Update this documentation
4. Test performance impact
5. Update error message documentation

### Rollback Procedures

All triggers can be safely removed using the migration rollback:

```sql
-- See migration 008_validation_triggers.ts down[] array for complete rollback
DROP TRIGGER IF EXISTS trg_decision_temporal_sequence;
-- ... (all other triggers)
```

## Best Practices

### Application Code

1. **Catch Trigger Errors**: Handle `RAISE(ABORT)` errors gracefully
2. **Validate Before Insert**: Pre-validate data when possible
3. **Batch Transactions**: Use transactions for related inserts
4. **Monitor Performance**: Track trigger execution times in application logs

### Data Entry

1. **Temporal Consistency**: Always ensure timeline data is logically ordered
2. **Complete Resolution Data**: Provide all required fields when marking items resolved
3. **Valid Score Ranges**: Validate score ranges in application layer
4. **Reference Integrity**: Ensure referenced entities exist before creating relationships

## Troubleshooting

### Common Issues

#### High Trigger Execution Time
- **Cause**: Complex validation logic or missing indexes
- **Solution**: Optimize trigger logic, add indexes to validation columns

#### Frequent Validation Errors
- **Cause**: Application logic not enforcing business rules
- **Solution**: Add client-side validation, review data entry procedures

#### Foreign Key Constraint Failures
- **Cause**: Attempting to reference non-existent records
- **Solution**: Ensure proper transaction ordering, validate references before insert

### Debug Commands

```bash
# Check trigger performance
npm run validate-triggers:report

# View recent errors
sqlite3 conversations.db "SELECT * FROM trigger_performance_log WHERE error_message IS NOT NULL ORDER BY created_at DESC LIMIT 10;"

# Identify slow operations
sqlite3 conversations.db "SELECT trigger_name, AVG(execution_time_ms) as avg_time FROM trigger_performance_log GROUP BY trigger_name HAVING avg_time > 50 ORDER BY avg_time DESC;"
```