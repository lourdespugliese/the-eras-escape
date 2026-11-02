# Piedra del frontón en puntos sin letras: referencia frente a variantes.
import sys
from PIL import Image
pts = {'A izq bajo barra': (745, 195), 'B entre l y S': (850, 160), 'C der de t': (985, 195), 'D bajo S': (900, 208),
       'E izq abajo': (740, 214), 'F der abajo': (1000, 210), 'G x-6.5': (700, 182), 'H x+6.8': (1030, 185),
       'I x-8.5': (650, 200), 'J x+8.7': (1080, 200), 'K esq izq': (560, 205), 'K esq der': (1160, 205),
       'L cornisa incl izq': (700, 160), 'L cornisa cima': (862, 116), 'M cornisa horiz': (880, 232), 'M cornisa izq': (760, 232)}
def avg(im, x, y):
    s = [0, 0, 0]
    for dx in range(-1, 2):
        for dy in range(-1, 2):
            c = im.getpixel((x + dx, y + dy)); s = [a + b for a, b in zip(s, c)]
    return tuple(round(v / 9) for v in s)
ims = [(p.split('/')[-1].replace('.png', '')[-16:], Image.open(p).convert('RGB')) for p in sys.argv[1:]]
print('punto'.ljust(20) + ''.join(n.ljust(17) for n, _ in ims))
for k, (x, y) in pts.items():
    print(k.ljust(20) + ''.join(str(avg(im, x, y)).ljust(17) for _, im in ims))
