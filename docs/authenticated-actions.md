# Acciones que requieren autenticación

Una acción que necesita un usuario identificado debe usar el límite compartido `AuthRequiredProvider`; no debe abrir `AuthModal` ni mantener estado de modal propio.

1. Justo antes de pedir autenticación, guardá una intención serializable en `pendingAuthActionStorage` y llamá `requireAuthentication(action)` desde `useAuthRequired`.
2. Conservá por separado cualquier dato local que la operación necesite para ejecutarse (por ejemplo, `draftStorage` para el contenido de una canción).
3. En la pantalla dueña de la acción, cuando `session` exista, leé la intención. Si corresponde a esa pantalla, ejecutala una sola vez y llamá `clearPendingAuthAction()` solamente después de que terminó correctamente.
4. Las intenciones vencen a los 30 minutos; no se deben reintentar ni aplicar acciones vencidas.

El enlace mágico recarga la aplicación. Por eso la intención no puede depender de closures, callbacks ni estado de React: se limita a un discriminante y los datos mínimos para volver a identificar la acción. Hoy los tipos son `save-song` y `toggle-favorite`.
