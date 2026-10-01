# 01: Defer Sentry session replay off the critical path

**What to build:** Sentry keeps capturing errors and performance traces exactly as today, but the session-replay integration and its DOM-mutation recording no longer run (or load) during the initial page load on every route. The replay bundle loads lazily — only when a replay is actually going to be recorded (e.g. on first error, or after the page has gone idle) — and the blanket trace sampling backs off from "every request" to a small sample.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `replayIntegration()` is no longer part of the eagerly-executed `Sentry.init()` call that runs on every page load; it is added lazily (dynamic import / conditional init) so its code doesn't ship in the initial client bundle
- [ ] `tracesSampleRate` is reduced from 1 to a small sampling rate (e.g. ~0.1), confirmed in the client instrumentation config
- [ ] Errors still reach Sentry, and session replay still captures sessions it's configured to capture — manually trigger an error (or whatever error-reporting QA step the project uses) and confirm it shows up in Sentry
- [ ] A fresh Lighthouse run on the main song-library page shows Total Blocking Time and Time to Interactive improved versus the pre-change baseline (TTI 8.4s, TBT 730ms), with no regression in FCP/LCP/CLS
- [ ] The large Sentry client chunk (previously ~472KB, referenced directly from the initial page HTML) is no longer loaded on initial page load — confirm via the build output / network tab that it's absent or deferred
