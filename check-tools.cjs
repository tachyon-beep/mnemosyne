#!/usr/bin/env node

/**
 * Check what tools are available
 */

const { MCPServer } = require('./dist/server/MCPServer');

async function checkTools() {
  console.log('🔍 Checking available tools');
  
  const server = new MCPServer({
    dbPath: ':memory:',
    logLevel: 'error'
  });
  
  try {
    await server.start();
    console.log('✅ Server started');
    
    const registry = server.getToolRegistry();
    const toolNames = registry.getToolNames();
    
    console.log('📋 Available tools:', toolNames);
    console.log('🔢 Total tools:', toolNames.length);
    
    // Check specifically for proactive tools
    const proactiveTools = toolNames.filter(name => 
      name.includes('proactive') || 
      name.includes('conflict') || 
      name.includes('context') || 
      name.includes('tag')
    );
    
    console.log('🤖 Proactive tools:', proactiveTools);
    
    await server.stop();
    console.log('✅ Server stopped');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

checkTools().catch(console.error);