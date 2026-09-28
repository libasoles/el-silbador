# Silabeo

## Site identity

The site's name is always "El Silbador", with the article — never just "Silbador". This applies to any user-facing text: page titles, meta descriptions/OG tags, on-screen copy, PDF filenames, etc. (Component/identifier names like `SilbadorIcon` are exempt.)

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
