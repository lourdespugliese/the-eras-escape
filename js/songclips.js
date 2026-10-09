// songclips.js — Reproduce un fragmento de una canción (archivo de audio tuyo) con fade-out.
// Solo suena UNA canción a la vez: si empieza otra, la anterior se corta al instante.
// Si el archivo no existe o el navegador lo bloquea, suena un motivo breve ORIGINAL (sintetizado).
//
// Uso:  const clips = createSongClips(ctx);
//       clips.preload(song);   // (opcional) descarga el audio antes de necesitarlo
//       clips.play(song);      // song = { clip: { url, start, dur, volume }, jingle: 0 }
//   url    -> ruta del archivo (mp3, m4a, ogg...)
//   start  -> segundo desde el que empieza el fragmento
//   dur    -> duración del fragmento en segundos
//   volume -> 0 a 1
const FADE = 1;    // segundos de fade-out al final

// Motivos de reemplazo (arpegios genéricos, no son las melodías de las canciones)
const JINGLES = [
  [392, 493.9, 587.3, 784, 987.8],
  [523.3, 659.3, 784, 659.3, 880],
  [440, 554.4, 659.3, 880, 1108.7],
];

export function createSongClips(ctx) {
  let token = 0;          // identifica la reproducción vigente; al cambiar, las anteriores quedan "caducadas"
  let active = null;      // elemento <audio> que está sonando
  let timer = null;       // control del fade-out y del final
  const cache = new Map();// url -> promesa con la URL local (blob) del audio, o null si el archivo no existe

  // Descarga el archivo completo y lo convierte en una URL local (blob).
  // Así el navegador puede saltar a cualquier segundo aunque el servidor no soporte "Range"
  // (python -m http.server no lo soporta y por eso fallaba el recorte).
  function load(url) {
    if (!cache.has(url)) {
      cache.set(url, fetch(url)
        .then((r) => (r.ok ? r.blob() : null))
        .then((b) => (b ? URL.createObjectURL(b) : null))
        .catch(() => null));
    }
    return cache.get(url);
  }

  // Corta lo que esté sonando o cargándose.
  function stop() {
    token++;                                   // invalida cualquier reproducción pendiente
    clearInterval(timer); timer = null;
    if (active) { active.pause(); active = null; }
    ctx.audio.stopTrack();
  }

  function jingle(i) {
    JINGLES[i % JINGLES.length].forEach((f, k) => ctx.audio._tone(f, { type: 'triangle', dur: 1.0, vol: 0.16, delay: k * 0.2 }));
  }

  return {
    stop,
    preload(song) { load(song.clip.url); },

    async play(song) {
      stop();                                  // primero se corta la anterior
      const my = token;                        // "mi" turno: si cambia, otra reproducción tomó el control
      const { url, start = 0, dur = 5, volume = 0.8 } = song.clip;

      const blobUrl = await load(url);
      if (my !== token) return;                // mientras cargaba se pidió otra canción: se descarta esta
      if (!blobUrl) { jingle(song.jingle || 0); return; }

      const a = new Audio(blobUrl);
      a.volume = volume;
      active = a;
      const ok = await new Promise((resolve) => {
        a.addEventListener('error', () => resolve(false), { once: true });
        a.addEventListener('loadedmetadata', () => {
          if (my !== token) { resolve(false); return; }
          try { a.currentTime = start; } catch (e) { /* sin salto: empieza desde el inicio */ }
          a.play().then(() => resolve(true)).catch(() => resolve(false));
        }, { once: true });
      });

      if (my !== token) { a.pause(); return; } // otra canción tomó el control mientras arrancaba
      if (!ok) { active = null; jingle(song.jingle || 0); return; }

      ctx.audio.track = a;                     // el ambiente se calla y la pausa del juego lo detiene
      const end = a.currentTime + dur;         // el final se mide desde donde REALMENTE arrancó
      timer = setInterval(() => {
        if (my !== token) { clearInterval(timer); return; }
        const left = end - a.currentTime;
        if (left <= 0 || a.ended) { stop(); return; }
        if (left < FADE) a.volume = Math.max(0, volume * (left / FADE));   // fade-out
      }, 50);
    },
  };
}
