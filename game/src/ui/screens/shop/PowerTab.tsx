import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { boostCount, BOOSTS, MAX_BOOST_STACK } from '../../../game/meta/boosts';
import { Save } from '../../../game/meta/save';
import { upgradeCost, upgradeLevel } from '../../../game/meta/shop';
import { UPGRADES } from '../../../game/meta/upgrades';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import { SectionLabel } from '../../components/Page';
import { Pips } from '../../components/Pips';
import { alpha, C, CARD, F, GAP, GUTTER, RADIUS } from '../../theme';

type Props = { save: Save; onBuyBoost: (id: string) => void; onBuyUpgrade: (id: string) => void };

export function PowerTab({ save, onBuyBoost, onBuyUpgrade }: Props) {
  return (
    <ScrollView contentContainerStyle={styles.list}>
      <SectionLabel>BOOSTS · USED UP ON YOUR NEXT NORMAL RUN</SectionLabel>
      {BOOSTS.map((b) => {
        const owned = boostCount(save, b.id);
        const full = owned >= MAX_BOOST_STACK;
        return (
          <View key={b.id} style={styles.row}>
            <View style={styles.tile}>
              <Icon name={b.icon} size={20} color={C.cyan} />
              {owned > 0 && <Text style={styles.count}>×{owned}</Text>}
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{b.name}</Text>
              <Text style={styles.effect}>{b.summary}</Text>
            </View>
            {full ? (
              <Button label="Full" variant="muted" style={styles.btn} />
            ) : (
              <Button label="" price={b.price} caption="BUY" variant={save.wallet >= b.price ? 'gold' : 'muted'} onPress={() => onBuyBoost(b.id)} accessibilityLabel={`Buy ${b.name} for ${b.price} coins, you own ${owned}`} style={styles.btn} />
            )}
          </View>
        );
      })}

      <SectionLabel>UPGRADES · PERMANENT FOR EVERY RUN</SectionLabel>
      {UPGRADES.map((u) => {
        const lvl = upgradeLevel(save, u.id);
        const cost = upgradeCost(save, u.id);
        return (
          <View key={u.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{u.name}</Text>
              <Pips total={u.costs.length} filled={lvl} color={C.sky} width={22} height={6} gap={5} label={`Level ${lvl} of ${u.costs.length}`} />
              <Text style={styles.effect}>{u.effect(lvl)}</Text>
              {cost !== null && <Text style={styles.next}>Next: {u.effect(lvl + 1)}</Text>}
            </View>
            {cost === null ? (
              <Button label="Max" variant="muted" labelColor={C.mint} style={styles.btn} />
            ) : (
              <Button
                label=""
                price={cost}
                caption={lvl ? 'UPGRADE' : 'BUY'}
                variant={save.wallet >= cost ? 'gold' : 'muted'}
                onPress={() => onBuyUpgrade(u.id)}
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
  row: { ...CARD, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  tile: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: alpha(C.cyan, 0.12), borderWidth: 1.5, borderColor: C.cyan, alignItems: 'center', justifyContent: 'center' },
  count: { position: 'absolute', right: -8, top: -8, color: C.space, backgroundColor: C.cyan, fontFamily: F.mono, fontWeight: '900', fontSize: 11, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, overflow: 'hidden' },
  info: { flex: 1, gap: 6 },
  name: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 17 },
  effect: { color: C.soft, fontSize: 13, fontWeight: '600' },
  next: { color: C.sky, fontSize: 12, fontWeight: '700' },
  btn: { minWidth: 92, paddingVertical: 10 },
});
