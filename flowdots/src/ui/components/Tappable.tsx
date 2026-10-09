import { ReactNode } from 'react';
import { Pressable, StyleProp, ViewStyle } from 'react-native';
import { PRESSED } from '../theme';

type Props = {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  children: ReactNode;
};

// Base for every pressable surface: consistent press feedback, hit slop and a11y role.
export function Tappable({ onPress, disabled, style, accessibilityLabel, children }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [style, pressed && !disabled && PRESSED]}
    >
      {children}
    </Pressable>
  );
}
