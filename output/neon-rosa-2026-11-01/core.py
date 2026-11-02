# Mapa del alma blanca del tubo (canal verde: el halo y la piedra rosas casi no tienen verde) con cuadrícula fina.
import sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1, k = [int(v) for v in sys.argv[3:8]]
im = Image.open(src).convert("RGB").crop((x0, y0, x1, y1)).resize(((x1 - x0) * k, (y1 - y0) * k), Image.BICUBIC)
g = im.split()[1].point(lambda v: max(0, min(255, int((v - 90) * 255 / 130))))
im = Image.merge("RGB", (g, g, g))
d = ImageDraw.Draw(im, "RGBA")
for x in range(x0 - x0 % 5, x1, 5):
    X = (x - x0) * k
    d.line([(X, 0), (X, im.height)], fill=(255, 60, 60, 150) if x % 50 == 0 else (0, 200, 255, 120 if x % 10 == 0 else 50), width=1)
    if x % 10 == 0: d.text((X + 2, 2), str(x), fill=(255, 220, 0, 255))
for y in range(y0 - y0 % 5, y1, 5):
    Y = (y - y0) * k
    d.line([(0, Y), (im.width, Y)], fill=(255, 60, 60, 150) if y % 50 == 0 else (0, 200, 255, 120 if y % 10 == 0 else 50), width=1)
    if y % 10 == 0: d.text((2, Y + 2), str(y), fill=(255, 220, 0, 255))
im.save(out)
