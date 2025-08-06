/**
 * Knowledge Synthesizer Demo
 * 
 * Demonstrates how to use the Knowledge Synthesizer to:
 * - Synthesize comprehensive entity knowledge
 * - Detect conflicting statements
 * - Get context suggestions
 * - Find expert recommendations
 */

import { DatabaseManager } from '../src/storage/Database.js';
import { KnowledgeSynthesizer } from '../src/services/proactive/synthesis/KnowledgeSynthesizer.js';
import { EntityRepository } from '../src/storage/repositories/EntityRepository.js';

async function runKnowledgeSynthesizerDemo() {
  console.log('🧠 Knowledge Synthesizer Demo\n');

  try {
    // Initialize database and synthesizer
    const dbManager = new DatabaseManager(':memory:');
    await dbManager.initialize();
    
    const synthesizer = new KnowledgeSynthesizer(dbManager, {
      conflictDetectionEnabled: true,
      maxSuggestions: 5,
      minConfidenceThreshold: 0.6
    });

    const entityRepository = new EntityRepository(dbManager);

    // Create some sample entities for demonstration
    console.log('📝 Creating sample entities...');
    
    const johnDoe = await entityRepository.create({
      name: 'John Doe',
      type: 'person',
      confidenceScore: 0.9,
      metadata: { role: 'senior developer' }
    });

    const acmeCorp = await entityRepository.create({
      name: 'Acme Corp',
      type: 'organization',
      confidenceScore: 0.95,
      metadata: { industry: 'technology' }
    });

    const reactFramework = await entityRepository.create({
      name: 'React',
      type: 'technical',
      confidenceScore: 0.98,
      metadata: { type: 'framework', language: 'javascript' }
    });

    console.log(`✅ Created ${johnDoe.name} (${johnDoe.id})`);
    console.log(`✅ Created ${acmeCorp.name} (${acmeCorp.id})`);
    console.log(`✅ Created ${reactFramework.name} (${reactFramework.id})\n`);

    // 1. Synthesize Entity Knowledge
    console.log('🔍 1. Synthesizing Entity Knowledge');
    console.log('=====================================');
    
    try {
      const johnKnowledge = await synthesizer.synthesizeEntityKnowledge(johnDoe.id);
      console.log(`📊 Knowledge Score for ${johnKnowledge.entity.name}: ${johnKnowledge.knowledgeScore.toFixed(2)}`);
      console.log(`📈 Attributes found: ${johnKnowledge.attributes.length}`);
      console.log(`🔗 Relationships: ${johnKnowledge.relationships.length}`);
      console.log(`💬 Mentions: ${johnKnowledge.mentions.length}`);
      console.log(`📅 Timeline entries: ${johnKnowledge.timeline.length}\n`);
    } catch (error) {
      console.log(`ℹ️  No detailed knowledge available for ${johnDoe.name} yet (expected in demo)\n`);
    }

    // 2. Detect Conflicting Statements
    console.log('⚠️  2. Detecting Conflicting Statements');
    console.log('=======================================');
    
    const conflicts = await synthesizer.detectConflictingStatements();
    if (conflicts.length > 0) {
      console.log(`🚨 Found ${conflicts.length} conflicts:`);
      conflicts.slice(0, 3).forEach((conflict, index) => {
        console.log(`  ${index + 1}. ${conflict.description} (${conflict.severity})`);
      });
    } else {
      console.log('✅ No conflicts detected (expected in demo)');
    }
    console.log();

    // 3. Get Context Suggestions
    console.log('💡 3. Getting Context Suggestions');
    console.log('=================================');
    
    const suggestions = await synthesizer.suggestRelevantContext(
      [johnDoe.id, acmeCorp.id], 
      'demo-conversation', 
      3
    );
    
    if (suggestions.length > 0) {
      console.log(`📝 Found ${suggestions.length} suggestions:`);
      suggestions.forEach((suggestion, index) => {
        console.log(`  ${index + 1}. [${suggestion.type}] ${suggestion.title}`);
        console.log(`     Relevance: ${suggestion.relevanceScore.toFixed(2)}`);
        console.log(`     ${suggestion.description}\n`);
      });
    } else {
      console.log('ℹ️  No suggestions available (expected in demo with minimal data)\n');
    }

    // 4. Recommend Experts
    console.log('👨‍💼 4. Recommending Experts');
    console.log('===========================');
    
    const experts = await synthesizer.recommendExperts(
      [reactFramework.id], 
      'React development', 
      3
    );
    
    if (experts.length > 0) {
      console.log(`🎯 Found ${experts.length} expert recommendations:`);
      experts.forEach((expert, index) => {
        console.log(`  ${index + 1}. ${expert.person.name}`);
        console.log(`     Credibility: ${expert.credibilityScore.toFixed(2)}`);
        console.log(`     Knowledge Depth: ${expert.knowledgeDepth.toFixed(2)}`);
        console.log(`     Expertise: ${expert.expertiseAreas.join(', ')}`);
        console.log(`     Reason: ${expert.recommendationReason}\n`);
      });
    } else {
      console.log('ℹ️  No experts found (expected in demo with minimal data)\n');
    }

    // 5. Configuration Demo
    console.log('⚙️  5. Configuration Options');
    console.log('===========================');
    
    // Create a synthesizer with custom configuration
    const customSynthesizer = new KnowledgeSynthesizer(dbManager, {
      conflictDetectionEnabled: false,
      maxSuggestions: 10,
      minConfidenceThreshold: 0.3,
      expertiseCalculationWindow: 30, // days
      minInteractionsForExpert: 2
    });
    
    console.log('✅ Created synthesizer with custom configuration:');
    console.log('   - Conflict detection: disabled');
    console.log('   - Max suggestions: 10');
    console.log('   - Min confidence threshold: 0.3');
    console.log('   - Expertise calculation window: 30 days');
    console.log('   - Min interactions for expert: 2\n');

    // 6. Utility Functions Demo
    console.log('🔧 6. Utility Functions');
    console.log('=====================');
    
    const synthesizer_any = synthesizer as any;
    
    // Test string similarity
    const similarity = synthesizer_any.calculateStringSimilarity(
      'React framework for building user interfaces',
      'React library for UI development'
    );
    console.log(`📊 String similarity: ${similarity.toFixed(3)}`);
    
    // Test change type determination
    const changeType = synthesizer_any.determineChangeType(
      'senior developer', 
      'lead engineer', 
      []
    );
    console.log(`🔄 Change type: ${changeType}`);
    
    // Test ID generation
    const newId = synthesizer_any.generateId();
    console.log(`🆔 Generated ID: ${newId}`);
    
    console.log('\n✨ Knowledge Synthesizer Demo Complete!');
    
    // Cleanup
    await dbManager.close();

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  runKnowledgeSynthesizerDemo()
    .then(() => {
      console.log('\n🎉 Demo completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Demo error:', error);
      process.exit(1);
    });
}

export { runKnowledgeSynthesizerDemo };