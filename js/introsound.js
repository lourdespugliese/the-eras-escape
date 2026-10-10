// introsound.js — Sonidos de la introducción, sintetizados con Web Audio (sin archivos de audio).
// Van por un canal propio (bus) para no mezclarse con el ambiente de las salas, que sigue en audio.master.
// Si todavía no existe el AudioContext, todos los métodos no hacen nada (así nada falla).
export function createIntroSound(audio) {
  const c = audio.ctx;
  if (!c) return new Proxy({}, { get: () => () => {} });

  const bus = c.createGain(); bus.gain.value = 1; bus.connect(c.destination);

  // Eco compartido (para los pasos y las puertas dentro del museo)
  const echo = c.createDelay(1); echo.delayTime.value = 0.23;
  const fb = c.createGain(); fb.gain.value = 0.52;
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
  echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(bus);

  // Ruido blanco reutilizable
  const noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  const noise = (loop = false) => { const s = c.createBufferSource(); s.buffer = noiseBuf; s.loop = loop; return s; };
  const out = (node, echoAmt = 0) => {
    node.connect(bus);
    if (echoAmt) { const s = c.createGain(); s.gain.value = echoAmt; node.connect(s); s.connect(echo); }
  };
  const env = (g, t, peak, attack, dur) => {          // envolvente: sube rápido, cae suave
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };

  // ---- Viento y lluvia continuos ----
  const windSrc = noise(true), rainSrc = noise(true);
  const wbp = c.createBiquadFilter(); wbp.type = 'bandpass'; wbp.frequency.value = 420; wbp.Q.value = 0.7;
  const windG = c.createGain(); windG.gain.value = 0;
  const lfo = c.createOscillator(); lfo.frequency.value = 0.13;
  const lfoG = c.createGain(); lfoG.gain.value = 0.05;
  lfo.connect(lfoG); lfoG.connect(windG.gain);
  windSrc.connect(wbp); wbp.connect(windG); windG.connect(bus);
  const rhp = c.createBiquadFilter(); rhp.type = 'highpass'; rhp.frequency.value = 1800;
  const rlp = c.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 7500;
  const rainG = c.createGain(); rainG.gain.value = 0;
  rainSrc.connect(rhp); rhp.connect(rlp); rlp.connect(rainG); rainG.connect(bus);
  windSrc.start(); rainSrc.start(c.currentTime, 0.7); lfo.start();

  // ---- Zumbido grave del museo (silencio con eco del edificio) ----
  const droneG = c.createGain(); droneG.gain.value = 0; droneG.connect(bus);
  [55, 82.4].forEach((f) => { const o = c.createOscillator(); o.frequency.value = f; o.connect(droneG); o.start(); });

  return {
    // level 0..1: cuánto "exterior" se oye (lluvia y viento)
    outdoor(level) {
      windG.gain.setTargetAtTime(0.2 * level, c.currentTime, 0.5);
      rainG.gain.setTargetAtTime(0.1 * level, c.currentTime, 0.5);
    },
    drone(level) { droneG.gain.setTargetAtTime(0.022 * level, c.currentTime, 1.5); },

    // Paso. kind: gravel (grava) | stair (escalera) | marble (pórtico) | hall (hall con mucho eco)
    step(kind = 'gravel', k = 1) {
      const P = { gravel: [1100, 0.9, 0.2, 0, 0.05], stair: [800, 1.2, 0.28, 0.3, 0.12], marble: [1500, 1.4, 0.3, 0.45, 0.1], hall: [1300, 1.2, 0.3, 0.75, 0.12] }[kind];
      const t = c.currentTime;
      const s = noise(), bp = c.createBiquadFilter(), g = c.createGain();
      bp.type = 'bandpass'; bp.frequency.value = P[0] * (0.88 + Math.random() * 0.24); bp.Q.value = P[1];
      env(g, t, P[2] * k, 0.005, 0.11);
      s.connect(bp); bp.connect(g); out(g, P[3]);
      s.start(t, Math.random(), 0.15);
      const o = c.createOscillator(), og = c.createGain();
      o.frequency.setValueAtTime(115, t); o.frequency.exponentialRampToValueAtTime(52, t + 0.08);
      env(og, t, P[4] * k, 0.004, 0.1); o.connect(og); out(og, P[3]); o.start(t); o.stop(t + 0.15);
    },

    owl() {                                              // dos "uh-uuh" lejanos
      [0, 0.75].forEach((d, i) => {
        const t = c.currentTime + d, o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(i ? 330 : 390, t); o.frequency.exponentialRampToValueAtTime(i ? 290 : 350, t + 0.4);
        env(g, t, 0.1, 0.06, 0.5); o.connect(g); out(g, 0.5); o.start(t); o.stop(t + 0.6);
      });
    },
    sparkle() {                                          // campanilla suave: llama la atención hacia el sobre
      [1760, 2349].forEach((f, i) => {
        const t = c.currentTime + i * 0.12, o = c.createOscillator(), g = c.createGain();
        o.frequency.value = f; env(g, t, 0.05, 0.01, 1.4); o.connect(g); out(g, 0.3); o.start(t); o.stop(t + 1.5);
      });
    },
    paper() {                                            // papel que se abre
      const t = c.currentTime, s = noise(), hp = c.createBiquadFilter(), g = c.createGain();
      hp.type = 'highpass'; hp.frequency.value = 2600;
      g.gain.setValueAtTime(0.0001, t);
      [0, 0.18, 0.4, 0.55].forEach((d, i) => { g.gain.linearRampToValueAtTime(0.09 - i * 0.012, t + d + 0.03); g.gain.linearRampToValueAtTime(0.01, t + d + 0.12); });
      g.gain.linearRampToValueAtTime(0.0001, t + 0.9);
      s.connect(hp); hp.connect(g); out(g); s.start(t, Math.random(), 1);
    },
    gust() {                                             // ráfaga de viento fuerte
      const t = c.currentTime, s = noise(), bp = c.createBiquadFilter(), g = c.createGain();
      bp.type = 'bandpass'; bp.frequency.setValueAtTime(500, t); bp.frequency.linearRampToValueAtTime(1100, t + 1);
      env(g, t, 0.4, 0.8, 2.2); s.connect(bp); bp.connect(g); out(g); s.start(t, 0, 2.3);
    },
    click() {                                            // la luz se apaga
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = 1700; env(g, t, 0.06, 0.002, 0.05); o.connect(g); out(g, 0.2); o.start(t); o.stop(t + 0.08);
    },
    boom() {                                             // golpe grave de la puerta que retumba
      const t = c.currentTime, o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(34, t + 1.6);
      env(g, t, 0.7, 0.01, 2.2); o.connect(g); out(g, 0.9); o.start(t); o.stop(t + 2.3);
      const s = noise(), l = c.createBiquadFilter(), ng = c.createGain();
      l.type = 'lowpass'; l.frequency.value = 320; env(ng, t, 0.5, 0.005, 0.6); s.connect(l); l.connect(ng); out(ng, 0.8); s.start(t, 0, 0.7);
    },
    creak(dur = 5) {                                     // puerta antigua y pesada
      const t = c.currentTime, o = c.createOscillator(), o2 = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
      o.type = 'sawtooth'; o.frequency.setValueAtTime(92, t); o.frequency.linearRampToValueAtTime(46, t + dur);
      o2.type = 'square'; o2.frequency.setValueAtTime(131, t); o2.frequency.linearRampToValueAtTime(70, t + dur);
      f.type = 'lowpass'; f.frequency.value = 420;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.11, t + 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(f); o2.connect(f); f.connect(g); out(g, 0.4); o.start(t); o2.start(t); o.stop(t + dur); o2.stop(t + dur);
    },

    // Volumen del ambiente de las salas (audio.master): en silencio durante la intro y vuelve al entrar en la sala 1.
    muteRooms() { audio.master.gain.cancelScheduledValues(c.currentTime); audio.master.gain.setValueAtTime(0, c.currentTime); },
    restoreRooms(v = 0.8, secs = 3) { const g = audio.master.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(g.value, c.currentTime); g.linearRampToValueAtTime(v, c.currentTime + secs); },
  };
}
