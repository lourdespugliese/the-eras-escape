# Muestra: follaje y viento suave

Vista previa aislada del bosque real de Folklore/Evermore. No modifica los archivos del juego ni aplica el material al sitio publicado.

- `bosque-viento-muestra.gif`: bucle de 6 segundos a 10 cuadros por segundo.
- `comparacion.jpg`: escena actual junto a la propuesta de textura.
- `hojas.png`: textura estática generada con la herramienta integrada de imágenes; prompt en `prompt-textura.md`.
- `wind-preview.js`: prototipo de movimiento de copas. Conserva los grupos instanciados, deja los troncos quietos y aplica el desplazamiento a sus sombras.
- `verificacion.json`: registro de captura y errores. Los datos de dibujado no constituyen una medición de tiempo de GPU.

El GIF es una demostración para revisar el aspecto. La implementación propuesta usa una textura estática y un pequeño cálculo en el shader; no utiliza el GIF como textura. Las partículas y otras animaciones se congelaron durante la captura para que el movimiento del follaje pueda verse por separado.

La muestra cubre los árboles repetidos del bosque; el gran árbol central y el sauce conservan su material actual. No se alteraron senderos, pistas ni colisiones.

Recrear desde la raíz del proyecto:

    node output/muestra-viento-2026-11-05/capturar-muestra.cjs
    python output/muestra-viento-2026-11-05/crear-gif.py
