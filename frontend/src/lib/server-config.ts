/**
 * Server-only backend URL resolver
 * Safe from client leakage
 */
export function getBackendBaseUrl(): string {
  return (
    process.env.INTERNAL_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    'http://localhost:3001'
  );
}
