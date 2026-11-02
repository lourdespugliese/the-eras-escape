// Cartel del frontón: la firma "Taylor Swift Museum" calcada de la imagen aprobada. Tubo rosa casi blanco,
// halo magenta pegado al vidrio y luz rosa que tiñe la piedra alrededor de las letras.
// No depende de una fuente externa ni de una imagen de la fachada.
import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Centímetros desde el centro del cartel, con Y hacia abajo. Encajados en el tímpano que se ve desde la plaza:
// la cornisa tapa el plano del cartel por debajo de y = 10 y el borde inclinado limita la S y la f.
const STROKES = [
  // T: barra larga que sube hacia la derecha y asta casi recta.
  'M -506 -46 C -497 -51 -487 -55 -477 -58 C -410 -86 -339 -106 -268 -120 C -247 -124 -194 -135 -175 -127',
  'M -350 -54 C -356 -28 -353 58 -353 90',
  // aylor: un solo gesto; la y baja, cierra su bucle por la izquierda y sube a la l; la o remata con un rizo hacia la r.
  'M -287 21 C -287 16 -285 10 -286 5 C -293 -14 -333 19 -316 30 C -307 37 -298 26 -290 23 C -285 21 -277 24 -271 23 C -263 21 -257 15 -250 13 C -240 11 -242 21 -235 21 C -231 20 -215 9 -212 13 C -206 21 -212 34 -212 43 C -211 55 -211 70 -215 82 C -215 84 -217 86 -217 89 C -218 93 -217 100 -219 108 C -220 113 -224 119 -225 124 C -228 137 -239 155 -255 152 C -277 148 -264 102 -258 89 C -250 74 -239 57 -225 46 C -221 43 -217 42 -214 39 C -211 35 -212 29 -209 25 C -208 25 -185 18 -181 8 C -179 4 -184 -1 -185 -5 C -186 -9 -185 -14 -185 -18 C -185 -43 -179 -70 -165 -91 C -161 -98 -153 -110 -143 -110 C -128 -111 -132 -84 -133 -75 C -135 -52 -151 -22 -167 -5 C -170 -1 -176 2 -179 7 C -181 12 -177 17 -174 21 C -163 32 -141 34 -132 19 C -129 14 -134 9 -129 3 C -127 0 -124 -3 -121 -3 C -119 -4 -104 2 -103 4 C -97 15 -128 31 -132 13 C -133 8 -130 3 -127 -0 C -119 -7 -115 0 -107 1 C -94 3 -61 1 -55 -12 C -53 -15 -54 -19 -54 -22 C -54 -24 -55 -13 -49 -12 C -45 -12 -39 -13 -36 -11 C -27 -4 -45 20 -16 11',
  // S: gran curva abierta con rizo final hacia dentro.
  'M 183 -108 C 181 -114 180 -120 176 -126 C 146 -175 44 -160 21 -108 C -14 -31 117 -28 113 31 C 111 59 60 62 47 41 C 38 23 64 24 71 35',
  // w, i y f: la w entra en la i, que sube a la f; la f baja hasta su punta y vuelve en su barra inferior.
  'M 128 -19 C 140 10 155 -14 165 -15 C 174 -16 177 -2 186 -3 C 193 -4 194 -12 199 -15 C 204 -18 214 -17 219 -17 C 226 -17 230 -5 236 -2 C 246 3 258 3 269 3 C 276 3 291 2 296 -4 C 298 -7 299 -10 301 -12 C 305 -15 310 -16 313 -20 C 317 -24 318 -29 321 -33 C 323 -36 325 -38 327 -41 C 332 -51 344 -86 344 -97 C 344 -110 330 -106 324 -101 C 312 -92 303 -75 301 -60 C 299 -44 300 -28 300 -12 C 299 -8 297 -5 297 -1 C 298 20 301 42 303 63 C 303 70 302 77 304 84 C 298 80 291 76 287 71 C 284 68 281 64 279 60 C 275 56 270 49 273 43 C 276 37 285 37 291 36 C 308 34 325 32 341 31 C 347 31 354 32 359 30',
  // Remate superior de la i y su punto.
  'M 222 -17 C 223 -22 225 -27 228 -32',
  'M 245 -91 C 246 -95 246 -98 247 -101',
  // Barra larga que cruza la f y la t, y asta de la t.
  'M 257 -46 C 290 -37 324 -37 357 -34 C 361 -34 364 -36 368 -35 C 394 -34 420 -32 446 -30 C 468 -28 493 -29 514 -21',
  'M 374 -71 C 372 -68 360 -33 359 -30 C 358 -22 357 -9 358 -0 C 363 19 389 24 404 12',
  // Museum: M de dos picos y "useum" de un trazo con remate largo.
  'M -172 145 C -164 127 -155 108 -146 90 C -144 86 -141 84 -140 80 C -138 77 -139 73 -139 69 C -139 66 -139 71 -139 72 C -139 76 -139 80 -137 83 C -133 90 -131 126 -122 124 C -116 123 -110 110 -107 105 C -102 96 -99 85 -94 76 C -91 72 -87 69 -85 65 C -82 58 -82 50 -79 43 C -79 41 -82 50 -83 53 C -85 60 -85 67 -82 75 C -75 95 -80 134 -66 156',
  'M -46 115 C -53 138 -21 134 -19 120 C -17 140 13 132 22 121 C 27 115 23 108 26 101 C 26 101 23 109 26 113 C 31 120 49 128 39 139 C 36 143 32 143 27 143 C 54 148 36 103 21 124 C 19 127 24 115 32 119 C 44 125 41 139 61 131 C 72 126 61 104 80 105 C 83 105 86 106 87 109 C 92 122 64 123 73 131 C 81 139 108 134 115 126 C 118 124 118 121 118 117 C 119 144 143 135 147 121 C 147 122 146 127 150 130 C 159 136 187 131 189 119 C 189 121 192 126 193 129 C 197 125 207 119 214 121 C 218 122 220 127 225 127 C 232 127 239 121 247 123 C 255 126 258 135 268 137 C 285 139 303 129 319 123',
];

const CM = 0.01, CENTER_Y = 11.65, PLANE_Z = 28.84, TUBE = 0.07;
// Gas encendido: el centro del tubo se ve casi blanco y los bordes, rosa saturado (valores lineales, antes del tone mapping).
const CORE_COLOR = new THREE.Color(2.9, 0.62, 3.2), EDGE_COLOR = new THREE.Color(1.75, 0.06, 0.6);
// Ribete en el aire: magenta fino pegado al vidrio, con más azul y menos verde que la piedra (sigmas en cm).
const HALO_COLOR = new THREE.Color(0.5, 0, 0.32);
const HALO = { halfWidth: 590, halfHeight: 232, px: 1.6, tight: 4, wide: 14 };
// Luz sobre la piedra (unidades del mundo, x relativa al centro): R = luz rosa, G = cuánto se apaga el baño cálido.
// El rosa es parejo en el centro del tímpano; pegado a cada trazo la piedra se oscurece y el ribete magenta manda.
const GLOW = { halfWidth: 11, bottom: 8.6, top: 14.6, px: 40 };
// La caliza es amarillenta: la luz lleva mucho azul para que la piedra se vea rosa y no naranja.
const GLOW_COLOR = new THREE.Color(11, 0.3, 7);

const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// Función de error: el eje de un trazo recto de ancho w desenfocado con sigma s vale erf(w / (2√2·s)); normaliza cada capa a 1.
const erf = (x) => { const t = 1 / (1 + 0.3275911 * x); return 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-x * x); };

// Solo la sombra desenfocada de los trazos (el trazo nítido queda fuera del lienzo). Devuelve el gris normalizado (0..1).
function blurredStrokes(canvas, pxPerCm, originX, originY, width, sigma) {
  const g = canvas.getContext('2d', { willReadFrequently: true }), off = canvas.width * 4;
  g.setTransform(1, 0, 0, 1, 0, 0); g.shadowColor = 'transparent';
  g.fillStyle = '#000'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.setTransform(pxPerCm, 0, 0, pxPerCm, originX - off, originY);
  g.shadowColor = '#fff'; g.shadowBlur = 2 * sigma * pxPerCm; g.shadowOffsetX = off;
  g.lineWidth = width; g.lineCap = g.lineJoin = 'round'; g.strokeStyle = '#fff';
  for (const d of STROKES) g.stroke(new Path2D(d));
  const data = g.getImageData(0, 0, canvas.width, canvas.height).data, peak = erf(width / (2 * Math.SQRT2 * sigma)) * 255;
  const out = new Float32Array(canvas.width * canvas.height);
  for (let i = 0; i < out.length; i++) out[i] = Math.min(1, data[i * 4] / peak);
  return out;
}

function haloTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(2 * HALO.halfWidth * HALO.px); canvas.height = Math.round(2 * HALO.halfHeight * HALO.px);
  const cx = canvas.width / 2, cy = canvas.height / 2;
  const tight = blurredStrokes(canvas, HALO.px, cx, cy, 12, HALO.tight);
  const wide = blurredStrokes(canvas, HALO.px, cx, cy, 12, HALO.wide);
  const g = canvas.getContext('2d'), image = g.createImageData(canvas.width, canvas.height);
  for (let i = 0; i < tight.length; i++) {
    const v = Math.min(1, 0.7 * tight[i] + 0.3 * wide[i]) * 255;
    image.data[i * 4] = image.data[i * 4 + 1] = image.data[i * 4 + 2] = v; image.data[i * 4 + 3] = 255;
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  return texture;
}

// Baño rosa: una base amplia sobre el centro del tímpano (como en la referencia) más la luz que nace de los trazos.
function glowTexture() {
  const canvas = document.createElement('canvas'), pxPerCm = GLOW.px * CM;
  canvas.width = Math.round(2 * GLOW.halfWidth * GLOW.px); canvas.height = Math.round((GLOW.top - GLOW.bottom) * GLOW.px);
  const originY = (GLOW.top - CENTER_Y) * GLOW.px;
  const near = blurredStrokes(canvas, pxPerCm, canvas.width / 2, originY, 14, 10);
  const mid = blurredStrokes(canvas, pxPerCm, canvas.width / 2, originY, 14, 30);
  const broad = blurredStrokes(canvas, pxPerCm, canvas.width / 2, originY, 12, 120);
  const g = canvas.getContext('2d'), image = g.createImageData(canvas.width, canvas.height);
  for (let row = 0; row < canvas.height; row++) for (let col = 0; col < canvas.width; col++) {
    const i = row * canvas.width + col;
    const x = Math.abs((col + 0.5) / GLOW.px - GLOW.halfWidth), y = GLOW.top - (row + 0.5) / GLOW.px;
    // Arriba el rosa llega más lejos (sigue la cornisa inclinada) y la cornisa horizontal recibe más; allí queda algo de luz cálida.
    const reach = 4.6 + 2.4 * smooth(11.2, 12.6, y), low = 0.72 + 0.28 * smooth(9.6, 10.9, y), sill = 1 - smooth(9.75, 10.5, y);
    const band = smooth(8.95, 9.4, y) * (1 - smooth(13.75, 14.35, y)), edge = smooth(8.85, 9.25, y) * (1 - smooth(14, 14.5, y));
    // El borde del lienzo queda en cero: la textura se estira más allá y no debe teñir el resto de la fachada.
    const light = band * (1 - smooth(10, 10.8, x)) * Math.min(1, (0.68 + 0.08 * sill) * (1 - smooth(reach, reach + 4.4, x)) + 0.15 * broad[i]) * (1 - 0.3 * near[i]);
    const warmth = 0.86 * low * (1 - smooth(5, 9.2, x));
    const dim = edge * (warmth + (1 - warmth) * 0.7 * mid[i]);
    image.data[i * 4] = light * 255; image.data[i * 4 + 1] = dim * 255; image.data[i * 4 + 3] = 255;
  }
  g.setTransform(1, 0, 0, 1, 0, 0); g.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter;
  return texture;
}

// La piedra caliza recibe la luz del cartel en su shader: se proyecta en z sobre la fachada (frontón y cornisas).
function lightStone(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    for (const key of ['neonGlowMap', 'neonGlowRect', 'neonGlowColor', 'neonWarmDim']) shader.uniforms[key] = uniforms[key];
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNeonWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNeonWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vNeonWorld;
uniform sampler2D neonGlowMap; uniform vec4 neonGlowRect; uniform vec3 neonGlowColor; uniform float neonWarmDim;`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
{
  vec3 neonNormal = inverseTransformDirection(normal, viewMatrix);
  // Lo que mira hacia abajo por debajo del cartel (el sofito de la cornisa horizontal) no ve las letras.
  float hidden = max(-neonNormal.y, 0.0) * (1.0 - smoothstep(9.9, 10.6, vNeonWorld.y));
  vec2 neon = texture2D(neonGlowMap, (vNeonWorld.xy - neonGlowRect.xy) * neonGlowRect.zw).rg * smoothstep(${(PLANE_Z - 1.4).toFixed(2)}, ${(PLANE_Z - 0.6).toFixed(2)}, vNeonWorld.z) * (1.0 - hidden);
  // Las cornisas, que vuelan por delante del tímpano, reciben algo más (como en la referencia).
  float facing = (0.45 + 0.55 * max(neonNormal.z, 0.0)) * (1.0 + 0.35 * smoothstep(${(PLANE_Z + 0.06).toFixed(2)}, ${(PLANE_Z + 0.36).toFixed(2)}, vNeonWorld.z));
  reflectedLight.directDiffuse = reflectedLight.directDiffuse * (1.0 - neonWarmDim * neon.g) + neonGlowColor * (neon.r * facing) * BRDF_Lambert(material.diffuseColor);
  reflectedLight.directSpecular *= 1.0 - neonWarmDim * neon.g;
  reflectedLight.indirectDiffuse *= 1.0 - 0.8 * neonWarmDim * neon.g;
}`);
  };
  material.customProgramCacheKey = () => 'museum-neon-stone';
}

// Tubo: el blanco del gas manda donde el vidrio mira a la cámara y el rosa en los bordes.
function tubeMaterial(uniforms) {
  const material = new THREE.MeshBasicMaterial({ toneMapped: false });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.neonCore = uniforms.neonCore; shader.uniforms.neonEdge = uniforms.neonEdge;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNeonNormal; varying vec3 vNeonView;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvNeonNormal = normalMatrix * normal; vNeonView = -mvPosition.xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vNeonNormal; varying vec3 vNeonView; uniform vec3 neonCore; uniform vec3 neonEdge;')
      .replace('#include <color_fragment>', `#include <color_fragment>
diffuseColor.rgb = mix(neonEdge, neonCore, smoothstep(0.25, 0.95, abs(dot(normalize(vNeonNormal), normalize(vNeonView)))));`);
  };
  material.customProgramCacheKey = () => 'museum-neon-tube';
  return material;
}

export function buildMuseumNeon(root, centerX) {
  const group = new THREE.Group();
  group.name = 'museum-pink-neon';
  group.userData.text = 'Taylor Swift Museum';
  group.position.set(centerX, CENTER_Y, PLANE_Z); root.add(group);

  // Se fusionan todos los tubos: una sola llamada de dibujo para la firma completa.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg">${STROKES.map(d => `<path fill="none" stroke="white" d="${d}"/>`).join('')}</svg>`;
  const parts = [];
  for (const path of new SVGLoader().parse(svg).paths) for (const subPath of path.subPaths) {
    const segments = Math.max(8, Math.ceil(subPath.getLength() / 4));
    const points = subPath.getSpacedPoints(segments).map(p => new THREE.Vector3(p.x * CM, -p.y * CM, 0));
    parts.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, TUBE, 8, false));
  }
  const uniforms = {
    neonCore: { value: CORE_COLOR.clone() }, neonEdge: { value: EDGE_COLOR.clone() },
    neonGlowMap: { value: glowTexture() },
    neonGlowRect: { value: new THREE.Vector4(centerX - GLOW.halfWidth, GLOW.bottom, 1 / (2 * GLOW.halfWidth), 1 / (GLOW.top - GLOW.bottom)) },
    neonGlowColor: { value: new THREE.Color(0, 0, 0) },
    neonWarmDim: { value: 0 },
  };
  const tubes = new THREE.Mesh(mergeGeometries(parts), tubeMaterial(uniforms));
  parts.forEach(part => part.dispose());
  tubes.name = 'museum-neon-tubes'; group.add(tubes);

  const halo = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALO.halfWidth * CM, 2 * HALO.halfHeight * CM), new THREE.MeshBasicMaterial({
    map: haloTexture(), color: HALO_COLOR, transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
  }));
  halo.position.z = -0.03;
  halo.name = 'museum-neon-halo'; group.add(halo);

  // Toda la caliza ya construida (frontón, cornisas y sus copias más claras u oscuras) recibe la luz del cartel.
  const stones = new Set();
  root.traverse(o => { if (o.isMesh && o.material.userData?.surfaceKind === 'limestone') stones.add(o.material); });
  stones.forEach(material => lightStone(material, uniforms));

  return {
    group, uniforms,
    update(outside) {
      uniforms.neonGlowColor.value.copy(GLOW_COLOR).multiplyScalar(outside);
      uniforms.neonWarmDim.value = outside;
    },
  };
}
