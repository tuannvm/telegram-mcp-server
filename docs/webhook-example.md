# Telegram Webhook Handler (Optional)

> **Note:** The telegram-mcp-server now uses Telegram's `getUpdates` polling API by default, which works without any external setup. Webhooks are **optional** and only needed if you want instant push notifications instead of polling.

## Why Use Webhooks?

| Approach | Pros | Cons |
|----------|------|------|
| **Polling (default)** | No setup required, works everywhere | Slight delay (polling interval) |
| **Webhook (optional)** | Instant delivery, lower API usage | Requires public HTTPS endpoint |

## Webhook Setup Example

This example shows how to set up a simple webhook handler using Node.js and Express.

### Prerequisites

```bash
npm install express body-parser
```

### Webhook Server

```javascript
// telegram-webhook.js
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Store replies in memory (in production, use a database)
const pendingReplies = new Map();

// Webhook endpoint
app.post('/telegram-webhook/:botToken', (req, res) => {
  const update = req.body;

  if (update.message && update.message.reply_to_message) {
    const replyData = {
      messageId: update.message.reply_to_message.message_id,
      chatId: update.message.chat.id,
      replyText: update.message.text,
      timestamp: Date.now(),
      status: 'pending'
    };

    // Store the reply
    pendingReplies.set(replyData.messageId, replyData);
    console.log('Received reply for message:', replyData.messageId);
  }

  res.sendStatus(200);
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.WEBHOOK_PORT || 3000;
app.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
```

### Set Up Telegram Webhook

```bash
# Set the webhook for your bot
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-domain.com/telegram-webhook/<YOUR_BOT_TOKEN>"

# Verify the webhook
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### Integration with MCP Server

The MCP server's `check_replies` tool can read from your webhook storage:

```javascript
// Modify your webhook server to provide an endpoint for MCP
app.get('/telegram-replies', (req, res) => {
  const replies = Array.from(pendingReplies.values());
  pendingReplies.clear(); // Clear after reading
  res.json(replies);
});
```

Then configure your MCP server to check this endpoint.

## Security Considerations

1. **Use HTTPS** - Telegram requires HTTPS for webhooks
2. **Validate Bot Token** - Only accept requests for your bot
3. **Rate Limiting** - Add rate limiting to prevent abuse
4. **Secret Token** - Use Telegram's `secret_token` parameter to verify requests

### Using Secret Token

```javascript
const SECRET_TOKEN = process.env.TELEGRAM_WEBHOOK_SECRET;

app.post('/telegram-webhook/:botToken', (req, res) => {
  // Verify secret token
  if (req.headers['x-telegram-bot-api-secret-token'] !== SECRET_TOKEN) {
    return res.sendStatus(403);
  }
  // ... rest of handler
});
```

## Cloud Deployment Examples

### Vercel

```javascript
// api/webhook.js (Vercel serverless function)
export default function handler(req, res) {
  if (req.method === 'POST') {
    const update = req.body;
    // Handle update
    res.status(200).send('OK');
  }
}
```

### AWS Lambda + API Gateway

Use the [aws-lambda-telegram-webhook](https://github.com/yagop/node-telegram-bot-api/tree/master/examples) pattern.

## Removing a Webhook

To switch back to polling mode:

```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/deleteWebhook"
```

## Troubleshooting

**Webhook not receiving updates:**
1. Verify webhook URL with `getWebhookInfo`
2. Check your server logs
3. Ensure HTTPS is valid (not self-signed)
4. Verify the URL is publicly accessible

**Need more help?**
- [Telegram Bot API - Webhooks](https://core.telegram.org/bots/api#setwebhook)
- [Telegram Bot API - Getting Updates](https://core.telegram.org/bots/api#getupdates)
