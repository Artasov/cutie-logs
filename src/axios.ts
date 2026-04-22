import type {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import {
  type CutieLogOptions,
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

export function attachAxiosLogger(
  api: AxiosInstance,
  options: AttachAxiosLoggerOptions = {},
): DetachAxiosLogger {
  const requestInterceptorId = api.interceptors.request.use((config) => {
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
  const fullUrl = formatUrl(config.url, config.baseURL);
  const timestamp = formatTime(resolved.timeLocale);

  resolved.console.groupCollapsed(
    `%c${resolved.label} -> %c${method} %c${fullUrl} %c[${timestamp}]`,
    style(resolved.colors.label),
    style(resolved.colors.method),
    style(resolved.colors.url),
    style(resolved.colors.data),
  );

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
  const fullUrl = formatUrl(response.config.url, response.config.baseURL);
  const timestamp = formatTime(resolved.timeLocale);
  const statusColor =
    response.status >= 200 && response.status < 300
      ? resolved.colors.success
      : resolved.colors.error;

  resolved.console.groupCollapsed(
    `%c${resolved.label} <- %c${method} %c${fullUrl} %c[${response.status}] %c[${timestamp}]`,
    style(resolved.colors.label),
    style(resolved.colors.method),
    style(resolved.colors.url),
    style(statusColor),
    style(resolved.colors.data),
  );

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
    const timestamp = formatTime(resolved.timeLocale);
    resolved.console.groupCollapsed(
      `%c${resolved.label} x %c[NETWORK ERROR] %c[${timestamp}]`,
      style(resolved.colors.error),
      style(resolved.colors.error),
      style(resolved.colors.data),
    );
    resolved.console.log('%cError message:', style(resolved.colors.data), error.message);
    resolved.console.groupEnd();
    return;
  }

  const method = (config.method ?? 'GET').toUpperCase();
  const fullUrl = formatUrl(config.url, config.baseURL);
  const timestamp = formatTime(resolved.timeLocale);
  const status = error.response?.status ?? 'ERROR';

  resolved.console.groupCollapsed(
    `%c${resolved.label} x %c${method} %c${fullUrl} %c[${status}] %c[${timestamp}]`,
    style(resolved.colors.error),
    style(resolved.colors.method),
    style(resolved.colors.url),
    style(resolved.colors.error),
    style(resolved.colors.data),
  );

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
