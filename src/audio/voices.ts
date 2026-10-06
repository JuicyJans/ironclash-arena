import { audio } from './audioManager';

/**
 * Continuous sound that follows game state: motor hum (pitch follows speed),
 * spinner whine (pitch follows rpm), saw grind and flame roar.
 */
export class ContinuousVoice {
  private osc: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private noise: AudioBufferSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private gain: GainNode | null = null;

  constructor(private kind: 'motor' | 'whine' | 'grind' | 'roar') {}

  private start(): boolean {
    const ctx = audio.ctx;
    const dest = audio.bus('sfx');
    if (!ctx || !dest || ctx.state !== 'running') return false;
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.filter = ctx.createBiquadFilter();
    this.filter.connect(this.gain).connect(dest);
    if (this.kind === 'grind' || this.kind === 'roar') {
      const buf = audio.noiseBuffer();
      if (!buf) return false;
      this.noise = ctx.createBufferSource();
      this.noise.buffer = buf;
      this.noise.loop = true;
      this.filter.type = this.kind === 'roar' ? 'lowpass' : 'bandpass';
      this.filter.frequency.value = this.kind === 'roar' ? 700 : 3200;
      this.filter.Q.value = this.kind === 'roar' ? 0.7 : 4;
      this.noise.connect(this.filter);
      this.noise.start();
    } else {
      this.osc = ctx.createOscillator();
      this.osc.type = this.kind === 'motor' ? 'sawtooth' : 'triangle';
      this.osc2 = ctx.createOscillator();
      this.osc2.type = 'square';
      this.filter.type = 'lowpass';
      this.filter.frequency.value = this.kind === 'motor' ? 420 : 4000;
      this.osc.connect(this.filter);
      const g2 = ctx.createGain();
      g2.gain.value = 0.25;
      this.osc2.connect(g2).connect(this.filter);
      this.osc.start();
      this.osc2.start();
    }
    return true;
  }

  /** level: 0..1 intensity (speed or rpm). volume: 0..1. */
  set(level: number, volume: number): void {
    if (!this.gain && volume > 0.001 && !this.start()) return;
    const ctx = audio.ctx;
    if (!ctx || !this.gain) return;
    const t = ctx.currentTime;
    this.gain.gain.setTargetAtTime(volume, t, 0.06);
    if (this.kind === 'motor') {
      this.osc?.frequency.setTargetAtTime(48 + level * 90, t, 0.05);
      this.osc2?.frequency.setTargetAtTime(24 + level * 45, t, 0.05);
    } else if (this.kind === 'whine') {
      this.osc?.frequency.setTargetAtTime(160 + level * 1300, t, 0.08);
      this.osc2?.frequency.setTargetAtTime(80 + level * 650, t, 0.08);
    } else if (this.kind === 'grind') {
      this.filter?.frequency.setTargetAtTime(1800 + level * 2600, t, 0.05);
    }
  }

  stop(): void {
    const ctx = audio.ctx;
    if (ctx && this.gain) this.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
    const nodes = [this.osc, this.osc2, this.noise];
    const gain = this.gain;
    setTimeout(() => {
      for (const n of nodes) {
        try {
          n?.stop();
          n?.disconnect();
        } catch {
          /* already stopped */
        }
      }
      gain?.disconnect();
    }, 200);
    this.osc = this.osc2 = this.noise = null;
    this.gain = null;
  }
}
