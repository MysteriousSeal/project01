import { StyleSheet, Text, View } from 'react-native';
import type { RunResult } from '../../game/engine';
import type { RunReport } from '../../game/progress';
import { Button } from '../components/Button';
import { slotOf } from '../../game/challenge';
import { ChallengeRow } from '../components/ChallengeRow';
import { Coin } from '../components/Icon';
import { MissionsCard } from '../components/MissionsCard';
import { NextUnlock } from '../components/NextUnlock';
import { TopBar } from '../components/TopBar';
import { useCompact } from '../hooks';
import { BOTTOM_INSET, C, F, FILL, fmt, GAP, GUTTER, RADIUS } from '../theme';

type Props = { result: RunResult; report: RunReport; onRetry: () => void; onHome: () => void; onShop: () => void };

export function GameOverScreen({ result, report, onRetry, onHome, onShop }: Props) {
  const compact = useCompact();
  const { save } = report;
  const leveled = report.levelAfter > report.levelBefore;
  const daily = report.challenge;
  const retry = daily && daily.attemptsLeft > 0 ? `TRY AGAIN · ${daily.attemptsLeft} LEFT` : 'PLAY AGAIN';
  return (
    <View style={styles.root}>
      <TopBar save={save} onShop={onShop} />
      <View style={styles.mid}>
        <View style={styles.badges}>
          {daily && <Text style={[styles.badge, { backgroundColor: C.sky }]}>DAILY CHALLENGE</Text>}
          {daily?.newMedals.map((m) => <Text key={m.name} style={[styles.badge, { backgroundColor: m.color }]}>{m.name.toUpperCase()}</Text>)}
          {daily && daily.reward > 0 && <Text style={[styles.badge, { backgroundColor: C.gold }]}><Coin color={C.space} size={13} /> +{daily.reward}</Text>}
          {report.newBest && <Text style={[styles.badge, { backgroundColor: C.gold }]}>NEW BEST!</Text>}
          {leveled && <Text style={[styles.badge, { backgroundColor: C.sky }]}>LEVEL {report.levelAfter}  <Coin color={C.space} size={13} /> +{report.levelReward}</Text>}
        </View>
        <View style={styles.scoreBox} accessible accessibilityLabel={`Score ${result.score}. Best ${save.best}.`}>
          <Text style={[styles.big, compact && styles.bigCompact]}>{result.score}</Text>
          <Text style={styles.sub}>BEST {fmt(daily ? daily.best : save.best)}  ·  +{report.xpGained} XP</Text>
        </View>
        <View style={styles.row}>
          <Stat label="COINS" value={`+${result.coins}`} color={C.gold} compact={compact} />
          <Stat label="PERFECTS" value={`${result.perfects}`} color={C.mint} compact={compact} />
          <Stat label="COMBO" value={`x${result.bestCombo}`} color={C.sky} compact={compact} />
        </View>
        {daily ? <DailySlot report={report} /> : <NextUnlock save={save} onPress={onShop} />}
        <MissionsCard missions={report.shown} />
      </View>
      <View style={styles.bottom}>
        <Button label={retry} size="lg" onPress={onRetry} />
        <Button label={daily ? 'BACK TO DAILY' : 'HOME'} size="lg" variant="secondary" onPress={onHome} />
      </View>
    </View>
  );
}

function DailySlot({ report }: { report: RunReport }) {
  const slot = report.challenge && slotOf(report.save.challenges, report.challenge.type);
  return slot ? <ChallengeRow slot={slot} highlight /> : null;
}

function Stat({ label, value, color, compact }: { label: string; value: string; color: string; compact: boolean }) {
  return (
    <View style={[styles.stat, compact && { paddingVertical: 6 }]} accessible accessibilityLabel={`${label} ${value}`}>
      <Text style={[styles.statVal, { color }, compact && { fontSize: 20 }]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...FILL, backgroundColor: '#0b1026ee', alignItems: 'center' },
  mid: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: GUTTER },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, minHeight: 28, alignItems: 'center' },
  badge: { color: C.space, fontWeight: '900', fontSize: 14, letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: RADIUS.md, overflow: 'hidden' },
  scoreBox: { alignItems: 'center' },
  big: { color: C.text, fontFamily: F.display, fontSize: 76, fontWeight: '900', lineHeight: 84 },
  bigCompact: { fontSize: 56, lineHeight: 62 },
  sub: { color: C.sky, fontSize: 18, fontWeight: '800', letterSpacing: 2, marginTop: 8 },
  row: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'center', gap: GAP },
  stat: { flex: 1, maxWidth: 104, alignItems: 'center', backgroundColor: '#ffffff12', borderRadius: RADIUS.md, paddingVertical: 10 },
  statVal: { fontFamily: F.mono, fontSize: 24, fontWeight: '900' },
  statLbl: { color: C.dim, fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  bottom: { alignItems: 'center', gap: 12, paddingTop: 6, paddingBottom: BOTTOM_INSET },
});
