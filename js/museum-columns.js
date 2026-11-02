// Columnas corintias del pórtico: basa ática, fuste estriado con éntasis y capitel de acanto con volutas.
// La geometría se construye una vez y todas las columnas la comparten (un solo material, una malla por columna).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Alturas (y = 0 es el suelo del pórtico; el arquitrabe empieza en 8.6)
const PLINTH = 0.3, SHAFT0 = 0.72, SHAFT1 = 7.08, BELL0 = 7.12, BELL1 = 8.34, TOP = 8.6;
const R_BOT = 0.6, R_TOP = 0.51, FLUTES = 24;
const TAU = Math.PI * 2;
let shared = null;

// Radio de la campana del capitel a la altura y.
const bellR = (y) => 0.5 + 0.16 * Math.pow(THREE.MathUtils.clamp((y - BELL0) / (BELL1 - BELL0), 0, 1), 1.6);

function arc(points, cx, cy, r, a0, a1, steps = 8) {
  for (let i = 0; i <= steps; i++) { const a = a0 + (a1 - a0) * i / steps; points.push(new THREE.Vector2(cx + r * Math.cos(a), cy + r * Math.sin(a))); }
}

// Basa ática: toro inferior, escocia y toro superior.
function baseGeometry() {
  const p = [];
  arc(p, 0.71, PLINTH + 0.1, 0.1, -Math.PI / 2, Math.PI / 2, 10);
  p.push(new THREE.Vector2(0.68, 0.51));
  arc(p, 0.68, 0.555, 0.045, -Math.PI / 2, -Math.PI * 1.5, 8);
  arc(p, 0.64, 0.645, 0.045, -Math.PI / 2, Math.PI / 2, 8);
  p.push(new THREE.Vector2(0.605, 0.69), new THREE.Vector2(R_BOT, SHAFT0));
  return new THREE.LatheGeometry(p, 64);
}

// Fuste con 24 estrías cóncavas separadas por filetes; las estrías se cierran cerca de los extremos.
function shaftGeometry() {
  const h = SHAFT1 - SHAFT0;
  const geo = new THREE.CylinderGeometry(R_TOP, R_BOT, h, FLUTES * 6, 40, true);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let t = p.getY(i) / h + 0.5;
    t -= Math.sin(TAU * t) / TAU * 0.8;                       // más filas junto a los extremos, donde terminan las estrías
    const taper = Math.pow(Math.max(0, (t - 0.33) / 0.67), 1.4);
    const r = R_BOT - (R_BOT - R_TOP) * taper;               // éntasis: recto el primer tercio, luego se adelgaza
    const ang = Math.atan2(p.getX(i), p.getZ(i));
    const phase = ((ang / (TAU / FLUTES)) % 1 + 1) % 1;
    const g = (phase - 0.12) / 0.76;
    const groove = g > 0 && g < 1 ? Math.sqrt(1 - (2 * g - 1) ** 2) : 0;
    const fade = THREE.MathUtils.smoothstep(t, 0.015, 0.05) * (1 - THREE.MathUtils.smoothstep(t, 0.95, 0.985));
    const rr = r - 0.05 * (r / R_BOT) * groove * fade;
    p.setXYZ(i, Math.sin(ang) * rr, SHAFT0 + t * h, Math.cos(ang) * rr);
  }
  geo.computeVertexNormals();
  return geo;
}

function bellGeometry() {
  const p = [];
  for (let i = 0; i <= 16; i++) { const y = BELL0 + (BELL1 - 0.02 - BELL0) * i / 16; p.push(new THREE.Vector2(bellR(y), y)); }
  p.push(new THREE.Vector2(0.7, BELL1 - 0.02), new THREE.Vector2(0.7, BELL1));
  return new THREE.LatheGeometry(p, 48);
}

// Ábaco de lados cóncavos con las esquinas achaflanadas.
function abacusGeometry(H, sag, chamfer, y0, depth) {
  const s = new THREE.Shape(), c = chamfer, k = H - 2 * sag;
  s.moveTo(-H + c, -H); s.quadraticCurveTo(0, -k, H - c, -H);
  s.lineTo(H, -H + c); s.quadraticCurveTo(k, 0, H, H - c);
  s.lineTo(H - c, H); s.quadraticCurveTo(0, k, -H + c, H);
  s.lineTo(-H, H - c); s.quadraticCurveTo(-k, 0, -H, -H + c);
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 14 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, y0, 0);
  return geo;
}

// Hoja de acanto: lámina lobulada que sube pegada a la campana y se curva hacia fuera en la punta.
function leafGeometry(L, W, curl, wrapR) {
  const nu = 10, nv = 30, ls = L * 0.62, R = (L - ls) / curl;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv, s = v * L;
    let py = s, pz = 0, ny = 0, nz = 1;
    if (s > ls) { const f = (s - ls) / R; py = ls + R * Math.sin(f); pz = R * (1 - Math.cos(f)); ny = -Math.sin(f); nz = Math.cos(f); }
    const lobes = 1 - 0.28 * Math.abs(Math.sin(v * Math.PI * 5)) ** 2;
    const hw = W / 2 * (0.35 + 0.65 * Math.sin(Math.PI * v) ** 0.6) * (1 - v ** 3) * lobes;
    const wrap = 1 - THREE.MathUtils.smoothstep(v, ls / L, 1);
    for (let i = 0; i <= nu; i++) {
      const u = i / nu * 2 - 1, x = u * hw, au = Math.abs(u);
      const off = W * 0.07 * (1 - au) ** 3                   // nervio central
        + W * 0.12 * u * u * (0.3 + v)                       // bordes ahuecados hacia delante
        + W * 0.025 * Math.sin(au * Math.PI * 2) * (1 - v)   // ondulación de los lóbulos
        - x * x / (2 * wrapR) * wrap;                        // se ciñe a la campana
      pos.push(x, py + ny * off, pz + nz * off); uv.push(i / nu, v);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

// Voluta: tallo que sale entre las hojas y se enrolla en espiral (coordenadas de cara: a = a lo largo, n = hacia fuera).
function voluteGeometry(stalk, cx, cy, r0, r1, a0, turns, dir, n0, n1, tube, side) {
  const pts = stalk.map(([a, y, n]) => new THREE.Vector3(a * side, y, n));
  const steps = 36;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = a0 + dir * t * turns * TAU, r = THREE.MathUtils.lerp(r0, r1, t);
    pts.push(new THREE.Vector3((cx + r * Math.cos(a)) * side, cy + r * Math.sin(a), THREE.MathUtils.lerp(n0, n1, t)));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 72, tube, 6, false);
}

function rosetteGeometry(n, y) {
  const parts = [new THREE.SphereGeometry(0.045, 10, 8)];
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, petal = new THREE.SphereGeometry(0.04, 8, 6);
    petal.scale(1, 0.55, 0.45); petal.rotateZ(a); petal.translate(Math.cos(a) * 0.06, Math.sin(a) * 0.06, -0.01);
    parts.push(petal);
  }
  const geo = mergeGeometries(parts.map(clean)); geo.translate(0, y, n);
  return geo;
}

// Todas las piezas sin índice y con los mismos atributos para poder unirlas.
function clean(geo) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
  return g;
}

function capitalParts() {
  const parts = [bellGeometry()];
  const astragal = new THREE.TorusGeometry(0.535, 0.045, 10, 64); astragal.rotateX(Math.PI / 2); astragal.translate(0, SHAFT1 + 0.02, 0);
  parts.push(astragal);
  // Dos coronas de ocho hojas: la baja en los ejes y diagonales, la alta intercalada detrás.
  for (let k = 0; k < 8; k++) {
    const upper = leafGeometry(1.0, 0.42, 2.0, 0.55);
    upper.rotateX(0.15); upper.translate(0, BELL0 + 0.04, bellR(BELL0) + 0.02); upper.rotateY((k + 0.5) * TAU / 8);
    const lower = leafGeometry(0.66, 0.44, 2.3, 0.6);
    lower.rotateX(0.17); lower.translate(0, BELL0 + 0.02, bellR(BELL0) + 0.07); lower.rotateY(k * TAU / 8);
    parts.push(upper, lower);
  }
  // Por cara: dos volutas que se unen bajo las esquinas del ábaco, dos hélices interiores y el florón.
  for (let f = 0; f < 4; f++) {
    for (const side of [-1, 1]) {
      const corner = voluteGeometry([[0.16, 7.8, bellR(7.8) + 0.02], [0.3, 8.0, bellR(8.0) + 0.05], [0.5, 8.18, 0.74]],
        0.8, 8.11, 0.17, 0.04, 2.3, 1.5, -1, 0.76, 0.84, 0.048, side);
      const inner = voluteGeometry([[0.3, 7.86, bellR(7.86) + 0.03], [0.25, 8.05, 0.66]],
        0.12, 8.18, 0.09, 0.028, 0, 1.3, 1, 0.67, 0.71, 0.032, side);
      corner.rotateY(f * TAU / 4); inner.rotateY(f * TAU / 4);
      parts.push(corner, inner);
    }
    const rose = rosetteGeometry(0.86, BELL1 + 0.1); rose.rotateY(f * TAU / 4); parts.push(rose);
  }
  parts.push(abacusGeometry(0.98, 0.13, 0.08, BELL1, 0.16), abacusGeometry(1.01, 0.13, 0.07, BELL1 + 0.16, TOP - BELL1 - 0.16));
  return parts;
}

function columnGeometry() {
  const plinth = new THREE.BoxGeometry(1.62, PLINTH, 1.62); plinth.translate(0, PLINTH / 2, 0);
  const geo = mergeGeometries([plinth, baseGeometry(), shaftGeometry(), ...capitalParts()].map(clean));
  // UV cilíndricas: una vuelta y toda la altura, igual que el cilindro liso al que sustituye.
  const p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, Math.atan2(p.getX(i), p.getZ(i)) / TAU + 0.5, p.getY(i) / TOP);
  geo.computeBoundingSphere();
  return geo;
}

export function buildCorinthianColumns(root, xs, z, material) {
  shared ??= columnGeometry();
  return xs.map((x) => {
    const col = new THREE.Mesh(shared, material);
    col.name = 'corinthian-column'; col.position.set(x, 0, z); root.add(col);
    return col;
  });
}
