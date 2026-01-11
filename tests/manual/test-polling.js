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
    stdio: ['pipe', 'pipe', 'inherit']
  });

  let requestId = 0;
  const pendingRequests = new Map();
  let sentMessageId = null;

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
      }, 35000);
    });
  }

  try {
    console.log('\n=== Polling Test ===\n');

    // Step 1: Send message (get ID)
    console.log('Step 1: Sending message...');
    const sendResult = await sendRequest('tools/call', {
      name: 'send_and_wait',
      arguments: {
        message: '🧪 Polling Test',
        waitForReply: false
      }
    });

    const text = sendResult.result.content[0].text;
    const match = text.match(/ID: (\d+)/);
    sentMessageId = match ? parseInt(match[1]) : null;

    if (sentMessageId) {
      console.log(`✓ Message sent! ID: ${sentMessageId}`);

      // Step 2: Simulate webhook reply after 2 seconds
      setTimeout(async () => {
        await createReplyFile(sentMessageId);
      }, 2000);

      // Step 3: Send polling request
      console.log('\nStep 2: Polling for reply (15s timeout, 2s interval)...');
      console.log('Reply will be simulated in 2 seconds...\n');

      const pollResult = await sendRequest('tools/call', {
        name: 'send_and_wait',
        arguments: {
          message: '🧪 Different message',
          waitForReply: true,
          timeout: 15,
          pollInterval: 2
        }
      });

      const pollText = pollResult.result?.content?.[0]?.text || pollResult.error?.message || 'No response';
      console.log(`\n📥 Polling result: ${pollText}`);

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

console.log('Starting polling test...');
setTimeout(() => testPolling(), 500);
