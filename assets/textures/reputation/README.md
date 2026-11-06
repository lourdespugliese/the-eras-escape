# Reputation — retexturizado

Sala 3: paredes carbón con los abanicos y rombos art déco originales en latón apagado; bandas de peltre, piedra oscura satinada, terciopelo vino y escamas plateadas.

- `honed-charcoal.jpg`: albedo de piedra generado con ImageGen, reducido a 1024 × 1024, JPEG calidad 88. Repite cada 3 m. Rugosidad .43, metalicidad .12.
- `wine-velvet.jpg`: albedo de terciopelo generado con ImageGen, reducido a 1024 × 1024, JPEG calidad 88. Se compone una vez con pliegues para cortinas y costuras/botones para tapicería. Rugosidad .96–.97.
- `js/reputation-materials.js`: mapas estáticos reproducibles de metal cepillado, micrograno, escamas superpuestas, placas ventrales, iris, porcelana pintada, cinta del mango y surcos del vinilo. El bate reutiliza una franja del roble de Fearless.
- `js/roomreputation.js`: conserva los motivos, los símbolos y el recorrido original; las paredes usan UV en metros, incluidos los dinteles. Materiales del bate independientes para que su dibujo sobre la cámara no cambie la profundidad de los muebles.

Sin nuevos pases de render, reflejos planos ni animación de texturas en CPU. Se mantienen las animaciones y los mapas de entorno existentes. Esto no constituye una medición de rendimiento.

Prompts de los albedos:

> Seamless square PBR albedo texture for a refined stylized-realistic 3D game room. Flat orthographic scan of dark charcoal black honed stone, very fine mineral grain and only a few thin restrained smoky gray veins. Deep graphite, not pure black. Elegant satin stone intended for an art-deco throne room, low contrast. No tile joints, no golden border, no cracks, no text, no directional lighting, no reflections, no gloss highlights, no shadows, no vignetting. Seamless opposite edges. Sparse delicate veins, absolutely not busy marble.

> Seamless square PBR albedo texture of elegant deep burgundy wine velvet upholstery for a stylized-realistic 3D game throne and drapes. Subtle rich short velvet pile, visible fine woven textile detail, gentle natural small-scale variation. Wine red with muted plum undertone, not bright scarlet, not orange. Flat orthographic even diffuse lighting. No folds, no tufting, no seams, no buttons, no trim, no objects, no shadow or highlight gradients, no text, no vignette. Seamless all edges, refined tactile material not noisy grunge.

Verificación: `node output/reputation-retexturizado-2026-11-06/verificar.cjs` desde la raíz. Capturas y resultado JSON en esa carpeta. Prueba los pasos correctos e incorrectos, aparición y recogida del bate, combate contra las cuatro serpientes, espejo secreto, premio y apertura de puerta. El acceso a las variables del acertijo se inyecta únicamente en el navegador de pruebas.
