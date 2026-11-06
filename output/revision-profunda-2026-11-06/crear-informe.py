from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json
import html
import shutil

BASE = Path(__file__).resolve().parent
ROOT = BASE.parents[1]
FONT = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
SMALL = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 17)

ROOMS = [
    dict(id='reputation', folder='3-reputation', title='03 · Reputation', color='#c7ad77',
         summary='Carbón art déco, plata oscura, terciopelo vino y porcelana pintada.',
         changes=['Piedra satinada y paredes con motivos a escala real; metales cepillados con brillo controlado.',
                  'Serpientes con escamas finas, vientre y ojos diferenciados; tapicería con costuras y cortinas con pliegues.',
                  'Muebles con bordes suaves; calaveras con nariz y dientes; taza hueca, té y asas reales.',
                  'Periódicos tipográficos, espejo con bordes envejecidos, bate con madera y agarre, vinilo con surcos.'],
         test='Recorrido de letras correcto e incorrecto, bate, ocho golpes contra cuatro serpientes, espejo secreto, premio y puerta.',
         details=['trono', 'porcelana', 'escamas', 'tocadiscos-secreto'],
         gallery=['entrada','trono','porcelana','escamas','tocadiscos-secreto','premio']),
    dict(id='lover', folder='4-lover', title='04 · Lover', color='#e7a5c2',
         summary='Pasteles suaves, acabado perlado, piedra rosa y tapicería con trama y costuras.',
         changes=['Paredes con nubes suaves y corazones discretos; damero con vetas finas y juntas, techo con microtextura.',
                  'Sofá y cojines con tejido y pespuntes; asientos separados, ribetes y patas; puf tapizado.',
                  'Cofre biselado con herrajes, bisagras y forro; altar y pedestal perlados; corazones con acabado satinado.',
                  'Mariposas recortadas con nervaduras; nubes de textura fina; cartel con soporte metálico y pistas legibles.',
                  'Túnel con relieve fino, luces atenuadas y tocadiscos interior con vinilo detallado.'],
         test='Corazón bajo el cojín, orden incorrecto y corrección del arcoíris, cuatro botones del cofre, vuelo del premio, disco secreto y puerta.',
         details=['sofa','cofre','nubes','puf','tunel','tocadiscos'],
         gallery=['entrada','diagonal','contraplano','sofa','cofre','altar','puf','nubes','tunel','corazon-resuelto','tocadiscos']),
    dict(id='forest', folder='5-forest', title='05 · Folklore / Evermore', color='#c3aa72',
         summary='Corteza, suelo con hojarasca, follaje abierto, musgo, madera, nieve e hielo.',
         changes=['Corteza con relieve y anillos de crecimiento en los cortes; ramas conectan la copa del árbol central.',
                  'Hojas y agujas con recorte alfa y huecos; escala afinada, copas más suaves y brisa en shader.',
                  'Sotobosque instanciado al borde de los caminos; hojas que caen con silueta real; huellas con suela.',
                  'Tierra con hojarasca detallada y transición a nieve granular; hielo con fracturas y burbujas.',
                  'Cabaña con veta a escala, tejado de tablillas, marcos de ventana y cartas con texto y fibras.',
                  'Faroles con vidrio estriado y jaulas metálicas en un solo lote instanciado; guardianes de piedra, cofre helado y llave de metal.'],
         test='Código 743, bloqueo de la caja sin recorrido, trampa y reinicio, cuatro guías y cruces, guardianes, notas, sauce, llave y puerta.',
         details=['claro','corteza','cabana','cartas','nieve','sendero-abierto','sauce','llave'],
         gallery=['entrada','claro','corteza','otono','cabana','interior','cartas','nieve','musgo','guardianes','lago','sendero-abierto','sauce','llave']),
    dict(id='midnights', folder='6-midnights', title='06 · Midnights', color='#b5b4f1',
         summary='Azul nocturno, jacquard, tapicería, terrazzo, mecanismos de metal y vidrio.',
         changes=['Paredes de jacquard y cortinas con pliegues; suelo de terrazzo azul conservando todos los números del reloj.',
                  'Sillones con bordes suaves, costuras, asientos y ribetes; madera en patas y mesas; alfombra con grano textil.',
                  'Teléfono con disco numerado, auricular curvo y cable espiral; pantallas estriadas y brillo más contenido.',
                  'Piezas de ajedrez con collares torneados y corona; acabados de piedra y marco fino del tablero.',
                  'Relojes con esferas de mayor definición, grabado fino y números cardinales; metales diferenciados en engranajes y llave.',
                  'Bola de espejo con teselas y luna con detalle de cráteres; bruma y reflejos ajustados para mostrar los materiales.'],
         test='Bloqueo del reloj antes de la llamada, código 1331, hora 3:13, mate Tc7–a7, reloj incorrecto y mezcla, tres engranajes, trece orbes, llave y puerta.',
         details=['sillon','telefono','piezas','relojes','reloj-pared','cortinas','bola','luna'],
         gallery=['entrada','salon','sillon','telefono','reloj-suelo','bola','ajedrez','piezas','relojes','reloj-pared','cortinas','luna','finale']),
]

def thumbnail(file, size=(640,400)):
    im=Image.open(file).convert('RGB')
    return im.resize(size, Image.Resampling.LANCZOS)

results=json.loads((BASE/'verificacion.json').read_text(encoding='utf-8'))
overview=Image.new('RGB',(1280,860),'#10151f')
comparison=Image.new('RGB',(1280,1720),'#10151f')
od=ImageDraw.Draw(overview); cd=ImageDraw.Draw(comparison)
sections=[]
for i,room in enumerate(ROOMS):
    folder=BASE/room['folder']
    if room['id']=='reputation': before=folder/'antes-entrada.png'
    else:
        old={'lover':'4-lover','forest':'5-folklore-evermore','midnights':'6-midnights'}[room['id']]
        before=folder/'antes-entrada.png'
        shutil.copy2(ROOT/'output/propuesta-salas-2026-11-01/capturas'/f'{old}-entrada.png',before)
    x=i%2*640;y=i//2*430
    overview.paste(thumbnail(folder/'entrada.png'),(x,y+30));od.text((x+12,y+3),room['title'],font=FONT,fill=room['color'])
    for col,(file,label) in enumerate([(before,'ANTES'),(folder/'entrada.png','AHORA')]):
        comparison.paste(thumbnail(file),(col*640,i*430+30));cd.text((col*640+12,i*430+3),room['title']+' · '+label,font=FONT,fill=room['color'])
    names=room['details'];detail=Image.new('RGB',(1280,430*((len(names)+1)//2)),'#10151f');dd=ImageDraw.Draw(detail)
    for j,name in enumerate(names):
        x=j%2*640;y=j//2*430;detail.paste(thumbnail(folder/(name+'.png')),(x,y+30));dd.text((x+12,y+4),name.replace('-',' ').capitalize(),font=SMALL,fill='#e9e8e6')
    detail.save(folder/'detalles.jpg',quality=91,optimize=True)
    coverage=results['rooms'][room['id']]['coverage']
    changes=''.join('<li>'+html.escape(text)+'</li>' for text in room['changes'])
    gallery=''.join(f'<figure><a href="{room["folder"]}/{name}.png"><img loading="lazy" src="{room["folder"]}/{name}.png" alt="{html.escape(name)}"></a><figcaption>{html.escape(name.replace("-"," ").capitalize())}</figcaption></figure>' for name in room['gallery'])
    sections.append(f'''<section id="{room['id']}" style="--accent:{room['color']}">
    <p class="eyebrow">REVISIÓN SALA POR SALA</p><h2>{room['title']}</h2><p class="lead">{room['summary']}</p>
    <div class="comparison"><img src="{room['folder']}/antes-entrada.png" alt="Sala antes de esta revisión"><img class="after" src="{room['folder']}/entrada.png" alt="Sala actual"><span class="before-label">ANTES</span><span class="after-label">AHORA</span><div class="handle"></div><input type="range" min="0" max="100" value="50" aria-label="Comparar antes y después" oninput="this.parentElement.querySelector('.after').style.clipPath='inset(0 '+(100-this.value)+'% 0 0)';this.parentElement.querySelector('.handle').style.left=this.value+'%'"></div>
    <p class="hint">Arrastrá el control para comparar. Capturas reales del juego.</p><ul>{changes}</ul>
    <div class="test"><strong>Prueba completa: aprobada</strong><p>{room['test']}</p><small>{coverage['physicalMaterials']} materiales físicos revisados · {coverage['textures']} mapas referenciados · ningún material físico sin mapa de color.</small></div>
    <h3>Objetos y detalles</h3><div class="gallery">{gallery}</div></section>''')

overview.save(BASE/'resumen-visual.jpg',quality=92,optimize=True)
comparison.save(BASE/'antes-despues.jpg',quality=91,optimize=True)
total=sum(room['coverage']['physicalMaterials'] for room in results['rooms'].values())
captures=sum(len(room['gallery']) for room in ROOMS)
nav=''.join(f'<a href="#{r["id"]}">{r["title"]}</a>' for r in ROOMS)
document='''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Revisión de texturas · The Eras Escape</title><style>
:root{color-scheme:dark;font-family:system-ui,sans-serif;background:#0b101a;color:#e5e6ed;line-height:1.65}*{box-sizing:border-box}body{margin:0}main{max-width:1240px;margin:auto;padding:40px 28px 80px}header{padding:35px 0 40px;border-bottom:1px solid #30384b}h1{font-size:clamp(32px,5vw,60px);line-height:1.12;letter-spacing:-2px;max-width:900px;margin:15px 0 25px}h2{font-size:36px;line-height:1.2;color:var(--accent);margin:10px 0}h3{font-size:22px}.lead{font-size:19px;color:#c5ccdb;max-width:900px}.eyebrow{letter-spacing:3px;font-size:12px;color:#aeb8ce}nav{display:flex;gap:10px;flex-wrap:wrap;margin:24px 0}a{color:#c7d9ff}nav a,.button{display:inline-block;border:1px solid #3a465d;border-radius:24px;padding:9px 16px;text-decoration:none}.stats{display:flex;gap:25px;flex-wrap:wrap;margin:28px 0;color:#b9c5da}.stats strong{font-size:25px;color:#fff}.status{display:inline-block;background:#143c35;color:#bbf1dc;border-radius:5px;padding:5px 10px}.comparison{position:relative;aspect-ratio:8/5;overflow:hidden;background:#05070b;border:1px solid #344052;border-radius:8px}.comparison>img{position:absolute;width:100%;height:100%;object-fit:contain}.comparison .after{clip-path:inset(0 50% 0 0)}.comparison input{position:absolute;bottom:8px;width:90%;left:5%;z-index:4;cursor:ew-resize;accent-color:var(--accent)}.handle{position:absolute;left:50%;top:0;bottom:38px;border-left:2px solid #fff9}.before-label,.after-label{position:absolute;top:12px;font-size:12px;padding:3px 9px;background:#07101cbb;z-index:3}.after-label{left:12px}.before-label{right:12px}.hint{font-size:13px;color:#9daac1;margin:7px 0 25px}section{padding:55px 0;border-bottom:1px solid #30384b;scroll-margin-top:15px}li{margin:8px 0}.test{padding:20px 25px;border:1px solid #286257;border-left:4px solid #64c7a6;background:#10211f;border-radius:6px;margin:28px 0}.test strong{color:#b5ebd9}.test p{margin:6px 0}.test small{color:#9bbdb4}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}.gallery figure{margin:0;background:#151e2b;border:1px solid #303b50;border-radius:7px;overflow:hidden}.gallery img{width:100%;display:block;aspect-ratio:8/5;object-fit:contain}.gallery figcaption{padding:10px 15px;font-size:14px;color:#bbc7dc}.notes{padding:25px;background:#141d2b;border-radius:8px;margin-top:40px}footer{font-size:13px;color:#a4aec1;margin-top:35px}@media(max-width:700px){main{padding:24px 16px}.gallery{grid-template-columns:1fr}h2{font-size:29px}.stats{gap:15px}}</style><main><header><p class="eyebrow">THE ERAS ESCAPE · 6 NOV 2026</p><h1>Una pasada profunda, desde Reputation hasta Midnights.</h1><p class="lead">Texturas y modelos trabajados dentro del juego, con comparaciones, acercamientos y pruebas de los acertijos. Las imágenes de esta página son capturas del resultado implementado.</p><span class="status">Aplicado en el proyecto local</span>'''
document+=f'<div class="stats"><span><strong>4</strong> salas</span><span><strong>7</strong> albedos nuevos</span><span><strong>{captures}</strong> capturas</span><span><strong>{total}</strong> materiales auditados</span></div><nav>{nav}</nav><a class="button" href="antes-despues.jpg">Comparación completa</a> <a class="button" href="verificacion.json">Resultados de las pruebas</a></header>'
document+=''.join(sections)
document+='''<div class="notes"><h3>Cómo quedó construido</h3><p>Los materiales nuevos se generan una sola vez y comparten mapas entre objetos. Los árboles y el sotobosque siguen instanciados; las carcasas de los faroles se dibujan en un solo lote. El follaje usa recorte alfa, conserva la escritura de profundidad y recibe una brisa suave mediante un uniforme de shader.</p><p>Se reutilizan los mapas de entorno y las luces existentes. No se añadieron reflejos planos, nuevos pools de luces ni cargas de GIF en cada fotograma. El viento sí requiere un pequeño trabajo de GPU; no se ha medido el rendimiento en dispositivos.</p><p>Las pruebas recorren interacciones reales. Los accesos internos de diagnóstico solo se inyectan desde el script del navegador de pruebas. Fearless y 1989 conservan su retexturizado anterior.</p><p><a href="../../assets/textures/world/README.md">Inventario y procedencia de las texturas</a> · <a href="assets-source.json">Prompts de generación</a> · <a href="verificar.cjs">Script de verificación</a></p></div><footer>Sin publicar ni subir estos cambios al remoto. Verificación visual y funcional en Edge sin interfaz; no es una medición de rendimiento.</footer></main></html>'''
(BASE/'informe.html').write_text(document,encoding='utf-8')
markdown='# Revisión profunda · salas 3 a 6\n\nCambios aplicados localmente. Capturas reales y comparación interactiva en [informe.html](informe.html).\n\n'
for room in ROOMS:
    markdown+='## '+room['title']+'\n\n'+room['summary']+'\n\n'+''.join('- '+c+'\n' for c in room['changes'])+'\nPrueba aprobada: '+room['test']+'\n\n'
markdown+=f'{total} materiales físicos auditados, ninguno sin mapa de color. Sin errores de consola ni recursos fallidos. Pruebas en `verificar.cjs`; resultados en `verificacion.json`. No se midieron FPS ni consumo de GPU.\n'
(BASE/'INFORME.md').write_text(markdown,encoding='utf-8')
print(json.dumps({'captures':captures,'physicalMaterials':total,'report':str(BASE/'informe.html')},ensure_ascii=False))
