// hub.js — Arma la pantalla de inicio / pausa a partir de las capas de design/hub-layers (ver js/hub-layout.js).
// Todas las capas viven en un lienzo de 1672 x 941 que se escala para caber en la ventana (--s en CSS).
// Los dijes se balancean suavemente; cada candado se mueve junto con su dije y desaparece al recuperar el objeto.
import { HUB_SIZE, HUB_LAYERS } from './hub-layout.js';

const BASE = 'assets/ui/hub/';
const LOCK_OF = { '1989': 'lock-1989', forest: 'lock-folklore', lover: 'lock-lover', midnights: 'lock-midnights', reputation: 'lock-reputation' };   // dije -> su candado (Fearless no tiene)
export const ITEM_LOCK = { polaroid: 'lock-1989', snake: 'lock-reputation', heart: 'lock-lover', oldkey: 'lock-folklore', finalkey: 'lock-midnights' };   // id del objeto (ui.js ITEMS) -> candado
const PROGRESS_BOX = { x: 151, y: 717, w: 450, h: 33 };   // donde va "0 / 6 recuerdos" (la capa de progreso original se dibuja con HTML para que cuente)

const place = (el, b) => Object.assign(el.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' });

// stage: #hub-stage · button: #start-btn · progress: #hub-progress · sound / music: botones de silencio. Devuelve { locks } (id de capa -> <img> del candado).
export function buildHub(stage, { button, progress, sound, music }) {
  const holders = { 'ui-button-bg': button, 'ui-sound': sound, 'ui-music': music };
  const img = (l) => { const i = new Image(); i.src = BASE + l.src; i.alt = ''; i.draggable = false; i.className = 'hub-layer'; place(i, l); return i; };
  const layers = [...HUB_LAYERS].sort((a, b) => a.z - b.z);
  const byId = Object.fromEntries(layers.map((l) => [l.id, l]));
  const lockIds = new Set(Object.values(LOCK_OF));
  const locks = {};
  let n = 0;

  for (const l of layers) {
    if (lockIds.has(l.id)) continue;                                  // los candados entran dentro del grupo de su dije
    if (holders[l.id]) {                                              // fondo del botón y rótulos Sonido/Música: la imagen va dentro de su botón (hover y clic juntos)
      const el = holders[l.id]; place(el, l); el.style.zIndex = l.z;
      const bg = img({ ...l, x: 0, y: 0 }); bg.style.cssText += 'width:100%;height:100%;left:0;top:0;';
      el.prepend(bg); continue;
    }
    if (!l.pivot) { const i = img(l); i.style.zIndex = l.z; stage.appendChild(i); continue; }

    const g = document.createElement('div'); g.className = 'hub-swing'; g.style.zIndex = l.z;
    g.style.transformOrigin = `${l.pivot.x * 100}% ${l.pivot.y * 100}%`;   // pivote global normalizado: el grupo ocupa todo el lienzo
    g.style.setProperty('--d', (3.6 + (n % 4) * 0.55).toFixed(2) + 's'); g.style.setProperty('--dl', (-n * 0.7).toFixed(2) + 's'); n++;
    g.appendChild(img(l));
    if (LOCK_OF[l.id]) { const lk = img(byId[LOCK_OF[l.id]]); locks[LOCK_OF[l.id]] = lk; g.appendChild(lk); }
    stage.appendChild(g);
  }

  place(progress, PROGRESS_BOX); progress.style.zIndex = 74;

  const fit = () => stage.style.setProperty('--s', Math.min(innerWidth / HUB_SIZE.w, innerHeight / HUB_SIZE.h));
  addEventListener('resize', fit); fit();
  return { locks };
}
