// ui.js — Maneja todo lo que se ve encima del canvas (HTML/CSS).

// Los 6 objetos del juego. El "id" se usa en el código; el "label" se muestra al jugador.
export const ITEMS = [
  { id: 'guitar',   label: 'Guitarra Dorada' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'snake',    label: 'Serpiente' },
  { id: 'heart',    label: 'Corazón' },
  { id: 'oldkey',   label: 'Llave antigua' },
  { id: 'finalkey', label: 'Llave final' },
];

export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.overlay = $('overlay'); this.hud = $('hud'); this.startBtn = $('start-btn');
    this.roomEl = $('room-name'); this.promptEl = $('prompt'); this.toastEl = $('toast');
    this.countEl = $('count'); this.listEl = $('inv-list');
    this._toastTimer = null;
    this.updateInventory(new Set());
  }

  // Registra qué hacer cuando se presiona el botón de la pantalla inicial.
  onStart(callback) { this.startBtn.addEventListener('click', callback); }

  // Alterna entre menú (pantalla inicial/pausa) y juego (HUD).
  showGame(playing) {
    this.overlay.classList.toggle('hidden', playing);
    this.hud.classList.toggle('hidden', !playing);
    if (!playing) this.startBtn.textContent = 'CONTINUAR';
  }

  setRoom(name) { if (this.roomEl.textContent !== name) this.roomEl.textContent = name; }

  setPrompt(text) { if (this.promptEl.textContent !== text) this.promptEl.textContent = text; }

  // Mensaje temporal en la parte inferior de la pantalla.
  toast(text, ms = 3000) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  // Redibuja el inventario según el Set de ids recogidos.
  updateInventory(collected) {
    this.countEl.textContent = collected.size;
    this.listEl.innerHTML = ITEMS.map((i) => {
      const got = collected.has(i.id);
      return `<li class="${got ? 'got' : ''}">${got ? '✓' : '□'} ${i.label}</li>`;
    }).join('');
  }
}
