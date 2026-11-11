// Keep game state in JS; retire the GPU copies of distant rooms and detach their
// scene graphs. Reattaching uses the original objects, so puzzles never reset.
import * as THREE from 'three';

const PRELOAD = 4, HYSTERESIS = 4, SCAN_EVERY = 1.5;
const gap = (b, p) => Math.hypot(Math.max(b.minX - p.x, 0, p.x - b.maxX), Math.max(b.minZ - p.z, 0, p.z - b.maxZ));

export function createRoomRegistry(ctx) {
  const entries = [];
  function build(name, make) {
    const before = new Set(ctx.scene.children);
    const result = make();
    const roots = ctx.scene.children.filter(o => !before.has(o) && !o.isLight && !o.isCamera);
    const group = new THREE.Group(); group.name = 'stream-' + name;
    ctx.scene.add(group);
    roots.forEach(o => group.add(o)); // identity parent: world coordinates stay unchanged
    entries.push({ name, group, bounds: result.bounds, resident: true, resources: new Set() });
    return result;
  }
  return { entries, build };
}

export function setupStreaming({ scene, camera, renderer, entries, ready = () => true, invalidate = () => {} }) {
  // Resources may belong to several rooms (including the hall trophies). Never
  // dispose one while an attached object still uses it.
  const retired = new WeakSet();
  const stats = { resident: [], sleeping: [], evictedGeometries: 0, evictedTextures: 0, evictedInstances: 0, evictedTargets: 0, transitions: 0 };
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
  function resources(root, set) {
    root.traverse(o => {
      if (o.isReflector) set.add(o.getRenderTarget());
      if (o.geometry) set.add(o.geometry);
      if (o.isInstancedMesh) set.add(o);
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) textures(m, set);
      textures(o.customDepthMaterial, set); textures(o.customDistanceMaterial, set);
    });
    return set;
  }
  function retire() {
    const used = resources(scene, new Set());
    if (scene.environment) used.add(scene.environment);
    if (scene.background?.isTexture) used.add(scene.background);
    for (const resource of used) retired.delete(resource);
    for (const entry of entries) {
      if (entry.resident) continue;
      entry.resources = resources(entry.group, new Set());
      for (const resource of entry.resources) {
        if (used.has(resource) || retired.has(resource)) continue;
        resource.dispose(); retired.add(resource);
        if (resource.isTexture) stats.evictedTextures++;
        else if (resource.isInstancedMesh) stats.evictedInstances++;
        else if (resource.isWebGLRenderTarget) stats.evictedTargets++;
        else stats.evictedGeometries++;
      }
    }
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
      const resident = !state.enabled || distance <= range + PRELOAD + (entry.resident ? HYSTERESIS : 0);
      if (resident === entry.resident) continue;
      entry.resident = resident;
      if (resident) { scene.add(entry.group); entry.group.updateMatrixWorld(true); }
      else scene.remove(entry.group);
      changed = dirty = true; stats.transitions++;
    }
    if (changed) {
      stats.resident = entries.filter(e => e.resident).map(e => e.name);
      stats.sleeping = entries.filter(e => !e.resident).map(e => e.name);
      // Rebuild culling/shadow lists immediately, including after a teleport.
      invalidate(); renderer.renderLists.dispose();
    }
    elapsed += dt;
    if (dirty || elapsed >= SCAN_EVERY) { retire(); dirty = false; elapsed = 0; }
  }
  const state = { enabled: true, entries, stats, update, isActive: bounds => gap(bounds, camera.position) <= reach() + PRELOAD + HYSTERESIS };
  return state;
}
