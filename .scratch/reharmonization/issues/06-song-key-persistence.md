# 06: Tonalidad guardada y editable por el admin

**What to build:** El popup muestra la tonalidad con la que sugiere y el admin puede corregirla. La elección se guarda con la canción en la BD y reemplaza a la inferencia para esa canción. Solo los admins pueden cambiarla. Incluye la migración, probada con `npm run test:integration` (nunca contra el stack compartido).

**Blocked by:** 02.

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Campo de tonalidad en la canción con migración y política de acceso (solo admins escriben)
- [ ] Test de integración de migración y RLS
- [ ] El popup usa la tonalidad guardada si existe, y si no, la inferida
- [ ] Cambiar la tonalidad actualiza las sugerencias al instante
- [ ] Versión minor incrementada
