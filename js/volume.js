// volume.js — Volúmenes del juego, con dos barritas que aparecen al pausar (ESC):
//   · "Sonido":    ambiente de las salas, intro y efectos (todo lo que sale por Web Audio).
//   · "Canciones": las canciones secretas y cualquier otro audio reproducido con <audio> / new Audio(...).
//
// Cómo funciona:
//  - Web Audio: se intercala un GainNode entre ctx.destination y los altavoces (sin tocar audio.js ni introsound.js).
//  - Canciones: se intercepta HTMLMediaElement (propiedad "volume" y play()). El código del juego sigue poniendo el volumen
//    que quiera (por ejemplo 0.8); el volumen real es ese valor multiplicado por la barra "Canciones".
//
// Uso (en main.js, ANTES de crear el AudioManager):   createVolume();
const KEY_FX = 'escaperoom-volume', KEY_MUSIC = 'escaperoom-volume-music';
const DEFAULT = 0.5;                                     // posición inicial de cada barra (0..1); el volumen real es el cuadrado (más natural al oído)
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function load(key) {
  try { const s = parseFloat(localStorage.getItem(key)); if (s >= 0 && s <= 1) return s; } catch (e) { /* sin almacenamiento */ }
  return DEFAULT;
}
function save(key, v) { try { localStorage.setItem(key, String(v)); } catch (e) { /* ignorado */ } }

export function createVolume() {
  let fx = load(KEY_FX), music = load(KEY_MUSIC);
  const fxGain = () => fx * fx, musicGain = () => music * music;

  // ---------- 1) Web Audio: GainNode entre ctx.destination y los altavoces ----------
  const nodes = [];
  const ctxProto = (window.BaseAudioContext || window.AudioContext || window.webkitAudioContext || {}).prototype;
  const dest = ctxProto && Object.getOwnPropertyDescriptor(ctxProto, 'destination');
  if (dest && dest.get) {
    const cache = new WeakMap();
    Object.defineProperty(ctxProto, 'destination', {
      configurable: true,
      get() {
        let g = cache.get(this);
        if (!g) { g = this.createGain(); g.gain.value = fxGain(); g.connect(dest.get.call(this)); cache.set(this, g); nodes.push(g); }
        return g;
      },
    });
  } else console.warn('[volume] este navegador no permite controlar el volumen general.');

  // ---------- 2) <audio> / new Audio(): el volumen pedido por el juego se multiplica por la barra "Canciones" ----------
  const media = new Set();
  const mp = window.HTMLMediaElement && HTMLMediaElement.prototype;
  const vdesc = mp && Object.getOwnPropertyDescriptor(mp, 'volume');
  const requested = (el) => (el.__reqVol === undefined ? 1 : el.__reqVol);
  const applyMedia = (el) => vdesc.set.call(el, requested(el) * musicGain());
  if (vdesc && vdesc.get && vdesc.set) {
    Object.defineProperty(mp, 'volume', {
      configurable: true,
      get() { return requested(this); },
      set(v) {
        if (!(v >= 0 && v <= 1)) return vdesc.set.call(this, v);   // valor inválido: que el navegador lance su error de siempre
        this.__reqVol = v; media.add(this); applyMedia(this);
      },
    });
    const play = mp.play;
    mp.play = function (...a) { if (!media.has(this)) { media.add(this); applyMedia(this); } return play.apply(this, a); };
  } else console.warn('[volume] este navegador no permite controlar el volumen de las canciones.');

  const applyFx = () => nodes.forEach((g) => g.gain.setTargetAtTime(fxGain(), g.context.currentTime, 0.02));
  const applyMusic = () => { if (vdesc) media.forEach(applyMedia); };

  // ---------- Barras ----------
  const style = document.createElement('style');
  style.textContent = `
    #volume{position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:50;display:none;flex-direction:column;gap:10px;
      padding:12px 20px;border-radius:10px;font-family:Georgia,serif;color:#f3d38a;background:rgba(18,12,6,.88);
      border:1px solid rgba(243,211,138,.45);box-shadow:0 6px 24px rgba(0,0,0,.6);user-select:none}
    #volume.on{display:flex}
    #volume .vrow{display:flex;align-items:center;gap:14px}
    #volume label{width:5.6rem;font-size:.78rem;letter-spacing:.16em;text-transform:uppercase;opacity:.85}
    #volume svg{width:22px;height:22px;flex:none;cursor:pointer}
    #volume input{-webkit-appearance:none;appearance:none;width:200px;height:6px;border-radius:3px;outline:none;cursor:pointer;
      background:linear-gradient(to right,#f3d38a var(--p,50%),rgba(243,211,138,.25) var(--p,50%))}
    #volume input::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff4d6;border:2px solid #d4a640;box-shadow:0 0 8px rgba(243,211,138,.6)}
    #volume input::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#fff4d6;border:2px solid #d4a640}
    #volume output{min-width:3ch;text-align:right;font-size:.9rem;color:#fff4d6}`;
  document.head.appendChild(style);

  const box = document.createElement('div'); box.id = 'volume';
  document.body.appendChild(box);
  // Los clics en las barras no deben llegar al menú de pausa (que al hacer clic vuelve al juego).
  ['click', 'mousedown', 'pointerdown', 'mouseup', 'pointerup', 'touchstart'].forEach((ev) => box.addEventListener(ev, (e) => e.stopPropagation()));

  function makeRow(id, text, key, get, set, apply) {
    const row = document.createElement('div'); row.className = 'vrow';
    row.innerHTML = `<label for="${id}">${text}</label>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path class="w1" d="M15.5 9a4 4 0 0 1 0 6"/><path class="w2" d="M18.5 6a8 8 0 0 1 0 12"/></svg>
      <input id="${id}" type="range" min="0" max="100" step="1"><output></output>`;
    box.appendChild(row);
    const range = row.querySelector('input'), out = row.querySelector('output'), w1 = row.querySelector('.w1'), w2 = row.querySelector('.w2');
    let before = DEFAULT;                                // para el silencio con un clic en el altavoz
    const refresh = () => {
      const pct = Math.round(get() * 100);
      range.value = pct; out.textContent = pct + '%'; range.style.setProperty('--p', pct + '%');
      w1.style.display = pct > 0 ? '' : 'none'; w2.style.display = pct > 50 ? '' : 'none';
    };
    const commit = () => { refresh(); apply(); save(key, get()); };
    range.addEventListener('input', () => { set(range.value / 100); commit(); });
    row.querySelector('svg').addEventListener('click', () => { if (get() > 0) { before = get(); set(0); } else set(before || DEFAULT); commit(); });
    refresh();
    return refresh;
  }
  const refreshFx = makeRow('vol-fx', 'Sonido', KEY_FX, () => fx, (v) => { fx = clamp01(v); }, applyFx);
  const refreshMusic = makeRow('vol-music', 'Canciones', KEY_MUSIC, () => music, (v) => { music = clamp01(v); }, applyMusic);

  // Visibles cuando el cursor está libre (pantalla de inicio o pausa con ESC); ocultas mientras se juega.
  const sync = () => box.classList.toggle('on', !document.pointerLockElement);
  document.addEventListener('pointerlockchange', sync);
  sync();

  return {
    get sound() { return fx; }, set sound(v) { fx = clamp01(v); refreshFx(); applyFx(); },
    get songs() { return music; }, set songs(v) { music = clamp01(v); refreshMusic(); applyMusic(); },
  };
}