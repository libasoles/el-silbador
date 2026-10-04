# Guardar una canción nueva después del login

## Problema

Si alguien escribe una canción nueva sin sesión y toca Guardar, se abre el modal de login. Al seguir
el magic link del mail cae en el index (no en `/nueva`) y la canción nunca se guarda ni aparece el
toast de confirmación. Existía un borrador del flujo (`draftStorage`, `pendingAuthActionStorage`,
id de creación reservado), pero la restauración solo ocurre dentro del editor en `/nueva` y solo en
la pestaña que recibió el callback, así que no funciona si el link vuelve a otra ruta.

## Decisiones (grilling 2026-10-04)

- **Sin código OTP.** Se mantiene el magic link.
- **Reanudador global.** Al tocar Guardar sin sesión la canción se guarda localmente. En cualquier
  visita posterior con sesión (aunque sea el index) el sistema la detecta, la guarda, la muestra en
  su URL definitiva (`/cancion/<slug>`) y muestra el toast "Canción guardada". Después borra la copia
  local.
- **Id de creación reservado** antes del login, para que el upsert sea idempotente entre pestañas.
- **Vencimiento: 24 h.**
- **Solo canciones nuevas.** No se cubre la sesión vencida editando una canción existente.
- **Mobile fuera de alcance:** no se pueden crear canciones en mobile.
- **Error al guardar:** conservar la copia local, toast de error, reintentar en la próxima visita.
- **Edición sin sesión con canción pendiente:** el autosave escribe en el storage local en vez de
  Supabase.
- **`/nueva` sin sesión con canción pendiente:** el editor la restaura.
- **Varias pestañas:** todas terminan en la canción guardada (caso borde; puede repetirse el toast).
- **Supabase Redirect URLs:** ya configuradas por el dueño (`https://elsilbador.com.ar/**`,
  `http://localhost:3000/**`); el link vuelve a la página de origen, pero el flujo no depende de eso.

## Tickets

Ver `issues/`. 01 es el tracer bullet; 02, 03 y 04 dependen solo de 01 y pueden hacerse en paralelo.
