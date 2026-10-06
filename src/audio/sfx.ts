import { audio, type Bus } from './audioManager';

/** Procedural sound effects. Every function is a no-op until audio is unlocked. */

const rnd = (min: number, max: number) => min + Math.random() * (max - min);
/** ±8 % random pitch so repeated hits never sound identical. */
const vary = () => 1 + rnd(-0.08, 0.08);

function env(g: GainNode, t: number, attack: number, peak: number, decay: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noiseSource(ctx: AudioContext): AudioBufferSourceNode | null {
  const buf = audio.noiseBuffer();
  if (!buf) return null;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  src.loopStart = Math.random();
  return src;
}

function out(bus: Bus): { ctx: AudioContext; dest: GainNode } | null {
  const ctx = audio.ctx;
  const dest = audio.bus(bus);
  if (!ctx || !dest || ctx.state !== 'running') return null;
  return { ctx, dest };
}

/** Metal-on-metal impact. `variant` picks one of several timbres. */
export function clang(intensity: number, variant = Math.floor(Math.random() * 3)): void {
  const o = out('sfx');
  if (!o) return;
  const { ctx, dest } = o;
  const t = ctx.currentTime;
  const vol = Math.min(1, 0.25 + intensity * 0.75);
  const p = vary();
  const partials = [
    [420, 1130, 1810, 2630],
    [310, 870, 1460, 2210],
    [560, 1420, 2350, 3300],
  ][variant % 3]!;
  for (const [i, f] of partials.entries()) {
    const osc = ctx.createOscillator();
    osc.type = i === 0 ? 'triangle' : 'sine';
    osc.frequency.value = f * p;
    const g = ctx.createGain();
    env(g, t, 0.002, (vol * 0.22) / (i + 1), 0.18 + intensity * 0.5 - i * 0.04);
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + 0.9);
  }
  const n = noiseSource(ctx);
  if (n) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400 * p;
    bp.Q.value = 0.8;
    const g = ctx.createGain();
    env(g, t, 0.001, vol * 0.5, 0.08);
    n.connect(bp).connect(g).connect(dest);
    n.start(t);
    n.stop(t + 0.15);
  }
  thud(intensity * 0.7);
}

export function thud(intensity: number): void {
  const o = out('sfx');
  if (!o) return;
  const { ctx, dest } = o;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(120 * vary(), t);
  osc.frequency.exponentialRampToValueAtTime(38, t + 0.25);
  const g = ctx.createGain();
  env(g, t, 0.003, 0.6 * Math.min(1, intensity + 0.2), 0.3);
  osc.connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + 0.4);
}

/** Filtered noise burst: pneumatic hiss, whoosh, steam. */
export function hiss(duration = 0.35, freq = 3000, volume = 0.35, bus: Bus = 'sfx'): void {
  const o = out(bus);
  if (!o) return;
  const { ctx, dest } = o;
  const n = noiseSource(ctx);
  if (!n) return;
  const t = ctx.currentTime;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass';
  f.frequency.value = freq * vary();
  const g = ctx.createGain();
  env(g, t, 0.01, volume, duration);
  n.connect(f).connect(g).connect(dest);
  n.start(t);
  n.stop(t + duration + 0.1);
}

export function whoosh(): void {
  const o = out('sfx');
  if (!o) return;
  const { ctx, dest } = o;
  const n = noiseSource(ctx);
  if (!n) return;
  const t = ctx.currentTime;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.5;
  f.frequency.setValueAtTime(300, t);
  f.frequency.exponentialRampToValueAtTime(2200, t + 0.25);
  const g = ctx.createGain();
  env(g, t, 0.05, 0.4, 0.25);
  n.connect(f).connect(g).connect(dest);
  n.start(t);
  n.stop(t + 0.4);
}

export function beep(
  freq: number,
  duration = 0.12,
  volume = 0.25,
  type: OscillatorType = 'square',
  bus: Bus = 'sfx',
): void {
  const o = out(bus);
  if (!o) return;
  const { ctx, dest } = o;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3000;
  const g = ctx.createGain();
  env(g, t, 0.005, volume, duration);
  osc.connect(lp).connect(g).connect(dest);
  osc.start(t);
  osc.stop(t + duration + 0.05);
}

export const hazardWarning = () => {
  beep(880, 0.08, 0.16);
  setTimeout(() => beep(660, 0.08, 0.16), 110);
};

export function explosion(): void {
  const o = out('sfx');
  if (!o) return;
  const { ctx, dest } = o;
  const n = noiseSource(ctx);
  if (!n) return;
  const t = ctx.currentTime;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(2000, t);
  f.frequency.exponentialRampToValueAtTime(80, t + 1.2);
  const g = ctx.createGain();
  env(g, t, 0.005, 0.9, 1.2);
  n.connect(f).connect(g).connect(dest);
  n.start(t);
  n.stop(t + 1.4);
  thud(1);
}

/** Crowd reaction: swelling band-limited noise with tremolo. */
export function crowd(intensity: number): void {
  const o = out('sfx');
  if (!o) return;
  const { ctx, dest } = o;
  const n = noiseSource(ctx);
  if (!n) return;
  const t = ctx.currentTime;
  const dur = 1.2 + intensity * 1.5;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 900;
  f.Q.value = 0.6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18 + intensity * 0.25, t + 0.25);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 7;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.06;
  lfo.connect(lfoGain).connect(g.gain);
  n.connect(f).connect(g).connect(dest);
  n.start(t);
  lfo.start(t);
  n.stop(t + dur);
  lfo.stop(t + dur);
}

export const uiClick = () => beep(1400, 0.04, 0.12, 'triangle', 'ui');
export const uiHover = () => beep(2100, 0.02, 0.04, 'sine', 'ui');
export const uiConfirm = () => {
  beep(880, 0.06, 0.14, 'triangle', 'ui');
  setTimeout(() => beep(1320, 0.09, 0.14, 'triangle', 'ui'), 60);
};
export const uiError = () => beep(220, 0.15, 0.15, 'sawtooth', 'ui');
export const coin = () => {
  beep(1568, 0.05, 0.1, 'square', 'ui');
  setTimeout(() => beep(2093, 0.08, 0.1, 'square', 'ui'), 50);
};
export const countdownBeep = (final: boolean) => beep(final ? 1320 : 660, final ? 0.4 : 0.15, 0.25, 'square');
export const buzzer = () => beep(110, 0.9, 0.3, 'sawtooth');
