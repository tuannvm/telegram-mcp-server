import { SendAndWaitToolHandler } from '../tools/send-and-wait.js';
import { saveSentMessage, getReply } from '../storage/index.js';

jest.mock('../storage/index.js', () => ({
  saveSentMessage: jest.fn(),
  updateMessageStatus: jest.fn(),
  getReply: jest.fn(),
  sleep: jest.fn(() => Promise.resolve()),
}));

jest.mock('../tools/send-and-wait.ts', () => {
  const originalModule = jest.requireActual('../tools/send-and-wait.ts');
  return {
    ...originalModule,
    sendTelegramMessage: jest.fn(),
  };
});

jest.doMock('../tools/send-and-wait.ts', () => ({
  SendAndWaitToolHandler: jest.fn().mockImplementation(() => ({
    execute: jest.fn(),
  })),
}));

describe('SendAndWaitToolHandler', () => {
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

  it('should send message without waiting', async () => {
    (saveSentMessage as jest.Mock).mockResolvedValue(undefined);

    const result = await handler.execute(
      { message: 'Test message', waitForReply: false },
      mockContext
    );

    expect(saveSentMessage).toHaveBeenCalledWith(123, expect.objectContaining({
      message: 'Test message',
      status: 'sent',
    }));

    expect(result.content[0].text).toContain('Message sent (ID: 123)');
    expect(result.isError).toBeFalsy();
  });

  it('should poll for reply when waitForReply is true', async () => {
    (saveSentMessage as jest.Mock).mockResolvedValue(undefined);
    (getReply as jest.Mock)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        messageId: 123,
        chatId: '123456',
        replyText: 'User reply',
        timestamp: Date.now(),
        status: 'pending',
      });

    const result = await handler.execute(
      { message: 'Test message', waitForReply: true, timeout: 10, pollInterval: 1 },
      mockContext
    );

    expect(mockContext.sendProgress).toHaveBeenCalled();
    expect(result.content[0].text).toContain('Reply received');
    expect(result.content[0].text).toContain('User reply');
  });

  it('should timeout when no reply received', async () => {
    (saveSentMessage as jest.Mock).mockResolvedValue(undefined);
    (getReply as jest.Mock).mockResolvedValue(null);

    const result = await handler.execute(
      { message: 'Test message', waitForReply: true, timeout: 1, pollInterval: 1 },
      mockContext
    );

    expect(result.content[0].text).toContain('Timeout');
  });

  it('should handle missing credentials', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;

    const result = await handler.execute(
      { message: 'Test message' },
      mockContext
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Missing');
  });
});
