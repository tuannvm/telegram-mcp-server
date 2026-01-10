import {
  TOOLS,
  type ToolResult,
  type ToolHandlerContext,
  CheckRepliesToolSchema,
} from '../types.js';
import { ToolExecutionError, ValidationError } from '../errors.js';
import { ZodError } from 'zod';
import {
  getReply,
  getAllPendingReplies,
  markReplyConsumed,
  deleteReply,
} from '../storage/index.js';

export class CheckRepliesToolHandler {
  async execute(
    args: unknown,
    _context: ToolHandlerContext
  ): Promise<ToolResult> {
    try {
      const { messageId } = CheckRepliesToolSchema.parse(args ?? {});

      if (messageId !== undefined) {
        const reply = await getReply(messageId);

        if (!reply) {
          return {
            content: [
              {
                type: 'text',
                text: `No reply found for message ID ${messageId}`,
              },
            ],
          };
        }

        await markReplyConsumed(messageId);

        return {
          content: [
            {
              type: 'text',
              text: `Reply for message ${messageId}:\n\n${reply.replyText}\n\nTimestamp: ${new Date(reply.timestamp).toISOString()}`,
            },
          ],
        };
      }

      const allReplies = await getAllPendingReplies();

      if (allReplies.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No pending replies found',
            },
          ],
        };
      }

      for (const reply of allReplies) {
        await deleteReply(reply.messageId);
      }

      const formatted = allReplies
        .map(
          (r) =>
            `Message ${r.messageId}:\n${r.replyText}\nTimestamp: ${new Date(r.timestamp).toISOString()}\n`
        )
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${allReplies.length} pending reply(ies):\n\n${formatted}`,
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
