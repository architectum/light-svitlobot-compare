/**
 * API URL configuration for client-side requests.
 * 
 * If VITE_API_URL is set (e.g., for Vercel deployment), use it as base URL.
 * Otherwise, use relative paths (for same-origin deployment like Firebase).
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

/**
 * Build full API URL from a path.
 * @param path - API path starting with /api/...
 * @returns Full URL with base if configured
 */
export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
