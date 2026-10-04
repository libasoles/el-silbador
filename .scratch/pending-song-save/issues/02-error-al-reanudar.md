# 02: Si el guardado post-login falla, no se pierde la canción

**What to build:** Si al volver logueado el guardado de la canción pendiente falla (red, error de
Supabase), el usuario ve un toast de error y la canción sigue guardada localmente; en la próxima
visita con sesión se reintenta, mientras no venza. Ver [[spec.md]].

**Blocked by:** 01

**Status:** done
**Agent:** claude

- [x] Un fallo del guardado no borra la copia local ni la intención pendiente.
- [x] Se muestra un toast de error ("No se pudo guardar tu canción, lo reintentamos").
- [x] La próxima visita con sesión reintenta el guardado; al tener éxito se comporta como en 01.
- [x] No se navega a ninguna URL de canción si el guardado falló.
- [x] Test del camino de error.
