// player.js — Cámara en primera persona, teclado y colisiones.
import * as THREE from 'three';

export class Player extends THREE.EventDispatcher {
  constructor(camera, domElement, colliders) {
    super();
    this.camera = camera;
    this.canvas = domElement;
    this.colliders = colliders;           // lista de cajas {minX,maxX,minZ,maxZ}
    this.speed = 4;                        // metros por segundo
    this.sprintMult = 1.85;                 // multiplicador al mantener Shift (se compone con speed, que otras partes ajustan)
    this.radius = 0.35;                   // "grosor" del jugador para las colisiones
    this.keys = {};
    this.mode = null;
    this._lockPending = false;
    this._useDrag = false;
    this.devMode = false;
    this._look = new THREE.Euler(0, 0, 0, 'YXZ');

    addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.mode === 'drag') this._setMode(null);
      if (this.playing) this.keys[e.code] = true;
    });
    addEventListener('keyup', (e) => (this.keys[e.code] = false));
    addEventListener('blur', () => (this.keys = {}));
    const doc = domElement.ownerDocument;
    doc.addEventListener('pointerlockchange', () => {
      if (doc.pointerLockElement === domElement) {
        this._lockPending = false;
        this._setMode('locked');
      } else if (this.mode === 'locked') this._setMode(null);
    });
    doc.addEventListener('pointerlockerror', () => this._startDrag());
    doc.addEventListener('mousemove', e => {
      if (this.mode === 'locked') this._turn(e.movementX, e.movementY);
    });
    domElement.addEventListener('mousedown', e => {
      if (this.mode === 'locked' && e.button === 0) this.dispatchEvent({ type: 'attack' });
    });
    domElement.addEventListener('pointerdown', e => {
      if (this.mode !== 'drag' || e.button !== 0 || this._drag) return;
      this._drag = { id: e.pointerId, x: e.clientX, y: e.clientY, distance: 0 };
      domElement.setPointerCapture(e.pointerId);
    });
    domElement.addEventListener('pointermove', e => {
      const drag = this._drag;
      if (drag?.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.distance += Math.hypot(dx, dy);
      drag.x = e.clientX; drag.y = e.clientY;
      this._turn(dx, dy);
    });
    domElement.addEventListener('pointerup', e => {
      const drag = this._drag;
      if (drag?.id !== e.pointerId) return;
      this._drag = null;
      if (drag.distance < 5) this.dispatchEvent({ type: 'attack' });
    });
    domElement.addEventListener('lostpointercapture', e => {
      if (this._drag?.id === e.pointerId) this._drag = null;
    });

    // Vectores reutilizables (evita crear objetos nuevos en cada frame).
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._move = new THREE.Vector3();
  }

  get playing() { return this.mode !== null; }

  start() {
    if (this.playing || this._lockPending) return;
    this._lockPending = true;
    if (this._useDrag || !this.canvas.requestPointerLock) {
      this._startDrag();
      return;
    }
    try { this.canvas.requestPointerLock()?.catch(() => this._startDrag()); }
    catch { this._startDrag(); }
  }

  _startDrag() {
    if (!this._lockPending) return;
    this._lockPending = false;
    this._useDrag = true;
    this._setMode('drag');
  }

  _setMode(mode) {
    const wasPlaying = this.playing;
    this.mode = mode;
    this.canvas.classList.toggle('drag-look', mode === 'drag');
    if (!this.playing) {
      this.keys = {};
      if (this._drag) {
        const { id } = this._drag;
        this._drag = null;
        if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id);
      }
    }
    if (this.playing !== wasPlaying) this.dispatchEvent({ type: this.playing ? 'play' : 'pause' });
  }

  _turn(dx, dy) {
    this._look.setFromQuaternion(this.camera.quaternion);
    this._look.y -= dx * 0.002;
    this._look.x = THREE.MathUtils.clamp(this._look.x - dy * 0.002, -Math.PI / 2, Math.PI / 2);
    this.camera.quaternion.setFromEuler(this._look);
  }

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
    const vertical = this.devMode ? (k.Space ? 1 : 0) - (k.ControlLeft || k.ControlRight ? 1 : 0) : 0;
    if (!forward && !side && !vertical) return;

    // En vuelo, WASD sigue la inclinación de la cámara para subir y bajar mirando.
    this.camera.getWorldDirection(this._fwd);
    if (!this.devMode) this._fwd.y = 0;
    this._fwd.normalize();
    this._right.crossVectors(this._fwd, this.camera.up);

    this._move.set(0, 0, 0)
      .addScaledVector(this._fwd, forward)
      .addScaledVector(this._right, side)
      .addScaledVector(this.camera.up, vertical)
      .normalize()
      .multiplyScalar(this.devMode
        ? this.speed * (k.ShiftLeft || k.ShiftRight ? 5 : 2.5) * dt
        : this.speed * (k.ShiftLeft || k.ShiftRight ? this.sprintMult : 1) * dt);

    const p = this.camera.position;
    if (this.devMode) {
      p.add(this._move);
      return;
    }
    // Se prueba cada eje por separado: así el jugador "desliza" por las paredes.
    if (!this.collides(p.x + this._move.x, p.z)) p.x += this._move.x;
    if (!this.collides(p.x, p.z + this._move.z)) p.z += this._move.z;
  }
}
