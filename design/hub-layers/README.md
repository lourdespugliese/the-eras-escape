# Pulsera de recuerdos · kit de animación

Reconstrucción en **34 capas**, sobre un lienzo común de **1672 × 941 píxeles**, preparada a partir de la imagen plana elegida.

## Archivos para usar

- **the-eras-escape-animation-kit.zip**: paquete completo para copiar o entregar.
- **the-eras-escape-layers.psd**: documento multicapa con transparencia, RGB de 8 bits.
- **the-eras-escape-layers.ora**: documento OpenRaster con las mismas capas.
- **preview.html**: visor de capas; se abre con doble clic, sin servidor. Permite aislar piezas, comparar con el original y activar una animación de prueba.
- **exports/png/**: las 34 capas como PNG transparentes, listas para importar.
- **vectors/**: textos, etiquetas y controles en SVG editable. PSD y ORA contienen versiones rasterizadas.
- **manifest.json** y **layers-data.js**: orden, posiciones, grupos, cajas y pivotes.
- **source.png**: referencia original, conservada sin cambios.
- **composite.png**: composición de revisión reconstruida con las capas entregadas.

## Desglose

| Grupo | Capas | Contenido |
|---|---:|---|
| Fondo | 1 | Papel limpio reconstruido. |
| Decoración | 5 | Cuatro grupos de bordes y estrellas de confeti. |
| Pulsera | 2 | Hilo y cuentas, más el sobre con sello separado. |
| Dijes | 6 | Guitarra, polaroid, serpiente, corazón, llave con hoja y luna. |
| Etiquetas | 6 | Nombre y papel de cada era. |
| Bloqueos | 5 | Un candado por dije bloqueado; Fearless no tiene candado. |
| Interfaz | 9 | Título, rosa, subtítulo, fondo y texto de botón, progreso, teclado, sonido y música. |

Folklore y Evermore siguen siendo un solo nivel. La llave y su hoja se entregan como un dije ensamblado. Las flores, libros, fotografías y telas de cada esquina permanecen agrupados por borde.

## Cómo animar

Todas las capas PNG y SVG comparten el tamaño del lienzo; al apilarlas a **x0, y0** se conserva la composición. Los campos `x`, `y`, `width` y `height` del manifiesto describen la zona de contenido, no una traslación que deba aplicarse al PNG completo.

El campo `pivot` usa coordenadas globales normalizadas de 0 a 1. En CSS se puede usar `transform-origin: (pivot.x × 100)% (pivot.y × 100)%`. En editores de animación, multiplicar por 1672 y 941 para obtener el punto de anclaje en píxeles. No aplicar además el bbox como desplazamiento.

Para un balanceo suave, comenzar con 1–2 grados alrededor del enganche de cada dije y variar levemente duración y desfase. Los candados pueden ocultarse por separado; si se balancea un dije bloqueado, conviene emparentar su candado al dije para que ambos se muevan juntos. Las etiquetas pueden permanecer quietas. La vista de demostración mueve los candados junto a sus dijes.

## Alcance y fidelidad

La fuente no tenía capas recuperables. Las piezas raster se extrajeron/reconstruyeron con la herramienta integrada de imágenes; las zonas tapadas por dijes y candados se completaron. Hay diferencias de textura, geometría, disposición de cuentas y tipografía respecto del original. Este paquete es una **reconstrucción para animación**, no una separación idéntica píxel por píxel.

Los textos y controles se recrearon como SVG con fuentes Georgia/Times; siguen siendo editables en sus archivos fuente. Las sombras no se entregan en capas independientes: la base se exporta sin sombra de papel y algunos objetos conservan pequeñas sombras/reflejos propios. Para obtener sombras móviles, aplicarlas como efecto en el editor.

## Producción y verificación

- Herramienta integrada `image_gen` para recortes, transparencia y reconstrucción de imagen; sin API/CLI alternativo.
- Prompts iniciales completos en **image-prompts.json**; refinamiento de la pulsera en **PROMPTS.md**.
- Normalización mecánica del lienzo y empaquetado reproducibles en **scripts/**.
- Transparencia real verificada en las 14 capas raster que la requieren; métricas en **alpha-report.json**.
- Contenedores PSD/ORA, número de capas, referencias del manifiesto y CRC del ZIP verificados durante la exportación.

El juego no fue modificado. Este material se entrega para su integración y animación posteriores.
