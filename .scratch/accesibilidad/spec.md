# Accesibilidad: 100 en Lighthouse en todas las páginas

## Contexto

La auditoría de Lighthouse en CI (`npm run lighthouse`, umbrales en `lighthouserc.json`) mide hoy:

| Página | Accesibilidad | Buenas prácticas |
| --- | --- | --- |
| `/`, `/articulos` | 1.00 | 1.00 |
| `/articulos/usar-acordes-en-el-editor` | 0.76 | 1.00 |
| `/articulos/notas-de-la-cancion` | 0.73 | 1.00 |
| `/articulos/marcas-de-estructura-y-bis` | 0.76 | 1.00 |
| `/cancion/<slug>` | 0.77 | 0.96 |
| `/nueva` | 0.96 | 0.96 |

SEO está en 1.00 en todas. Los umbrales de las páginas con el editor son el puntaje de hoy, un
piso para que no empeore, no el objetivo.

Todo lo que falla en accesibilidad viene del editor de canciones (las pistas y sus celdas, y los
renglones de la letra). En buenas prácticas falla un error de hidratación de React (#418) en la
canción y en `/nueva`.

Lighthouse audita con emulación de celular (412px de ancho). En mobile la canción es de solo
lectura (ver la sección "Mobile behavior rules" de AGENTS.md), así que en la auditoría el editor
siempre se ve en modo lectura.

## Objetivo

Que accesibilidad y buenas prácticas den 1.00 en todas las páginas auditadas, y que CI lo exija.

## Regla para cada ticket

Cada ticket termina con `npm run lighthouse` en verde y sube en `lighthouserc.json` el piso de las
páginas que mejoró hasta el puntaje nuevo, para que la mejora no se pierda.

## Problemas detectados (auditorías de Lighthouse)

| Auditoría | Dónde | Ticket |
| --- | --- | --- |
| `errors-in-console` (React #418) | `/cancion`, `/nueva` | 01 |
| `aria-required-children`, `aria-required-parent` | filas de pistas con `role="row"` sin tabla | 02 |
| `button-name` | celdas de acorde/nota sin texto | 03 |
| `aria-input-field-name` | renglones de la letra con `role="textbox"` sin nombre | 04 |
| `aria-prohibited-attr` | contenedor de la letra en `/nueva` con `aria-label` sin rol | 04 |
| `color-contrast` | notas de ejemplo en el artículo de notas | 05 |
| `target-size` | celdas de acorde/nota de menos de 24×24px | 06 |
