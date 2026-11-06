import * as THREE from 'three';

// Prototype used only by the preview server. The game source is not modified.
export function installTreePreview(ctx, foliage, trunks) {
  trunks.material = trunks.material.clone();
  const uniforms = {
    previewTime: { value: 0 },
    previewStrength: { value: 1 },
    previewDetail: { value: 0.70 },
  };
  const texture = new THREE.TextureLoader().load('/output/muestra-viento-2026-11-05/hojas.png');
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.8, 0.8);
  const declarations = 'uniform float previewTime; uniform float previewStrength; uniform float previewDetail;';
  const motion = `
    #include <begin_vertex>
    #ifdef USE_INSTANCING
      vec3 treePosition = (instanceMatrix * vec4(transformed, 1.0)).xyz;
      vec3 treeAnchor = instanceMatrix[3].xyz;
      float phase = treeAnchor.x * 0.37 + treeAnchor.z * 0.23;
      float clockPhase = previewTime * 1.0471975512;
      float wave = sin(clockPhase + phase) * 0.76 + sin(clockPhase * 2.0 + phase * 1.7) * 0.24;
      float heightWeight = pow(clamp(treePosition.y / 8.5, 0.0, 1.0), 1.6);
      vec3 roomOffset = vec3(wave, 0.0, sin(clockPhase + phase + 0.8) * 0.32) * 0.38 * heightWeight * previewStrength;
      vec3 axisX = instanceMatrix[0].xyz;
      vec3 axisY = instanceMatrix[1].xyz;
      vec3 axisZ = instanceMatrix[2].xyz;
      transformed += vec3(dot(roomOffset, axisX) / dot(axisX, axisX), dot(roomOffset, axisY) / dot(axisY, axisY), dot(roomOffset, axisZ) / dot(axisZ, axisZ));
    #endif
  `;
  function inject(shader, detail = false) {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = declarations + '\n' + shader.vertexShader.replace('#include <begin_vertex>', motion);
    if (detail) {
      shader.fragmentShader = declarations + '\n' + shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec4 leafColor = texture2D(map, vMapUv);
          float leafTone = clamp((leafColor.r - 0.10) * 3.5 + 0.85, 0.55, 1.45);
          diffuseColor *= vec4(mix(vec3(1.0), vec3(leafTone), previewDetail), leafColor.a);
        #endif
      `);
    }
  }
  const material = foliage[0].material.clone();
  material.map = texture;
  material.onBeforeCompile = shader => inject(shader, true);
  material.customProgramCacheKey = () => 'tree-wind-preview-v1';
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  depth.onBeforeCompile = shader => inject(shader);
  depth.customProgramCacheKey = () => 'tree-wind-preview-depth-v1';
  const distance = new THREE.MeshDistanceMaterial();
  distance.onBeforeCompile = shader => inject(shader);
  distance.customProgramCacheKey = () => 'tree-wind-preview-distance-v1';
  foliage.forEach(mesh => {
    mesh.material = material;
    mesh.customDepthMaterial = depth;
    mesh.customDistanceMaterial = distance;
  });
  ctx.treePreview = { uniforms, texture, ready: () => !!texture.image?.complete, groups: foliage.length };
}
