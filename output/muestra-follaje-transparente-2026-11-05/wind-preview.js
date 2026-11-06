import * as THREE from 'three';

// Prototype used only by the preview server. The game source is not modified.
export function installTreePreview(ctx, foliage, trunks) {
  trunks.material = trunks.material.clone();
  const uniforms = {
    previewTime: { value: 0 },
    previewStrength: { value: 1 },
    previewDetail: { value: 0.70 },
    previewCutout: { value: 1 },
  };
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const context = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.3, 1.3);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  const declarations = 'uniform float previewTime; uniform float previewStrength; uniform float previewDetail; uniform float previewCutout; varying vec3 vLeafPosition; varying vec3 vLeafNormal;';
  const motion = `
    #include <begin_vertex>
    #ifdef USE_INSTANCING
      vec3 treePosition = (instanceMatrix * vec4(transformed, 1.0)).xyz;
      vLeafPosition = treePosition;
      vLeafNormal = normalize(mat3(instanceMatrix) * normal);
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
    {
      shader.fragmentShader = declarations + '\n' + shader.fragmentShader.replace('#include <map_fragment>', `
        #ifdef USE_MAP
          vec3 leafNormal = abs(normalize(vLeafNormal));
          vec2 leafUv = leafNormal.y > max(leafNormal.x, leafNormal.z) ? vLeafPosition.xz : (leafNormal.x > leafNormal.z ? vLeafPosition.zy : vLeafPosition.xy);
          vec4 leafColor = texture2D(map, leafUv * 0.50);
          float leafTone = clamp((leafColor.r - 0.10) * 1.5 + 0.85, 0.65, 1.35);
          diffuseColor *= vec4(mix(vec3(1.0), vec3(leafTone), previewDetail), mix(1.0, leafColor.a, previewCutout));
        #endif
      `);
    }
  }
  const material = foliage[0].material.clone();
  material.map = texture;
  material.side = THREE.DoubleSide;
  material.alphaTest = 0.5;
  material.transparent = false;
  material.onBeforeCompile = shader => inject(shader, true);
  material.customProgramCacheKey = () => 'tree-gif-cutout-preview-v2';
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5, side: THREE.DoubleSide });
  depth.onBeforeCompile = shader => inject(shader);
  depth.customProgramCacheKey = () => 'tree-wind-preview-depth-v1';
  const distance = new THREE.MeshDistanceMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide });
  distance.onBeforeCompile = shader => inject(shader);
  distance.customProgramCacheKey = () => 'tree-wind-preview-distance-v1';
  foliage.forEach(mesh => {
    mesh.material = material;
    mesh.customDepthMaterial = depth;
    mesh.customDistanceMaterial = distance;
  });
  let loaded = false, lastFrame = -1;
  const frames = [];
  const preview = ctx.treePreview = {
    uniforms, texture, groups: foliage.length, ready: () => loaded,
    setTime(time) {
      uniforms.previewTime.value = time;
      const index = Math.floor(time * 8) % frames.length;
      if (!loaded || index === lastFrame) return;
      context.clearRect(0, 0, 512, 512);
      context.drawImage(frames[index], 0, 0);
      texture.needsUpdate = true;
      lastFrame = index;
    },
    frameCount: 0,
  };
  (async () => {
    const response = await fetch('/output/muestra-follaje-transparente-2026-11-05/hojas-animadas.gif');
    if (!response.ok) throw new Error('No se pudo cargar el GIF de follaje');
    const decoder = new ImageDecoder({ data: await response.arrayBuffer(), type: 'image/gif' });
    await decoder.tracks.ready;
    await decoder.completed;
    const count = decoder.tracks.selectedTrack.frameCount;
    for (let index = 0; index < count; index++) {
      const result = await decoder.decode({ frameIndex: index });
      frames.push(await createImageBitmap(result.image));
      result.image.close();
    }
    decoder.close();
    preview.frameCount = count;
    loaded = true;
    preview.setTime(0);
  })().catch(error => { preview.error = error.message; console.error(error); });
}
