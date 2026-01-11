import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

import {
  DEFAULT_POLL_TIMEOUT_SECONDS,
  DEFAULT_REQUEST_TIMEOUT_MS,
  MAX_POLL_TIMEOUT_SECONDS,
  MS_PER_SECOND,
} from '../constants.js';
import { ConfigurationError } from '../errors.js';

const STATE_DIR = join(homedir(), '.telegram-mcp-state');
const OFFSET_FILE = join(STATE_DIR, 'offset.json');

/**
 * Telegram message data structure from Bot API
 */
export interface TelegramMessage {
  message_id: number;
  from: { id: number; first_name?: string; username?: string };
  chat: { id: number; type: string };
  date: number;
  text: string;
  reply_to_message?: {
    message_id: number;
    from: { id: number; first_name?: string };
    text: string;
  };
}

/**
 * Telegram update data structure from getUpdates API
 */
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

/**
 * Result of sending a message to Telegram
 */
export interface SendMessageResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Get bot token and chat ID from environment variables
 */
function getBotConfig(): { botToken: string; chatId: string } {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new ConfigurationError(
      'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variable'
    );
  }

  return { botToken, chatId };
}

/**
 * Read the last processed update offset from state file
 */
async function getOffset(): Promise<number> {
  try {
    const content = await fs.readFile(OFFSET_FILE, 'utf-8');
    const data = JSON.parse(content);
    return data.offset || 0;
  } catch {
    return 0;
  }
}

/**
 * Save the last processed update offset to state file
 */
async function setOffset(offset: number): Promise<void> {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.writeFile(OFFSET_FILE, JSON.stringify({ offset }, null, 2));
}

/**
 * Send a message to Telegram via Bot API
 */
export async function sendMessage(message: string): Promise<SendMessageResult> {
  const { botToken, chatId } = getBotConfig();

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    DEFAULT_REQUEST_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const data = (await response.json()) as {
      ok: boolean;
      description?: string;
      result?: { message_id: number };
    };

    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    }

    return { success: false, error: data.description };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutSeconds = DEFAULT_REQUEST_TIMEOUT_MS / MS_PER_SECOND;
      return { success: false, error: `Request timeout (${timeoutSeconds}s)` };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Poll for updates from Telegram using long polling
 */
export async function getUpdates(
  options: { timeout?: number; offset?: number } = {}
): Promise<TelegramUpdate[]> {
  const { botToken } = getBotConfig();
  const { timeout = DEFAULT_POLL_TIMEOUT_SECONDS, offset } = options;

  const actualOffset = offset ?? (await getOffset());

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getUpdates?offset=${actualOffset}&timeout=${timeout}`
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as {
      ok: boolean;
      result?: TelegramUpdate[];
    };

    if (data.ok && data.result) {
      const maxOffset = Math.max(...data.result.map((u) => u.update_id), 0);
      if (maxOffset > 0) {
        await setOffset(maxOffset + 1);
      }
      return data.result;
    }

    return [];
  } catch {
    return [];
  }
}

/**
 * Poll for a reply to a specific message with timeout
 */
export async function waitForReply(
  sentMessageId: number,
  timeoutMs: number,
  pollIntervalMs: number,
  onProgress?: (
    message: string,
    progress: number,
    total: number
  ) => Promise<void>
): Promise<{ found: boolean; reply?: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const total = Math.floor(timeoutMs / 1000);

    if (onProgress) {
      await onProgress(
        `Waiting for reply... (${elapsed}s / ${total}s)`,
        elapsed,
        total
      );
    }

    const updates = await getUpdates({
      timeout: Math.min(
        pollIntervalMs / MS_PER_SECOND,
        MAX_POLL_TIMEOUT_SECONDS
      ),
    });

    for (const update of updates) {
      if (update.message?.reply_to_message?.message_id === sentMessageId) {
        return { found: true, reply: update.message.text };
      }
    }

    if (Date.now() - startTime < timeoutMs) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  return { found: false };
}

/**
 * Get all pending replies from the latest updates
 */
export async function getAllReplies(): Promise<
  Array<{ messageId: number; replyText: string; timestamp: number }>
> {
  const updates = await getUpdates();
  const replies: Array<{
    messageId: number;
    replyText: string;
    timestamp: number;
  }> = [];

  for (const update of updates) {
    if (update.message?.reply_to_message) {
      replies.push({
        messageId: update.message.reply_to_message.message_id,
        replyText: update.message.text,
        timestamp: update.message.date * 1000,
      });
    }
  }

  return replies;
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
