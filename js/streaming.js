// Las salas lejanas conservan su estado. Al sellar una etapa se eliminan también
// sus objetos, colisiones e interacciones.
import * as THREE from 'three';

const PRELOAD = 4, HYSTERESIS = 4, SCAN_EVERY = 1.5;
const gap = (b, p) => Math.hypot(Math.max(b.minX - p.x, 0, p.x - b.maxX), Math.max(b.minZ - p.z, 0, p.z - b.maxZ));

export function createRoomRegistry(ctx) {
  const entries = [];
  function build(name, make) {
    const before = new Set(ctx.scene.children);
    const cameraBefore = new Set(ctx.camera.children);
    const collidersBefore = new Set(ctx.colliders);
    const firstUpdater = ctx.updaters.length, firstItem = ctx.interaction.items.length;
    const result = make();
    const roots = ctx.scene.children.filter(o => !before.has(o) && !o.isCamera);
    const group = new THREE.Group(); group.name = 'stream-' + name;
    ctx.scene.add(group);
    roots.forEach(o => group.add(o)); // identity parent: world coordinates stay unchanged
    const held = ctx.camera.children.filter(o => !cameraBefore.has(o));
    const colliders = new Set(ctx.colliders.filter(c => !collidersBefore.has(c)));
    const updaters = new Set(ctx.updaters.slice(firstUpdater));
    const items = new Set(ctx.interaction.items.slice(firstItem));
    function removeGameplay() {
      result.cleanup?.();
      for (let i = ctx.colliders.length - 1; i >= 0; i--) if (colliders.has(ctx.colliders[i])) ctx.colliders.splice(i, 1);
      ctx.updaters = ctx.updaters.filter(fn => !updaters.has(fn));
      ctx.interaction.remove(items);
    }
    entries.push({ name, group, bounds: result.bounds, resident: true, held, removeGameplay, targets: result.targets || [] });
    return result;
  }
  return { entries, build };
}

export function setupStreaming({ scene, camera, renderer, entries, ready = () => true, invalidate = () => {}, forget = () => {} }) {
  // Resources may belong to several rooms (including the hall trophies). Never
  // dispose one while an attached object still uses it.
  const retired = new WeakSet();
  const stats = { resident: [], sleeping: [], discarded: [], evictedGeometries: 0, evictedTextures: 0, evictedInstances: 0, evictedTargets: 0, transitions: 0 };
  let elapsed = SCAN_EVERY, dirty = true;
  const textures = (material, set) => {
    if (!material) return;
    for (const value of Object.values(material)) if (value?.isTexture && !value.isRenderTargetTexture) set.add(value);
    for (const uniform of Object.values(material.uniforms || {})) {
      const value = uniform.value;
      if (value?.isTexture && !value.isRenderTargetTexture) set.add(value);
      else if (Array.isArray(value)) value.forEach(t => { if (t?.isTexture && !t.isRenderTargetTexture) set.add(t); });
    }
    for (const t of material.userData.streamingTextures || []) set.add(t);
  };
  function resources(root, set, includeMaterials = false) {
    function collectMaterial(m) {
      if (m && includeMaterials) set.add(m);
      textures(m, set);
    }
    root.traverse(o => {
      if (o.isReflector) set.add(o.getRenderTarget());
      if (o.geometry) set.add(o.geometry);
      if (o.isInstancedMesh) set.add(o);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) collectMaterial(m);
      collectMaterial(o.customDepthMaterial); collectMaterial(o.customDistanceMaterial);
      if (includeMaterials) collectMaterial(o.userData.orig);
    });
    return set;
  }
  function dispose(resource) {
    if (retired.has(resource)) return;
    resource.dispose(); retired.add(resource);
    if (resource.isTexture) stats.evictedTextures++;
    else if (resource.isInstancedMesh) stats.evictedInstances++;
    else if (resource.isWebGLRenderTarget) stats.evictedTargets++;
    else if (resource.isBufferGeometry) stats.evictedGeometries++;
  }
  function releaseShadows(root) {
    root.traverse(o => {
      if (!o.isLight || !o.shadow) return;
      const { shadow } = o;
      if (shadow.map) dispose(shadow.map);
      if (shadow.mapPass) dispose(shadow.mapPass);
      shadow.map = shadow.mapPass = null;
      shadow.needsUpdate = true;
    });
  }
  function retire() {
    const used = resources(scene, new Set());
    if (scene.environment) used.add(scene.environment);
    if (scene.background?.isTexture) used.add(scene.background);
    for (const resource of used) retired.delete(resource);
    for (const entry of entries) {
      if (entry.resident) continue;
      for (const resource of resources(entry.group, new Set())) if (!used.has(resource)) dispose(resource);
    }
  }
  function refresh() {
    stats.resident = entries.filter(e => e.resident).map(e => e.name);
    stats.sleeping = entries.filter(e => !e.resident).map(e => e.name);
    dirty = true;
    invalidate(); renderer.renderLists.dispose();
  }
  function discard(names) {
    const removed = new Set(), unused = new Set();
    for (let i = entries.length - 1; i >= 0; i--) {
      const entry = entries[i];
      if (!names.includes(entry.name)) continue;
      entries.splice(i, 1);
      entry.removeGameplay();
      for (const root of [entry.group, ...entry.held]) {
        root.removeFromParent();
        releaseShadows(root);
        root.traverse(o => removed.add(o));
        resources(root, unused, true);
      }
      entry.targets.forEach(target => unused.add(target));
      stats.discarded.push(entry.name);
    }
    const retained = resources(scene, new Set(), true);
    if (scene.environment) retained.add(scene.environment);
    if (scene.background?.isTexture) retained.add(scene.background);
    for (const entry of entries) resources(entry.group, retained, true);
    for (const resource of unused) if (!retained.has(resource)) dispose(resource);
    forget(removed);
    refresh();
  }
  // Use the farthest corner of the view, not only its centre. A wide screen
  // sees farther sideways. The existing fog and projection are unchanged.
  function reach() {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)) / camera.zoom;
    return Math.min(camera.far, scene.fog?.isFog ? scene.fog.far : camera.far) * Math.sqrt(1 + tan * tan * (1 + camera.aspect * camera.aspect));
  }
  function update(dt = 0) {
    if (!ready()) return;
    const range = reach();
    let changed = false;
    for (const entry of entries) {
      const distance = gap(entry.bounds, camera.position);
      const resident = entry.available?.() !== false && (!state.enabled || distance <= range + PRELOAD + (entry.resident ? HYSTERESIS : 0));
      if (resident === entry.resident) continue;
      entry.resident = resident;
      if (resident) { scene.add(entry.group); entry.group.updateMatrixWorld(true); }
      else { scene.remove(entry.group); releaseShadows(entry.group); }
      changed = dirty = true; stats.transitions++;
    }
    if (changed) {
      // Rebuild culling/shadow lists immediately, including after a teleport.
      refresh();
    }
    elapsed += dt;
    if (dirty || elapsed >= SCAN_EVERY) { retire(); dirty = false; elapsed = 0; }
  }
  const state = { enabled: true, entries, stats, update, discard, refresh, isActive: bounds => gap(bounds, camera.position) <= reach() + PRELOAD + HYSTERESIS };
  return state;
}
