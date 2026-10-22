/**
 * Security and Address Validation.
 * Source: .claude/skills/console-security/SKILL.md and plan invariant 13.
 *
 * Rules:
 * 1. HTTPS required except for localhost, 127.0.0.1 and [::1].
 * 2. No credentials allowed in the address.
 * 3. Trailing slashes stripped.
 * 4. Keys masked everywhere: logs, inspector, copy-as-curl.
 */

export interface AddressValidationResult {
  isValid: boolean;
  normalizedUrl: string;
  isLocalhost: boolean;
  warning?: string;
  error?: string;
}

export function validateBackendAddress(input: string): AddressValidationResult {
  if (!input || !input.trim()) {
    return {
      isValid: false,
      normalizedUrl: '',
      isLocalhost: false,
      error: 'Backend address is required',
    };
  }

  let raw = input.trim();
  // Strip trailing slashes
  raw = raw.replace(/\/+$/, '');

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return {
      isValid: false,
      normalizedUrl: '',
      isLocalhost: false,
      error: 'Invalid URL format. Address must begin with https:// or http://',
    };
  }

  if (url.username || url.password) {
    return {
      isValid: false,
      normalizedUrl: '',
      isLocalhost: false,
      error: 'Security violation: credentials in URL are strictly forbidden',
    };
  }

  const host = url.hostname.toLowerCase();
  const isLocalhost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '[::1]';

  if (url.protocol === 'http:') {
    if (!isLocalhost) {
      return {
        isValid: false,
        normalizedUrl: '',
        isLocalhost: false,
        error: 'Insecure protocol: HTTPS is required for non-local addresses',
      };
    }
    return {
      isValid: true,
      normalizedUrl: url.origin,
      isLocalhost: true,
      warning: 'Local unencrypted connection (HTTP). Acceptable only on localhost.',
    };
  }

  if (url.protocol !== 'https:') {
    return {
      isValid: false,
      normalizedUrl: '',
      isLocalhost: false,
      error: 'Unsupported protocol. Only https: (or http: on localhost) is permitted',
    };
  }

  return {
    isValid: true,
    normalizedUrl: url.origin,
    isLocalhost,
  };
}

/**
 * Replaces sensitive key characters with placeholders for safe rendering.
 */
export function maskKey(key?: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••••••';
  const prefix = key.slice(0, 4);
  const suffix = key.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Sanitizes headers for display or export, masking X-API-Key and authorization secrets.
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    const lower = k.toLowerCase();
    if (lower === 'x-api-key' || lower === 'authorization' || lower.includes('secret') || lower.includes('signature')) {
      sanitized[k] = maskKey(v);
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}

/**
 * Formats a fetch request as a curl command with secrets safely replaced by placeholders.
 */
export function formatAsCurl(options: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
}): string {
  const parts = [`curl -X ${options.method.toUpperCase()} "${options.url}"`];

  if (options.headers) {
    for (const [key, val] of Object.entries(options.headers)) {
      const lower = key.toLowerCase();
      if (lower === 'x-api-key') {
        parts.push(`-H "X-API-Key: <YOUR_API_KEY>"`);
      } else {
        parts.push(`-H "${key}: ${val}"`);
      }
    }
  }

  if (options.body && options.method.toUpperCase() !== 'GET') {
    // Escape quotes for bash
    const escaped = options.body.replace(/"/g, '\\"');
    parts.push(`-d "${escaped}"`);
  }

  return parts.join(' \\\n  ');
}
