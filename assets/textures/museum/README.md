# Materiales del museo

Rama: `retexturizado`. Texturas de color generadas con la herramienta integrada image_gen. Los mapas normal, altura (bump) y rugosidad se construyen en `js/museum-materials.js`; no se desplazan vértices ni se cambian colisiones. La piedra deriva su altura de la textura de color; el mármol usa microrelieve independiente para que las vetas no se conviertan en grietas.

- `limestone.png`: fachada y bloques de piedra, repetición de 6 metros.
- `ivory-marble.png`: damero, pedestales, columnas interiores y estatua existente.
- `dark-marble.png`: damero y pedestal central.
- Madera, revoque, pavimento húmedo y mapas de superficie: generación determinista en canvas.
- Reflejos planos del exterior y hall: Reflector de Three.js r160, un reflejo activo según la zona, resolución 1024 × 576. Mantiene las texturas del piso mediante mezcla transparente. Referencia de implementación: https://github.com/mrdoob/three.js/blob/r160/examples/jsm/objects/Reflector.js
- Sombras y luz cálida ajustadas en el museo; las salas conservan sus materiales.

Para revisar: servir el repositorio por HTTP y abrir `/` para el exterior o `/?hall` para el hall; pulsar Comenzar. Las referencias generadas y las capturas reales se guardan en `output/retexturizado-concepto-2026-10-30/`. Las referencias son una dirección visual, no una captura idéntica del motor.

## Prompts originales

### limestone

Create a square seamless tileable PBR albedo/base color texture for a real-time 3D game: warm beige limestone ashlar masonry, large horizontal rectangular blocks with narrow shallow mortar joints, staggered courses, fine pores, natural restrained mineral variation, subtle age. Each block is roughly twice as wide as high, 4 courses visible. Orthographic flat surface scan, evenly lit, NO baked directional light, NO shadows, NO perspective, NO objects, NO text, no borders. Texture fills the entire square, edges tile seamlessly. Realistic material detail. This is a texture asset, not a scene render.

### ivory-marble

Create a square seamless tileable PBR albedo/base color texture for a real-time 3D game: polished warm ivory cream marble, subtle natural taupe and gold branching veins, delicate stone mineral grain, restrained luxury museum material. No tile joints. Orthographic flat surface scan, evenly lit, NO baked directional light, NO shadows, NO perspective, NO objects, NO text, no borders. Texture fills the entire square, edges tile seamlessly. Realistic material detail. This is a texture asset, not a scene render.

### dark-marble

Create a square seamless tileable PBR albedo/base color texture for a real-time 3D game: polished nearly black warm charcoal marble, delicate branching ivory and restrained gold veins, fine mineral grain, understated luxury museum material. No tile joints. Orthographic flat surface scan, evenly lit, NO baked directional light, NO shadows, NO perspective, NO objects, NO text, no borders. Texture fills the entire square, edges tile seamlessly. Realistic material detail. This is a texture asset, not a scene render.

