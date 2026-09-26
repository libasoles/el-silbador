# SEO: metatags e indexación

Metatags estáticos en `index.html` para que la app indexe lo mejor posible dado que es una SPA
sin SSR/prerender (todo el contenido se arma client-side con React).

## Qué se agregó

- `index.html`: `lang="es"`, `<title>` y `<meta name="description">` reales, `robots: index,
  follow`, `<link rel="canonical">`, Open Graph completo (`og:title`, `og:description`,
  `og:image` 1200x630, `og:url`, `og:site_name`, `og:locale`) y Twitter Card
  (`summary_large_image`).
- `public/og-image.png`: imagen 1200x630 generada a partir del logo (isotipo del que silba +
  wordmark "Silbador"), fondo `--bg` (#fbfaf7), acento `--accent` (#9c4a3c) — coherente con la
  paleta de `theme.css`.
- `public/favicon.svg`: **se corrigió un bug** — el favicon tenía trazos blancos sin fondo, así que
  era invisible en una pestaña de navegador con fondo claro. Ahora tiene un fondo cuadrado con el
  color de acento y trazos color `--bg`. Se agregaron además `favicon.ico` (16/32px),
  `apple-touch-icon.png` (180x180) e `icon-192.png`/`icon-512.png` para `site.webmanifest`.
- `public/robots.txt` y `public/sitemap.xml`: permiten indexar todo y apuntan al sitemap.

## Limitación conocida: URLs dinámicas

El dominio `elsilbador.com.ar` está hardcodeado en `index.html` porque los bots de
Facebook/Twitter/LinkedIn no ejecutan JS y necesitan los metatags OG ya resueltos en el HTML
servido — no alcanza con setearlos desde React en el cliente.

Por la misma razón, **todas las rutas sirven el mismo `index.html`** (Vite es un SPA sin
SSR/prerender): `/`, `/nueva` y `/canciones/:id` comparten el mismo título, descripción e imagen
OG. Una canción individual no tiene su propio title/description/og:image — para eso hace falta
renderizado del lado del servidor o prerender por ruta, que es un cambio de arquitectura más
grande, fuera del alcance de este pase.

`sitemap.xml` por eso solo lista `/` (la biblioteca): es la única URL con contenido indexable de
forma confiable sin server-side rendering.
