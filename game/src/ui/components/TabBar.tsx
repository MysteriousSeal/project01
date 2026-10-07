import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../theme';

export type TabId = 'home' | 'daily' | 'shop';

const TABS: { id: TabId; label: string; glyph?: string }[] = [
  { id: 'daily', label: 'Daily', glyph: '★' },
  { id: 'home', label: 'Home', glyph: '◎' },
  { id: 'shop', label: 'Shop' },
];

export const TAB_BAR_HEIGHT = 78;

type Props = { tab: TabId; onChange: (t: TabId) => void; badges?: Partial<Record<TabId, boolean>> };

export function TabBar({ tab, onChange, badges = {} }: Props) {
  return (
    <View style={styles.bar} accessibilityRole="tablist">
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${t.label}${badges[t.id] ? ', new' : ''}`}
          >
            <View style={[styles.indicator, on && styles.indicatorOn]} />
            <View>
              {t.glyph ? <Text style={[styles.glyph, { color: on ? C.mint : C.dim }]}>{t.glyph}</Text> : <CartIcon color={on ? C.mint : C.dim} />}
              {badges[t.id] && <View style={styles.badge} />}
            </View>
            <Text style={[styles.label, { color: on ? C.text : C.dim }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CartIcon({ color }: { color: string }) {
  return (
    <View style={styles.cart}>
      <View style={[styles.cartHandle, { backgroundColor: color }]} />
      <View style={[styles.cartBasket, { borderColor: color }]} />
      <View style={[styles.cartWheel, { left: 8, backgroundColor: color }]} />
      <View style={[styles.cartWheel, { left: 17, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: TAB_BAR_HEIGHT, flexDirection: 'row', backgroundColor: C.panel, borderTopWidth: 1, borderColor: C.line, paddingBottom: 18 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  pressed: { opacity: 0.7 },
  indicator: { position: 'absolute', top: 0, width: 28, height: 3, borderRadius: 2 },
  indicatorOn: { backgroundColor: C.mint },
  glyph: { fontSize: 22, lineHeight: 26, textAlign: 'center' },
  cart: { width: 26, height: 26 },
  cartHandle: { position: 'absolute', left: 0, top: 4, width: 7, height: 2.5, borderRadius: 1.5 },
  cartBasket: { position: 'absolute', left: 5, top: 5, width: 19, height: 11, borderWidth: 2.5, borderTopWidth: 2.5, borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  cartWheel: { position: 'absolute', top: 19, width: 5, height: 5, borderRadius: 3 },
  badge: { position: 'absolute', top: 1, right: -7, width: 9, height: 9, borderRadius: 5, backgroundColor: C.pink, borderWidth: 1.5, borderColor: C.panel },
  label: { fontFamily: F.display, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
});
