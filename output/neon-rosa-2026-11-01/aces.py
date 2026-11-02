# ACESFilmicToneMapping de three.js r160 (OutputPass) + sRGB, y su inversa numérica.
EXPOSURE = 1.05
IN = [(0.59719, 0.35458, 0.04823), (0.07600, 0.90834, 0.01566), (0.02840, 0.13383, 0.83777)]
OUT = [(1.60475, -0.53108, -0.07367), (-0.10208, 1.10813, -0.00605), (-0.00327, -0.07276, 1.07602)]
def mul(m, v): return tuple(sum(m[i][j] * v[j] for j in range(3)) for i in range(3))
def rrt(v): return (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.4329510) + 0.238081)
def srgb(c): return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055
def lin(c): c /= 255; return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def tone(rgb):
    v = mul(IN, [c * EXPOSURE / 0.6 for c in rgb])
    o = mul(OUT, [rrt(x) for x in v])
    return tuple(round(255 * srgb(min(1, max(0, x)))) for x in o)
def inverse(target, guess=(0.5, 0.5, 0.5)):
    # Descenso simple en espacio log: busca la radiancia lineal que da el color sRGB pedido.
    import math
    x = [math.log(max(g, 1e-4)) for g in guess]
    def err(x):
        t = tone([math.exp(v) for v in x]); return sum((a - b) ** 2 for a, b in zip(t, target))
    step = 0.5
    best = err(x)
    while step > 1e-4:
        improved = False
        for i in range(3):
            for d in (step, -step):
                y = list(x); y[i] += d
                e = err(y)
                if e < best: best, x, improved = e, y, True
        if not improved: step /= 2
    return tuple(round(math.exp(v), 4) for v in x), tone([math.exp(v) for v in x])
if __name__ == '__main__':
    for name, t in [('tubo', (255, 198, 238)), ('tubo fino', (247, 180, 231)), ('halo', (235, 45, 148)),
                    ('piedra junto', (240, 75, 130)), ('piedra lejos', (232, 94, 113)), ('cornisa incl', (152, 37, 57)),
                    ('cornisa horiz', (249, 98, 130)), ('piedra calida', (202, 144, 80))]:
        print(name.ljust(14), t, '->', *inverse(t))
    for c in [(3.4, 0.02, 0.5), (4.5, 1.6, 2.6)]:
        print('actual', c, '->', tone(c))
