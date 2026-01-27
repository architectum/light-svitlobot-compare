/**
 * API URL configuration for client-side requests.
 *
 * Priority:
 * 1. VITE_API_URL environment variable (set at build time)
 * 2. Production fallback to Vercel API
 * 3. Empty string for same-origin deployment
 */
const PRODUCTION_API_URL = "https://svitlo121.vercel.app";

export const API_BASE_URL = import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? PRODUCTION_API_URL : "");

/**
 * Build full API URL from a path.
 * @param path - API path starting with /api/...
 * @returns Full URL with base if configured
 */
export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
