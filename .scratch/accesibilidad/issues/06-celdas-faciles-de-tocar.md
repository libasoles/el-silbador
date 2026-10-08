# 06: Los acordes y notas se pueden tocar con el dedo sin errar

**What to build:** Cada celda interactiva de las pistas mide al menos 24×24px, o tiene espacio
suficiente alrededor para que tocarla con el dedo no active la de al lado (WCAG 2.5.8, auditoría
`target-size` de Lighthouse). Los acordes no se mueven de su lugar visual sobre las sílabas. Ver
[spec](../spec.md).

**Blocked by:** 02, 03 (cambian las mismas celdas; con 03 en modo lectura solo quedan como botón
los acordes que abren diagrama)

**Status:** needs-triage — falta elegir el diseño (ver opciones abajo). No implementar todavía.
**Agent:** unassigned

## Cómo está hoy

Cada sílaba tiene tres posiciones posibles para un acorde o nota: al principio del renglón
(`start`), sobre la sílaba (`before`) y entre una sílaba y la siguiente (`gap`). Cada posición es
un botón de 19px de alto, tan ancho como la sílaba o el hueco: entre 9 y 29px. Las celdas están
pegadas entre sí.

```
              ┌──┐┌───┐┌─┐┌───┐┌───┐┌─┐┌───┐┌───┐┌─┐
 Acordes      │C ││   ││ ││   ││   ││ ││   ││   ││ │   ← 19px de alto
              └──┘└───┘└─┘└───┘└───┘└─┘└───┘└───┘└─┘
               U   na  ·   no  che  ·   ti  bia  ·
               ▲   ▲   ▲
               │   │   └ "gap": entre sílabas, 9px de ancho
               │   └──── "before": sobre la sílaba, 13–29px
               └──────── el acorde C, 13px
```

Con el dedo, en un celular, es fácil tocar "na" queriendo tocar "C". Como en mobile la canción es
de solo lectura, ahí lo único que importa es poder tocar un acorde para ver su diagrama.

## Hallazgos después de los tickets 01–05

- `npm run lighthouse` (local): `/cancion` y `/nueva` ya dan 1.00. Solo fallan los tres artículos
  (0.96), con 209, 505 y 384 celdas marcadas por `target-size`.
- Los demos de los artículos se pueden editar también en mobile (`ArticleChordEditor.tsx`), así
  que ahí todas las celdas, incluso las vacías ("Agregar acorde…"), siguen siendo botones. La
  opción A sola arregla la canción, pero no los artículos.
- Las celdas tienen `position: absolute` sobre `.track-row` (`src/editor/App.css`). Agrandar su
  área táctil no corre las sílabas: la letra no se separa más. El límite es que las celdas
  vecinas se pisan cuando las sílabas son angostas.

## Opción A: en lectura, solo los acordes son tocables, con un área invisible más grande

Lo visual no cambia. Con el ticket 03, en modo lectura las celdas vacías y las notas dejan de ser
botones. A cada acorde que queda se le agranda el área táctil con relleno transparente hasta
24×24px, centrada sobre el acorde.

```
 Lo que se ve (igual que hoy):

 Acordes       C                              G7
               U  na  no  che  ti  bia  nos  co  no  ci  mos

 Lo que se puede tocar (punteado = área invisible):

             ┌╌╌╌╌╌╌┐                       ┌╌╌╌╌╌╌┐
             ╎  C   ╎                       ╎  G7  ╎   ← 24px de alto
             └╌╌╌╌╌╌┘                       └╌╌╌╌╌╌┘
               U  na  no  che  ti  bia  nos  co  no  ci  mos
```

- **A favor:** no cambia nada de lo que se ve. Resuelve mobile, que es lo que audita Lighthouse.
  Es el cambio más chico.
- **En contra:** al editar en escritorio, las celdas siguen chicas y pegadas. Para el mouse alcanza,
  pero no cumple WCAG 2.5.8. Si dos acordes caen a menos de 24px, por ejemplo en sílabas
  contiguas, sus áreas se pisan y hay que partir la diferencia en el medio:

```
             ┌╌╌╌╌╌┬╌╌╌╌╌┐
             ╎  C  ╎ G7  ╎   ← cada uno se queda con su mitad
             └╌╌╌╌╌┴╌╌╌╌╌┘
               na    no
```

## Opción B: A, y además al editar la fila crece a 24px de alto y se marcan las celdas

Como en A en modo lectura. Al editar, la pista de acordes pasa de 19 a 24px de alto y las celdas
se separan con un borde tenue al pasar el mouse por la fila. Los huecos entre sílabas (`gap`)
siguen existiendo, pero nunca ocupan menos de 12px. Cuando el hueco es más chico, se lleva la
mitad de la sílaba de cada lado.

```
 Editando, con el mouse sobre la fila de acordes:

              ┌────┬─────┬────┬─────┬─────┬────┬─────┐
 Acordes      │ C  │     │    │     │     │    │     │   ← 24px de alto
              └────┴─────┴────┴─────┴─────┴────┴─────┘
                U    na  ·  no   che  ·   ti  ·  bia
                        ↑ hueco de al menos 12px

 Sin el mouse encima, la fila se ve como hoy (sin bordes).
```

- **A favor:** mejora también la edición en escritorio y el renglón se ve más ordenado al editar.
- **En contra:** el editor queda unos 5px más alto por renglón con acordes, así que la canción
  ocupa más al editar. Los huecos más anchos le quitan área a las sílabas de al lado. Requiere
  revisar el arrastrar y soltar y la posición del cursor.

## Opción C: en lectura, tocar el renglón abre los acordes de ese renglón

En mobile, en vez de apuntar a un acorde chico, se toca cualquier parte del renglón (que mide más
de 24px) y aparece abajo una tira con los diagramas de los acordes de ese renglón.

```
 Acordes       C                              G7
               U  na  no  che  ti  bia  nos  co  no  ci  mos   ← tocar en cualquier parte
             ┌─────────────────────────────────────────────┐
             │  ┌─────┐  ┌─────┐                           │
             │  │  C  │  │ G7  │      (diagramas)          │
             │  │ ┼┼┼ │  │ ┼┼┼ │                           │
             │  └─────┘  └─────┘                           │
             └─────────────────────────────────────────────┘
```

- **A favor:** en mobile el área táctil es enorme y se ven todos los acordes del renglón juntos.
- **En contra:** cambia cómo se usa la canción en el celular. Es el cambio más grande y el que más
  hay que explicar a los usuarios. Al editar, en escritorio, todo sigue como hoy.

## Recomendación

La opción A. Es la que menos cambia lo que ve la gente y resuelve el caso que importa, mobile, donde
la canción es de solo lectura. B se puede sumar después si se quiere mejorar también la edición en
escritorio.

## Criterios de aceptación (una vez elegida la opción)

- [ ] Ningún acorde cambia de posición visual sobre su sílaba.
- [ ] En 412px de ancho (emulación de celular de Lighthouse), ninguna celda interactiva tiene menos de 24×24px de área táctil ni se pisa con otra.
- [ ] Tocar un acorde sigue abriendo su diagrama. Editando, clic, doble clic y arrastrar funcionan igual.
- [ ] Lighthouse ya no marca `target-size`, y los pisos de accesibilidad de `lighthouserc.json` suben al puntaje nuevo.

## Comentarios

### 2026-10-08 — Agrandar el área táctil no garantiza más puntaje en Lighthouse

Revisado contra axe-core 4.14 (el motor de Lighthouse 12.6 que corre `npm run lighthouse`):

- **La auditoría es binaria por página.** `target-size` pasa o falla entera: con una sola celda
  marcada, la página sigue en 0.96. Mejorar parte de las celdas no mueve el puntaje.
- **La opción A no toca las páginas que fallan.** `/cancion` y `/nueva` ya dan 1.00. Sus acordes
  miden 13×19px pero pasan por la otra regla de axe (`target-offset`): desde el ticket 03 las
  celdas vacías no son botones, así que cada acorde tiene espacio libre alrededor. Lo que está en
  0.96 son los tres artículos, cuyos demos se editan también en mobile y tienen todas las celdas
  como botones.
- **Cómo mide axe** (`targetSizeEvaluate` en `node_modules/axe-core/axe.js`):
  - Usa la caja del botón (`boundingClientRect`). Un `::before`/`::after` transparente no cuenta;
    solo `padding` + `margin` negativo, o `min-width`/`min-height`, cambian lo que mide.
  - Si el área agrandada se pisa con la de una celda vecina, mide solo la parte no tapada; si esa
    parte queda bajo 24×24 falla igual (`partiallyObscured`).
  - Pasa si mide 24×24 sin pisarse, o si un círculo de 24px centrado en la celda no toca a sus
    vecinas.
  - Con sílabas de 9–29px pegadas, ningún área invisible puede cumplir eso en todas las celdas.
    "Partir la diferencia" entre acordes contiguos deja a ambos bajo 24px.
- axe solo da por fallada una celda que está en el orden de tabulación; si no, la deja "para
  revisar a mano" y Lighthouse no la cuenta. Hoy todas son `<button>` en el orden de Tab. Sacarlas
  del Tab (*roving tabindex*) subiría el número sin mejorar el toque, así que no cuenta como
  solución.
- Lo que sí movería el puntaje es actuar sobre los artículos: demos de solo lectura en mobile, o
  celdas de 24px reales al editar (lo que obliga a separar la letra).

### 2026-10-08 — Decisión

- Se implementa la **opción A** por la mejora para quien lee la canción en el celular, aunque no
  suba el puntaje de Lighthouse.
- Condición: no cambia el ancho de las sílabas.
- **Mobile no pasa a solo lectura**: los demos de los artículos siguen editables. Los tres
  artículos quedan en 0.96 y su piso en `lighthouserc.json` no cambia.
- El criterio "Lighthouse ya no marca `target-size`" queda fuera de este ticket.

### 2026-10-08 — Implementado (v0.16.11)

- `chordTapArea.ts` calcula, para cada acorde con diagrama en modo lectura, cuánto se extiende su
  área táctil a cada lado: al menos 24px de ancho, centrada, y partida en el medio con el acorde
  vecino sin entrar en su caja.
- `TrackRow` lo aplica solo a la fila de acordes en lectura. `TrackCell` lo pasa como variables
  CSS a un `::before` transparente de 24px de alto (`.track-cell--tap-area` en `App.css`).
- Es un pseudo-elemento, así que el botón, la sílaba y el anclaje del diagrama no se mueven. El
  ancho de las sílabas no cambia: las celdas son `position: absolute`.
- Al editar (escritorio y demos de artículos) las celdas siguen como estaban.
- Comprobado en Chromium con `elementFromPoint`: dos acordes de 14px separados por 4px reciben
  toques en 95–115px y 116–136px, sin pisarse, y en 24px de alto.
