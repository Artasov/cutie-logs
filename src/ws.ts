import {
  type CutieLogOptions,
  formatPayload,
  formatTime,
  resolveLogOptions,
  style,
} from './core';

export type WsLogger = {
  connecting: (path: string, url?: string) => void;
  open: (path: string, url?: string) => void;
  close: (path: string, code?: number, reason?: string) => void;
  error: (path: string, error?: unknown) => void;
  reconnect: (path: string, attempt: number, delayMs: number) => void;
  message: (path: string, eventName: string, payload?: unknown) => void;
  send: (path: string, eventName: string, payload?: unknown) => void;
};

export type CreateWsLoggerOptions = CutieLogOptions;

export function createWsLogger(options: CreateWsLoggerOptions = {}): WsLogger {
  const baseOptions = {
    label: 'WS',
    ...options,
  } satisfies CreateWsLoggerOptions;

  return {
    connecting(path, url) {
      logWsLine(baseOptions, '->', 'CONNECTING', path, resolvedUrlPayload(url));
    },
    open(path, url) {
      logWsLine(baseOptions, 'ok', 'CONNECTED', path, resolvedUrlPayload(url), 'success');
    },
    close(path, code, reason) {
      logWsLine(baseOptions, 'x', 'DISCONNECTED', path, {code, reason}, 'warning');
    },
    error(path, error) {
      logWsLine(baseOptions, '!', 'ERROR', path, error, 'error');
    },
    reconnect(path, attempt, delayMs) {
      logWsLine(baseOptions, '~', 'RECONNECTING', path, {attempt, delayMs}, 'warning');
    },
    message(path, eventName, payload) {
      logWsPayload(baseOptions, '<-', eventName, path, payload);
    },
    send(path, eventName, payload) {
      logWsPayload(baseOptions, '->', eventName, path, payload);
    },
  };
}

function logWsLine(
  options: CreateWsLoggerOptions,
  marker: string,
  eventName: string,
  path: string,
  payload?: unknown,
  tone: 'event' | 'success' | 'warning' | 'error' = 'event',
): void {
  const resolved = resolveLogOptions(options);
  if (!resolved.enabled) return;

  const timestamp = formatTime(resolved.timeLocale);
  const color = resolved.colors[tone];
  resolved.console.log(
    `%c${resolved.label} ${marker} %c${eventName} %c${path} %c[${timestamp}]`,
    style(resolved.colors.label),
    style(color),
    style(resolved.colors.url),
    style(resolved.colors.data),
    formatPayload(payload, resolved),
  );
}

function logWsPayload(
  options: CreateWsLoggerOptions,
  marker: string,
  eventName: string,
  path: string,
  payload?: unknown,
): void {
  const resolved = resolveLogOptions(options);
  if (!resolved.enabled) return;

  const timestamp = formatTime(resolved.timeLocale);
  resolved.console.groupCollapsed(
    `%c${resolved.label} ${marker} %c${eventName} %c${path} %c[${timestamp}]`,
    style(resolved.colors.label),
    style(resolved.colors.event),
    style(resolved.colors.url),
    style(resolved.colors.data),
  );
  resolved.console.log('%cPayload:', style(resolved.colors.data), formatPayload(payload, resolved));
  resolved.console.groupEnd();
}

function resolvedUrlPayload(url?: string): {url: string} | undefined {
  return url ? {url} : undefined;
}
