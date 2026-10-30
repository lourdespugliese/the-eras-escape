# Prompts usados

Los 15 prompts completos de reconstrucción y recorte, con sus posiciones de destino, están en [image-prompts.json](image-prompts.json).

Se usó la herramienta integrada `image_gen` con la imagen original como destino de edición, y transparencia activada para todos los elementos salvo el papel de fondo.

## Refinamiento final de la base de la pulsera

Input: primera extracción de la base de pulsera (`raw/bracelet-first-pass.png`).

> Use case: background-extraction. The input is the EDIT TARGET: this already isolated oval strand of friendship bracelet beads. Make exactly ONE correction: remove ALL the wide blurry colored halo/backing and ALL shadows around and inside the ring. The loop interior, spaces between beads, outside the string and every background pixel must be completely alpha-transparent. Preserve ONLY the opaque and naturally translucent bead/glass/pearl, metal spacer, star, pink cord and white13bead pixels. Preserve exactly every bead placement and ring shape as input. Do not redraw, reorder, add or remove beads. No contactshadow, no glow, no halo, no drop shadow, no floor, no vignette, no gradientbacking, no matte, no paper, no background color, no fakecheckerboard. Tight framing with transparent margin. This asset will be composited on ivorypaper; wide soft hazes must be absent.

El fondo exterior e interior de esta capa tiene alfa cero. Algunos visores que ignoran el canal alfa pueden mostrar colores residuales que no aparecen al componerla.
