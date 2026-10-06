import type { ComponentChildren } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import css from './components.module.css';
import { Panel } from './Panel';

/** Accessible modal dialog with focus trap and Escape to close. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose?: () => void;
  children: ComponentChildren;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      'button, [href], input, select, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        e.stopPropagation();
        onClose();
      }
      if (e.key !== 'Tab' || !ref.current) return;
      const items = [
        ...ref.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input, select, [tabindex]:not([tabindex="-1"])',
        ),
      ];
      if (!items.length) return;
      const firstEl = items[0]!;
      const lastEl = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div class={css.backdrop} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
      <Panel title={title} class={css.modal}>
        {children}
      </Panel>
    </div>
  );
}
