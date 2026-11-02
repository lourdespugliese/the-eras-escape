# Muestras de color (media 3x3) en puntos de la fachada: referencia frente a render.
import sys
from PIL import Image
pts = {
  'tubo T asta': (769, 190), 'tubo barra T': (790, 154), 'tubo S': (866, 166), 'tubo t barra': (975, 178),
  'halo +2px asta': (771, 190), 'halo +3px asta': (772, 192), 'halo +5px asta': (774, 192),
  'halo +2px barra': (790, 157), 'halo +4px barra': (790, 159),
  'piedra entre lineas': (760, 192), 'piedra dentro S': (880, 162), 'piedra centro': (850, 168),
  'piedra izq lejos': (735, 200), 'piedra der lejos': (990, 200), 'piedra bajo Museum': (900, 210),
  'cornisa inclinada izq': (760, 140), 'cornisa inclinada cima': (862, 117), 'cornisa horiz': (880, 232),
  'piedra extremo izq': (560, 205), 'piedra extremo der': (1160, 205),
}
ims = [(n, Image.open(p).convert('RGB')) for n, p in zip(sys.argv[1::2], sys.argv[2::2])]
def avg(im, x, y):
    s = [0, 0, 0]
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            c = im.getpixel((x + dx, y + dy)); s = [a + b for a, b in zip(s, c)]
    return tuple(round(v / 9) for v in s)
print('punto'.ljust(24) + ''.join(n.ljust(18) for n, _ in ims))
for k, (x, y) in pts.items():
    print(k.ljust(24) + ''.join(str(avg(im, x, y)).ljust(18) for _, im in ims))
