import { Animated, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { skinById, trailById } from '../../game/cosmetics';
import { dailyStatus } from '../../game/daily';
import { hsl, planetHue } from '../../game/palette';
import { levelOf } from '../../game/progress';
import { Save } from '../../game/save';
import { Button } from '../components/Button';
import { MissionsCard } from '../components/MissionsCard';
import { NextUnlock } from '../components/NextUnlock';
import { OrbitHero } from '../components/OrbitHero';
import { Starfield } from '../components/Starfield';
import { TopBar } from '../components/TopBar';
import { useCompact, useLoop, useReducedMotion } from '../hooks';
import { BOTTOM_INSET, C, F, FILL, fmt, GAP, GUTTER, RADIUS } from '../theme';

type Props = { save: Save; onPlay: () => void; onShop: () => void; onClaim: () => void };

const BOTTOM_BASE = 300;
const DAILY_H = 76;

export function HomeScreen({ save, onPlay, onShop, onClaim }: Props) {
  const { width, height } = useWindowDimensions();
  const compact = useCompact();
  const still = useReducedMotion();
  const breathe = useLoop(1100, !still, true);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const daily = dailyStatus(save);
  const lvl = levelOf(save);
  const bottomH = BOTTOM_BASE + (daily.available ? DAILY_H : 0);
  const hero = Math.max(110, Math.min(width * 0.62, 250, height - 90 - bottomH - (compact ? 110 : 140)));

  return (
    <View style={styles.root}>
      <Starfield width={width} height={height} count={70} />
      <View style={[styles.bigPlanet, { width: width * 1.6, height: width * 1.6, borderRadius: width, left: -width * 0.3, top: height - width * 0.28 }]} />

      <TopBar save={save} onShop={onShop} />

      <View style={styles.center}>
        <Text style={[styles.title, compact && { fontSize: 50 }]} accessibilityRole="header">ORBIT</Text>
        <Text style={styles.hop}>hop</Text>
        <View style={{ marginTop: compact ? 4 : 12 }}>
          <OrbitHero size={hero} planetColor={hsl(planetHue(lvl), 70, 60)} skin={skinById(save.skin)} trailStyle={trailById(save.trail).id} still={still} />
        </View>
        <View style={styles.readout}>
          <Readout label="BEST" value={fmt(save.best)} />
          <View style={styles.sep} />
          <Readout label="LEVEL" value={String(lvl)} />
          <View style={styles.sep} />
          <Readout label="GAMES" value={fmt(save.games)} />
        </View>
      </View>

      <View style={styles.bottom}>
        {daily.available && <DailyCard streak={daily.streak} reward={daily.reward} onClaim={onClaim} />}
        <Animated.View style={[styles.playWrap, { transform: [{ scale }] }]}>
          <Button label="PLAY" size="lg" onPress={onPlay} style={styles.play} />
        </Animated.View>
        <MissionsCard missions={save.missions} />
        <NextUnlock save={save} onPress={onShop} />
      </View>
    </View>
  );
}

function DailyCard({ streak, reward, onClaim }: { streak: number; reward: number; onClaim: () => void }) {
  return (
    <Pressable style={styles.daily} onPress={onClaim} accessibilityRole="button" accessibilityLabel={`Claim daily reward, ${reward} coins`}>
      <View style={styles.dayBadge}>
        <Text style={styles.dayNum}>{streak}</Text>
        <Text style={styles.dayLbl}>DAY</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>Daily reward</Text>
        <Text style={styles.cardSub}>{streak > 1 ? 'Streak kept. Come back tomorrow for more.' : 'Play daily to grow the reward.'}</Text>
      </View>
      <Text style={styles.claim}>Claim ● {reward}</Text>
    </Pressable>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.readoutItem} accessible accessibilityLabel={`${label} ${value}`}>
      <Text style={styles.rVal}>{value}</Text>
      <Text style={styles.rLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { ...FILL, backgroundColor: C.space },
  bigPlanet: { position: 'absolute', backgroundColor: '#1a2150', borderWidth: 1, borderColor: '#2a3470' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 64, letterSpacing: 14, marginRight: -14 },
  hop: { color: C.mint, fontFamily: F.mono, fontSize: 18, letterSpacing: 10, marginTop: -6, marginRight: -10 },
  readout: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 14 },
  readoutItem: { alignItems: 'center', minWidth: 64 },
  sep: { width: 1, height: 26, backgroundColor: C.line },
  rVal: { color: C.text, fontFamily: F.mono, fontSize: 20, fontWeight: '700' },
  rLbl: { color: C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  bottom: { paddingHorizontal: GUTTER, paddingBottom: BOTTOM_INSET + 4, gap: GAP },
  playWrap: { alignSelf: 'center', marginBottom: 4 },
  play: { width: 220 },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: RADIUS.lg, backgroundColor: '#ffd34d14', borderWidth: 1.5, borderColor: '#ffd34d88' },
  dayBadge: { width: 46, height: 46, borderRadius: RADIUS.sm, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  dayNum: { color: C.space, fontFamily: F.mono, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  dayLbl: { color: C.space, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  claim: { color: C.space, backgroundColor: C.gold, fontWeight: '900', fontSize: 14, paddingHorizontal: 12, paddingVertical: 9, borderRadius: RADIUS.sm, overflow: 'hidden' },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  cardSub: { color: C.dim, fontSize: 12, marginTop: 2 },
});
