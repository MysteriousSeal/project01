import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { C, F, RADIUS, softShadow } from '../../game/theme';

export type ButtonVariant = 'primary' | 'success' | 'secondary';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'lg' | 'md';
  style?: StyleProp<ViewStyle>;
};

const FILL: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: C.accent },
  success: { backgroundColor: C.success },
  secondary: { backgroundColor: C.surface, borderWidth: 2, borderColor: C.line },
};

const INK: Record<ButtonVariant, string> = { primary: '#FFFFFF', success: '#FFFFFF', secondary: C.ink };

export function Button({ label, onPress, variant = 'primary', size = 'md', style }: Props) {
  const lg = size === 'lg';
  const box = [styles.base, lg ? styles.lg : styles.md, FILL[variant], softShadow(0.14, 10, 4), style];
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [box, pressed && styles.pressed]}
    >
      <Text style={[lg ? styles.lgTxt : styles.mdTxt, { color: INK[variant] }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  lg: { width: 240, paddingVertical: 16, borderRadius: RADIUS.pill },
  md: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: RADIUS.md },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.92 },
  lgTxt: { fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 20, letterSpacing: 1 },
  mdTxt: { fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
});
