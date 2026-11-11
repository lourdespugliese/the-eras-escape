// Partition a static instanced draw by space. Every original transform, colour,
// vertex and texture is retained; three.js can now reject off-screen clusters.
import * as THREE from 'three';

export function partitionInstances(input, cellSize = 8, padding = .3) {
  const meshes = Array.isArray(input) ? input : [input], mesh = meshes[0];
  if (!mesh.count || !mesh.parent) return [];
  const matrix = new THREE.Matrix4(), color = new THREE.Color(), buckets = new Map();
  for (const source of meshes) for (let i = 0; i < source.count; i++) {
    source.getMatrixAt(i, matrix);
    const key = Math.floor(matrix.elements[12] / cellSize) + ':' + Math.floor(matrix.elements[14] / cellSize);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push({ source, index: i });
  }
  const chunks = [];
  for (const [key, indices] of buckets) {
    const chunk = new THREE.InstancedMesh(mesh.geometry, mesh.material, indices.length);
    chunk.name = (mesh.name || 'forest-instances') + '-' + key;
    chunk.position.copy(mesh.position); chunk.quaternion.copy(mesh.quaternion); chunk.scale.copy(mesh.scale);
    chunk.customDepthMaterial = mesh.customDepthMaterial;
    chunk.customDistanceMaterial = mesh.customDistanceMaterial;
    // The original whole-forest batches exceed lighting.js's MAX_CASTER and
    // don't cast shadows. Keep the same shadow policy after partitioning.
    chunk.userData.noCastShadow = true;
    for (let j = 0; j < indices.length; j++) {
      const {source,index} = indices[j];
      source.getMatrixAt(index, matrix); chunk.setMatrixAt(j, matrix);
      if (source.instanceColor) { source.getColorAt(index, color); chunk.setColorAt(j, color); }
    }
    chunk.computeBoundingBox(); chunk.boundingBox.expandByScalar(padding);
    chunk.computeBoundingSphere(); chunk.boundingSphere.radius += padding;
    mesh.parent.add(chunk); chunks.push(chunk);
  }
  for (const source of meshes) { source.removeFromParent(); source.dispose(); }
  return chunks;
}
