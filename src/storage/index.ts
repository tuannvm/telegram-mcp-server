import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const REPLIES_DIR = join(homedir(), '.telegram-mcp-replies');
const SENT_DIR = join(homedir(), '.telegram-mcp-sent');
const SENT_MESSAGES_FILE = join(SENT_DIR, 'messages.json');

export interface SentMessageMetadata {
  chatId: string;
  timestamp: number;
  message: string;
  status: 'sent' | 'replied' | 'timeout';
}

export interface ReplyData {
  messageId: number;
  chatId: string;
  replyText: string;
  timestamp: number;
  status: 'pending' | 'consumed';
}

export interface SentMessagesState {
  [messageId: string]: SentMessageMetadata;
}

export async function ensureDirectories(): Promise<void> {
  await fs.mkdir(REPLIES_DIR, { recursive: true });
  await fs.mkdir(SENT_DIR, { recursive: true });
}

export async function saveSentMessage(
  messageId: number,
  metadata: SentMessageMetadata
): Promise<void> {
  await ensureDirectories();

  let state: SentMessagesState = {};
  try {
    const content = await fs.readFile(SENT_MESSAGES_FILE, 'utf-8');
    state = JSON.parse(content);
  } catch {
    state = {};
  }

  state[messageId.toString()] = metadata;
  await fs.writeFile(SENT_MESSAGES_FILE, JSON.stringify(state, null, 2));
}

export async function updateMessageStatus(
  messageId: number,
  status: 'replied' | 'timeout'
): Promise<void> {
  let state: SentMessagesState = {};
  try {
    const content = await fs.readFile(SENT_MESSAGES_FILE, 'utf-8');
    state = JSON.parse(content);
  } catch {
    return;
  }

  if (state[messageId.toString()]) {
    state[messageId.toString()].status = status;
    await fs.writeFile(SENT_MESSAGES_FILE, JSON.stringify(state, null, 2));
  }
}

export async function getReply(
  messageId: number
): Promise<ReplyData | null> {
  const replyPath = join(REPLIES_DIR, `${messageId}.json`);
  try {
    const content = await fs.readFile(replyPath, 'utf-8');
    return JSON.parse(content) as ReplyData;
  } catch {
    return null;
  }
}

export async function getAllPendingReplies(): Promise<ReplyData[]> {
  await ensureDirectories();
  const replies: ReplyData[] = [];

  try {
    const files = await fs.readdir(REPLIES_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(join(REPLIES_DIR, file), 'utf-8');
        const reply = JSON.parse(content) as ReplyData;
        if (reply.status === 'pending') {
          replies.push(reply);
        }
      }
    }
  } catch {
    return [];
  }

  return replies;
}

export async function markReplyConsumed(messageId: number): Promise<void> {
  const replyPath = join(REPLIES_DIR, `${messageId}.json`);
  try {
    const content = await fs.readFile(replyPath, 'utf-8');
    const reply = JSON.parse(content) as ReplyData;
    reply.status = 'consumed';
    await fs.writeFile(replyPath, JSON.stringify(reply, null, 2));
  } catch {
  }
}

export async function deleteReply(messageId: number): Promise<void> {
  const replyPath = join(REPLIES_DIR, `${messageId}.json`);
  try {
    await fs.unlink(replyPath);
  } catch {
  }
}

export async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
