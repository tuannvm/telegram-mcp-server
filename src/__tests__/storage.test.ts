import { SendAndWaitToolHandler } from '../tools/send-and-wait.js';
import { CheckRepliesToolHandler } from '../tools/check-replies.js';
import * as storage from '../storage/index.js';

jest.mock('../storage/index.js');

describe('Storage Module Integration', () => {
  describe('send_and_wait tool', () => {
    let handler: SendAndWaitToolHandler;
    let mockContext: any;

    beforeEach(() => {
      handler = new SendAndWaitToolHandler();
      mockContext = {
        sendProgress: jest.fn().mockResolvedValue(undefined),
      };

      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = '123456';

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true, result: { message_id: 123 } }),
          headers: {
            get: (name: string) => (name === 'content-type' ? 'application/json' : null),
          },
        } as Response)
      ) as jest.Mock;
    });

    afterEach(() => {
      jest.clearAllMocks();
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;
    });

    it('should send message and save metadata', async () => {
      (storage.saveSentMessage as jest.Mock).mockResolvedValue(undefined);

      const result = await handler.execute(
        { message: 'Test message', waitForReply: false },
        mockContext
      );

      expect(storage.saveSentMessage).toHaveBeenCalledWith(123, expect.objectContaining({
        message: 'Test message',
        status: 'sent',
      }));
      expect(result.content[0].text).toContain('Message sent');
    });
  });

  describe('check_replies tool', () => {
    let handler: CheckRepliesToolHandler;
    let mockContext: any;

    beforeEach(() => {
      handler = new CheckRepliesToolHandler();
      mockContext = {
        sendProgress: jest.fn().mockResolvedValue(undefined),
      };
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should retrieve and consume reply', async () => {
      (storage.getReply as jest.Mock).mockResolvedValue({
        messageId: 123,
        chatId: '123456',
        replyText: 'Test reply',
        timestamp: Date.now(),
        status: 'pending',
      });

      const result = await handler.execute({ messageId: 123 }, mockContext);

      expect(storage.getReply).toHaveBeenCalledWith(123);
      expect(storage.markReplyConsumed).toHaveBeenCalledWith(123);
      expect(result.content[0].text).toContain('Reply for message 123');
    });

    it('should retrieve all pending replies', async () => {
      const replies = [
        {
          messageId: 123,
          chatId: '123456',
          replyText: 'Reply 1',
          timestamp: Date.now(),
          status: 'pending' as const,
        },
        {
          messageId: 456,
          chatId: '789012',
          replyText: 'Reply 2',
          timestamp: Date.now(),
          status: 'pending' as const,
        },
      ];

      (storage.getAllPendingReplies as jest.Mock).mockResolvedValue(replies);

      const result = await handler.execute({}, mockContext);

      expect(storage.getAllPendingReplies).toHaveBeenCalled();
      expect(storage.deleteReply).toHaveBeenCalledTimes(2);
      expect(result.content[0].text).toContain('2 pending');
    });
  });
});
