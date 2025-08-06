#!/usr/bin/env node

const { spawn } = require('child_process');

async function testLLMProviderTool() {
  console.log('Testing configure_llm_provider tool...');
  
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

  // Test list operation first
  const listRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "configure_llm_provider",
      arguments: {
        operation: "list"
      }
    }
  };

  server.stdin.write(JSON.stringify(listRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test add operation
  const addRequest = {
    jsonrpc: "2.0", 
    id: 2,
    method: "tools/call",
    params: {
      name: "configure_llm_provider",
      arguments: {
        operation: "add",
        config: {
          name: "test-provider",
          type: "local",
          modelName: "test-model",
          priority: 1,
          isActive: true,
          endpoint: "http://localhost:11434"
        }
      }
    }
  };

  server.stdin.write(JSON.stringify(addRequest) + '\n');

  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));

  server.kill();

  console.log('\n=== configure_llm_provider Tool Responses ===');
  
  // Parse responses
  const lines = responseData.split('\n').filter(line => line.trim());
  let testCount = 0;
  
  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      if (response.id === 1 || response.id === 2) {
        testCount++;
        console.log(`\nTest ${response.id} (${response.id === 1 ? 'list' : 'add'}):`);
        console.log('Status:', response.result ? 'SUCCESS' : 'FAILED');
        
        if (response.result) {
          const content = response.result.content?.[0]?.text;
          if (content) {
            const parsed = JSON.parse(content);
            console.log('Success:', parsed.success || false);
            if (parsed.providers) {
              console.log('Providers count:', parsed.providers.length);
            }
            if (parsed.operation) {
              console.log('Operation:', parsed.operation);
            }
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
  
  console.log(`\nCompleted ${testCount}/2 tests`);
}

testLLMProviderTool().catch(console.error);