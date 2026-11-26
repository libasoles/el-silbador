# Núcleo de teoría de rearmonización

Status: ready-for-agent
Agent: unassigned

Funciones puras en `src/core/` con tests Node (`*.test.ts`), sin UI:
- Extender `chordNotes.ts` para parsear 9/11/13 y alteraciones `♯`/`♭` del catálogo.
- Inferencia de tonalidad (notas de melodía + acordes) con confianza.
- Sugerencias de los modos 1, 2, 3 y 4 según `spec.md`, incluida la regla de nota fuera de la tonalidad, el orden y la disponibilidad por modo.
- Filtrar por acordes existentes en el catálogo.

Versión menor.
