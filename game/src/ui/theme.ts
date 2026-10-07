import { Platform } from 'react-native';

export const C = {
  space: '#0b1026',
  panel: '#151b3d',
  line: '#ffffff1a',
  text: '#ffffff',
  dim: '#ffffff99',
  mint: '#7dffb2',
  gold: '#ffd34d',
  sky: '#9ad7ff',
  pink: '#ff70a6',
};

export const F = {
  display: Platform.select({ ios: 'AvenirNext-Heavy', android: 'sans-serif-black', default: undefined }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const GUTTER = 16;
export const GAP = 10;

export const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
