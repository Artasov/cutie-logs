import {describe, expect, it} from 'vitest';
import {formatPayload, formatUrl, resolveLogOptions, sanitizePayload} from '../src';

describe('sanitizePayload', () => {
  it('redacts sensitive fields recursively', () => {
    expect(
      sanitizePayload({
        email: 'user@example.com',
        password: 'secret',
        nested: {
          access_token: 'abc',
          safe: 'ok',
        },
      }),
    ).toEqual({
      email: 'user@example.com',
      password: '[redacted]',
      nested: {
        access_token: '[redacted]',
        safe: 'ok',
      },
    });
  });

  it('handles circular payloads', () => {
    const payload: Record<string, unknown> = {name: 'root'};
    payload.self = payload;

    expect(sanitizePayload(payload)).toEqual({
      name: 'root',
      self: '[circular]',
    });
  });
});

describe('formatPayload', () => {
  it('does not truncate payloads by default', () => {
    const options = resolveLogOptions();
    expect(formatPayload({value: 'x'.repeat(2000)}, options)).toEqual({
      value: 'x'.repeat(2000),
    });
  });

  it('truncates payloads when maxPayloadKB is set', () => {
    const options = resolveLogOptions({maxPayloadKB: 1});
    const result = formatPayload({value: 'x'.repeat(3000)}, options);

    expect(result).toMatchObject({
      truncated: true,
      maxPayloadKB: 1,
    });
  });
});

describe('formatUrl', () => {
  it('strips configured URL prefixes', () => {
    const options = resolveLogOptions({
      stripUrlPrefixes: ['http://localhost:8000', 'https://xlartas.com'],
    });

    expect(formatUrl('/auth/ws-ticket/', 'http://localhost:8000', options)).toBe(
      '/auth/ws-ticket/',
    );
    expect(formatUrl('https://xlartas.com/api/v1/me/', undefined, options)).toBe(
      '/api/v1/me/',
    );
  });

  it('redacts sensitive query params in URLs', () => {
    const options = resolveLogOptions();

    expect(
      formatUrl(
        'ws://localhost:8000/ws/ai/transcriptions/?token=secret&room=main',
        undefined,
        options,
      ),
    ).toBe('ws://localhost:8000/ws/ai/transcriptions/?token=redacted&room=main');
  });
});
