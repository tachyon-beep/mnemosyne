/**
 * Debug the network access issue in transformers.js
 */

import https from 'https';
import http from 'http';

async function testNetworkAccess() {
  console.log('🌐 Testing Network Access to Hugging Face Hub');
  console.log('=' .repeat(50));

  const testUrl = 'https://huggingface.co/all-MiniLM-L6-v2/resolve/main/tokenizer.json';
  
  console.log(`\n🔍 Testing access to: ${testUrl}`);

  // Test 1: Basic fetch
  try {
    console.log('\n📡 Test 1: Basic fetch...');
    const response = await fetch(testUrl);
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Headers:`, Object.fromEntries(response.headers.entries()));
    
    if (response.status === 200) {
      const content = await response.text();
      console.log(`  Content length: ${content.length}`);
      console.log(`  Content preview: ${content.substring(0, 100)}...`);
    }
  } catch (error) {
    console.log(`  ❌ Fetch failed: ${error}`);
  }

  // Test 2: Node.js HTTP request
  try {
    console.log('\n📡 Test 2: Node.js HTTPS request...');
    const response = await new Promise((resolve, reject) => {
      const req = https.request(testUrl, (res) => {
        console.log(`  Status: ${res.statusCode} ${res.statusMessage}`);
        console.log(`  Headers:`, res.headers);
        
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, data }));
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      req.end();
    });
    
    console.log(`  ✅ Request successful`);
  } catch (error) {
    console.log(`  ❌ HTTPS request failed: ${error}`);
  }

  // Test 3: Check if we're in a restricted environment
  console.log('\n🔒 Environment checks:');
  console.log(`  NODE_ENV: ${process.env.NODE_ENV || 'undefined'}`);
  console.log(`  HTTP_PROXY: ${process.env.HTTP_PROXY || 'undefined'}`);
  console.log(`  HTTPS_PROXY: ${process.env.HTTPS_PROXY || 'undefined'}`);
  console.log(`  NO_PROXY: ${process.env.NO_PROXY || 'undefined'}`);
  
  // Check for other HF environment variables
  console.log('\n🤗 Hugging Face environment variables:');
  const hfVars = Object.keys(process.env).filter(key => key.startsWith('HF_'));
  if (hfVars.length > 0) {
    hfVars.forEach(key => {
      console.log(`  ${key}: ${process.env[key]}`);
    });
  } else {
    console.log('  No HF_ environment variables found');
  }

  // Test 4: Try with User-Agent (like transformers.js does)
  try {
    console.log('\n📡 Test 4: Fetch with transformers.js User-Agent...');
    const response = await fetch(testUrl, {
      headers: {
        'User-Agent': 'transformers.js/3.7.1; is_ci/false;'
      }
    });
    console.log(`  Status: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.log(`  ❌ Fetch with User-Agent failed: ${error}`);
  }
}

testNetworkAccess().catch(console.error);