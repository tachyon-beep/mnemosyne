/**
 * Summary Generation Example
 * 
 * This example demonstrates how to use the SummaryGenerator service
 * for hierarchical conversation summarization.
 */

import { SummaryGenerator } from '../src/context/SummaryGenerator.js';
import { ProviderManager } from '../src/context/ProviderManager.js';
import { SummaryRepository } from '../src/storage/repositories/SummaryRepository.js';
import { SummaryHistoryRepository } from '../src/storage/repositories/SummaryHistoryRepository.js';
import { CacheRepository } from '../src/storage/repositories/CacheRepository.js';
import { TokenCounter } from '../src/context/TokenCounter.js';
import { Message } from '../src/types/interfaces.js';

// Example conversation data
const sampleConversation: Message[] = [
  {
    id: 'msg1',
    conversationId: 'conv_demo_2024',
    role: 'user',
    content: 'I need help implementing a user authentication system for our web application. We want to use JWT tokens and need role-based access control.',
    createdAt: Date.now() - 600000, // 10 minutes ago
    metadata: {}
  },
  {
    id: 'msg2',
    conversationId: 'conv_demo_2024',
    role: 'assistant',
    content: 'I can help you implement JWT authentication with RBAC. Here\'s what we\'ll need to do:\n\n1. Set up JWT token generation and validation\n2. Create user roles and permissions system\n3. Implement middleware for route protection\n4. Add login/logout endpoints\n\nWhich backend framework are you using?',
    createdAt: Date.now() - 480000, // 8 minutes ago
    metadata: {}
  },
  {
    id: 'msg3',
    conversationId: 'conv_demo_2024',
    role: 'user',
    content: 'We\'re using Node.js with Express. I also discovered a security issue where users can access admin routes even without proper permissions. This needs to be fixed urgently.',
    createdAt: Date.now() - 360000, // 6 minutes ago
    metadata: {}
  },
  {
    id: 'msg4',
    conversationId: 'conv_demo_2024',
    role: 'assistant',
    content: 'That\'s a critical security vulnerability! Let\'s fix this immediately. Here\'s a secure implementation:\n\n```javascript\nconst jwt = require(\'jsonwebtoken\');\n\n// Middleware for JWT verification\nconst authenticateToken = (req, res, next) => {\n  const authHeader = req.headers[\'authorization\'];\n  const token = authHeader && authHeader.split(\' \')[1];\n  \n  if (!token) {\n    return res.sendStatus(401);\n  }\n  \n  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {\n    if (err) return res.sendStatus(403);\n    req.user = user;\n    next();\n  });\n};\n\n// Role-based authorization\nconst authorizeRole = (roles) => {\n  return (req, res, next) => {\n    if (!req.user || !roles.includes(req.user.role)) {\n      return res.sendStatus(403);\n    }\n    next();\n  };\n};\n```\n\nApply this to your admin routes: `app.get(\'/admin/*\', authenticateToken, authorizeRole([\'admin\']), handler);`',
    createdAt: Date.now() - 240000, // 4 minutes ago
    metadata: {}
  },
  {
    id: 'msg5',
    conversationId: 'conv_demo_2024',
    role: 'user',
    content: 'Perfect! I\'ve implemented the middleware and the security issue is resolved. The admin routes are now properly protected. Should I also implement refresh tokens for better security?',
    createdAt: Date.now() - 120000, // 2 minutes ago
    metadata: {}
  },
  {
    id: 'msg6',
    conversationId: 'conv_demo_2024',
    role: 'assistant',
    content: 'Excellent! Yes, refresh tokens are a great security practice. Here\'s why and how:\n\n**Benefits:**\n- Short-lived access tokens (15 mins) reduce exposure window\n- Refresh tokens can be revoked if compromised\n- Better user experience (no frequent login)\n\n**Implementation:**\n1. Generate both access and refresh tokens on login\n2. Store refresh tokens securely (httpOnly cookies or secure storage)\n3. Create a refresh endpoint that validates refresh token and issues new access token\n4. Implement token rotation for maximum security\n\nWould you like me to provide the refresh token implementation code?',
    createdAt: Date.now(),
    metadata: {}
  }
];

/**
 * Example function demonstrating SummaryGenerator usage
 */
async function demonstrateSummaryGeneration() {
  console.log('=== SummaryGenerator Demonstration ===\n');

  // Note: In a real implementation, you would initialize these with actual database connections
  // and properly configured providers. This is just a conceptual example.
  
  try {
    // 1. Create mock instances (in real usage, these would be properly initialized)
    const providerManager = new ProviderManager({
      defaultStrategy: 'quality',
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 60000
    });
    
    const summaryRepository = {} as SummaryRepository; // Mock
    const historyRepository = {} as SummaryHistoryRepository; // Mock  
    const cacheRepository = {} as CacheRepository; // Mock
    const tokenCounter = new TokenCounter({
      defaultModel: 'gpt-3.5-turbo',
      enableCaching: true
    });

    // 2. Initialize SummaryGenerator
    const summaryGenerator = new SummaryGenerator(
      providerManager,
      summaryRepository,
      historyRepository,
      cacheRepository,
      tokenCounter,
      {
        defaultLevel: 'standard',
        enableValidation: true,
        minQualityScore: 0.7,
        enableCaching: true,
        temporalCompression: {
          recentThresholdHours: 24,
          mediumThresholdDays: 7,
          forceOldBrief: true
        }
      }
    );

    // 3. Demonstrate different summary levels
    const levels: Array<'brief' | 'standard' | 'detailed'> = ['brief', 'standard', 'detailed'];
    
    for (const level of levels) {
      console.log(`\n--- ${level.toUpperCase()} SUMMARY ---`);
      
      // In a real implementation, this would call the LLM
      // For demo purposes, we'll show what the request would look like
      const request = {
        messages: sampleConversation,
        conversationId: 'conv_demo_2024',
        level,
        focusTopics: ['JWT authentication', 'security vulnerability', 'role-based access'],
        providerStrategy: 'quality' as const
      };

      console.log('Request configuration:');
      console.log(`- Messages: ${request.messages.length}`);
      console.log(`- Level: ${request.level}`);
      console.log(`- Focus topics: ${request.focusTopics?.join(', ')}`);
      console.log(`- Strategy: ${request.providerStrategy}`);
      console.log();

      // Show what the temporal logic would determine
      const now = Date.now();
      const oldestMessage = Math.min(...sampleConversation.map(m => m.createdAt));
      const ageHours = (now - oldestMessage) / (1000 * 60 * 60);
      
      console.log('Temporal Analysis:');
      console.log(`- Conversation age: ${ageHours.toFixed(1)} hours`);
      console.log(`- Auto-determined level: ${ 
        ageHours <= 24 ? 'detailed' : 
        ageHours <= 168 ? 'standard' : 'brief'
      }`);
      console.log(`- Requested level: ${level}`);
      console.log();

      // Show expected token counts
      const expectedTokens = {
        brief: '50-100 tokens',
        standard: '200-300 tokens', 
        detailed: '500-1000 tokens'
      };
      
      console.log(`Expected output: ${expectedTokens[level]}`);
      console.log();

      // Show conversation type detection
      const content = sampleConversation.map(m => m.content.toLowerCase()).join(' ');
      const conversationType = 
        content.includes('code') || content.includes('jwt') || content.includes('security') 
          ? 'technical'
        : content.includes('plan') || content.includes('implement') 
          ? 'planning'
        : 'general';
      
      console.log(`Detected conversation type: ${conversationType}`);
      console.log();
    }

    // 4. Demonstrate batch processing
    console.log('\n--- BATCH PROCESSING EXAMPLE ---');
    const batchRequests = [
      { messages: sampleConversation.slice(0, 2), conversationId: 'conv_1', level: 'brief' as const },
      { messages: sampleConversation.slice(2, 4), conversationId: 'conv_2', level: 'standard' as const },
      { messages: sampleConversation.slice(4, 6), conversationId: 'conv_3', level: 'detailed' as const }
    ];

    console.log('Batch request configuration:');
    console.log(`- Number of requests: ${batchRequests.length}`);
    console.log(`- Batch strategy: optimal (parallel with concurrency limit)`);
    console.log(`- Max concurrency: 3`);
    console.log();

    batchRequests.forEach((req, index) => {
      console.log(`Request ${index + 1}:`);
      console.log(`  - Messages: ${req.messages.length}`);
      console.log(`  - Level: ${req.level}`);
      console.log(`  - Conversation ID: ${req.conversationId}`);
    });

    // 5. Show validation metrics that would be applied
    console.log('\n--- QUALITY VALIDATION METRICS ---');
    console.log('Each generated summary would be validated on:');
    console.log('- Information Coverage (30% weight): How well key points are captured');
    console.log('- Entity Preservation (25% weight): Names, dates, technical terms preserved');
    console.log('- Consistency (25% weight): No contradictions with original content');
    console.log('- Token Compliance (10% weight): Within expected token range');
    console.log('- Factual Accuracy (10% weight): No hallucinated information');
    console.log();
    console.log('Minimum acceptable quality score: 0.7');
    console.log('Failed summaries would be regenerated up to 3 times');

    // 6. Show caching behavior
    console.log('\n--- CACHING BEHAVIOR ---');
    console.log('- Summaries cached by conversation ID and level');
    console.log('- Cache TTL: 24 hours');
    console.log('- Cache invalidation when conversation updated');
    console.log('- Cache key format: "summary:{conversationId}:{level}"');

    console.log('\n=== Demonstration Complete ===');
    console.log('\nNote: This is a conceptual demonstration.');
    console.log('In a real implementation, the SummaryGenerator would:');
    console.log('1. Connect to actual LLM providers (OpenAI, Ollama, etc.)');
    console.log('2. Store results in SQLite database');
    console.log('3. Generate actual summaries using sophisticated prompts');
    console.log('4. Validate quality using NLP techniques');
    console.log('5. Handle provider failures with automatic fallback');

  } catch (error) {
    console.error('Error in demonstration:', error);
  }
}

// Run the demonstration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demonstrateSummaryGeneration().catch(console.error);
}

export { demonstrateSummaryGeneration, sampleConversation };