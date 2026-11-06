# Fearless — detalle de objetos

Segunda pasada centrada en mariposas, flores y materiales de los objetos de la primera sala.

| Elemento | Tratamiento |
| --- | --- |
| Mariposas | Alas doradas con nervaduras y escamas, borde moteado y silueta transparente. El ala izquierda se refleja desde la misma imagen. Se conservan los pivotes de aleteo y los cuatro símbolos del acertijo en discos independientes. |
| Flores | Pétalos amarillos con centro de polen y bordes recortados. Se usan planos pequeños con recorte alfa en lugar de las esferas amarillas. |
| Plantas y macetas | Hojas con nervaduras, tallos que nacen dentro de la maceta, terracota con marcas de torno, borde y tierra visible. |
| Guitarras | Tapa con grano, roseta, puente y cuerdas; diapasón con trastes. Se conserva la silueta y la recompensa dorada. |
| Libro | Papel con fibra, texto de la pista existente y cubierta de cuero granate. |
| Baúl, silla, atril y pedestales | Se reutilizan las vetas de roble de la primera pasada y se añade textura de metal a los remates. |
| Anillo, chaqueta y estrella | Cojín y tela con trama y costuras, metal con detalle fino y gema con caras claras. Se conservan los colores identificables y el parche 13. |
| Velas y detalles | Cera con pequeñas marcas, llama con silueta y metal cepillado en marcos y engranajes. |

Los cambios de alas se activan sólo al pasar la apariencia de Fearless a `makeButterfly`. Sus usos en otras salas conservan el diseño anterior. Lo mismo sucede con las guitarras: su apariencia detallada es opcional. Las macetas conservan su posición, colisión e interacción de liberar tres mariposas.

## Texturas y preparación

- `butterfly-wing.png`: una sola ala derecha, generada con la herramienta integrada de imágenes y preparada a 512 × 512 con alfa.
- `golden-flower.png`: una cabeza de flor, generada del mismo modo y preparada a 512 × 512 con alfa.
- `js/fearless-props.js`: prepara una vez los mapas compartidos de fibra, cuero, tejido, terracota, hojas, tierra, cera, llama, metal y guitarra.
- `js/fearless-materials.js`: comparte los mapas y materiales entre los objetos.

La transparencia recorta el fondo de las alas, hojas y flores; no vuelve traslúcida toda su superficie. Se usan los mismos símbolos, respuestas, fotografías y objetos del acertijo. Las texturas son estáticas y el movimiento de alas utiliza la animación existente.

## Verificación

`output/fearless-detalles-2026-11-06/verificar.cjs` comprueba la carga de los mapas, las 24 flores, las cuatro mariposas con símbolos, la liberación de tres mariposas desde una planta, los dos acertijos, la recogida de la guitarra y la apertura de la salida. También comprueba los materiales físicos sin textura de color y guarda capturas cercanas y `verificacion.json`. No mide rendimiento.

## Prompts de las imágenes generadas

### Ala

Use case: stylized-concept. Asset type: transparent game butterfly wing texture. One single RIGHT HALF of a golden butterfly: exactly one connected forewing above and one smaller hindwing below, on a truly transparent background, no torso, no antennae, no opposite wing, no extra insects. The attachment root is near the LEFT EDGE at vertical center; the silhouette spreads rightward and vertically into two elegant rounded lobes with softly scalloped edges. Whole wing fits inside the square with 5 percent margin. Golden honey and butter yellow, delicate tawny brown branching veins, fine dusty scale texture, restrained dark gold edge with tiny cream speckles, luminous fairytale warmth. Natural botanical detail but compatible with a stylized low-poly 3D escape game. Flat front-facing orthographic isolated wing, evenly lit diffuse albedo, no cast shadow, no background, no white outline, no text, no symbols, no grid. The transparent area outside the wing silhouette must have actual alpha transparency.

### Flor

Use case: stylized-concept. Asset type: transparent flower cutout texture for a 3D game plant. One single yellow daisy-like wildflower head facing directly toward the viewer, flat orthographic botanical view. 14 to 18 gently irregular long golden yellow petals arranged radially around a small warm ochre pollen center. Rich fine petal veins, gentle butter-yellow tips and honey-gold near the center, tactile fine botanical detail. Graceful storybook botanical realism compatible with a stylized low-poly romantic golden room. Flower covers 85 percent of square; fully visible complete silhouette, no stem, no leaves, no vase, no scene. True transparent background outside and between petal tips; actual alpha transparency, no drawn checkerboard, no white fringe, no text or symbols. Soft even diffuse lighting, no cast shadow, no dramatic highlights.
