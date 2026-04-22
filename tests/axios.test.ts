import axios from 'axios';
import {describe, expect, it, vi} from 'vitest';
import {attachAxiosLogger} from '../src/axios';

function makeConsole() {
  return {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    groupCollapsed: vi.fn(),
    groupEnd: vi.fn(),
  };
}

describe('attachAxiosLogger', () => {
  it('logs request and response for an axios instance', async () => {
    const api = axios.create();
    const output = makeConsole();
    attachAxiosLogger(api, {console: output, label: 'API'});

    api.defaults.adapter = async (config) => ({
      data: {ok: true},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    await api.post('/users/', {email: 'user@example.com', password: 'secret'}, {
      baseURL: 'https://example.test/api',
    });

    expect(output.groupCollapsed).toHaveBeenCalledTimes(2);
    expect(output.log).toHaveBeenCalledWith(
      '%cRequest data:',
      expect.any(String),
      expect.objectContaining({password: '[redacted]'}),
    );
    expect(output.log).toHaveBeenCalledWith(
      '%cResponse data:',
      expect.any(String),
      {ok: true},
    );
  });

  it('can detach interceptors', async () => {
    const api = axios.create();
    const output = makeConsole();
    const detach = attachAxiosLogger(api, {console: output});
    detach();

    api.defaults.adapter = async (config) => ({
      data: {ok: true},
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    });

    await api.get('/status/');

    expect(output.groupCollapsed).not.toHaveBeenCalled();
  });
});
