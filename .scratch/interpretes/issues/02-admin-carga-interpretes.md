# 02: El admin carga intérpretes y se ven en la canción

**What to build:** Tracer bullet de punta a punta. Un admin, en desktop y en una canción propia, ve
al pie (debajo de la sección de video) un input de chips para cargar intérpretes: Enter o coma
confirman (pegar "A, B" crea dos chips), Backspace con el input vacío borra el último chip y cada chip
tiene una ✕. Los cambios se guardan con el autosave. Cualquier visitante ve al pie "Interpretada
por: Tamara Castro, Soledad" cuando hay al menos uno. Todavía sin autocomplete (ticket 03). Ver
[spec](../spec.md).

Incluye la migración con `artists`, `song_performers`, RLS (todos leen, solo admins escriben) y la RPC
transaccional `set_song_performers(song_id, names text[])`, que reusa intérpretes existentes sin
importar mayúsculas ni acentos.

**Blocked by:** None (can start immediately)

**Status:** done
**Agent:** claude

- [x] Un admin dueño de la canción, en desktop, puede agregar y quitar intérpretes con el input de chips.
- [x] El input no se renderiza para no-admins, para admins en canciones ajenas, ni en mobile (gate con
      `useIsMobile`, no solo CSS). En mobile el admin ve solo la leyenda.
- [x] Los cambios se persisten con el autosave; la RPC solo se llama si los intérpretes cambiaron. En
      una canción nueva, el primer autosave crea la canción y luego sus intérpretes.
- [x] Si la RPC falla, el autosave queda en error y el reintento vuelve a guardar todo.
- [x] "Los Chalchaleros" y "los chalchaléros" terminan siendo el mismo registro de `artists`.
- [x] Un no-admin no puede escribir en `artists` ni en `song_performers`, ni llamar a la RPC con éxito.
- [x] La leyenda "Interpretada por: …" se ve para todos, en el orden de carga, solo si hay al menos uno.
- [x] Los intérpretes no se copian al hacer fork y no aparecen en el PDF.
- [x] Tests de componente (chips, gating de admin/mobile, leyenda) y de la capa de datos.
