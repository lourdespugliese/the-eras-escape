// interaction.js — Raycaster desde el centro de la pantalla + tecla E.
import * as THREE from 'three';

export class Interaction {
  constructor(camera, ui) {
    this.camera = camera;
    this.ui = ui;
    this.items = [];                     // objetos interactivos registrados
    this.current = null;                 // el que se está mirando ahora
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3;              // distancia máxima de interacción (metros)

    addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' && this.current) this.current.onInteract();
    });
  }

  // Registra un objeto interactivo.
  //  mesh       -> Mesh o Group que se puede apuntar
  //  prompt     -> función que devuelve el texto a mostrar
  //  onInteract -> función que se ejecuta al presionar E
  //  enabled    -> función; si devuelve false, el objeto se ignora
  add(mesh, { prompt, onInteract, enabled = () => true }) {
    const item = { mesh, prompt, onInteract, enabled };
    mesh.userData.interactable = item;
    this.items.push(item);
    return item;
  }

  // Se llama en cada frame.
  update() {
    this.raycaster.setFromCamera({ x: 0, y: 0 }, this.camera); // rayo al centro (la mira)
    const active = this.items.filter((i) => i.mesh.visible && i.enabled());
    const hits = this.raycaster.intersectObjects(active.map((i) => i.mesh), true);

    let found = null;
    if (hits.length) {
      // El impacto puede ser una pieza hija; subimos hasta encontrar el objeto registrado.
      let o = hits[0].object;
      while (o && !o.userData.interactable) o = o.parent;
      found = o ? o.userData.interactable : null;
    }

    if (found !== this.current) {
      if (this.current) this._glow(this.current, false);
      if (found) this._glow(found, true);
      this.current = found;
    }
    this.ui.setPrompt(found ? found.prompt() : '');
  }

  // Efecto al mirar un objeto: sube la emisión de sus materiales (intensidad base = 1).
  _glow(item, on) {
    item.mesh.traverse((o) => {
      if (o.isMesh && o.material.emissive) o.material.emissiveIntensity = on ? 2.2 : 1;
    });
  }
}
