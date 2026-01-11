#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set');
  process.exit(1);
}

async function createReplyFile(messageId) {
  const repliesDir = join(homedir(), '.telegram-mcp-replies');
  await mkdir(repliesDir, { recursive: true });

  const replyData = {
    messageId,
    chatId: CHAT_ID,
    replyText: 'OK - Simulated webhook reply!',
    timestamp: Date.now(),
    status: 'pending',
  };

  const replyPath = join(repliesDir, `${messageId}.json`);
  await writeFile(replyPath, JSON.stringify(replyData, null, 2));
  console.log(`\n✅ Created reply file for message ${messageId}`);
}

async function testPolling() {
  const server = spawn('node', ['dist/index.js'], {
    env: { ...process.env, TELEGRAM_BOT_TOKEN: BOT_TOKEN, TELEGRAM_CHAT_ID: CHAT_ID },
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let requestId = 0;
  const pendingRequests = new Map();

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
      }, 20000);
    });
  }

  try {
    console.log('\n=== Polling Test ===\n');

    // Step 1: Send a message first to get things warmed up
    console.log('Step 1: Sending initial message...');
    await sendRequest('tools/call', {
      name: 'send_and_wait',
      arguments: {
        message: '🧪 Warmup message',
        waitForReply: false
      }
    });

    // Step 2: Now send with polling - this will send a NEW message
    console.log('\nStep 2: Starting polling test...');
    console.log('A new message will be sent to Telegram.');
    console.log('Reply file will be created 3 seconds after send.\n');

    // Start the polling request
    const pollPromise = sendRequest('tools/call', {
      name: 'send_and_wait',
      arguments: {
        message: '🧪 POLLING TEST - Reply should be auto-simulated!',
        waitForReply: true,
        timeout: 10,
        pollInterval: 2
      }
    });

    // Wait 3 seconds for the message to be sent, then create reply
    setTimeout(async () => {
      // We need to find the latest sent message ID
      const { readFile } = await import('fs/promises');
      try {
        const sentFile = join(homedir(), '.telegram-mcp-sent', 'messages.json');
        const content = await readFile(sentFile, 'utf-8');
        const messages = JSON.parse(content);
        const entries = Object.entries(messages);
        const latest = entries.sort((a, b) => b[1].timestamp - a[1].timestamp)[0];
        const messageId = parseInt(latest[0]);
        await createReplyFile(messageId);
      } catch (e) {
        console.log('Could not auto-detect message ID:', e.message);
      }
    }, 3000);

    const pollResult = await pollPromise;
    const pollText = pollResult.result?.content?.[0]?.text || pollResult.error?.message || 'No response';
    console.log(`\n📥 Polling result: ${pollText}`);

    console.log('\n=== Test Complete ===\n');

  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    server.kill();
  }

  server.on('exit', () => process.exit(0));
}

console.log('Starting polling test...');
setTimeout(() => testPolling(), 500);
