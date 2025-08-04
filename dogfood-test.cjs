#!/usr/bin/env node

/**
 * Dogfooding Test Script for MCP Persistence Server
 * 
 * This script demonstrates real-world usage of the MCP Persistence Server
 * by creating conversations, adding messages, and using all Phase 2 features.
 */

const { spawn } = require('child_process');
const readline = require('readline');

// Test scenarios to execute
const testScenarios = [
  {
    name: "Basic Conversation Flow",
    steps: [
      { tool: "save_message", input: { role: "user", content: "Hi, I'm testing the MCP persistence server. Can you help me understand how it works?" }},
      { tool: "save_message", input: { role: "assistant", content: "I'd be happy to help! The MCP Persistence Server is designed to store and manage conversation history using SQLite. It provides tools for saving messages, searching through history, and now with Phase 2, it can generate summaries and retrieve context intelligently." }},
      { tool: "save_message", input: { role: "user", content: "That sounds great! Can you tell me more about the Phase 2 features?" }},
      { tool: "save_message", input: { role: "assistant", content: "Phase 2 introduces several powerful features:\n\n1. **Hierarchical Summarization**: Conversations can be summarized at different levels (brief, standard, detailed)\n2. **Smart Context Assembly**: The system can intelligently select relevant snippets based on queries\n3. **Progressive Detail Retrieval**: You can start with summaries and drill down to full messages\n4. **LLM Provider Management**: Configure multiple providers with fallback chains\n\nThese features help manage long conversations efficiently while maintaining context quality." }}
    ]
  },
  {
    name: "Search Functionality",
    steps: [
      { tool: "search_messages", input: { query: "Phase 2 features", limit: 5 }},
      { tool: "search_messages", input: { query: "summarization", matchType: "fuzzy" }}
    ]
  },
  {
    name: "Progressive Detail Retrieval",
    steps: [
      { tool: "get_conversation", input: { conversationId: "CONV_ID", includeMessages: false }},
      { tool: "get_progressive_detail", input: { conversationId: "CONV_ID", level: "brief" }},
      { tool: "get_progressive_detail", input: { conversationId: "CONV_ID", level: "standard", maxTokens: 2000 }},
      { tool: "get_progressive_detail", input: { conversationId: "CONV_ID", level: "detailed", expandContext: true }}
    ]
  },
  {
    name: "Context-Aware Snippet Retrieval",
    steps: [
      { tool: "get_relevant_snippets", input: { 
        query: "How does the summarization feature work?",
        maxTokens: 1500,
        strategy: "hybrid",
        minRelevance: 0.5
      }}
    ]
  },
  {
    name: "LLM Provider Configuration",
    steps: [
      { tool: "configure_llm_provider", input: {
        operation: "add",
        config: {
          name: "Local Ollama",
          type: "local",
          endpoint: "http://localhost:11434",
          modelName: "llama2",
          maxTokens: 4096,
          temperature: 0.7,
          isActive: true,
          priority: 100
        }
      }},
      { tool: "configure_llm_provider", input: { operation: "list" }}
    ]
  },
  {
    name: "Complex Conversation with Technical Content",
    steps: [
      { tool: "save_message", input: { role: "user", content: "Can you explain how the embedding system works in the search functionality?" }},
      { tool: "save_message", input: { role: "assistant", content: "The embedding system uses the Xenova/all-MiniLM-L6-v2 model to create 384-dimensional vector representations of messages. Here's how it works:\n\n```javascript\n// Initialize embedding manager\nconst embeddingManager = new EmbeddingManager(database);\nawait embeddingManager.initialize();\n\n// Generate embeddings for a message\nconst embedding = await embeddingManager.generateEmbedding(messageContent);\n```\n\nThe embeddings are cached in SQLite for performance and used for semantic search operations." }},
      { tool: "save_message", input: { role: "user", content: "How does the caching mechanism improve performance?" }},
      { tool: "save_message", input: { role: "assistant", content: "The caching mechanism improves performance in several ways:\n\n1. **Embedding Cache**: Stores computed embeddings to avoid recomputation\n2. **Summary Cache**: Stores generated summaries with TTL-based expiration\n3. **Search Result Cache**: Caches frequent search queries\n\nThe system uses SQLite for all caching with automatic cleanup of expired entries." }}
    ]
  },
  {
    name: "Semantic and Hybrid Search",
    steps: [
      { tool: "search_messages", input: { query: "caching performance optimization", limit: 10 }},
      { tool: "get_database_stats", input: { includeDetails: true }}
    ]
  }
];

// Server process
let serverProcess;
let conversationId;

// Start the MCP server with dogfood configuration
async function startServer() {
  console.log('🚀 Starting MCP Persistence Server with dogfood configuration...\n');
  
  serverProcess = spawn('node', ['dist/index.js'], {
    env: {
      ...process.env,
      MCP_CONFIG_PATH: './dogfood-env.json'
    },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Set up JSON-RPC communication
  const rl = readline.createInterface({
    input: serverProcess.stdout,
    output: process.stdout,
    terminal: false
  });

  serverProcess.stderr.on('data', (data) => {
    const message = data.toString();
    if (message.includes('[INFO]') || message.includes('Server started successfully')) {
      console.log(`Server: ${message.trim()}`);
    }
  });

  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return { serverProcess, rl };
}

// Send JSON-RPC request to server
async function sendRequest(method, params) {
  const request = {
    jsonrpc: "2.0",
    id: Date.now(),
    method: `tools/call`,
    params: {
      name: method,
      arguments: params
    }
  };

  console.log(`\n📤 Calling ${method}:`);
  console.log(JSON.stringify(params, null, 2));
  
  serverProcess.stdin.write(JSON.stringify(request) + '\n');
  
  // Wait for response
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 10000);

    const handler = (line) => {
      try {
        const response = JSON.parse(line);
        if (response.id === request.id) {
          clearTimeout(timeout);
          serverProcess.stdout.removeListener('data', handler);
          
          if (response.error) {
            console.log(`\n❌ Error: ${response.error.message}`);
            reject(response.error);
          } else {
            console.log(`\n✅ Response received`);
            if (response.result?.content?.[0]?.text) {
              const result = JSON.parse(response.result.content[0].text);
              console.log(JSON.stringify(result, null, 2));
              resolve(result);
            } else {
              resolve(response.result);
            }
          }
        }
      } catch (e) {
        // Not JSON, ignore
      }
    };

    serverProcess.stdout.on('data', handler);
  });
}

// Execute a test scenario
async function executeScenario(scenario) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📋 Scenario: ${scenario.name}`);
  console.log(`${'='.repeat(60)}`);

  for (const step of scenario.steps) {
    try {
      // Replace CONV_ID placeholder with actual conversation ID
      if (step.input.conversationId === 'CONV_ID' && conversationId) {
        step.input.conversationId = conversationId;
      }

      const result = await sendRequest(step.tool, step.input);
      
      // Capture conversation ID from first message
      if (step.tool === 'save_message' && result.data?.conversation?.id && !conversationId) {
        conversationId = result.data.conversation.id;
        console.log(`\n🔖 Conversation ID: ${conversationId}`);
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`\n❌ Step failed: ${error.message}`);
    }
  }
}

// Main dogfooding flow
async function main() {
  console.log('🐕 MCP Persistence Server Dogfooding Test');
  console.log('=========================================\n');
  console.log('This test will demonstrate real-world usage of the server');
  console.log('using a separate dogfood database.\n');

  try {
    // Start server
    const { rl } = await startServer();
    
    // Give server time to fully initialize
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Execute all test scenarios
    for (const scenario of testScenarios) {
      await executeScenario(scenario);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n\n✨ Dogfooding test completed successfully!');
    console.log(`📊 Total scenarios executed: ${testScenarios.length}`);
    console.log(`💾 Database: dogfood-conversations.db`);
    
    // Final statistics
    console.log('\n📈 Final Statistics:');
    await sendRequest('get_database_stats', { includeDetails: false });

  } catch (error) {
    console.error('\n❌ Dogfooding test failed:', error.message);
  } finally {
    // Cleanup
    if (serverProcess) {
      console.log('\n🛑 Shutting down server...');
      serverProcess.kill('SIGTERM');
    }
    process.exit(0);
  }
}

// Run the dogfooding test
main().catch(console.error);