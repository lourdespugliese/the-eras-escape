// Materiales del museo: mapas en espacio lineal y escala física, sin cambiar las mallas.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

const SIZE = 512;
const cache = new Map();
const pending = [];
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
    const r = kind === 'paving' ? 85 + cloud * 65 + n * 6 : kind.includes('marble') || kind === 'checker' ? 68 + cloud * 22 + n * 4 : 175 + cloud * 25 + n * 8;
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
  const source = { paving: 'wet-paving', plaster: 'warm-plaster', wood: 'walnut' }[kind] || kind;
  if (['limestone', 'ivory-marble', 'dark-marble', 'paving', 'plaster', 'wood'].includes(kind)) {
    pending.push(new Promise(resolve => new THREE.TextureLoader().load(`assets/textures/museum/${source}.png`, t => {
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
      roughness: 1, metalness: 0, normalScale: new THREE.Vector2(kind === 'paving' ? 0.8 : 0.18, kind === 'paving' ? 0.8 : 0.18),
      bumpScale: kind === 'limestone' || kind === 'paving' ? 0.035 : 0.009,
      clearcoat: physical ? 0.32 : 0, clearcoatRoughness: kind === 'paving' ? 0.22 : 0.25,
      envMapIntensity: 0.12 });
    mat.userData.tileSize = kind === 'limestone' ? [4, 3] : kind === 'wood' ? [1, 6] : [3, 3];
    mat.userData.surfaceKind = kind;
    cache.set(kind, mat);
  }
  if (!Object.keys(overrides).length) return cache.get(kind);
  const m = cache.get(kind).clone(); Object.assign(m, overrides); return m;
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
  museum.ready = Promise.all(pending);
  const reflectors = [];
  for (const [index, floor] of [[0, museum.reflectionSurfaces[0]], [1, museum.reflectionSurfaces[2]]]) {
    const shader = Reflector.ReflectorShader;
    const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    uniforms.surfaceNormal = { value: floor.material.normalMap };
    uniforms.surfaceRoughness = { value: floor.material.roughnessMap };
    uniforms.reflectionStrength = { value: index === 0 ? 0.28 : 0.18 };
    uniforms.reflectionTexel = { value: new THREE.Vector2(1 / 1024, 1 / 576) };
    uniforms.surfaceDistortion = { value: index === 0 ? 0.028 : 0.003 };
    uniforms.reflectionBlur = { value: index === 0 ? 8 : 4 };
    const vertexShader = shader.vertexShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 surfaceUv;')
      .replace('vUv = textureMatrix', 'surfaceUv = uv; vUv = textureMatrix');
    const fragmentShader = shader.fragmentShader.replace('varying vec4 vUv;',
      `varying vec4 vUv; varying vec2 surfaceUv;
      uniform sampler2D surfaceNormal; uniform sampler2D surfaceRoughness;
      uniform float reflectionStrength; uniform vec2 reflectionTexel;
      uniform float surfaceDistortion; uniform float reflectionBlur;`)
      .replace('vec4 base = texture2DProj( tDiffuse, vUv );',
        `float rough = texture2D(surfaceRoughness, surfaceUv).g;
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
      .replace('blendOverlay( base.rgb, color ), 1.0', 'blendOverlay( base.rgb, color ), reflectionStrength * (1.0 - rough * 0.65)');
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
