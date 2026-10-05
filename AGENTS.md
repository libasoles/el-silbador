## Agent skills

## Site identity

Silabeo/El Silbador is a **cancionero** (songbook) app. The site's name is always "El Silbador", with the article — never just "Silbador". This applies to any user-facing text: page titles, meta descriptions/OG tags, on-screen copy, PDF filenames, etc. (Component/identifier names like `SilbadorIcon` are exempt.)

## Articles (blog)

Articles under `src/app/articulos/` are written for end users we don't know, and explain how to
use El Silbador. Never address the site owner through an article: no notes about how the demos
were built, what is or isn't saved, implementation details, or remarks meant for the person who
asked for the change. Anything for the owner goes in the chat, not on the page.

## Git workflow

Every task must use its own git worktree and branch. Codex creates worktrees at
`.agents/worktrees/<task-slug>`; this keeps all agent worktrees inside the repository. When the
task is complete, always merge the branch into `main` locally — a finished task is not done until
it is on `main`. Merge in the main checkout, without waiting to be asked. Never push from a local
repository to `origin`; after merging, remove both the task branch and its worktree.

## Mobile behavior rules

Mobile is read-only for authoring actions. Detected with `useIsMobile` (`src/editor/useIsMobile.ts`, `max-width: 30rem` — same breakpoint as the CSS media queries).

Not allowed on mobile, even for the song's owner:
- Editing the title or author (`src/editor/App.tsx`)
- Editing the content/lyrics/chords (`SongView`'s `canEdit` prop, threaded from `App.tsx`)
- Forking a song (fork button in `App.tsx`)
- Deleting a song from the library index (`Library.tsx`)

Allowed on mobile (do not gate these):
- Adding/removing favorites
- Chord track and underline toggles
- PDF export
- Chord transposition

CSS `display: none` alone does not enforce these rules — it hides the control visually but leaves the underlying handler mounted and reachable. Gate at the render/prop level with `useIsMobile`, not just with CSS.

## Testing

`*.test.ts` run in Node; `*.test.tsx` run in jsdom with React Testing Library (setup in `src/test/setupDom.ts`). Prefer rendering a component and asserting on what the user sees over reading its source as text. To test mobile gating, call `mockMatchMedia(true)` from `src/test/matchMedia.ts` before rendering — see `src/app/articulos/ArticleChordEditor.test.tsx`.

## Supabase data safety

The local Supabase stack in this checkout is shared development data, not disposable test data.
Use `npm run test:integration` for migration and RLS tests; it provisions and removes an isolated
temporary stack. Never run `supabase db reset`, `supabase stop --no-backup`, Docker volume removal,
or `supabase db push --linked` against the shared stack. Any remote Supabase command requires the
user's explicit approval of the exact target project and operation.

## Versioning

Increment the version in `package.json` (and its matching root entry in `package-lock.json`) on
every commit. The index footer displays every version as `v<version> alfa`.

Use semantic version increments: bugs, visual improvements, and corrections increment the patch
number (`x.y.z` → `x.y.(z+1)`); new features increment the minor number and reset the patch
number (`x.y.z` → `x.(y+1).0`).

Articles (`src/app/articulos/`) are not features: a new or edited article increments the patch
number, never the minor one.

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
