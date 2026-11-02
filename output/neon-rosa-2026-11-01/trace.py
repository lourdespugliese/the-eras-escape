# Calca el eje de cada tubo de la referencia: camino de mínimo coste por la cresta del alma blanca
# (transformada de distancia de la máscara), entre puntos de paso que fijan el orden en los cruces.
import heapq, json, math, sys
from PIL import Image, ImageDraw, ImageFilter

K = 4
X0, Y0, X1, Y1 = 714, 136, 1008, 236
ref = Image.open('referencia.png').convert('RGB')
up = ref.crop((X0, Y0, X1, Y1)).resize(((X1 - X0) * K, (Y1 - Y0) * K), Image.BICUBIC)
G = up.split()[1].filter(ImageFilter.GaussianBlur(1.0))
W, H = G.size
g = list(G.getdata())
inside = [v > 150 for v in g]

# Transformada de distancia (chaflán 3-4) dentro de la máscara.
INF = 10 ** 9
d = [0 if not m else INF for m in inside]
for y in range(H):
    for x in range(W):
        i = y * W + x
        if not d[i]: continue
        best = d[i]
        if x > 0: best = min(best, d[i - 1] + 3)
        if y > 0:
            best = min(best, d[i - W] + 3)
            if x > 0: best = min(best, d[i - W - 1] + 4)
            if x < W - 1: best = min(best, d[i - W + 1] + 4)
        d[i] = best
for y in range(H - 1, -1, -1):
    for x in range(W - 1, -1, -1):
        i = y * W + x
        if not d[i]: continue
        best = d[i]
        if x < W - 1: best = min(best, d[i + 1] + 3)
        if y < H - 1:
            best = min(best, d[i + W] + 3)
            if x < W - 1: best = min(best, d[i + W + 1] + 4)
            if x > 0: best = min(best, d[i + W - 1] + 4)
        d[i] = best
dist = [v / 3 if v < INF else 0 for v in d]
cost = [1 + 40 / (1 + dv) ** 1.5 if m else 220 - gv * 0.5 for m, dv, gv in zip(inside, dist, g)]

def to_up(p): return (int(round((p[0] - X0) * K - 0.5)), int(round((p[1] - Y0) * K - 0.5)))
def to_screen(p): return (X0 + (p[0] + 0.5) / K, Y0 + (p[1] + 0.5) / K)

def snap(p, r=6):
    cx, cy = to_up(p); best, bp = -1e9, (cx, cy)
    for y in range(cy - r, cy + r + 1):
        for x in range(cx - r, cx + r + 1):
            if 0 <= x < W and 0 <= y < H:
                s = dist[y * W + x] - 0.12 * math.hypot(x - cx, y - cy)
                if s > best: best, bp = s, (x, y)
    return bp

STEPS = [(1, 0, 1), (-1, 0, 1), (0, 1, 1), (0, -1, 1), (1, 1, 1.4142), (1, -1, 1.4142), (-1, 1, 1.4142), (-1, -1, 1.4142)]
def route(a, b, margin=32):
    x0, x1 = max(0, min(a[0], b[0]) - margin), min(W - 1, max(a[0], b[0]) + margin)
    y0, y1 = max(0, min(a[1], b[1]) - margin), min(H - 1, max(a[1], b[1]) + margin)
    best = {a: 0.0}; prev = {}; pq = [(0.0, a)]
    while pq:
        c, p = heapq.heappop(pq)
        if p == b: break
        if c > best.get(p, 1e18): continue
        px, py = p; cp = cost[py * W + px]
        for dx, dy, w in STEPS:
            nx, ny = px + dx, py + dy
            if x0 <= nx <= x1 and y0 <= ny <= y1:
                nc = c + w * (cp + cost[ny * W + nx]) / 2
                if nc < best.get((nx, ny), 1e18):
                    best[(nx, ny)] = nc; prev[(nx, ny)] = p; heapq.heappush(pq, (nc, (nx, ny)))
    path = [b]
    while path[-1] != a: path.append(prev[path[-1]])
    return path[::-1]

def smooth(pts, sigma):
    n = len(pts); r = int(3 * sigma); out = []
    ws = [math.exp(-(k * k) / (2 * sigma * sigma)) for k in range(-r, r + 1)]
    for i in range(n):
        if i == 0 or i == n - 1: out.append(pts[i]); continue
        rr = min(r, i, n - 1 - i)          # ventana simétrica: los extremos quedan fijos
        sx = sy = sw = 0
        for k in range(-rr, rr + 1):
            w = ws[k + r]; sx += pts[i + k][0] * w; sy += pts[i + k][1] * w; sw += w
        out.append((sx / sw, sy / sw))
    return out

def trace(waypoints):
    # Un tercer valor en el punto de paso lo marca como vértice: se suaviza cada tramo por separado y la punta no se redondea.
    snapped = [snap(p[:2]) for p in waypoints]
    pieces, path = [], [snapped[0]]
    for i, (a, b) in enumerate(zip(snapped, snapped[1:]), 1):
        path += route(a, b)[1:]
        if len(waypoints[i]) > 2 and i < len(snapped) - 1:
            pieces.append(path); path = [b]
    pieces.append(path)
    out = []
    for piece in pieces:
        pts = [to_screen(p) for p in smooth(piece, 3.0)]
        out += pts if not out else pts[1:]
    return out

if __name__ == '__main__':
    strokes = json.load(open(sys.argv[1]))
    traced = {name: trace(wp) for name, wp in strokes.items()}
    json.dump({k: [[round(x, 3), round(y, 3)] for x, y in v] for k, v in traced.items()}, open(sys.argv[2], 'w'))
    # Superposición ampliada para revisar el calco.
    Z = 6
    ov = ref.crop((X0, Y0, X1, Y1)).resize(((X1 - X0) * Z, (Y1 - Y0) * Z), Image.LANCZOS)
    dr = ImageDraw.Draw(ov)
    colors = [(0, 255, 255), (255, 255, 0), (0, 255, 0), (255, 128, 0), (80, 160, 255)]
    for idx, (name, pts) in enumerate(traced.items()):
        sc = [((x - X0) * Z, (y - Y0) * Z) for x, y in pts]
        dr.line(sc, fill=colors[idx % len(colors)], width=2)
        dr.text((sc[0][0] + 3, sc[0][1] - 12), name, fill=colors[idx % len(colors)])
    ov.save(sys.argv[3])
    print('ok', {k: len(v) for k, v in traced.items()})
