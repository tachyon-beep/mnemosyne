/**
 * Unit tests for Auto-Tagging Service
 * 
 * Tests topic tag generation, activity classification, urgency detection,
 * and project context identification.
 */

import { DatabaseManager } from '../../../../../src/storage/Database.js';
import { 
  AutoTaggingService, 
  TopicTag, 
  ActivityClassification, 
  UrgencyAnalysis, 
  ProjectContext,
  AutoTaggingResult
} from '../../../../../src/services/proactive/intelligence/AutoTaggingService.js';
import { createTestDatabase } from '../../../../utils/test-helpers.js';

describe('AutoTaggingService', () => {
  let dbManager: DatabaseManager;
  let service: AutoTaggingService;

  beforeEach(async () => {
    dbManager = await createTestDatabase();
    service = new AutoTaggingService(dbManager, {
      minEntityRelevance: 0.3,
      maxTopicTags: 5,
      minProjectConfidence: 0.6
    });
    await setupAutoTaggingTestData(dbManager);
  });

  afterEach(async () => {
    await dbManager.close();
  });

  describe('generateTopicTags', () => {
    it('should generate topic tags from primary entities', async () => {
      const tags = await service.generateTopicTags('conv-tech-discussion');

      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
      expect(tags.length).toBeGreaterThan(0);

      // Should find React and TypeScript as topic tags
      const reactTag = tags.find(tag => tag.name.toLowerCase().includes('react'));
      expect(reactTag).toBeDefined();
      expect(reactTag?.type).toBe('entity');
      expect(reactTag?.relevance).toBeGreaterThan(0);
      expect(reactTag?.source).toBe('primary_entity');
    });

    it('should generate theme tags from entity clusters', async () => {
      const tags = await service.generateTopicTags('conv-tech-discussion');

      const themeTags = tags.filter(tag => tag.type === 'theme');
      themeTags.forEach(tag => {
        expect(tag.source).toBe('entity_cluster');
        expect(tag.relevance).toBeGreaterThan(0);
        expect(tag.name).toBeTruthy();
      });
    });

    it('should generate domain tags from entity types', async () => {
      const tags = await service.generateTopicTags('conv-tech-discussion');

      const domainTags = tags.filter(tag => tag.type === 'domain');
      domainTags.forEach(tag => {
        expect(tag.source).toBe('keyword_analysis');
        expect(['Technology', 'Products', 'People & Teams', 'Organizations', 'Concepts'].includes(tag.name)).toBe(true);
      });
    });

    it('should sort tags by relevance', async () => {
      const tags = await service.generateTopicTags('conv-tech-discussion');

      for (let i = 1; i < tags.length; i++) {
        expect(tags[i - 1].relevance).toBeGreaterThanOrEqual(tags[i].relevance);
      }
    });

    it('should respect maxTopicTags limit', async () => {
      const limitedService = new AutoTaggingService(dbManager, { maxTopicTags: 3 });
      const tags = await limitedService.generateTopicTags('conv-tech-discussion');

      expect(tags.length).toBeLessThanOrEqual(3);
    });

    it('should filter by minimum entity relevance', async () => {
      const strictService = new AutoTaggingService(dbManager, { minEntityRelevance: 0.8 });
      const tags = await strictService.generateTopicTags('conv-tech-discussion');

      const entityTags = tags.filter(tag => tag.type === 'entity');
      entityTags.forEach(tag => {
        expect(tag.relevance).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('classifyActivity', () => {
    it('should classify discussion activities', async () => {
      const activity = await service.classifyActivity('conv-discussion');

      expect(activity).toBeDefined();
      expect(activity.type).toBe('discussion');
      expect(activity.confidence).toBeGreaterThan(0);
      expect(Array.isArray(activity.indicators)).toBe(true);
      expect(activity.indicators.length).toBeGreaterThan(0);
    });

    it('should classify decision-making activities', async () => {
      const activity = await service.classifyActivity('conv-decision');

      expect(activity.type).toBe('decision');
      expect(activity.confidence).toBeGreaterThan(0);
      expect(activity.indicators.some(indicator => 
        indicator.toLowerCase().includes('decide') || 
        indicator.toLowerCase().includes('choose')
      )).toBe(true);
    });

    it('should classify planning activities', async () => {
      const activity = await service.classifyActivity('conv-planning');

      expect(activity.type).toBe('planning');
      expect(activity.confidence).toBeGreaterThan(0);
      expect(activity.indicators.some(indicator => 
        indicator.toLowerCase().includes('plan') || 
        indicator.toLowerCase().includes('schedule')
      )).toBe(true);
    });

    it('should classify problem-solving activities', async () => {
      const activity = await service.classifyActivity('conv-problem-solving');

      expect(activity.type).toBe('problem_solving');
      expect(activity.confidence).toBeGreaterThan(0);
      expect(activity.indicators.some(indicator => 
        indicator.toLowerCase().includes('problem') || 
        indicator.toLowerCase().includes('fix')
      )).toBe(true);
    });

    it('should classify learning activities', async () => {
      const activity = await service.classifyActivity('conv-learning');

      expect(activity.type).toBe('learning');
      expect(activity.confidence).toBeGreaterThan(0);
      expect(activity.indicators.some(indicator => 
        indicator.toLowerCase().includes('learn') || 
        indicator.toLowerCase().includes('understand')
      )).toBe(true);
    });

    it('should calculate confidence based on pattern matches', async () => {
      // Conversation with many planning indicators
      const strongPlanningActivity = await service.classifyActivity('conv-strong-planning');
      
      // Conversation with few planning indicators
      const weakPlanningActivity = await service.classifyActivity('conv-weak-planning');

      if (strongPlanningActivity.type === 'planning' && weakPlanningActivity.type === 'planning') {
        expect(strongPlanningActivity.confidence).toBeGreaterThan(weakPlanningActivity.confidence);
      }
    });

    it('should default to discussion for ambiguous content', async () => {
      const activity = await service.classifyActivity('conv-ambiguous');

      expect(activity.type).toBe('discussion');
      expect(activity.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectUrgencySignals', () => {
    it('should detect critical urgency signals', async () => {
      const urgency = await service.detectUrgencySignals('conv-critical-urgent');

      expect(urgency).toBeDefined();
      expect(urgency.level).toBe('critical');
      expect(urgency.score).toBeGreaterThanOrEqual(0.9);
      expect(urgency.signals.length).toBeGreaterThan(0);
      expect(urgency.signals.some(signal => 
        ['urgent', 'emergency', 'asap', 'immediately'].some(keyword => 
          signal.toLowerCase().includes(keyword)
        )
      )).toBe(true);
    });

    it('should detect high urgency signals', async () => {
      const urgency = await service.detectUrgencySignals('conv-high-urgent');

      expect(urgency.level).toBe('high');
      expect(urgency.score).toBeGreaterThanOrEqual(0.7);
      expect(urgency.signals.some(signal => 
        ['important', 'priority', 'deadline'].some(keyword => 
          signal.toLowerCase().includes(keyword)
        )
      )).toBe(true);
    });

    it('should detect medium urgency signals', async () => {
      const urgency = await service.detectUrgencySignals('conv-medium-urgent');

      expect(urgency.level).toBe('medium');
      expect(urgency.score).toBeGreaterThanOrEqual(0.5);
      expect(urgency.signals.some(signal => 
        ['soon', 'this week'].some(keyword => 
          signal.toLowerCase().includes(keyword)
        )
      )).toBe(true);
    });

    it('should detect no urgency for normal conversations', async () => {
      const urgency = await service.detectUrgencySignals('conv-normal');

      expect(urgency.level).toBe('none');
      expect(urgency.score).toBeLessThan(0.3);
    });

    it('should parse deadline mentions', async () => {
      const urgency = await service.detectUrgencySignals('conv-with-deadline');

      expect(urgency.deadline).toBeDefined();
      expect(urgency.deadline).toBeInstanceOf(Date);
    });

    it('should focus on recent messages for urgency detection', async () => {
      // Test that recent messages have more weight than older ones
      const urgency = await service.detectUrgencySignals('conv-recent-urgent');

      expect(urgency.level).not.toBe('none');
      expect(urgency.signals.length).toBeGreaterThan(0);
    });

    it('should handle custom urgency keywords', async () => {
      const customService = new AutoTaggingService(dbManager, {
        urgencyKeywords: ['hotfix', 'production-issue']
      });

      const urgency = await customService.detectUrgencySignals('conv-custom-urgent');

      if (urgency.level !== 'none') {
        expect(urgency.signals.some(signal => 
          ['hotfix', 'production-issue'].includes(signal.toLowerCase())
        )).toBe(true);
      }
    });
  });

  describe('identifyProjectContexts', () => {
    it('should identify ongoing projects from entity clusters', async () => {
      const projects = await service.identifyProjectContexts('conv-project-alpha');

      expect(projects).toBeDefined();
      expect(Array.isArray(projects)).toBe(true);

      projects.forEach(project => {
        expect(project.name).toBeTruthy();
        expect(project.entities.length).toBeGreaterThan(0);
        expect(project.confidence).toBeGreaterThanOrEqual(0.6); // minProjectConfidence
        expect(['ongoing', 'new', 'completed']).toContain(project.type);
      });
    });

    it('should identify completed projects with decision entities', async () => {
      const projects = await service.identifyProjectContexts('conv-completed-project');

      const completedProject = projects.find(p => p.type === 'completed');
      if (completedProject) {
        expect(completedProject.entities.some(e => e.type === 'decision')).toBe(true);
      }
    });

    it('should identify new projects based on entity age', async () => {
      const projects = await service.identifyProjectContexts('conv-new-project');

      const newProject = projects.find(p => p.type === 'new');
      if (newProject) {
        expect(newProject.confidence).toBeGreaterThanOrEqual(0.6);
      }
    });

    it('should sort projects by confidence', async () => {
      const projects = await service.identifyProjectContexts('conv-multiple-projects');

      for (let i = 1; i < projects.length; i++) {
        expect(projects[i - 1].confidence).toBeGreaterThanOrEqual(projects[i].confidence);
      }
    });

    it('should filter projects by minimum confidence', async () => {
      const strictService = new AutoTaggingService(dbManager, { minProjectConfidence: 0.9 });
      const projects = await strictService.identifyProjectContexts('conv-project-alpha');

      projects.forEach(project => {
        expect(project.confidence).toBeGreaterThanOrEqual(0.9);
      });
    });
  });

  describe('autoTagConversation', () => {
    it('should perform complete auto-tagging', async () => {
      const result = await service.autoTagConversation('conv-tech-discussion');

      expect(result).toBeDefined();
      expect(result.conversationId).toBe('conv-tech-discussion');
      expect(result.topicTags).toBeDefined();
      expect(result.activity).toBeDefined();
      expect(result.urgency).toBeDefined();
      expect(result.projectContexts).toBeDefined();
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should provide comprehensive tagging results', async () => {
      const result = await service.autoTagConversation('conv-comprehensive');

      // Check topic tags
      expect(result.topicTags.length).toBeGreaterThan(0);
      result.topicTags.forEach(tag => {
        expect(['entity', 'theme', 'domain']).toContain(tag.type);
        expect(tag.relevance).toBeGreaterThan(0);
      });

      // Check activity classification
      expect(['discussion', 'decision', 'planning', 'problem_solving', 'learning', 'review', 'brainstorming'])
        .toContain(result.activity.type);
      expect(result.activity.confidence).toBeGreaterThanOrEqual(0);

      // Check urgency analysis
      expect(['none', 'low', 'medium', 'high', 'critical']).toContain(result.urgency.level);
      expect(result.urgency.score).toBeGreaterThanOrEqual(0);

      // Check project contexts
      expect(Array.isArray(result.projectContexts)).toBe(true);
    });

    it('should handle conversations with minimal content', async () => {
      const result = await service.autoTagConversation('conv-minimal');

      expect(result).toBeDefined();
      expect(result.conversationId).toBe('conv-minimal');
      
      // Should still provide basic classification
      expect(result.activity.type).toBeTruthy();
      expect(result.urgency.level).toBeTruthy();
    });

    it('should handle conversations with rich entity data', async () => {
      const result = await service.autoTagConversation('conv-rich-entities');

      expect(result.topicTags.length).toBeGreaterThan(0);
      expect(result.projectContexts.length).toBeGreaterThanOrEqual(0);
      
      // Should identify multiple topic types
      const entityTags = result.topicTags.filter(tag => tag.type === 'entity');
      const domainTags = result.topicTags.filter(tag => tag.type === 'domain');
      
      expect(entityTags.length + domainTags.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle non-existent conversations gracefully', async () => {
      const result = await service.autoTagConversation('non-existent-conv');

      expect(result).toBeDefined();
      expect(result.conversationId).toBe('non-existent-conv');
      expect(result.topicTags).toEqual([]);
      expect(result.activity.type).toBe('discussion'); // Default
      expect(result.urgency.level).toBe('none'); // Default
      expect(result.projectContexts).toEqual([]);
    });

    it('should handle database connection issues', async () => {
      await dbManager.close();

      await expect(service.generateTopicTags('test-conv'))
        .rejects.toThrow();

      await expect(service.classifyActivity('test-conv'))
        .rejects.toThrow();

      await expect(service.detectUrgencySignals('test-conv'))
        .rejects.toThrow();

      await expect(service.identifyProjectContexts('test-conv'))
        .rejects.toThrow();
    });

    it('should handle malformed entity data gracefully', async () => {
      // Test with conversation that might have malformed entity data
      const tags = await service.generateTopicTags('conv-malformed');

      expect(tags).toBeDefined();
      expect(Array.isArray(tags)).toBe(true);
    });

    it('should validate configuration parameters', async () => {
      // Test with invalid configuration
      const invalidService = new AutoTaggingService(dbManager, {
        minEntityRelevance: -1,
        maxTopicTags: 0,
        minProjectConfidence: 2
      });

      // Should handle invalid config gracefully
      const result = await invalidService.autoTagConversation('conv-tech-discussion');
      expect(result).toBeDefined();
    });
  });
});

/**
 * Set up comprehensive test data for auto-tagging
 */
async function setupAutoTaggingTestData(dbManager: DatabaseManager) {
  const db = dbManager.getConnection();
  
  // Create conversations
  const conversations = [
    { id: 'conv-tech-discussion', title: 'React Development Discussion', created_at: Date.now() - 10000, updated_at: Date.now() },
    { id: 'conv-discussion', title: 'General Discussion', created_at: Date.now() - 9000, updated_at: Date.now() },
    { id: 'conv-decision', title: 'Technology Decision', created_at: Date.now() - 8000, updated_at: Date.now() },
    { id: 'conv-planning', title: 'Project Planning Session', created_at: Date.now() - 7000, updated_at: Date.now() },
    { id: 'conv-problem-solving', title: 'Bug Fix Discussion', created_at: Date.now() - 6000, updated_at: Date.now() },
    { id: 'conv-learning', title: 'Learning Session', created_at: Date.now() - 5000, updated_at: Date.now() },
    { id: 'conv-critical-urgent', title: 'Emergency Fix', created_at: Date.now() - 4000, updated_at: Date.now() },
    { id: 'conv-high-urgent', title: 'Important Task', created_at: Date.now() - 3000, updated_at: Date.now() },
    { id: 'conv-medium-urgent', title: 'Medium Priority', created_at: Date.now() - 2000, updated_at: Date.now() },
    { id: 'conv-normal', title: 'Normal Chat', created_at: Date.now() - 1000, updated_at: Date.now() },
    { id: 'conv-with-deadline', title: 'Task with Deadline', created_at: Date.now() - 500, updated_at: Date.now() },
    { id: 'conv-project-alpha', title: 'Project Alpha Development', created_at: Date.now() - 400, updated_at: Date.now() },
    { id: 'conv-completed-project', title: 'Completed Project Review', created_at: Date.now() - 300, updated_at: Date.now() },
    { id: 'conv-new-project', title: 'New Initiative Kickoff', created_at: Date.now() - 200, updated_at: Date.now() },
    { id: 'conv-comprehensive', title: 'Comprehensive Test', created_at: Date.now() - 100, updated_at: Date.now() },
    { id: 'conv-minimal', title: 'Minimal Content', created_at: Date.now() - 50, updated_at: Date.now() },
    { id: 'conv-rich-entities', title: 'Rich Entity Content', created_at: Date.now() - 25, updated_at: Date.now() }
  ];

  const insertConv = db.prepare(`
    INSERT OR REPLACE INTO conversations (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
  `);

  conversations.forEach(conv => {
    insertConv.run(conv.id, conv.title, conv.created_at, conv.updated_at);
  });

  // Create messages with various patterns
  const messages = [
    // Tech discussion messages
    { id: 'msg-1', conversation_id: 'conv-tech-discussion', role: 'user', content: 'Let\'s discuss React component architecture and TypeScript integration best practices.', created_at: Date.now() - 10000 },
    { id: 'msg-2', conversation_id: 'conv-tech-discussion', role: 'assistant', content: 'I\'d love to talk about React hooks, component composition, and how TypeScript enhances development experience.', created_at: Date.now() - 9900 },

    // Discussion messages
    { id: 'msg-3', conversation_id: 'conv-discussion', role: 'user', content: 'What are your thoughts on the new feature proposal?', created_at: Date.now() - 9000 },
    { id: 'msg-4', conversation_id: 'conv-discussion', role: 'assistant', content: 'I think we should discuss the implications and consider various perspectives.', created_at: Date.now() - 8900 },

    // Decision messages
    { id: 'msg-5', conversation_id: 'conv-decision', role: 'user', content: 'We need to decide between React and Vue for the new project.', created_at: Date.now() - 8000 },
    { id: 'msg-6', conversation_id: 'conv-decision', role: 'assistant', content: 'Let\'s choose React based on team expertise and choose the best option for our needs.', created_at: Date.now() - 7900 },

    // Planning messages
    { id: 'msg-7', conversation_id: 'conv-planning', role: 'user', content: 'We need to plan the development timeline and schedule milestones.', created_at: Date.now() - 7000 },
    { id: 'msg-8', conversation_id: 'conv-planning', role: 'assistant', content: 'Let\'s create a roadmap with clear milestones and plan the sprint schedule.', created_at: Date.now() - 6900 },

    // Problem solving messages
    { id: 'msg-9', conversation_id: 'conv-problem-solving', role: 'user', content: 'There\'s a problem with the authentication system throwing errors.', created_at: Date.now() - 6000 },
    { id: 'msg-10', conversation_id: 'conv-problem-solving', role: 'assistant', content: 'Let me debug this issue and solve the authentication problem by fixing the token validation.', created_at: Date.now() - 5900 },

    // Learning messages
    { id: 'msg-11', conversation_id: 'conv-learning', role: 'user', content: 'How do React hooks work and what should I learn about state management?', created_at: Date.now() - 5000 },
    { id: 'msg-12', conversation_id: 'conv-learning', role: 'assistant', content: 'Let me explain how hooks work and help you understand the concepts behind state management.', created_at: Date.now() - 4900 },

    // Critical urgent messages
    { id: 'msg-13', conversation_id: 'conv-critical-urgent', role: 'user', content: 'URGENT: Production is down! Emergency fix needed immediately!', created_at: Date.now() - 4000 },
    { id: 'msg-14', conversation_id: 'conv-critical-urgent', role: 'assistant', content: 'This is critical - I\'ll handle this emergency situation ASAP and get the system back online.', created_at: Date.now() - 3900 },

    // High urgent messages
    { id: 'msg-15', conversation_id: 'conv-high-urgent', role: 'user', content: 'This is important and high priority - we have a deadline tomorrow.', created_at: Date.now() - 3000 },
    { id: 'msg-16', conversation_id: 'conv-high-urgent', role: 'assistant', content: 'I understand the priority and importance of meeting this deadline.', created_at: Date.now() - 2900 },

    // Medium urgent messages
    { id: 'msg-17', conversation_id: 'conv-medium-urgent', role: 'user', content: 'Can you handle this soon? Maybe this week when you can.', created_at: Date.now() - 2000 },
    { id: 'msg-18', conversation_id: 'conv-medium-urgent', role: 'assistant', content: 'I\'ll get to this soon, hopefully this week.', created_at: Date.now() - 1900 },

    // Normal messages
    { id: 'msg-19', conversation_id: 'conv-normal', role: 'user', content: 'How was your day? Any interesting projects?', created_at: Date.now() - 1000 },
    { id: 'msg-20', conversation_id: 'conv-normal', role: 'assistant', content: 'It was good, thanks for asking. Working on some routine tasks.', created_at: Date.now() - 900 },

    // Deadline messages
    { id: 'msg-21', conversation_id: 'conv-with-deadline', role: 'user', content: 'Please complete this by tomorrow morning.', created_at: Date.now() - 500 },
    { id: 'msg-22', conversation_id: 'conv-with-deadline', role: 'assistant', content: 'I\'ll make sure to finish this by tomorrow as requested.', created_at: Date.now() - 400 }
  ];

  const insertMsg = db.prepare(`
    INSERT OR REPLACE INTO messages (id, conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  messages.forEach(msg => {
    insertMsg.run(msg.id, msg.conversation_id, msg.role, msg.content, msg.created_at);
  });

  // Create entities
  const entities = [
    { id: 'entity-react', name: 'React', type: 'technical', created_at: Date.now() - 10000 },
    { id: 'entity-typescript', name: 'TypeScript', type: 'technical', created_at: Date.now() - 10000 },
    { id: 'entity-vue', name: 'Vue', type: 'technical', created_at: Date.now() - 8000 },
    { id: 'entity-auth', name: 'Authentication', type: 'technical', created_at: Date.now() - 6000 },
    { id: 'entity-hooks', name: 'React Hooks', type: 'concept', created_at: Date.now() - 5000 },
    { id: 'entity-production', name: 'Production System', type: 'technical', created_at: Date.now() - 4000 },
    { id: 'entity-project-alpha', name: 'Project Alpha', type: 'product', created_at: Date.now() - 400 },
    { id: 'entity-decision-react', name: 'React Selection Decision', type: 'decision', created_at: Date.now() - 300 }
  ];

  const insertEntity = db.prepare(`
    INSERT OR REPLACE INTO entities (id, name, type, normalized_name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  entities.forEach(entity => {
    insertEntity.run(entity.id, entity.name, entity.type, entity.name.toLowerCase(), entity.created_at, entity.created_at);
  });

  // Create entity mentions
  const mentions = [
    { id: 'mention-1', entity_id: 'entity-react', message_id: 'msg-1', conversation_id: 'conv-tech-discussion', mention_text: 'React', confidence: 0.9 },
    { id: 'mention-2', entity_id: 'entity-typescript', message_id: 'msg-1', conversation_id: 'conv-tech-discussion', mention_text: 'TypeScript', confidence: 0.9 },
    { id: 'mention-3', entity_id: 'entity-react', message_id: 'msg-2', conversation_id: 'conv-tech-discussion', mention_text: 'React', confidence: 0.9 },
    { id: 'mention-4', entity_id: 'entity-hooks', message_id: 'msg-2', conversation_id: 'conv-tech-discussion', mention_text: 'React hooks', confidence: 0.8 },
    { id: 'mention-5', entity_id: 'entity-react', message_id: 'msg-5', conversation_id: 'conv-decision', mention_text: 'React', confidence: 0.9 },
    { id: 'mention-6', entity_id: 'entity-vue', message_id: 'msg-5', conversation_id: 'conv-decision', mention_text: 'Vue', confidence: 0.9 },
    { id: 'mention-7', entity_id: 'entity-auth', message_id: 'msg-9', conversation_id: 'conv-problem-solving', mention_text: 'authentication', confidence: 0.8 },
    { id: 'mention-8', entity_id: 'entity-hooks', message_id: 'msg-11', conversation_id: 'conv-learning', mention_text: 'React hooks', confidence: 0.8 },
    { id: 'mention-9', entity_id: 'entity-production', message_id: 'msg-13', conversation_id: 'conv-critical-urgent', mention_text: 'Production', confidence: 0.9 }
  ];

  const insertMention = db.prepare(`
    INSERT OR REPLACE INTO entity_mentions (id, entity_id, message_id, conversation_id, mention_text, confidence)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  mentions.forEach(mention => {
    insertMention.run(mention.id, mention.entity_id, mention.message_id, mention.conversation_id, mention.mention_text, mention.confidence);
  });
}