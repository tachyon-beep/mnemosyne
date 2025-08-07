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
export declare const validationTriggersMigration: Migration;
//# sourceMappingURL=008_validation_triggers.d.ts.map