# 02: Silabeo estático de la letra

**What to build:** El usuario pega o escribe la letra de una canción en un área de texto y, al confirmar,
el sistema la separa en sílabas (español, vía Hypher + `hyphenation.es`) y la renderiza como sílabas
individuales, respetando los saltos de línea explícitos de la letra original (sin wrap automático). Incluye
poder cargar la letra de "Recuerdos de Ypacaraí" como fixture de demo.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Hay un área de texto donde pegar/escribir la letra completa de una canción, con saltos de línea
      explícitos (Enter = nueva línea de la canción).
- [ ] Al confirmar, cada palabra de cada línea se muestra descompuesta en sus sílabas (separación visual
      clara entre sílabas, ej. espacio o marca sutil), usando Hypher + `hyphenation.es`.
- [ ] Las líneas de la letra se renderizan en el mismo orden y con los mismos saltos que el texto de
      entrada — ninguna línea se reordena ni se fusiona con otra por ancho de pantalla.
- [ ] Existe un botón o acción para cargar la letra de "Recuerdos de Ypacaraí" como ejemplo precargado, y al
      cargarla se ve correctamente silabeada.
- [ ] El módulo de silabeo vive en `src/core` y es invocable sin necesidad de renderizar ningún componente
      React (testeable de forma aislada).
- [ ] Test: silabear un conjunto de palabras de la fixture de Ypacaraí (incluyendo "Ypacaraí", "renaciendo",
      "guaraní") produce las sílabas esperadas.
