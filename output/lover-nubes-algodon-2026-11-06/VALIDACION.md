# Validación del techo algodonado de Lover

Desde la raíz del proyecto:

```powershell
node output/lover-nubes-algodon-2026-11-06/preview.cjs
node output/lover-nubes-algodon-2026-11-06/verificar.cjs
```

`preview.cjs` carga únicamente la sala real de Lover con las mismas geometrías, materiales, luces, tone mapping y bloom base del juego. Sus capturas son una herramienta rápida para iterar, no sustituyen la comprobación en el juego completo. No reproduce el presupuesto global de luces, las otras salas ni la visibilidad por zonas. Sus cifras de dibujo no son un benchmark del juego.

`verificar.cjs` inicia el juego completo, captura la sala desde distintas posiciones y verifica el corazón oculto, una combinación incorrecta y la corrección del arcoíris, el cofre, el secreto, la recogida del premio y el desbloqueo de la puerta. Comprueba carga de materiales, ausencia de errores de consola/recursos y que los bancos conservan grosor real, con el antiguo techo plano oculto. Renderiza además un banco aislado usando su geometría y material reales.

Los accesos a variables privadas de los acertijos se inyectan únicamente en las respuestas del servidor de prueba; no se agregan al código del juego.
