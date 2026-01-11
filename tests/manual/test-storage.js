#!/usr/bin/env node

import { getAllPendingReplies } from './dist/storage/index.js';

console.log('Testing storage module...');
const replies = await getAllPendingReplies();
console.log(`Found ${replies.length} pending replies:`);
for (const reply of replies) {
  console.log(`- Message ${reply.messageId}: "${reply.replyText}"`);
}
