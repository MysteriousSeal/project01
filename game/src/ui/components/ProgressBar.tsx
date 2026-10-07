import { StyleProp, View, ViewStyle } from 'react-native';
import { C } from '../theme';

type Props = { value: number; color?: string; height?: number; width?: number; style?: StyleProp<ViewStyle> };

export function ProgressBar({ value, color = C.mint, height = 6, width, style }: Props) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View style={[{ height, width, borderRadius: height / 2, backgroundColor: '#ffffff1f', overflow: 'hidden' }, style]}>
      <View style={{ height, width: `${pct}%`, backgroundColor: color }} />
    </View>
  );
}
