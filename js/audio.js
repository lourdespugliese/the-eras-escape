// audio.js — Sonido 100% sintetizado con Web Audio (no necesita archivos .mp3).
// Más adelante podés reemplazar estos métodos por AudioLoader/Audio de Three.js con archivos reales.
export class AudioManager {
  constructor() { this.ctx = null; }

  // Debe llamarse desde un gesto del usuario (click) por reglas del navegador.
  start() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.8;
      this.master.connect(this.ctx.destination);
      this._ambient();
    }
    this.ctx.resume();
    if (this._trackWasPlaying) { this._trackWasPlaying = false; this.track.play().catch(() => {}); }   // reanuda la canción tras la pausa
  }
  pause() {
    if (this.ctx) this.ctx.suspend();
    if (this.track && !this.track.paused) { this.track.pause(); this._trackWasPlaying = true; }
  }

  // ---- Música externa (archivo de audio real, p. ej. el toca discos) ----
  // Devuelve una promesa: true si empezó a sonar, false si el archivo no existe o el navegador lo bloqueó.
  playTrack(url, volume = 0.7) {
    this.stopTrack();
    return new Promise((resolve) => {
      const a = new Audio(url); a.volume = volume;
      a.addEventListener('ended', () => { if (this.track === a) this.track = null; });
      a.play().then(() => { this.track = a; resolve(true); }).catch(() => resolve(false));
    });
  }
  stopTrack() { if (this.track) { this.track.pause(); this.track = null; } this._trackWasPlaying = false; this._synthStop(); }
  trackPlaying() { return (!!this.track && !this.track.paused) || !!(this.synth && this.ctx && this.ctx.state === 'running'); }

  // ---- Tema original synthwave (100% sintetizado, sin archivos ni derechos de autor) ----
  // La Web Audio se programa "por adelantado": cada 100 ms se agendan las notas de los próximos 0.4 s.
  // Progresión Am - F - C - G (4 compases, 64 pasos de semicorchea) en bucle a 104 BPM.
  playSynth() {
    if (!this.ctx) return false;
    this.stopTrack();
    const c = this.ctx, step = 60 / 104 / 4;
    const out = c.createGain(); out.gain.value = 0.9; out.connect(this.master);
    const dly = c.createDelay(1); dly.delayTime.value = step * 3;             // eco de corchea con puntillo
    const fb = c.createGain(); fb.gain.value = 0.35; const wet = c.createGain(); wet.gain.value = 0.3;
    dly.connect(fb); fb.connect(dly); dly.connect(wet); wet.connect(out);
    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // Una voz: oscilador -> filtro pasabajos -> envolvente -> salida (y eco opcional).
    const voice = (f, t, dur, { type = 'sawtooth', vol = 0.1, lp = 2000, atk = 0.01, echo = false, detune = 0 } = {}) => {
      const o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
      o.type = type; o.frequency.value = f; o.detune.value = detune; fl.type = 'lowpass'; fl.frequency.value = lp;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + atk); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(fl); fl.connect(g); g.connect(out); if (echo) g.connect(dly);
      o.start(t); o.stop(t + dur + 0.05);
    };
    const hit = (t, dur, hp, vol) => {                                         // ruido filtrado: caja y hi-hat
      const sr = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
      sr.buffer = nb; fl.type = 'highpass'; fl.frequency.value = hp;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      sr.connect(fl); fl.connect(g); g.connect(out); sr.start(t); sr.stop(t + dur + 0.02);
    };
    const kick = (t) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.55, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.35);
    };

    const ROOT = [55, 43.65, 65.41, 49];                                       // A1 F1 C2 G1
    const CHORD = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]];
    const LEAD = [[0, 659.25, 6], [8, 587.33, 2], [10, 523.25, 6], [16, 523.25, 6], [24, 440, 2], [26, 523.25, 6],
                  [32, 659.25, 4], [36, 783.99, 4], [40, 659.25, 6], [48, 587.33, 6], [56, 493.88, 2], [58, 587.33, 6]];
    const play = (n, t) => {
      const bar = (n >> 4) & 3, st = n & 15, ch = CHORD[bar];
      if (st % 4 === 0) kick(t);
      if (st === 4 || st === 12) hit(t, 0.18, 1500, 0.2);
      if (st % 2 === 0) hit(t, 0.04, 7000, st % 4 === 2 ? 0.07 : 0.04);
      if (st % 2 === 0) voice(ROOT[bar] * (st % 4 === 2 ? 2 : 1), t, step * 1.8, { vol: 0.22, lp: 450 });          // bajo
      voice(ch[[0, 1, 2, 1][st & 3]] * (((st >> 2) & 1) ? 2 : 1), t, step * 0.9, { type: 'square', vol: 0.035, lp: 1800, echo: true }); // arpegio
      if (st === 0) ch.forEach((f, i) => voice(f, t, step * 16, { vol: 0.035, lp: 900, atk: 0.4, detune: (i - 1) * 8 })); // pad
      LEAD.forEach(([ls, f, d]) => { if (ls === (n & 63)) voice(f, t, step * d * 0.95, { vol: 0.06, lp: 2600, atk: 0.03, echo: true }); }); // melodía
    };

    let n = 0; const t0 = c.currentTime + 0.1;
    const timer = setInterval(() => { while (t0 + n * step < c.currentTime + 0.4) { play(n & 63, t0 + n * step); n++; } }, 100);
    this.synth = { out, timer };
    return true;
  }
  _synthStop() {
    if (!this.synth) return;
    const { out, timer } = this.synth; this.synth = null;
    clearInterval(timer);
    const t = this.ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 0.3);
    setTimeout(() => out.disconnect(), 600);
  }

  // Una nota simple con envolvente (ataque rápido, caída exponencial).
  _tone(freq, { type = 'sine', dur = 0.5, vol = 0.2, delay = 0, slideTo = null } = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  // Ambiente: viento (ruido filtrado), pájaros y música instrumental suave.
  _ambient() {
    const c = this.ctx;
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 500; bp.Q.value = 0.6;
    const wind = c.createGain(); wind.gain.value = 0.05;
    const lfo = c.createOscillator(); lfo.frequency.value = 0.12;      // el viento "respira"
    const lfoGain = c.createGain(); lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(wind.gain);
    src.connect(bp).connect(wind).connect(this.master);
    src.start(); lfo.start();

    const scale = [261.6, 293.7, 329.6, 392, 440, 523.3];             // pentatónica de Do
    setInterval(() => {                                                // pájaros
      if (c.state !== 'running' || this.trackPlaying() || Math.random() > 0.5) return;
      const f = 2000 + Math.random() * 1500;
      for (let i = 0; i < 3; i++) this._tone(f, { dur: 0.08, vol: 0.03, delay: i * 0.11, slideTo: f * 1.3 });
    }, 2500);
    setInterval(() => {                                                // melodía suave
      if (c.state !== 'running' || this.trackPlaying() || Math.random() > 0.55) return;
      this._tone(scale[Math.floor(Math.random() * scale.length)], { type: 'triangle', dur: 1.8, vol: 0.05 });
    }, 900);
  }

  // ---- Efectos ----
  note(freq) { this._tone(freq, { type: 'triangle', dur: 0.9, vol: 0.25 }); this._tone(freq * 2, { dur: 0.6, vol: 0.06 }); }
  error() { this._tone(220, { type: 'sawtooth', dur: 0.45, vol: 0.12, slideTo: 90 }); }
  success() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this._tone(f, { type: 'triangle', dur: 1.4, vol: 0.18, delay: i * 0.16 }));
    [523.25, 659.25, 783.99].forEach((f) => this._tone(f, { dur: 2.2, vol: 0.12, delay: 0.9 }));
  }
  reward() { [880, 1174.7, 1568].forEach((f, i) => this._tone(f, { type: 'triangle', dur: 0.5, vol: 0.18, delay: i * 0.09 })); }
  chord() { [196, 246.9, 293.7, 392].forEach((f, i) => this._tone(f, { type: 'triangle', dur: 1.6, vol: 0.12, delay: i * 0.04 })); }
  chime() { this._tone(1568, { dur: 0.7, vol: 0.07 }); this._tone(2093, { dur: 0.7, vol: 0.04, delay: 0.1 }); }
  creak() { this._tone(75, { type: 'sawtooth', dur: 3.2, vol: 0.1, slideTo: 42 }); this._tone(110, { type: 'square', dur: 3, vol: 0.03, slideTo: 60 }); }
}