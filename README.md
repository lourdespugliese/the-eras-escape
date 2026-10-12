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
