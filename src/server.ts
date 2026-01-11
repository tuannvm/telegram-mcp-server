import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import chalk from 'chalk';

import {
  type ServerConfig,
  type ToolName,
  type ToolHandlerContext,
  type ProgressToken,
  TOOLS,
} from './types.js';
import { handleError } from './errors.js';
import { toolDefinitions } from './tools/definitions.js';
import { toolHandlers } from './tools/handlers.js';

/**
 * Telegram MCP Server - Implements Model Context Protocol for Telegram notifications
 */
export class TelegramMcpServer {
  private readonly server: Server;
  private readonly config: ServerConfig;

  /**
   * @param config - Server configuration with name and version
   */
  constructor(config: ServerConfig) {
    this.config = config;
    this.server = new Server(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  /**
   * Set up MCP request handlers for listing and calling tools
   */
  private setupHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools: toolDefinitions };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
      const { name, arguments: args } = request.params;
      const progressToken = request.params._meta?.progressToken as ProgressToken | undefined;

      // Create progress sender that uses MCP notifications
      const createProgressContext = (): ToolHandlerContext => {
        let progressCount = 0;
        return {
          progressToken,
          sendProgress: async (message: string, progress?: number, total?: number) => {
            if (!progressToken) return;

            progressCount++;
            try {
              await extra.sendNotification({
                method: 'notifications/progress',
                params: {
                  progressToken,
                  progress: progress ?? progressCount,
                  total,
                  message,
                },
              });
            } catch (err) {
              // Log but don't fail the operation if progress notification fails
              console.error(chalk.yellow('Failed to send progress notification:'), err);
            }
          },
        };
      };

      try {
        if (!this.isValidToolName(name)) {
          throw new Error(`Unknown tool: ${name}`);
        }

        const handler = toolHandlers[name];
        const context = createProgressContext();
        return await handler.execute(args, context);
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: handleError(error, `tool "${name}"`),
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Type guard to check if a string is a valid tool name
   */
  private isValidToolName(name: string): name is ToolName {
    return Object.values(TOOLS).includes(name as ToolName);
  }

  /**
   * Start the MCP server with stdio transport
   */
  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(chalk.green(`${this.config.name} started successfully`));
  }
}
