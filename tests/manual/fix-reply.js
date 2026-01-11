import { writeFile } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';

const replyData = {
  messageId: 64,
  chatId: process.env.TELEGRAM_CHAT_ID,
  replyText: 'OK - User replied from Telegram!',
  timestamp: Date.now(),
  status: 'pending',
};

const replyPath = join(homedir(), '.telegram-mcp-replies', '64.json');
await writeFile(replyPath, JSON.stringify(replyData, null, 2));
console.log('Reply file written:', replyPath);
console.log('Content:', JSON.stringify(replyData, null, 2));
