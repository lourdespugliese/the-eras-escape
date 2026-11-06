import * as THREE from 'three';

// Cotton scatters light through its thin folds. Use a baked fold-exposure hint
// and a broad fill, rather than putting bright point-light spots on
// a hard plastic surface. No animated noise or volumetric ray marching is needed.
export function createLoverCloudMaterial(texture) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffedf2, map: texture, bumpMap: texture, bumpScale: .022,
    roughness: 1, metalness: 0,
  });
  material.name = 'lover-backlit-cotton-cloud';
  const uniforms = {
    cloudBody: { value: .8 },
    cloudGlow: { value: 1.25 },
  };
  material.userData.cloudUniforms = uniforms;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float cloudLight;\nvarying float vCloudLight;\nvarying vec3 vCloudPosition;\nvarying vec3 vCloudNormal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCloudLight = cloudLight;\nvCloudPosition = position;\nvCloudNormal = normal;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vCloudLight;
        varying vec3 vCloudPosition;
        varying vec3 vCloudNormal;
        uniform float cloudBody;
        uniform float cloudGlow;
        // Blend three projections so the cotton also wraps vertical folds;
        // a ceiling-only XZ map would turn those sides into stretched stripes.
        vec4 cloudSurface(sampler2D surfaceMap, vec3 p) {
          vec3 weight = pow(abs(normalize(vCloudNormal)), vec3(4.0));
          weight /= max(weight.x + weight.y + weight.z, 0.0001);
          p *= 0.65;
          return texture2D(surfaceMap, p.zy) * weight.x
            + texture2D(surfaceMap, p.xz) * weight.y
            + texture2D(surfaceMap, p.xy) * weight.z;
        }
      `)
      .replace('#include <map_fragment>', 'diffuseColor *= cloudSurface(map, vCloudPosition);')
      .replace('#include <normal_fragment_maps>', `
        float cottonHeight = cloudSurface(bumpMap, vCloudPosition).g;
        vec2 cottonGradient = vec2(
          cloudSurface(bumpMap, vCloudPosition + dFdx(vCloudPosition)).g - cottonHeight,
          cloudSurface(bumpMap, vCloudPosition + dFdy(vCloudPosition)).g - cottonHeight
        ) * bumpScale;
        normal = perturbNormalArb(-vViewPosition, normal, cottonGradient, faceDirection);
      `)
      .replace('#include <opaque_fragment>', `
        vec3 softFill = normalize(mat3(viewMatrix) * vec3(-0.3, -1.0, 0.4));
        float wrap = dot(normal, softFill) * 0.5 + 0.5;
        float thinFold = pow(clamp(vCloudLight, 0.0, 1.0), 2.1);
        vec3 cotton = diffuseColor.rgb * cloudBody * (0.62 + 0.38 * wrap);
        vec3 transmitted = vec3(1.35, 0.52, 0.18) * thinFold * cloudGlow;
        outgoingLight = cotton + transmitted;
        #include <opaque_fragment>
      `);
  };
  material.customProgramCacheKey = () => 'lover-cotton-backscatter-v2';
  return material;
}
