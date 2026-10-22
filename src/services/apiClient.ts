/**
 * Single API Client for PayBridge Console.
 * Source: .claude/skills/api-client-contract/SKILL.md and plan Step 34.
 *
 * Enforces:
 * - Single door for all network traffic
 * - Client-generated X-Request-Id attached to every request
 * - Action Log announcement (sent before, finished after)
 * - Request Inspector recording with masked credentials
 * - Error mapping from RFC 7807 Problem JSON with Retry-After support
 */

import { useSessionStore } from '../stores/sessionStore';
import { actionLog } from './actionLogService';
import { useInspectorStore } from '../stores/inspectorStore';
import { sanitizeHeaders, formatAsCurl } from '../utils/security';
import type { ProblemDetail } from '../types/api';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly title: string;
  readonly detail: string;
  readonly requestId: string;
  readonly retryAfterSeconds?: number;
  readonly isRateLimit: boolean;
  readonly isAuthError: boolean;
  readonly isNetworkError: boolean;
  readonly invalidParams?: Array<{ name?: string; reason?: string }>;

  constructor(options: {
    status: number;
    code?: string;
    title?: string;
    detail?: string;
    requestId?: string;
    retryAfterSeconds?: number;
    invalidParams?: Array<{ name?: string; reason?: string }>;
  }) {
    super(options.detail || options.title || `API error ${options.status}`);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code || (options.status === 429 ? 'RATE_LIMIT_EXCEEDED' : `HTTP_${options.status}`);
    this.title = options.title || `Request failed with status ${options.status}`;
    this.detail = options.detail || this.message;
    this.requestId = options.requestId || '';
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.isRateLimit = options.status === 429;
    this.isAuthError = options.status === 401 || options.status === 403;
    this.isNetworkError = options.status === 0;
    this.invalidParams = options.invalidParams;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: any;
  headers?: Record<string, string>;
  idempotencyKey?: string;
  label?: string;
  isPolling?: boolean;
}

export function generateRequestId(): string {
  // Format: safe chars up to 64 chars per back-end RequestIdFilter
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `req-${ts}-${rand}`;
}

export function generateIdempotencyKey(actionName = 'act'): string {
  return `${actionName}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function apiRequest<T = any>(options: RequestOptions): Promise<{ data: T; response: Response; requestId: string }> {
  const session = useSessionStore.getState();
  const baseUrl = session.backendUrl;
  const requestId = generateRequestId();

  // Build full query string
  let queryString = '';
  if (options.query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== null && v !== '') {
        params.append(k, String(v));
      }
    }
    const str = params.toString();
    if (str) queryString = `?${str}`;
  }

  const fullUrl = `${baseUrl}${options.path.startsWith('/') ? options.path : `/${options.path}`}${queryString}`;
  const method = options.method || 'GET';

  // Request headers
  const reqHeaders: Record<string, string> = {
    'Accept': 'application/json',
    'X-Request-Id': requestId,
    ...options.headers,
  };

  if (session.apiKey) {
    reqHeaders['X-API-Key'] = session.apiKey;
  }

  if (options.idempotencyKey) {
    reqHeaders['Idempotency-Key'] = options.idempotencyKey;
  }

  let bodyContent: string | undefined = undefined;
  if (options.body !== undefined && options.body !== null) {
    if (typeof options.body === 'string') {
      bodyContent = options.body;
      if (!reqHeaders['Content-Type']) {
        reqHeaders['Content-Type'] = 'text/plain';
      }
    } else {
      bodyContent = JSON.stringify(options.body);
      reqHeaders['Content-Type'] = 'application/json';
    }
  }

  // 1. Announce in Action Log BEFORE making the network call
  actionLog.logRequestSent({
    requestId,
    method,
    url: fullUrl,
    label: options.label,
    isPolling: options.isPolling,
    requestBody: bodyContent,
    headers: sanitizeHeaders(reqHeaders),
  });

  const startTime = performance.now();
  let response: Response;
  let responseText = '';

  try {
    response = await fetch(fullUrl, {
      method,
      headers: reqHeaders,
      body: bodyContent,
    });
    responseText = await response.text();
  } catch (err: any) {
    const duration = Math.round(performance.now() - startTime);
    const errorMsg = err.message || 'Network request failed';

    actionLog.logRequestFinished({
      requestId,
      status: 'Network Error',
      durationMs: duration,
      error: errorMsg,
      isPolling: options.isPolling,
    });

    useInspectorStore.getState().recordCall({
      id: requestId,
      requestId,
      method,
      url: fullUrl,
      status: 0,
      durationMs: duration,
      timestamp: new Date().toISOString(),
      label: options.label,
      requestHeaders: sanitizeHeaders(reqHeaders),
      requestBody: bodyContent,
      error: errorMsg,
      curl: formatAsCurl({ method, url: fullUrl, headers: reqHeaders, body: bodyContent }),
    });

    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      title: 'Network connection failed',
      detail: `Unable to reach backend at ${baseUrl}. Ensure backend is awake and CORS allows this origin.`,
      requestId,
    });
  }

  const durationMs = Math.round(performance.now() - startTime);
  const echoRequestId = response.headers.get('X-Request-Id') || requestId;

  // 2. Announce in Action Log AFTER receiving response
  actionLog.logRequestFinished({
    requestId: echoRequestId,
    status: response.status,
    durationMs,
    isPolling: options.isPolling,
    responseBody: responseText,
  });

  // Extract response headers
  const respHeaders: Record<string, string> = {};
  response.headers.forEach((val, key) => {
    respHeaders[key] = val;
  });

  // 3. Record in Request Inspector with masked headers
  useInspectorStore.getState().recordCall({
    id: echoRequestId,
    requestId: echoRequestId,
    method,
    url: fullUrl,
    status: response.status,
    durationMs,
    timestamp: new Date().toISOString(),
    label: options.label,
    requestHeaders: sanitizeHeaders(reqHeaders),
    requestBody: bodyContent,
    responseHeaders: respHeaders,
    responseBody: responseText,
    curl: formatAsCurl({ method, url: fullUrl, headers: reqHeaders, body: bodyContent }),
  });

  // Handle errors
  if (!response.ok) {
    let parsedProblem: ProblemDetail | null = null;
    try {
      parsedProblem = JSON.parse(responseText);
    } catch {
      // Not JSON
    }

    let retryAfterSeconds: number | undefined;
    const retryHeader = response.headers.get('Retry-After');
    if (retryHeader) {
      const parsedSec = parseInt(retryHeader, 10);
      if (!isNaN(parsedSec)) {
        retryAfterSeconds = parsedSec;
      }
    }

    throw new ApiError({
      status: response.status,
      code: parsedProblem?.code,
      title: parsedProblem?.title || response.statusText,
      detail: parsedProblem?.detail || (parsedProblem ? JSON.stringify(parsedProblem) : responseText) || `HTTP error ${response.status}`,
      requestId: echoRequestId,
      retryAfterSeconds,
      invalidParams: parsedProblem?.invalidParams,
    });
  }

  // Parse JSON response
  let data: T = null as any;
  if (responseText) {
    try {
      data = JSON.parse(responseText) as T;
    } catch {
      data = responseText as any;
    }
  }

  return { data, response, requestId: echoRequestId };
}

export const apiClient = {
  get: <T = any>(path: string, options?: Omit<RequestOptions, 'path' | 'method'>) =>
    apiRequest<T>({ path, method: 'GET', ...options }),
  post: <T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'path' | 'method' | 'body'>) =>
    apiRequest<T>({ path, method: 'POST', body, ...options }),
  put: <T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'path' | 'method' | 'body'>) =>
    apiRequest<T>({ path, method: 'PUT', body, ...options }),
  delete: <T = any>(path: string, options?: Omit<RequestOptions, 'path' | 'method'>) =>
    apiRequest<T>({ path, method: 'DELETE', ...options }),
};

