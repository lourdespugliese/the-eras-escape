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
// Ruido periódico: no introduce una costura en el normal map al repetir.
function grain(x, y) {
  let n = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 2147483648 - 1;
}
function maps(kind) {
  const base = canvas(), height = canvas(), normal = canvas(), rough = canvas();
  const b = base.getContext('2d'), h = height.getContext('2d');
  b.fillStyle = kind === 'dark-marble' || kind === 'paving' ? '#25251f' : '#d6c5a4'; b.fillRect(0, 0, SIZE, SIZE);
  const hd = h.createImageData(SIZE, SIZE), rd = h.createImageData(SIZE, SIZE);
  const heights = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const n = grain(x, y), p = y * SIZE + x;
    let v = 0.5 + n * 0.06;
    if (kind === 'paving') {
      const row = Math.floor(y / 128), seamX = (x + (row % 2) * 128) % 256;
      const edge = Math.min(seamX, 256 - seamX, y % 128, 128 - y % 128);
      v = edge < 3 ? 0.12 : 0.52 + n * 0.12;
    }
    if (kind === 'wood') v = 0.5 + Math.sin(x * 0.15 + Math.sin(y * Math.PI * 2 / SIZE) * 3) * 0.14 + n * 0.04;
    heights[p] = v;
    const r = kind === 'paving' ? 58 + n * 23 : kind.includes('marble') || kind === 'checker' ? 75 + n * 8 : 180 + n * 12;
    for (let k = 0; k < 3; k++) { hd.data[p * 4 + k] = v * 255; rd.data[p * 4 + k] = r; }
    hd.data[p * 4 + 3] = rd.data[p * 4 + 3] = 255;
  }
  h.putImageData(hd, 0, 0); rough.getContext('2d').putImageData(rd, 0, 0);
  const nd = h.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const p = (y * SIZE + x) * 4;
    const dx = heights[y * SIZE + (x + 1) % SIZE] - heights[y * SIZE + (x + SIZE - 1) % SIZE];
    const dy = heights[((y + 1) % SIZE) * SIZE + x] - heights[((y + SIZE - 1) % SIZE) * SIZE + x];
    const v = new THREE.Vector3(-dx * 3, dy * 3, 1).normalize();
    nd.data[p] = (v.x * 0.5 + 0.5) * 255; nd.data[p + 1] = (v.y * 0.5 + 0.5) * 255; nd.data[p + 2] = (v.z * 0.5 + 0.5) * 255; nd.data[p + 3] = 255;
  }
  normal.getContext('2d').putImageData(nd, 0, 0);
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
  if (['limestone', 'ivory-marble', 'dark-marble'].includes(kind)) {
    pending.push(new Promise(resolve => new THREE.TextureLoader().load(`assets/textures/museum/${kind}.png`, t => {
      b.drawImage(t.image, 0, 0, SIZE, SIZE); result.map.needsUpdate = true;
      if (kind === 'limestone') {
        // La altura sigue las juntas de la textura, sin desplazar vértices.
        const pixels = b.getImageData(0, 0, SIZE, SIZE);
        for (let p = 0; p < SIZE * SIZE; p++) {
          const v = (pixels.data[p * 4] + pixels.data[p * 4 + 1] + pixels.data[p * 4 + 2]) / 3;
          for (let k = 0; k < 3; k++) hd.data[p * 4 + k] = v;
        }
        h.putImageData(hd, 0, 0); result.bumpMap.needsUpdate = true;
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
      roughness: 1, metalness: 0, normalScale: new THREE.Vector2(kind === 'paving' ? 0.16 : 0.06, kind === 'paving' ? 0.16 : 0.06),
      bumpScale: kind === 'limestone' || kind === 'paving' ? 0.065 : 0.007,
      clearcoat: physical ? 0.42 : 0, clearcoatRoughness: kind === 'paving' ? 0.15 : 0.22,
      envMapIntensity: 0.12 });
    mat.userData.tileSize = kind === 'limestone' ? [6, 6] : kind === 'wood' ? [1, 6] : [3, 3];
    cache.set(kind, mat);
  }
  if (!Object.keys(overrides).length) return cache.get(kind);
  const m = cache.get(kind).clone(); Object.assign(m, overrides); return m;
}

export function brassMaterial() {
  return museumMaterial('wood', { color: new THREE.Color(0xe5b85b), map: null, metalness: 0.86,
    roughness: 0.42, roughnessMap: null, bumpScale: 0.001, envMapIntensity: 0.85 });
}

export function checkerMaterial() {
  if (cache.has('checker')) return cache.get('checker');
  const white = museumMaterial('ivory-marble'), dark = museumMaterial('dark-marble');
  const m = museumMaterial('checker'); m.userData.tileSize = [3, 20 / 7];
  const c = m.map.image, g = c.getContext('2d');
  const draw = () => {
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      g.drawImage((x + y) % 2 ? white.map.image : dark.map.image, x * SIZE / 2, y * SIZE / 2, SIZE / 2, SIZE / 2);
    }
    g.strokeStyle = '#6e6659'; g.lineWidth = 1;
    for (let v = 0; v <= SIZE; v += SIZE / 2) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, SIZE); g.moveTo(0, v); g.lineTo(SIZE, v); g.stroke(); }
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
    uv.setXY(i, u / sx, v / sy);
  }
  mesh.geometry = geo; mesh.userData.museumUV = true;
}

export function setupMuseumReflections(renderer, scene, camera, ctx) {
  const museum = ctx.museum; if (!museum) return;
  const reflectors = [];
  for (const [index, floor] of [[0, museum.reflectionSurfaces[0]], [1, museum.reflectionSurfaces[2]]]) {
    const shader = Reflector.ReflectorShader;
    const uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    uniforms.surfaceNormal = { value: floor.material.normalMap };
    uniforms.reflectionStrength = { value: index === 0 ? 0.23 : 0.2 };
    const vertexShader = shader.vertexShader.replace('varying vec4 vUv;', 'varying vec4 vUv; varying vec2 surfaceUv;')
      .replace('vUv = textureMatrix', 'surfaceUv = uv; vUv = textureMatrix');
    const fragmentShader = shader.fragmentShader.replace('varying vec4 vUv;',
      'varying vec4 vUv; varying vec2 surfaceUv; uniform sampler2D surfaceNormal; uniform float reflectionStrength;')
      .replace('vec4 base = texture2DProj( tDiffuse, vUv );',
        'vec4 projected = vUv; projected.xy += (texture2D(surfaceNormal, surfaceUv).rg - 0.5) * 0.008 * projected.w; vec4 base = texture2DProj(tDiffuse, projected);')
      .replace('blendOverlay( base.rgb, color ), 1.0', 'blendOverlay( base.rgb, color ), reflectionStrength');
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
