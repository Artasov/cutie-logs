import {describe, expect, it, vi} from 'vitest';
import {createWsLogger} from '../src/ws';

function makeConsole() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    groupCollapsed: vi.fn(),
    groupEnd: vi.fn(),
  };
}

describe('createWsLogger', () => {
  it('logs websocket lifecycle events', () => {
    const output = makeConsole();
    const logger = createWsLogger({console: output});

    logger.connecting('/ws/chat/', 'wss://example.test/ws/chat/');
    logger.open('/ws/chat/');
    logger.close('/ws/chat/', 1000, 'done');

    expect(output.log).toHaveBeenCalledTimes(3);
    expect(output.log.mock.calls[1]?.[0]).toContain('WS ✓');
  });

  it('redacts and strips websocket URLs', () => {
    const output = makeConsole();
    const logger = createWsLogger({
      console: output,
      stripUrlPrefixes: ['ws://localhost:8000'],
    });

    logger.connecting(
      '/ws/chat/',
      'ws://localhost:8000/ws/chat/?token=secret&room=main',
    );

    expect(output.log).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      expect.any(String),
      {
        url: '/ws/chat/?token=redacted&room=main',
      },
    );
  });

  it('logs websocket payloads with redaction', () => {
    const output = makeConsole();
    const logger = createWsLogger({console: output});

    logger.message('/ws/chat/', 'message', {
      text: 'hello',
      token: 'secret',
    });

    expect(output.groupCollapsed).toHaveBeenCalledOnce();
    expect(output.log).toHaveBeenCalledWith(
      '%cPayload:',
      expect.any(String),
      {text: 'hello', token: '[redacted]'},
    );
    expect(output.groupEnd).toHaveBeenCalledOnce();
  });
});
