import {
  TOOLS,
  type ToolResult,
  type ToolHandlerContext,
  type SendTelegramToolArgs,
  SendTelegramToolSchema,
  TelegramStatusToolSchema,
  type TelegramResponse,
} from '../types.js';
import { ToolExecutionError, ValidationError } from '../errors.js';
import { ZodError } from 'zod';
import { SendAndWaitToolHandler } from './send-and-wait.js';
import { CheckRepliesToolHandler } from './check-replies.js';
import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  MAX_ERROR_PREVIEW_LENGTH,
} from '../constants.js';

// Default no-op context for handlers that don't need progress
const defaultContext: ToolHandlerContext = {
  sendProgress: async () => {},
};

/**
 * Escape HTML special characters to prevent injection
 */
function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  };
  return text.replace(/[&<>]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Get Telegram configuration at runtime
 */
function getTelegramConfig(): {
  botToken: string | undefined;
  chatId: string | undefined;
} {
  return {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  };
}

async function sendTelegramMessage(
  header: string,
  body?: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const { botToken, chatId } = getTelegramConfig();

  if (!botToken || !chatId) {
    return {
      success: false,
      error:
        'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables',
    };
  }

  // Escape HTML special characters to prevent injection
  const escapedHeader = escapeHtml(header);
  const escapedBody = body ? escapeHtml(body) : undefined;
  const message = escapedBody
    ? `<b>${escapedHeader}</b>\n\n${escapedBody}`
    : escapedHeader;

  // Setup timeout for fetch request
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
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      }
    );

    // Clear timeout as request completed
    clearTimeout(timeoutId);

    // Check HTTP status code
    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Handle non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await response.text();
      return {
        success: false,
        error: `Unexpected response type: ${contentType || 'unknown'}. Response: ${text.slice(0, MAX_ERROR_PREVIEW_LENGTH)}`,
      };
    }

    const data = (await response.json()) as TelegramResponse;

    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    } else {
      return { success: false, error: data.description || 'Unknown error' };
    }
  } catch (error) {
    // Clear timeout if still active
    clearTimeout(timeoutId);

    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutSeconds = DEFAULT_REQUEST_TIMEOUT_MS / 1000;
      return {
        success: false,
        error: `Request timeout (${timeoutSeconds}s)`,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export class SendTelegramToolHandler {
  async execute(
    args: unknown,
    _context: ToolHandlerContext = defaultContext
  ): Promise<ToolResult> {
    try {
      const { header, body }: SendTelegramToolArgs =
        SendTelegramToolSchema.parse(args);

      const result = await sendTelegramMessage(header, body);

      return {
        content: [
          {
            type: 'text',
            text: result.success
              ? `✓ Telegram sent (ID: ${result.messageId})`
              : `✗ Failed: ${result.error}`,
          },
        ],
        isError: !result.success,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.SEND_TELEGRAM, error.message);
      }
      throw new ToolExecutionError(
        TOOLS.SEND_TELEGRAM,
        'Failed to send Telegram message',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

export class TelegramStatusToolHandler {
  async execute(
    args: unknown,
    _context: ToolHandlerContext = defaultContext
  ): Promise<ToolResult> {
    try {
      // Handle undefined args for no-argument tools
      TelegramStatusToolSchema.parse(args ?? {});

      const { botToken, chatId } = getTelegramConfig();
      const hasToken = !!botToken;
      const hasChatId = !!chatId;

      return {
        content: [
          {
            type: 'text',
            text: `Telegram Config:\n  BOT_TOKEN: ${hasToken ? '✓ Set' : '✗ Missing'}\n  CHAT_ID: ${hasChatId ? '✓ Set' : '✗ Missing'}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.TELEGRAM_STATUS, error.message);
      }
      throw new ToolExecutionError(
        TOOLS.TELEGRAM_STATUS,
        'Failed to check Telegram status',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}

// Tool handler registry
export const toolHandlers = {
  [TOOLS.SEND_TELEGRAM]: new SendTelegramToolHandler(),
  [TOOLS.TELEGRAM_STATUS]: new TelegramStatusToolHandler(),
  [TOOLS.SEND_AND_WAIT]: new SendAndWaitToolHandler(),
  [TOOLS.CHECK_REPLIES]: new CheckRepliesToolHandler(),
} as const;
