#!/usr/bin/env node

const { spawn } = require('child_process');

async function runFinalComprehensiveTest() {
  console.log('🚀 Running Final Comprehensive Test of All 14 MCP Tools');
  console.log('=' .repeat(60));
  
  const server = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  
  server.stdout.on('data', (data) => {
    responseData += data.toString();
  });

  server.stderr.on('data', (data) => {
    // Suppress embedding model warnings for cleaner output
    if (!data.toString().includes('dtype not specified')) {
      console.error('Server stderr:', data.toString());
    }
  });

  // Wait for server to initialize
  await new Promise(resolve => setTimeout(resolve, 3000));

  const testResults = {};
  let requestId = 0;

  // Define all tool tests
  const toolTests = [
    {
      name: 'save_message',
      args: {
        role: 'user',
        content: 'Testing the MCP persistence system'
      }
    },
    {
      name: 'search_messages',
      args: {
        query: 'testing',
        limit: 10
      }
    },
    {
      name: 'get_conversations',
      args: {
        limit: 10
      }
    },
    {
      name: 'semantic_search',
      args: {
        query: 'MCP system testing',
        limit: 5
      }
    },
    {
      name: 'hybrid_search',
      args: {
        query: 'persistence testing',
        limit: 5
      }
    },
    {
      name: 'get_relevant_snippets',
      args: {
        query: 'testing system'
      }
    },
    {
      name: 'get_progressive_detail',
      args: {
        conversationId: '00000000-0000-0000-0000-000000000001',
        level: 'brief'
      }
    },
    {
      name: 'get_context_summary',
      args: {
        query: 'system testing'
      }
    },
    {
      name: 'configure_llm_provider',
      args: {
        operation: 'list'
      }
    },
    {
      name: 'get_entity_history',
      args: {
        entity_name: 'MCP'
      }
    },
    {
      name: 'find_related_conversations',
      args: {
        entities: ['testing', 'system']
      }
    },
    {
      name: 'get_knowledge_graph',
      args: {
        center_entity: 'MCP'
      }
    },
    {
      name: 'delete_conversation',
      args: {
        conversationId: '00000000-0000-0000-0000-000000000999'
      }
    },
    {
      name: 'get_conversation',
      args: {
        conversationId: '00000000-0000-0000-0000-000000000001'
      }
    }
  ];

  // Send all test requests
  for (const test of toolTests) {
    requestId++;
    const request = {
      jsonrpc: "2.0",
      id: requestId,
      method: "tools/call",
      params: {
        name: test.name,
        arguments: test.args
      }
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    testResults[requestId] = test.name;
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  // Wait for all responses
  await new Promise(resolve => setTimeout(resolve, 5000));

  server.kill();

  // Parse and analyze results
  console.log('\n📊 Test Results Summary');
  console.log('-'.repeat(60));
  
  const lines = responseData.split('\n').filter(line => line.trim());
  const results = {};
  let successCount = 0;
  let totalTests = 0;

  for (const line of lines) {
    try {
      const response = JSON.parse(line);
      if (response.id && testResults[response.id]) {
        totalTests++;
        const toolName = testResults[response.id];
        const isSuccess = !!response.result && !response.error;
        results[toolName] = {
          success: isSuccess,
          error: response.error?.message,
          hasContent: !!response.result?.content?.[0]?.text
        };
        
        if (isSuccess) successCount++;
        
        console.log(`✅ ${toolName.padEnd(25)} ${isSuccess ? 'PASS' : 'FAIL'} ${response.error ? '- ' + response.error.message : ''}`);
      }
    } catch (e) {
      // Skip non-JSON lines
    }
  }

  console.log('\n🎯 Final Statistics');
  console.log('-'.repeat(60));
  console.log(`Total Tools Tested: ${totalTests}/14`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${totalTests - successCount}`);
  console.log(`Success Rate: ${Math.round((successCount / totalTests) * 100)}%`);

  console.log('\n🏆 Package Readiness Status');
  console.log('-'.repeat(60));
  if (successCount === totalTests && totalTests === 14) {
    console.log('✅ ALL SYSTEMS OPERATIONAL');
    console.log('✅ READY FOR PACKAGE PUBLICATION');
    console.log('✅ Version 2.0.0 APPROVED');
  } else if (successCount >= 12) {
    console.log('⚠️  MOSTLY OPERATIONAL - Minor issues detected');
  } else {
    console.log('❌ NOT READY - Multiple issues detected');
  }

  console.log('\n📦 Next Steps:');
  console.log('1. npm publish');  
  console.log('2. git tag v2.0.0');
  console.log('3. Update changelog');
  
  return {
    totalTests,
    successCount,
    successRate: Math.round((successCount / totalTests) * 100),
    allPassed: successCount === totalTests && totalTests === 14
  };
}

runFinalComprehensiveTest()
  .then(result => {
    process.exit(result.allPassed ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });