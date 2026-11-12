# Fearless — materiales

La segunda pasada de mariposas, flores y objetos está documentada en [OBJECTS.md](OBJECTS.md), con las imágenes nuevas y su verificación.

Texturas creadas para la primera sala a partir de la dirección de `output/propuesta-salas-2026-11-01/propuesta-conceptual.png`. Se generaron con la herramienta integrada de imágenes y se prepararon como WebP de 1024 × 1024; ambas suman aproximadamente 214 KiB de descarga.

- `oak-albedo.webp`: roble miel, ocho tablas por módulo de 1.6 m.
- `ivory-wallpaper.webp`: papel marfil con ramas tenues.

`js/fearless-materials.js` compone un único mapa para las paredes: papel arriba y madera en el metro inferior. Su escala depende de la posición en la sala, por lo que se conserva cuando la introducción abre o sella la entrada. El piso utiliza tablas de unos 20 cm. Los muebles reutilizan una tabla del roble, y los detalles de latón, papel y cuero comparten un mapa pequeño de microrelieve.

Los símbolos, fotografías, letras y estados de los acertijos conservan sus texturas y colores propios. Los cambios de luz se limitan a Fearless y siguen los multiplicadores de apagado y celebración existentes.

## Prompts

### Roble

Use case: stylized-concept. Asset type: seamless square PBR albedo texture for an existing warm storybook 3D game room. Flat orthographic top-down scan of elegant warm medium honey oak floorboards, 8 narrow boards across the square, their long grain running vertically top to bottom. Each board has 2-3 staggered end joints, understated medium contrast fine curved oak grain with a few small knots, subtle plank-to-plank warm tan caramel variation. Fine dark hairline seams, no wide black gaps. Satin matte surface, no directional light, no baked gloss or reflections, no perspective, no shadows or vignettes, no decorations, no border, no text. Not rustic weathered, no orange saturation, no distressed scratches. Tileable opposite edges. Credible hand-painted realistic material compatible with low-poly game objects, excellent fine wood detail.

### Papel marfil

Use case: stylized-concept. Asset type: seamless square wallpaper albedo texture for a warm elegant storybook 3D game room. Warm ivory fine linen paper with very subtle old-gold botanical vine damask. Restrained faint thin intertwining stems and tiny leaves in a regularly spaced elegant repeat, motif only 8-12 percent darker than cream paper, not busy. Light cream and pale beige, not yellow, not gray. Fine paper fibers barely visible. Flat diffuse neutral lighting, tileable edges, no perspective, no lighting shadows or vignette, no folds, no stains, no tears, no text, no borders, no wood. Must read primarily as luminous ivory wallpaper from a distance, subtle delicate vintage botanical detail at close range. Refined material for a romantic golden fairytale room.
