import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { C, F, fmt, RADIUS } from '../theme';
import { Coin } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'sky' | 'muted';

type Props = {
  label: string;
  price?: number;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'lg' | 'md';
  caption?: string;
  labelColor?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const FILL: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: C.mint },
  secondary: { backgroundColor: C.panel, borderWidth: 2, borderColor: C.sky },
  gold: { backgroundColor: C.gold },
  sky: { backgroundColor: C.sky },
  muted: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
};

const INK: Record<ButtonVariant, string> = { primary: C.space, secondary: C.sky, gold: C.space, sky: C.space, muted: C.dim };

export function Button({ label, price, onPress, variant = 'primary', size = 'md', caption, labelColor, accessibilityLabel, style }: Props) {
  const lg = size === 'lg';
  const ink = labelColor ?? INK[variant];
  const a11y = accessibilityLabel ?? (price !== undefined ? `${label} ${price} coins`.trim() : label);
  const body = (
    <>
      {caption && <Text style={[styles.caption, { color: ink }]}>{caption}</Text>}
      <Text style={[lg ? styles.lgTxt : styles.mdTxt, variant === 'secondary' && lg && styles.lgSecondaryTxt, { color: ink }]}>
        {label}
        {price !== undefined && (
          <>
            {label ? ' ' : ''}
            <Coin color={ink} size={lg ? 18 : 13} /> {fmt(price)}
          </>
        )}
      </Text>
    </>
  );
  const box = [styles.base, lg ? styles.lg : styles.md, FILL[variant], lg && variant === 'secondary' && styles.lgSecondary, lg && variant === 'primary' && styles.glow, style];

  if (!onPress || variant === 'muted') {
    return (
      <View style={box} accessible accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel={a11y}>
        {body}
      </View>
    );
  }
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => [box, pressed && styles.pressed]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  lg: { width: 260, paddingVertical: 16, borderRadius: RADIUS.pill },
  lgSecondary: { paddingVertical: 14 },
  md: { paddingVertical: 13, paddingHorizontal: 12, borderRadius: RADIUS.md },
  glow: { shadowColor: C.mint, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  lgTxt: { fontFamily: F.display, fontWeight: '900', fontSize: 22, letterSpacing: 3 },
  lgSecondaryTxt: { fontSize: 18 },
  mdTxt: { fontWeight: '900', fontSize: 15 },
  caption: { fontWeight: '800', fontSize: 11, letterSpacing: 1 },
});
