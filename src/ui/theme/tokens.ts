/** Design tokens shared by DOM UI and the Phaser renderer. Mirrors tokens.css. */
export const colors = {
  graphite: '#121418',
  graphite2: '#1a1d23',
  panel: '#20242c',
  panelHi: '#2a2f39',
  steel: '#8a93a3',
  steelLight: '#c4cad4',
  text: '#eef1f5',
  textDim: '#9aa3b2',
  hazard: '#FFC21A',
  signal: '#FF5A1F',
  cyan: '#22D3EE',
  danger: '#ff3b3b',
  success: '#3ddc84',
  p1: '#22D3EE',
  p2: '#FF5A1F',
} as const;

export const hex = (css: string): number => parseInt(css.replace('#', ''), 16);

export const fonts = {
  heading: "'Rajdhani', 'Oxanium', 'Arial Narrow', sans-serif",
  body: "'Inter', system-ui, sans-serif",
} as const;

export const spacing = [0, 4, 8, 12, 16, 24, 32, 48, 64] as const;
export const radius = { sm: 2, md: 4, lg: 8 } as const;
export const motion = { fast: 150, normal: 200, slow: 250 } as const;
