# 01: Scaffold del proyecto

**What to build:** Una app que bootea (Vite + React + TypeScript), con un shell visual blanco y negro base,
y un paquete `src/core` creado como stub vacío listo para recibir el modelo de estado. Sin funcionalidad de
silabeo todavía — es la base sobre la que corren todas las slices siguientes.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `npm run dev` levanta la app y se ve una pantalla en blanco y negro (sin color) con un título.
- [ ] Existe una separación de carpetas `src/core` (lógica pura, sin imports de React/DOM) y `src/app`
      (componentes React).
- [ ] `src/core` exporta un módulo de estado inicial vacío (aunque no haga nada útil todavía) que ya sigue
      la forma reducer/acción prevista en el spec (`estado, acción → nuevo estado`).
- [ ] Hay un script de build (`npm run build`) que corre sin errores de tipos.
- [ ] No hay ninguna dependencia de color en el tema base; la paleta se limita a blanco/negro/grises.
