# Intérpretes de canciones

## Problema

La gente busca canciones por quien las canta, no por quien las escribió. La "Zamba de amor en vuelo"
tiene como autor a Jorge Milikota, pero se busca como "Tamara Castro". Hoy el único dato de persona
es `content.author`, texto libre, así que ni la biblioteca de El Silbador ni Google relacionan la
canción con su intérprete.

## Solución

Un dato de **intérpretes** por canción que cargan solo los admins y que todos pueden leer. Se usa para
la búsqueda interna de la biblioteca y para el SEO de la página de la canción.

## Decisiones

**Datos**
- Tabla `artists(id, name, created_at)` con nombre único normalizado (`lower(unaccent(name))`): "los
  chalchaleros" y "Los Chalchaleros" son la misma persona. Sin slug por ahora.
- Tabla `song_performers(song_id → songs on delete cascade, artist_id → artists, position,
  PK (song_id, artist_id))`.
- RLS: todos leen, solo admins (`is_admin()`) escriben.
- RPC `set_song_performers(song_id, names text[])`, solo admins y transaccional: crea en `artists`
  los nombres que faltan (reusa existentes sin importar mayúsculas ni acentos) y reemplaza la lista
  de la canción en el orden recibido. Es idempotente.
- `content.author` no cambia. Los intérpretes no forman parte de `content`, así que el fork no los copia.

**Edición**
- Solo el admin dueño de la canción (las canciones de no-admins no se listan ni se indexan) y solo en
  desktop (gate con `useIsMobile` en el render, no solo con CSS).
- Va al pie de la canción, debajo de la sección de video, siempre visible para ese admin.
- Input de chips: Enter o coma confirman (pegar "A, B" crea dos chips), flechas recorren las
  sugerencias, Backspace con el input vacío borra el último chip, cada chip tiene una ✕. Sin
  reordenamiento: el orden es el de carga.
- Autocomplete: hasta 8 intérpretes de `artists`, coincidencia en cualquier parte del nombre sin
  importar acentos, sin repetir los ya puestos. Sugiere solo intérpretes (no autores).
- Se guarda con el **autosave**: después del upsert de `songs`, se llama a la RPC solo si los
  intérpretes cambiaron. En una canción nueva, el primer autosave crea la canción y después sus
  intérpretes. Si la RPC falla, el autosave queda en error y el reintento vuelve a guardar todo.

**Lectura**
- Al pie, debajo del video: "Interpretada por: Tamara Castro, Soledad", solo si hay al menos uno.
- No aparecen en el PDF exportado.

**Búsqueda interna (biblioteca)**
- Ignora acentos en todas las búsquedas.
- Ordena por relevancia: match por título > por autor > por intérprete.
- Si una canción aparece por un intérprete, la fila suma un renglón "Interpretada por:" con solo los
  intérpretes que coinciden y el término resaltado.

**SEO**
- Meta description: "Letra y acordes para guitarra de …, de Jorge Milikota. Interpretada por Tamara
  Castro. Consultá la canción en El Silbador."
- JSON-LD `MusicComposition` con `composer` (autor) y `recordedAs → MusicRecording.byArtist` (cada
  intérprete).
- El `<title>` no cambia.

**Precarga**
- Unos 150 intérpretes conocidos (folklore argentino como núcleo, tango, rock nacional, cancionistas
  latinoamericanos) cargados por migración con `on conflict do nothing`.

## Fuera de alcance

- Páginas por intérprete (`/interprete/<slug>`).
- Vincular `author` a `artists`.
