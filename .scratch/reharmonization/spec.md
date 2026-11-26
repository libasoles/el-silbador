# Rearmonización (Reharmonization)

Vocabulario: ver `CONTEXT.md` (Reharmonization, Chord suggestion, Reharmonization popup, Metric syllable, Song key, Out-of-key note).

## Alcance

Solo admins logueados (por ahora). Escribe siempre en la BD, también en móvil; no hay overlay en localStorage hasta abrir la función a más usuarios. Se muestra en móvil y escritorio, sin entrar en modo edición. Esto es una excepción deliberada a las "Mobile behavior rules" de AGENTS.md (admins pueden escribir acordes en móvil vía el popup): documentar la excepción en AGENTS.md al implementar.

## Botón

- Icono triángulo (lucide-react), justo debajo del botón de notas de la melodía.
- Visible solo para admins; deshabilitado si la canción no tiene ninguna nota de melodía.
- Mutuamente excluyente con la herramienta de acordes (activar una desactiva la otra). Ambas muestran los acordes ya escritos, sin importar con cuál se escribieron. Ambas permiten agregar, reemplazar y eliminar.

## Interacción

- Solo las sílabas métricas con nota de melodía son clicables; las demás quedan inertes.
- El clic abre el popup. Escribe/reemplaza/elimina en la pista de acordes (misma que la herramienta de acordes). Hay deshacer. Sin audio.
- El header del popup tiene 4 botones circulares numerados (radio buttons, 1 por defecto). Siempre se muestran los 4; un modo no disponible se **deshabilita**, nunca se oculta.
- Las sugerencias se ordenan: mínimo movimiento respecto del acorde previo/siguiente, luego función armónica (I, IV, V, ii, vi, iii). Lista con scroll.
- Notación y alteraciones: seguir la de los acordes ya escritos (cifrado americano por defecto); sostenidos o bemoles según la tonalidad.

## Tonalidad

- Se infiere de notas de melodía + acordes (perfil Krumhansl-Schmuckler). Confianza = margen entre la mejor y la segunda mejor tonalidad; la ambigüedad mayor/relativa menor se desempata por el primer y el último acorde.
- Se muestra en el popup. Solo el admin puede definirla, y se guarda con la canción (migración + test con `npm run test:integration`).
- Una sola tonalidad por canción. Detección de modulaciones: fuera de alcance.

## Modos

1. **Triadas**: tríadas mayores y menores del campo armónico que contienen la nota (ej. "do" → Fa, La menor, Do).
2. **Extensión armónica por melodía**: tríadas que, con la nota como 7ª/9ª/13ª diatónica, forman un acorde extendido; se anotan como tríada (ej. "si" sobre Do → C). Sin notas que choquen con el acorde (se itera después).
3. **Extensión armónica por acordes**: acordes de 7/9/11/13 que contienen la nota en cualquier posición; se anotan completos (ej. Cmaj7). Un acorde por grado: la extensión más alta que contiene la nota. Incluye Bm7b5.
4. **Progresión II-V-I**: toma el acorde previo y el siguiente ya escritos (por cualquier herramienta). Muestra una progresión de hasta 3 acordes según las sílabas métricas con nota entre ambos (3 si hay lugar, si no 2 o 1). El usuario elige un solo acorde, que se escribe en la sílaba activa. Sin previo: parte de la tónica. Sin siguiente: resuelve al I. Sin ninguno: modo deshabilitado ("Escribe al menos un acorde").

Solo se sugieren acordes del catálogo `guitar-chords` (para que todo acorde escrito tenga diagrama).

## Notas fuera de la tonalidad

Si la tonalidad no cambia pero una nota queda fuera, los modos 1, 2 y 3 siguen mostrando acordes que la contienen (pueden no ser diatónicos), marcados "fuera de la tonalidad" y después de los diatónicos.

## Entregas (cada una incrementa la versión menor)

1. Núcleo de teoría musical con tests, sin UI.
2. Botón y popup con modos 1 y 2.
3. Modos 3 y 4.
4. Tonalidad guardada en BD.

## Dependencia externa

`guitar-chords` no tiene Cm7b5 (solo Bm7b5), ni m13/maj13. Ver `guitar-chords-prompt.md`.
