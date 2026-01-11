# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Telegram MCP Server** - a Model Context Protocol server that provides Telegram notification capabilities with bidirectional communication support.

## Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Run the server (after build)
npm start

# Install dependencies
npm install

# Run tests
npm test

# Direct execution with TypeScript
npx tsx src/index.ts
```

## Project Structure

```
src/
├── __tests__/           # Unit tests
│   ├── server.test.ts   # Server instantiation tests
│   └── telegram.test.ts # Telegram integration tests
├── constants.ts         # Named constants (timeouts, intervals)
├── errors.ts            # Custom error classes
├── index.ts             # Entry point
├── server.ts            # MCP server implementation
├── types.ts             # TypeScript types and Zod schemas
├── telegram/            # Telegram API abstraction
│   └── index.ts         # getUpdates polling, message sending
└── tools/               # MCP tool implementations
    ├── definitions.ts   # Tool definitions
    ├── handlers.ts      # send_telegram, telegram_status
    ├── send-and-wait.ts # send_and_wait tool
    └── check-replies.ts # check_replies tool

tests/manual/            # Manual/ad-hoc test scripts
```

## Architecture

This is a **modular TypeScript application** that implements the Model Context Protocol server interface. The server communicates via stdio transport and provides four tools:

### MCP Tools

1. **send_telegram** - Send notifications to Telegram
   - Parameters: `header` (required), `body` (optional)
   - Uses Telegram Bot API with HTML formatting

2. **telegram_status** - Check configuration status
   - No parameters
   - Returns which environment variables are set

3. **send_and_wait** - Send message and optionally poll for replies
   - Parameters: `message` (required), `waitForReply`, `timeout`, `pollInterval`
   - Uses Telegram's getUpdates API with file-based offset tracking

4. **check_replies** - Check for pending replies
   - Parameters: `messageId` (optional)
   - Returns all replies or specific reply by message ID

### Key Design

- The MCP server runs as a separate process with its own network access
- Stdio transport allows Claude Code to communicate without network restrictions
- Telegram Bot API integration via standard HTTP requests
- Bidirectional communication uses getUpdates polling with offset tracking
- State stored in `~/.telegram-mcp-state/offset.json`

### Error Handling

Custom error classes in `src/errors.ts`:
- `ToolExecutionError` - Tool execution failures
- `ValidationError` - Input validation failures
- `ConfigurationError` - Missing/invalid configuration
- `NetworkError` - Network/request failures

### Constants

Time-related constants in `src/constants.ts`:
- `DEFAULT_REQUEST_TIMEOUT_MS` - API request timeout (10s)
- `DEFAULT_POLL_TIMEOUT_SECONDS` - Long polling timeout
- `MAX_POLL_TIMEOUT_SECONDS` - Telegram API max poll timeout
- `DEFAULT_REPLY_TIMEOUT_SECONDS` - Default wait for reply timeout
- `DEFAULT_REPLY_POLL_INTERVAL_SECONDS` - Reply check interval

## Environment Variables

Required:
- `TELEGRAM_BOT_TOKEN` - Telegram bot authentication token
- `TELEGRAM_CHAT_ID` - Target chat ID for notifications

## TypeScript Configuration

- Target: ES2022 with ESNext module resolution
- Strict mode enabled
- Outputs to `dist/` directory
- Declaration files generated for TypeScript consumers
- Test files excluded from build (`**/*.test.ts`, `**/*.spec.ts`)

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `zod` - Schema validation
- `chalk` - Terminal output coloring
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions

## State Management

The server uses file-based offset tracking for Telegram's getUpdates API:
- Location: `~/.telegram-mcp-state/offset.json`
- Stores the last processed update_id + 1
- Ensures no duplicate message processing
