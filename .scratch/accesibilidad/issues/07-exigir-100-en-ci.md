# 07: CI exige 100 de accesibilidad y buenas prácticas en todas las páginas

**What to build:** Con los tickets anteriores resueltos, todas las páginas auditadas dan 1.00 en
accesibilidad y en buenas prácticas, y `lighthouserc.json` exige 1.00 en todas sin pisos por página.
Si una página nueva o un cambio baja el puntaje, el job de Lighthouse de CI falla. Ver
[spec](../spec.md).

**Blocked by:** 01, 02, 03, 04, 05, 06

**Status:** ready-for-agent
**Agent:** unassigned

- [ ] `lighthouserc.json` exige 1.00 de accesibilidad, buenas prácticas y SEO en todas las páginas. Solo rendimiento conserva un umbral propio.
- [ ] Ya no quedan pisos por página que reflejen el puntaje de antes.
- [ ] El README ya no dice que los umbrales del editor son provisorios.
- [ ] `npm run lighthouse` pasa, en local y en CI.
