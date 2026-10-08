import { StyleSheet, Text, View } from 'react-native';
import type { Save } from '../../game/meta/save';
import { MAX_TROPHY_TIER, Trophy, TROPHY_TIERS, trophyProgress } from '../../game/meta/trophies';
import { alpha, C, F, fmt, RADIUS } from '../theme';
import { Coin, Icon } from './Icon';

export function TrophyRow({ trophy, save }: { trophy: Trophy; save: Save }) {
  const { tier, target, value, done } = trophyProgress(trophy, save);
  const color = tier ? TROPHY_TIERS[tier - 1].color : C.dim;
  const next = done ? null : TROPHY_TIERS[tier];
  const label = done ? `${trophy.name}, all tiers earned` : `${trophy.name}, ${tier} of ${MAX_TROPHY_TIER} tiers. ${trophy.goal(target)}: ${value} of ${target}`;
  return (
    <View style={styles.row} accessible accessibilityLabel={label}>
      <View style={[styles.badge, { borderColor: color, backgroundColor: alpha(color, tier ? 0.16 : 0.06) }]}>
        <Icon name={trophy.icon} size={16} color={color} />
      </View>
      <View style={styles.body}>
        <View style={styles.head}>
          <Text style={styles.name} numberOfLines={1}>{trophy.name}</Text>
          <View style={styles.pips}>
            {TROPHY_TIERS.map((t, i) => <View key={t.name} style={[styles.pip, { backgroundColor: i < tier ? t.color : C.track }]} />)}
          </View>
        </View>
        <Text style={styles.goal} numberOfLines={1}>{done ? 'Complete' : trophy.goal(target)}</Text>
        {!done && (
          <View style={styles.bar}>
            <View style={[styles.fill, { width: `${(value / target) * 100}%`, backgroundColor: next!.color }]} />
          </View>
        )}
      </View>
      {next ? (
        <Text style={styles.reward}>
          {fmt(value)}/{fmt(target)}  <Coin size={11} /> {next.reward}
        </Text>
      ) : (
        <Icon name="check" size={14} color={C.mint} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 10, borderRadius: RADIUS.md, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  badge: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, color: C.text, fontSize: 14, fontWeight: '800' },
  pips: { flexDirection: 'row', gap: 3 },
  pip: { width: 7, height: 7, borderRadius: 4 },
  goal: { color: C.dim, fontSize: 12, fontWeight: '600' },
  bar: { height: 4, borderRadius: 2, backgroundColor: C.track, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  reward: { color: C.soft, fontFamily: F.mono, fontSize: 11, fontWeight: '700', textAlign: 'right' },
});
