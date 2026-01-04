# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **Telegram MCP Server** - a Model Context Protocol server that provides Telegram notification capabilities to Claude Code.

## Commands

```bash
# Build TypeScript to JavaScript
npm run build

# Run the server (after build)
npm start

# Install dependencies
npm install

# Direct execution with TypeScript
npx tsx src/index.ts
```

## Architecture

### MCP Server Pattern

This is a single-file TypeScript application (`src/index.ts`) that implements the Model Context Protocol server interface. The server communicates via stdio transport and provides two tools:

1. **send_telegram** - Send notifications to Telegram
   - Parameters: `header` (required), `body` (optional)
   - Uses Telegram Bot API with HTML formatting

2. **telegram_status** - Check configuration status
   - No parameters
   - Returns which environment variables are set

### Key Design

- The MCP server runs as a separate process with its own network access
- Stdio transport allows Claude Code to communicate without network restrictions
- Telegram Bot API integration via standard HTTP requests

## Environment Variables

Required:
- `TELEGRAM_BOT_TOKEN` - Telegram bot authentication token
- `TELEGRAM_CHAT_ID` - Target chat ID for notifications

## TypeScript Configuration

- Target: ES2022 with NodeNext module resolution
- Strict mode enabled
- Outputs to `index.js` in the same directory as source
- Declaration files generated for TypeScript consumers

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `typescript` - TypeScript compiler
- `@types/node` - Node.js type definitions
