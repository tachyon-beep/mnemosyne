#!/usr/bin/env node

const { spawn } = require('child_process');

async function testKnowledgeGraphTool() {
  console.log('Testing get_knowledge_graph tool...');
  
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  
  server.stdout.on('data', (data) => {
    responseData += data.toString();
  });

  server.stderr.on('data', (data) => {
    console.error('Server stderr:', data.toString());
  });

  // Wait for server to initialize
  await new Promise(resolve => setTimeout(resolve, 2000));

  const testRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "get_knowledge_graph",
      arguments: {
        center_entity: "Claude",
        max_degrees: 2,
        min_strength: 0.3,
        include_clusters: true,
        include_paths: true,
        max_entities: 20
      }
    }
  };

  server.stdin.write(JSON.stringify(testRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 3000));

  server.kill();

  console.log('\n=== get_knowledge_graph Tool Response ===');
  
  // Parse responses
  const lines = responseData.split('\n').filter(line => line.trim());
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      if (response.id === 1) {
        console.log('Status:', response.result ? 'SUCCESS' : 'FAILED');
        if (response.result) {
          const content = response.result.content?.[0]?.text;
          if (content) {
            const parsed = JSON.parse(content);
            console.log('Center Entity:', parsed.center_entity?.name || 'Not found');
            console.log('Connected Entities:', parsed.graph?.total_connected_entities || 0);
            console.log('Success:', parsed.success || false);
            
            if (parsed.error) {
              console.log('Error:', parsed.error);
            }
          }
        }
        if (response.error) {
          console.log('JSON-RPC Error:', response.error.message);
        }
      }
    } catch (e) {
      // Skip non-JSON lines
    }
  }
}

testKnowledgeGraphTool().catch(console.error);