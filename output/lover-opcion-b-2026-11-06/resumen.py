from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

base=Path(__file__).resolve().parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
def picture(file,size=(640,400)):
    return Image.open(file).convert('RGB').resize(size,Image.Resampling.LANCZOS)

comparison=Image.new('RGB',(1280,430),'#181c28');draw=ImageDraw.Draw(comparison)
for col,(file,label) in enumerate([(base/'antes.png','ANTES'),(base/'4-lover/entrada.png','AHORA · OPCIÓN B')]):
    comparison.paste(picture(file),(col*640,30));draw.text((col*640+12,3),label,fill='#f0d3e3',font=font)
comparison.save(base/'antes-despues.jpg',quality=93,optimize=True)

details=Image.new('RGB',(1280,1290),'#181c28');draw=ImageDraw.Draw(details)
files=[('4-lover/techo-nubes.png','TECHO DE NUBES 3D'),('modelo-nube.png','UNO DE LOS MODELOS DEL TECHO'),
       ('4-lover/nacar.png','NÁCAR Y JUNTAS'),('4-lover/arcos.png','ARCOS Y MOLDURAS'),
       ('4-lover/contraplano.png','VISTA HACIA LA ENTRADA'),('4-lover/corazon-resuelto.png','ACERTIJOS RESUELTOS')]
for i,(file,label) in enumerate(files):
    x=i%2*640;y=i//2*430;details.paste(picture(base/file),(x,y+30));draw.text((x+12,y+3),label,fill='#f0d3e3',font=font)
details.save(base/'detalles.jpg',quality=92,optimize=True)
report=json.loads((base/'verificacion.json').read_text(encoding='utf-8'))
assert not report['errors'] and not report['failedAssets']
assert report['clouds']['banks']==16
(base/'README.md').write_text('''# Lover · opción B implementada

Techo formado por dieciséis bancos de nubes modeladas en 3D, con volumen, silueta irregular y alturas diferentes. Los modelos son superficies cerradas y comparten tres geometrías instanciadas. El detalle fino de la superficie es procedural.

Paredes con arcos superpuestos, molduras, columnas acanaladas, mosaico de nácar y corazones opalescentes. El nácar usa un albedo generado con ImageGen y un material iridiscente. Las placas de pistas quedan delante de los relieves para mantener su lectura.

- `4-lover/entrada.png`: captura real dentro del juego.
- `modelo-nube.png`: render de uno de los modelos utilizados, separado del techo para apreciar su volumen.
- `antes-despues.jpg`: comparación con la pasada anterior.
- `detalles.jpg`: acercamientos y premio de los acertijos.
- `verificacion.json`: resultados de los dos acertijos, el corazón escondido, el secreto, el premio y la puerta; incluye medidas de grosor de las geometrías de nube.
- `verificar.cjs`: prueba reproducible en Edge sin interfaz. Los accesos internos se inyectan solo desde el script de diagnóstico.

Implementado localmente, sin publicar. Capturas reales del resultado; no son las imágenes conceptuales.
''',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
