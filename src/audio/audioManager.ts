/** Web Audio graph with separate volume buses. Starts only after a user gesture (autoplay rules). */
export type Bus = 'music' | 'sfx' | 'ui';

export interface Volumes {
  master: number;
  music: number;
  sfx: number;
  ui: number;
}

class AudioManager {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private buses = {} as Record<Bus, GainNode>;
  private volumes: Volumes = { master: 0.8, music: 0.55, sfx: 0.8, ui: 0.6 };
  private noise: AudioBuffer | null = null;
  private unlockListeners: (() => void)[] = [];
  private compressor!: DynamicsCompressorNode;

  get ready(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** Installs one-shot listeners that create/resume the context on the first interaction. */
  installUnlock(): void {
    const unlock = () => {
      this.ensure();
      void this.ctx?.resume();
      if (this.ready) {
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
        window.removeEventListener('touchstart', unlock);
        for (const l of this.unlockListeners) l();
        this.unlockListeners = [];
      }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  onUnlock(fn: () => void): void {
    if (this.ready) fn();
    else this.unlockListeners.push(fn);
  }

  private ensure(): void {
    if (this.ctx) return;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -14;
    this.compressor.ratio.value = 4;
    this.master = ctx.createGain();
    this.master.connect(this.compressor);
    this.compressor.connect(ctx.destination);
    for (const b of ['music', 'sfx', 'ui'] as Bus[]) {
      const g = ctx.createGain();
      g.connect(this.master);
      this.buses[b] = g;
    }
    this.applyVolumes();
  }

  setVolumes(v: Volumes): void {
    this.volumes = { ...v };
    this.applyVolumes();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volumes.master, t, 0.05);
    for (const b of ['music', 'sfx', 'ui'] as Bus[])
      this.buses[b].gain.setTargetAtTime(this.volumes[b], t, 0.05);
  }

  bus(b: Bus): GainNode | null {
    return this.ctx ? this.buses[b] : null;
  }

  /** Shared white-noise buffer (2 s). */
  noiseBuffer(): AudioBuffer | null {
    if (!this.ctx) return null;
    if (!this.noise) {
      const len = this.ctx.sampleRate * 2;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    void this.ctx?.resume();
  }
}

export const audio = new AudioManager();
