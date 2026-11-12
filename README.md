# The Eras Escape (MVP: Habitación 1)

Los módulos ES requieren un servidor local (no funciona abriendo index.html con doble clic).
Desde esta carpeta:

    python3 -m http.server 8000      # o: npx serve
    # luego abrir http://localhost:8000

Alternativa: extensión "Live Server" de VS Code.
Three.js se carga desde CDN, por lo que se necesita conexión a internet.

## Habitación 1 (Fearless) — dos acertijos
1. **La melodía**: mariposas con símbolos + pedestales musicales.
2. **Completar la historia**: colocar anillo / chaqueta / estrella bajo el cuadro de su canción
   (Love Story, You Belong With Me, Fearless). Al acertar se iluminan los cuadros y aparecen sus imágenes (assets/images/historia1-3.webp).
Distribución: libro en el centro, historias a un lado (este) y melodía al otro (oeste).
Se pueden resolver en cualquier orden; la guitarra dorada solo aparece cuando ambos están completos.

Para saltar la intro mientras desarrollas, abre http://localhost:8000/?skip.

## Atajos para desarrollo (probar una sala sin pasar las anteriores)
Se activan añadiendo un parámetro a la URL. No afectan al juego normal: sin parámetros todo funciona como siempre.

| URL | Qué hace |
|---|---|
| `http://localhost:8000/?skip` | Salta la intro y empieza en la sala 1. |
| `http://localhost:8000/?room=N` | Salta la intro y empieza **dentro de la sala N** (N = 1 a 4). |
| `http://localhost:8000/?room=5` | Empieza en la cámara de transición. La salida se abre cuando Folklore está preparado. |
| `http://localhost:8000/?room=6` | Pasa por la cámara de transición y te lleva a Midnights. |

Ejemplo para probar la sala Lover: `http://localhost:8000/?room=4`
(con Live Server de VS Code: `http://127.0.0.1:5500/?room=4`).
Pulsá **Comenzar la historia** para activar el atajo.

Con `?room=N` el juego deja todo como si ya hubieras pasado las salas anteriores:
- El inventario trae los objetos de las salas anteriores.
- En las salas 1 a 4, las puertas anteriores quedan abiertas y aparecés junto a la entrada de la sala elegida.
- La cámara de Folklore cierra el paso hacia Lover y descarga las salas anteriores antes de abrir la salida al bosque.
- La puerta de **salida** de la sala N sigue cerrada: se abre al resolver su acertijo.

Notas:
- Si N es mayor que el número de salas construidas, se usa la última sala.
- El progreso no se guarda: al recargar se vuelve a empezar.
- Al construir una sala nueva, agrégala a la lista que recibe `jumpToRoom` en `main.js`
  (`[room1, room2, room3, room4, ...]`) y `?room=N` la reconocerá.

## Rendimiento y memoria gráfica

Las salas se registran en `js/streaming.js`. Las que quedan lejos se separan de la escena y liberan sus geometrías, texturas y buffers de instancias de la GPU; vuelven a conectarse antes de entrar en el alcance visible. Los recursos compartidos con salas presentes se conservan. Los objetos originales, las fuentes de las texturas en RAM y el progreso de los acertijos se mantienen, por lo que regresar no reinicia una sala ni requiere descargar sus imágenes otra vez. Las salas todavía se construyen al inicio: esta optimización no es carga de archivos por demanda.

El alcance se calcula con la niebla y la cámara existentes, teniendo en cuenta las esquinas de la pantalla, más 4 m de precarga y 4 m de margen para evitar cargas repetidas al moverse sobre un límite. No se reducen resolución, texturas, antialiasing, bloom ni calidad de sombras. Las animaciones lejanas se suspenden conservando las transiciones globales de iluminación.

La vegetación del bosque se agrupa en sectores de 8 m. Se conservan todas las instancias, sus transformaciones, colores, geometrías y materiales. Los sectores que quedan fuera de la cámara ya no se envían a dibujar; los límites incluyen margen para el viento.

Para inspeccionar una sesión, abrir `?room=5&perf` y consultar `window.__perf.streaming.stats`, `window.__perf.renderer.info.memory` y `window.__perf.visibility.stats`. Los contadores de geometrías y texturas representan recursos residentes, no bytes de memoria.

Las pruebas y los resultados se encuentran en `output/rendimiento-2026-11-06/`: `verify.cjs` compara vistas y verifica descarga/recuperación; `puzzles.cjs` resuelve Reputation, Lover, Folklore y Midnights con sus interacciones reales; `resources.cjs` comprueba en WebGL la liberación y recuperación de texturas y reflejos. Los scripts usan la instalación local de Playwright indicada en su primera línea.
