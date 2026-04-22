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
