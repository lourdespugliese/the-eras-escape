# Optimización de rendimiento — 6 de noviembre de 2026

Se descargan de la GPU los recursos exclusivos de las salas lejanas y se separan sus objetos de la escena. El progreso y las fuentes de las texturas permanecen en RAM. La vegetación se divide en sectores de 8 m, sin eliminar instancias ni cambiar sus texturas o geometrías. Se conservan resolución, FOV, MSAA, bloom y sombras.

Comparación de vistas equivalentes en Edge sin interfaz, 1280 × 800, misma escala de píxeles y mismas opciones gráficas. Cada muestra acumula 35 cuadros, incluidos los pases de postprocesado y las sombras.

| Vista | Geometrías residentes en GPU | Texturas residentes en GPU | Reducción de triángulos enviados |
|---|---:|---:|---:|
| Entrada del bosque | 1393 → 920 | 272 → 197 | 2.2% |
| Cabaña del bosque | 1393 → 732 | 272 → 156 | 26.6% |
| Sendero nevado | 1393 → 732 | 272 → 156 | 16.9% |
| Midnights | 1393 → 841 | 272 → 158 | 54.8% |
| Regreso a Fearless | 1393 → 1132 | 272 → 224 | -0.0% |

Los contadores de recursos no miden bytes. En la cabaña se reducen un 47,5% las geometrías y un 42,6% las texturas residentes. Las llamadas de dibujo aumentan aproximadamente un 4,5% allí debido a la subdivisión espacial; el número de triángulos disminuye un 26,6%. Los tiempos de cuadros brutos están en los JSON, pero no se presentan como una garantía de FPS: la ejecución es automatizada y la primera comparación compartió la GPU con otra prueba. El resultado no es una medición aislada de tiempo de GPU.

Validación terminada:

- Reputation: palabra, bate, serpientes, secreto, premio y puerta.
- Lover: arcoíris, cofre, corazón, secreto y puerta.
- Folklore: cabaña, cuatro cruces, lago, sauce, llave y puerta.
- Midnights: llamada, reloj, ajedrez, relojes de mesa, tres engranajes, trece orbes, llave y puerta.
- Salas alejadas desconectadas, recursos compartidos protegidos y recursos exclusivos liberados una sola vez por ciclo.
- Identidad y estado de las salas conservados, incluso tras varias descargas y recuperaciones.
- Todas las transformaciones y colores de las instancias conservados.
- Regreso por teletransporte al museo y vitrinas, con inventario y puertas conservados.
- Prueba WebGL de recuperación de texturas y render targets de reflejos: el píxel azul de referencia sigue siendo [0, 0, 255, 255] tras varias visitas.
- Sin errores de JavaScript ni archivos artísticos fallidos en las pruebas completas.

Los avisos de PMREM y de lectura de canvas registrados ya aparecen en la versión previa.

## Archivos y reproducción

- `baseline.json`: versión previa a la optimización.
- `optimized.json`: versión final, con métricas por vista y comprobaciones de descarga/recuperación.
- `verificacion.json`: acertijos y cobertura de texturas.
- `resources.json`: liberación y recuperación comprobadas con WebGL real.
- `before-*.png`, `after-*.png`: capturas de comparación; `after-museum-restored.png`: museo recuperado.
- `verify.cjs --baseline`, `verify.cjs`, `puzzles.cjs`, `resources.cjs`: scripts ejecutables desde la raíz del proyecto con Node. Usan el Playwright instalado en la ruta de la primera línea.

La carga inicial sigue construyendo todas las salas. Esta implementación reduce la residencia y el trabajo gráfico durante el recorrido; no descarga los archivos artísticos de RAM ni implementa carga inicial por demanda. La devolución de recursos de GPU sigue el [ciclo de liberación de Three.js](https://threejs.org/manual/pages/how-to-dispose-of-objects.html).
