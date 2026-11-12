# Lover: techo de algodón y luz cálida

Revisión del techo siguiendo la imagen adjunta del usuario. Se conservaron los arcos, el nácar, los muebles y los acertijos de la opción B.

## Cambios

- Doce bancos tridimensionales alargados e irregulares, con grosor real y detalle geométrico en varias escalas. Sustituyen la disposición de lóbulos redondos.
- Superficie de algodón creada con ImageGen integrado y aplicada en tres ejes para que el detalle no se estire en los costados. La imagen es un material superficial; no sustituye el volumen por una foto plana.
- Tonos rosa, celeste y lavanda; relleno suave y transmisión cálida aproximada en pliegues y bordes. Un respaldo luminoso oculto da luz a las separaciones.
- Malla cerrada con orientación consistente y contornos suavizados; las variantes comparten geometría mediante instancias. No se añadieron luces puntuales ni simulación volumétrica por fotograma. La geometría y el shader tienen costo de renderizado; no se midieron FPS.

## Capturas reales

- `4-lover/entrada.png`: versión dentro del juego completo.
- `4-lover/techo-nubes.png` y `4-lover/nubes-cerca.png`: techo visto desde otras posiciones.
- `modelo-nube.png`: una geometría del techo aislada, con su material real.
- `antes.png`: implementación previa.
- `referencia.png`: imagen adjunta del usuario; referencia artística, no captura del juego.
- `preview/`: sala aislada para iterar, con diferencias respecto a la iluminación global del juego.

## Recursos y comprobación

Textura: `assets/textures/lover/cloud-cotton.webp` (1024 × 1024). Prompt exacto: `assets/textures/lover/cloud-cotton-prompt.txt`. Ambos están en el repositorio de trabajo.

`verificacion.json` contiene el resultado de la prueba del juego completo: acertijos del arcoíris y del cofre, corazón oculto, secreto, premio, puerta, carga de texturas y errores de consola. El script reproducible es `verificar.cjs`; los accesos de prueba no se agregan al código de producción.

Cambios locales; sin commit, push ni publicación en este turno.
