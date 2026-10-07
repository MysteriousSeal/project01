import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { dailyStatus, levelInfo, missionLabel } from '../game/progress';
import { Save } from '../game/save';
import { nextSkin, skinById, trailById, TrailStyle } from '../game/skins';
import { TrailDot, trailLength } from './TrailDot';
import { TopBar } from './Screens';
import { C, F, fmt, GAP, GUTTER } from './theme';

const STARS = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 2 + 0.8, o: Math.random() * 0.6 + 0.2 }));

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

function useLoop(duration: number, enabled: boolean, pingPong = false) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!enabled) {
      v.setValue(0);
      return;
    }
    const anim = pingPong
      ? Animated.loop(Animated.sequence([
          Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ]))
      : Animated.loop(Animated.timing(v, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    anim.start();
    return () => anim.stop();
  }, [enabled, duration, pingPong, v]);
  return v;
}

export function OrbitHero({ size, planetColor, ball, trail, still, trailStyle = 'classic' }: { size: number; planetColor: string; ball: string; trail: string; still: boolean; trailStyle?: TrailStyle }) {
  const rot = useLoop(2800, !still);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const R = size / 2 - 14;
  const pr = size * 0.24;
  const c = size / 2;
  const n = trailLength(trailStyle);
  const dots = Array.from({ length: n }, (_, j) => j);
  const scale = size / 230;
  return (
    <View style={{ width: size, height: size }} accessible={false}>
      <View style={[styles.abs, { left: 14, top: 14, width: R * 2, height: R * 2, borderRadius: R, borderWidth: 1.5, borderColor: C.line }]} />
      <View style={[styles.abs, { left: c - pr, top: c - pr, width: pr * 2, height: pr * 2, borderRadius: pr, backgroundColor: planetColor, shadowColor: planetColor, shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } }]}>
        <View style={[styles.abs, { left: pr * 0.35, top: pr * 0.3, width: pr * 0.55, height: pr * 0.55, borderRadius: pr, backgroundColor: '#ffffff38' }]} />
        <View style={[styles.abs, { left: pr * 1.15, top: pr * 1.05, width: pr * 0.36, height: pr * 0.36, borderRadius: pr, backgroundColor: '#00000026' }]} />
        <View style={[styles.abs, { left: pr * 0.55, top: pr * 1.35, width: pr * 0.22, height: pr * 0.22, borderRadius: pr, backgroundColor: '#00000026' }]} />
      </View>
      <Animated.View style={[styles.abs, { left: 0, top: 0, width: size, height: size, transform: [{ rotate: spin }] }]}>
        {dots.map((j) => {
          const a = -Math.PI / 2 - (j + 1) * (1.4 / n);
          return <TrailDot key={j} style={trailStyle} k={1 - j / n} i={n - j} x={c + Math.cos(a) * R} y={c + Math.sin(a) * R} color={trail} t={0} scale={Math.max(0.6, scale)} />;
        })}
        <View style={[styles.abs, { left: c - 11, top: c - R - 11, width: 22, height: 22, borderRadius: 11, backgroundColor: ball, shadowColor: ball, shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, borderWidth: ball === '#111111' ? 2 : 0, borderColor: '#fff' }]} />
      </Animated.View>
    </View>
  );
}

export function Home({ save, onPlay, onShop, onClaim }: { save: Save; onPlay: () => void; onShop: () => void; onClaim: () => void }) {
  const { width, height } = useWindowDimensions();
  const still = useReducedMotion();
  const breathe = useLoop(1100, !still, true);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const compact = height < 760;
  const daily = dailyStatus(save);
  const { lvl } = levelInfo(save.xp);
  const skin = skinById(save.skin);
  const next = nextSkin(save);
  const pot = save.missions.reduce((a, m) => a + m.reward, 0);
  const bottomH = 300 + (daily.available ? 76 : 0) + (next ? 0 : -50);
  const hero = Math.max(110, Math.min(width * 0.62, 250, height - 90 - bottomH - (compact ? 110 : 140)));

  return (
    <Pressable style={styles.root} onPress={onPlay} accessibilityRole="button" accessibilityLabel="Play">
      {STARS.map((s, i) => (
        <View key={i} style={[styles.abs, { left: s.x * width, top: s.y * height, width: s.s, height: s.s, borderRadius: 2, backgroundColor: '#fff', opacity: s.o }]} />
      ))}
      <View style={[styles.abs, styles.bigPlanet, { width: width * 1.6, height: width * 1.6, borderRadius: width, left: -width * 0.3, top: height - width * 0.28 }]} />

      <TopBar save={save} onShop={onShop} inline />

      <View style={styles.center}>
        <Text style={[styles.title, compact && { fontSize: 50 }]}>ORBIT</Text>
        <Text style={styles.hop}>hop</Text>
        <View style={{ marginTop: compact ? 4 : 12 }}>
          <OrbitHero size={hero} planetColor={`hsl(${(200 + lvl * 37) % 360},70%,60%)`} ball={skin.ball} trail={skin.trail} still={still} trailStyle={trailById(save.trail).id} />
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
        {daily.available && (
          <Pressable style={styles.daily} onPress={onClaim} accessibilityRole="button" accessibilityLabel={`Claim daily reward, ${daily.reward} coins`}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayNum}>{daily.streak}</Text>
              <Text style={styles.dayLbl}>DAY</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Daily reward</Text>
              <Text style={styles.cardSub}>{daily.streak > 1 ? 'Streak kept. Come back tomorrow for more.' : 'Play daily to grow the reward.'}</Text>
            </View>
            <Text style={styles.claim}>Claim ● {daily.reward}</Text>
          </Pressable>
        )}

        <Animated.View style={[styles.play, { transform: [{ scale }] }]}>
          <Text style={styles.playTxt}>PLAY</Text>
          <Text style={styles.playSub}>tap anywhere</Text>
        </Animated.View>

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Missions</Text>
            <Text style={styles.pot}>● {pot} to earn</Text>
          </View>
          {save.missions.map((m) => (
            <View key={m.id} style={styles.mRow}>
              <View style={styles.mTrack}>
                <View style={[styles.mFill, { width: `${(m.progress / m.target) * 100}%` }]} />
              </View>
              <Text style={styles.mText} numberOfLines={1}>{missionLabel(m)}</Text>
              <Text style={styles.mNum}>{m.progress}/{m.target}</Text>
            </View>
          ))}
        </View>

        {next && (
          <Pressable style={styles.skinRow} onPress={onShop} accessibilityRole="button" accessibilityLabel="Open skins">
            <View style={[styles.skinDot, { backgroundColor: next.ball, shadowColor: next.trail }]} />
            <Text style={styles.skinTxt}>
              {save.wallet >= next.price ? `${next.name} is ready to unlock` : `${next.name} unlocks at ● ${fmt(next.price)}`}
            </Text>
            <Text style={styles.skinGo}>Skins ›</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 64 }}>
      <Text style={styles.rVal}>{value}</Text>
      <Text style={styles.rLbl}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.space },
  bigPlanet: { backgroundColor: '#1a2150', borderWidth: 1, borderColor: '#2a3470' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 64, letterSpacing: 14, marginRight: -14 },
  hop: { color: C.mint, fontFamily: F.mono, fontSize: 18, letterSpacing: 10, marginTop: -6, marginRight: -10 },
  readout: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 14 },
  sep: { width: 1, height: 26, backgroundColor: C.line },
  rVal: { color: C.text, fontFamily: F.mono, fontSize: 20, fontWeight: '700' },
  rLbl: { color: C.dim, fontSize: 10, fontWeight: '800', letterSpacing: 2, marginTop: 2 },
  bottom: { paddingHorizontal: GUTTER, paddingBottom: 34, gap: GAP },
  play: { alignSelf: 'center', alignItems: 'center', backgroundColor: C.mint, borderRadius: 40, paddingVertical: 12, width: 220, shadowColor: C.mint, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, marginBottom: 4 },
  playTxt: { color: C.space, fontFamily: F.display, fontWeight: '900', fontSize: 24, letterSpacing: 6, marginRight: -6 },
  playSub: { color: '#0b102699', fontSize: 11, fontWeight: '700', marginTop: -2 },
  daily: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 16, backgroundColor: '#ffd34d14', borderWidth: 1.5, borderColor: '#ffd34d88' },
  dayBadge: { width: 46, height: 46, borderRadius: 12, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  dayNum: { color: C.space, fontFamily: F.mono, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  dayLbl: { color: C.space, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  claim: { color: C.space, backgroundColor: C.gold, fontWeight: '900', fontSize: 14, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 12, overflow: 'hidden' },
  card: { backgroundColor: '#151b3dcc', borderRadius: 16, padding: 12, gap: 9, borderWidth: 1, borderColor: C.line },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  cardTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  cardSub: { color: C.dim, fontSize: 12, marginTop: 2 },
  pot: { color: C.gold, fontFamily: F.mono, fontSize: 12, fontWeight: '700' },
  mRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mTrack: { width: 36, height: 6, borderRadius: 3, backgroundColor: '#ffffff1f', overflow: 'hidden' },
  mFill: { height: 6, backgroundColor: C.mint },
  mText: { flex: 1, color: '#ffffffdd', fontSize: 13, fontWeight: '600' },
  mNum: { color: C.dim, fontFamily: F.mono, fontSize: 12 },
  skinRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: C.line },
  skinDot: { width: 16, height: 16, borderRadius: 8, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  skinTxt: { flex: 1, color: '#ffffffcc', fontSize: 13, fontWeight: '600' },
  skinGo: { color: C.sky, fontSize: 13, fontWeight: '800' },
});
