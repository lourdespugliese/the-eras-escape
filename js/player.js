// player.js — Cámara en primera persona, teclado y colisiones.
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

export class Player {
  constructor(camera, domElement, colliders) {
    this.camera = camera;
    this.colliders = colliders;           // lista de cajas {minX,maxX,minZ,maxZ}
    this.controls = new PointerLockControls(camera, domElement); // mouse -> mirar
    this.speed = 4;                        // metros por segundo
    this.radius = 0.35;                    // "grosor" del jugador para las colisiones
    this.keys = {};

    addEventListener('keydown', (e) => (this.keys[e.code] = true));
    addEventListener('keyup', (e) => (this.keys[e.code] = false));
    addEventListener('blur', () => (this.keys = {}));

    // Vectores reutilizables (evita crear objetos nuevos en cada frame).
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._move = new THREE.Vector3();
  }

  lock() { this.controls.lock(); }

  // ¿El círculo del jugador en (x,z) toca alguna caja? (colisión círculo-rectángulo)
  collides(x, z) {
    for (const c of this.colliders) {
      const cx = Math.max(c.minX, Math.min(x, c.maxX)); // punto de la caja más cercano
      const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
      const dx = x - cx, dz = z - cz;
      if (dx * dx + dz * dz < this.radius * this.radius) return true;
    }
    return false;
  }

  update(dt) {
    const k = this.keys;
    const forward = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0);
    const side = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
    if (!forward && !side) return;

    // Dirección hacia donde mira la cámara, aplanada al suelo (sin volar).
    this.camera.getWorldDirection(this._fwd);
    this._fwd.y = 0;
    this._fwd.normalize();
    this._right.crossVectors(this._fwd, this.camera.up);

    this._move.set(0, 0, 0)
      .addScaledVector(this._fwd, forward)
      .addScaledVector(this._right, side)
      .normalize()
      .multiplyScalar(this.speed * dt);

    // Se prueba cada eje por separado: así el jugador "desliza" por las paredes.
    const p = this.camera.position;
    if (!this.collides(p.x + this._move.x, p.z)) p.x += this._move.x;
    if (!this.collides(p.x, p.z + this._move.z)) p.z += this._move.z;
  }
}
