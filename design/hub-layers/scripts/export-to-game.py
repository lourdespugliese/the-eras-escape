"""Exporta las capas de design/hub-layers al juego.

Uso (desde la raíz del proyecto):  python design/hub-layers/scripts/export-to-game.py

- Recorta cada PNG a su caja de contenido (el alfa) y lo guarda en assets/ui/hub/.
- El papel de fondo se guarda como JPG (no tiene transparencia útil y pesa 10x menos).
- Los SVG se recortan cambiando su viewBox a la misma caja, así se colocan igual que los PNG.
- Escribe js/hub-layout.js con la posición, el tamaño y el orden de cada capa (lo usa js/hub.js).
No usa las capas de texto del botón ni del progreso: esas se dibujan con HTML para poder cambiarlas.
"""
import json, re, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
SRC = ROOT / 'design' / 'hub-layers'
OUT = ROOT / 'assets' / 'ui' / 'hub'
OUT.mkdir(parents=True, exist_ok=True)
PAD = 4

EXPORT = {  # id del manifiesto -> PNG de exports/png (mismo orden que el kit)
 'paper': '01-paper', 'decor-tl': '02-decor-tl', 'decor-tr': '03-decor-tr', 'decor-bl': '04-decor-bl', 'decor-br': '05-decor-br',
 'confetti': '06-confetti', 'bracelet': '07-bracelet', 'envelope': '08-envelope',
 '1989': '09-1989', 'fearless': '10-fearless', 'forest': '11-forest', 'lover': '12-lover', 'midnights': '13-midnights', 'reputation': '14-reputation',
 'label-1989': '15-label-1989', 'label-fearless': '16-label-fearless', 'label-folklore': '17-label-folklore',
 'label-lover': '18-label-lover', 'label-midnights': '19-label-midnights', 'label-reputation': '20-label-reputation',
 'lock-1989': '21-lock-1989', 'lock-folklore': '22-lock-folklore', 'lock-lover': '23-lock-lover',
 'lock-midnights': '24-lock-midnights', 'lock-reputation': '25-lock-reputation',
 'ui-title': '26-ui-title', 'ui-subtitle': '27-ui-subtitle', 'ui-button-bg': '28-ui-button-bg', 'rose': '29-rose',
 'ui-keyboard': '32-ui-keyboard', 'ui-sound': '33-ui-sound', 'ui-music': '34-ui-music',
}
manifest = {l['id']: l for l in json.load(open(SRC / 'manifest.json', encoding='utf-8'))['layers']}
W, H = 1672, 941
layout = []
for lid, exp in EXPORT.items():
    m = manifest[lid]
    im = Image.open(SRC / 'exports' / 'png' / f'{exp}.png').convert('RGBA')
    if lid == 'paper':
        im.convert('RGB').save(OUT / 'paper.jpg', quality=88, optimize=True)
        layout.append(dict(id=lid, src='paper.jpg', x=0, y=0, w=W, h=H, z=m['z'])); continue
    x0, y0, x1, y1 = im.getchannel('A').getbbox()
    x0, y0, x1, y1 = max(0, x0 - PAD), max(0, y0 - PAD), min(W, x1 + PAD), min(H, y1 + PAD)
    if m['type'] == 'svg':
        svg = (SRC / m['file']).read_text(encoding='utf-8')
        svg = re.sub(r'<svg ([^>]*?)width="\d+" height="\d+" viewBox="[^"]*"',
                     lambda g: f'<svg {g.group(1)}width="{x1 - x0}" height="{y1 - y0}" viewBox="{x0} {y0} {x1 - x0} {y1 - y0}"', svg, count=1)
        (OUT / f'{lid}.svg').write_text(svg, encoding='utf-8'); src = f'{lid}.svg'
    else:
        im.crop((x0, y0, x1, y1)).save(OUT / f'{lid}.png', optimize=True); src = f'{lid}.png'
    layout.append(dict(id=lid, src=src, x=x0, y=y0, w=x1 - x0, h=y1 - y0, z=m['z'],
                       pivot=m['pivot'] if m.get('animation') == 'swing' else None))

js = ('// hub-layout.js — GENERADO por design/hub-layers/scripts/export-to-game.py (no editar a mano).\n'
      '// Capas de la pantalla de inicio: posición y tamaño en el lienzo de 1672 x 941; pivot = punto de balanceo normalizado (0..1).\n'
      f'export const HUB_SIZE = {{ w: {W}, h: {H} }};\n'
      'export const HUB_LAYERS = ' + json.dumps(layout, ensure_ascii=False, indent=1) + ';\n')
(ROOT / 'js' / 'hub-layout.js').write_text(js, encoding='utf-8')
print(len(layout), 'capas ->', OUT)
