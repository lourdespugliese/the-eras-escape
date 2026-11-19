// Las salas lejanas conservan su estado. Al sellar una etapa se eliminan también
// sus objetos, colisiones e interacciones.
import * as THREE from 'three';

const PRELOAD = 4, HYSTERESIS = 4, SCAN_EVERY = 1.5;
const NEXT_VISIBLE_DISTANCE = 10, PARTICLE_DISTANCE = 4;
const gap = (b, p) => Math.hypot(Math.max(b.minX - p.x, 0, p.x - b.maxX), Math.max(b.minZ - p.z, 0, p.z - b.maxZ));

export function createRoomRegistry(ctx) {
  const entries = [];
  function build(name, make, { stage, entryZ, entryX = 0 } = {}) {
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
    const items = new Set(ctx.interaction.items.slice(firstItem));
    const points = [];
    if (stage !== undefined) group.traverse(o => {
      if (!o.isPoints) return;
      o.visible = false;
      points.push(o);
    });
    const entry = { name, group, bounds: result.bounds, stage, entryZ: entryZ ?? result.bounds.maxZ,
      entryX, resident: true, held, points,
      removeGameplay, targets: result.targets || [] };
    const updaters = new Set();
    for (let i = firstUpdater; i < ctx.updaters.length; i++) {
      const update = ctx.updaters[i];
      const run = (dt, t) => { if (entry.resident) update(dt, t); };
      ctx.updaters[i] = run;
      updaters.add(run);
    }
    function removeGameplay() {
      result.cleanup?.();
      for (let i = ctx.colliders.length - 1; i >= 0; i--) if (colliders.has(ctx.colliders[i])) ctx.colliders.splice(i, 1);
      ctx.updaters = ctx.updaters.filter(fn => !updaters.has(fn));
      ctx.interaction.remove(items);
    }
    entries.push(entry);
    return result;
  }
  return { entries, build };
}

export function setupStreaming({ scene, camera, renderer, entries, ready = () => true,
  currentStage, canSeeNext, canSeeMuseum, invalidate = () => {}, forget = () => {} }) {
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
    if (!entries.some(entry => !entry.resident)) return;
    const used = resources(scene, new Set());
    if (scene.environment) used.add(scene.environment);
    if (scene.background?.isTexture) used.add(scene.background);
    for (const resource of used) retired.delete(resource);
    for (const entry of entries) {
      if (entry.resident) continue;
      const unused = resources(entry.group, new Set());
      for (const root of entry.held || []) resources(root, unused);
      for (const resource of unused) if (!used.has(resource)) dispose(resource);
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
      for (const root of [entry.group, ...(entry.held || [])]) {
        root.removeFromParent();
        releaseShadows(root);
        root.traverse(o => removed.add(o));
        resources(root, unused, true);
      }
      entry.targets?.forEach(target => unused.add(target));
      stats.discarded.push(entry.name);
    }
    const retained = resources(scene, new Set(), true);
    if (scene.environment) retained.add(scene.environment);
    if (scene.background?.isTexture) retained.add(scene.background);
    for (const entry of entries) {
      resources(entry.group, retained, true);
      for (const root of entry.held || []) resources(root, retained, true);
    }
    for (const resource of unused) if (!retained.has(resource)) dispose(resource);
    forget(removed);
    refresh();
  }
  // Incluye las esquinas de la vista para que el margen funcione en pantallas anchas.
  function reach() {
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov * .5)) / camera.zoom;
    return Math.min(camera.far, scene.fog?.isFog ? scene.fog.far : camera.far) * Math.sqrt(1 + tan * tan * (1 + camera.aspect * camera.aspect));
  }
  function update(dt = 0) {
    const current = currentStage?.();
    const { x, y, z } = camera.position;
    const range = reach();
    let changed = false;
    for (const entry of entries) {
      const fromEntrance = Math.hypot(x - entry.entryX, z - entry.entryZ);
      const approaching = entry.stage === current + 1 && canSeeNext(current);
      const margin = entry.resident ? HYSTERESIS : 0;
      const nearby = gap(entry.bounds, camera.position) <= range + PRELOAD + margin;
      let resident = true;
      if (state.enabled) {
        if (!currentStage) resident = nearby;
        else if (entry.stage === undefined) resident = current <= 0 && canSeeMuseum();
        else resident = (nearby && (entry.stage === current || entry.stage === current - 1))
          || (approaching && fromEntrance <= NEXT_VISIBLE_DISTANCE + margin);
      }
      const showParticles = resident && y >= 0 && (entry.stage === current
        || (approaching && fromEntrance <= PARTICLE_DISTANCE));
      for (const points of entry.points || []) points.visible = showParticles;
      if (resident === entry.resident) continue;
      entry.resident = resident;
      if (resident) {
        scene.add(entry.group);
        entry.group.updateMatrixWorld(true);
        for (const root of entry.held || []) camera.add(root);
      } else {
        scene.remove(entry.group);
        for (const root of entry.held || []) root.removeFromParent();
        releaseShadows(entry.group);
      }
      changed = dirty = true; stats.transitions++;
    }
    if (changed) {
      // Rebuild culling/shadow lists immediately, including after a teleport.
      refresh();
    }
    elapsed += dt;
    if (ready() && (dirty || elapsed >= SCAN_EVERY)) { retire(); dirty = false; elapsed = 0; }
  }
  const state = { enabled: true, entries, stats, update, discard, refresh, isActive: bounds => gap(bounds, camera.position) <= reach() + PRELOAD + HYSTERESIS };
  return state;
}
