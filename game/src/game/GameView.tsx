import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { createState, GameEvent, State, step, tap } from './engine';

export type RunResult = { score: number; coins: number; perfects: number; bestCombo: number };

type Props = {
  W: number;
  H: number;
  ballColor: string;
  trailColor: string;
  showHint?: boolean;
  onEvent?: (e: GameEvent) => void;
  onEnd: (r: RunResult) => void;
};

const STARS = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 2 + 1, d: Math.random() * 0.4 + 0.1 }));

export default function GameView({ W, H, ballColor, trailColor, showHint, onEvent, onEnd }: Props) {
  const s = useRef<State>(createState(W, H)).current;
  const [, setFrame] = useState(0);
  const ended = useRef(false);
  const cb = useRef({ onEvent, onEnd });
  cb.current = { onEvent, onEnd };

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let deadFor = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
      last = now;
      step(s, dt);
      for (const e of s.events) cb.current.onEvent?.(e);
      s.events.length = 0;
      if (s.dead && !ended.current) {
        deadFor += dt;
        if (deadFor > 0.7) {
          ended.current = true;
          cb.current.onEnd({ score: s.score, coins: s.coinsRun, perfects: s.perfects, bestCombo: s.bestCombo });
        }
      }
      setFrame((f) => f + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s]);

  const sx = s.shake ? (Math.random() - 0.5) * s.shake : 0;
  const sy = s.shake ? (Math.random() - 0.5) * s.shake : 0;
  const cy = s.camY;
  const stars = useMemo(() => STARS, []);

  return (
    <Pressable style={StyleSheet.absoluteFill} onPressIn={() => tap(s)}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0b1026' }]}>
        {stars.map((st, i) => {
          const y = (((st.y * H - cy * st.d) % H) + H) % H;
          return <View key={i} style={[styles.star, { left: st.x * W, top: y, width: st.s, height: st.s, opacity: st.d * 2 }]} />;
        })}
      </View>

      <View style={[StyleSheet.absoluteFill, { transform: [{ translateX: sx }, { translateY: sy }] }]}>
        {s.planets.map((p) => {
          const active = p.idx === s.cur;
          const k = active ? Math.max(0.15, p.fuse / p.fuseMax) : 1;
          const r = p.r * (0.55 + 0.45 * k);
          const danger = active && k < 0.35;
          const color = danger ? '#ff5d73' : p.gold ? '#ffd34d' : `hsl(${p.hue},70%,60%)`;
          const top = p.y - cy;
          return (
            <View key={p.idx} pointerEvents="none">
              <View style={[styles.ring, { left: p.x - p.orbit, top: top - p.orbit, width: p.orbit * 2, height: p.orbit * 2, borderRadius: p.orbit, borderColor: p.gold ? '#ffd34daa' : active ? '#ffffff55' : '#ffffff22', borderWidth: p.gold ? 2.5 : 1.5 }]} />
              <View style={[styles.circle, { left: p.x - r, top: top - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: color, opacity: danger && Math.floor(s.t * 10) % 2 ? 0.6 : 1 }]} />
              <View style={[styles.circle, { left: p.x - r * 0.45, top: top - r * 0.55, width: r * 0.5, height: r * 0.5, borderRadius: r, backgroundColor: '#ffffff40' }]} />
            </View>
          );
        })}

        {s.coins.map((c, i) =>
          c.taken ? null : (
            <View key={`c${i}`} style={[styles.coin, { left: c.x - 9, top: c.y - cy - 9, transform: [{ scaleX: Math.abs(Math.cos(s.t * 3 + i)) * 0.7 + 0.3 }] }]} />
          ),
        )}

        {!s.dead &&
          s.trail.map((t, i) => {
            const k = (i + 1) / s.trail.length;
            const r = 3 + k * 6;
            return <View key={`t${i}`} style={[styles.circle, { left: t.x - r, top: t.y - cy - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: trailColor, opacity: k * 0.5 }]} />;
          })}

        {!s.dead && !s.flying &&
          [1, 2, 3, 4].map((i) => {
            const p = s.planets.find((q) => q.idx === s.cur)!;
            const dir = Math.sign(p.spin);
            const x = s.bx - Math.sin(s.ang) * dir * i * 16;
            const y = s.by + Math.cos(s.ang) * dir * i * 16 - cy;
            return <View key={`a${i}`} style={[styles.circle, { left: x - 2.5, top: y - 2.5, width: 5, height: 5, borderRadius: 3, backgroundColor: ballColor, opacity: 0.6 - i * 0.12 }]} />;
          })}

        {!s.dead && <View style={[styles.ball, { left: s.bx - 11, top: s.by - cy - 11, backgroundColor: ballColor, shadowColor: ballColor }]} />}

        {s.particles.map((q, i) => {
          const k = q.life / q.max;
          return <View key={`p${i}`} style={[styles.circle, { left: q.x - q.size / 2, top: q.y - cy - q.size / 2, width: q.size, height: q.size, borderRadius: q.size, backgroundColor: q.color, opacity: k }]} />;
        })}

        {s.popups.map((u, i) => (
          <Text key={`u${i}`} style={[styles.popup, { left: u.x - 100, top: u.y - cy, color: u.color, opacity: Math.min(1, u.life * 2) }]}>
            {u.text}
          </Text>
        ))}
      </View>

      <View style={styles.hud} pointerEvents="none">
        <Text style={styles.score}>{s.score}</Text>
        <Text style={styles.coins}>● {s.coinsRun}</Text>
        {s.combo > 1 && <Text style={styles.combo}>COMBO x{s.combo}</Text>}
      </View>
      {showHint && s.score === 0 && !s.dead && (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintTxt}>TAP when the arrow points{'\n'}at the next planet</Text>
          <Text style={styles.hintSub}>Aim for the center = PERFECT</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  star: { position: 'absolute', backgroundColor: '#fff', borderRadius: 2 },
  ring: { position: 'absolute', borderWidth: 1.5 },
  circle: { position: 'absolute' },
  coin: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffd34d', borderWidth: 2, borderColor: '#e0a400' },
  ball: { position: 'absolute', width: 22, height: 22, borderRadius: 11, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  popup: { position: 'absolute', width: 200, textAlign: 'center', fontWeight: '900', fontSize: 18 },
  hud: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' },
  score: { color: '#fff', fontSize: 64, fontWeight: '900' },
  coins: { color: '#ffd34d', fontSize: 18, fontWeight: '800', marginTop: -4 },
  combo: { color: '#7dffb2', fontSize: 16, fontWeight: '900', marginTop: 6 },
  hint: { position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center' },
  hintTxt: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  hintSub: { color: '#7dffb2', fontSize: 15, fontWeight: '700', marginTop: 8 },
});
