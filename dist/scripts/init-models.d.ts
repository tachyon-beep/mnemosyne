#!/usr/bin/env tsx
/**
 * Model Initialization Script
 *
 * This script downloads and initializes the embedding model for the MCP Persistence System.
 * It ensures the all-MiniLM-L6-v2 model is available locally and tests its functionality.
 *
 * Usage:
 *   npm run init:models
 *   or
 *   tsx src/scripts/init-models.ts
 */
interface InitializationConfig {
    modelName: string;
    cacheDir: string;
    testTexts: string[];
    expectedDimensions: number;
}
declare const config: InitializationConfig;
/**
 * Main initialization function
 */
declare function main(): Promise<void>;
export { main as initializeModels, config as modelConfig };
//# sourceMappingURL=init-models.d.ts.map