# Recorte ampliado con cuadrícula en coordenadas de pantalla (1724x912) para calcar el cartel.
import sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = [int(v) for v in sys.argv[3:7]]
k = int(sys.argv[7]) if len(sys.argv) > 7 else 4
im = Image.open(src).convert("RGB").crop((x0, y0, x1, y1))
im = im.resize(((x1 - x0) * k, (y1 - y0) * k), Image.LANCZOS)
d = ImageDraw.Draw(im, "RGBA")
for x in range(x0 - x0 % 10, x1, 10):
    X = (x - x0) * k
    d.line([(X, 0), (X, im.height)], fill=(0, 255, 255, 110 if x % 50 == 0 else 45), width=1)
    if x % 50 == 0: d.text((X + 2, 2), str(x), fill=(0, 255, 255, 255))
for y in range(y0 - y0 % 10, y1, 10):
    Y = (y - y0) * k
    d.line([(0, Y), (im.width, Y)], fill=(0, 255, 255, 110 if y % 50 == 0 else 45), width=1)
    if y % 50 == 0: d.text((2, Y + 2), str(y), fill=(0, 255, 255, 255))
im.save(out)
