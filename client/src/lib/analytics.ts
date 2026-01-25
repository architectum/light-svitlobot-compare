import { logEvent } from "firebase/analytics";
import { getAnalyticsInstance } from "./firebase";

type AnalyticsParams = Record<string, string | number | boolean | null | undefined>;

const normalizeParams = (params?: AnalyticsParams) => {
  if (!params) return undefined;
  const normalized: Record<string, string | number | boolean> = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    normalized[key] = value;
  });
  return normalized;
};

export const trackEvent = async (name: string, params?: AnalyticsParams) => {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, name, normalizeParams(params));
};

export const trackPageView = async (path: string, title?: string) =>
  trackEvent("page_view", {
    page_path: path,
    page_title: title,
  });
