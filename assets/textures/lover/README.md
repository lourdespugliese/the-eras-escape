# Lover · opción B: Atardecer iridiscente

Implementación de la propuesta aprobada, con la corrección del techo: las nubes son modelos tridimensionales cerrados, no una imagen sobre un plano.

- `js/lover-clouds.js`: tres geometrías de bancos de nubes construidas por isosuperficies. Envolventes alargadas unidas con ruido de densidad en varias escalas, normales suaves y grosor real. Doce bancos cubren el techo en tres lotes instanciados. Se construyen una sola vez; no hay simulación volumétrica por fotograma.
- `js/lover-architecture.js`: arcos superpuestos, paneles en relieve, molduras, columnas acanaladas instanciadas, zócalos y corazones opalescentes. Se conservan las aberturas y las colisiones de la sala.
- `js/lover-materials.js`: estuco pastel, nácar con juntas y relieve, acabados iridiscentes y superficie mate para los modelos de nubes. La forma y el volumen de las nubes provienen de la geometría; el detalle de algodón utiliza una textura generada y proyección triplanar, para evitar estiramiento en los costados.
- `nacre-mosaic.webp`: albedo nuevo de nácar generado mediante ImageGen integrado, 1024 × 1024, WebP calidad 85. Los reflejos y la iridiscencia se calculan con el material del juego.

Prompt del nácar:

> Seamless square PBR diffuse albedo texture for a beautiful pastel MOTHER OF PEARL wall mosaic in a stylized realistic romantic game room. Exactly eight by eight small square nacre tiles in a clean regular grid. Hairline warm ivory grout. Each tile has subtle natural shell striations and tiny irregular mineral variation, satin soft finish, restrained pearly shades of cream, dusty rose, lavender and pale ice blue. Refined and delicate, not saturated rainbow. Orthographic front view, flat even diffuse lighting. No bright specular highlights, no directional shadows, no perspective, no objects, no text, no large cracks, no vignette. Seamless opposite edges, full edge-to-edge material scan.

Prueba funcional y capturas actuales: `node output/lover-nubes-algodon-2026-11-06/verificar.cjs`. Comprueba los dos acertijos, el corazón escondido, el secreto, el premio, la puerta y el grosor de las geometrías de nube. El render `modelo-nube.png` muestra uno de los modelos usado en el techo.

## Revisión de algodón a partir de la referencia del usuario

- `cloud-cotton.webp`: detalle superficial de algodón generado con ImageGen integrado; 1024 × 1024, WebP calidad 85. El prompt exacto está en `cloud-cotton-prompt.txt`. La imagen adjunta por el usuario se utilizó como referencia de material, no como techo plano.
- `js/lover-cloud-material.js`: textura y relieve proyectados en tres ejes; luz difusa suave y transmisión cálida aproximada mediante un atributo de malla precalculado. Evita puntos blancos duros sobre el cuerpo de las nubes.
- La luz de los huecos usa un respaldo cálido oculto detrás de los modelos. No se añadieron luces puntuales ni simulación volumétrica por fotograma. La textura, la geometría y las muestras de material sí tienen costo de renderizado.
