import { z } from 'zod';

// Tool constants
export const TOOLS = {
  SEND_TELEGRAM: 'send_telegram',
  TELEGRAM_STATUS: 'telegram_status',
} as const;

export type ToolName = typeof TOOLS[keyof typeof TOOLS];

// Tool annotations for MCP 2025-11-25 spec
export interface ToolAnnotations {
  title?: string;
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

// Tool definition interface
export interface ToolDefinition {
  name: ToolName;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
  annotations?: ToolAnnotations;
}

// Tool result interface matching MCP SDK expectations
export interface ToolResult {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
  _meta?: Record<string, unknown>;
}

// Server configuration
export interface ServerConfig {
  name: string;
  version: string;
}

// Telegram API response
export interface TelegramResponse {
  ok: boolean;
  description?: string;
  result?: {
    message_id: number;
  };
}

// Send telegram result
export interface SendTelegramResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

// Progress token from MCP request metadata
export type ProgressToken = string | number;

// Context passed to tool handlers for sending progress notifications
export interface ToolHandlerContext {
  progressToken?: ProgressToken;
  sendProgress: (message: string, progress?: number, total?: number) => Promise<void>;
}

// Zod schemas for tool arguments
export const SendTelegramToolSchema = z.object({
  header: z.string().describe('Message header/title. Use emoji + status like: ✅ DONE, 🚫 BLOCKED, ❌ ERROR'),
  body: z.string().optional().describe('Optional message body with details. Can be multiline. Supports basic context like PWD, branch, host.'),
});

export const TelegramStatusToolSchema = z.object({});

export type SendTelegramToolArgs = z.infer<typeof SendTelegramToolSchema>;
export type TelegramStatusToolArgs = z.infer<typeof TelegramStatusToolSchema>;
