import * as THREE from 'three';

export function buildMuseumSky(root) {
  const clouds = new THREE.TextureLoader().load('assets/textures/museum/night-clouds.webp');
  clouds.wrapS = clouds.wrapT = THREE.MirroredRepeatWrapping;
  const material = new THREE.ShaderMaterial({
    uniforms: { clouds: { value: clouds }, drift: { value: 0 } },
    vertexShader: `
      varying vec3 skyDirection;
      void main() {
        // Reconstruye el rayo con la cámara actual, también en los reflejos del patio.
        vec2 ray = (position.xy + projectionMatrix[2].xy)
          / vec2(projectionMatrix[0][0], projectionMatrix[1][1]);
        vec3 viewRay = vec3(ray, -1.0);
        skyDirection = vec3(dot(viewMatrix[0].xyz, viewRay),
          dot(viewMatrix[1].xyz, viewRay), dot(viewMatrix[2].xyz, viewRay));
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D clouds;
      uniform float drift;
      varying vec3 skyDirection;
      void main() {
        vec3 ray = normalize(skyDirection);
        float height = max(ray.y, 0.0);
        vec2 uv = vec2(0.5 + drift, 0.5) + ray.xz * (0.42 / (0.52 + height));
        float cloud = smoothstep(0.14, 0.55, texture2D(clouds, uv).r);

        float haze = 1.0 - smoothstep(0.0, 0.34, height);
        float city = haze * smoothstep(0.1, 0.96, ray.z);
        vec3 sky = vec3(0.005, 0.009, 0.018)
          + haze * vec3(0.008, 0.012, 0.018) + city * vec3(0.019, 0.011, 0.004);
        sky += cloud * smoothstep(0.015, 0.24, height)
          * mix(vec3(0.019, 0.026, 0.039), vec3(0.035, 0.032, 0.030), city);
        // El resplandor de la luna se difunde en las nubes sobre la fachada.
        float moon = smoothstep(0.955, 1.0, dot(ray, vec3(0.416, 0.436, -0.798)));
        sky += moon * (0.3 + 0.7 * cloud) * vec3(0.018, 0.025, 0.036);
        sky = mix(vec3(0.002, 0.004, 0.008), sky, smoothstep(-0.045, 0.04, ray.y));
        gl_FragColor = vec4(sky, 1.0);
        #include <colorspace_fragment>
      }
    `,
    depthWrite: false,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.name = 'museum-night-sky';
  mesh.frustumCulled = false;
  mesh.raycast = () => {};
  // Último opaco: el fondo solo pinta donde la escena no escribió profundidad.
  mesh.renderOrder = 100;
  root.add(mesh);
  return { update(t) { material.uniforms.drift.value = (t * 0.0012) % 2; } };
}
