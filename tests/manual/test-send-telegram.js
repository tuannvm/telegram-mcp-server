import { sendMessage, waitForReply } from '../../dist/telegram/index.js';

async function test() {
  console.log('Sending test message to Telegram...');

  const sendResult = await sendMessage('Test from MCP server - please reply to this message!');
  console.log('Send result:', sendResult);

  if (sendResult.success && sendResult.messageId) {
    console.log(`Message sent! ID: ${sendResult.messageId}`);
    console.log('Waiting for your reply (60 seconds)...');

    const reply = await waitForReply(sendResult.messageId, 60000, 2000, async (msg, progress, total) => {
      console.log(`[${progress}s/${total}s] ${msg}`);
    });

    console.log('Reply result:', reply);
    process.exit(reply.found ? 0 : 1);
  } else {
    console.error('Failed to send message:', sendResult.error);
    process.exit(1);
  }
}

test().catch(console.error);
