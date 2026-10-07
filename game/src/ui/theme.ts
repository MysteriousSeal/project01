import { Platform } from 'react-native';

export { C } from '../game/palette';

export const F = {
  display: Platform.select({ ios: 'AvenirNext-Heavy', android: 'sans-serif-black', default: undefined }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const GUTTER = 16;
export const GAP = 10;
export const RADIUS = { sm: 10, md: 14, lg: 16, xl: 20, pill: 40 } as const;
export const TOP_INSET = 60;
export const BOTTOM_INSET = 30;

export const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

export const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
