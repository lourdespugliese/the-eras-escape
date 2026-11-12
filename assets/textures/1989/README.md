# 1989 — concreto, terrazo y acero

La segunda pasada de detalle de todos los objetos está documentada en [OBJECTS.md](OBJECTS.md), con las texturas adicionales, materiales y capturas de comprobación.

Dirección visual basada en `output/propuesta-salas-2026-11-01/propuesta-conceptual.png`: ciudad nocturna con neón rosa y cian, superficies minerales y mobiliario de acero y esmalte. Las dos texturas se crearon con la herramienta integrada de imágenes y se prepararon como WebP de 1024 × 1024; suman aproximadamente 285 KiB.

- `blue-concrete.webp`: concreto azul grisáceo de poro fino. El módulo de pared cubre 2 m, con juntas muy discretas dibujadas al cargar.
- `graphite-terrazzo.webp`: terrazo grafito. El módulo cubre 2.4 m y contiene cuatro baldosas de 60 cm por lado.

`js/materials1989.js` prepara mapas compartidos y materiales de acero cepillado, acero oscuro, esmalte satinado y papel de periódico. Las coordenadas de las paredes se calculan una vez en metros para mantener la escala en paredes y dinteles. Las texturas no se actualizan durante el juego.

El taxi, el contenedor, el armario, la parada, las mesas y la cámara conservan su geometría e interacciones. El skyline, los neones, las pistas, los números del candado y las imágenes del rompecabezas conservan su contenido. Se redujo el halo de las piezas y la emisión de sus bordes para mejorar la lectura de sus dibujos. La luz ambiental de 1989 se volvió menos violeta; conserva los multiplicadores de transición y celebración existentes.

## Prompts

### Concreto

Seamless square PBR albedo material texture, flat orthographic scan of refined fine-grained blue-gray architectural concrete for a stylized realistic 3D game neon New York room. Muted medium blue slate gray, subtle pores and restrained smooth mottling, high quality mineral detail, gently hand-finished. Entire image is one uninterrupted surface, NO slab edges, NO grid, NO cracks, NO holes, NO stains, NO text, NO perspective, NO directional light, NO highlights or shadows, NO vignetting. Perfect tileable opposite edges. Low contrast so pink and cyan light can color the surface while fine concrete pores remain visible. Not saturated purple, not rough rubble.

### Terrazo

Seamless square PBR albedo material texture for a stylized realistic 3D game floor. Flat orthographic top-down scan of elegant dark graphite terrazzo with small irregular mineral chips: charcoal black matrix, mostly slate-gray and blue-gray chips with a sparse sprinkling of off-white warm gray stone. Dense but restrained fine aggregate, chips 0.2 to 0.8 percent of total image width, no large gravel. Mostly dark graphite surface, subtle even distribution, very low contrast. Satin material but NO baked reflections, NO gloss highlight, NO light gradients or shadows, NO perspective, NO grout or tile borders, NO text, NO cracks. Seamless tileable all four edges. Designed to pick up soft pink and cyan neon lighting in a night-city game room.
