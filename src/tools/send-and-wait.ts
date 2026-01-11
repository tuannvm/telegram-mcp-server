import {
  TOOLS,
  type ToolResult,
  type ToolHandlerContext,
  SendAndWaitToolSchema,
} from '../types.js';
import { ToolExecutionError, ValidationError } from '../errors.js';
import { ZodError } from 'zod';
import {
  sendMessage,
  waitForReply as waitForTelegramReply,
} from '../telegram/index.js';

/**
 * Handler for send_and_wait tool - send message and optionally poll for replies
 */
export class SendAndWaitToolHandler {
  async execute(
    args: unknown,
    context: ToolHandlerContext
  ): Promise<ToolResult> {
    try {
      const { message, waitForReply, timeout, pollInterval } =
        SendAndWaitToolSchema.parse(args);

      const sendResult = await sendMessage(message);

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

      const timeoutMs = timeout * 1000;
      const pollIntervalMs = pollInterval * 1000;

      const result = await waitForTelegramReply(
        sendResult.messageId,
        timeoutMs,
        pollIntervalMs,
        context.sendProgress
      );

      if (result.found) {
        return {
          content: [
            {
              type: 'text',
              text: `✓ Reply received:\n\n${result.reply}`,
            },
          ],
        };
      }

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
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
