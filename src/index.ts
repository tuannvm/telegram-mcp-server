#!/usr/bin/env node
/**
 * Telegram MCP Server
 *
 * Environment variables:
 *   TELEGRAM_BOT_TOKEN - Your Telegram bot token
 *   TELEGRAM_CHAT_ID   - Target chat ID for notifications
 */

import chalk from 'chalk';
import { TelegramMcpServer } from './server.js';

const SERVER_CONFIG = {
  name: 'telegram-mcp-server',
  version: '1.0.0',
} as const;

/**
 * Entry point for the Telegram MCP server
 */
async function main(): Promise<void> {
  try {
    const server = new TelegramMcpServer(SERVER_CONFIG);
    await server.start();
  } catch (error) {
    console.error(chalk.red('Failed to start server:'), error);
    process.exit(1);
  }
}

main();
