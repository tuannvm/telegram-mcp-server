#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set');
  process.exit(1);
}

// Spawn MCP server
const server = spawn('node', ['dist/index.js'], {
  env: { ...process.env, TELEGRAM_BOT_TOKEN: BOT_TOKEN, TELEGRAM_CHAT_ID: CHAT_ID },
  stdio: ['pipe', 'pipe', 'inherit']
});

let requestId = 0;
const pendingRequests = new Map();

// Read responses from server
const readline = createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

readline.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    console.log('📥 Response:', JSON.stringify(response, null, 2));

    const id = response.id;
    if (pendingRequests.has(id)) {
      const { resolve } = pendingRequests.get(id);
      resolve(response);
    }
  } catch (e) {
    console.log('📝 Server output:', line);
  }
});

function sendRequest(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id
    };

    pendingRequests.set(id, { resolve, reject });

    const json = JSON.stringify(request);
    console.log('📤 Request:', json);
    server.stdin.write(json + '\n');

    // Timeout after 30 seconds
    setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        reject(new Error('Request timeout'));
      }
    }, 30000);
  });
}

async function runTests() {
  try {
    console.log('\n=== Test 1: List Tools ===');
    await sendRequest('tools/list');

    console.log('\n=== Test 2: Telegram Status ===');
    await sendRequest('tools/call', {
      name: 'telegram_status',
      arguments: {}
    });

    console.log('\n=== Test 3: Send Message (no polling) ===');
    await sendRequest('tools/call', {
      name: 'send_and_wait',
      arguments: {
        message: '🧪 MCP v0.1.0 Test\n\nReply with OK to test bidirectional!',
        waitForReply: false
      }
    });

    console.log('\n=== Test 4: Check for Replies ===');
    await sendRequest('tools/call', {
      name: 'check_replies',
      arguments: {}
    });

    console.log('\n=== All Tests Complete ===');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    server.kill();
  }
}

server.on('error', (err) => {
  console.error('Server error:', err);
});

server.on('exit', () => {
  console.log('Server exited');
  process.exit(0);
});

setTimeout(() => {
  console.log('Starting tests...');
  runTests();
}, 500);
