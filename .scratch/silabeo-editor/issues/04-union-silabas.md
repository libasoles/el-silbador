# 04: Unión de sílabas (melisma)

**What to build:** Click/tap en el espacio entre dos sílabas adyacentes togglea la fusión de esas dos
sílabas (representando un melisma). La unión es un estado global compartido por todas las pistas, con un
subrayado/arco visual que conecta las sílabas fusionadas. Si ambas sílabas fusionadas tenían anotación en
la pista de Acordes, se conserva la primera y se descarta la segunda.

**Blocked by:** 03

**Status:** done
**Agent:** claude

- [x] Hay un elemento clickeable en el espacio entre cada par de sílabas adyacentes de la letra.
- [x] Click en ese espacio togglea la unión de esas dos sílabas (un segundo click la deshace).
- [x] Las sílabas fusionadas muestran un subrayado o arco continuo que las conecta visualmente, en color
      (único uso de color permitido en esta slice además del texto de anotaciones).
- [x] La unión es global: no depende de qué pista esté activa ni se duplica por pista.
- [x] Si se fusionan dos sílabas que ya tenían anotaciones distintas en la pista Acordes, el resultado
      conserva el contenido de la primera celda y descarta el de la segunda.
- [x] El estado de uniones vive en `src/core`, testeable como toggle puro sin renderizar componentes.
- [x] Test: togglear unión de dos sílabas adyacentes activa y desactiva correctamente el estado de fusión;
      fusionar dos celdas con contenido distinto conserva solo la primera.
- [x] Test: usando la fixture de Ypacaraí, fusionar las sílabas de "Ypa-ca-ra-í" en el punto donde cae un
      acorde multi-sílaba produce el resultado esperado.
