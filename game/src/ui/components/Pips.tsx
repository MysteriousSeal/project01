import { View } from 'react-native';
import { C } from '../theme';

type Props = { total: number; filled: number; color: string; width?: number; height?: number; gap?: number; label?: string };

export function Pips({ total, filled, color, width = 12, height = 5, gap = 3, label }: Props) {
  return (
    <View style={{ flexDirection: 'row', gap }} accessible={label !== undefined} accessibilityLabel={label}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={{ width, height, borderRadius: height / 2, backgroundColor: i < filled ? color : C.track }} />
      ))}
    </View>
  );
}
