# 01: Una línea `TAB` se convierte en un bloque de tablatura que se guarda con la canción

**What to build:** En el modelo, una línea cuyo texto completo es `TAB` (mayúsculas exactas) pasa a ser
una línea de tablatura `{id, words: [], tab: true}`, igual que hoy se detectan las etiquetas de sección
(`src/core/model.ts`). La línea marcador queda en `lyricsText` para que la reconciliación conserve id y
posición. El contenido vive en `EditorState.tabs: Record<lineId, TabBlock>`, con
`TabBlock = { tabs: (number|null)[][][]; spacing?: number }`. Se guarda en `songs.content.tabs` (jsonb,
opcional, compatible con canciones viejas). Acciones `setTabBlock` y `removeTabBlock`, con historial.
Ver [spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** done
**Agent:** claude

- [x] `TAB` solo en una línea crea un bloque con `tabs: [[]]`. `tab`, `Tab` o `TAB` dentro de un verso no crean nada.
- [x] Las líneas de tablatura no generan slots ni celdas (ni acordes, melismas ni subrayado).
- [x] Reconciliar el texto conserva el id del bloque. Si la línea marcador desaparece, se purga `tabs[id]`, y el undo lo restaura con su contenido.
- [x] `serializeContent`/`deserializeContent` hacen round-trip de `tabs`, y el contenido viejo sin `tabs` carga igual.
- [x] Tests unitarios (`*.test.ts`) de todo lo anterior.
