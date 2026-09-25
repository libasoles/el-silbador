# Investigación: Jazz para persistencia de canciones

Fecha: 2026-09-25  
Alcance: cuentas de usuario, canciones con letra/anotaciones de acordes, uso offline, sincronización entre dispositivos y versiones/ramas. Las fuentes son documentación y blog oficiales de Jazz.

## Veredicto

**Jazz es una buena opción para un spike/POC si branching de canciones es una capacidad de producto real y cercana.** Su modelo local-first encaja muy bien con un editor: las lecturas y escrituras ocurren en la réplica local, las escrituras se encolan sin conexión y se sincronizan al reconectar. También ofrece cuentas locales recuperables y autenticación con JWT de un proveedor externo. [Cómo funciona la sincronización](https://jazz.tools/docs/concepts/how-sync-works), [Autenticación](https://jazz.tools/docs/auth/authentication).

No elegiría Jazz *solo* para guardar canciones por usuario: para esa necesidad, una base Postgres administrada con autenticación (por ejemplo Supabase) es más convencional y reduce el riesgo de adoptar un sistema de sincronización y consistencia eventual. La recomendación concreta es validar primero el flujo de edición concurrente y de ramas; si no aporta valor visible, mantener una arquitectura centralizada simple.

## Encaje con Silabeo

| Necesidad | Qué ofrece Jazz | Decisión de diseño sugerida |
| --- | --- | --- |
| Persistir letra, pistas, anotaciones y uniones | Base relacional local-first, con esquema y permisos por fila; una escritura local es inmediata. [Overview](https://jazz.tools/docs), [Sync](https://jazz.tools/docs/concepts/how-sync-works) | Modelar `songs`, `song_lines`, `annotations` y, si conviene para consultas, `syllable_merges`. Mantener el reducer puro actual como fuente de las transformaciones; crear un adaptador de carga/guardado, no acoplar el núcleo a Jazz. |
| Offline | En navegador usa IndexedDB mediante `SharedWorker`; lee lo ya disponible localmente y encola escrituras para sincronizarlas al reconectar. [Sync: offline](https://jazz.tools/docs/concepts/how-sync-works#what-happens-offline) | Funciona bien para editar una canción descargada/abierta. Diseñar la UI para indicar estado de sincronización y posibles conflictos. |
| Varios dispositivos | El servidor propaga cambios a las réplicas suscriptas. Una cuenta puede admitir varias identidades. [Sync](https://jazz.tools/docs/concepts/how-sync-works), [Auth](https://jazz.tools/docs/auth/authentication) | Para una cuenta real entre dispositivos, ofrecer login/recuperación explícitos; no depender únicamente del almacenamiento del navegador. |
| Autenticación | Puede crear una cuenta local-first offline y luego vincular una identidad; para producción puede validar JWTs normales de un proveedor externo. [Local-first auth](https://jazz.tools/docs/auth/local-first-auth), [JWT provider integration](https://jazz.tools/docs/recipes/auth/auth-provider-integration) | Usar un proveedor de identidad existente/estándar para login (no construir passwords). El modo local-first es un buen modo “empezar sin cuenta”, pero necesita backup/recuperación. |
| Branching de canciones | Las ramas son columnas normales declaradas con `branchBy`; las vistas pueden usar una rama head que cae a una base. Permite bases congeladas para una revisión reproducible. [Branches](https://jazz.tools/docs/concepts/branches) | Crear una entidad `song_branches` (nombre, base, snapshot, estado) y ramificar las filas de contenido por `branch_id`. Ejemplos: `main`, “arreglo para coro”, revisión de un alumno. |

## Lo importante sobre conflictos y ramas

Esto no es Git de canciones listo para usar. Jazz proporciona almacenamiento, vistas branch-over-base e historial; **la aplicación define** nombres, ciclo de vida, relación padre, UI y estrategia de merge. Su helper de merge calcula escrituras hacia la rama objetivo; no hay garantía distribuida de exactly-once o unicidad por el hecho de usar ramas. [Branches](https://jazz.tools/docs/concepts/branches#merging-stays-a-userland-operation).

Para ediciones concurrentes de la misma fila/campo, la vista actual usa last-writer-wins, aunque conserva las versiones que pierden en el historial. [Sync: consistency model](https://jazz.tools/docs/concepts/how-sync-works#consistency-model). Para la letra completa, conviene evitar un único `lyricsText` grande si la colaboración importa: filas por línea/anotación acotan los conflictos. En el POC hay que decidir qué hacer cuando dos personas editan la misma línea (LWW, aviso de conflicto o flujo de revisión mediante rama).

La idea central del post compartido sí respalda el caso: Jazz presenta historias por fila, merge estructurado y ramas explícitas para borradores/revisión; también recalca que las actualizaciones offline y concurrentes necesitan una semántica de merge elegida para cada dato. [The four fresh ideas behind Jazz](https://jazz.tools/blog/four-fresh-ideas-behind-jazz).

## Riesgos y condiciones antes de adoptar

- **Consistencia eventual:** es ideal para texto/anotaciones, pero la UI no debe prometer que una edición ya llegó a todos los dispositivos. Jazz distingue durabilidad local, edge y global. [Sync](https://jazz.tools/docs/concepts/how-sync-works).
- **Recuperación de cuenta:** la cuenta local-first se basa en un secreto de firma; perderlo requiere otra identidad vinculada o backup/recuperación. [Client setup](https://jazz.tools/docs/getting-started/client-setup), [Local-first auth](https://jazz.tools/docs/auth/local-first-auth).
- **Operación:** se puede usar Jazz Cloud o alojar el servidor propio; en producción el servidor requiere configurar explícitamente local-first auth y/o validación JWT. [Client setup](https://jazz.tools/docs/getting-started/client-setup), [Server setup](https://jazz.tools/docs/getting-started/server-setup).
- **Madurez/superficie:** la documentación indica que las comodidades de branching por framework todavía se están completando. Además, el repositorio oficial identifica Jazz 2.0 como *alpha* con una API nueva. Reservar tiempo para integrar y probar la API actual y aislarla detrás de un puerto/repositorio de persistencia propio. [Branches](https://jazz.tools/docs/concepts/branches), [repositorio oficial](https://github.com/garden-co/jazz).

## Spike recomendado (antes de comprometer la arquitectura)

Construir una prueba pequeña con una canción real que demuestre: (1) edición sin red y posterior sync, (2) login en un segundo navegador/dispositivo y recuperación de la canción, (3) dos ediciones simultáneas de una misma anotación y el resultado visible, y (4) crear una rama desde `main`, modificarla y aplicar un merge/revisión explícita. Definir éxito solo si el comportamiento de conflicto y la UX de recuperación resultan aceptables para músicos/editores.
