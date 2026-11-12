import * as THREE from 'three';

export function buildMuseumWaterfront(root, centerX, ground, nearBank) {
  const waterY = ground + 0.025;
  const cityZ = 245;
  const shoreZ = 212;
  const cityWidth = 355, cityHeight = 76;
  const shoreWidth = 310, shoreHeight = 13;
  const loader = new THREE.TextureLoader();

  function buildings(name, file, z, width, height, color) {
    const material = new THREE.MeshBasicMaterial({
      color, transparent: true, alphaTest: 0.025, fog: false, toneMapped: false,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.name = name;
    mesh.visible = false;
    mesh.rotation.y = Math.PI;
    mesh.position.set(centerX, waterY + height / 2, z);
    root.add(mesh);
    material.map = loader.load(file, () => { mesh.visible = true; });
    material.map.colorSpace = THREE.SRGBColorSpace;
    return material.map;
  }

  const city = buildings('museum-city-skyline', 'assets/textures/museum/city-skyline-new-york.webp',
    cityZ, cityWidth, cityHeight, 0xc2d0e4);
  const shore = buildings('museum-city-shore', 'assets/textures/museum/city-waterfront-new-york.webp',
    shoreZ, shoreWidth, shoreHeight, 0xffe6cc);

  // Reflejos aproximados: cuatro muestras de textura y un único plano inmóvil.
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      centerX: { value: centerX },
      city: { value: city },
      shore: { value: shore },
      cityPlane: { value: new THREE.Vector3(cityZ, cityWidth, cityHeight) },
      shorePlane: { value: new THREE.Vector3(shoreZ, shoreWidth, shoreHeight) },
    },
    vertexShader: `
      varying vec3 waterPosition;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        waterPosition = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: `
      uniform float time, centerX;
      uniform sampler2D city, shore;
      uniform vec3 cityPlane, shorePlane;
      varying vec3 waterPosition;

      vec3 reflection(sampler2D image, vec3 plane, vec3 ray, float ripple) {
        float scale = (plane.x - cameraPosition.z) / max(ray.z, 0.01);
        float x = cameraPosition.x + ray.x * scale;
        float y = (cameraPosition.y - waterPosition.y) * (scale - 1.0);
        vec2 uv = vec2(0.5 - (x - centerX) / plane.y + ripple, y * 1.05 / plane.z);
        vec4 light = texture2D(image, clamp(uv, 0.0, 1.0));
        vec4 blur = texture2D(image, clamp(uv + vec2(-ripple * 0.5, 0.045), 0.0, 1.0));
        float range = step(1.0, scale) * step(0.0, uv.x) * step(uv.x, 1.0) * step(uv.y, 1.0);
        float softness = 1.0 - smoothstep(0.25, 1.0, uv.y) * 0.55;
        return mix(light.rgb * light.a, blur.rgb * blur.a, 0.5) * range * softness;
      }

      void main() {
        vec3 ray = waterPosition - cameraPosition;
        float z = waterPosition.z;
        float x = waterPosition.x;
        // Ondas cortas y lentas. Atenuarlas bajo un píxel evita parpadeos en el horizonte.
        float phaseA = z * 4.2 + sin(x * 0.31) * 1.6 - time * 0.48;
        float phaseB = z * 7.1 - x * 0.43 + time * 0.31;
        float waveA = sin(phaseA) * (1.0 - smoothstep(0.7, 2.8, fwidth(phaseA)));
        float waveB = sin(phaseB) * (1.0 - smoothstep(0.7, 2.8, fwidth(phaseB)));
        float ripple = (waveA + 0.35 * waveB) * 0.00065;
        float bands = 0.58 + 0.24 * waveA + 0.16 * waveB;
        vec3 distant = reflection(city, cityPlane, ray, ripple);
        vec3 waterfront = reflection(shore, shorePlane, ray, ripple * 1.2);
        vec3 reflected = distant * vec3(0.50, 0.65, 0.85) + waterfront * vec3(0.98, 0.76, 0.52);
        float grazing = 1.0 - clamp(abs(ray.y) / max(length(ray), 0.01), 0.0, 1.0);
        float reflectance = mix(0.35, 0.85, pow(grazing, 5.0));
        vec3 water = vec3(0.003, 0.007, 0.014) * (0.92 + 0.12 * bands);
        gl_FragColor = vec4(water + reflected * bands * reflectance, 1.0);
        #include <colorspace_fragment>
      }
    `,
    toneMapped: false,
    extensions: { derivatives: true },
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(480, shoreZ - nearBank), material);
  water.name = 'museum-harbor-water';
  water.rotation.x = -Math.PI / 2;
  water.position.set(centerX, waterY, (nearBank + shoreZ) / 2);
  root.add(water);

  return { update(t) { material.uniforms.time.value = t; } };
}
