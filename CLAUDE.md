# Silabeo

See [AGENTS.md](./AGENTS.md) for site identity and other cross-agent conventions — it is the source of truth, shared across Claude, Codex, and other agents.

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

## Git workflow

Always merge finished work into `main` locally (in the main checkout), without being asked, then delete the task branch and its worktree. Never push to `origin`. See AGENTS.md.
