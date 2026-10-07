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
  }
  pause() { if (this.ctx) this.ctx.suspend(); }

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
      if (c.state !== 'running' || Math.random() > 0.5) return;
      const f = 2000 + Math.random() * 1500;
      for (let i = 0; i < 3; i++) this._tone(f, { dur: 0.08, vol: 0.03, delay: i * 0.11, slideTo: f * 1.3 });
    }, 2500);
    setInterval(() => {                                                // melodía suave
      if (c.state !== 'running' || Math.random() > 0.55) return;
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
