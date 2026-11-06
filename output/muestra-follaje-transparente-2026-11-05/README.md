# Muestra 2 — follaje con huecos y textura GIF

Prueba aislada del bosque real. Conserva el balanceo de copas aprobado y agrega movimiento dentro de la textura y huecos entre hojas. No modifica los archivos principales del juego.

## Entregables

- `bosque-follaje-transparente.gif`: captura animada de la prueba en el juego, 6 segundos, 10 fps.
- `hojas-animadas.gif`: la textura que efectivamente usa la prueba. 512 × 512, 24 cuadros, 8 fps, bucle de 3 segundos y transparencia binaria.
- `comparacion.jpg`: referencia con copa opaca y propuesta con huecos.
- `hojas-recortadas.png`: arte transparente generado con la herramienta integrada de imágenes; prompt en `prompt-textura.md`.

## Cómo funciona la muestra

El arte generado se anima mediante una ondulación local periódica y se guarda en un GIF. En el navegador se decodifican sus 24 cuadros y se actualiza una textura compartida a 8 fps. Es un GIF real utilizado como fuente de la textura, además del GIF final de demostración.

Las hojas son opacas y los espacios entre ellas dejan pasar la vista; no se aplica una opacidad uniforme a la copa. El recorte usa `alphaTest`, escritura de profundidad y caras visibles desde ambos lados para ver las otras hojas y el fondo. Las sombras reciben el mismo GIF y el mismo balanceo. Los troncos se mantienen quietos. Se conservan las cinco agrupaciones de copas existentes, sin agregar polígonos de follaje.

La carga y decodificación del GIF, sus cuadros en memoria, las actualizaciones de textura y el follaje visible por ambos lados tienen costo. Esta muestra evalúa la apariencia y no promete rendimiento igual al de la versión opaca. `verificacion.json` registra errores y actualizaciones, no tiempos de GPU. La reproducción mediante ImageDecoder está probada en el navegador local de esta captura; aún no tiene alternativa para navegadores incompatibles.

El prototipo afecta las copas de árboles repetidos; el gran árbol central y el sauce mantienen su material. Las otras animaciones se congelaron al capturar para aislar la animación de hojas y copas.

## Recrear

Desde la raíz del proyecto:

    python output/muestra-follaje-transparente-2026-11-05/crear-textura-animada.py
    node output/muestra-follaje-transparente-2026-11-05/capturar-muestra.cjs
    python output/muestra-follaje-transparente-2026-11-05/crear-gif.py

## Referencias técnicas

- [Three.js: transparencia y recorte de hojas](https://threejs.org/manual/pages/transparency.html)
- [ImageDecoder: decodificar cuadros de un GIF](https://developer.mozilla.org/en-US/docs/Web/API/ImageDecoder/decode)
