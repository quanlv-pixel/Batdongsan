/**
 * Navigation and URL security helpers for Batdongsan platform.
 */

const DUMMY_BASE = 'http://localhost.internal';

/**
 * Validates and sanitizes a candidate `returnTo` redirect path.
 *
 * Requirements:
 * 1. Must be a safe, relative, same-origin path within the application.
 * 2. Rejects absolute external URLs (e.g. `https://evil.example`, `javascript:`, `data:`).
 * 3. Rejects protocol-relative URLs (e.g. `//evil.example`).
 * 4. Rejects leading-backslash or backslash-based bypasses (e.g. `/\\evil.example`, `/\evil.example`, `\\evil.example`).
 * 5. Rejects percent-encoded backslashes (e.g. `%5c`, `%5C`) or control characters.
 * 6. Rejects malformed URL encodings.
 * 7. Preserves legitimate internal pathname, search parameters, and hash fragment.
 *
 * @param candidate - The untrusted user input string from query params.
 * @param fallback - The fallback value to return when validation fails (default: null).
 * @returns The sanitized safe internal path, or fallback if invalid.
 */
export function sanitizeReturnTo(
  candidate: unknown,
  fallback: string | null = null,
): string | null {
  if (typeof candidate !== 'string') {
    return fallback;
  }

  const trimmed = candidate.trim();
  if (!trimmed) {
    return fallback;
  }

  // Must begin with a single forward slash, and NOT followed by slash or backslash
  if (
    !trimmed.startsWith('/') ||
    trimmed.startsWith('//') ||
    trimmed.startsWith('/\\') ||
    trimmed.includes('\\')
  ) {
    return fallback;
  }

  // Disallow control characters (ASCII 0x00 - 0x1F, 0x7F)
  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return fallback;
  }

  // Check for percent-encoded backslashes or malformed URI components
  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return fallback;
  }

  // The decoded candidate must also be clean of backslashes or control characters
  if (decoded.includes('\\') || /[\x00-\x1F\x7F]/.test(decoded)) {
    return fallback;
  }

  // Parse candidate using fixed local origin to strictly inspect URL parts
  let parsed: URL;
  try {
    parsed = new URL(trimmed, DUMMY_BASE);
  } catch {
    return fallback;
  }

  // Origin MUST strictly match the dummy base origin (guarantees candidate didn't specify protocol/host)
  if (parsed.origin !== DUMMY_BASE) {
    return fallback;
  }

  // Protocol must be http: matching the dummy base
  if (parsed.protocol !== 'http:') {
    return fallback;
  }

  // Pathname must begin with '/' and must not begin with '//' or contain '\'
  if (
    !parsed.pathname.startsWith('/') ||
    parsed.pathname.startsWith('//') ||
    parsed.pathname.includes('\\')
  ) {
    return fallback;
  }

  // Reconstruct clean internal URL: pathname + search + hash
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

/**
 * Type guard checking whether a candidate `returnTo` string is safe.
 */
export function isValidReturnTo(candidate: unknown): candidate is string {
  return sanitizeReturnTo(candidate) !== null;
}
