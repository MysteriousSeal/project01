import { StyleProp, View, ViewStyle } from 'react-native';

type Props = { color: string; size?: number; outline?: boolean; glow?: boolean; style?: StyleProp<ViewStyle> };

export function Ball({ color, size = 22, outline, glow = true, style }: Props) {
  return (
    <View
      style={[
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        glow && { shadowColor: color, shadowOpacity: 0.9, shadowRadius: size * 0.45, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
        outline && { borderWidth: 2, borderColor: '#ffffff' },
        style,
      ]}
    />
  );
}
