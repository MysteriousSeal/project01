export const C = {
  space: '#0b1026',
  panel: '#151b3d',
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
  track: '#ffffff1f',
  soft: '#ffffffcc',
  surface: '#ffffff10',
  goldWash: '#ffd34d14',
  goldEdge: '#ffd34d88',
  bronze: '#d08a4f',
  silver: '#c9d3e6',
} as const;

export const alpha = (hex: string, a: number) => `${hex.slice(0, 7)}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`;

export const planetHue = (idx: number) => (idx * 37 + 200) % 360;
export const hsl = (hue: number, s: number, l: number) => `hsl(${hue},${s}%,${l}%)`;
