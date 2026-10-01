import * as Sentry from "@sentry/nextjs";

/** Attaches session replay to the already-running Sentry client. Lives in its own module, never
 *  statically imported, so bundlers split it (and its DOM-mutation recording code) into a chunk
 *  that only loads when `src/instrumentation-client.ts` dynamically imports it after idle. */
export function startReplay(): void {
  Sentry.getClient()?.addIntegration(Sentry.replayIntegration());
}
