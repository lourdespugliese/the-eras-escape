// ui.js — Maneja todo lo que se ve encima del canvas (HTML/CSS).

import { buildHub, ITEM_LOCK } from './hub.js';

// Los 6 objetos del juego. El "id" se usa en el código; el "label" se muestra al jugador.
export const ITEMS = [
  { id: 'guitar',   label: 'Guitarra Dorada', color: '#ffc83d' },   // Fearless
  { id: 'polaroid', label: 'Polaroid',        color: '#2de2ff' },   // 1989
  { id: 'snake',    label: 'Serpiente',       color: '#ffc83d' },   // Reputation
  { id: 'heart',    label: 'Corazón',         color: '#ff8fc8' },   // Lover
  { id: 'oldkey',   label: 'Llave antigua',   color: '#b8c8a0' },   // Folklore
  { id: 'finalkey', label: 'Llave final',     color: '#8a96ff' },   // Midnights
];

export class UI {
  constructor() {
    const $ = (id) => document.getElementById(id);
    this.overlay = $('overlay'); this.hud = $('hud'); this.startBtn = $('start-btn');
    this.roomEl = $('room-name'); this.promptEl = $('prompt'); this.toastEl = $('toast');
    this.countEl = $('count'); this.listEl = $('inv-list');
    this.volEl = $('volume'); this.volVal = $('vol-val');
    this._toastTimer = null;
    this.hubCount = $('hub-count'); this.btnLabel = this.startBtn.querySelector('.lbl');
    this.soundBtn = $('hub-sound'); this.musicBtn = $('hub-music');
    // Pantalla inicial: capas de design/hub-layers (js/hub.js). this.hubLocks = candados de los dijes.
    this.hubLocks = buildHub($('hub-stage'), { button: this.startBtn, progress: $('hub-progress'), sound: this.soundBtn, music: this.musicBtn }).locks;
    this.updateInventory(new Set());
  }

  // Los rótulos "Sonido" y "Música" de la pantalla inicial silencian / reactivan cada volumen (vol = lo que devuelve createVolume()).
  bindVolume(vol) {
    const panel = document.getElementById('volume');             // las barras (volume.js) se mueven al lienzo para quedar bajo los rótulos a cualquier tamaño de ventana
    if (panel) document.getElementById('hub-stage').appendChild(panel);
    const wire = (btn, prop) => {
      let before = 0.5;
      btn.addEventListener('click', () => {
        if (vol[prop] > 0) { before = vol[prop]; vol[prop] = 0; } else vol[prop] = before || 0.5;
        btn.classList.toggle('off', vol[prop] === 0);
      });
    };
    wire(this.soundBtn, 'sound'); wire(this.musicBtn, 'songs');
  }

  // Registra qué hacer cuando se presiona el botón de la pantalla inicial.
  onStart(callback) { this.startBtn.addEventListener('click', callback); }

  // Barra de volumen del menú de pausa (valores de 0 a 1).
  onVolume(callback) {
    this.volEl.addEventListener('input', () => { this.volVal.textContent = this.volEl.value + '%'; callback(this.volEl.value / 100); });
    this.volEl.addEventListener('change', () => this.volEl.blur());      // al soltar, el foco vuelve al juego
  }
  setVolume(v) { this.volEl.value = Math.round(v * 100); this.volVal.textContent = this.volEl.value + '%'; }

  // Muestra qué objeto llevas en la mano (lo usa el acertijo "Las historias" de la sala 1: ctx.ui.setHeld(label)).
  // Usa el elemento #held si existe en index.html; si no, lo crea. setHeld('') lo oculta.
  setHeld(label) {
    if (!this.heldEl) {
      this.heldEl = document.getElementById('held');
      if (!this.heldEl) {
        this.heldEl = document.createElement('div'); this.heldEl.id = 'held';
        this.heldEl.style.cssText = 'position:absolute;bottom:20px;left:20px;padding:.5rem 1rem;background:rgba(0,0,0,.6);border:1px solid #f3d38a;color:#fff0c4;';
        this.hud.appendChild(this.heldEl);
      }
    }
    this.heldEl.textContent = label ? '✋ Llevas: ' + label : '';
    this.heldEl.style.display = label ? '' : 'none';
  }

  // Alterna entre menú (pantalla inicial/pausa) y juego (HUD).
  showGame(playing) {
    this.overlay.classList.toggle('hidden', playing);
    this.hud.classList.toggle('hidden', !playing);
    if (!playing) this.btnLabel.textContent = 'CONTINUAR';
  }

  // Cambia el texto y el tema visual (colores y tipografía de style.css) según la era de la sala.
  setRoom(name) {
    if (this.roomEl.textContent === name) return;
    this.roomEl.textContent = name;
    const era = ['Fearless', '1989', 'Reputation', 'Lover', 'Folklore', 'Midnights'].find((e) => name.includes(e));
    document.body.dataset.era = era ? era.toLowerCase() : 'hall';
    this.roomEl.classList.remove('flash'); void this.roomEl.offsetWidth; this.roomEl.classList.add('flash');   // reinicia la animación de entrada
  }

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
    this.hubCount.textContent = collected.size;
    for (const [item, lock] of Object.entries(ITEM_LOCK)) this.hubLocks[lock].style.display = collected.has(item) ? 'none' : '';   // candado abierto = objeto recuperado
    this.listEl.innerHTML = ITEMS.map((i) => {
      const got = collected.has(i.id);
      const dot = `<i style="display:inline-block;width:.7em;height:.7em;border-radius:50%;margin:0 .45em 0 .15em;background:${i.color};box-shadow:0 0 6px ${i.color}"></i>`;   // color de la era
      return `<li class="${got ? 'got' : ''}">${got ? '✓' : '□'}${dot}${i.label}</li>`;
    }).join('');
  }
}