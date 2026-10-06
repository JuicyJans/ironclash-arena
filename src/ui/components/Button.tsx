import type { ComponentChildren, JSX } from 'preact';
import { uiClick, uiHover } from '../../audio/sfx';
import css from './components.module.css';

type Props = Omit<JSX.HTMLAttributes<HTMLButtonElement>, 'size'> & {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'small' | 'normal' | 'big';
  children: ComponentChildren;
  disabled?: boolean;
};

/** Angled industrial button with hover/click sounds. */
export function Button({
  variant = 'default',
  size = 'normal',
  class: cls,
  onClick,
  onMouseEnter,
  children,
  ...rest
}: Props) {
  const classes = [css.btn, variant !== 'default' && css[variant], size !== 'normal' && css[size], cls]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      class={classes}
      onMouseEnter={(e) => {
        uiHover();
        onMouseEnter?.(e);
      }}
      onClick={(e) => {
        uiClick();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
