// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://2395f27c5b645be6dcaccce4af731d9b@o4512165598527488.ingest.us.sentry.io/4512165610979329",

  // Session replay is loaded lazily below (after idle / on first error) so its
  // DOM-mutation recording machinery doesn't ship in the initial page bundle.

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.1,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});

// Defer loading the Replay integration (and its DOM-mutation recording code)
// off the critical path. It's only added once the browser goes idle, instead
// of being bundled into the eagerly-executed Sentry.init() call above.
// `./sentry-lazy-replay` is never statically imported anywhere, so this
// dynamic import() is a genuine chunk-splitting boundary — unlike importing
// "@sentry/nextjs" itself again here, which the bundler would just resolve
// from the copy already loaded synchronously by the `import * as Sentry`
// above, defeating the point.
function loadReplayIntegration() {
  import("./sentry-lazy-replay").then(({ startReplay }) => startReplay());
}

if (typeof window !== "undefined") {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(loadReplayIntegration);
  } else {
    setTimeout(loadReplayIntegration, 2000);
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
