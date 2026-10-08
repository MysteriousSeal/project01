import { Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from '../theme';
import { Icon, IconName } from './Icon';

export type TabId = 'home' | 'daily' | 'ranks' | 'shop' | 'trophies';

const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'daily', label: 'Daily', icon: 'calendar-day' },
  { id: 'ranks', label: 'Ranks', icon: 'ranking-star' },
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'shop', label: 'Shop', icon: 'cart-shopping' },
  { id: 'trophies', label: 'Trophies', icon: 'trophy' },
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
              <Icon name={t.icon} size={21} color={on ? C.mint : C.dim} style={styles.icon} />
              {badges[t.id] && <View style={styles.badge} />}
            </View>
            <Text style={[styles.label, { color: on ? C.text : C.dim }]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: TAB_BAR_HEIGHT, flexDirection: 'row', backgroundColor: C.panel, borderTopWidth: 1, borderColor: C.line, paddingBottom: 18 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  pressed: { opacity: 0.7 },
  indicator: { position: 'absolute', top: 0, width: 28, height: 3, borderRadius: 2 },
  indicatorOn: { backgroundColor: C.mint },
  icon: { height: 26, lineHeight: 26, textAlign: 'center' },
  badge: { position: 'absolute', top: 1, right: -7, width: 9, height: 9, borderRadius: 5, backgroundColor: C.pink, borderWidth: 1.5, borderColor: C.panel },
  label: { fontFamily: F.display, fontWeight: '900', fontSize: 11, letterSpacing: 1 },
});
