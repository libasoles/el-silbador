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
