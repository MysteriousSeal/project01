import { StyleSheet, Text, View } from 'react-native';
import { hsl } from '../../../game/palette';
import { inGap, Planet, WORLD } from '../../../game/sim/engine';
import { alpha, C, F } from '../../theme';

const RING_DOTS = 30;
const BOSS_COLOR = hsl(285, 55, 45);

export function PlanetView({ p, active, top, t, color: base }: { p: Planet; active: boolean; top: number; t: number; color: string }) {
  const k = active ? Math.max(0.15, p.fuse / p.fuseMax) : 1;
  const r = p.r * (0.55 + 0.45 * k);
  const danger = active && k < 0.35;
  const color = danger ? C.danger : p.gold ? C.gold : p.boss ? BOSS_COLOR : base;
  const ring = p.gold ? alpha(C.gold, 0.67) : alpha(C.text, active ? 0.33 : 0.13);
  return (
    <>
      {p.ring && <BossRing p={p} top={top} />}
      {p.boss && <Text style={[styles.bossTag, { left: p.x - 50, top: top - p.orbit - 34 }]}>{p.ring ? 'BOSS' : 'CLEARED'}</Text>}
      <View style={[styles.abs, { left: p.x - p.orbit, top: top - p.orbit, width: p.orbit * 2, height: p.orbit * 2, borderRadius: p.orbit, borderColor: ring, borderWidth: p.gold ? 2.5 : 1.5 }]} />
      <View style={[styles.abs, { left: p.x - r, top: top - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: color, opacity: danger && Math.floor(t * 10) % 2 ? 0.6 : 1 }]} />
      <View style={[styles.abs, styles.shine, { left: p.x - r * 0.45, top: top - r * 0.55, width: r * 0.5, height: r * 0.5, borderRadius: r }]} />
    </>
  );
}

function BossRing({ p, top }: { p: Planet; top: number }) {
  return (
    <>
      {Array.from({ length: RING_DOTS }, (_, i) => {
        const a = (i / RING_DOTS) * Math.PI * 2;
        const x = p.x + Math.cos(a) * p.orbit;
        const y = p.y + Math.sin(a) * p.orbit;
        return inGap(p, x, y) ? null : <View key={i} style={[styles.ringDot, { left: x - 4, top: y - p.y + top - 4 }]} />;
      })}
      {[-1, 1].map((side) => {
        const a = p.gapAngle + side * WORLD.bossGapHalf;
        return <View key={side} style={[styles.gapEdge, { left: p.x + Math.cos(a) * p.orbit - 6, top: top + Math.sin(a) * p.orbit - 6 }]} />;
      })}
    </>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  shine: { backgroundColor: alpha(C.text, 0.25) },
  ringDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink, opacity: 0.85 },
  gapEdge: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: C.mint },
  bossTag: { position: 'absolute', width: 100, textAlign: 'center', color: C.pink, fontFamily: F.display, fontWeight: '900', fontSize: 14, letterSpacing: 3 },
});
