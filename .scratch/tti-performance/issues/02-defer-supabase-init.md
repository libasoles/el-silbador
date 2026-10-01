# 02: Move Supabase client/auth off the initial render path

**What to build:** Every route currently waits on `@supabase/supabase-js` and the auth session check before it can render, even routes that don't need auth state right away. After this ticket, the Supabase client initializes and resolves auth state asynchronously, off the critical render path, while the page still renders and becomes interactive immediately using whatever "logged out / loading" state it already has for auth-dependent UI.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `@supabase/supabase-js` is no longer imported eagerly at module top-level in a file that's part of the app-wide provider tree loaded on every route
- [ ] Auth-dependent UI (e.g. login/account controls) still works correctly: it shows a sensible loading/placeholder state until the async auth check resolves, then updates to the real logged-in/logged-out state, with no flash of incorrect state or broken functionality
- [ ] Manually verify sign-in, sign-out, and an authenticated action (e.g. saving/forking a song) still work end-to-end after the change
- [ ] A fresh Lighthouse run on the main song-library page shows Total Blocking Time and Time to Interactive improved versus the pre-change baseline (TTI 8.4s, TBT 730ms), with no regression in FCP/LCP/CLS
- [ ] The large combined Supabase/Radix/lucide chunk (previously ~292KB, referenced directly from the initial page HTML) is no longer loaded on initial page load for routes that don't immediately need auth — confirm via the build output / network tab
