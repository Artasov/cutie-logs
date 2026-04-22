import {describe, expect, it} from 'vitest';
import {formatPayload, resolveLogOptions, sanitizePayload} from '../src';

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
