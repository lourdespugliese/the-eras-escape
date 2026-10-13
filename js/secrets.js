// secrets.js — Misión secundaria: canciones secretas. Cada easter egg musical encontrado añade una tarjeta
// en el lateral izquierdo de la pantalla con el objeto donde sonó (casete, disco...) y el nombre de la canción.
//
// Uso:   ctx.secrets = createSecrets(ctx, { total: 2 });
//        ctx.secrets.add('id-unico', { icon: 'cassette' | 'vinyl', era: 'Nombre de la era', title: 'Nombre de la canción' });
// Llamar a add() varias veces con el mismo id no duplica la tarjeta.

const SHOW_MS = 5000;                                     // cuánto tiempo se ve cada aviso de canción secreta

const ICONS = {
  cassette: `<svg viewBox="0 0 64 44" width="46" height="32"><rect x="2" y="2" width="60" height="40" rx="5" fill="#2a2a44" stroke="currentColor" stroke-width="3"/>
    <rect x="9" y="7" width="46" height="17" rx="2" fill="#f2f0ea"/><circle cx="22" cy="31" r="6" fill="#0b0b18" stroke="currentColor" stroke-width="2"/><circle cx="42" cy="31" r="6" fill="#0b0b18" stroke="currentColor" stroke-width="2"/>
    <rect x="25" y="28" width="14" height="6" fill="#0b0b18"/><circle cx="22" cy="31" r="2" fill="currentColor"/><circle cx="42" cy="31" r="2" fill="currentColor"/>
    <rect x="13" y="11" width="38" height="3" fill="currentColor"/></svg>`,
  vinyl: `<svg viewBox="0 0 48 48" width="38" height="38"><circle cx="24" cy="24" r="22" fill="#08080c" stroke="currentColor" stroke-width="2"/>
    <circle cx="24" cy="24" r="16" fill="none" stroke="#2a2a3a" stroke-width="1"/><circle cx="24" cy="24" r="11" fill="none" stroke="#2a2a3a" stroke-width="1"/>
    <circle cx="24" cy="24" r="7" fill="currentColor"/><circle cx="24" cy="24" r="1.6" fill="#08080c"/></svg>`,
};

export function createSecrets(ctx, { total = 2 } = {}) {
  const style = document.createElement('style');
  style.textContent = `
    #secrets{position:fixed;left:16px;top:50%;transform:translateY(-50%);z-index:6;display:none;flex-direction:column;gap:10px;pointer-events:none;
      font-family:Georgia,serif;max-width:260px}
    #secrets.on{display:flex}
    #secrets h4{margin:0 0 2px 4px;font:600 .68rem Georgia,serif;letter-spacing:.18em;text-transform:uppercase;color:#f3d38a;opacity:.85;text-shadow:0 1px 6px #000}
    .secret-card{display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:8px;color:#f3d38a;
      background:linear-gradient(135deg,rgba(24,18,10,.82),rgba(12,10,8,.82));border:1px solid rgba(243,211,138,.45);
      box-shadow:0 4px 18px rgba(0,0,0,.5),0 0 14px rgba(243,211,138,.18);opacity:0;transform:translateX(-30px);animation:secretIn .8s cubic-bezier(.2,.8,.2,1) forwards}
    .secret-card .ic{flex:none;display:flex;align-items:center;justify-content:center;width:48px}
    .secret-card .tx small{display:block;font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;opacity:.65}
    .secret-card .tx b{display:block;font-size:.95rem;font-weight:600;color:#fff4d6;line-height:1.25}
    .secret-card.fresh{animation:secretIn .8s cubic-bezier(.2,.8,.2,1) forwards,secretGlow 2.4s ease-out .4s}
    @keyframes secretIn{to{opacity:1;transform:translateX(0)}}
    @keyframes secretGlow{0%{box-shadow:0 0 40px rgba(255,225,150,.9)}100%{box-shadow:0 4px 18px rgba(0,0,0,.5),0 0 14px rgba(243,211,138,.18)}}
    @keyframes secretOut{from{opacity:1;transform:translateX(0)}to{opacity:0;transform:translateX(-30px)}}
    .secret-card.out{animation:secretOut .7s ease-in forwards}`;
  document.head.appendChild(style);

  const panel = document.createElement('div'); panel.id = 'secrets';
  const head = document.createElement('h4'); panel.appendChild(head);
  document.body.appendChild(panel);

  const found = new Map();
  const listeners = [];                                   // otros módulos (p. ej. la vitrina del hall) se enteran de cada hallazgo
  const refreshHead = () => { head.textContent = `Canciones secretas ${found.size}/${total}`; };
  refreshHead();

  // El panel se muestra solo mientras se juega (cursor bloqueado) y una vez hallada la primera canción.
  let active = 0;                                         // tarjetas visibles ahora mismo (cada una se muestra solo ~5 s)
  const sync = () => panel.classList.toggle('on', active > 0 && !!document.pointerLockElement);
  document.addEventListener('pointerlockchange', sync);

  return {
    count: () => found.size,
    has: (id) => found.has(id),
    onAdd: (fn) => listeners.push(fn),
    add(id, { icon = 'vinyl', era = '', title = '' } = {}) {
      if (found.has(id)) return false;
      found.set(id, { icon, era, title });
      const card = document.createElement('div'); card.className = 'secret-card fresh';
      card.innerHTML = `<div class="ic">${ICONS[icon] || ICONS.vinyl}</div><div class="tx"><small></small><b></b></div>`;
      card.querySelector('small').textContent = era;          // textContent: los nombres nunca se interpretan como HTML
      card.querySelector('b').textContent = title;
      panel.appendChild(card); active++;
      refreshHead(); sync();
      setTimeout(() => {                                  // a los 5 s la tarjeta se desvanece y desaparece (la canción queda en la vitrina del hall)
        card.classList.add('out');
        setTimeout(() => { card.remove(); active--; sync(); }, 750);
      }, SHOW_MS);
      listeners.forEach((fn) => fn(id, { icon, era, title }));
      ctx.audio.reward();
      ctx.ui.toast(`Canción secreta encontrada (${found.size}/${total}): ${title}`, 5000);
      return true;
    },
  };
}