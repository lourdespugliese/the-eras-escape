// glitter.js — Destellos dorados que flotan y titilan (se animan en la GPU)
import * as THREE from 'three';

export function createGlitter(ctx, { count = 250, size = { x: 9, y: 3.6, z: 9 }, center = [0, 0, 0], color = 0xffd36a } = {}) {
  const pos = new Float32Array(count * 3);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3]     = center[0] + (Math.random() - 0.5) * size.x;
    pos[i * 3 + 1] = Math.random() * size.y;
    pos[i * 3 + 2] = center[2] + (Math.random() - 0.5) * size.z;
    phase[i] = Math.random();
    speed[i] = 0.02 + Math.random() * 0.06;      // velocidad de caída lenta
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  geo.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 }, uHeight: { value: size.y },
      uIntensity: { value: 1 }, uColor: { value: new THREE.Color(color) },
    },
    vertexShader: `
      attribute float aPhase; attribute float aSpeed;
      uniform float uTime; uniform float uHeight;
      varying float vTw;
      void main() {
        // destello breve y fuerte (elevar a una potencia lo hace "chispear")
        vTw = pow(0.5 + 0.5 * sin(uTime * 3.0 + aPhase * 6.2831), 6.0);
        vec3 p = position;
        p.y = mod(position.y - uTime * aSpeed, uHeight);       // cae y reaparece arriba
        p.x += sin(uTime * 0.5 + aPhase * 20.0) * 0.15;        // leve vaivén
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = (20.0 + 60.0 * vTw) / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uColor; uniform float uIntensity; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * (0.12 + vTw) * uIntensity;
        gl_FragColor = vec4(uColor, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  ctx.scene.add(points);
  ctx.updaters.push((dt, t) => (mat.uniforms.uTime.value = t));
  return mat;
}