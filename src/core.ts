export type CutieLogLevel = 'request' | 'response' | 'error' | 'ws' | 'event';

export type CutieConsole = Pick<
  Console,
  'log' | 'error' | 'warn' | 'groupCollapsed' | 'groupEnd'
>;

export type CutieLogColors = {
  label: string;
  request: string;
  response: string;
  ws: string;
  open: string;
  close: string;
  method: string;
  url: string;
  success: string;
  warning: string;
  error: string;
  data: string;
  event: string;
};

export type CutieLogOptions = {
  enabled?: boolean;
  label?: string;
  maxPayloadKB?: number | null;
  redactFields?: readonly string[];
  stripUrlPrefixes?: readonly string[];
  timeLocale?: string;
  console?: CutieConsole;
  colors?: Partial<CutieLogColors>;
};

export const DEFAULT_REDACT_FIELDS = [
  'password',
  'password_confirm',
  'passwordConfirm',
  'token',
  'access',
  'access_token',
  'accessToken',
  'refresh',
  'refresh_token',
  'refreshToken',
  'authorization',
  'secret',
  'secret_key',
  'secretKey',
  'api_key',
  'apiKey',
  'client_secret',
  'clientSecret',
] as const;

const DEFAULT_COLORS: CutieLogColors = {
  label: '#E91E63',
  request: '#4CAF50',
  response: '#2196F3',
  ws: '#E91E63',
  open: '#4CAF50',
  close: '#FF9800',
  method: '#FF9800',
  url: '#9C27B0',
  success: '#2196F3',
  warning: '#FF9800',
  error: '#F44336',
  data: '#607D8B',
  event: '#9C27B0',
};

const REDACTED = '[redacted]';
const URL_REDACTED = 'redacted';
const MAX_DEPTH = 8;

export type ResolvedCutieLogOptions = Required<
  Pick<CutieLogOptions, 'enabled' | 'label' | 'timeLocale' | 'console'>
> & {
  maxPayloadKB: number | null;
  redactFields: readonly string[];
  stripUrlPrefixes: readonly string[];
  colors: CutieLogColors;
};

export function resolveLogOptions(options: CutieLogOptions = {}): ResolvedCutieLogOptions {
  return {
    enabled: options.enabled ?? true,
    label: options.label ?? 'API',
    maxPayloadKB: options.maxPayloadKB ?? null,
    redactFields: options.redactFields ?? DEFAULT_REDACT_FIELDS,
    stripUrlPrefixes: options.stripUrlPrefixes ?? [],
    timeLocale: options.timeLocale ?? 'ru-RU',
    console: options.console ?? console,
    colors: {...DEFAULT_COLORS, ...options.colors},
  };
}

export function style(color: string): string {
  return `color: ${color}; font-weight: bold;`;
}

export function formatTime(locale: string): string {
  return new Date().toLocaleTimeString(locale, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

export function formatUrl(
  url?: string,
  baseURL?: string,
  options?: Pick<ResolvedCutieLogOptions, 'redactFields' | 'stripUrlPrefixes'>,
): string {
  if (!url) return 'unknown';
  const fullUrl = buildFullUrl(url, baseURL);
  return sanitizeUrl(fullUrl, options);
}

export function sanitizeUrl(
  url: string,
  options?: Pick<ResolvedCutieLogOptions, 'redactFields' | 'stripUrlPrefixes'>,
): string {
  const redactedUrl = redactUrlQuery(url, options?.redactFields ?? DEFAULT_REDACT_FIELDS);
  return stripUrlPrefixes(redactedUrl, options?.stripUrlPrefixes ?? []);
}

function buildFullUrl(url: string, baseURL?: string): string {
  if (/^(https?|wss?):\/\//i.test(url)) return url;
  if (!baseURL) return url;
  try {
    return new URL(url, baseURL).toString();
  } catch {
    return `${baseURL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
  }
}

function redactUrlQuery(url: string, redactFields: readonly string[]): string {
  const redactSet = normalizeRedactFields(redactFields);
  const isAbsolute = /^(https?|wss?):\/\//i.test(url);
  const hasRelativeQuery = !isAbsolute && (url.startsWith('/') || url.startsWith('?'));

  if (!isAbsolute && !hasRelativeQuery) {
    return redactUrlQueryFallback(url, redactSet);
  }

  try {
    const parsed = new URL(url, isAbsolute ? undefined : 'http://cutie-logs.local');
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (shouldRedactKey(key, redactSet)) {
        parsed.searchParams.set(key, URL_REDACTED);
      }
    }
    if (isAbsolute) return parsed.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return redactUrlQueryFallback(url, redactSet);
  }
}

function redactUrlQueryFallback(url: string, redactSet: Set<string>): string {
  return url.replace(/([?&])([^=&?#]+)=([^&#]*)/g, (match, prefix: string, key: string) => {
    return shouldRedactKey(decodeURIComponent(key), redactSet)
      ? `${prefix}${key}=${URL_REDACTED}`
      : match;
  });
}

function stripUrlPrefixes(url: string, prefixes: readonly string[]): string {
  const sortedPrefixes = [...prefixes]
    .filter((prefix) => prefix.trim().length > 0)
    .sort((left, right) => right.length - left.length);

  for (const prefix of sortedPrefixes) {
    if (url.startsWith(prefix)) {
      const stripped = url.slice(prefix.length);
      return stripped.startsWith('/') || stripped.startsWith('?') ? stripped : `/${stripped}`;
    }
  }

  return url;
}

export function formatPayload(payload: unknown, options: ResolvedCutieLogOptions): unknown {
  const sanitized = sanitizePayload(payload, options.redactFields);
  if (!options.maxPayloadKB || options.maxPayloadKB <= 0) {
    return sanitized;
  }

  const text = stringifyForSize(sanitized);
  const maxBytes = options.maxPayloadKB * 1024;
  if (byteLength(text) <= maxBytes) {
    return sanitized;
  }

  return {
    truncated: true,
    sizeKB: Math.ceil(byteLength(text) / 1024),
    maxPayloadKB: options.maxPayloadKB,
    preview: truncateByBytes(text, maxBytes),
  };
}

export function sanitizePayload(
  payload: unknown,
  redactFields: readonly string[] = DEFAULT_REDACT_FIELDS,
): unknown {
  return sanitizeValue(payload, new WeakSet<object>(), normalizeRedactFields(redactFields), 0);
}

function sanitizeValue(
  value: unknown,
  seen: WeakSet<object>,
  redactFields: Set<string>,
  depth: number,
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return '[function]';
  if (typeof value !== 'object') return String(value);
  if (depth >= MAX_DEPTH) return '[max-depth]';

  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, seen, redactFields, depth + 1));
  }

  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    result[key] = shouldRedactKey(key, redactFields)
      ? REDACTED
      : sanitizeValue(item, seen, redactFields, depth + 1);
  }
  return result;
}

function normalizeRedactFields(fields: readonly string[]): Set<string> {
  return new Set(fields.map(normalizeKey));
}

function shouldRedactKey(key: string, redactFields: Set<string>): boolean {
  const normalized = normalizeKey(key);
  return redactFields.has(normalized);
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[-_\s]/g, '');
}

function stringifyForSize(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function truncateByBytes(value: string, maxBytes: number): string {
  if (maxBytes <= 0) return '';
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const bytes = encoder.encode(value);
  if (bytes.length <= maxBytes) return value;
  return `${decoder.decode(bytes.slice(0, maxBytes))}...`;
}
