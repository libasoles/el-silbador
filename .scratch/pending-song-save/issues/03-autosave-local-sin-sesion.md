# 03: Seguir editando sin sesión actualiza la copia local

**What to build:** Si después de tocar Guardar el usuario cierra el modal y sigue editando sin
loguearse, cada cambio actualiza la canción pendiente local en vez de intentar Supabase. Al
reanudar (01) se guarda lo último que escribió. Ver [[spec.md]].

**Blocked by:** 01

**Status:** done
**Agent:** claude

- [x] Con canción pendiente y sin sesión, el autosave escribe en el storage local (conservando el id
      de creación y renovando el vencimiento).
- [x] Sin canción pendiente y sin sesión, el comportamiento actual no cambia (no se guarda nada
      localmente hasta tocar Guardar).
- [x] Al reanudar con sesión se persiste el contenido más reciente.
- [x] Test: editar tras el clic en Guardar y verificar que el contenido reanudado es el último.
