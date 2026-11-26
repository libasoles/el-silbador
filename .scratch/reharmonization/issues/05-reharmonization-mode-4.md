# 05: Modo 4, progresión II-V-I

**What to build:** Se habilita el radio 4. Toma el acorde previo y el siguiente ya escritos (con cualquiera de las dos herramientas) y muestra una progresión de hasta 3 acordes: 3 si hay sílabas métricas con nota suficientes entre ambos, si no 2 o 1. El usuario elige un solo acorde de la progresión y se escribe en la sílaba activa. Sin acorde previo, parte de la tónica; sin siguiente, resuelve al I; sin ninguno, el radio 4 queda deshabilitado con el texto "Escribe al menos un acorde".

**Blocked by:** 02, 01.

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] Radio 4 habilitado cuando hay al menos un acorde escrito
- [ ] La longitud de la progresión depende de las sílabas métricas con nota entre los acordes
- [ ] Elegir un acorde lo escribe solo en la sílaba activa; undo funciona
- [ ] Casos sin previo y sin siguiente cubiertos por tests
- [ ] Versión minor incrementada
