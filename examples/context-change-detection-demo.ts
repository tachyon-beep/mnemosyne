/**
 * Demo script showing how to use the Context Change Detector service
 */

import { DatabaseManager } from '../src/storage/Database.js';
import { EntityRepository } from '../src/storage/repositories/EntityRepository.js';
import { KnowledgeGraphRepository } from '../src/storage/repositories/KnowledgeGraphRepository.js';
import { ContextChangeDetector } from '../src/services/proactive/intelligence/ContextChangeDetector.js';

async function demonstrateContextChangeDetection() {
  console.log('🔍 Context Change Detection Demo\n');
  
  // Initialize database and repositories
  const dbManager = new DatabaseManager({
    databasePath: './demo-context-change.db'
  });
  await dbManager.initialize();
  
  const entityRepository = new EntityRepository(dbManager);
  const knowledgeGraphRepo = new KnowledgeGraphRepository(dbManager.getConnection());
  
  // Initialize Context Change Detector with custom config
  const contextDetector = new ContextChangeDetector(dbManager, entityRepository, knowledgeGraphRepo, {
    minShiftConfidence: 0.6,
    entityPatternWindow: 15,
    minRelevanceScore: 0.4,
    maxHistoryAgeDays: 60,
    minConflictSeverity: 0.5,
    maxContextTokens: 3000
  });

  // Create sample conversation and entities
  const conversationId = 'demo-conversation';
  
  // Create conversation
  const conversation = dbManager.getConnection().prepare(`
    INSERT OR REPLACE INTO conversations (id, created_at, updated_at, title, metadata)
    VALUES (?, ?, ?, ?, ?)
  `);
  conversation.run(conversationId, Date.now(), Date.now(), 'Tech Discussion', '{}');

  // Create sample messages showing topic evolution
  const messages = [
    { id: 'msg-1', content: 'Let\'s discuss JavaScript frameworks for our project', time: Date.now() - 7200000 },
    { id: 'msg-2', content: 'React seems like a good choice for the frontend', time: Date.now() - 7100000 },
    { id: 'msg-3', content: 'We should also consider Node.js for the backend', time: Date.now() - 7000000 },
    { id: 'msg-4', content: 'Actually, let\'s switch to Python for better data processing', time: Date.now() - 3600000 },
    { id: 'msg-5', content: 'Django would be perfect for our Python backend', time: Date.now() - 3500000 },
    { id: 'msg-6', content: 'Let\'s also look into machine learning with TensorFlow', time: Date.now() - 1800000 }
  ];

  // Insert messages
  const messageStmt = dbManager.getConnection().prepare(`
    INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at, parent_message_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  for (const msg of messages) {
    messageStmt.run(msg.id, conversationId, 'user', msg.content, msg.time, null, '{}');
  }

  // Create entities
  const jsEntity = await entityRepository.create({
    name: 'JavaScript',
    type: 'technical',
    confidenceScore: 0.95
  });
  
  const reactEntity = await entityRepository.create({
    name: 'React',
    type: 'technical',
    confidenceScore: 0.90
  });
  
  const pythonEntity = await entityRepository.create({
    name: 'Python',
    type: 'technical',
    confidenceScore: 0.95
  });
  
  const djangoEntity = await entityRepository.create({
    name: 'Django',
    type: 'technical',
    confidenceScore: 0.85
  });

  // Create entity mentions
  const mentionStmt = dbManager.getConnection().prepare(`
    INSERT OR REPLACE INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, start_position, end_position, confidence_score, extraction_method, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  // JavaScript mentions (early in conversation)
  mentionStmt.run('mention-1', jsEntity.id, 'msg-1', conversationId, 'JavaScript', 16, 26, 0.95, 'pattern', messages[0].time);
  mentionStmt.run('mention-2', reactEntity.id, 'msg-2', conversationId, 'React', 0, 5, 0.90, 'pattern', messages[1].time);
  
  // Python mentions (later in conversation)
  mentionStmt.run('mention-3', pythonEntity.id, 'msg-4', conversationId, 'Python', 23, 29, 0.95, 'pattern', messages[3].time);
  mentionStmt.run('mention-4', djangoEntity.id, 'msg-5', conversationId, 'Django', 0, 6, 0.85, 'pattern', messages[4].time);

  console.log('📊 Detecting topic shifts...');
  
  // 1. Detect Topic Shifts
  const topicShifts = await contextDetector.detectTopicShifts(conversationId, {
    lookbackMessages: 6,
    minShiftConfidence: 0.5
  });
  
  console.log(`\n✨ Found ${topicShifts.length} topic shifts:`);
  for (const shift of topicShifts) {
    console.log(`\n🔄 Shift Type: ${shift.shiftType}`);
    console.log(`   Confidence: ${(shift.shiftConfidence * 100).toFixed(1)}%`);
    console.log(`   Previous entities: ${shift.previousEntities.map(e => e.name).join(', ')}`);
    console.log(`   New entities: ${shift.newEntities.map(e => e.name).join(', ')}`);
    console.log(`   Trigger entities: ${shift.triggerEntities.map(e => e.name).join(', ')}`);
  }

  console.log('\n🏗️ Analyzing optimal context window...');
  
  // 2. Analyze Context Window
  const contextWindow = await contextDetector.analyzeContextWindow(conversationId, {
    maxTokens: 2000,
    includeHistory: true
  });
  
  console.log(`\n📋 Context Analysis:`);
  console.log(`   Core entities: ${contextWindow.coreEntities.map(e => e.name).join(', ')}`);
  console.log(`   Recommended messages: ${contextWindow.recommendedMessages.length}`);
  console.log(`   Context relevance: ${(contextWindow.contextRelevance * 100).toFixed(1)}%`);
  console.log(`   Estimated tokens: ${contextWindow.estimatedTokens}`);
  console.log(`   Freshness score: ${(contextWindow.freshness * 100).toFixed(1)}%`);
  console.log(`   Potential entities: ${contextWindow.potentialEntities.map(e => e.name).join(', ')}`);

  console.log('\n🔍 Looking for conflicting information...');
  
  // 3. Find Conflicting Information
  const conflicts = await contextDetector.findConflictingInformation({
    conversationId,
    minSeverity: 0.3
  });
  
  if (conflicts.length > 0) {
    console.log(`\n⚠️  Found ${conflicts.length} potential conflicts:`);
    for (const conflict of conflicts) {
      console.log(`\n   Entity: ${conflict.entity.name}`);
      console.log(`   Conflict type: ${conflict.conflictType}`);
      console.log(`   Severity: ${(conflict.conflictSeverity * 100).toFixed(1)}%`);
      console.log(`   Conflicting messages: ${conflict.conflictingMessages.length}`);
      if (conflict.suggestedResolution) {
        console.log(`   Suggestion: ${conflict.suggestedResolution}`);
      }
    }
  } else {
    console.log('\n✅ No conflicting information detected');
  }

  console.log('\n🎯 Context change detection demo completed!');
  
  // Cleanup
  dbManager.close();
}

// Run the demo
demonstrateContextChangeDetection().catch(console.error);