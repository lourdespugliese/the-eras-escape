from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root=Path(__file__).parent
before=root.parent/'1989-retexturizado-2026-11-06/diagonal.png'
after=root/'diagonal.png'
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',25)
canvas=Image.new('RGB',(1920,650),'#131922')
d=ImageDraw.Draw(canvas)
for x,label,file in [(0,'PRIMERA PASADA',before),(960,'1989 · DETALLE DE TODOS LOS OBJETOS',after)]:
    d.text((x+18,12),label,font=font,fill='#c8e6ee')
    image=Image.open(file).convert('RGB').resize((960,600),Image.Resampling.LANCZOS)
    canvas.paste(image,(x,50))
canvas.save(root/'antes-despues.jpg',quality=93)
print('Comparación guardada.')

views=[('taxi','TAXI · pintura y rotulos'),('rueda','RUEDAS · goma y llantas'),('camara','CAMARA · optica y carcasa'),('edificios','EDIFICIOS · ventanas y fachadas'),('parada-materiales','PARADA · acero, vidrio y esmalte'),('quiosco','QUIOSCO · papel y superficies'),('armario','ARMARIO · paneles y candado'),('mesa-piezas','MESA · tablero y piezas'),('gaviota','GAVIOTA · plumaje')]
sheet=Image.new('RGB',(1920,1320),'#131922');d=ImageDraw.Draw(sheet)
label_font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',20)
for i,(slug,label) in enumerate(views):
    x=(i%3)*640;y=(i//3)*440
    image=Image.open(root/(slug+'.png')).convert('RGB').resize((624,390),Image.Resampling.LANCZOS)
    sheet.paste(image,(x+8,y+42));d.text((x+12,y+10),label,font=label_font,fill='#c8e6ee')
sheet.save(root/'detalles.jpg',quality=94)
