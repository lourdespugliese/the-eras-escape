// light-budget.js — Cada material iluminado recorre en cada píxel todas las luces que three.js le pasa, aunque estén apagadas
// o en otra sala. Aquí, antes de cada frame, solo quedan activas (con layers) las luces que pueden aportar algo a la imagen:
// encendidas y con su alcance (distance) tocando lo que ve la cámara o su reflejo en el suelo. Más allá de distance three.js
// corta la luz a cero, así que la imagen no cambia.
// Los shaders dependen de CUÁNTAS luces hay de cada tipo, no de cuáles. Cada grupo de zonas tiene una tabla fija de huecos
// por tipo y los que sobran se rellenan con luces apagadas. Cada material guarda un programa por tabla, así que cambiar de
// grupo no recompila; al arrancar se precompilan las tablas en segundo plano. Si una vista necesita más huecos, la tabla de
// ese grupo crece (una recompilación, avisada en la consola).
import * as THREE from 'three';

// Huecos por grupo y tipo ('*' = con sombra): el máximo medido en sus zonas y pasillos, en 8 direcciones cada pocos metros,
// al principio del juego y con todas las puertas abiertas, más un margen de 2 point lights y 1 con sombra.
const START = {
  exterior: { PointLight: 11, 'PointLight*': 4, SpotLight: 10, RectAreaLight: 4, DirectionalLight: 1 },
  museo: { PointLight: 13, 'PointLight*': 4, SpotLight: 4, RectAreaLight: 3, DirectionalLight: 1 },            // hall y salas 1-3
  noche: { PointLight: 23, 'PointLight*': 5, DirectionalLight: 1, 'DirectionalLight*': 2, HemisphereLight: 2 }, // salas 4-6
};
// Exterior, hall, salas 1-4, cámara de transición, Folklore y Midnights.
const GROUP = ['exterior', 'museo', 'museo', 'museo', 'museo', 'noche', 'noche', 'noche', 'noche'];
const ALL = 'all';                 // fuera de toda zona: el máximo de todos
const SCAN_EVERY = 1.5;            // s: busca luces nuevas

export function setupLightBudget({ renderer, scene, camera, target = null, zone = () => 0, start = START }) {
  const kinds = new Map();                       // tipo -> { lights: [], dummies: [] }
  const tables = new Map();                      // grupo -> { tipo: huecos }
  const seen = new WeakSet();
  let reflectors = [];
  const kindOf = (l) => l.type + (l.castShadow ? '*' : '') + (l.map ? '+map' : '');
  const kind = (k) => { if (!kinds.has(k)) kinds.set(k, { lights: [], dummies: [] }); return kinds.get(k); };
  for (const [key, t] of Object.entries(start)) { tables.set(key, { ...t }); Object.keys(t).forEach(kind); }
  const table = (key) => {
    if (!tables.has(key)) {                                               // sin medir: el máximo conocido
      const max = {}; for (const t of tables.values()) for (const k in t) max[k] = Math.max(max[k] || 0, t[k]);
      tables.set(key, max);
    }
    return tables.get(key);
  };

  function scan() {
    scene.traverse((o) => {
      if (seen.has(o)) return;
      seen.add(o);
      if (o.isReflector) reflectors.push(o);
      if (!o.isLight || o.isAmbientLight || o.isLightProbe || o.userData.budgetDummy || o.layers.mask !== 1) return;
      kind(kindOf(o)).lights.push(o);
    });
  }
  // Luz apagada lejos de todo para rellenar huecos cuando no hay bastantes luces reales visibles.
  function dummy(k, K) {
    const l = new THREE[k.split(/[*+]/)[0]]();
    l.intensity = 0; l.userData.budgetDummy = true; l.position.set(0, -1e4, 0); l.castShadow = k.includes('*');
    if (l.castShadow) l.shadow.autoUpdate = false;                       // su mapa nunca se dibuja (la luz no aporta nada)
    scene.add(l); K.dummies.push(l); return l;
  }

  const frustum = new THREE.Frustum(), m = new THREE.Matrix4(), sphere = new THREE.Sphere(), mirrored = new THREE.Sphere();
  const normal = new THREE.Vector3(), point = new THREE.Vector3(), mirrors = [];
  function worldVisible(o) { for (let p = o; p; p = p.parent) { if (!p.visible) return false; if (p === scene) return true; } return false; }
  function reaches(l) {
    const range = l.isPointLight || l.isSpotLight ? l.distance : 0;
    if (!(range > 0)) return true;                                        // sin alcance límite: ilumina todo
    l.getWorldPosition(sphere.center); sphere.radius = range;
    if (frustum.intersectsSphere(sphere)) return true;
    for (const p of mirrors) {                                            // lo que se ve reflejado en el suelo
      mirrored.radius = range;
      mirrored.center.copy(sphere.center).addScaledVector(p.normal, -2 * p.distanceToPoint(sphere.center));
      if (frustum.intersectsSphere(mirrored)) return true;
    }
    return false;
  }

  // Deja exactamente sizes[k] luces activas de cada tipo: primero las útiles, luego apagadas, luego luces de relleno.
  function apply(sizes, isUseful) {
    for (const [k, K] of kinds) {
      const useful = [], spare = [];
      for (const l of K.lights) {
        if (!worldVisible(l)) continue;                                   // three.js ya no la cuenta
        (isUseful(l) ? useful : spare).push(l);
      }
      if (useful.length > (sizes[k] || 0)) {
        console.info(`[luces] ${k}: ${sizes[k] || 0} -> ${useful.length} huecos en esta zona (se recompila una vez)`);
        sizes[k] = useful.length; state.grown++;
      }
      let free = (sizes[k] || 0) - useful.length;
      for (const l of useful) l.layers.mask = 1;
      for (const l of spare) { l.layers.mask = free > 0 ? 1 : 0; free--; }
      let i = 0;
      for (; free > 0; free--) (K.dummies[i++] || dummy(k, K)).layers.mask = 1;
      for (; i < K.dummies.length; i++) K.dummies[i].layers.mask = 0;
      state.active[k] = useful.length;
    }
  }

  // Dibuja una vez toda la escena desde arriba, en pequeño y con todo visible: el driver termina de preparar cada shader
  // en su primer dibujo (ANGLE/Direct3D), y así ese costo no aparece al entrar por primera vez en una zona.
  let warmCam = null, warmTarget = null;
  function overview(root) {
    const box = new THREE.Box3().setFromObject(root), c = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const half = Math.min(Math.max(size.x, size.z) / 2 + 1, 400);
    const view = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, Math.min(size.y, 800) + 20);
    view.position.set(c.x, Math.min(box.max.y, 400) + 10, c.z); view.lookAt(c.x, c.y, c.z); view.updateMatrixWorld();
    return view;
  }
  function warm(view, shadows = false) {
    if (!warmTarget) {
      warmTarget = target ? target.clone() : new THREE.WebGLRenderTarget(1, 1); warmTarget.setSize(64, 64);
    }
    const hidden = [];
    scene.traverse((o) => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && !(o.layers.mask & 1)) { hidden.push([o, o.layers.mask]); o.layers.mask |= 1; } });
    const previous = renderer.getRenderTarget(), shadowMap = renderer.shadowMap;
    const { autoUpdate, needsUpdate } = shadowMap;
    shadowMap.autoUpdate = false;
    shadowMap.needsUpdate = shadows;
    try { renderer.setRenderTarget(warmTarget); renderer.render(scene, view); }
    finally {
      renderer.setRenderTarget(previous);
      shadowMap.autoUpdate = autoUpdate; shadowMap.needsUpdate = needsUpdate;
      for (const [o, mask] of hidden) o.layers.mask = mask;
    }
  }

  async function prepare(key, root = null) {
    const sizes = tables.get(key);
    scan();
    apply(sizes, () => false);
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    let compilation;
    try { compilation = renderer.compileAsync(scene, camera); }
    finally { renderer.setRenderTarget(previous); }
    await compilation;
    apply(sizes, light => root && light.intensity !== 0 && reaches(light));
    warm(root ? overview(root) : (warmCam ||= overview(scene)), !!root);
  }

  // Precompila en segundo plano los programas de cada tabla (los compiladores de la GPU trabajan en paralelo).
  async function precompile() {
    const keys = [...tables.keys()].filter((k) => k !== ALL).sort((a, b) => (b === state.key) - (a === state.key));   // la actual primero
    for (const key of keys) {
      await prepare(key);
      state.precompiled.push(key);
    }
  }

  let finishInitial;
  const initialReady = new Promise(resolve => { finishInitial = resolve; });
  const state = {
    enabled: true, ready: false, key: null, active: {}, tables, grown: 0, precompiled: [],
    initialReady, prepare,
    forget(removed) {
      reflectors = reflectors.filter(o => !removed.has(o));
      for (const kind of kinds.values()) kind.lights = kind.lights.filter(light => !removed.has(light));
    },
    invalidate() { t = SCAN_EVERY; },
  };
  let t = SCAN_EVERY, frames = 0;
  const clock = new THREE.Clock();
  const previous = scene.onBeforeRender;
  scene.onBeforeRender = function (r, s, cam, target) {
    previous.call(this, r, s, cam, target);
    if (cam !== camera) return;
    t += clock.getDelta();
    if (t >= SCAN_EVERY) { t = 0; scan(); }
    if (++frames === 3) precompile().catch((e) => console.warn('[luces] precompilación:', e)).finally(() => { state.ready = true; finishInitial(); });

    if (!state.enabled) {                                                 // para comparar: todas las luces, como antes
      for (const K of kinds.values()) { K.lights.forEach((l) => { l.layers.mask = 1; }); K.dummies.forEach((l) => { l.layers.mask = 0; }); }
      return;
    }
    frustum.setFromProjectionMatrix(m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    mirrors.length = 0;
    for (const rf of reflectors) if (rf.layers.mask & 1 && worldVisible(rf)) {
      normal.set(0, 0, 1).transformDirection(rf.matrixWorld); rf.getWorldPosition(point);
      mirrors.push(new THREE.Plane().setFromNormalAndCoplanarPoint(normal, point));
    }
    const z = zone();
    state.key = z ? GROUP[Math.log2(z & -z)] || ALL : ALL;                // grupo de la zona de menor índice donde está la cámara
    apply(table(state.key), (l) => l.intensity !== 0 && reaches(l));
  };
  return state;
}
