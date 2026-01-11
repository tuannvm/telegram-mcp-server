#!/usr/bin/env node

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { spawn } from 'child_process';
import { createInterface } from 'readline';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set');
  process.exit(1);
}

async function simulateWebhookReply(messageId, replyText) {
  const repliesDir = join(homedir(), '.telegram-mcp-replies');
  await mkdir(repliesDir, { recursive: true });

  const replyData = {
    messageId,
    chatId: CHAT_ID,
    replyText,
    timestamp: Date.now(),
    status: 'pending',
  };

  const replyPath = join(repliesDir, `${messageId}.json`);
  await writeFile(replyPath, JSON.stringify(replyData, null, 2));
  console.log(`\n✅ Simulated webhook reply written to: ${replyPath}`);
  console.log(`   Message ID: ${messageId}`);
  console.log(`   Reply: "${replyText}"`);
}

async function runBidirectionalTest() {
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
      const id = response.id;
      if (pendingRequests.has(id)) {
        const { resolve } = pendingRequests.get(id);
        resolve(response);
      }
    } catch (e) {
      // Ignore non-JSON lines
    }
  });

  function sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++requestId;
      const request = { jsonrpc: '2.0', method, params, id };
      pendingRequests.set(id, { resolve, reject });
      server.stdin.write(JSON.stringify(request) + '\n');

      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  try {
    console.log('\n=== Bidirectional Test ===\n');

    // Step 1: Send message
    console.log('Step 1: Sending message to Telegram...');
    const sendResult = await sendRequest('tools/call', {
      name: 'send_and_wait',
      arguments: {
        message: '🧪 Bidirectional Test\n\nReply with "OK" to test!',
        waitForReply: false
      }
    });

    const text = sendResult.result.content[0].text;
    const match = text.match(/ID: (\d+)/);
    const messageId = match ? parseInt(match[1]) : null;

    if (messageId) {
      console.log(`✓ Message sent! ID: ${messageId}`);
      console.log('\n⏳ Waiting for you to reply on Telegram (20 seconds)...');

      // Wait for real reply from user
      await new Promise(r => setTimeout(r, 20000));

      // Step 2: Check for replies
      console.log('\nStep 2: Checking for replies...');
      const replyResult = await sendRequest('tools/call', {
        name: 'check_replies',
        arguments: {}
      });

      const replyText = replyResult.result.content[0].text;
      if (replyText.includes('No pending replies')) {
        console.log('⏱ No reply received yet.');
        console.log('\n💡 Tip: Set up a webhook handler to automatically capture replies.');
        console.log('   See docs/webhook-example.md for details.');
      } else {
        console.log(`✅ Reply found:\n${replyText}`);
      }

    } else {
      console.error('✗ Failed to send message');
    }

    console.log('\n=== Test Complete ===\n');

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    server.kill();
  }

  server.on('exit', () => process.exit(0));
}

console.log('Starting bidirectional test...');
setTimeout(() => runBidirectionalTest(), 500);
