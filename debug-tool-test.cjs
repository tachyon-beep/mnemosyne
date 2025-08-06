#!/usr/bin/env node

/**
 * Debug Tool Test - Check Phase 4 tool functionality
 */

const { MCPServer } = require('./dist/server/MCPServer');

async function debugTest() {
  console.log('🔍 Starting Debug Test');
  
  const server = new MCPServer({
    dbPath: ':memory:',
    logLevel: 'error'
  });
  
  try {
    await server.start();
    console.log('✅ Server started');
    
    // Test save_message first
    const registry = server.getToolRegistry();
    console.log('✅ Got tool registry');
    
    const result = await registry.executeTool('save_message', {
      role: 'user',
      content: 'Test message for Phase 4'
    });
    
    console.log('📧 Save message result:', JSON.stringify(result, null, 2));
    
    const conversationId = result?.result?.conversation?.id;
    if (conversationId) {
      console.log('✅ Got conversation ID:', conversationId);
      
      // Test proactive insights tool
      try {
        const insightsResult = await registry.executeTool('get_proactive_insights', {
          conversationId: conversationId
        });
        console.log('🔮 Proactive insights result:', JSON.stringify(insightsResult, null, 2));
      } catch (error) {
        console.log('❌ Proactive insights error:', error.message);
      }
      
    } else {
      console.log('❌ No conversation ID found');
    }
    
    await server.stop();
    console.log('✅ Server stopped');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
    console.log('Stack:', error.stack);
  }
}

debugTest().catch(console.error);