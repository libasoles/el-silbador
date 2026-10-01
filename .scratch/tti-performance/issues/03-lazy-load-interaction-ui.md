# 03: Lazy-load interaction-only UI components

**What to build:** Components that only ever appear in response to a user action — the confirm dialog, the YouTube link dialog, and the transpose widget — no longer ship as part of the initial bundle for every page they could appear on. They load on demand, the first time the user actually triggers them, via `next/dynamic`.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `ConfirmDialog` is loaded via `next/dynamic` rather than a static top-level import in the editor
- [ ] `YoutubeLinkDialog` is loaded via `next/dynamic` rather than a static top-level import in the editor
- [ ] `TransposeWidget` is loaded via `next/dynamic` rather than a static top-level import in the editor
- [ ] Each component still works correctly when triggered: opens without a jarring layout shift or noticeable stutter, and all existing functionality (confirm/cancel actions, pasting a YouTube link, transposing) behaves exactly as before
- [ ] A fresh Lighthouse run on a page that renders the editor shows Total Blocking Time and Time to Interactive improved versus the pre-change baseline (TTI 8.4s, TBT 730ms), with no regression in FCP/LCP/CLS
- [ ] Confirm via the build output that these three components are split into separate chunks rather than bundled into the initial page chunk
