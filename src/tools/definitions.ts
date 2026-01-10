import { TOOLS, type ToolDefinition } from '../types.js';

export const toolDefinitions: ToolDefinition[] = [
  {
    name: TOOLS.SEND_TELEGRAM,
    description:
      'Send a Telegram notification. Use for alerts, completion notices, or when blocked awaiting input.',
    inputSchema: {
      type: 'object',
      properties: {
        header: {
          type: 'string',
          description:
            'Message header/title. Use emoji + status like: ✅ DONE, 🚫 BLOCKED, ❌ ERROR',
        },
        body: {
          type: 'string',
          description:
            'Optional message body with details. Can be multiline. Supports basic context like PWD, branch, host.',
        },
      },
      required: ['header'],
    },
    annotations: {
      title: 'Send Telegram',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: TOOLS.TELEGRAM_STATUS,
    description: 'Check if Telegram credentials are configured',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
    annotations: {
      title: 'Telegram Status',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: TOOLS.SEND_AND_WAIT,
    description:
      'Send a Telegram message and optionally wait for a reply with polling. Use for interactive workflows requiring user input.',
    inputSchema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The message to send to Telegram',
        },
        waitForReply: {
          type: 'boolean',
          description: 'Whether to poll for replies (default: false)',
        },
        timeout: {
          type: 'number',
          description: 'Maximum seconds to wait for reply (default: 300)',
        },
        pollInterval: {
          type: 'number',
          description: 'Seconds between polls (default: 5)',
        },
      },
      required: ['message'],
    },
    annotations: {
      title: 'Send and Wait',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
  },
  {
    name: TOOLS.CHECK_REPLIES,
    description:
      'Check for pending replies from Telegram (non-blocking). Returns all pending replies or a specific message reply.',
    inputSchema: {
      type: 'object',
      properties: {
        messageId: {
          type: 'number',
          description: 'Specific message ID to check, or return all pending',
        },
      },
      required: [],
    },
    annotations: {
      title: 'Check Replies',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];
