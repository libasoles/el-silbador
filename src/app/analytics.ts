// Thin wrapper around Google Analytics 4 (gtag.js). Loading is opt-in: without a measurement
// id (VITE_GA_MEASUREMENT_ID) every call becomes a no-op, so local dev and CI never ping GA.
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

let initialized = false;

export function initAnalytics(): void {
  if (initialized || !MEASUREMENT_ID || typeof document === "undefined") return;
  initialized = true;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  // send_page_view is off by default; trackPageView drives page_view events explicitly so
  // client-side route changes (Root.tsx has no full reload) are counted correctly.
  window.gtag("config", MEASUREMENT_ID, { send_page_view: false });
}

export function trackPageView(path: string, title?: string): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: title,
    page_location: window.location.href,
  });
}

export function trackEvent(name: string, params?: Record<string, unknown>): void {
  if (!MEASUREMENT_ID || !window.gtag) return;
  window.gtag("event", name, params);
}
