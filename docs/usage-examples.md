# Usage Examples

This document provides practical examples of using the Telegram MCP Server with Claude Code.

## Table of Contents

- [Basic Notification](#basic-notification)
- [Deployment Approval Workflow](#deployment-approval-workflow)
- [Interactive Menus](#interactive-menus)
- [Long-Running Tasks](#long-running-tasks)
- [Error Notifications](#error-notifications)
- [Multi-Step Approval](#multi-step-approval)
- [Monitoring and Alerts](#monitoring-and-alerts)

---

## Basic Notification

### Send a Simple Message

```
Send notification "✅ Build Complete" to "Your project has been built successfully"
```

**Result:** You receive a notification on Telegram.

---

## Deployment Approval Workflow

### Ask for Approval Before Deploying

```
Send message to Telegram: "Deploy to production?

Reply YES to approve or NO to cancel."
```

**Then check for replies:**

```
Check for Telegram replies
```

**Claude's response when reply arrives:**
```
Reply received: YES
Proceeding with production deployment...
```

---

## Interactive Menus

### Present Options to User

```
Send to Telegram: "Choose an option:

1. Deploy to staging
2. Deploy to production
3. Run tests only
4. Cancel

Reply with the number (1-4)"
```

**After receiving reply:**

```
Check Telegram replies
```

**Claude handles the choice:**
```
Reply received: "2"
Deploying to production environment...
```

---

## Long-Running Tasks

### Notify When Long Task Completes

```
Send notification "🔄 Processing Started" to "Beginning data migration (estimated 30 minutes)"
```

**... after task completes ...**

```
Send notification "✅ Migration Complete" to "Data migration finished successfully. Records processed: 1,234,567"
```

---

## Error Notifications

### Alert on Failure

```
Send notification "❌ Build Failed" to "Build #1234 failed

Error: Tests failing in src/auth.test.js
Exit code: 1
Duration: 45s

Branch: feature/new-auth
Commit: abc123def"
```

---

## Multi-Step Approval

### Sequential Approval Process

```
Send to Telegram: "Step 1/3: Review code changes

Changes:
- Added authentication module
- Updated user permissions
- Fixed session handling

Approve? Reply YES or NO"
```

**After approval:**

```
Send to Telegram: "Step 2/3: Run tests?

Tests will take ~5 minutes.
Proceed? Reply YES or NO"
```

**After test approval:**

```
Send to Telegram: "Step 3/3: Deploy to staging?

Final confirmation needed.
Deploy? Reply YES or NO"
```

---

## Monitoring and Alerts

### Periodic Status Updates

```
Send notification "📊 Daily Report" to "Server Status:
- Uptime: 99.9%
- Requests: 1.2M
- Errors: 23
- Response time: 45ms avg"
```

### Critical Alerts

```
Send notification "🚨 Critical Alert" to "Database connection lost!

Server: prod-db-01
Time: 2025-01-10 14:30:00 UTC
Error: Connection timeout

Investigating now..."
```

---

## Claude Code Configuration

To enable automatic reply checking, add to `CLAUDE.md`:

```markdown
## Telegram Communication

When I send a Telegram message expecting a reply:
1. After sending, automatically check for replies every 30 seconds
2. When a reply arrives, present it clearly
3. Continue the task based on the reply content
```

---

## Complete Workflows

### Workflow 1: CI/CD Pipeline with Manual Approval

```
You: "Run the deployment pipeline"

Claude: I'll start the deployment pipeline with approval checkpoints.

[Pipeline: Step 1 - Build]
Building application... ✓ Complete

[Pipeline: Step 2 - Tests]
Running tests... ✓ All 156 tests passed

[Pipeline: Step 3 - Security Scan]
Security scan complete. 0 vulnerabilities found.

[Pipeline: Step 4 - Approval Required]
Sending to Telegram: "Deploy to production?

Build: #1234
Tests: ✓ Passed
Security: ✓ Clean

Reply CONFIRM to deploy or CANCEL to abort"

[Checks Telegram for reply]

Reply received: "CONFIRM"

[Pipeline: Step 5 - Deploy]
Deploying to production...
✓ Deployment complete

Sending notification "✅ Deployed" to "Production deployment successful!

Build: #1234
Environment: production
URL: https://app.example.com
Time: 2025-01-10 15:00:00 UTC"
```

### Workflow 2: Debug Session with Human Input

```
You: "Help debug the failing test"

Claude: I'll investigate the failing test and ask for guidance if needed.

[Analyzing test failure...]
Test: src/auth.test.js:47
Error: Expected user to be authenticated
Status: FAILED

[Investigating authentication flow...]
Found issue: Token validation failing in production config

Asking for guidance...

Send to Telegram: "Debug decision needed:

Issue: Token validation failing
Options:
1. Fix token validation logic
2. Update test to match current behavior
3. Investigate token generation

Which approach should I take? Reply 1, 2, or 3"

[Checks Telegram for reply]

Reply received: "1"

Fixing token validation logic...
✓ Fixed
✓ Tests passing

Sending notification "✅ Fixed" to "Token validation issue resolved!

Tests now passing: 157/157
Ready for deployment."
```

### Workflow 3: Interactive Configuration

```
You: "Set up the new project configuration"

Claude: I'll guide you through the configuration process.

Send to Telegram: "Project Setup - Step 1/5

Choose project type:
1. Web Application (React)
2. API Service (Node.js)
3. Mobile App (React Native)
4. CLI Tool

Reply with number (1-4)"

[Checks for reply]

Reply received: "1"

Send to Telegram: "Project Setup - Step 2/5

Choose build tool:
1. Vite (recommended)
2. Next.js
3. Webpack
4. Custom

Reply with number (1-4)"

[Continues through all steps...]

Send to Telegram: "Project Setup - Complete!

Configuration summary:
- Type: Web Application (React)
- Build: Vite
- Testing: Vitest + React Testing Library
- Styling: Tailwind CSS
- State: Zustand

Create project now? Reply CONFIRM or CANCEL"

[Checks for reply]

Reply received: "CONFIRM"

Creating project...
✓ Project created
✓ Dependencies installed
✓ Git initialized

Send notification "✅ Ready" to "Project is ready!

cd /path/to/project
npm run dev

Happy coding!"
```

---

## Tips and Best Practices

### 1. Clear Instructions

Always provide clear options:

❌ Bad: "What should I do?"
✅ Good: "Choose: 1) Deploy, 2) Rollback, 3) Investigate. Reply 1, 2, or 3"

### 2. Context in Messages

Include relevant context:

❌ Bad: "Deploy?"
✅ Good: "Deploy build #1234 to production? Tests: ✓ Passed"

### 3. Acknowledge Replies

Always confirm received input:

```
Send to Telegram: "You replied: YES

Proceeding with deployment..."
```

### 4. Handle Timeouts

Set appropriate timeouts for your use case:

| Scenario | Timeout |
|----------|---------|
| Quick decision | 60s |
| Review and approve | 300s (5 min) |
| Complex decision | 1800s (30 min) |
| Overnight wait | 86400s (24 hr) |

### 5. Provide Status Updates

Keep the user informed:

```
Send notification "Working..." to "Processing your request...
Estimated time: 2 minutes"

[After completion]

Send notification "Done" to "Processing complete!

Results:
- Processed: 1,234 items
- Duration: 1m 45s
- Status: Success"
```

---

## Troubleshooting

### Reply Not Detected

1. Make sure you're actually replying to the message (use the reply button in Telegram)
2. Check that the bot has permission to read messages
3. Try manually checking: `check_replies`

### Duplicate Messages

If you see duplicate replies:
1. Check `~/.telegram-mcp-state/offset.json`
2. Verify the offset value is increasing
3. Delete the state file to reset (will reprocess all messages)

### Server Not Responding

1. Check environment variables are set:
   ```bash
   echo $TELEGRAM_BOT_TOKEN
   echo $TELEGRAM_CHAT_ID
   ```
2. Test API connectivity:
   ```bash
   curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
   ```
3. Restart the MCP server

---

## Advanced Usage

### Custom Polling Interval

Adjust how often Claude checks for replies:

```
Check for Telegram replies every 15 seconds
```

### Filter by Message ID

Check for a specific reply:

```
Check Telegram replies for message ID 123
```

### Batch Operations

Send multiple messages at once:

```
Send to Telegram:
1. "Task 1 started"
2. "Task 2 started"
3. "Task 3 started"

Check for replies to all messages
```
