[![Netlify Status](https://api.netlify.com/api/v1/badges/e651d1ba-10b7-4170-98af-1e15e27f9b20/deploy-status)](https://app.netlify.com/projects/elsilbador/deploys)

# Silbador

Editor visual de anotaciones sobre sílabas de canciones (acordes, notas de canto). Ver
`.scratch/silabeo-editor/spec.md` para el spec completo.

Sitio: [elsilbador.com.ar](https://elsilbador.com.ar)

- `src/core`: lógica pura (silabeo, modelo de estado, reducer), sin dependencia de React/DOM.
- `src/app`: capa delgada de React + Vite que consume `src/core`.

## Capturas

<p>
  <img src="docs/screenshots/cancionero.png" alt="Cancionero con lista de canciones y favoritas" width="45%">
  <img src="docs/screenshots/editor.png" alt="Editor de acordes de una canción" width="45%">
</p>

## Desarrollo

```
npm install
npm run dev      # app en http://localhost:5173
npm run test     # tests del núcleo (vitest)
npm run build    # typecheck + build de producción
```
