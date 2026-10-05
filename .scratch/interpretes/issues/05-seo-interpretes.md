# 05: SEO: intérpretes en la meta description y JSON-LD

**What to build:** La página de una canción con intérpretes le dice a Google quién la interpreta. La
meta description pasa a "Letra y acordes para guitarra de Zamba de amor en vuelo, de Jorge Milikota.
Interpretada por Tamara Castro. Consultá la canción en El Silbador." (y sus variantes sin autor y con
varios intérpretes). Se agrega JSON-LD `MusicComposition` con `name`, `composer` (el autor) y
`recordedAs` → `MusicRecording.byArtist` por cada intérprete. El `<title>` no cambia. Ver
[spec](../spec.md).

**Blocked by:** 02 (El admin carga intérpretes y se ven en la canción)

**Status:** done
**Agent:** claude

- [x] La description menciona a los intérpretes cuando hay; sin intérpretes queda igual que hoy.
- [x] OpenGraph y Twitter usan la misma description.
- [x] El JSON-LD es válido (Rich Results Test / validator.schema.org) y omite lo que falta (sin autor →
      sin `composer`; sin intérpretes → sin `recordedAs`).
- [x] El `<title>` no cambia.
- [x] Tests de la metadata y del JSON-LD generados.
