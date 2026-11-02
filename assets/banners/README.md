# Banners y reflectores del museo

Los seis archivos JPG son fotografías de Taylor Swift seleccionadas para Fearless, 1989, Reputation, Lover, Folklore y Midnights. Sus autores, licencias y páginas originales están en [SOURCES.md](SOURCES.md) y `sources.json`.

`js/museum-premiere.js` monta las imágenes entre los ocho pilares existentes: tres banners a cada lado y el espacio central libre para la puerta. Las fotos se encuadran con UVs, sin modificar los JPG. Cada tela mide 2,64 × 7,15 unidades, tiene bordes dorados y una ondulación leve.

Los cuatro reflectores se sitúan dentro del patio, a ambos lados del recorrido. Sus carcasas tienen colisión. Los haces usan un shader de volumen aproximado, barrido lento y reflejos en el pavimento existente; dos luces locales iluminan el suelo. No añaden mapas de sombras por reflector.

El conjunto es hijo del grupo de la introducción. Los haces y las luces del suelo se apagan al entrar; al omitir la introducción se oculta el conjunto junto con el exterior. La carga de los seis banners forma parte de `ctx.museum.ready`.

La alfombra roja de terciopelo recorre el camino central, los seis peldaños y el descanso hasta la puerta. Su malla sigue el perfil de la escalera y queda por encima del plano de reflejos. El sobre de la introducción descansa sobre ella; las colisiones del recorrido se mantienen.

Validación: seis texturas cargadas, cuatro reflectores visibles en el exterior, haces ocultos en el hall, intro omitida y regreso al museo sin errores de consola. Captura real: `output/premiere-2026-11-01/exterior-premiere.png`.
