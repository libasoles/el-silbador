# 03: Autocomplete de intérpretes con precarga

**What to build:** Al escribir en el input de chips, el admin ve hasta 8 sugerencias de intérpretes
existentes que coinciden en cualquier parte del nombre sin importar acentos, sin repetir los ya
cargados en la canción. Se navegan con flechas y Enter elige la seleccionada. Una migración precarga
unos 150 intérpretes conocidos (folklore argentino como núcleo, tango, rock nacional, cancionistas
latinoamericanos) con `on conflict do nothing`, para que el autocomplete sea útil desde el primer día.
Ver [spec](../spec.md).

**Blocked by:** 02 (El admin carga intérpretes y se ven en la canción)

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Escribir "tama" sugiere "Tamara Castro"; "chalcha" sugiere "Los Chalchaleros".
- [ ] Máximo 8 sugerencias; no aparecen las que ya están como chips.
- [ ] Flechas arriba/abajo cambian la selección; Enter agrega la sugerencia seleccionada; sin selección,
      Enter agrega el texto escrito.
- [ ] La migración de precarga se puede correr dos veces sin duplicar ni fallar.
- [ ] Nombres de la precarga escritos como los usan los propios artistas (mayúsculas, acentos).
- [ ] Tests de componente del autocomplete.
