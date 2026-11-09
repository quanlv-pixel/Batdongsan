import { describe, expect, it } from 'vitest';
import { isValidReturnTo, sanitizeReturnTo } from '@/lib/navigation';

describe('sanitizeReturnTo & isValidReturnTo', () => {
  describe('Legitimate Internal Paths (Accepted)', () => {
    it('accepts standard detail page path', () => {
      const input = '/vi/bat-dong-san/seed_listing_01';
      expect(sanitizeReturnTo(input)).toBe('/vi/bat-dong-san/seed_listing_01');
      expect(isValidReturnTo(input)).toBe(true);
    });

    it('accepts detail page path with search query parameters', () => {
      const input = '/vi/bat-dong-san/seed_listing_01?source=search&page=2';
      expect(sanitizeReturnTo(input)).toBe(
        '/vi/bat-dong-san/seed_listing_01?source=search&page=2',
      );
      expect(isValidReturnTo(input)).toBe(true);
    });

    it('accepts path with query and hash fragment', () => {
      const input = '/en/bat-dong-san/seed_listing_01?filter=true#gallery';
      expect(sanitizeReturnTo(input)).toBe(
        '/en/bat-dong-san/seed_listing_01?filter=true#gallery',
      );
      expect(isValidReturnTo(input)).toBe(true);
    });

    it('accepts root path and search listings path', () => {
      expect(sanitizeReturnTo('/')).toBe('/');
      expect(sanitizeReturnTo('/vi/bat-dong-san')).toBe('/vi/bat-dong-san');
    });

    it('trims leading/trailing whitespace around safe paths', () => {
      expect(sanitizeReturnTo('  /vi/bat-dong-san/seed_listing_01  ')).toBe(
        '/vi/bat-dong-san/seed_listing_01',
      );
    });
  });

  describe('Unsafe External & Open Redirect Payloads (Rejected)', () => {
    it('rejects absolute external URLs', () => {
      expect(sanitizeReturnTo('https://evil.example')).toBeNull();
      expect(sanitizeReturnTo('http://evil.example/login')).toBeNull();
      expect(sanitizeReturnTo('ftp://evil.example')).toBeNull();
      expect(sanitizeReturnTo('javascript:alert(1)')).toBeNull();
      expect(sanitizeReturnTo('data:text/html,<script>evil()</script>')).toBeNull();
    });

    it('rejects protocol-relative URLs (//evil.example)', () => {
      expect(sanitizeReturnTo('//evil.example')).toBeNull();
      expect(sanitizeReturnTo('///evil.example')).toBeNull();
      expect(sanitizeReturnTo('//localhost:3000')).toBeNull();
    });

    it('rejects leading-backslash and backslash bypasses (/\\evil.example, /\\evil.example)', () => {
      expect(sanitizeReturnTo('/\\evil.example')).toBeNull();
      expect(sanitizeReturnTo('/\\evil.example/path')).toBeNull();
      expect(sanitizeReturnTo('\\evil.example')).toBeNull();
      expect(sanitizeReturnTo('/evil.example\\test')).toBeNull();
      expect(sanitizeReturnTo('/vi/bat-dong-san\\seed_01')).toBeNull();
    });

    it('rejects percent-encoded backslash bypasses (/%5C%5Cevil.example)', () => {
      expect(sanitizeReturnTo('/%5C%5Cevil.example')).toBeNull();
      expect(sanitizeReturnTo('/%5cevil.example')).toBeNull();
      expect(sanitizeReturnTo('/%5Cevil.example')).toBeNull();
      expect(sanitizeReturnTo('/path%5cattack')).toBeNull();
    });

    it('rejects empty, whitespace, and non-string inputs', () => {
      expect(sanitizeReturnTo('')).toBeNull();
      expect(sanitizeReturnTo('   ')).toBeNull();
      expect(sanitizeReturnTo(null)).toBeNull();
      expect(sanitizeReturnTo(undefined)).toBeNull();
      expect(sanitizeReturnTo(12345)).toBeNull();
      expect(sanitizeReturnTo({})).toBeNull();
      expect(sanitizeReturnTo([])).toBeNull();
    });

    it('rejects malformed percent-encoded input', () => {
      expect(sanitizeReturnTo('/%E0%A4%A')).toBeNull();
      expect(sanitizeReturnTo('/%%%')).toBeNull();
    });

    it('rejects control characters in candidate string', () => {
      expect(sanitizeReturnTo('/\r\nevil.example')).toBeNull();
      expect(sanitizeReturnTo('/\nevil.example')).toBeNull();
      expect(sanitizeReturnTo('/\0evil.example')).toBeNull();
      expect(sanitizeReturnTo('/path\tattack')).toBeNull();
    });

    it('supports custom fallback parameter', () => {
      expect(sanitizeReturnTo('https://evil.example', '/')).toBe('/');
      expect(sanitizeReturnTo('//evil.example', '/vi')).toBe('/vi');
    });
  });
});
