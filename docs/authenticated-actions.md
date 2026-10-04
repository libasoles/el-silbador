# Acciones que requieren autenticación

Una acción que necesita un usuario identificado debe usar el límite compartido `AuthRequiredProvider`; no debe abrir `AuthModal` ni mantener estado de modal propio.

1. Justo antes de pedir autenticación, guardá una intención serializable en `pendingAuthActionStorage` y llamá `requireAuthentication(action)` desde `useAuthRequired`.
2. Conservá por separado cualquier dato local que la operación necesite para ejecutarse (por ejemplo, `draftStorage` para el contenido de una canción).
3. En la pantalla dueña de la acción, cuando `session` exista, leé la intención. Si corresponde a esa pantalla, ejecutala una sola vez y llamá `clearPendingAuthAction()` solamente después de que terminó correctamente.
4. Las intenciones vencen a los 30 minutos; no se deben reintentar ni aplicar acciones vencidas.

El enlace mágico recarga la aplicación. Por eso la intención no puede depender de closures, callbacks ni estado de React: se limita a un discriminante y los datos mínimos para volver a identificar la acción. Hoy los tipos son `save-song`, `toggle-favorite` y `fork-song`.

## Canción nueva guardada antes del login

Guardar una canción nueva es la excepción al paso 3: el enlace mágico puede volver a cualquier ruta (el index incluido), así que no la completa la pantalla dueña sino `PendingSongResumer`, montado una sola vez en `src/app/providers.tsx`.

- Al tocar Guardar sin sesión, `App` guarda la canción con `saveDraft` y un **id de creación** reservado antes del login. La copia local de una canción nueva vence a las **24 horas** (la de una canción existente, a los 30 minutos); una copia vencida se descarta al leerla.
- Mientras siga pendiente (con o sin sesión), cada cambio reescribe esa copia con el mismo id de creación y renueva el vencimiento. El autosave de `App` no guarda una canción pendiente en Supabase.
- En cada visita con sesión, `resumePendingSong` la guarda con un upsert sobre el id de creación (idempotente entre pestañas), borra la copia local y la intención `save-song`, navega a `/cancion/<slug>` y muestra el toast "Canción guardada".
- Si el guardado falla, conserva la copia local, muestra un toast de error y no navega. Se reintenta en la próxima visita con sesión o al tocar Guardar.
- Si otra pestaña ya la guardó y borró la copia local, la pestaña que la escribió usa el id de creación que recuerda en memoria para encontrar el slug y mostrar la canción.
- `/nueva` sin sesión con una canción pendiente la restaura en el editor.
