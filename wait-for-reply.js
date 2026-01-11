#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!BOT_TOKEN || !CHAT_ID) {
  console.error('Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set');
  process.exit(1);
}

async function waitForReply() {
  const server = spawn('node', ['dist/index.js'], {
    env: { ...process.env, TELEGRAM_BOT_TOKEN: BOT_TOKEN, TELEGRAM_CHAT_ID: CHAT_ID },
    stdio: ['pipe', 'pipe', 'inherit']
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
      }, 180000); // 3 minute timeout
    });
  }

  try {
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║     Telegram MCP Server - Waiting for your reply         ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');

    // Send message and wait for reply
    console.log('📤 Sending message to Telegram...');
    console.log('⏳ You have 2 minutes to reply!\n');

    const pollResult = await sendRequest('tools/call', {
      name: 'send_and_wait',
      arguments: {
        message: '🧪 MCP Server Test\n\nReply to this message and I will receive it!',
        waitForReply: true,
        timeout: 120,
        pollInterval: 3
      }
    });

    const resultText = pollResult.result?.content?.[0]?.text || 'No response';
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                      RESULT                              ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(resultText);
    console.log('\n✅ Bidirectional communication works!\n');

  } catch (error) {
    if (error.message === 'Request timeout') {
      console.log('\n⏱ Timeout: No reply received within 2 minutes.');
      console.log('💡 Tip: Make sure to reply to the message on Telegram!');
    } else {
      console.error('Error:', error.message);
    }
  } finally {
    server.kill();
    process.exit(0);
  }

  server.on('exit', () => process.exit(0));
}

waitForReply();
