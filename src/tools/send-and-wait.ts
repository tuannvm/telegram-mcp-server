import {
  TOOLS,
  type ToolResult,
  type ToolHandlerContext,
  SendAndWaitToolSchema,
} from '../types.js';
import { ToolExecutionError, ValidationError } from '../errors.js';
import { ZodError } from 'zod';
import {
  saveSentMessage,
  updateMessageStatus,
  getReply,
  sleep,
} from '../storage/index.js';

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
  message: string
): Promise<{ success: boolean; messageId?: number; error?: string }> {
  const { botToken, chatId } = getTelegramConfig();

  if (!botToken || !chatId) {
    return {
      success: false,
      error:
        'Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID environment variables',
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

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

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return {
        success: false,
        error: `Unexpected response type: ${contentType || 'unknown'}`,
      };
    }

    const data = (await response.json()) as { ok: boolean; description?: string; result?: { message_id: number } };

    if (data.ok) {
      return { success: true, messageId: data.result?.message_id };
    } else {
      return { success: false, error: data.description || 'Unknown error' };
    }
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timeout (10s)',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export class SendAndWaitToolHandler {
  async execute(
    args: unknown,
    context: ToolHandlerContext
  ): Promise<ToolResult> {
    try {
      const { message, waitForReply, timeout, pollInterval } =
        SendAndWaitToolSchema.parse(args);

      const sendResult = await sendTelegramMessage(message);

      if (!sendResult.success) {
        return {
          content: [
            {
              type: 'text',
              text: `✗ Failed to send message: ${sendResult.error}`,
            },
          ],
          isError: true,
        };
      }

      if (!sendResult.messageId) {
        return {
          content: [
            {
              type: 'text',
              text: '✗ Message sent but no ID returned',
            },
          ],
          isError: true,
        };
      }

      const { chatId } = getTelegramConfig();

      await saveSentMessage(sendResult.messageId, {
        chatId: chatId || '',
        timestamp: Date.now(),
        message,
        status: 'sent',
      });

      if (!waitForReply) {
        return {
          content: [
            {
              type: 'text',
              text: `✓ Message sent (ID: ${sendResult.messageId}). Use check_replies tool to poll for responses.`,
            },
          ],
        };
      }

      const startTime = Date.now();
      const timeoutMs = timeout * 1000;
      const pollIntervalMs = pollInterval * 1000;

      while (Date.now() - startTime < timeoutMs) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        await context.sendProgress(
          `Waiting for reply... (${elapsed}s / ${timeout}s)`,
          elapsed,
          timeout
        );

        const reply = await getReply(sendResult.messageId);
        if (reply) {
          await updateMessageStatus(sendResult.messageId, 'replied');
          return {
            content: [
              {
                type: 'text',
                text: `✓ Reply received:\n\n${reply.replyText}`,
              },
            ],
          };
        }

        await sleep(pollIntervalMs);
      }

      await updateMessageStatus(sendResult.messageId, 'timeout');
      return {
        content: [
          {
            type: 'text',
            text: `⏱ Timeout: No reply received within ${timeout}s. Use check_replies tool to check later.`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.SEND_AND_WAIT, error.message);
      }
      throw new ToolExecutionError(
        TOOLS.SEND_AND_WAIT,
        'Failed to send message and wait for reply',
        error
      );
    }
  }
}
