import { StyleSheet, Text, ViewStyle } from 'react-native';
import { C, F, RADIUS, softShadow } from '../theme';
import { Tappable } from './Tappable';

export type ButtonVariant = 'primary' | 'success' | 'secondary';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'lg' | 'md';
};

const FILL: Record<ButtonVariant, ViewStyle> = {
  primary: { backgroundColor: C.accent },
  success: { backgroundColor: C.success },
  secondary: { backgroundColor: C.surface, borderWidth: 2, borderColor: C.line },
};

const INK: Record<ButtonVariant, string> = { primary: C.surface, success: C.surface, secondary: C.ink };

export function Button({ label, onPress, variant = 'primary', size = 'md' }: Props) {
  const lg = size === 'lg';
  return (
    <Tappable
      onPress={onPress}
      accessibilityLabel={label}
      style={[styles.base, lg ? styles.lg : styles.md, FILL[variant], softShadow(0.14, 10, 4)]}
    >
      <Text style={[lg ? styles.lgText : styles.mdText, { color: INK[variant] }]}>{label}</Text>
    </Tappable>
  );
}

// Small outlined pill for secondary tools (toolbar actions, the back control).
export function Chip({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Tappable onPress={onPress} disabled={disabled} accessibilityLabel={label} style={[styles.chip, disabled && styles.chipDisabled]}>
      <Text style={[styles.chipText, disabled && styles.chipTextDisabled]}>{label}</Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  lg: { width: 240, paddingVertical: 16, borderRadius: RADIUS.pill },
  md: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: RADIUS.md },
  lgText: { fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 20, letterSpacing: 1 },
  mdText: { fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
  chip: {
    minWidth: 38,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.line,
  },
  chipDisabled: { opacity: 0.45 },
  chipText: { color: C.ink, fontWeight: '800', fontSize: 12, letterSpacing: 0.5 },
  chipTextDisabled: { color: C.inkDim },
});
