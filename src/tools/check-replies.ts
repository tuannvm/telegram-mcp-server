import {
  TOOLS,
  type ToolResult,
  type ToolHandlerContext,
  CheckRepliesToolSchema,
} from '../types.js';
import { ToolExecutionError, ValidationError } from '../errors.js';
import { ZodError } from 'zod';
import { getAllReplies, getUpdates } from '../telegram/index.js';

export class CheckRepliesToolHandler {
  async execute(
    args: unknown,
    _context: ToolHandlerContext
  ): Promise<ToolResult> {
    try {
      const { messageId } = CheckRepliesToolSchema.parse(args ?? {});

      if (messageId !== undefined) {
        const updates = await getUpdates();

        for (const update of updates) {
          if (update.message?.reply_to_message?.message_id === messageId) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Reply for message ${messageId}:\n\n${update.message.text}\n\nTimestamp: ${new Date(update.message.date * 1000).toISOString()}`,
                },
              ],
            };
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: `No reply found for message ID ${messageId}`,
            },
          ],
        };
      }

      const replies = await getAllReplies();

      if (replies.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No pending replies found',
            },
          ],
        };
      }

      const formatted = replies
        .map(
          (r) =>
            `Message ${r.messageId}:\n${r.replyText}\nTimestamp: ${new Date(r.timestamp).toISOString()}\n`
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${replies.length} pending reply(ies):\n\n${formatted}`,
          },
        ],
      };
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(TOOLS.CHECK_REPLIES, error.message);
      }
      throw new ToolExecutionError(
        TOOLS.CHECK_REPLIES,
        'Failed to check replies',
        error
      );
    }
  }
}
