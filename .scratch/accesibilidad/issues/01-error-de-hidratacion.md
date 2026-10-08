# 01: La canción y la página de canción nueva cargan sin errores en la consola

**What to build:** Al abrir una canción o `/nueva`, la consola del navegador queda limpia. Hoy el
build de producción muestra el error #418 de React ("Hydration failed": el HTML del servidor no
coincide con el del primer render en el navegador). Primero hay que encontrar qué texto difiere,
por ejemplo con el build de desarrollo, que muestra el diff completo. Después hay que lograr que
servidor y navegador rendericen lo mismo, sin silenciar el aviso con `suppressHydrationWarning`.
Ver [spec](../spec.md).

**Blocked by:** None (can start immediately)

**Status:** done
**Agent:** unassigned

- [ ] Ni `/cancion/<slug>` ni `/nueva` muestran errores de hidratación en la consola, ni en la carga de escritorio ni en la de mobile.
- [ ] La causa queda explicada en el commit, y hay un test que la cubre si se puede reproducir sin un navegador real.
- [ ] Buenas prácticas da 1.00 en las dos páginas, y `lighthouserc.json` lo exige.
- [ ] `npm run lighthouse` pasa.
