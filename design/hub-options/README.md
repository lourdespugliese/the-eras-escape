# Colección de propuestas para The Eras Escape

Cuatro conceptos visuales para mejorar el menú de inicio y pausa que aparece en la captura. Son propuestas de diseño: el juego y su progresión no fueron modificados.

## Opciones

| Concepto | Dirección visual | Referencias y uso |
|---|---|---|
| [Museo de las eras](museo-de-las-eras.png) | Borgoña, rosa, latón y vitrinas iluminadas | Pone los seis recuerdos en el centro de la historia y conecta con el museo 3D que ya existe. Es la opción recomendada para mantener la identidad actual. |
| [Casa de las eras](casa-de-las-eras.png) | Casa de muñecas con seis habitaciones y luz de atardecer | Inspirada libremente en la casa del video de Lover. Cada habitación anticipa un nivel; la distribución es una interpretación artística para este juego. |
| [Pulsera de recuerdos](pulsera-de-recuerdos.png) | Papel marfil, cuentas de vidrio, dijes y tonos pastel | Cada objeto recuperado puede completar un dije. La pulsera hace visible el progreso y trae un guiño directo al fandom. |
| [Archivo 13](archivo-13.png) | Expedientes, papel, azul medianoche y lavanda | Convierte cada era en un caso por resolver. Destaca la búsqueda de pistas, los easter eggs y el número 13. |

Abrir [index.html](index.html) para comparar las cuatro imágenes.

## Los seis niveles del proyecto

El orden real está en `js/main.js:80–87`. Folklore y Evermore comparten un único nivel.

| Nivel | Objeto actual | Vocabulario visual para explorar |
|---|---|---|
| Fearless | Guitarra dorada | Oro, mariposas, cuento de Love Story, número 13. |
| 1989 | Polaroid | Azul cielo, ciudad, fotografías instantáneas, gaviotas. |
| Reputation | Serpiente | Negro, metal, serpiente, periódicos. |
| Lover | Corazón | Rosa y lavanda, nubes, arcoíris, casa de habitaciones. |
| Folklore / Evermore | Llave antigua | Cabaña, bosque, niebla, cardigan, otoño y sauce de willow. |
| Midnights | Llave final | Índigo, luna, relojes, bruma lavanda, detalles de Bejeweled. |

La forma lunar de la llave final en los conceptos es una propuesta de estilización. El juego la identifica como «Llave final».

## Criterios para la implementación

- Mantener un recorrido lineal: las seis eras se muestran como recuerdos o capítulos, sin prometer selección libre de niveles.
- Conservar un solo botón principal. En una sesión activa puede decir «CONTINUAR»; al comenzar, usar la acción de cada propuesta.
- Representar el progreso con los seis objetos que ya existen en `js/ui.js:4–10`.
- Tratar el progreso como progreso de la sesión: actualmente no hay guardado persistente.
- Mantener sonido y música como controles secundarios y mostrar las teclas en una sola línea legible.
- La pulsera, los sellos, los bloqueos y los efectos visuales son propuestas. No son funciones nuevas ya implementadas.
- El hall tiene tres canciones secretas en su vitrina musical; se puede explorar luego un indicador discreto de «Secretos encontrados».
- Los textos de las imágenes son referencias visuales rasterizadas. Al implementar, recrearlos como texto HTML accesible.

## Referencias verificadas

- [V&A — Taylor Swift Songbook](https://www.vam.ac.uk/articles/va-trail-taylor-swift-songbook): el 13 en Fearless, Love Story, serpiente de Reputation, cardigan de Folklore y vestuario de Bejeweled.
- [Lover — video oficial](https://www.youtube.com/watch?v=-BjZmE2gtdo): casa de habitaciones como inspiración visual. La asignación de habitaciones de estos conceptos es propia.
- [1989 — tienda oficial](https://store.taylorswift.com/products/1989-taylors-version-seagull-design-tee): motivo de gaviotas.
- [Midnights — archivo oficial](https://tserasarchive.taylorswift.com/midnights): Lavender Haze, Bejeweled y referencia a las friendship bracelets.
- [Evermore — archivo oficial](https://tserasarchive.taylorswift.com/evermore): willow y material de su video.

## Producción

Imágenes creadas con la herramienta integrada de generación de imágenes. Los prompts completos están en [PROMPTS.md](PROMPTS.md). Las ilustraciones son conceptos originales y no reproducen portadas.

Se recomienda **Museo de las eras + progreso como pulsera**: conserva la atmósfera del juego y añade un gesto del fandom que también explica el objetivo.

