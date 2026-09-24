# Silabeo

Editor visual de anotaciones sobre sílabas de canciones (acordes, notas de canto). Ver
`.scratch/silabeo-editor/spec.md` para el spec completo.

- `src/core`: lógica pura (silabeo, modelo de estado, reducer), sin dependencia de React/DOM.
- `src/app`: capa delgada de React + Vite que consume `src/core`.

## Desarrollo

```
npm install
npm run dev      # app en http://localhost:5173
npm run test     # tests del núcleo (vitest)
npm run build    # typecheck + build de producción
```
