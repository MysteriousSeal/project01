import { View, ViewStyle } from 'react-native';
import { TrailStyle } from '../../game/cosmetics';
import { TUNING } from '../../game/engine';

export const trailLength = (style: TrailStyle) => (style === 'comet' ? TUNING.trailLength : 12);

type Props = { style: TrailStyle; k: number; i: number; x: number; y: number; color: string; t: number; scale?: number };

export function TrailDot({ style, k, i, x, y, color, t, scale = 1 }: Props) {
  const box = (size: number, extra: ViewStyle) => (
    <View style={[{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }, extra]} />
  );
  switch (style) {
    case 'comet': {
      const s = (5 + k * 16) * scale;
      return box(s, { borderRadius: s, backgroundColor: color, opacity: k * 0.75, shadowColor: color, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } });
    }
    case 'rainbow': {
      const s = (6 + k * 12) * scale;
      return box(s, { borderRadius: s, backgroundColor: `hsl(${(t * 300 + i * 28) % 360},100%,65%)`, opacity: 0.35 + k * 0.55 });
    }
    case 'pixel': {
      const s = Math.round((4 + k * 10) * scale);
      return box(s, { backgroundColor: color, opacity: 0.25 + k * 0.6, borderWidth: 1, borderColor: '#ffffff40' });
    }
    case 'ghost': {
      const s = (6 + k * 16) * scale;
      return box(s, { borderRadius: s, borderWidth: 2, borderColor: color, opacity: k * 0.7 });
    }
    case 'sparkle': {
      const tw = 0.5 + 0.5 * Math.sin(t * 18 + i * 1.7);
      const s = (2 + ((i * 7) % 4) + k * 3) * scale;
      const jx = Math.sin(i * 12.9898) * 9 * scale * (1 - k);
      const jy = Math.cos(i * 78.233) * 9 * scale * (1 - k);
      return (
        <View style={{ position: 'absolute', left: x + jx - s / 2, top: y + jy - s / 2, width: s, height: s, borderRadius: s, backgroundColor: i % 3 === 0 ? '#ffffff' : color, opacity: tw * (0.3 + k * 0.7) }} />
      );
    }
    default: {
      const s = (6 + k * 12) * scale;
      return box(s, { borderRadius: s, backgroundColor: color, opacity: 0.1 + k * 0.6 });
    }
  }
}
