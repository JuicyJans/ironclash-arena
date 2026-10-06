import { makeCanvas } from './colors';

/** Particle and glow textures. */
export function paintParticleTextures(): Record<string, HTMLCanvasElement> {
  const radial = (size: number, stops: [number, string][]) => {
    const [c, ctx] = makeCanvas(size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, col] of stops) g.addColorStop(o, col);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return c;
  };
  const [spark, sctx] = makeCanvas(16, 4);
  const sg = sctx.createLinearGradient(0, 0, 16, 0);
  sg.addColorStop(0, 'rgba(255,200,80,0)');
  sg.addColorStop(1, 'rgba(255,255,230,1)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 16, 4);
  const [shard, dctx] = makeCanvas(8, 6);
  dctx.fillStyle = '#9aa1ab';
  dctx.beginPath();
  dctx.moveTo(0, 6);
  dctx.lineTo(3, 0);
  dctx.lineTo(8, 4);
  dctx.closePath();
  dctx.fill();
  const [ring, rctx] = makeCanvas(64, 64);
  rctx.strokeStyle = 'rgba(255,255,255,0.9)';
  rctx.lineWidth = 4;
  rctx.beginPath();
  rctx.arc(32, 32, 28, 0, Math.PI * 2);
  rctx.stroke();
  return {
    'fx:spark': spark,
    'fx:shard': shard,
    'fx:ring': ring,
    'fx:dot': radial(8, [
      [0, 'rgba(255,255,255,1)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    'fx:smoke': radial(48, [
      [0, 'rgba(200,200,200,0.55)'],
      [0.6, 'rgba(160,160,160,0.25)'],
      [1, 'rgba(120,120,120,0)'],
    ]),
    'fx:fire': radial(32, [
      [0, 'rgba(255,250,210,1)'],
      [0.35, 'rgba(255,170,50,0.9)'],
      [1, 'rgba(255,60,0,0)'],
    ]),
    'fx:glow': radial(128, [
      [0, 'rgba(255,255,255,0.9)'],
      [0.4, 'rgba(255,255,255,0.35)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
    'fx:scorch': radial(64, [
      [0, 'rgba(0,0,0,0.55)'],
      [0.7, 'rgba(10,8,6,0.25)'],
      [1, 'rgba(0,0,0,0)'],
    ]),
  };
}
