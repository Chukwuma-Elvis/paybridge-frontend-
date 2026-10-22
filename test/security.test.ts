import { describe, it, expect } from 'vitest';
import { validateBackendAddress, maskKey, sanitizeHeaders, formatAsCurl } from '../src/utils/security';

describe('Security and Address Validation', () => {
  describe('validateBackendAddress', () => {
    it('accepts valid https URLs and strips trailing slash', () => {
      const res = validateBackendAddress('https://paybridge-demo.onrender.com/');
      expect(res.isValid).toBe(true);
      expect(res.normalizedUrl).toBe('https://paybridge-demo.onrender.com');
      expect(res.isLocalhost).toBe(false);
      expect(res.error).toBeUndefined();
    });

    it('accepts localhost with plain http and provides a warning', () => {
      const res = validateBackendAddress('http://localhost:8080');
      expect(res.isValid).toBe(true);
      expect(res.normalizedUrl).toBe('http://localhost:8080');
      expect(res.isLocalhost).toBe(true);
      expect(res.warning).toBeDefined();
    });

    it('accepts 127.0.0.1 with plain http', () => {
      const res = validateBackendAddress('http://127.0.0.1:8080');
      expect(res.isValid).toBe(true);
      expect(res.normalizedUrl).toBe('http://127.0.0.1:8080');
      expect(res.isLocalhost).toBe(true);
    });

    it('rejects plain http for remote addresses', () => {
      const res = validateBackendAddress('http://api.paybridge.com');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('HTTPS is required');
    });

    it('rejects URLs containing user credentials', () => {
      const res = validateBackendAddress('https://admin:secret@paybridge.onrender.com');
      expect(res.isValid).toBe(false);
      expect(res.error).toContain('credentials in URL');
    });

    it('rejects invalid URL strings', () => {
      const res = validateBackendAddress('not-a-url');
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('maskKey', () => {
    it('masks full string if 8 characters or shorter', () => {
      expect(maskKey('12345678')).toBe('••••••••');
    });

    it('preserves 4 char prefix and 4 char suffix while masking the rest', () => {
      expect(maskKey('adm-1234567890abcdef')).toBe('adm-••••••••cdef');
    });
  });

  describe('sanitizeHeaders and formatAsCurl', () => {
    it('masks X-API-Key in sanitized headers and curl output', () => {
      const headers = {
        'Content-Type': 'application/json',
        'X-API-Key': 'super-secret-admin-key-12345',
        'X-Request-Id': 'req-999',
      };

      const sanitized = sanitizeHeaders(headers);
      expect(sanitized['X-API-Key']).not.toContain('super-secret-admin-key-12345');
      expect(sanitized['X-API-Key']).toContain('••••••••');

      const curl = formatAsCurl({
        method: 'POST',
        url: 'https://paybridge.onrender.com/api/transfers',
        headers,
        body: '{"amountMinor":100}',
      });

      expect(curl).not.toContain('super-secret-admin-key-12345');
      expect(curl).toContain('-H "X-API-Key: <YOUR_API_KEY>"');
    });
  });
});
