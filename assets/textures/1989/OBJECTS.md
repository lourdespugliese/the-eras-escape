# Segunda pasada: todos los objetos de 1989

Se amplió el tratamiento de materiales a todos los objetos físicos de la sala, además de paredes y piso.

| Elemento | Tratamiento |
| --- | --- |
| Taxi | Esmalte con grano fino, franjas a cuadros y rótulos, tapizado con costuras, vidrio con reflejos suaves, rótulo de techo legible sin resplandor blanco intenso. |
| Ruedas | Dibujo de goma en el lateral cilíndrico y textura de llanta con radios en las tapas. |
| Edificios | Texturas de fachada de mayor definición, marcos, travesaños, alféizares y ventanas con luz moderada. |
| Carteles y neones | Carcasas metálicas con tornillos, placas, difusores y texto conservado. Se redujo la emisión del texto para mejorar la lectura. |
| Parada, mesas, armario y contenedor | Acero cepillado, esmalte con juntas finas y vidrio. |
| Cámara | Carcasa con inscripción, tornillos y rejilla; óptica con anillos; flash con difusor. |
| Quiosco y papeles | Pintura, metal y papel de periódico con tinta y columnas. |
| Piezas y Polaroid | Papel con fibras y relieve leve; se conservaron los dibujos, símbolos, coordenadas y reglas. |
| Tocadiscos | Carcasa pintada, brazo metálico y vinilo con surcos concéntricos. |
| Gaviota | Patrón de plumas en cuerpo y alas, pico mate. |
| Techo | Paneles con juntas y perforación fina. |

Los mapas se comparten entre los objetos y se preparan una vez. Se conserva la geometría de interacción, los escondites, los colisionadores y las pistas. Las ruedas tienen 20 segmentos en lugar de 14 para que el contorno de la llanta acompañe al detalle de la textura.

La prueba `output/1989-detalles-2026-11-06/verificar.cjs` revisa las interacciones reales del acertijo y registra los materiales físicos sin textura de color. Las capturas y `verificacion.json` quedan en esa misma carpeta. No es una medición de rendimiento.

## Archivos y origen

- `enamel-detail.jpg` y `brushed-steel.jpg`: generados con la herramienta integrada de imágenes y preparados como JPEG de 512 × 512.
- `js/props1989.js`: prepara los patrones de papel, goma, llantas, tapizado, vidrio, lente, difusores, plumas, vinilo, paneles y rótulos mediante el mismo sistema de texturas canvas usado en el juego.
- `js/materials1989.js`: comparte los mapas y materiales; `js/room1989.js` los asigna a los elementos de la sala.

## Prompts de las texturas generadas

### Esmalte

A seamless square neutral albedo texture of refined satin industrial painted enamel for a stylized realistic video game prop. Pale neutral gray almost white, gentle orange-peel microtexture visible up close, very faint fine irregular wear and thin shallow scuffs, restrained variation, no large damage, no rust, no panels, no markings, no directional lighting, no shadows, no gradients, no text. Flat orthographic surface scan, tileable opposite edges. This is a neutral paint detail map multiplied by yellow taxi paint, blue furniture, purple lockers and dark green dumpster colors. It should retain a clean game-art appearance but feel tactile and believable. Fine detail rather than noisy or dirty.

### Acero

A seamless square surface albedo texture of brushed stainless steel for real-time game props. Light neutral silver gray with elegant fine horizontal parallel brushing, restrained hairline scratches in the brushing direction, subtle satin tonal variation. Clean and realistic but compatible with a stylized game. Flat orthographic material scan, strictly even diffuse lighting, no reflection of environment, no highlight band, no gradient, no shadows, no rust, no seams, no objects, no borders, no text, no vignetting. Seamless opposite edges. Fine visible machining detail for frames, table legs, lamp poles, lockers, signs and camera lens housings.
