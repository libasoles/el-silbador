# Líneas de acordes

Status: ready-for-agent
Agent: claude

## Problema

Hoy toda línea tiene slots de acordes en sus bordes, aunque no tenga sílabas. Una línea vacía
acepta acordes que no quedan asociados a nada, y al pegar un cifrado, una fila de acordes sin
letra debajo (una introducción, un final) termina en los bordes de una línea vacía, o se pierde
si está arriba de un subtítulo como "Intro".

## Solución

Un nuevo tipo de línea: la **línea de acordes**. Es una línea cuyo texto son solo acordes
(`A   D   E7`). Se guarda como texto en la letra, igual que los subtítulos, y se reconoce por su
texto.

### Reconocimiento

- Una línea es de acordes si no está vacía y todos sus tokens son acordes (la misma gramática
  que el pegado de cifrados: `A`, `F#m7`, `Bb/F`, `N.C.`, acordes pegados como `A7D7`).
- Se convierte en cuanto su texto cumple la regla, también mientras se escribe.
- Excepción por ambigüedad: una línea con un único token que también es una palabra (`A`, `E`)
  sigue siendo letra hasta que tenga más acordes.
- TAB y los subtítulos tienen prioridad (ninguno es un acorde válido de todos modos).

### Presentación

- Tipografía de los acordes, respetando los espacios (las columnas) del texto.
- Sin sílabas, sin subrayado y sin slots de anotación.
- En modo lectura:
  - Click en un acorde abre el mismo diagrama de digitación que en los slots.
  - Con el toggle de notas de acordes, muestra las notas debajo de cada acorde.
  - El toggle de acordes la oculta.
- El PDF muestra lo mismo que la pantalla.

### Transposición

- El transpositor del autor reescribe el texto de las líneas de acordes, manteniendo la columna
  donde empieza cada acorde (con al menos un espacio entre acordes).
- El transpositor del lector las muestra transpuestas sin cambiar la canción.

### Pegado de cifrados

- Solo la fila de acordes inmediatamente arriba de una línea de letra se reparte en sus slots.
- Una fila de acordes seguida de una línea vacía, de otra fila de acordes, de un subtítulo, de
  TAB, o al final del texto, queda como texto: una línea de acordes.

### Líneas vacías

- Una línea sin sílabas no ofrece slots de acordes. Los slots aparecen con la primera letra.
- Canciones guardadas: al abrirlas, una línea vacía con acordes en sus bordes se convierte en una
  línea de acordes con esos acordes separados por espacios.

## Fuera de alcance

- Diagramas con posiciones guardadas por acorde de la línea (el diagrama abre en la primera
  posición y se puede recorrer, pero la elección no se guarda).
- Resaltar las notas compartidas con el acorde anterior en una línea de acordes.
