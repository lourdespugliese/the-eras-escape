// Materiales del museo: mapas en espacio lineal y escala física, sin cambiar las mallas.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const SIZE = 512;
const cache = new Map();
const pending = [];
export function clearMuseumMaterialCache() { cache.clear(); pending.length = 0; }
function canvas() { const c = document.createElement('canvas'); c.width = c.height = SIZE; return c; }
function texture(c, color = false) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}
// Ruido determinista; el ruido interpolado envuelve sus celdas para repetir sin costuras.
function grain(x, y) {
  let n = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1;
}
function noise(x, y, cells = 8) {
  const px = x / SIZE * cells, py = y / SIZE * cells;
  const ix = Math.floor(px), iy = Math.floor(py);
  const fx = px - ix, fy = py - iy;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const at = (a, b) => grain((a + cells) % cells, (b + cells) % cells);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(at(ix, iy), at(ix + 1, iy), u),
    THREE.MathUtils.lerp(at(ix, iy + 1), at(ix + 1, iy + 1), u), v);
}
// Perlin de gradientes: el ruido de valor formaba charcos de bloques idénticos en cada losa.
const GRADIENTS = [[1, 0], [0.7071, 0.7071], [0, 1], [-0.7071, 0.7071], [-1, 0], [-0.7071, -0.7071], [0, -1], [0.7071, -0.7071]];
function lattice(a, b, seed) {
  let n = Math.imul(a, 374761393) ^ Math.imul(b, 668265263) ^ Math.imul(seed, 2246822519);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return (n ^ (n >>> 16)) >>> 0;
}
function gradientDot(ix, iy, fx, fy, seed) {
  const g = GRADIENTS[lattice(ix, iy, seed) & 7];
  return g[0] * fx + g[1] * fy;
}
const wrapCell = (i, period) => period ? ((i % period) + period) % period : i;
// Coordenadas en celdas de la rejilla; cada semilla da un campo distinto. Con period > 0 el campo repite sin costuras.
function perlin(x, y, seed, period = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const x0 = wrapCell(ix, period), x1 = wrapCell(ix + 1, period), y0 = wrapCell(iy, period), y1 = wrapCell(iy + 1, period);
  const u = fx * fx * fx * (fx * (fx * 6 - 15) + 10), v = fy * fy * fy * (fy * (fy * 6 - 15) + 10);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(gradientDot(x0, y0, fx, fy, seed), gradientDot(x1, y0, fx - 1, fy, seed), u),
    THREE.MathUtils.lerp(gradientDot(x0, y1, fx, fy - 1, seed), gradientDot(x1, y1, fx - 1, fy - 1, seed), u), v);
}
// Charcos: losas de 256×128 px con juntas desplazadas por fila. Cada losa tiene su propio campo Perlin
// deformado y una humedad base, así que no se repiten iguales. Todo se calcula al hornear la textura.
function puddle(x, y, cloud) {
  const row = Math.floor(y / 128), shifted = x + (row % 2) * 128;
  const slab = row * 2 + Math.floor((shifted % 512) / 256), seed = slab * 4;
  const px = (shifted % 256) / 112, py = (y % 128) / 112;
  const wx = px + perlin(px, py, seed) * 0.6, wy = py + perlin(px + 5.2, py + 1.3, seed + 1) * 0.6;
  const field = perlin(wx, wy, seed + 2) * 0.62 + perlin(wx * 2, wy * 2, seed + 2) * 0.3 + perlin(wx * 4, wy * 4, seed + 2) * 0.15;
  const bias = (lattice(slab, 0, 7) / 4294967296 - 0.5) * 0.3;
  return THREE.MathUtils.smoothstep(field + cloud * 0.2 + bias, -0.2, 0.22);
}
// Máscara macro en espacio mundo: rompe la repetición de las losas. Su periodo (48 m) supera la plaza (38×33 m),
// así que no se repite a la vista. Se hornea una vez, como el resto de texturas.
const MACRO_METERS = 48, MACRO_SIZE = 256;
let macroTexture = null;
function puddleMacroTexture() {
  if (macroTexture) return macroTexture;
  const data = new Uint8Array(MACRO_SIZE * MACRO_SIZE * 4);
  for (let y = 0; y < MACRO_SIZE; y++) for (let x = 0; x < MACRO_SIZE; x++) {
    const u = x / MACRO_SIZE * 8, v = y / MACRO_SIZE * 8;
    const field = perlin(u, v, 91, 8) * 0.65 + perlin(u * 2, v * 2, 92, 16) * 0.35;
    const wet = THREE.MathUtils.smoothstep(field, -0.1, 0.1) * 255, p = (y * MACRO_SIZE + x) * 4;
    data[p] = data[p + 1] = data[p + 2] = wet; data[p + 3] = 255;
  }
  macroTexture = new THREE.DataTexture(data, MACRO_SIZE, MACRO_SIZE);
  macroTexture.wrapS = macroTexture.wrapT = THREE.RepeatWrapping;
  macroTexture.magFilter = macroTexture.minFilter = THREE.LinearFilter;
  macroTexture.needsUpdate = true;
  return macroTexture;
}
// Escala de rugosidad: en zonas húmedas el charco se intensifica, en secas se apaga. Coste: una lectura de textura.
const PUDDLE_GLSL = `
float puddleRoughnessScale(vec2 world, sampler2D macroMap, float strength) {
  float wet = texture2D(macroMap, world / ${MACRO_METERS.toFixed(1)}).r;
  return mix(1.0, mix(1.5, 0.75, wet), strength);
}`;
// El pavimento recibe la máscara en su shader (también sus clones). Usa el mismo nombre de programa para compartir compilación.
function attachPuddleMacro(material) {
  const macroMap = puddleMacroTexture();
  material.onBeforeCompile = (shader) => {
    shader.uniforms.puddleMacroMap = { value: macroMap };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vPuddleWorld;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPuddleWorld = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vPuddleWorld;\nuniform sampler2D puddleMacroMap;${PUDDLE_GLSL}`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = min(roughnessFactor * puddleRoughnessScale(vPuddleWorld, puddleMacroMap, 1.0), 1.0);');
  };
  material.customProgramCacheKey = () => 'puddle-macro';
}
function writeNormals(heightData, target) {
  const g = target.getContext('2d'), data = g.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const p = (y * SIZE + x) * 4;
    const dx = heightData[y * SIZE + (x + 1) % SIZE] - heightData[y * SIZE + (x + SIZE - 1) % SIZE];
    const dy = heightData[((y + 1) % SIZE) * SIZE + x] - heightData[((y + SIZE - 1) % SIZE) * SIZE + x];
    const length = Math.hypot(dx * 4, dy * 4, 1);
    data.data[p] = (-dx * 4 / length * 0.5 + 0.5) * 255;
    data.data[p + 1] = (dy * 4 / length * 0.5 + 0.5) * 255;
    data.data[p + 2] = (1 / length * 0.5 + 0.5) * 255; data.data[p + 3] = 255;
  }
  g.putImageData(data, 0, 0);
}
function maps(kind) {
  const base = canvas(), height = canvas(), normal = canvas(), rough = canvas();
  const b = base.getContext('2d'), h = height.getContext('2d');
  b.fillStyle = kind === 'dark-marble' || kind === 'paving' ? '#25251f' : '#d6c5a4'; b.fillRect(0, 0, SIZE, SIZE);
  const hd = h.createImageData(SIZE, SIZE), rd = h.createImageData(SIZE, SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const n = grain(x, y), p = y * SIZE + x;
    const cloud = noise(x, y, 8) * 0.65 + noise(x, y, 32) * 0.35;
    let v = 0.5 + n * 0.025 + cloud * 0.12;
    if (kind === 'checker' && (x % 128 < 1 || y % 128 < 1)) v = 0.24;
    if (kind === 'paving') {
      const row = Math.floor(y / 128), seamX = (x + (row % 2) * 128) % 256;
      const edge = Math.min(seamX, 256 - seamX, y % 128, 128 - y % 128);
      v = edge < 3 ? 0.12 : 0.52 + n * 0.025 + cloud * 0.18;
    }
    if (kind === 'wood') v = 0.5 + Math.sin(x * 0.15 + Math.sin(y * Math.PI * 2 / SIZE) * 3) * 0.14 + n * 0.04;
    heights[p] = v;
    const wet = kind === 'paving' ? puddle(x, y, cloud) : 0;
    const r = kind === 'paving' ? 170 - wet * 144 + n * 5 : kind.includes('marble') || kind === 'checker' ? 68 + cloud * 22 + n * 4 : 175 + cloud * 25 + n * 8;
    for (let k = 0; k < 3; k++) { hd.data[p * 4 + k] = v * 255; rd.data[p * 4 + k] = r; }
    hd.data[p * 4 + 3] = rd.data[p * 4 + 3] = 255;
  }
  h.putImageData(hd, 0, 0); rough.getContext('2d').putImageData(rd, 0, 0);
  writeNormals(heights, normal);
  if (kind === 'wood' || kind === 'plaster' || kind === 'paving') {
    const bd = b.getImageData(0, 0, SIZE, SIZE);
    for (let p = 0; p < heights.length; p++) {
      const n = (heights[p] - 0.5) * (kind === 'wood' ? 90 : 60);
      const c = kind === 'wood' ? [53, 33, 20] : kind === 'paving' ? [55, 53, 46] : [208, 191, 162];
      for (let k = 0; k < 3; k++) bd.data[p * 4 + k] = c[k] + n;
    }
    b.putImageData(bd, 0, 0);
  }
  const result = { map: texture(base, true), normalMap: texture(normal), bumpMap: texture(height), roughnessMap: texture(rough) };
  const source = { paving: 'weathered-paving', plaster: 'warm-plaster', wood: 'walnut' }[kind] || kind;
  if (['limestone', 'ivory-marble', 'dark-marble', 'paving', 'plaster', 'wood'].includes(kind)) {
    pending.push(new Promise(resolve => new THREE.TextureLoader().load(`assets/textures/museum/${source}.webp`, t => {
      b.drawImage(t.image, 0, 0, SIZE, SIZE); result.map.needsUpdate = true;
      if (['limestone', 'paving', 'plaster', 'wood'].includes(kind)) {
        // La altura sigue las juntas de la textura, sin desplazar vértices.
        const pixels = b.getImageData(0, 0, SIZE, SIZE);
        for (let p = 0; p < SIZE * SIZE; p++) {
          const v = (pixels.data[p * 4] + pixels.data[p * 4 + 1] + pixels.data[p * 4 + 2]) / 765;
          heights[p] = v;
          for (let k = 0; k < 3; k++) hd.data[p * 4 + k] = v * 255;
        }
        h.putImageData(hd, 0, 0); result.bumpMap.needsUpdate = true;
        writeNormals(heights, normal); result.normalMap.needsUpdate = true;
      }
      t.dispose(); resolve();
    }, undefined, () => { console.warn(`[museum] No se pudo cargar ${kind}; se mantiene la textura de respaldo.`); resolve(); })));
  }
  return result;
}

export function museumMaterial(kind, overrides = {}) {
  if (!cache.has(kind)) {
    const physical = kind === 'paving' || kind.includes('marble') || kind === 'checker';
    const mat = new THREE.MeshPhysicalMaterial({ color: kind === 'limestone' ? 0xb29b77 : 0xffffff, ...maps(kind),
      roughness: 1, metalness: 0, normalScale: new THREE.Vector2(kind === 'paving' ? 1.1 : 0.18, kind === 'paving' ? 1.1 : 0.18),
      bumpScale: kind === 'paving' ? 0.055 : kind === 'limestone' ? 0.035 : 0.009,
      clearcoat: physical ? 0.32 : 0, clearcoatRoughness: kind === 'paving' ? 0.22 : 0.25,
      envMapIntensity: 0.12 });
    if (kind === 'paving') { mat.clearcoatRoughnessMap = mat.roughnessMap; mat.clearcoatRoughness = 0.8; attachPuddleMacro(mat); }
    mat.userData.tileSize = kind === 'limestone' ? [4, 3] : kind === 'wood' ? [1, 6] : kind === 'paving' ? [2.4, 2] : [3, 3];
    mat.userData.surfaceKind = kind;
    cache.set(kind, mat);
  }
  if (!Object.keys(overrides).length) return cache.get(kind);
  const m = cache.get(kind).clone(); Object.assign(m, overrides);
  if (kind === 'paving') attachPuddleMacro(m);   // clone() no copia onBeforeCompile
  return m;
}

export function brassMaterial() {
  return museumMaterial('brass', { color: new THREE.Color(0xdab365), map: null, metalness: 0.82,
    roughness: 0.28, roughnessMap: null, bumpScale: 0.0004, envMapIntensity: 0.75 });
}

export function checkerMaterial() {
  if (cache.has('checker')) return cache.get('checker');
  const white = museumMaterial('ivory-marble'), dark = museumMaterial('dark-marble');
  const m = museumMaterial('checker'); m.userData.tileSize = [6, 40 / 7];
  const c = m.map.image; c.width = c.height = 1024;
  const g = c.getContext('2d'), tile = 256;
  const draw = () => {
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      g.save(); g.translate((x + 0.5) * tile, (y + 0.5) * tile);
      g.rotate(((x * 3 + y) % 4) * Math.PI / 2);
      if (y % 2) g.scale(-1, 1);
      g.drawImage((x + y) % 2 ? white.map.image : dark.map.image, -tile / 2, -tile / 2, tile, tile);
      g.restore();
    }
    g.strokeStyle = '#6e6659'; g.lineWidth = 1;
    for (let v = 0; v <= c.width; v += tile) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, c.height); g.moveTo(0, v); g.lineTo(c.width, v); g.stroke(); }
    m.map.needsUpdate = true;
  };
  draw(); Promise.all(pending).then(draw); return m;
}

// UVs métricas por cara: evita estirar un único bloque de piedra sobre toda la fachada.
export function mapMuseumMesh(mesh) {
  if (!mesh.isMesh || !mesh.material.userData?.tileSize || mesh.userData.museumUV) return;
  const geo = mesh.geometry.clone(), p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  if (!uv || !n) { geo.dispose(); return; }
  const [sx, sy] = mesh.material.userData.tileSize;
  for (let i = 0; i < p.count; i++) {
    let u, v;
    if (geo.type === 'CylinderGeometry') { u = uv.getX(i) * Math.PI * (geo.parameters.radiusTop + geo.parameters.radiusBottom); v = p.getY(i); }
    else if (Math.abs(n.getY(i)) > 0.5) { u = p.getX(i); v = p.getZ(i); }
    else if (Math.abs(n.getX(i)) > 0.5) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    // PlaneGeometry usa XY local antes de girarse hacia el suelo.
    if (geo.type === 'PlaneGeometry') { u = p.getX(i); v = p.getY(i); }
    if (mesh.material.userData.surfaceKind === 'wood' && geo.type === 'BoxGeometry' && geo.parameters.depth > geo.parameters.height) {
      u = Math.abs(n.getY(i)) > 0.5 ? p.getX(i) : p.getY(i); v = p.getZ(i);
    }
    uv.setXY(i, u / sx, v / sy);
  }
  mesh.geometry = geo; mesh.userData.museumUV = true;
}

export function setupMuseumReflections(renderer, scene, camera, ctx) {
  const museum = ctx.museum; if (!museum) return;
  museum.ready = Promise.all([...pending, museum.premiere?.ready]);
  const reflectors = [];
  for (const [index, floor] of [[0, museum.reflectionSurfaces[0]], [1, museum.reflectionSurfaces[2]]]) {
    const shader = Reflector.ReflectorShader;
    const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    uniforms.surfaceNormal = { value: floor.material.normalMap };
    uniforms.surfaceRoughness = { value: floor.material.roughnessMap };
    uniforms.reflectionStrength = { value: index === 0 ? 0.38 : 0.32 };
    uniforms.courtyard = { value: index === 0 ? 1 : 0 };
    uniforms.reflectionTexel = { value: new THREE.Vector2(1 / 1024, 1 / 576) };
    uniforms.surfaceDistortion = { value: index === 0 ? 0.045 : 0.003 };
    uniforms.reflectionBlur = { value: index === 0 ? 11 : 7 };
    uniforms.puddleMacroMap = { value: puddleMacroTexture() };
    uniforms.puddleMacroStrength = { value: index === 0 ? 1 : 0 };   // solo el patio tiene charcos
    const vertexShader = shader.vertexShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 surfaceUv; varying vec2 surfaceWorld;')
      .replace('vUv = textureMatrix', 'surfaceUv = uv; surfaceWorld = (modelMatrix * vec4(position, 1.0)).xz; vUv = textureMatrix');
    const fragmentShader = shader.fragmentShader.replace('varying vec4 vUv;',
      `varying vec4 vUv; varying vec2 surfaceUv; varying vec2 surfaceWorld;
      uniform sampler2D surfaceNormal; uniform sampler2D surfaceRoughness;
      uniform float reflectionStrength; uniform vec2 reflectionTexel;
      uniform float surfaceDistortion; uniform float reflectionBlur; uniform float courtyard;
      uniform sampler2D puddleMacroMap; uniform float puddleMacroStrength;${PUDDLE_GLSL}`)
      .replace('vec4 base = texture2DProj( tDiffuse, vUv );',
        `float rough = texture2D(surfaceRoughness, surfaceUv).g * puddleRoughnessScale(surfaceWorld, puddleMacroMap, puddleMacroStrength);
        vec2 projected = vUv.xy / vUv.w + (texture2D(surfaceNormal, surfaceUv).rg - 0.5) * surfaceDistortion;
        vec2 spread = reflectionTexel * reflectionBlur * (0.35 + rough);
        vec4 base = texture2D(tDiffuse, projected) * 0.28;
        base += texture2D(tDiffuse, projected + vec2(spread.x, 0.0)) * 0.12;
        base += texture2D(tDiffuse, projected - vec2(spread.x, 0.0)) * 0.12;
        base += texture2D(tDiffuse, projected + vec2(0.0, spread.y)) * 0.12;
        base += texture2D(tDiffuse, projected - vec2(0.0, spread.y)) * 0.12;
        base += texture2D(tDiffuse, projected + spread) * 0.06;
        base += texture2D(tDiffuse, projected - spread) * 0.06;
        base += texture2D(tDiffuse, projected + vec2(spread.x, -spread.y)) * 0.06;
        base += texture2D(tDiffuse, projected + vec2(-spread.x, spread.y)) * 0.06;`)
      .replace('blendOverlay( base.rgb, color ), 1.0', 'blendOverlay( base.rgb, color ), reflectionStrength * (1.0 - rough * 0.65) * mix(1.0, 0.12 + 0.88 * (1.0 - smoothstep(0.12, 0.65, rough)), courtyard)');
    const reflector = new Reflector(floor.geometry.clone(), { textureWidth: 1024, textureHeight: 576,
      clipBias: 0.003, multisample: 0, color: 0xbcbcbc, shader: { uniforms, vertexShader, fragmentShader } });
    reflector.position.copy(floor.position); reflector.position.y += index === 0 ? 0.018 : 0.006;
    reflector.rotation.copy(floor.rotation);
    reflector.material.transparent = true; reflector.material.depthWrite = false;
    reflector.renderOrder = 1;
    reflector.raycast = () => {};
    museum.root.add(reflector); reflectors.push(reflector);
    const renderReflection = reflector.onBeforeRender;
    reflector.onBeforeRender = function(...args) {
      const previous = reflectors.map(r => r.visible);
      reflectors.forEach(r => { if (r !== reflector) r.visible = false; });
      try { renderReflection.apply(this, args); }
      finally { reflectors.forEach((r, i) => { r.visible = previous[i]; }); }
    };
  }
  ctx.updaters.push(() => {
    reflectors[0].visible = museum.root.visible && camera.position.z >= 25;
    reflectors[1].visible = museum.root.visible && camera.position.z >= 5 && camera.position.z < 25;
  });
}
