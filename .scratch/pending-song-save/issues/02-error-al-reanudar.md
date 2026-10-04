# 02: Si el guardado post-login falla, no se pierde la canción

**What to build:** Si al volver logueado el guardado de la canción pendiente falla (red, error de
Supabase), el usuario ve un toast de error y la canción sigue guardada localmente; en la próxima
visita con sesión se reintenta, mientras no venza. Ver [[spec.md]].

**Blocked by:** 01

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Un fallo del guardado no borra la copia local ni la intención pendiente.
- [ ] Se muestra un toast de error ("No se pudo guardar tu canción, lo reintentamos").
- [ ] La próxima visita con sesión reintenta el guardado; al tener éxito se comporta como en 01.
- [ ] No se navega a ninguna URL de canción si el guardado falló.
- [ ] Test del camino de error.
