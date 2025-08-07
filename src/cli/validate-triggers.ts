#!/usr/bin/env node

/**
 * Validation Triggers CLI Tool
 * 
 * Command-line utility for testing and monitoring database validation triggers:
 * - Run comprehensive validation tests
 * - Generate performance reports
 * - Monitor trigger effectiveness
 * - Cleanup old performance logs
 */

import { DatabaseManager } from '../storage/DatabaseManager.js';
import { TriggerValidationMonitor, runTriggerValidationTests } from '../storage/validation/TriggerValidationMonitor.js';

interface ValidationOptions {
  test: boolean;
  report: boolean;
  cleanup: boolean;
  cleanupDays: number;
  dbPath: string;
  verbose: boolean;
}

function parseArgs(): ValidationOptions {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {
    test: false,
    report: false,
    cleanup: false,
    cleanupDays: 90,
    dbPath: process.env.PERSISTENCE_DB_PATH || './data/conversations.db',
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--test':
      case '-t':
        options.test = true;
        break;
      case '--report':
      case '-r':
        options.report = true;
        break;
      case '--cleanup':
      case '-c':
        options.cleanup = true;
        break;
      case '--cleanup-days':
        options.cleanupDays = parseInt(args[++i]) || 90;
        break;
      case '--db-path':
        options.dbPath = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
      default:
        console.error(`Unknown option: ${args[i]}`);
        showHelp();
        process.exit(1);
    }
  }

  // Default to report if no specific action is requested
  if (!options.test && !options.report && !options.cleanup) {
    options.report = true;
  }

  return options;
}

function showHelp(): void {
  console.log(`
Validation Triggers CLI Tool

Usage: validate-triggers [options]

Options:
  -t, --test              Run comprehensive validation tests
  -r, --report            Generate performance report (default)
  -c, --cleanup           Cleanup old performance logs
  --cleanup-days <days>   Days to keep performance logs (default: 90)
  --db-path <path>        Database file path (default: ./data/conversations.db)
  -v, --verbose           Enable verbose output
  -h, --help              Show this help message

Examples:
  validate-triggers --test              Run all validation tests
  validate-triggers --report            Generate performance report
  validate-triggers --cleanup           Cleanup logs older than 90 days
  validate-triggers --test --report     Run tests and generate report
  validate-triggers --cleanup-days 30   Cleanup logs older than 30 days
  
Environment Variables:
  PERSISTENCE_DB_PATH    Path to the database file
`);
}

async function runValidationTests(dbManager: DatabaseManager, options: ValidationOptions): Promise<void> {
  console.log('🧪 Running comprehensive validation trigger tests...\n');
  
  try {
    const db = dbManager.getDatabase();
    await runTriggerValidationTests(db);
    console.log('\n✅ All validation tests completed successfully!');
  } catch (error) {
    console.error('\n❌ Validation tests failed:');
    console.error(error);
    process.exit(1);
  }
}

async function generatePerformanceReport(dbManager: DatabaseManager, options: ValidationOptions): Promise<void> {
  console.log('📊 Generating validation trigger performance report...\n');
  
  try {
    const db = dbManager.getDatabase();
    const monitor = new TriggerValidationMonitor(db);
    
    const report = monitor.generatePerformanceReport();
    console.log(report);
    
    if (options.verbose) {
      const stats = monitor.getTriggerPerformanceStats(30);
      const errors = monitor.getValidationErrors(7);
      const slowTriggers = monitor.getSlowTriggers(50);
      
      console.log('\n📈 Detailed Statistics:');
      console.log(`- Total triggers monitored: ${stats.length}`);
      console.log(`- Total executions (30 days): ${stats.reduce((sum, s) => sum + s.totalExecutions, 0)}`);
      console.log(`- Average execution time: ${(stats.reduce((sum, s) => sum + s.averageExecutionTime, 0) / stats.length).toFixed(2)}ms`);
      console.log(`- Recent errors (7 days): ${errors.length}`);
      console.log(`- Performance issues (>50ms): ${slowTriggers.length}`);
    }
    
  } catch (error) {
    console.error('\n❌ Failed to generate performance report:');
    console.error(error);
    process.exit(1);
  }
}

async function cleanupOldLogs(dbManager: DatabaseManager, options: ValidationOptions): Promise<void> {
  console.log(`🧹 Cleaning up performance logs older than ${options.cleanupDays} days...`);
  
  try {
    const db = dbManager.getDatabase();
    const monitor = new TriggerValidationMonitor(db);
    
    const deletedCount = monitor.cleanupOldLogs(options.cleanupDays);
    console.log(`✅ Cleaned up ${deletedCount} old performance log entries`);
    
  } catch (error) {
    console.error('\n❌ Failed to cleanup old logs:');
    console.error(error);
    process.exit(1);
  }
}

async function checkTriggerHealth(dbManager: DatabaseManager, options: ValidationOptions): Promise<void> {
  if (!options.verbose) return;
  
  console.log('🔍 Checking trigger health...\n');
  
  try {
    const db = dbManager.getDatabase();
    const monitor = new TriggerValidationMonitor(db);
    
    // Check for recent errors
    const recentErrors = monitor.getValidationErrors(1);
    if (recentErrors.length > 0) {
      console.log('⚠️  Recent validation errors detected:');
      for (const error of recentErrors.slice(0, 5)) {
        console.log(`  - ${error.triggerName} on ${error.tableName}: ${error.errorMessage}`);
      }
    } else {
      console.log('✅ No recent validation errors');
    }
    
    // Check for performance issues
    const slowTriggers = monitor.getSlowTriggers(100);
    if (slowTriggers.length > 0) {
      console.log('\n⚠️  Performance issues detected:');
      for (const trigger of slowTriggers.slice(0, 3)) {
        console.log(`  - ${trigger.triggerName}: ${trigger.averageExecutionTime.toFixed(2)}ms avg`);
      }
    } else {
      console.log('✅ All triggers performing within acceptable limits');
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Failed to check trigger health:');
    console.error(error);
  }
}

async function main(): Promise<void> {
  const options = parseArgs();
  
  if (options.verbose) {
    console.log(`Database path: ${options.dbPath}`);
    console.log(`Actions: ${[
      options.test && 'test',
      options.report && 'report', 
      options.cleanup && 'cleanup'
    ].filter(Boolean).join(', ')}\n`);
  }
  
  try {
    // Initialize database
    const dbManager = new DatabaseManager(options.dbPath);
    await dbManager.initialize();
    
    if (options.verbose) {
      console.log('✅ Database initialized successfully\n');
    }
    
    // Check trigger health first if verbose
    await checkTriggerHealth(dbManager, options);
    
    // Run requested actions
    if (options.test) {
      await runValidationTests(dbManager, options);
    }
    
    if (options.report) {
      await generatePerformanceReport(dbManager, options);
    }
    
    if (options.cleanup) {
      await cleanupOldLogs(dbManager, options);
    }
    
    // Close database
    dbManager.close();
    
    if (options.verbose) {
      console.log('\n🎉 All operations completed successfully!');
    }
    
  } catch (error) {
    console.error('\n💥 Fatal error:');
    console.error(error);
    process.exit(1);
  }
}

// Handle process signals gracefully
process.on('SIGINT', () => {
  console.log('\n⏹️  Operation cancelled by user');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:');
  console.error(error);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled rejection:');
  console.error(error);
  process.exit(1);
});

// Run the CLI tool
if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  main().catch((error) => {
    console.error('\n💥 Main execution error:');
    console.error(error);
    process.exit(1);
  });
}