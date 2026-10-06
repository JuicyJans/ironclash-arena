import { useEffect, useRef } from 'preact/hooks';
import type { RobotBuild } from '../../config/types';
import { PAINT_SCALE, paintRobot } from '../../game/render/robotPainter';

const TILT = 0.62; // vertical squash for the 3/4 view
const THICKNESS = 12; // extrusion layers (px) for the side walls
const AUTO_SPIN = 0.35; // rad/s

/** Rotatable pseudo-3D preview of a robot (drag, arrow keys, or auto-rotation). */
export function RobotPreview({
  build,
  label,
  height = 260,
}: {
  build: RobotBuild;
  label: string;
  height?: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const yaw = useRef(-0.6);
  const drag = useRef<{ x: number; yaw: number } | null>(null);
  const idle = useRef(0);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const art = paintRobot(build);
    let raf = 0;
    let last = performance.now();
    let spin = 0;

    const draw = (now: number) => {
      const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
      last = now;
      idle.current += dt;
      if (!drag.current && idle.current > 1.5) yaw.current += AUTO_SPIN * dt;
      spin += dt * 25;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = cv.clientWidth;
      const h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr)) {
        cv.width = Math.round(w * dpr);
        cv.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const zoom = Math.min(w / (art.L * 1.55), h / (art.W * 2.1));
      const cx = w / 2;
      const cy = h / 2 + 4;

      // Floor glow and contact shadow.
      const g = ctx.createRadialGradient(cx, cy + 20, 4, cx, cy + 20, w * 0.45);
      g.addColorStop(0, 'rgba(34,211,238,0.22)');
      g.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 22, w * 0.42, w * 0.42 * TILT * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();

      const layer = (
        img: HTMLCanvasElement,
        lift: number,
        ox = 0,
        oy = 0,
        rot = 0,
        px?: number,
        py?: number,
      ) => {
        ctx.save();
        ctx.translate(cx, cy - lift);
        ctx.scale(zoom, zoom * TILT);
        ctx.rotate(yaw.current);
        ctx.translate(ox, oy);
        ctx.rotate(rot);
        const s = 1 / PAINT_SCALE;
        ctx.scale(s, s);
        ctx.drawImage(img, -(px ?? img.width / 2), -(py ?? img.height / 2));
        ctx.restore();
      };

      ctx.filter = 'blur(6px)';
      ctx.globalAlpha = 0.5;
      layer(art.silhouette, -10);
      ctx.filter = 'none';
      for (let i = 0; i < THICKNESS; i++) {
        ctx.globalAlpha = 1;
        ctx.filter = `brightness(${0.25 + (i / THICKNESS) * 0.25})`;
        layer(art.silhouette, i);
      }
      ctx.filter = 'none';
      layer(art.drive[Math.abs(Math.floor(spin / 6)) % art.drive.length]!, THICKNESS);
      layer(art.body, THICKNESS + 2);
      const { base, moving, blur } = art.weapon;
      if (base) layer(base.canvas, THICKNESS + 4, base.localX, base.localY, 0, base.pivotX, base.pivotY);
      if (moving) {
        const rotating = !!blur && moving.canvas.width === moving.canvas.height;
        layer(
          moving.canvas,
          THICKNESS + 5,
          moving.localX,
          moving.localY,
          rotating ? spin : 0,
          moving.pivotX,
          moving.pivotY,
        );
      }
      ctx.globalCompositeOperation = 'lighter';
      layer(art.glow, THICKNESS + 3);
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [build]);

  return (
    <canvas
      ref={canvas}
      style={{
        width: '100%',
        height: `${height / 16}em`,
        cursor: 'grab',
        touchAction: 'none',
        display: 'block',
      }}
      role="img"
      aria-label={label}
      tabIndex={0}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, yaw: yaw.current };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        yaw.current = drag.current.yaw + (e.clientX - drag.current.x) * 0.01;
        idle.current = 0;
      }}
      onPointerUp={() => (drag.current = null)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') yaw.current -= 0.2;
        else if (e.key === 'ArrowRight') yaw.current += 0.2;
        else return;
        idle.current = 0;
        e.preventDefault();
      }}
    />
  );
}
