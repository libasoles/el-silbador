# 01: Guardar la canción pendiente al volver logueado, desde cualquier página

**What to build:** Quien escribe una canción nueva sin sesión y toca Guardar ve el modal de login;
la canción queda guardada localmente. Cuando vuelve con sesión — siguiendo el magic link a cualquier
ruta, incluido el index, o en una visita posterior — la canción se guarda en Supabase, la página
pasa a mostrarla en `/cancion/<slug>` y aparece el toast "Canción guardada". Ver [[spec.md]].

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Guardar sin sesión en `/nueva` guarda localmente la canción con un id de creación reservado y
      vencimiento de 24 h, y abre el modal de login.
- [ ] Un reanudador montado a nivel de la app (no dentro del editor) detecta sesión + canción
      pendiente sin vencer en cualquier página y la guarda con un upsert idempotente sobre el id de
      creación.
- [ ] Tras guardar: borra la copia local y la intención pendiente, navega a `/cancion/<slug>` y
      muestra el toast "Canción guardada" (el toast sobrevive a la navegación).
- [ ] Se elimina del editor la restauración que dependía de la pestaña del callback del magic link;
      no queda una carrera entre "recién autenticado" y la carga del borrador en el autosave.
- [ ] `/nueva` sin sesión con una canción pendiente sigue restaurándola en el editor.
- [ ] Una canción pendiente vencida se ignora y se descarta.
- [ ] `docs/authenticated-actions.md` refleja el nuevo flujo y el vencimiento de 24 h.
- [ ] Tests del storage (vencimiento, id de creación) y del reanudador (guarda, limpia, navega).
