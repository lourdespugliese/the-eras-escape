from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).parent
before=root.parent/'propuesta-salas-2026-11-01/capturas/2-1989-diagonal.png'
after=root/'diagonal.png'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',25)
canvas=Image.new('RGB',(1920,650),'#131922')
d=ImageDraw.Draw(canvas)
for x,label,file in [(0,'ANTES',before),(960,'1989 · MATERIALES APLICADOS',after)]:
    d.text((x+18,12),label,font=font,fill='#c8e6ee')
    image=Image.open(file).convert('RGB').resize((960,600),Image.Resampling.LANCZOS)
    canvas.paste(image,(x,50))
canvas.save(root/'antes-despues.jpg',quality=93)
print('Comparación guardada.')
