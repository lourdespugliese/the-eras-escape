from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import html

root = Path(__file__).parent
rooms = [
 dict(name='Fearless',slug='fearless',tag='Un cuento dorado con materiales cálidos',colors=['#ead9b8','#a47342','#b38a43','#49301f'],actual='Paredes amarillas con líneas verticales, piso de tablas, techo marrón y pedestales casi del mismo tono. La luz y las partículas ya construyen la atmósfera; falta separar los materiales.',wall='Lino marfil o papel de fibra fina, conservando la división horizontal. Bajo ella, madera miel de veta suave.',floor='Roble cálido con tablas reconocibles, variación leve y juntas finas. Acabado mate, sin manchas que parezcan pistas.',objects='Latón cepillado en marcos y remates; madera más oscura en cofres; cuero granate y papel crema en el libro. Discos de símbolos limpios y contrastados.',keep='Mariposas, guirnaldas, libro central y posiciones de los tres pedestales.',priority='Piloto recomendado: permite fijar escala de texturas y contraste entre madera, papel y metal.'),
 dict(name='1989',slug='1989',tag='Nueva York: esmalte, concreto y neón',colors=['#243544','#a5c8d5','#ec76ad','#d7d8d0'],actual='Paneles azulados, ciudad ilustrada en ventanas, líneas rosa y cian y piso oscuro cuadriculado. El brillo intenso de algunos objetos aplana sus detalles.',wall='Concreto fino azul grisáceo y paneles de esmalte satinado. Mantener los marcos, ventanas y dibujos de ciudad existentes.',floor='Baldosas de terrazo grafito con grano pequeño y juntas discretas. Reflejos suaves; dejar el brillo más fuerte para el metal y el vidrio.',objects='Acero cepillado en parada y farola; pintura esmaltada en banco y cámara; papel realista en recortes. Neón cian y rosa como acento.',keep='Skyline, carteles, parada de bus y piezas de los acertijos.',priority='Segunda pasada: contrastar materiales fríos con la sala cálida de Fearless.'),
 dict(name='Reputation',slug='reputation',tag='Salón oscuro de poder y prensa',colors=['#171a1e','#a9adb0','#a68a49','#741f2e'],actual='Grandes abanicos dorados y franjas verdes dominan las paredes; piso negro con retícula dorada, trono rojo y espejos con letras. Se lee más dorada que oscura.',wall='Conservar el dibujo art déco, pero convertir el fondo en carbón y los abanicos en dorado viejo de bajo contraste. Filetes de peltre en lugar de verde saturado.',floor='Piedra negra satinada, veta muy escasa y juntas atenuadas. Los espejos con letras deben destacar sobre la piedra.',objects='Terciopelo vino en trono y cortinas, metal envejecido en estructura, serpientes de plata oscura con escamas finas. Periódicos marfil y negro con textura de tinta.',keep='Todos los espejos, letras, estados de acierto/error y superficie del espejo que se rompe.',priority='Mayor cambio de identidad: separar esta sala del dorado de Fearless sin reemplazar su arquitectura.'),
 dict(name='Lover',slug='lover',tag='Una caja de recuerdos en tonos pastel',colors=['#e9b7cf','#dce7e8','#c3b5d9','#f0e6d6'],actual='Damero rosa y blanco, paredes con corazones, arcoíris y nubes luminosas. El velo blanco y el brillo reducen la lectura de carteles y superficies.',wall='Papel mate de rosa empolvado y celeste, con nubes de acuarela muy tenues. Reducir la densidad de corazones alrededor de carteles.',floor='Conservar el damero, con baldosa cerámica satinada en rosa viejo y crema. Pequeña variación entre piezas, juntas cálidas y casi ningún reflejo puntual.',objects='Laca pastel en cofres y pedestales; detalles de nácar moderados. Corazones y arcoíris conservan exactamente sus colores de juego. Túnel con acabado de pintura sedosa.',keep='Orden y colores del acertijo, cofres, túnel de corazón, guirnaldas y arcoíris.',priority='Texturas y contraste deben revisarse juntos: el acabado mate por sí solo no resuelve la luz que quema blancos.'),
 dict(name='Folklore / Evermore',slug='folklore-evermore',tag='Bosque de cuento, tierra y estaciones',colors=['#354538','#826344','#c18043','#d4e0e7'],actual='Árboles de geometría facetada, troncos lisos y suelo pintado con manchas amplias. La entrada ya diferencia la tierra cálida y la nieve del lado invernal.',wall='En el perímetro, manchas verticales suaves de bosque oscuro; evitar un patrón de ladrillos o bloques reconocibles. Conservar el cielo y la niebla.',floor='Mezcla de tierra con hojas al oeste, musgo y tierra en el centro y nieve compactada al este. Bordes difuminados según los senderos existentes.',objects='Corteza vertical poco contrastada sobre troncos, madera de intemperie en la cabaña, hierro oscuro en faroles y hielo azulado en el lago. Mantener copas facetadas.',keep='Huellas, musgo que funciona como pista, rutas, cruces, nieblas, lago y símbolos de los faroles. No agregar huellas decorativas.',priority='Primero suelo y troncos. La textura puede mejorar las superficies, pero no elimina la silueta geométrica de las copas.'),
 dict(name='Midnights',slug='midnights',tag='Observatorio íntimo de medianoche',colors=['#141329','#343358','#a7a9c1','#ba9b55'],actual='Espacio nocturno amplio con gran reloj inscrito en el piso, cielo estrellado, esfera reflectante y estaciones laterales. La decoración se concentra en azul, violeta y oro.',wall='Tejido jacquard azul tinta, con el rombo actual mucho más tenue. Detalles de latón envejecido y cortinas de terciopelo ciruela.',floor='Piedra azul noche con grano fino, sin añadir vetas que compitan con el gran reloj. Conservar números, marcas y posición del anillo como capa independiente.',objects='Nogal oscuro para escritorio y muebles, tejido visible en alfombra y asientos, metal plateado para esfera y latón en relojes. Brillo selectivo en los objetos de interés.',keep='Cielo, reloj del suelo, relojes interactivos, tablero, constelaciones, portal y estados de los acertijos.',priority='Revisión final: que el detalle material aparezca cerca y la lectura del reloj se mantenga desde la entrada.'),
]

intro = '''# Propuesta de retexturizado — The Eras Escape

Fecha: 1 de noviembre de 2026. Basada en 18 capturas nuevas del juego local: entrada, diagonal y contraplano de cada una de sus seis salas. Las capturas usan la escena, iluminación y posprocesado actuales, sin sustituir materiales. La cámara se posicionó para inspección; no constituye una prueba de recorrido ni de resolución de acertijos.

## Dirección recomendada

**Seis eras, seis familias de materiales, una misma calidad artesanal.** Mantener el estilo de cuento y la geometría sencilla del juego; sumar textura creíble a escala humana, desgaste discreto y contraste entre superficies mates y brillantes. Buscar un resultado estilizado y táctil, compatible con los objetos actuales.

La separación principal sería: Fearless cálida y dorada; 1989 urbana y fría; Reputation oscura y metálica; Lover pastel y cerámica; Folklore/Evermore orgánica y estacional; Midnights azul tinta y textil.

## Alcance

Retexturizar paredes, pisos, techos y objetos existentes. Conservar distribución, colisiones, objetos, imágenes de álbumes, textos, símbolos y reglas de los acertijos. La lámina generada, si se incluye, es una interpretación conceptual y no un render implementado.

Las capturas también muestran resplandores fuertes en 1989 y Lover. Ajustar localmente esas emisiones sería una tarea complementaria: cambiar texturas no basta para recuperar detalle en zonas sobreexpuestas. Evitar cambios globales de exposición que alteren todas las salas.
'''

md = [intro]
for i,r in enumerate(rooms,1):
 md.append(f"\n## {i}. {r['name']} — {r['tag']}\n\n![Captura actual de {r['name']}](capturas/{i}-{r['slug']}-diagonal.png)\n\n**Lo observado.** {r['actual']}\n\n**Paredes.** {r['wall']}\n\n**Piso.** {r['floor']}\n\n**Objetos.** {r['objects']}\n\n**Conservar.** {r['keep']}\n\n**Prioridad.** {r['priority']}\n\n**Paleta orientativa:** {', '.join(r['colors'])}.\n")
md.append('''
## Preparación de materiales

- Usar textura de color, relieve suave y variación de rugosidad donde aporten una diferencia visible. Papel, piedra, cerámica y madera no deben comportarse como metal.
- Preparar texturas repetibles de 1024 px; reservar 2048 px para superficies protagonistas cercanas si la prueba de rendimiento lo permite. Son objetivos de producción, no mediciones del juego.
- Ajustar la escala por material: tablas de unos 15–20 cm de ancho, baldosas de 40–60 cm y fibras de papel apenas visibles de cerca. Validar en la cámara real antes de extender el material.
- Reutilizar una pequeña biblioteca de madera, piedra, metal y tejido, con variantes por era. Mantener los materiales compartidos de árboles y otros objetos repetidos.
- Separar bases decorativas de letras, símbolos, huellas, colores y marcas de juego. Las nuevas texturas no deben inventar pistas ni ocultar las existentes.
- En el bosque, combinar la distribución actual de estaciones con detalle repetible; una sola imagen ampliada sobre todo el terreno pierde definición de cerca.

## Orden de ejecución propuesto

1. **Fearless como sala piloto:** pared, piso y un pedestal. Comparar las mismas tres cámaras antes/después y fijar el nivel de detalle.
2. **Reputation y Lover:** dar identidad oscura a la primera y recuperar contraste en la segunda. Revisar las letras y los colores de sus acertijos.
3. **1989 y Midnights:** introducir contraste entre piedra, metal, laca y tejido sin volver todo reflectante.
4. **Folklore/Evermore:** trabajar terreno y corteza por estación; revisar cada pista y transición de camino en un recorrido real.

## Criterios para considerar aprobada una sala

- Desde la entrada se reconoce la era y se identifica el objeto principal.
- A la distancia normal de interacción se leen textos, letras, símbolos y colores.
- No se ven costuras evidentes, estiramientos ni patrones repetidos demasiado grandes.
- Los materiales tienen una escala consistente y conservan detalle bajo la luz existente.
- Los cambios no introducen pistas falsas ni alteran estados visuales de los acertijos.
- Comparar rendimiento con las mismas cámaras y condiciones antes/después; todavía no se midió el costo de materiales nuevos.

## Entregables de esta revisión

- `capturas/`: 18 imágenes nuevas a 1440 × 900.
- `registro.json`: cámaras, límites de salas y errores de ejecución observados durante la captura.
- `estado-actual.jpg`: lámina de referencia con una captura de cada sala.
- `propuesta.html`: informe navegable con las tres vistas de cada sala y paletas.
- `propuesta.md`: este documento.

Esta entrega es una propuesta; no se aplicaron cambios al juego.
''')
(root/'propuesta.md').write_text('\n'.join(md),encoding='utf-8')

font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',28)
board=Image.new('RGB',(1920,1320),'#12121a'); d=ImageDraw.Draw(board)
for i,r in enumerate(rooms):
 x=(i%2)*960;y=(i//2)*440
 file=root/'capturas'/f"{i+1}-{r['slug']}-diagonal.png"
 if r['slug']=='folklore-evermore': file=root/'capturas'/f"{i+1}-{r['slug']}-entrada.png"
 shot=Image.open(file).convert('RGB');shot.thumbnail((944,380))
 board.paste(shot,(x+8+(944-shot.width)//2,y+48))
 d.text((x+18,y+10),f"{i+1:02d}  {r['name']} — ACTUAL",font=font,fill='#eee8dd')
board.save(root/'estado-actual.jpg',quality=94)

parts=['''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Propuesta de retexturizado · The Eras Escape</title><style>body{margin:0;background:#14151b;color:#ede7db;font:17px/1.6 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:48px 24px}h1{font:clamp(36px,6vw,68px)/1.06 Georgia,serif;max-width:900px}h2{font:38px Georgia,serif}h3{font-size:18px;color:#dcc69e}p{max-width:850px}a{color:#e7c88b}nav{display:flex;gap:16px;flex-wrap:wrap;margin:32px 0}section{margin:64px 0;padding-top:24px;border-top:1px solid #45424b}img{max-width:100%;display:block;border-radius:8px}summary{cursor:pointer;margin:18px 0;color:#e7c88b}.views{display:grid;grid-template-columns:1fr 1fr;gap:16px}.swatches{display:flex;gap:8px;margin:22px 0}.swatches span{width:100px;padding-top:54px;border:1px solid #666;border-radius:4px}.swatches small{display:block;background:#222;padding:4px;text-align:center}.pill{font-size:12px;letter-spacing:.15em;color:#d2b98c;text-transform:uppercase}footer{border-top:1px solid #45424b;padding-top:24px}@media(max-width:650px){.views{grid-template-columns:1fr}main{padding:24px 16px}}</style><main><div class="pill">The Eras Escape · 1 noviembre 2026 · propuesta</div><h1>Seis eras.<br>Materiales con identidad.</h1><p>18 capturas nuevas del juego actual, tres vistas por sala. Una propuesta para sumar textura, separar acabados y conservar el carácter de cada era.</p><p><strong>Dirección:</strong> estilo de cuento, materiales táctiles y desgaste discreto. Conservar distribución y acertijos. Esta entrega no modifica el juego.</p><nav>''']
for i,r in enumerate(rooms,1):parts.append(f'<a href="#s{i}">{html.escape(r["name"])}</a>')
parts.append('</nav><p><a href="propuesta.md">Documento completo y criterios de implementación</a> · <a href="estado-actual.jpg">Lámina del estado actual</a></p><div id="concept"></div>')
for i,r in enumerate(rooms,1):
 parts.append(f'<section id="s{i}"><div class="pill">Sala {i:02d} · {html.escape(r["tag"])}</div><h2>{html.escape(r["name"])}</h2><p><strong>Hoy:</strong> {html.escape(r["actual"])}</p><a href="capturas/{i}-{r["slug"]}-diagonal.png"><img loading="lazy" src="capturas/{i}-{r["slug"]}-diagonal.png" alt="Captura actual de {html.escape(r["name"])}"></a><details><summary>Ver entrada y contraplano · capturas actuales</summary><div class="views">')
 for view in ['entrada','contraplano']:parts.append(f'<a href="capturas/{i}-{r["slug"]}-{view}.png"><img loading="lazy" src="capturas/{i}-{r["slug"]}-{view}.png" alt="{view}"></a>')
 parts.append('</div></details><div class="swatches">'+''.join(f'<span style="background:{c}"><small>{c}</small></span>' for c in r['colors'])+'</div>')
 for label,key in [('Paredes','wall'),('Piso','floor'),('Objetos y detalles','objects'),('Conservar','keep'),('Prioridad','priority')]:parts.append(f'<h3>{label}</h3><p>{html.escape(r[key])}</p>')
 parts.append('</section>')
parts.append('<footer><strong>Orden sugerido:</strong> Fearless como piloto → Reputation y Lover → 1989 y Midnights → Folklore/Evermore.<p>La sobreexposición en Lover y algunos brillos en 1989 requieren revisión local de iluminación además del retexturizado. No se midió aún el rendimiento de materiales nuevos.</p><p>Las capturas son reales; cualquier lámina conceptual se identifica como interpretación y no representa cambios implementados.</p></footer></main></html>')
page=''.join(parts).replace('<div id="concept"></div>', '<section><div class="pill">Interpretación visual · generada con IA</div><h2>Dirección de materiales</h2><p>Propuesta conceptual basada en las capturas reales. No implementada. La imagen interpreta algunos detalles y usa reflejos más intensos que los recomendados para producción; prevalecen los acabados satinados y mates descritos en el informe.</p><a href="propuesta-conceptual.png"><img src="propuesta-conceptual.png" alt="Propuesta conceptual para las seis salas"></a><p><a href="prompt-concepto.md">Prompt y método de generación</a></p></section>')
(root/'propuesta.html').write_text(page,encoding='utf-8')
with (root/'propuesta.md').open('a',encoding='utf-8') as f:
 f.write('\n## Lámina conceptual\n\n![Propuesta conceptual no implementada](propuesta-conceptual.png)\n\nGenerada con la herramienta integrada de imágenes a partir de la lámina de capturas actuales. Es una interpretación: algunos detalles y reflejos difieren del juego. Para producción prevalecen los materiales mates y satinados del informe; no se propone copiar los reflejos intensos de la lámina. Prompt completo en `prompt-concepto.md`.\n')
print('Propuesta, galería y lámina guardadas.')
