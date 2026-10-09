import { Platform } from 'react-native';

// Visual identity: a transit/subway map. The game IS "connect colored lines between stations",
// so the chrome borrows from metro-map signage: a cool paper-grey canvas, flat saturated line
// colors (real transit lines are flat ink), and condensed signage type.
export const C = {
  canvas: '#EDEFF3',
  surface: '#FFFFFF',
  ink: '#1C2024',
  inkDim: '#6B7280',
  line: '#D7DBE3',
  accent: '#1F6FEB',
  success: '#2DBE6C',
  locked: '#C7CCD6',
  star: '#F2C94C',
  scrim: 'rgba(28,32,36,0.45)',
};

// One fixed hue per color slot (game/levels MAX_COLORS of them). Hand-picked rather than an
// evenly spread hue wheel: adjacent lines must stay distinguishable at a glance.
export const LINE_COLORS = [
  '#E8463D', // red
  '#F2994A', // orange
  '#F2C94C', // amber
  '#2DBE6C', // green
  '#1AB8A8', // teal
  '#2F6FE0', // blue
  '#8450D6', // violet
  '#E0469B', // magenta
] as const;

// Each world is drawn as its own metro line, so it borrows a line color.
export function worldColor(worldIndex: number): string {
  return LINE_COLORS[worldIndex % LINE_COLORS.length];
}

export const F = {
  // Condensed + heavy reads as station signage rather than a generic app title.
  display: Platform.select({ ios: 'HelveticaNeue-CondensedBold', android: 'sans-serif-condensed', default: undefined }),
  displayWeight: Platform.select<'900' | 'bold'>({ ios: '900', android: 'bold', default: '900' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const GUTTER = 16;
export const GAP = 10;
export const RADIUS = { sm: 10, md: 14, lg: 18, xl: 24, pill: 999 };

// The one press response used by every tappable surface, so the whole app feels the same.
export const PRESSED = { transform: [{ scale: 0.95 }], opacity: 0.9 };

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
