from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import json

root=Path(__file__).parent
paths=sorted((root/'cuadros').glob('*.png'))
assert len(paths)==60, f'Faltan cuadros: {len(paths)}/60'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',22)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',15)
frames=[]
for path in paths:
    shot=Image.open(path).convert('RGB')
    frame=Image.new('RGB',(shot.width,shot.height+62),'#14171b')
    frame.paste(shot,(0,62))
    d=ImageDraw.Draw(frame)
    d.text((18,8),'FOLLAJE CON HUECOS · textura GIF animada + viento',font=font,fill='#e7dfcd')
    d.text((18,36),'Hojas recortadas: se ven otras hojas y el fondo · muestra del juego, sin aplicar',font=small,fill='#babfb3')
    frames.append(frame)
palette=frames[0].quantize(colors=256,method=Image.Quantize.MEDIANCUT)
indexed=[f.quantize(palette=palette,dither=Image.Dither.NONE) for f in frames]
indexed[0].save(root/'bosque-follaje-transparente.gif',save_all=True,append_images=indexed[1:],duration=100,loop=0,optimize=True,disposal=1)
before=Image.open(root/'antes.png').convert('RGB')
after=Image.open(root/'despues.png').convert('RGB')
compare=Image.new('RGB',(1920,650),'#14171b')
d=ImageDraw.Draw(compare)
d.text((18,14),'COPA OPACA · referencia',font=font,fill='#e7dfcd')
d.text((978,14),'PROPUESTA · huecos + textura GIF + viento',font=font,fill='#e7dfcd')
compare.paste(before,(0,50));compare.paste(after,(960,50))
compare.save(root/'comparacion.jpg',quality=93)
gif=Image.open(root/'bosque-follaje-transparente.gif')
assert gif.n_frames==60
assert ImageChops.difference(frames[0],frames[15]).getbbox(), 'La animacion no cambia'
print(json.dumps({'frames':gif.n_frames,'duration_ms':gif.info.get('duration'),'bytes':(root/'bosque-follaje-transparente.gif').stat().st_size,'size':gif.size}))
