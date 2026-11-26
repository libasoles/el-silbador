# 02: Botón triángulo y modo 1 de punta a punta (tracer)

**What to build:** Un admin logueado ve el botón triángulo (lucide-react) justo debajo del botón de notas de la melodía, también en móvil y sin entrar en modo edición. Está deshabilitado si la canción no tiene notas de melodía. Activarlo desactiva la herramienta de acordes (y viceversa); ambas muestran los acordes ya escritos. Con la rearmonización activa, solo las sílabas métricas con nota son clicables. El clic abre el popup con 4 radios circulares numerados (1 por defecto; los modos 2 a 4 se muestran deshabilitados, nunca ocultos). El modo 1 sugiere las tríadas mayores y menores del campo armónico que contienen la nota, según la tonalidad inferida (que se muestra en el popup). Elegir una sugerencia escribe o reemplaza el acorde en la pista de acordes, guardado en la BD; hay opción de eliminar y deshacer. Sin audio. Ver `spec.md`.

**Blocked by:** 01.

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Botón visible solo para admins; deshabilitado sin notas de melodía; no visible para usuarios no admin
- [ ] Exclusión mutua con la herramienta de acordes; ambas muestran los acordes existentes
- [ ] Sílabas sin nota inertes; sílabas con nota abren el popup
- [ ] Modo 1 ordena por mínimo movimiento respecto del acorde previo/siguiente, luego por función armónica; la lista tiene scroll
- [ ] Agregar, reemplazar, eliminar y deshacer funcionan, también en móvil
- [ ] Tests jsdom (incluido `mockMatchMedia(true)`) y tests Node de teoría
- [ ] `AGENTS.md` documenta la excepción móvil para admins
- [ ] Versión minor incrementada
