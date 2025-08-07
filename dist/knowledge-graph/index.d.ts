/**
 * Knowledge Graph Module
 *
 * This module provides cross-conversation intelligence through entity recognition,
 * relationship detection, and graph-based queries using SQLite native features.
 */
export { KnowledgeGraphService } from './KnowledgeGraphService.js';
export type { MessageProcessingResult, CrossConversationAnalysis, EntityHistory, KnowledgeGraphConfig } from './KnowledgeGraphService.js';
export { EntityExtractor } from './EntityExtractor.js';
export type { ExtractedEntity, ExtractionConfig } from './EntityExtractor.js';
export { RelationshipDetector } from './RelationshipDetector.js';
export type { DetectedRelationship, RelationshipDetectionConfig } from './RelationshipDetector.js';
export { KnowledgeGraphRepository } from '../storage/repositories/KnowledgeGraphRepository.js';
export type { Entity, EntityMention, EntityRelationship, GraphTraversalResult, EntityCluster, EntityType, RelationshipType, ExtractionMethod, EvolutionType } from '../storage/repositories/KnowledgeGraphRepository.js';
export type { GetEntityHistoryArgs } from '../tools/GetEntityHistoryTool.js';
export type { FindRelatedConversationsArgs } from '../tools/FindRelatedConversationsTool.js';
export type { GetKnowledgeGraphArgs } from '../tools/GetKnowledgeGraphTool.js';
//# sourceMappingURL=index.d.ts.map