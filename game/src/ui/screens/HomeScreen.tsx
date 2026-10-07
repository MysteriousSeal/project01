import { Animated, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { skinById, trailById } from '../../game/cosmetics';
import { hsl, planetHue } from '../../game/palette';
import { levelOf } from '../../game/progress';
import { Save } from '../../game/save';
import { Button } from '../components/Button';
import { MissionsCard } from '../components/MissionsCard';
import { NextUnlock } from '../components/NextUnlock';
import { OrbitHero } from '../components/OrbitHero';
import { Starfield } from '../components/Starfield';
import { TAB_BAR_HEIGHT } from '../components/TabBar';
import { TopBar } from '../components/TopBar';
import { useCompact, useLoop, useReducedMotion } from '../hooks';
import { C, F, fmt, GAP, GUTTER } from '../theme';

type Props = { save: Save; onPlay: () => void; onShop: () => void };

const BOTTOM_H = 290;
const TOP_H = 90;

export function HomeScreen({ save, onPlay, onShop }: Props) {
  const { width, height: windowH } = useWindowDimensions();
  const height = windowH - TAB_BAR_HEIGHT;
  const compact = useCompact();
  const still = useReducedMotion();
  const breathe = useLoop(1100, !still, true);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const lvl = levelOf(save);
  const hero = Math.max(120, Math.min(width * 0.66, 260, height - TOP_H - BOTTOM_H - (compact ? 110 : 140)));

  return (
    <View style={styles.root}>
      <Starfield width={width} height={height} count={70} />
      <View style={[styles.bigPlanet, { width: width * 1.6, height: width * 1.6, borderRadius: width, left: -width * 0.3, top: height - width * 0.24 }]} />

      <TopBar save={save} />

      <View style={styles.center}>
        <Text style={[styles.title, compact && { fontSize: 50 }]} accessibilityRole="header">ORBIT</Text>
        <Text style={styles.hop}>hop</Text>
        <View style={{ marginTop: compact ? 6 : 14 }}>
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
        <Animated.View style={[styles.playWrap, { transform: [{ scale }] }]}>
          <Button label="PLAY" size="lg" onPress={onPlay} style={styles.play} />
        </Animated.View>
        <MissionsCard missions={save.missions} />
        <NextUnlock save={save} onPress={onShop} />
      </View>
    </View>
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
  root: { flex: 1, backgroundColor: C.space, overflow: 'hidden' },
  bigPlanet: { position: 'absolute', backgroundColor: '#1a2150', borderWidth: 1, borderColor: '#2a3470' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 64, letterSpacing: 14, marginRight: -14 },
  hop: { color: C.mint, fontFamily: F.mono, fontSize: 18, letterSpacing: 10, marginTop: -6, marginRight: -10 },
  readout: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 14 },
  readoutItem: { alignItems: 'center', minWidth: 64 },
  sep: { width: 1, height: 26, backgroundColor: C.line },
  rVal: { color: C.text, fontFamily: F.mono, fontSize: 20, fontWeight: '700' },
  rLbl: { color: C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  bottom: { paddingHorizontal: GUTTER, paddingBottom: 14, gap: GAP },
  playWrap: { alignSelf: 'center', marginBottom: 6 },
  play: { width: 220 },
});
