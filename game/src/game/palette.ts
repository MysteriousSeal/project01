export const C = {
  space: '#0b1026',
  panel: '#151b3d',
  panelHi: '#1f2856',
  line: '#ffffff1a',
  text: '#ffffff',
  dim: '#ffffff99',
  mint: '#7dffb2',
  gold: '#ffd34d',
  goldDeep: '#e0a400',
  sky: '#9ad7ff',
  pink: '#ff70a6',
  cyan: '#4cc9f0',
  danger: '#ff5d73',
} as const;

export const planetHue = (idx: number) => (idx * 37 + 200) % 360;
export const hsl = (hue: number, s: number, l: number) => `hsl(${hue},${s}%,${l}%)`;
