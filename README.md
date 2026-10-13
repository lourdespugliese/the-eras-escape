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
   (Love Story, You Belong With Me, Fearless). Al acertar se iluminan los cuadros y aparecen sus imágenes (assets/images/historia1-3.jpg).
Distribución: libro en el centro, historias a un lado (este) y melodía al otro (oeste).
Se pueden resolver en cualquier orden; la guitarra dorada solo aparece cuando ambos están completos.

Para saltar la intro mientras desarrollas, abre http://localhost:8000/?skip.

## Atajos para desarrollo (probar una sala sin pasar las anteriores)
Se activan añadiendo un parámetro a la URL. No afectan al juego normal: sin parámetros todo funciona como siempre.

| URL | Qué hace |
|---|---|
| `http://localhost:8000/?skip` | Salta la intro y empieza en la sala 1. |
| `http://localhost:8000/?room=N` | Salta la intro y empieza **dentro de la sala N** (N = 1 a 4). |

Ejemplo para probar la sala Lover: `http://localhost:8000/?room=4`
(con Live Server de VS Code: `http://127.0.0.1:5500/?room=4`).
Después hay que pulsar **COMENZAR JUEGO** como siempre; el salto ocurre en ese momento.

Con `?room=N` el juego deja todo como si ya hubieras pasado las salas anteriores:
- El inventario trae los objetos de las salas anteriores.
- Las puertas de las salas anteriores están abiertas, así que se puede volver atrás caminando.
- Apareces dentro de la sala N, junto a su entrada y mirando hacia el interior.
- La puerta de **salida** de la sala N sigue cerrada: se abre al resolver su acertijo.

Notas:
- Si N es mayor que el número de salas construidas, se usa la última sala.
- El progreso no se guarda: al recargar se vuelve a empezar.
- Al construir una sala nueva, agrégala a la lista que recibe `jumpToRoom` en `main.js`
  (`[room1, room2, room3, room4, ...]`) y `?room=N` la reconocerá.
