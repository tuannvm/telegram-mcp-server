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
];
