import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { boostById } from '../../game/meta/boosts';
import type { Save } from '../../game/meta/save';
import { rewardLabel, SEASON, SEASON_TIERS, SeasonReward, seasonStatus } from '../../game/meta/season';
import { Button } from '../components/Button';
import { CosmeticPreview } from '../components/CosmeticPreview';
import { Coin, Icon } from '../components/Icon';
import { Page, SectionLabel } from '../components/Page';
import { ProgressBar } from '../components/ProgressBar';
import { useNow } from '../hooks';
import { alpha, C, CARD, F, fmt, GAP, GUTTER, RADIUS } from '../theme';

type Props = { save: Save; onBack: () => void; onClaim: (tiers?: number[]) => void };

const ROW_H = 64;
const DAY_MS = 86_400_000;

function timeLeft(ms: number) {
  const days = Math.floor(ms / DAY_MS);
  if (days >= 1) return `${days} day${days === 1 ? '' : 's'} left`;
  const hours = Math.floor(ms / 3_600_000);
  return hours >= 1 ? `${hours} h left` : 'Ends soon';
}

export function SeasonScreen({ save, onBack, onClaim }: Props) {
  const now = useNow(60_000);
  const st = seasonStatus(save, now);
  const nextTier = Math.min(st.reached + 1, SEASON_TIERS);

  return (
    <Page save={save} title="Season" onBack={onBack} scroll={false} right={st.open ? timeLeft(st.msLeft) : 'Ended'}>
      <View style={styles.head}>
        <Text style={styles.eyebrow}>SEASON 1 · {SEASON.name.toUpperCase()} · FREE</Text>
        <View style={styles.tierRow}>
          <Text style={styles.tierBig}>{st.reached}</Text>
          <Text style={styles.tierOf}>/ {SEASON_TIERS} tiers</Text>
        </View>
        {!st.done && st.open && (
          <View style={styles.progress} accessible accessibilityLabel={`${st.into} of ${st.need} XP to tier ${nextTier}`}>
            <ProgressBar value={st.into / st.need} color={C.gold} height={8} />
            <Text style={styles.progressTxt}>{fmt(st.into)} / {fmt(st.need)} XP to tier {nextTier}</Text>
          </View>
        )}
        {!st.open && <Text style={styles.ended}>This season has ended. Thanks for playing!</Text>}
        {st.claimable.length > 0 && <Button label={`CLAIM ALL · ${st.claimable.length}`} variant="gold" onPress={() => onClaim()} />}
        {st.open && st.claimable.length === 0 && <Text style={styles.hint}>Every run earns season XP, daily challenges too.</Text>}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.list} contentOffset={{ x: 0, y: Math.max(0, (st.reached - 1) * (ROW_H + GAP)) }}>
        <SectionLabel>REWARDS</SectionLabel>
        {SEASON.tiers.map((reward, i) => {
          const tier = i + 1;
          const claimed = st.claimed.includes(tier);
          const ready = st.claimable.includes(tier);
          const locked = tier > st.reached;
          return (
            <View key={tier} style={[styles.row, ready && styles.rowReady, locked && styles.rowLocked]} accessible accessibilityLabel={`Tier ${tier}: ${rewardLabel(reward)}${claimed ? ', claimed' : ready ? ', ready to claim' : ''}`}>
              <View style={[styles.num, ready && { backgroundColor: C.gold }, claimed && { backgroundColor: alpha(C.mint, 0.18) }]}>
                {claimed ? <Icon name="check" size={14} color={C.mint} /> : <Text style={[styles.numTxt, ready && { color: C.space }]}>{tier}</Text>}
              </View>
              <RewardIcon reward={reward} />
              <Text style={[styles.label, reward.item && { color: C.sky }]} numberOfLines={2}>
                {rewardLabel(reward)}
                {reward.item ? '\nExclusive' : ''}
              </Text>
              {ready ? (
                <Button label="Claim" variant="gold" onPress={() => onClaim([tier])} style={styles.claim} />
              ) : claimed ? (
                <Text style={styles.state}>Claimed</Text>
              ) : (
                <Text style={styles.state}>{fmt(tier * SEASON.pointsPerTier - st.points)} XP</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </Page>
  );
}

function RewardIcon({ reward }: { reward: SeasonReward }) {
  if (reward.item) return <View style={styles.preview}><CosmeticPreview kind={reward.item.kind} id={reward.item.id} /></View>;
  const boost = reward.boost && boostById(reward.boost);
  return <View style={styles.icon}>{boost ? <Icon name={boost.icon} size={18} color={C.cyan} /> : <Coin size={18} />}</View>;
}

const styles = StyleSheet.create({
  head: { ...CARD, marginHorizontal: GUTTER, padding: 14, gap: 10, borderColor: C.goldEdge, backgroundColor: C.goldWash },
  eyebrow: { color: C.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  tierRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  tierBig: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 44, lineHeight: 48 },
  tierOf: { color: C.dim, fontSize: 15, fontWeight: '800' },
  progress: { gap: 6 },
  progressTxt: { color: C.soft, fontFamily: F.mono, fontSize: 12, fontWeight: '700' },
  ended: { color: C.soft, fontSize: 13, fontWeight: '700' },
  hint: { color: C.dim, fontSize: 12, fontWeight: '700' },
  scroll: { flex: 1 },
  list: { paddingHorizontal: GUTTER, paddingTop: 8, paddingBottom: 20, gap: GAP },
  row: { height: ROW_H, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, borderRadius: RADIUS.md, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  rowReady: { borderColor: C.goldEdge, backgroundColor: C.goldWash },
  rowLocked: { opacity: 0.6 },
  num: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface },
  numTxt: { color: C.text, fontFamily: F.mono, fontSize: 13, fontWeight: '800' },
  icon: { width: 40, alignItems: 'center' },
  preview: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', transform: [{ scale: 0.7 }] },
  label: { flex: 1, color: C.text, fontSize: 13, fontWeight: '800', lineHeight: 17 },
  state: { color: C.dim, fontFamily: F.mono, fontSize: 12, fontWeight: '700' },
  claim: { minWidth: 72, paddingVertical: 9 },
});
