---
name: telegram-mcp-server
description: Bidirectional Telegram MCP server with send_and_wait and check_replies for interactive workflows. Use when needing Telegram notifications with reply handling, deployment approvals, or any interactive decision-making via Telegram.
---

# Telegram MCP Server

A Model Context Protocol server providing bidirectional Telegram communication with polling-based reply detection.

## Quick Reference

| Tool | Purpose | When to Use |
|------|---------|-------------|
| `send_telegram` | One-way notifications | Simple alerts, status updates |
| `send_and_wait` | Send + optionally wait for reply | Interactive workflows, approvals |
| `check_replies` | Poll for pending replies | Non-blocking reply checking |
| `telegram_status` | Verify configuration | Debugging setup issues |

## Common Workflows

### 1. Simple Notification (No Reply Expected)
```
Use send_telegram with header="✅ Complete" and body="Task finished successfully"
```

### 2. Ask for Approval (Wait for Reply)
```
Use send_and_wait with message="Deploy to production?

Reply YES or NO", waitForReply=true, timeout=300
```

### 3. Fire and Forget (Check Later)
```
Use send_and_wait with message="Should I proceed?", waitForReply=false

[Later...] Use check_replies to see if user responded
```

### 4. Interactive Menu
```
Use send_and_wait with message="Choose an option:

1. Deploy to staging
2. Deploy to production
3. Run tests
4. Cancel

Reply 1-4", waitForReply=true
```

## Bidirectional Communication Pattern

When sending messages that expect replies:

1. **Send message** using `send_and_wait` with `waitForReply=false` (non-blocking)
2. **Poll for replies** using `check_replies` when you expect a response
3. **Handle incoming replies** by presenting them to the user and continuing the task

**Example:**
```
User: "Ask Telegram if deployment is approved"

Claude: I'll send a message to Telegram asking for approval.
       [Uses send_and_wait with message="Approve deployment? Reply YES or NO"]

Claude: Message sent! Waiting for reply...

Claude: [Uses check_replies]

Claude: Reply received: "YES" - proceeding with deployment
```

## Reply Detection

Replies are detected when:
- User replies to the bot message in Telegram (using reply button)
- The reply contains `reply_to_message` reference
- Reply hasn't been processed yet

**Important:** User must use Telegram's reply function, not just send a new message.

## State Management

- **Location:** `~/.telegram-mcp-state/offset.json`
- **Purpose:** Tracks last processed `update_id` to prevent duplicates
- **Persistence:** Survives server restarts

If you see duplicate replies, delete the offset file to reset.

## Configuration

Required environment variables:
- `TELEGRAM_BOT_TOKEN` - From @BotFather on Telegram
- `TELEGRAM_CHAT_ID` - Your Telegram chat ID

Check configuration:
```
Use telegram_status to verify setup
```

## Timeout Guidelines

| Scenario | Recommended Timeout |
|----------|-------------------|
| Quick decision | 60s |
| Review and approve | 300s (5 min) |
| Complex decision | 1800s (30 min) |
| Extended wait | 86400s (24 hr) |

## Best Practices

### DO ✓
- Provide clear options in messages ("Reply 1, 2, or 3")
- Include context ("Deploy build #1234?")
- Acknowledge received replies
- Set appropriate timeouts
- Use progress notifications for long waits

### DON'T ✗
- Send vague questions ("What should I do?")
- Forget to check for replies
- Set extremely short timeouts (< 30s)
- Assume user will see message immediately

## Error Handling

If replies aren't detected:
1. Verify user used Telegram's reply button
2. Check `~/.telegram-mcp-state/offset.json` exists
3. Ensure bot has permission to read messages
4. Try `check_replies` manually for debugging

If sending fails:
1. Check `telegram_status` for configuration issues
2. Verify `TELEGRAM_BOT_TOKEN` is valid
3. Confirm `TELEGRAM_CHAT_ID` is correct
4. Test API: `curl "https://api.telegram.org/bot$TOKEN/getMe"`

## Advanced Usage

### Custom Polling
You can instruct Claude to poll at specific intervals:
```
Check for Telegram replies every 15 seconds until you get a response
```

### Filter by Message ID
Check for a specific reply:
```
Check Telegram replies for message ID 123
```

### Batch Operations
Send multiple related messages:
```
Use send_and_wait to send:
1. "Step 1 started"
2. "Step 2 started"
3. "Step 3 started"

Then check for replies to all
```

## Documentation Reference

For more details, see:
- `docs/bidirectional-communication.md` - Feature guide with diagrams
- `docs/architecture.md` - Technical implementation
- `docs/usage-examples.md` - Practical workflow examples
- `CLAUDE.md` - Project-specific guidance
- `README.md` - Installation and quick start
