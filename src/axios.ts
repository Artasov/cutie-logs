import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import {
  type CutieLogOptions,
  type ResolvedCutieLogOptions,
  formatPayload,
  formatTime,
  formatUrl,
  resolveLogOptions,
  style,
} from './core';

export type AttachAxiosLoggerOptions = CutieLogOptions & {
  logRequestData?: boolean;
  logResponseData?: boolean;
};

export type DetachAxiosLogger = () => void;

const REQUEST_STARTED_AT = '__cutieLogsStartedAt';

export function attachAxiosLogger(
  api: AxiosInstance,
  options: AttachAxiosLoggerOptions = {},
): DetachAxiosLogger {
  const requestInterceptorId = api.interceptors.request.use((config) => {
    (config as unknown as Record<string, unknown>)[REQUEST_STARTED_AT] = nowMs();
    logAxiosRequest(config, options);
    return config;
  });

  const responseInterceptorId = api.interceptors.response.use(
    (response) => {
      logAxiosResponse(response, options);
      return response;
    },
    (error: AxiosError) => {
      logAxiosError(error, options);
      return Promise.reject(error);
    },
  );

  return () => {
    api.interceptors.request.eject(requestInterceptorId);
    api.interceptors.response.eject(responseInterceptorId);
  };
}

export function logAxiosRequest(
  config: InternalAxiosRequestConfig | AxiosRequestConfig,
  options: AttachAxiosLoggerOptions = {},
): void {
  const resolved = resolveLogOptions(options);
  if (!resolved.enabled) return;

  const method = (config.method ?? 'GET').toUpperCase();
  const fullUrl = formatUrl(config.url, config.baseURL, resolved);
  const timeText = formatLogTime(resolved);

  const message = [`%c${resolved.label} →`, `%c${method}`, `%c${fullUrl}`];
  const args = [
    style(resolved.colors.request),
    style(resolved.colors.method),
    style(resolved.colors.url),
  ];
  if (timeText) {
    message.push(`%c[${timeText}]`);
    args.push(style(resolved.colors.data));
  }

  resolved.console.groupCollapsed(message.join(' '), ...args);

  if (config.params) {
    resolved.console.log(
      '%cQuery params:',
      style(resolved.colors.data),
      formatPayload(config.params, resolved),
    );
  }
  if (options.logRequestData !== false && config.data) {
    resolved.console.log(
      '%cRequest data:',
      style(resolved.colors.data),
      formatPayload(config.data, resolved),
    );
  }
  resolved.console.groupEnd();
}

export function logAxiosResponse(
  response: AxiosResponse,
  options: AttachAxiosLoggerOptions = {},
): void {
  const resolved = resolveLogOptions(options);
  if (!resolved.enabled) return;

  const method = (response.config.method ?? 'GET').toUpperCase();
  const fullUrl = formatUrl(response.config.url, response.config.baseURL, resolved);
  const timeText = formatLogTime(resolved);
  const delayText = formatLogDelay(response.config, resolved);
  const statusColor =
    response.status >= 200 && response.status < 300
      ? resolved.colors.response
      : resolved.colors.error;

  const message = [
    `%c${resolved.label} ←`,
    `%c${method}`,
    `%c${fullUrl}`,
    `%c[${response.status}]`,
  ];
  const args = [
    style(resolved.colors.response),
    style(resolved.colors.method),
    style(resolved.colors.url),
    style(statusColor),
  ];
  if (delayText) {
    message.push(`%c[${delayText}]`);
    args.push(style(resolved.colors.data));
  }
  if (timeText) {
    message.push(`%c[${timeText}]`);
    args.push(style(resolved.colors.data));
  }

  resolved.console.groupCollapsed(message.join(' '), ...args);

  if (response.statusText) {
    resolved.console.log('%cStatus:', style(resolved.colors.data), response.statusText);
  }
  if (options.logResponseData !== false && response.data) {
    resolved.console.log(
      '%cResponse data:',
      style(resolved.colors.data),
      formatPayload(response.data, resolved),
    );
  }
  resolved.console.groupEnd();
}

export function logAxiosError(error: AxiosError, options: AttachAxiosLoggerOptions = {}): void {
  const resolved = resolveLogOptions(options);
  if (!resolved.enabled) return;

  const config = error.config;
  if (!config) {
    const timeText = formatLogTime(resolved);
    const message = [`%c${resolved.label} ✗`, `%c[NETWORK ERROR]`];
    const args = [style(resolved.colors.error), style(resolved.colors.error)];
    if (timeText) {
      message.push(`%c[${timeText}]`);
      args.push(style(resolved.colors.data));
    }
    resolved.console.groupCollapsed(message.join(' '), ...args);
    resolved.console.log('%cError message:', style(resolved.colors.data), error.message);
    resolved.console.groupEnd();
    return;
  }

  const method = (config.method ?? 'GET').toUpperCase();
  const fullUrl = formatUrl(config.url, config.baseURL, resolved);
  const timeText = formatLogTime(resolved);
  const delayText = formatLogDelay(config, resolved);
  const status = error.response?.status ?? 'ERROR';

  const message = [
    `%c${resolved.label} ✗`,
    `%c${method}`,
    `%c${fullUrl}`,
    `%c[${status}]`,
  ];
  const args = [
    style(resolved.colors.error),
    style(resolved.colors.method),
    style(resolved.colors.url),
    style(resolved.colors.error),
  ];
  if (delayText) {
    message.push(`%c[${delayText}]`);
    args.push(style(resolved.colors.data));
  }
  if (timeText) {
    message.push(`%c[${timeText}]`);
    args.push(style(resolved.colors.data));
  }

  resolved.console.groupCollapsed(message.join(' '), ...args);

  if (error.response?.data) {
    resolved.console.log(
      '%cError response data:',
      style(resolved.colors.data),
      formatPayload(error.response.data, resolved),
    );
  } else {
    resolved.console.log('%cError message:', style(resolved.colors.data), error.message);
  }
  resolved.console.groupEnd();
}

function nowMs(): number {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

function formatLogTime(options: ResolvedCutieLogOptions): string | null {
  if (!options.logRequestsTime) return null;
  return formatTime(options.timeLocale, options.timestampFormatter);
}

function formatLogDelay(
  config: AxiosRequestConfig | InternalAxiosRequestConfig,
  options: ResolvedCutieLogOptions,
): string | null {
  if (!options.logRequestsDelay) return null;
  const startedAt = (config as unknown as Record<string, unknown>)[REQUEST_STARTED_AT];
  if (typeof startedAt !== 'number') return null;
  return `${Math.max(0, Math.round(nowMs() - startedAt))}ms`;
}
