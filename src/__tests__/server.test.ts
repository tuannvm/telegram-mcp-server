import { TelegramMcpServer } from '../server.js';

describe('TelegramMcpServer', () => {
  it('should instantiate with correct config', () => {
    const config = {
      name: 'test-server',
      version: '1.0.0',
    };
    const server = new TelegramMcpServer(config);
    expect(server).toBeInstanceOf(TelegramMcpServer);
  });
});
