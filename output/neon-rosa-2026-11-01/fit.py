# Lleva el calco (píxeles de la referencia, cámara de inicio) al plano del cartel, lo encaja en el tímpano visible
# y lo convierte en curvas Bézier (algoritmo de Schneider) en centímetros, con Y hacia abajo como en SVG.
import json, math, sys

S = 651.23 / (55 - 28.84)          # píxeles por unidad en el plano del cartel (fov 70, 912 px de alto, cámara en z = 55)
R = 0.07                           # radio del tubo
FLOOR = 10.0                       # la cornisa tapa el plano del cartel por debajo de y = 10 desde la cámara de inicio
TOP = lambda x: 13.54 - 0.21111 * abs(x)   # borde del tímpano menos el margen de la prueba (check-neon)

traced = json.load(open(sys.argv[1]))
world = {k: [((sx - 862) / S, 0.5 + (456 - sy) / S) for sx, sy in v] for k, v in traced.items()}
pts = [p for v in world.values() for p in v]

def feasible(sx, sy):
    # Desplazamiento vertical mínimo para despejar la cornisa; ¿cabe entonces bajo el borde inclinado?
    dy = FLOOR + R + 0.02 - sy * min(y for _, y in pts)
    slack = min(TOP(sx * x) - R - 0.01 - (sy * y + dy) for x, y in pts)
    return dy, slack

ASPECT = float(sys.argv[3]) if len(sys.argv) > 3 else 1.0   # sx / sy
lo, hi = 0.5, 1.0
for _ in range(40):
    mid = (lo + hi) / 2
    (lo, hi) = (mid, hi) if feasible(min(1, mid * ASPECT), mid)[1] >= 0 else (lo, mid)
sy = lo; sx = min(1.0, sy * ASPECT)
dy, slack = feasible(sx, sy)
fitted = {k: [(sx * x, sy * y + dy) for x, y in v] for k, v in world.items()}
ys = [y for v in fitted.values() for _, y in v]; xs = [x for v in fitted.values() for x, _ in v]
CY = round((max(ys) + min(ys)) / 2, 2)
print(f'escala x {sx:.3f} y {sy:.3f}, dy {dy:.3f}, holgura arriba {slack:.3f}, x {min(xs):.2f}..{max(xs):.2f}, y {min(ys):.2f}..{max(ys):.2f}, centro y {CY}')

# ---- Schneider: ajuste de cúbicas por mínimos cuadrados con subdivisión ----
def sub(a, b): return (a[0] - b[0], a[1] - b[1])
def add(a, b): return (a[0] + b[0], a[1] + b[1])
def mul(a, s): return (a[0] * s, a[1] * s)
def dot(a, b): return a[0] * b[0] + a[1] * b[1]
def norm(a):
    l = math.hypot(*a); return (a[0] / l, a[1] / l) if l else (0.0, 0.0)
def bez(c, t):
    mt = 1 - t
    return add(add(mul(c[0], mt ** 3), mul(c[1], 3 * mt * mt * t)), add(mul(c[2], 3 * mt * t * t), mul(c[3], t ** 3)))
def bez1(c, t):
    mt = 1 - t
    return add(add(mul(sub(c[1], c[0]), 3 * mt * mt), mul(sub(c[2], c[1]), 6 * mt * t)), mul(sub(c[3], c[2]), 3 * t * t))
def bez2(c, t):
    return add(mul(add(sub(c[2], mul(c[1], 2)), c[0]), 6 * (1 - t)), mul(add(sub(c[3], mul(c[2], 2)), c[1]), 6 * t))
def chord(p):
    u = [0.0]
    for a, b in zip(p, p[1:]): u.append(u[-1] + math.hypot(*sub(b, a)))
    return [v / u[-1] for v in u]
def generate(p, u, t1, t2):
    first, last = p[0], p[-1]
    C = [[0, 0], [0, 0]]; X = [0, 0]
    for pt, t in zip(p, u):
        mt = 1 - t
        a1, a2 = mul(t1, 3 * mt * mt * t), mul(t2, 3 * mt * t * t)
        C[0][0] += dot(a1, a1); C[0][1] += dot(a1, a2); C[1][1] += dot(a2, a2)
        tmp = sub(pt, bez([first, first, last, last], t))
        X[0] += dot(a1, tmp); X[1] += dot(a2, tmp)
    C[1][0] = C[0][1]
    det = C[0][0] * C[1][1] - C[1][0] * C[0][1]
    al = (X[0] * C[1][1] - X[1] * C[0][1]) / det if det else 0
    ar = (C[0][0] * X[1] - C[1][0] * X[0]) / det if det else 0
    seg = math.hypot(*sub(last, first)); eps = 1e-6 * seg
    if al < eps or ar < eps: al = ar = seg / 3
    return [first, add(first, mul(t1, al)), add(last, mul(t2, ar)), last]
def max_error(p, c, u):
    worst, split = 0.0, len(p) // 2
    for i, (pt, t) in enumerate(zip(p, u)):
        d = sub(bez(c, t), pt); e = dot(d, d)
        if e > worst: worst, split = e, i
    return worst, split
def reparam(p, c, u):
    out = []
    for pt, t in zip(p, u):
        d = sub(bez(c, t), pt); d1, d2 = bez1(c, t), bez2(c, t)
        den = dot(d1, d1) + dot(d, d2)
        out.append(min(1, max(0, t - dot(d, d1) / den)) if den else t)
    return out
def fit_cubic(p, t1, t2, err):
    if len(p) == 2:
        d = math.hypot(*sub(p[1], p[0])) / 3
        return [[p[0], add(p[0], mul(t1, d)), add(p[1], mul(t2, d)), p[1]]]
    u = chord(p); c = generate(p, u, t1, t2); e, split = max_error(p, c, u)
    if e < err: return [c]
    if e < err * 16:
        for _ in range(20):
            u = reparam(p, c, u); c = generate(p, u, t1, t2); e, split = max_error(p, c, u)
            if e < err: return [c]
    split = max(1, min(len(p) - 2, split))
    tc = norm(sub(p[split - 1], p[split + 1]))
    return fit_cubic(p[:split + 1], t1, tc, err) + fit_cubic(p[split:], mul(tc, -1), t2, err)
def corners(p, angle=70):
    # Índices donde el trazo gira bruscamente (vértices conservados del calco).
    out = []
    for i in range(3, len(p) - 3):
        a, b = norm(sub(p[i], p[i - 3])), norm(sub(p[i + 3], p[i]))
        if math.degrees(math.acos(max(-1, min(1, dot(a, b))))) > angle:
            if not out or i - out[-1] > 6: out.append(i)
    return out
def resample(p, step):
    out = [p[0]]; acc = 0.0
    for a, b in zip(p, p[1:]):
        seg = math.hypot(*sub(b, a)); t = 0.0
        while acc + seg - t >= step:
            t += step - acc; acc = 0.0
            out.append(add(a, mul(sub(b, a), t / seg)))
        acc += seg - t
    if math.hypot(*sub(out[-1], p[-1])) > step * 0.3: out.append(p[-1])
    else: out[-1] = p[-1]
    return out

ERR = 1.0 ** 2                    # cm²: error máximo de 1 cm (≈ 0,25 px a la distancia de la referencia)
paths = {}
for name, v in fitted.items():
    cm = [(x * 100, (CY - y) * 100) for x, y in v]
    cm = resample(cm, 1.2)
    if len(cm) < 4:
        paths[name] = 'M ' + ' L '.join(f'{x:.0f} {y:.0f}' for x, y in cm); continue
    cuts = [0] + corners(cm) + [len(cm) - 1]
    curves = []
    for a, b in zip(cuts, cuts[1:]):
        piece = cm[a:b + 1]
        if len(piece) < 2: continue
        t1 = norm(sub(piece[min(2, len(piece) - 1)], piece[0])); t2 = norm(sub(piece[max(-3, -len(piece))], piece[-1]))
        curves += fit_cubic(piece, t1, t2, ERR)
    d = f'M {curves[0][0][0]:.0f} {curves[0][0][1]:.0f}'
    for c in curves: d += ' C ' + ' '.join(f'{q[0]:.0f} {q[1]:.0f}' for q in c[1:])
    paths[name] = d
json.dump({'centerY': CY, 'scale': [sx, sy], 'paths': paths}, open(sys.argv[2], 'w'), indent=1)
print({k: v.count('C') for k, v in paths.items()}, sum(len(v) for v in paths.values()), 'caracteres')
