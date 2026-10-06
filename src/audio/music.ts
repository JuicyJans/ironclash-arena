import { audio } from './audioManager';

export type Track = 'menu' | 'garage' | 'battle' | 'none';

interface TrackDef {
  bpm: number;
  root: number; // MIDI note
  progression: number[]; // semitone offsets per bar
  kick: number[]; // 16-step patterns (1 = hit)
  snare: number[];
  hat: number[];
  bass: number[]; // scale degree offsets per step (-1 = rest)
  lead: number[];
}

const TRACKS: Record<Exclude<Track, 'none'>, TrackDef> = {
  battle: {
    bpm: 132,
    root: 40, // E2
    progression: [0, 0, 3, -2],
    kick: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1],
    bass: [0, -1, 0, 0, 12, -1, 0, -1, 0, -1, 0, 3, 5, -1, 3, -1],
    lead: [12, -1, 15, -1, 19, -1, 17, -1, 15, -1, 12, -1, 10, -1, 12, -1],
  },
  menu: {
    bpm: 96,
    root: 45, // A2
    progression: [0, -4, -7, -2],
    kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0],
    bass: [0, -1, -1, -1, -1, -1, 7, -1, 0, -1, -1, -1, 12, -1, -1, -1],
    lead: [12, -1, -1, 15, -1, -1, 19, -1, -1, 17, -1, -1, 15, -1, -1, -1],
  },
  garage: {
    bpm: 104,
    root: 43, // G2
    progression: [0, 5, -2, 3],
    kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0],
    snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    bass: [0, -1, 0, -1, -1, 7, -1, 0, -1, -1, 0, -1, 10, -1, 7, -1],
    lead: [-1, -1, 12, -1, -1, -1, 14, -1, -1, -1, 15, -1, -1, -1, 14, -1],
  },
};

const LOOKAHEAD = 0.15;
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

/** Procedural step sequencer with intensity layers. */
class MusicPlayer {
  private track: Track = 'none';
  private step = 0;
  private bar = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private intensity = 0.5;
  private out: GainNode | null = null;

  play(track: Track): void {
    if (track === this.track) return;
    this.track = track;
    this.fadeOut();
    if (track === 'none') return;
    audio.onUnlock(() => this.start());
  }

  setIntensity(v: number): void {
    this.intensity = Math.max(0, Math.min(1, v));
  }

  private start(): void {
    const ctx = audio.ctx;
    const bus = audio.bus('music');
    if (!ctx || !bus || this.track === 'none') return;
    this.out = ctx.createGain();
    this.out.gain.setValueAtTime(0.0001, ctx.currentTime);
    this.out.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 1.2);
    this.out.connect(bus);
    this.step = 0;
    this.bar = 0;
    this.nextTime = ctx.currentTime + 0.05;
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), 25);
  }

  private fadeOut(): void {
    const ctx = audio.ctx;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const out = this.out;
    this.out = null;
    if (ctx && out) {
      out.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
      setTimeout(() => out.disconnect(), 1500);
    }
  }

  private schedule(): void {
    const ctx = audio.ctx;
    if (!ctx || !this.out || this.track === 'none') return;
    const def = TRACKS[this.track];
    const stepDur = 60 / def.bpm / 4;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      this.playStep(def, this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar = (this.bar + 1) % (def.progression.length * 2);
    }
  }

  private playStep(def: TrackDef, s: number, t: number, dur: number): void {
    const I = this.intensity;
    const chord = def.root + (def.progression[Math.floor(this.bar / 2) % def.progression.length] ?? 0);
    if (def.kick[s]) this.kick(t);
    if (def.snare[s] && I > 0.25) this.snare(t);
    if (def.hat[s] && I > 0.35) this.hat(t, s % 4 === 2 ? 0.07 : 0.04);
    const b = def.bass[s] ?? -1;
    if (b >= 0) this.synth(midi(chord + b), t, dur * 1.8, 'sawtooth', 0.16, 600 + I * 900);
    const l = def.lead[s] ?? -1;
    if (l >= 0 && I > 0.65) this.synth(midi(chord + l + 12), t, dur * 1.5, 'square', 0.05, 2400);
    if (s === 0 && this.bar % 2 === 0) this.synth(midi(chord + 12), t, dur * 16, 'triangle', 0.05, 1200);
    if (I > 0.85 && s % 2 === 1) this.hat(t, 0.025);
  }

  private kick(t: number): void {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(this.out!);
    o.start(t);
    o.stop(t + 0.3);
  }

  private noise(t: number, dur: number, type: BiquadFilterType, freq: number, vol: number): void {
    const ctx = audio.ctx!;
    const buf = audio.noiseBuffer();
    if (!buf) return;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loopStart = Math.random();
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.out!);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  private snare(t: number): void {
    this.noise(t, 0.16, 'bandpass', 1800, 0.35);
    this.synth(190, t, 0.08, 'triangle', 0.15, 2000);
  }

  private hat(t: number, vol: number): void {
    this.noise(t, 0.05, 'highpass', 7000, vol);
  }

  private synth(
    freq: number,
    t: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    cutoff: number,
  ): void {
    const ctx = audio.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.out!);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
}

export const music = new MusicPlayer();
