from pathlib import Path
from PIL import Image,ImageDraw,ImageFont

root=Path(__file__).parent
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
label_font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',21)
canvas=Image.new('RGB',(1920,650),'#1a1711');d=ImageDraw.Draw(canvas)
for x,label,file in [(0,'PRIMERA PASADA',root.parent/'fearless-retexturizado-2026-11-06/diagonal.png'),(960,'FEARLESS · ALAS, FLORES Y OBJETOS',root/'diagonal.png')]:
    d.text((x+16,12),label,font=font,fill='#e9d7ae')
    canvas.paste(Image.open(file).convert('RGB').resize((960,600),Image.Resampling.LANCZOS),(x,50))
canvas.save(root/'antes-despues.jpg',quality=93)
views=[('mariposa','MARIPOSA · alas y simbolo'),('flor-detalle','FLOR · petalos y polen'),('flores','PLANTA · hojas y tallos'),('maceta','MACETA · terracota y tierra'),('libro','LIBRO · papel y encuadernacion'),('guitarra','GUITARRA · madera y cuerdas'),('baul','BAUL · madera, laton y cera'),('chaqueta','CHAQUETA · tela y costuras'),('anillo','ANILLO · metal, gema y cojin')]
sheet=Image.new('RGB',(1920,1320),'#1a1711');d=ImageDraw.Draw(sheet)
for i,(slug,label) in enumerate(views):
    x=i%3*640;y=i//3*440
    sheet.paste(Image.open(root/(slug+'.png')).convert('RGB').resize((624,390),Image.Resampling.LANCZOS),(x+8,y+42))
    d.text((x+12,y+10),label,font=label_font,fill='#e9d7ae')
sheet.save(root/'detalles.jpg',quality=94)
hero=Image.new('RGB',(1600,550),'#1a1711');d=ImageDraw.Draw(hero)
for x,label,slug in [(0,'MARIPOSAS · alas detalladas','mariposa'),(800,'FLORES · petalos recortados','flores')]:
    d.text((x+16,10),label,font=font,fill='#e9d7ae')
    hero.paste(Image.open(root/(slug+'.png')).convert('RGB').resize((800,500),Image.Resampling.LANCZOS),(x,50))
hero.save(root/'mariposas-flores.jpg',quality=94)
print('Comparacion y laminas guardadas.')
