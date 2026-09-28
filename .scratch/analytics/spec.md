# Analytics (Google Analytics 4)

Instrumentar la app con GA4 (gtag.js) para medir uso: vistas de página y eventos clave (crear
canción, abrir canción, guardar, exportar PDF, apertura del modal de login).

La app queda lista del lado del código (`src/app/analytics.ts`, wiring en `Root.tsx`, `Library.tsx`
y `App.tsx`), condicionada a la env var `VITE_GA_MEASUREMENT_ID`. Sin esa variable, todas las
llamadas son no-ops — dev y CI no mandan datos a GA.

Falta un paso que solo puede hacer un humano con acceso a la cuenta de Google Analytics: crear la
property "El Silbador" y obtener el Measurement ID.

## Eventos implementados

- `page_view` — en cada cambio de ruta (`Root.tsx`)
- `new_song_click` — click en "nueva canción" desde la cancionero
- `open_song` — click en abrir una canción desde la cancionero (`song_id`)
- `song_saved` — cuando el autosave pasa a estado "saved" (`song_id`)
- `export_pdf` — click en exportar/imprimir
- `auth_modal_open` — cuando se abre el modal de login (guardar sin sesión)
