# Dibuja las Bézier encajadas (proyectadas a la cámara de inicio) sobre la referencia.
import json, re, sys
from PIL import Image, ImageDraw
S = 651.23 / (55 - 28.84)
data = json.load(open(sys.argv[1])); CY = data['centerY']
ref = Image.open('referencia.png').convert('RGB')
X0, Y0, X1, Y1, Z = 700, 120, 1030, 245, 4
im = ref.crop((X0, Y0, X1, Y1)).resize(((X1 - X0) * Z, (Y1 - Y0) * Z), Image.LANCZOS)
d = ImageDraw.Draw(im)
def screen(x, y):  # cm (y abajo) -> pantalla
    X, Y = x / 100, CY - y / 100
    return ((862 + X * S - X0) * Z, (456 - (Y - 0.5) * S - Y0) * Z)
for path in data['paths'].values():
    nums = [float(v) for v in re.findall(r'-?\d+\.?\d*', path)]
    p0 = (nums[0], nums[1]); pts = [screen(*p0)]
    if ' L ' in path:
        pts = [screen(nums[i], nums[i + 1]) for i in range(0, len(nums), 2)]
    else:
        for i in range(2, len(nums), 6):
            c = [p0, (nums[i], nums[i + 1]), (nums[i + 2], nums[i + 3]), (nums[i + 4], nums[i + 5])]
            for k in range(1, 13):
                t = k / 12; mt = 1 - t
                pts.append(screen(*[mt**3 * c[0][j] + 3 * mt * mt * t * c[1][j] + 3 * mt * t * t * c[2][j] + t**3 * c[3][j] for j in (0, 1)]))
            p0 = c[3]
    d.line(pts, fill=(0, 255, 255), width=3, joint='curve')
im.save(sys.argv[2])
