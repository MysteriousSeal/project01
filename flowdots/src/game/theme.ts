import { Platform } from 'react-native';

// Visual identity: a transit/subway map. The game IS "connect colored lines between stations" —
// so the chrome borrows directly from metro-map signage: a cool paper-grey canvas, bold flat
// line colors (no gradients — real transit lines are flat ink), and condensed signage type.
export const C = {
  canvas: '#EDEFF3',
  surface: '#FFFFFF',
  ink: '#1C2024',
  inkDim: '#6B7280',
  line: '#D7DBE3',
  accent: '#1F6FEB',
  success: '#2DBE6C',
  locked: '#C7CCD6',
};

// Metro-line colors — one fixed, saturated hue per color slot. Flat, not gradient: real transit
// lines are printed ink, which is also exactly what the pipe segments should look like.
export const dotColors = [
  '#E8463D', // red
  '#F2994A', // orange
  '#F2C94C', // amber
  '#2DBE6C', // green
  '#1AB8A8', // teal
  '#2F6FE0', // blue
  '#8450D6', // violet
  '#E0469B', // magenta
];

export const alpha = (hex: string, a: number) =>
  `${hex.slice(0, 7)}${Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0')}`;

export const F = {
  // Condensed + heavy reads as signage/departure-board, not as a generic app title.
  display: Platform.select({ ios: 'HelveticaNeue-CondensedBold', android: 'sans-serif-condensed', default: undefined }),
  displayWeight: Platform.select<'900' | 'bold'>({ ios: '900', android: 'bold', default: '900' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const GUTTER = 16;
export const GAP = 10;
export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

export function softShadow(opacity = 0.12, radius = 10, y = 4) {
  return {
    shadowColor: '#0B0E14',
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: y },
    elevation: radius / 2,
  };
}

export function glow(color: string, radius = 14) {
  return {
    shadowColor: color,
    shadowOpacity: 0.55,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: 0 },
    elevation: radius / 2,
  };
}
