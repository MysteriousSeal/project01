import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Save } from '../game/save';
import { UPGRADES } from '../game/upgrades';
import { C, F, fmt } from './theme';

export function UpgradesTab({ save, onBuy }: { save: Save; onBuy: (id: string, price: number) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={styles.intro}>Permanent boosts for every run.</Text>
      {UPGRADES.map((u) => {
        const lvl = save.upgrades[u.id] ?? 0;
        const max = lvl >= u.costs.length;
        const price = max ? 0 : u.costs[lvl];
        const afford = save.wallet >= price;
        return (
          <View key={u.id} style={styles.row}>
            <View style={{ flex: 1, gap: 6 }}>
              <Text style={styles.name}>{u.name}</Text>
              <View style={styles.pips}>
                {u.costs.map((_, i) => (
                  <View key={i} style={[styles.pip, i < lvl && styles.pipOn]} />
                ))}
              </View>
              <Text style={styles.effect}>{u.effect(lvl)}</Text>
              {!max && <Text style={styles.next}>Next: {u.effect(lvl + 1)}</Text>}
            </View>
            {max ? (
              <View style={[styles.btn, styles.btnOff]}><Text style={[styles.btnTxt, { color: C.mint }]}>Max</Text></View>
            ) : (
              <Pressable
                disabled={!afford}
                onPress={() => onBuy(u.id, price)}
                style={({ pressed }) => [styles.btn, afford ? { backgroundColor: C.gold } : styles.btnOff, pressed && { transform: [{ scale: 0.95 }] }]}
                accessibilityRole="button"
                accessibilityState={{ disabled: !afford }}
                accessibilityLabel={`Upgrade ${u.name} for ${price} coins`}
              >
                <Text style={[styles.btnLbl, !afford && { color: C.dim }]}>{lvl ? 'Upgrade' : 'Buy'}</Text>
                <Text style={[styles.btnTxt, !afford && { color: C.dim }]}>● {fmt(price)}</Text>
              </Pressable>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 10 },
  intro: { color: C.dim, fontSize: 13, textAlign: 'center', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  name: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 17 },
  pips: { flexDirection: 'row', gap: 5 },
  pip: { width: 22, height: 6, borderRadius: 3, backgroundColor: '#ffffff1f' },
  pipOn: { backgroundColor: C.sky },
  effect: { color: '#ffffffdd', fontSize: 13, fontWeight: '600' },
  next: { color: C.sky, fontSize: 12, fontWeight: '700' },
  btn: { minWidth: 92, alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14 },
  btnOff: { backgroundColor: '#ffffff10', borderWidth: 1, borderColor: C.line },
  btnLbl: { color: C.space, fontWeight: '800', fontSize: 11, letterSpacing: 1 },
  btnTxt: { color: C.space, fontWeight: '900', fontSize: 15, fontFamily: F.mono },
});
