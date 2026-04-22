import {
  type CutieLogOptions,
  type ResolvedCutieLogOptions,
  formatPayload,
  formatTime,
  formatUrl,
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
      logWsLine(baseOptions, '->', 'CONNECTING', path, resolvedUrlPayload(url, baseOptions));
    },
    open(path, url) {
      logWsLine(baseOptions, '✓', 'CONNECTED', path, resolvedUrlPayload(url, baseOptions), 'open');
    },
    close(path, code, reason) {
      logWsLine(baseOptions, '✗', 'DISCONNECTED', path, {code, reason}, 'close');
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
  tone: 'event' | 'open' | 'close' | 'warning' | 'error' = 'event',
): void {
  const resolved = resolveLogOptions(options);
  if (!resolved.enabled) return;

  const color = resolved.colors[tone];
  const timeText = formatLogTime(resolved);
  const message = [`%c${resolved.label} ${marker}`, `%c${eventName}`, `%c${path}`];
  const args = [style(resolved.colors.ws), style(color), style(resolved.colors.url)];
  if (timeText) {
    message.push(`%c[${timeText}]`);
    args.push(style(resolved.colors.data));
  }

  resolved.console.log(message.join(' '), ...args, formatPayload(payload, resolved));
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

  const timeText = formatLogTime(resolved);
  const message = [`%c${resolved.label} ${marker}`, `%c${eventName}`, `%c${path}`];
  const args = [
    style(resolved.colors.ws),
    style(resolved.colors.event),
    style(resolved.colors.url),
  ];
  if (timeText) {
    message.push(`%c[${timeText}]`);
    args.push(style(resolved.colors.data));
  }

  resolved.console.groupCollapsed(message.join(' '), ...args);
  resolved.console.log('%cPayload:', style(resolved.colors.data), formatPayload(payload, resolved));
  resolved.console.groupEnd();
}

function resolvedUrlPayload(
  url: string | undefined,
  options: CreateWsLoggerOptions,
): {url: string} | undefined {
  if (!url) return undefined;
  const resolved = resolveLogOptions(options);
  return {url: formatUrl(url, undefined, resolved)};
}

function formatLogTime(options: ResolvedCutieLogOptions): string | null {
  if (!options.logRequestsTime) return null;
  return formatTime(options.timeLocale, options.timestampFormatter);
}
