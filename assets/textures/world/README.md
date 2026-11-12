# Materiales de la revisión profunda · salas 3–6

Albedos generados con ImageGen integrado. Prompts exactos en [prompts.json](prompts.json). Los originales se conservaron en el directorio de imágenes generadas; estas copias optimizadas son las que consume el juego.

| Archivo | Resolución | Uso |
| --- | --- | --- |
| `pearl-plaster.webp` | 1024² | Microtextura del papel pintado de Lover, techo y objetos perlados |
| `silver-linen.webp` | 1024² | Fuente de trama para sofás, cojines, sillones y telas; se compone a 512² con pespuntes |
| `forest-bark.webp` | 1024² | Corteza de troncos, ramas, tocones y árbol caído |
| `forest-earth.webp` | 1024² | Detalle repetido de tierra y hojarasca sobre el mapa estacional del bosque |
| `leaf-cluster.webp` | 512² RGBA | Copas, sotobosque y hojas colgantes del sauce, con huecos transparentes |
| `pine-spray.webp` | 512² RGBA | Agujas y ramas finas de pinos, con recorte alfa |
| `midnight-jacquard.webp` | 1024² | Paredes de Midnights y base de sus cortinas |

JPEG calidad 88 para superficies opacas. PNG conserva transparencia real en follaje. Color en sRGB; micrograno de relieve en espacio de datos. Las texturas de corteza, hojas y agujas se distinguen de la madera cortada y del tejido.

También se reutilizan el roble de Fearless, el terrazzo de 1989 y los materiales específicos de Reputation. No se duplican esos archivos.

## Detalles hechos en código

- `js/surface-library.js`: mapas compartidos de esmalte, metal cepillado, grano, papel, piedra, vinilo y vidrio estriado; coordenadas en metros y geometrías de bordes suaves en caché.
- `js/lover-materials.js`: muro pastel con corazones, damero de piedra veteada, trama con costuras, algodón fino y alas con nervaduras. El cuerpo y las alas de las mariposas conservan el movimiento original.
- `js/forest-materials.js`: suelo estacional con detalle de tierra repetido, nieve granular, tablillas, musgo, fracturas y burbujas del hielo, anillos de crecimiento, suelas y silueta de hojas caídas. Viento suave aplicado en shader, también en el material de profundidad del follaje.
- `js/midnights-materials.js`: jacquard, pliegues de cortina, tapicería cosida, teselas del espejo, disco del teléfono, cráteres lunares y alfombra con grano textil. El reloj del suelo se vuelve a dibujar sobre el terrazzo cuando carga el albedo, conservando números, marcas y escala.
- `js/reputation-materials.js`: materiales específicos de la pasada anterior, ahora complementados por muebles biselados, asas, taza hueca y pequeños detalles en las calaveras.

## Modelos e implementación

Se conservan las coordenadas, colisiones, pivotes de animación, símbolos y soluciones de los acertijos. Los muebles con bordes suaves ocupan sus dimensiones originales. Los árboles continúan instanciados, los huecos de hojas usan `alphaTest` y los nuevos marcos de faroles se agrupan en un solo `InstancedMesh`.

No se añadieron nuevos pools de luces, reflejos planos ni actualizaciones de GIF por fotograma. El movimiento del follaje usa trabajo de vértices en GPU y un uniforme de tiempo; no es cálculo gratuito. No se realizó una medición de rendimiento.

## Revisión y pruebas

Desde la raíz del proyecto:

```powershell
node output/revision-profunda-2026-11-06/verificar.cjs
python output/revision-profunda-2026-11-06/crear-informe.py
```

El script abre Edge sin interfaz, toma capturas de cada sala y comprueba sus acertijos mediante las interacciones reales. Incluye pasos incorrectos, reinicios, bloqueo de premios, secretos y puertas. Los accesos internos para diagnóstico se inyectan por rutas del navegador de pruebas y no forman parte de los módulos del juego.

Capturas, informe visual y resultado JSON en `output/revision-profunda-2026-11-06/`.
