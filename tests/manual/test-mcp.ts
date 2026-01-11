#!/usr/bin/env node
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

async function testMCP() {
  const serverProcess = spawn('node', ['dist/index.js'], {
    env: {
      ...process.env,
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID,
    },
  });

  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: {
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
    },
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {},
  });

  try {
    await client.connect(transport);

    console.log('\n=== Test 1: List Tools ===');
    const tools = await client.listTools();
    console.log('Available tools:');
    tools.tools.forEach(t => console.log(`  - ${t.name}: ${t.description}`));

    console.log('\n=== Test 2: Check Telegram Status ===');
    const statusResult = await client.callTool({
      name: 'telegram_status',
      arguments: {},
    });
    console.log('Status:', (statusResult.content as any)[0]?.text);

    console.log('\n=== Test 3: Send Simple Message (send_telegram) ===');
    const sendResult = await client.callTool({
      name: 'send_telegram',
      arguments: {
        header: '🧪 MCP Test',
        body: 'Testing telegram-mcp-server v0.1.0\n\nBidirectional polling test initiated.',
      },
    });
    console.log('Result:', (sendResult.content as any)[0]?.text);

    console.log('\n=== Test 4: Send with send_and_wait (no polling) ===');
    const waitResult = await client.callTool({
      name: 'send_and_wait',
      arguments: {
        message: '🧪 Test Message from send_and_wait\n\nPlease reply with "OK" to test bidirectional communication.',
        waitForReply: false,
      },
    });
    console.log('Result:', (waitResult.content as any)[0]?.text);

    console.log('\n=== Test 5: Check for replies ===');
    const repliesResult = await client.callTool({
      name: 'check_replies',
      arguments: {},
    });
    console.log('Result:', (repliesResult.content as any)[0]?.text);

    console.log('\n=== Test 6: Send with send_and_wait (WITH polling - 30s timeout) ===');
    console.log('PLEASE REPLY TO THE MESSAGE ON TELEGRAM NOW!');
    const pollResult = await client.callTool({
      name: 'send_and_wait',
      arguments: {
        message: '🧪 POLLING TEST - Reply with anything!\n\nThis message will wait for your reply for 30 seconds with 5s polling intervals.',
        waitForReply: true,
        timeout: 30,
        pollInterval: 5,
      },
    });
    console.log('Result:', (pollResult.content as any)[0]?.text);

    console.log('\n=== All Tests Complete ===');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    serverProcess.kill();
  }
}

testMCP();
