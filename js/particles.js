// particles.js — Un único objeto Points reutilizable (pool) para partículas doradas.
import * as THREE from 'three';

export class Particles {
  constructor(scene, max = 300) {
    this.max = max;
    this.pos = new Float32Array(max * 3).fill(0);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);
    this.next = 0;
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -100;   // partículas "muertas" fuera de vista
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo = geo;
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xffd36a, size: 0.09, transparent: true, opacity: 0.9,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  // Lanza "count" partículas desde "center" (Vector3).
  burst(center, count = 30, { speed = 1.2, up = 1.5 } = {}) {
    for (let k = 0; k < count; k++) {
      const i = this.next; this.next = (this.next + 1) % this.max;
      const p = i * 3;
      this.pos[p] = center.x; this.pos[p + 1] = center.y; this.pos[p + 2] = center.z;
      this.vel[p] = (Math.random() - 0.5) * speed * 2;
      this.vel[p + 1] = Math.random() * up + 0.3;
      this.vel[p + 2] = (Math.random() - 0.5) * speed * 2;
      this.life[i] = 1 + Math.random() * 0.8;
    }
  }

  update(dt) {
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      const p = i * 3;
      this.life[i] -= dt;
      this.vel[p + 1] -= 0.8 * dt;                  // gravedad suave
      this.pos[p] += this.vel[p] * dt; this.pos[p + 1] += this.vel[p + 1] * dt; this.pos[p + 2] += this.vel[p + 2] * dt;
      if (this.life[i] <= 0) this.pos[p + 1] = -100;
    }
    this.geo.attributes.position.needsUpdate = true;
  }
}
