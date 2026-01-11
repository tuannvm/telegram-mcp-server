import { SendAndWaitToolHandler } from '../tools/send-and-wait.js';
import { CheckRepliesToolHandler } from '../tools/check-replies.js';
import { type ToolHandlerContext } from '../types.js';

// Mock the telegram module
jest.mock('../telegram/index.js', () => ({
  sendMessage: jest.fn(),
  getUpdates: jest.fn(),
  waitForReply: jest.fn(),
  getAllReplies: jest.fn(),
}));

import * as telegram from '../telegram/index.js';

const mockSendMessage = telegram.sendMessage as jest.MockedFunction<
  typeof telegram.sendMessage
>;
const mockGetUpdates = telegram.getUpdates as jest.MockedFunction<
  typeof telegram.getUpdates
>;
const mockWaitForReply = telegram.waitForReply as jest.MockedFunction<
  typeof telegram.waitForReply
>;
const mockGetAllReplies = telegram.getAllReplies as jest.MockedFunction<
  typeof telegram.getAllReplies
>;

describe('Telegram API Integration', () => {
  describe('send_and_wait tool', () => {
    let handler: SendAndWaitToolHandler;
    let mockContext: ToolHandlerContext;

    beforeEach(() => {
      handler = new SendAndWaitToolHandler();
      mockContext = {
        sendProgress: jest.fn().mockResolvedValue(undefined),
      };

      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = '123456';

      mockSendMessage.mockResolvedValue({
        success: true,
        messageId: 123,
      });
    });

    afterEach(() => {
      jest.clearAllMocks();
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;
    });

    it('should send message without waiting', async () => {
      const result = await handler.execute(
        { message: 'Test message', waitForReply: false },
        mockContext
      );

      expect(mockSendMessage).toHaveBeenCalledWith('Test message');
      expect(result.content[0].text).toContain('Message sent');
    });

    it('should poll for reply when waitForReply is true', async () => {
      mockWaitForReply.mockResolvedValue({
        found: true,
        reply: 'User reply',
      });

      const result = await handler.execute(
        {
          message: 'Test message',
          waitForReply: true,
          timeout: 30,
          pollInterval: 5,
        },
        mockContext
      );

      expect(mockWaitForReply).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Reply received');
    });

    it('should timeout when no reply received', async () => {
      mockWaitForReply.mockResolvedValue({
        found: false,
      });

      const result = await handler.execute(
        {
          message: 'Test message',
          waitForReply: true,
          timeout: 10,
          pollInterval: 2,
        },
        mockContext
      );

      expect(result.content[0].text).toContain('Timeout');
    });

    it('should handle missing credentials', async () => {
      mockSendMessage.mockResolvedValue({
        success: false,
        error: 'Missing credentials',
      });

      const result = await handler.execute(
        { message: 'Test message' },
        mockContext
      );

      expect(result.isError).toBe(true);
    });
  });

  describe('check_replies tool', () => {
    let handler: CheckRepliesToolHandler;
    let mockContext: ToolHandlerContext;

    beforeEach(() => {
      handler = new CheckRepliesToolHandler();
      mockContext = {
        sendProgress: jest.fn().mockResolvedValue(undefined),
      };

      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = '123456';
    });

    afterEach(() => {
      jest.clearAllMocks();
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;
    });

    it('should retrieve specific reply', async () => {
      mockGetUpdates.mockResolvedValue([
        {
          update_id: 1,
          message: {
            message_id: 100,
            from: { id: 123, first_name: 'User' },
            chat: { id: 456, type: 'private' },
            date: 1234567890,
            text: 'Test reply',
            reply_to_message: {
              message_id: 123,
              from: { id: 123, first_name: 'User' },
              text: 'Original message',
            },
          },
        },
      ]);

      const result = await handler.execute({ messageId: 123 }, mockContext);

      expect(mockGetUpdates).toHaveBeenCalled();
      expect(result.content[0].text).toContain('Reply for message 123');
    });

    it('should retrieve all pending replies', async () => {
      mockGetAllReplies.mockResolvedValue([
        {
          messageId: 123,
          replyText: 'Reply 1',
          timestamp: 1234567890000,
        },
        {
          messageId: 456,
          replyText: 'Reply 2',
          timestamp: 1234567891000,
        },
      ]);

      const result = await handler.execute({}, mockContext);

      expect(mockGetAllReplies).toHaveBeenCalled();
      expect(result.content[0].text).toContain('2 pending');
    });

    it('should return empty when no replies', async () => {
      mockGetAllReplies.mockResolvedValue([]);

      const result = await handler.execute({}, mockContext);

      expect(result.content[0].text).toContain('No pending replies');
    });
  });
});
