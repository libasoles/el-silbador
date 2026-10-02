// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import type * as SentryNamespace from "@sentry/nextjs";
import { runWhenIdleOrInteracted } from "./deferThirdParty";

// The Sentry SDK is ~400 KB of JS that parses/executes on the main thread, so it's loaded lazily
// (first interaction, or a few seconds after `load`) instead of with the initial bundle. Errors
// thrown before it's ready are buffered below and reported once it initializes.
type Sentry = typeof SentryNamespace;
type RouterTransitionArgs = Parameters<Sentry["captureRouterTransitionStart"]>;

const MAX_BUFFERED_ERRORS = 10;
const bufferedErrors: unknown[] = [];

function bufferError(event: ErrorEvent | PromiseRejectionEvent) {
  if (bufferedErrors.length >= MAX_BUFFERED_ERRORS) return;
  bufferedErrors.push("reason" in event ? event.reason : (event.error ?? event.message));
}

let sentryReady: Promise<Sentry> | undefined;

function loadSentry(): Promise<Sentry> {
  sentryReady ??= import("@sentry/nextjs").then((Sentry) => {
    Sentry.init({
      dsn: "https://2395f27c5b645be6dcaccce4af731d9b@o4512165598527488.ingest.us.sentry.io/4512165610979329",

      // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
      tracesSampleRate: 0.1,

      // Define how likely Replay events are sampled.
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      dataCollection: {
        // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
        // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
        // userInfo: false,
        // httpBodies: [],
      },
    });

    window.removeEventListener("error", bufferError);
    window.removeEventListener("unhandledrejection", bufferError);
    for (const error of bufferedErrors.splice(0)) Sentry.captureException(error);

    // Session replay is split into its own chunk (see sentry-lazy-replay.ts) so its DOM-mutation
    // recording code only loads once Sentry itself is up.
    import("./sentry-lazy-replay").then(({ startReplay }) => startReplay());

    return Sentry;
  });
  return sentryReady;
}

if (typeof window !== "undefined") {
  window.addEventListener("error", bufferError);
  window.addEventListener("unhandledrejection", bufferError);
  runWhenIdleOrInteracted(() => void loadSentry());
}

export const onRouterTransitionStart = (...args: RouterTransitionArgs) => {
  // Only forward transitions once Sentry has loaded; earlier ones aren't worth forcing it in.
  sentryReady?.then((Sentry) => Sentry.captureRouterTransitionStart(...args));
};
