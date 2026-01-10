import { CheckRepliesToolHandler } from '../tools/check-replies.js';
import { getReply, getAllPendingReplies, markReplyConsumed, deleteReply } from '../storage/index.js';

jest.mock('../storage/index.js', () => ({
  getReply: jest.fn(),
  getAllPendingReplies: jest.fn(),
  markReplyConsumed: jest.fn(),
  deleteReply: jest.fn(),
}));

describe('CheckRepliesToolHandler', () => {
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

  it('should return message when specific messageId is provided', async () => {
    (getReply as jest.Mock).mockResolvedValue({
      messageId: 123,
      chatId: '123456',
      replyText: 'Test reply',
      timestamp: Date.now(),
      status: 'pending',
    });

    const result = await handler.execute({ messageId: 123 }, mockContext);

    expect(getReply).toHaveBeenCalledWith(123);
    expect(markReplyConsumed).toHaveBeenCalledWith(123);
    expect(result.content[0].text).toContain('Reply for message 123');
    expect(result.content[0].text).toContain('Test reply');
  });

  it('should return not found when reply does not exist', async () => {
    (getReply as jest.Mock).mockResolvedValue(null);

    const result = await handler.execute({ messageId: 123 }, mockContext);

    expect(result.content[0].text).toContain('No reply found for message ID 123');
  });

  it('should return all pending replies when no messageId provided', async () => {
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

    (getAllPendingReplies as jest.Mock).mockResolvedValue(replies);

    const result = await handler.execute({}, mockContext);

    expect(getAllPendingReplies).toHaveBeenCalled();
    expect(deleteReply).toHaveBeenCalledTimes(2);
    expect(result.content[0].text).toContain('2 pending reply');
    expect(result.content[0].text).toContain('Reply 1');
    expect(result.content[0].text).toContain('Reply 2');
  });

  it('should return empty message when no pending replies', async () => {
    (getAllPendingReplies as jest.Mock).mockResolvedValue([]);

    const result = await handler.execute({}, mockContext);

    expect(result.content[0].text).toContain('No pending replies found');
  });
});
