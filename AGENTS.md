## Agent skills

## Site identity

Silabeo/El Silbador is a **cancionero** (songbook) app. The site's name is always "El Silbador", with the article — never just "Silbador". This applies to any user-facing text: page titles, meta descriptions/OG tags, on-screen copy, PDF filenames, etc. (Component/identifier names like `SilbadorIcon` are exempt.)

## Git workflow

Every task must use its own git worktree and branch. Codex creates worktrees at
`.agents/worktrees/<task-slug>`; this keeps all agent worktrees inside the repository. When the
task is complete, always merge the branch into `main` locally — a finished task is not done until
it is on `main`. Never push from a local repository to
`origin`; after merging, remove both the task branch and its worktree.

## Versioning

Increment the version in `package.json` (and its matching root entry in `package-lock.json`) on
every commit. The index footer displays every version as `v<version> alfa`.

Use semantic version increments: bugs, visual improvements, and corrections increment the patch
number (`x.y.z` → `x.y.(z+1)`); new features increment the minor number and reset the patch
number (`x.y.z` → `x.(y+1).0`).

## UI components

Build components as reusable, composable units whenever practical. Prefer Radix primitives as
their foundation when a suitable primitive exists.

Use `lucide-react` for every UI icon.

### Issue tracker

Local markdown — issues/specs live under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical labels, plus an `Agent:` line per ticket so tickets can be picked up by Claude, Codex, or Google Antigravity to split token cost. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
