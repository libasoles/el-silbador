Status: ready-for-agent
Agent: unassigned

# Silabeo — editor de anotaciones sobre sílabas de canciones

## Problem Statement

Quien transcribe una canción (acordes de guitarra, o notas de canto para enseñar melodía) hoy tiene que
alinear texto libre por encima de la letra a mano, carácter por carácter o con HTML manual. El cancionero
existente en `/Users/guillermoperez/Projects/more/cancionero` resuelve el anclaje visual acorde-sílaba con
`<span class="sobre"><span class="c">Acorde</span>Sílaba</span>`, pero producir ese markup a mano es tedioso
y propenso a errores (acordes que terminan amontonados al final de una línea en vez de repartidos sobre las
palabras correctas — ver `AGENTS.md` del cancionero, bug documentado #4).

Además, la unidad real del canto no es la sílaba sino el melisma: una misma nota o acorde a veces cubre
varias sílabas cantadas de corrido, y hoy no hay forma cómoda de expresar esa fusión en el texto.

## Solution

Un editor visual donde el usuario pega o escribe la letra de una canción, el sistema la separa en sílabas
automáticamente (español, vía Hypher + `hyphenation.es`), y el usuario puede:

- Fusionar sílabas adyacentes con un click/tap (toggle) para representar un melisma.
- Escribir texto libre encima de cualquier sílaba (o del hueco fusionado) en una de dos pistas fijas:
  "Acordes" o "Notas de canto".
- Mover una anotación ya escrita a otra sílaba arrastrándola (drag & drop), con feedback visual animado.
- Mostrar/ocultar cada pista de forma independiente.

El sistema se mantiene reactivo: si el usuario edita la letra base, las sílabas y sus anotaciones se
recalculan y se conservan lo mejor posible sin intervención manual.

Es una librería reusable: el núcleo de lógica (silabeo, modelo de sílabas/uniones/pistas) es TypeScript
puro sin dependencia de framework, para poder usarse en proyectos nuevos y, más adelante, para regenerar el
markup `sobre`/`c` del cancionero existente. Esta iteración entrega el núcleo más una app de prototipo en
React para validar la interacción; no entrega integración con el cancionero ni exportación de datos.

## User Stories

1. Como usuario, quiero pegar o escribir la letra de una canción en un área de texto simple, para no
   depender de ningún formato especial de entrada.
2. Como usuario, quiero que el sistema separe automáticamente la letra en sílabas en español al confirmar
   cada palabra, para no tener que silabear a mano.
3. Como usuario, quiero que el silabeo se recalcule mientras sigo escribiendo, sin tener que disparar una
   acción explícita de "aplicar", para que la herramienta se sienta viva.
4. Como usuario, quiero que el recálculo de una palabra se dispare al completarla (espacio o salto de
   línea), para evitar ver sílabas sin sentido mientras la escribo a medias.
5. Como usuario, quiero que además haya un recálculo por debounce de 1 segundo de inactividad, para cubrir
   el caso en que dejo de escribir a mitad de palabra sin llegar a un espacio.
6. Como usuario, quiero poder reeditar el texto de la letra en cualquier momento después del silabeo
   inicial, para corregir errores de tipeo o cambiar la letra sin reiniciar todo el trabajo.
7. Como usuario, quiero que al reeditar una palabra, las anotaciones de las sílabas que siguen existiendo
   (por coincidencia de prefijo/sufijo) se conserven, para no perder trabajo ya hecho por cambios menores.
8. Como usuario, acepto que si el número de sílabas de una palabra cambia de forma ambigua, alguna
   anotación de un caso borde se pueda perder sin aviso, porque eso simplifica mucho la implementación.
9. Como usuario, quiero poder unir dos sílabas adyacentes haciendo click/tap en el espacio entre ellas,
   para representar un melisma (una nota o acorde que cubre varias sílabas cantadas juntas).
10. Como usuario, quiero que la unión de sílabas sea un toggle, para poder deshacer la fusión con la misma
    acción con la que la hice.
11. Como usuario, quiero que la unión de sílabas sea visualmente evidente (subrayado o arco continuo que
    conecta las sílabas fusionadas), para reconocer de un vistazo qué sílabas forman un melisma.
12. Como usuario, quiero que la unión de sílabas sea global (compartida por todas las pistas), porque el
    melisma es una propiedad de cómo se canta esa parte de la palabra, no de una pista en particular.
13. Como usuario, si fusiono dos sílabas que ya tenían anotaciones distintas en una misma pista, acepto que
    se conserve solo la primera anotación y se descarte la segunda, porque es un caso borde infrecuente.
14. Como usuario, quiero dos pistas fijas y siempre presentes: "Acordes" y "Notas de canto", para cubrir
    los dos casos de uso que motivan esta herramienta sin la complejidad de pistas arbitrarias.
15. Como usuario, quiero escribir texto libre en la celda de una pista sobre una sílaba (o hueco
    pre-palabra, entre palabras, o post-palabra), para anotar acordes, nombres de notas, o cualquier otra
    cosa en el lugar exacto donde corresponde.
16. Como usuario, quiero navegar entre las celdas de una pista con las flechas de teclado (una celda por
    sílaba), en vez de navegar carácter por carácter como en un textarea normal, para moverme rápido entre
    posiciones de anotación.
17. Como usuario, quiero que dentro de la celda activa la edición de texto sea normal (multi-carácter, tipo
    input), para poder escribir cualquier anotación libre ("G7", "Do", "🎵 alto", etc.) sin restricciones
    artificiales.
18. Como usuario, quiero poder tomar una anotación ya escrita y arrastrarla (drag & drop) a otra celda de
    la misma pista, para reposicionar una anotación sin tener que borrarla y reescribirla.
19. Como usuario, quiero ver una animación de tamaño/color en la anotación mientras la arrastro, y que
    vuelva a su apariencia normal al soltarla, para tener feedback claro de que el arrastre está activo.
20. Como usuario, quiero que la celda destino se resalte mientras arrastro una anotación sobre ella, para
    saber exactamente dónde va a caer si suelto ahí.
21. Como usuario, quiero que el subrayado de las uniones de sílabas reaccione con un efecto fluido tipo
    "lava" (como el indicador animado de pestañas en algunas librerías de UI) durante interacciones
    relevantes, para que la herramienta se sienta orgánica y no mecánica.
22. Como usuario, quiero un botón para mostrar/ocultar la pista de "Acordes", igual al que ya existe en el
    cancionero actual, para mantener consistencia con la herramienta que ya uso.
23. Como usuario, quiero un botón equivalente para mostrar/ocultar la pista de "Notas de canto", para poder
    concentrarme en una sola pista a la vez si quiero.
24. Como usuario, quiero que cada línea de letra tenga sus propias filas de pistas ancladas, con saltos de
    línea explícitos (no wrap automático del navegador), para que una anotación nunca quede desalineada de
    su sílaba por un reflow de pantalla.
25. Como usuario, entiendo que en esta iteración el editor no reordena ni resuelve el problema histórico de
    acordes amontonados del cancionero actual — eso se soluciona en una iteración futura de integración,
    aplicando el mismo modelo de datos a los archivos existentes.
26. Como usuario, quiero que la interfaz sea predominantemente blanco y negro, para que el color tenga
    peso visual solo donde importa.
27. Como usuario, quiero que el color aparezca únicamente en: el subrayado de las uniones de sílabas, el
    texto de las anotaciones, y los botones activos (ej. el toggle de una pista visible), para que esos
    tres elementos se noten de inmediato sobre el fondo neutro.
28. Como usuario, quiero que mi trabajo persista mientras la pestaña sigue abierta, aunque no haga falta
    que sobreviva a un refresh de página en esta iteración (sesión efímera, sin `localStorage` ni backend).
29. Como desarrollador que reutilizará este código, quiero que el núcleo de silabeo/uniones/pistas sea un
    módulo TypeScript sin dependencia de React ni del DOM, para poder portarlo después a un Web Component
    vanilla para el cancionero sin reescribir la lógica.
30. Como desarrollador, quiero que la app de prototipo (React + Vite) sea una capa delgada sobre ese
    núcleo, para que la lógica de negocio se pueda testear sin renderizar componentes.
31. Como desarrollador, quiero cargar la canción "Recuerdos de Ypacaraí" (ya traída del cancionero de
    referencia) como fixture de prueba/demo, para validar la herramienta contra un caso real con acordes
    reales, incluyendo los casos de melisma multi-sílaba que ya aparecen en esa letra (ej. "Ypacaraí",
    "renaciendo", "guaraní").

## Implementation Decisions

- **Estructura de repo**: un solo paquete, sin monorepo ni tooling de workspaces. Separación por
  convención de carpetas: `src/core` (lógica pura) y `src/app` (React + Vite).
- **Stack**: React + TypeScript + Vite. Sin backend, 100% cliente.
- **Motor de silabeo**: Hypher con el patrón de idioma `hyphenation.es`. Solo español en esta iteración.
- **Modelo de datos del núcleo** (framework-agnostic, vive en `src/core`):
  - Una canción es una lista de líneas explícitas (sin wrap automático).
  - Cada línea es una lista de palabras; cada palabra se descompone en sílabas vía Hypher.
  - Existen posiciones de anotación en tres tipos: pre-palabra, entre-sílabas (dentro de una palabra) y
    post-palabra/post-línea — todas direccionables como "celdas".
  - Las uniones de sílabas (melisma) son un estado global compartido entre pistas: un conjunto de pares de
    sílabas adyacentes fusionadas, togglable, independiente de qué pista esté activa.
  - Existen exactamente dos pistas fijas y predefinidas: `chords` ("Acordes") y `vocalNotes` ("Notas de
    canto"). El modelo de pista es genérico (una pista es una colección de celdas de texto libre ancladas
    a posiciones) para permitir reuso futuro, pero la app de prototipo no expone UI para crear pistas
    nuevas.
  - Cada celda de pista guarda texto libre (string), asociada a una posición de anotación.
  - API pública del núcleo expuesta como un módulo de estado (reducer/state machine) que recibe el estado
    actual + una acción y devuelve el nuevo estado. Acciones mínimas: `setLyricsText`, `resyllabify`,
    `toggleSyllableMerge`, `setCellText`, `moveCellText` (para el drag & drop), `setTrackVisibility`.
  - Reconciliación de identidad de sílaba al reeditar una palabra: heurística de coincidencia de
    prefijo/sufijo entre la lista vieja y nueva de sílabas de esa palabra; sílabas sin correspondencia
    pierden su anotación sin aviso.
- **Reactividad de resilabeo**: se dispara (a) al completar palabra (tecla espacio o Enter/salto de línea)
  y (b) por debounce de 1000ms de inactividad de tecleo dentro de una palabra sin completar. Ambos
  mecanismos conviven; no compiten entre sí (el trigger de word-boundary cancela el debounce pendiente de
  esa palabra).
- **Capa React** (`src/app`): componentes de renderizado de línea + pistas, manejo de foco/navegación por
  teclado entre celdas, drag & drop de anotaciones (con animación de tamaño/color al arrastrar y retorno al
  soltar), y el efecto de subrayado "lava" para las uniones de sílabas activas. Esta capa consume la API del
  núcleo pero no contiene lógica de negocio propia.
- **Tema visual**: blanco y negro como base de toda la interfaz; color reservado exclusivamente para el
  subrayado de uniones (efecto lava), el texto de las anotaciones, y el estado activo de los botones de
  visibilidad de pista.
- **Persistencia**: ninguna en esta iteración. El estado vive en memoria de React y se pierde al refrescar.
  Persistencia real (vía servidor/API) queda explícitamente fuera del alcance de la librería.
- **Fixture de demo**: la letra de "Recuerdos de Ypacaraí" (texto plano, sin el markup `sobre`/`c` del
  cancionero) se incluye como dato de ejemplo precargado o pegable en el prototipo.

## Testing Decisions

- Un test debe validar comportamiento observable a través de la API pública del núcleo (acción → estado
  resultante), nunca detalles internos de cómo se calculan sílabas o se representan las celdas.
- El seam de testing es único: la API del núcleo en `src/core` (reducer/state machine). No hay tests de
  componentes React ni de interacciones de drag & drop de navegador en esta iteración — la capa de UI se
  valida manualmente/visualmente, consistente con el objetivo de prototipo de interacción.
- Módulos a testear vía ese seam:
  - Silabeo de palabras individuales y de la letra completa (incluyendo casos reales de la fixture de
    Ypacaraí).
  - Toggle de unión de sílabas (aplicar, deshacer, y su efecto al fusionar celdas con anotaciones
    existentes — conserva la primera, descarta la segunda).
  - Escritura y lectura de texto en celdas de las dos pistas fijas, en posiciones pre/entre/post.
  - Reactividad de resilabeo: disparo por word-boundary y por debounce, y que no se disparen ambos de forma
    redundante para la misma edición.
  - Reconciliación de identidad de sílaba al reeditar una palabra (heurística de prefijo/sufijo): sílabas
    que se conservan, sílabas nuevas sin anotación, sílabas eliminadas que pierden su anotación.
  - Mover el texto de una celda a otra (`moveCellText`) preservando el contenido y vaciando el origen.
  - Toggle de visibilidad de cada una de las dos pistas.
- No hay prior art en este repo (proyecto nuevo); se sigue el patrón estándar de test unitario sobre una
  función/reducer puro, sin mocks de DOM.

## Out of Scope

- Persistencia (`localStorage` o servidor/API).
- Exportación o serialización del resultado (incluido cualquier adapter al formato `sobre`/`c` del
  cancionero).
- Corrección del bug histórico de acordes amontonados en el cancionero existente (se resuelve en una
  iteración futura de integración, reusando este mismo núcleo).
- Autowrap responsive de líneas de letra (el modelo asume saltos de línea explícitos únicamente).
- Pistas arbitrarias creadas por el usuario (el modelo core lo soporta, pero no hay UI para ello).
- Soporte multi-idioma de silabeo (solo español, vía `hyphenation.es`).
- Tests automatizados de la capa React (drag & drop de navegador, foco, animaciones) — validación manual.

## Further Notes

- El anclaje visual del cancionero actual (`.sobre` con `position: relative` + `.c` con `position:
  absolute`) es una referencia útil para cuando se diseñe el adapter de exportación en una iteración
  futura, pero no debe condicionar el modelo de datos del núcleo de esta iteración — el núcleo es agnóstico
  del formato de salida.
- La fixture de "Recuerdos de Ypacaraí" trae de forma natural dos casos reales de melisma multi-sílaba en
  la letra original (acordes que caen sobre "Ypacaraí" y "renaciendo" partidos en sílabas), útiles como
  casos de prueba manual del toggle de unión.
