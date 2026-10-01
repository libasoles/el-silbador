# 01: Crear la property "El Silbador" en Google Analytics

**What to build:** No es código — es un paso manual en analytics.google.com que solo puede hacer
alguien con acceso a la cuenta de Google Analytics del usuario.

**Status:** ready-for-human
**Agent:** unassigned

- [ ] En [analytics.google.com](https://analytics.google.com), crear una property nueva llamada
      "El Silbador" (Admin → Crear → Property).
- [ ] Dentro de la property, crear un "Web data stream" apuntando a la URL de producción de la app.
- [ ] Copiar el Measurement ID que genera el data stream (formato `G-XXXXXXX`).
- [ ] Setear `NEXT_PUBLIC_GA_MEASUREMENT_ID=<ese ID>` en el entorno de producción (y en `.env.local` si se
      quiere probar en dev). Ver `.env.example`.
- [ ] Verificar en GA4 → Reports → Realtime que al navegar la app local/deploy aparecen eventos
      (`page_view`, `new_song_click`, `open_song`, `song_saved`, `export_pdf`, `auth_modal_open`).

El código que dispara estos eventos ya está implementado en `src/editor/analytics.ts` (ver
[[spec.md]]) — sin el Measurement ID configurado, no se manda nada a GA.
