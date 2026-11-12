// visibility.js — Evita trabajo que no se ve, sin cambiar la imagen.
//  1. Zonas ocultas: el museo es una cadena de zonas (exterior, hall, salas 1-6) unidas por puertas. Una zona solo se dibuja
//     si todas las puertas entre ella y la cámara están abiertas. Se hace con layers (no toca el .visible que maneja cada sala)
//     y solo a meshes: las luces siguen igual, así los shaders no se recompilan. Lo que cruza el borde de una zona (paredes,
//     puertas, pasillos) o no tiene tamaño fijo (partículas) se dibuja siempre. Las zonas vecinas tras una puerta cerrada
//     siguen en los reflejos del suelo (layer 1): la cámara espejo alcanza a ver por la rendija bajo las puertas.
//  2. Sombras a demanda: el mapa de sombras de una luz de la zona actual solo se redibuja si algo que proyecta sombra en su
//     alcance se movió, apareció o desapareció (antes: cada frame). Las luces de las zonas vecinas visibles, como antes,
//     no siguen las animaciones: solo se redibujan si cambia qué objetos hay (al abrirse una puerta, al cargar un .glb).
// Se ejecuta en scene.onBeforeRender: las matrices ya están al día y aún no se dibujaron sombras ni objetos.
import * as THREE from 'three';

const SCAN_EVERY = 1.5;   // s: busca objetos nuevos (los .glb cargan tarde)
const NEAR = 5;           // m: fuera de toda zona (pasillos), cuentan las zonas a menos de esta distancia
const EDGE = 0.5;         // m: lo que está a menos de esto del borde de una zona (puertas, marcos, paredes) se dibuja siempre
const SHOWN = 1, MIRROR_ONLY = 2, HIDDEN = 0;   // máscaras de layers: 0 = cámara principal, 1 = solo cámaras de reflejo

export function setupVisibility({ scene, camera, zones, openings, shadowLights }) {
  // zones: [{ name, bounds }] en orden de la cadena; la zona i conecta con la i + 1 por openings()[i].
  const allZones = () => (1 << zones.length) - 1;
  const inside = (b, p) => p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;
  const contains = (b, box) => box.min.x > b.minX + EDGE && box.max.x < b.maxX - EDGE && box.min.z > b.minZ + EDGE && box.max.z < b.maxZ - EDGE;
  const gap = (b, p) => Math.hypot(Math.max(b.minX - p.x, 0, p.x - b.maxX), Math.max(b.minZ - p.z, 0, p.z - b.maxZ));

  let current = 0;                                                        // zonas donde está la cámara
  function visibleZones() {
    const p = camera.getWorldPosition(_v);
    let start = 0;
    zones.forEach((z, i) => { if (inside(z.bounds, p)) start |= 1 << i; });
    if (!start) zones.forEach((z, i) => { if (gap(z.bounds, p) < NEAR) start |= 1 << i; });
    current = start; state.current = start;
    if (!start) return allZones();                                        // fuera del mapa: no se oculta nada
    const open = openings();
    let mask = start;
    for (let i = 0; i < zones.length; i++) if (start & (1 << i)) {
      for (let j = i; j < zones.length - 1 && open[j]; j++) mask |= 1 << (j + 1);
      for (let j = i; j > 0 && open[j - 1]; j--) mask |= 1 << (j - 1);
    }
    // Opening a chain of doors must not keep distant shadow maps updating.
    // Retain a conservative sphere around every corner of the current view.
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)) / camera.zoom;
    const far = Math.min(camera.far, scene.fog?.isFog ? scene.fog.far : camera.far);
    const reach = far * Math.sqrt(1 + tan * tan * (1 + camera.aspect * camera.aspect)) + NEAR;
    zones.forEach((z, i) => { if (!(start & (1 << i)) && gap(z.bounds, p) > reach) mask &= ~(1 << i); });
    return mask;
  }

  // --- Objetos: zona a la que pertenecen (0 = ninguna, se dibujan siempre) ---
  const tracked = [], seen = new WeakSet(), _v = new THREE.Vector3(), _size = new THREE.Vector3(), _box = new THREE.Box3();
  function underCamera(o) { for (let p = o.parent; p; p = p.parent) if (p.isCamera) return true; return false; }
  function scan() {
    for (let i = tracked.length - 1; i >= 0; i--) {
      const o = tracked[i].o;
      let attached = false;
      for (let p = o; p; p = p.parent) if (p === scene) { attached = true; break; }
      if (!attached) { o.layers.mask = SHOWN; seen.delete(o); tracked.splice(i, 1); }
    }
    scene.traverse((o) => {
      if (seen.has(o) || !(o.isMesh || o.isPoints || o.isLine || o.isSprite)) return;
      seen.add(o);
      if (o.isReflector && o.camera) o.camera.layers.enable(1);
      if (o.frustumCulled === false && !o.isInstancedMesh) return;          // sin tamaño fijo (partículas, lluvia)
      if (o.layers.mask !== SHOWN || underCamera(o)) return;                // objetos en la mano siguen a la cámara
      if (o.isInstancedMesh) o.computeBoundingBox();
      else if (o.geometry && !o.geometry.boundingBox) o.geometry.computeBoundingBox();
      tracked.push({ o, zone: -1, matrix: new Float64Array(16) });
    });
  }
  function zoneOf(o) {
    if (o.isSprite) { o.getWorldPosition(_v); _box.setFromCenterAndSize(_v, _size.setScalar(o.matrixWorld.getMaxScaleOnAxis())); }
    else _box.copy(o.isInstancedMesh ? o.boundingBox : o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    for (let i = 0; i < zones.length; i++) if (contains(zones[i].bounds, _box)) return 1 << i;
    return 0;
  }
  function same(a, b) { for (let i = 0; i < 16; i++) if (a[i] !== b[i]) return false; return true; }

  // --- Sombras: qué objetos pueden cambiar el mapa de cada luz ---
  let lights = [];
  function addShadows(entries) {
    for (const { light, zone } of entries) {
      light.shadow.autoUpdate = false; light.shadow.needsUpdate = true;
      lights.push({ light, bit: 1 << zone, casters: [], snap: null });
    }
    t = SCAN_EVERY;
  }
  function collectCasters() {
    const sphere = new THREE.Sphere(), box = new THREE.Box3();
    for (const L of lights) {
      const range = L.light.isPointLight ? L.light.shadow.camera.far : Infinity;
      L.light.getWorldPosition(sphere.center); sphere.radius = range;
      const list = [];
      scene.traverse((o) => {
        if (!o.castShadow || !(o.isMesh || o.isPoints || o.isLine)) return;
        if (range !== Infinity) {
          if (o.isInstancedMesh) { if (!o.boundingBox) o.computeBoundingBox(); box.copy(o.boundingBox); }
          else { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); box.copy(o.geometry.boundingBox); }
          if (!box.applyMatrix4(o.matrixWorld).intersectsSphere(sphere)) return;
        }
        list.push(o);
      });
      if (list.length !== L.casters.length || list.some((o, i) => o !== L.casters[i])) { L.casters = list; L.snap = null; }
    }
  }
  const PER = 21;
  function worldVisible(o) { for (let p = o; p; p = p.parent) { if (!p.visible) return 0; if (p === scene) return 1; } return 0; }
  // Estado actual de todo lo que afecta al mapa de sombras. Devuelve true si cambió desde la última vez que se dibujó.
  // moving = false: ignora movimientos (matrices) y solo mira qué objetos están (visibles, en qué layer, con sombra).
  function changed(L, moving) {
    const need = 17 + L.casters.length * PER;
    if (!L.next || L.next.length !== need) L.next = new Float64Array(need);
    const s = L.next;
    let k = 0;
    const lm = L.light.matrixWorld.elements; for (let i = 0; i < 16; i++) s[k++] = lm[i];
    s[k++] = L.light.distance;
    for (const o of L.casters) {
      const e = o.matrixWorld.elements; for (let i = 0; i < 16; i++) s[k++] = e[i];
      s[k++] = worldVisible(o); s[k++] = o.layers.mask; s[k++] = o.castShadow ? 1 : 0;
      s[k++] = o.geometry.attributes.position ? o.geometry.attributes.position.version : 0;
      s[k++] = o.isInstancedMesh ? o.instanceMatrix.version * 1e4 + o.count : 0;
    }
    if (!L.snap || L.snap.length !== need) return true;
    if (moving) { for (let i = 0; i < need; i++) if (L.snap[i] !== s[i]) return true; return false; }
    for (let c = 17 + 16; c < need; c += PER) for (let i = c; i < c + PER - 16; i++) if (L.snap[i] !== s[i]) return true;
    return false;
  }

  const state = {
    cull: true, shadowsOnDemand: true, visible: allZones(), current: 0,
    stats: { tracked: 0, culled: 0, shadowRenders: 0 },
    addShadows,
    forget(removed) {
      lights = lights.filter(({ light }) => !removed.has(light));
      for (const entry of lights) entry.casters = entry.casters.filter(o => !removed.has(o));
      for (let i = tracked.length - 1; i >= 0; i--) if (removed.has(tracked[i].o)) tracked.splice(i, 1);
    },
    invalidate() { t = SCAN_EVERY; for (const L of lights) L.snap = null; },
  };
  let t = SCAN_EVERY, first = true;
  const clock = new THREE.Clock();
  // Primer frame: todos los mapas de sombras se dibujan una vez con todo visible (como antes), así ninguna luz queda sin mapa.
  addShadows(shadowLights);

  const previous = scene.onBeforeRender;
  scene.onBeforeRender = function (renderer, s, cam, target) {
    previous.call(this, renderer, s, cam, target);
    if (cam !== camera) return;                                           // reflejos: usan lo ya decidido en este frame
    t += clock.getDelta();
    if (t >= SCAN_EVERY) { t = 0; scan(); collectCasters(); }

    const vis = state.cull && !first ? visibleZones() : allZones();
    const mirror = ((vis << 1) | (vis >> 1)) & allZones() & ~vis;         // vecinas tras una puerta cerrada
    state.visible = vis;
    let culled = 0;
    for (const e of tracked) {
      const o = e.o;
      if (e.zone < 0 || !same(e.matrix, o.matrixWorld.elements)) { e.matrix.set(o.matrixWorld.elements); e.zone = zoneOf(o); }
      const mask = e.zone === 0 || (e.zone & vis) ? SHOWN : e.zone & mirror ? MIRROR_ONLY : HIDDEN;
      o.layers.mask = mask;
      if (mask !== SHOWN) culled++;
    }
    state.stats.tracked = tracked.length; state.stats.culled = culled;

    if (first) { first = false; return; }
    for (const L of lights) {
      if (!(L.bit & vis) || L.light.intensity === 0 || !worldVisible(L.light)) continue;   // no se ve: el mapa puede esperar
      if (state.shadowsOnDemand && !changed(L, (L.bit & current) !== 0 || !state.cull)) continue;
      L.light.shadow.needsUpdate = true; state.stats.shadowRenders++;
      if (state.shadowsOnDemand) { const tmp = L.snap; L.snap = L.next; L.next = tmp; }
    }
  };
  return state;
}
