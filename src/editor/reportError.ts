/** Reports an error we've already handled in the UI (so the global error listeners never see it)
 *  to Sentry. Sentry is loaded lazily (see instrumentation-client.ts); this import resolves to the
 *  same module instance, and capturing before `init` is a harmless no-op. */
export function reportError(error: unknown, tags?: Record<string, string>): void {
  void import("@sentry/nextjs")
    .then((Sentry) => Sentry.captureException(error, { tags }))
    .catch(() => {});
}
