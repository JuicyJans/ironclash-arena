import type { ComponentChildren, JSX } from 'preact';
import css from './components.module.css';

export function Panel({
  title,
  children,
  class: cls,
  style,
  ...rest
}: { title?: ComponentChildren; children: ComponentChildren } & Omit<
  JSX.HTMLAttributes<HTMLElement>,
  'title'
>) {
  return (
    <section class={[css.panel, cls].filter(Boolean).join(' ')} style={style} {...rest}>
      {title && <h3 class={css.panelTitle}>{title}</h3>}
      {children}
    </section>
  );
}
