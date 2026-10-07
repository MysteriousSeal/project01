import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { C, F, RADIUS } from '../theme';

export function BackButton({ label = 'Back', onPress, style }: { label?: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.pill, style, pressed && styles.pressed]}
    >
      <View style={styles.icon}>
        <View style={styles.chevron} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 8,
    paddingLeft: 5,
    paddingRight: 16,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
    backgroundColor: C.panel,
    borderWidth: 1.5,
    borderColor: '#9ad7ff55',
  },
  pressed: { transform: [{ scale: 0.95 }], backgroundColor: C.panelHi, borderColor: C.sky },
  icon: { width: 30, height: 30, borderRadius: RADIUS.sm, backgroundColor: C.sky, alignItems: 'center', justifyContent: 'center' },
  chevron: { width: 10, height: 10, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: C.space, borderRadius: 1.5, transform: [{ rotate: '45deg' }], marginLeft: 4 },
  label: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 15, letterSpacing: 1.5 },
});
