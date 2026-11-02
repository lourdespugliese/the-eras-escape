# Coincidencia entre el calco (verde) y el alma de la referencia (rojo); amarillo = coinciden.
import json, sys
from PIL import Image, ImageDraw, ImageFilter, ImageChops
X0, Y0, X1, Y1, Z = 714, 136, 1008, 236, 6
ref = Image.open('referencia.png').convert('RGB').crop((X0, Y0, X1, Y1)).resize(((X1 - X0) * Z, (Y1 - Y0) * Z), Image.BICUBIC)
mask = ref.split()[1].filter(ImageFilter.GaussianBlur(2)).point(lambda v: 255 if v > 150 else 0)
strokes = json.load(open(sys.argv[1]))
drawn = Image.new('L', mask.size, 0); d = ImageDraw.Draw(drawn)
for pts in strokes.values():
    sc = [((x - X0) * Z, (y - Y0) * Z) for x, y in pts]
    if len(sc) > 1: d.line(sc, fill=255, width=int(2.4 * Z), joint='curve')
    for p in (sc[0], sc[-1]): d.ellipse([p[0] - 1.2 * Z, p[1] - 1.2 * Z, p[0] + 1.2 * Z, p[1] + 1.2 * Z], fill=255)
both = ImageChops.multiply(mask, drawn)
out = Image.merge('RGB', (mask, drawn, Image.new('L', mask.size, 0)))
out.save(sys.argv[2])
m = sum(1 for v in mask.getdata() if v); dr = sum(1 for v in drawn.getdata() if v); b = sum(1 for v in both.getdata() if v)
print(f'referencia {m} px, calco {dr} px, comun {b} px -> IoU {b / (m + dr - b):.3f}, cubre ref {b / m:.3f}, precision {b / dr:.3f}')
