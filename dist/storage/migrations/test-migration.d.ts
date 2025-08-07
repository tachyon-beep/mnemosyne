/**
 * Migration Test Script
 *
 * This script tests the enhanced search migration to ensure:
 * - Migration applies successfully
 * - All new tables and indexes are created
 * - FTS triggers work correctly
 * - Rollback works without data corruption
 * - Performance is acceptable
 */
interface TestResult {
    test: string;
    passed: boolean;
    error?: string;
    duration?: number;
}
declare class MigrationTest {
    private db;
    private migrationRunner;
    private results;
    constructor();
    runAllTests(): Promise<TestResult[]>;
    private testInitialState;
    private testMigrationApplication;
    private testNewTablesCreated;
    private testFTSEnhancements;
    private testIndexCreation;
    private testTriggerFunctionality;
    private testRollback;
    private testDataIntegrity;
    private getTableNames;
    private getIndexNames;
    private addResult;
    close(): void;
}
export { MigrationTest };
//# sourceMappingURL=test-migration.d.ts.map