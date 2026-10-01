# 04: Defer React Query localStorage persistence off the main thread

**What to build:** The React Query cache still persists to and restores from `localStorage` exactly as today (so users keep getting instant data on repeat visits), but the synchronous JSON parse/stringify work involved no longer competes with the page's initial render and interactivity. The persistence read/write is deferred to an idle point (e.g. after first paint, or via `requestIdleCallback`-style scheduling) instead of running inline during mount.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The query cache persister's hydrate-on-mount and dehydrate-on-change logic no longer blocks the initial synchronous render path
- [ ] Returning users still see their previously cached song/library data restored correctly (no loss of the "instant data from cache" behavior), verified by reloading the app with existing cached data and confirming it appears without a refetch flash
- [ ] A fresh Lighthouse run on the main song-library page shows Total Blocking Time and Time to Interactive improved versus the pre-change baseline (TTI 8.4s, TBT 730ms), with no regression in FCP/LCP/CLS
