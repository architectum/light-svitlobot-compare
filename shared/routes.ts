import { z } from 'zod';
import { locations, events } from './schema';

export const errorSchemas = {
  internal: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
};

export const api = {
  locations: {
    scan: {
      method: 'POST' as const,
      path: '/api/locations/:id/scan.ts',
      responses: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          newEventsCount: z.number(),
        }),
        404: errorSchemas.notFound,
        500: errorSchemas.internal,
      },
    },
    scanAll: {
      method: 'POST' as const,
      path: '/api/scan-all.ts',
      responses: {
        200: z.object({
          success: z.boolean(),
          message: z.string(),
          totalNewEvents: z.number(),
        }),
        500: errorSchemas.internal,
      },
    },
  },
};

// Helper for frontend
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
