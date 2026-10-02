---
name: ga-login-funnel
description: Use when asked how many users see the login/register modal, request a magic link, or end up logged in, or when reading any GA4 data for El Silbador.
---

# GA login funnel

Funnel of active users: `login_view` → `login_link_sent` → `login`, read from the GA4 Data API
(`runFunnelReport`, v1alpha) with a service account.

## Run it

```
GA_PROPERTY_ID=556197712 GOOGLE_APPLICATION_CREDENTIALS=<path to key.json> \
  node scripts/ga-login-funnel.mjs [days=28]
```

The key file (`el-silbador-31c8288764bb.json`) lives in the **main checkout root**, gitignored.
From a worktree, point `GOOGLE_APPLICATION_CREDENTIALS` at that absolute path. The service
account is `el-silbador@el-silbador.iam.gserviceaccount.com`, Viewer on the GA property. Never
print, commit or paste the key's contents.

Done when the output lists all three steps with user counts. An empty table is a result to
interpret, not a failure: see Empty data.

## Where each event fires

- `login_view`: `AuthModal` mounts (`src/editor/components/AuthModal.tsx`).
- `login_link_sent`: `signInWithMagicLink` resolved in the same modal.
- `login`: `useLoginTracking` (`src/editor/loginTracking.ts`), once per magic-link arrival, detected
  by `#access_token` in the URL because Supabase reports restored sessions on every load.

## Empty data

Run a plain `runReport` grouped by `eventName` (v1beta) before concluding anything. Then:

- No events at all: `NEXT_PUBLIC_GA_MEASUREMENT_ID` is not in the production **build**
  (`NEXT_PUBLIC_*` is inlined at build time, so adding it in Netlify needs a redeploy).
  Local `.env` files keep it empty on purpose, so dev traffic never reaches GA.
- Other events but no login ones: the deploy predates the funnel commits, or nobody opened the
  modal yet. Ad blockers drop gtag, so test in a clean window.
- Data API lag: custom events usually appear within minutes, up to a few hours.

## Reading the numbers

- The funnel is **open** (`isOpenFunnel: true`): a user counts at a step without passing the
  earlier ones. A magic link opened on a phone logs `login` for a different user than the
  desktop one that requested it, so `login` can exceed `login_link_sent`.
- Counts are active users, not events.

## Seeing it inside GA

The Data API only reads; saved Explorations cannot be created through any API. To get the
funnel in the GA UI: Explore → Funnel exploration → steps `login_view`, `login_link_sent`,
`login` (event name equals) → turn on "Make open funnel". Marking `login` as a key event
(Admin → Events) additionally needs an Editor role for whoever does it.
