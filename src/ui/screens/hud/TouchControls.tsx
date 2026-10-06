import { useEffect, useRef, useState } from 'preact/hooks';
import { resetTouch, touchState } from '../../../game/input/touch';
import { t } from '../../../i18n';
import css from './hud.module.css';

type Key = 'weapon' | 'special' | 'boost';

/** Virtual joystick + buttons for phones/tablets. Writes into the shared touch state. */
export function TouchControls() {
  const stick = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [held, setHeld] = useState({ weapon: false, special: false, boost: false });
  useEffect(() => {
    touchState.active = true;
    return () => {
      touchState.active = false;
      resetTouch();
    };
  }, []);

  const move = (e: PointerEvent) => {
    const el = stick.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    const ny = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    setKnob({ x: nx, y: ny });
    touchState.steer = Math.abs(nx) < 0.15 ? 0 : nx;
    touchState.throttle = Math.abs(ny) < 0.15 ? 0 : -ny;
  };
  const release = () => {
    setKnob({ x: 0, y: 0 });
    touchState.steer = 0;
    touchState.throttle = 0;
  };
  const set = (key: Key, on: boolean) => {
    touchState[key] = on;
    setHeld((h) => ({ ...h, [key]: on }));
  };
  const btn = (key: Key, main = false) => (
    <button
      type="button"
      class={`${css.tbtn} ${main ? css.tbtnMain : ''}`}
      data-on={held[key]}
      aria-label={t(`controls.${key}`)}
      onPointerDown={(e) => {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        set(key, true);
      }}
      onPointerUp={() => set(key, false)}
      onPointerCancel={() => set(key, false)}
    >
      {t(`controls.${key}`)}
    </button>
  );
  return (
    <div class={css.touch}>
      <div
        ref={stick}
        class={css.stick}
        role="application"
        aria-label={t('controls.drive')}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          move(e);
        }}
        onPointerMove={(e) => e.buttons && move(e)}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <div class={css.knob} style={{ transform: `translate(${knob.x * 3.2}em, ${knob.y * 3.2}em)` }} />
      </div>
      <div class={css.buttons}>
        {btn('weapon', true)}
        {btn('special')}
        {btn('boost')}
      </div>
    </div>
  );
}
