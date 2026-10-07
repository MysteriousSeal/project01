import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Save } from '../../../game/save';
import { upgradeCost, upgradeLevel } from '../../../game/shop';
import { UPGRADES } from '../../../game/upgrades';
import { Button } from '../../components/Button';
import { C, F, fmt, GAP, GUTTER, RADIUS } from '../../theme';

export function UpgradesTab({ save, onBuy }: { save: Save; onBuy: (id: string) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <Text style={styles.intro}>Permanent boosts for every run.</Text>
      {UPGRADES.map((u) => {
        const lvl = upgradeLevel(save, u.id);
        const cost = upgradeCost(save, u.id);
        return (
          <View key={u.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{u.name}</Text>
              <View style={styles.pips} accessible accessibilityLabel={`Level ${lvl} of ${u.costs.length}`}>
                {u.costs.map((_, i) => <View key={i} style={[styles.pip, i < lvl && styles.pipOn]} />)}
              </View>
              <Text style={styles.effect}>{u.effect(lvl)}</Text>
              {cost !== null && <Text style={styles.next}>Next: {u.effect(lvl + 1)}</Text>}
            </View>
            {cost === null ? (
              <Button label="Max" variant="muted" labelColor={C.mint} style={styles.btn} />
            ) : (
              <Button
                label={`● ${fmt(cost)}`}
                caption={lvl ? 'UPGRADE' : 'BUY'}
                variant={save.wallet >= cost ? 'gold' : 'muted'}
                onPress={() => onBuy(u.id)}
                accessibilityLabel={`${lvl ? 'Upgrade' : 'Buy'} ${u.name} for ${cost} coins`}
                style={styles.btn}
              />
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: GUTTER, paddingBottom: 40, gap: GAP },
  intro: { color: C.dim, fontSize: 13, textAlign: 'center', marginBottom: 2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: RADIUS.lg, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  info: { flex: 1, gap: 6 },
  name: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 17 },
  pips: { flexDirection: 'row', gap: 5 },
  pip: { width: 22, height: 6, borderRadius: 3, backgroundColor: '#ffffff1f' },
  pipOn: { backgroundColor: C.sky },
  effect: { color: '#ffffffdd', fontSize: 13, fontWeight: '600' },
  next: { color: C.sky, fontSize: 12, fontWeight: '700' },
  btn: { minWidth: 92, paddingVertical: 10 },
});
