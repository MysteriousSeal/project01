import { useEffect, useEffectEvent, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Skin, TrailStyle } from '../../game/cosmetics';
import { nextMedal, statOf } from '../../game/challenge';
import { ChallengeType, statUnit } from '../../game/challengeTypes';
import { createState, GameEvent, ghostActive, isSettled, launchDir, Planet, POWER_COLOR, RunResult, runResult, State, step, tap, TUNING, WORLD, zoneOf } from '../../game/engine';
import { Track } from '../../game/ghost';
import { seededRng } from '../../game/rng';
import { inGap } from '../../game/world';
import { hsl } from '../../game/palette';
import { DEFAULT_MODS, Mods } from '../../game/upgrades';
import { Ball } from '../components/Ball';
import { ProgressBar } from '../components/ProgressBar';
import { Starfield } from '../components/Starfield';
import { TrailDot, trailLength } from '../components/TrailDot';
import { C, F, TOP_INSET } from '../theme';

type Props = {
  W: number;
  H: number;
  skin: Skin;
  trailStyle: TrailStyle;
  mods?: Mods;
  showHint?: boolean;
  bestIdx?: number;
  seed?: number;
  ghost?: Track;
  challenge?: ChallengeType;
  onEvent?: (e: GameEvent) => void;
  onEnd: (r: RunResult) => void;
};

const END_DELAY = 0.7;
const MAX_DT = 1 / 30;

function useGameLoop(s: State, onEvent: Props['onEvent'], onEnd: Props['onEnd']) {
  const [, setFrame] = useState(0);
  const emit = useEffectEvent((e: GameEvent) => onEvent?.(e));
  const finish = useEffectEvent((r: RunResult) => onEnd(r));

  useEffect(() => {
    let raf = 0;
    let last = 0;
    let deadFor = 0;
    let ended = false;
    const loop = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 0;
      last = now;
      step(s, dt);
      for (const e of s.events) emit(e);
      s.events.length = 0;
      if (s.dead && !ended) {
        deadFor += dt;
        if (deadFor > END_DELAY) {
          ended = true;
          finish(runResult(s));
        }
      }
      setFrame((f) => f + 1);
      if (!(ended && isSettled(s))) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s]);
}

export function GameScreen({ W, H, skin, trailStyle, mods = DEFAULT_MODS, showHint, bestIdx = 0, seed, ghost, challenge, onEvent, onEnd }: Props) {
  const [g] = useState(() => createState(W, H, { bestIdx, mods, ghost, rules: challenge?.rules, rng: seed === undefined ? Math.random : seededRng(seed) }));
  useGameLoop(g, onEvent, onEnd);

  const shake = g.shake ? { transform: [{ translateX: g.shakeX }, { translateY: g.shakeY }] } : null;
  const cy = g.camY;
  const fever = g.fever > 0;
  const hueT = (g.t * 240) % 360;
  const ball = fever ? hsl(hueT, 100, 70) : skin.ball;
  const trail = fever ? hsl((hueT + 60) % 360, 100, 60) : skin.trail;
  const bestPlanet = g.bestIdx > 0 ? g.planets.find((p) => p.idx === g.bestIdx) : undefined;
  const alive = !g.dead;
  const aim = alive && !g.flying ? launchDir(g) : null;
  const ghostPlanet = alive && ghostActive(g) ? g.planets.find((p) => p.idx === g.ghostIdx) : undefined;

  return (
    <Pressable style={StyleSheet.absoluteFill} onPressIn={() => tap(g)} accessibilityLabel="Game area. Tap to launch.">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: zoneOf(g.cur).bg }]}>
        {fever && <View style={[StyleSheet.absoluteFill, { backgroundColor: C.pink, opacity: 0.08 + 0.05 * Math.sin(g.t * 12) }]} />}
        {g.slowmo > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: C.gold, opacity: 0.1 * (g.slowmo / TUNING.slowmoTime) }]} />}
        <Starfield width={W} height={H} offset={cy} />
      </View>

      <View style={[StyleSheet.absoluteFill, shake]} pointerEvents="none">
        {bestPlanet && (
          <View style={[styles.bestLine, { top: bestPlanet.y - cy }]}>
            <Text style={styles.bestTxt}>BEST</Text>
          </View>
        )}

        {g.planets.map((p) => <PlanetView key={p.idx} p={p} active={p.idx === g.cur} top={p.y - cy} t={g.t} />)}

        {ghostPlanet && (
          <View style={[styles.ghost, { left: ghostPlanet.x + Math.cos(g.t * 2.4) * ghostPlanet.orbit - 11, top: ghostPlanet.y + Math.sin(g.t * 2.4) * ghostPlanet.orbit - cy - 11 }]}>
            <Text style={styles.ghostTxt}>GHOST</Text>
          </View>
        )}

        {g.coins.map((c, i) => (c.taken ? null : <View key={`c${i}`} style={[styles.coin, { left: c.x - 9, top: c.y - cy - 9, transform: [{ scaleX: Math.abs(Math.cos(g.t * 3 + i)) * 0.7 + 0.3 }] }]} />))}

        {g.powerups.map((u, i) =>
          u.taken ? null : (
            <View key={`pw${i}`} style={[styles.power, { left: u.x - 16, top: u.y - cy - 16, borderColor: POWER_COLOR[u.kind], transform: [{ scale: 1 + 0.12 * Math.sin(g.t * 6 + i) }] }]}>
              <Text style={[styles.powerTxt, { color: POWER_COLOR[u.kind] }]}>{u.kind === 'shield' ? 'S' : 'M'}</Text>
            </View>
          ),
        )}

        {alive && g.trail.slice(-trailLength(trailStyle)).map((t, i, arr) => <TrailDot key={`t${i}`} style={trailStyle} k={(i + 1) / arr.length} i={i} x={t.x} y={t.y - cy} color={trail} t={g.t} scale={0.8} />)}

        {aim && [1, 2, 3, 4].map((i) => <View key={`a${i}`} style={[styles.aim, { left: g.bx + aim.x * i * 16 - 2.5, top: g.by + aim.y * i * 16 - cy - 2.5, backgroundColor: skin.ball, opacity: 0.6 - i * 0.12 }]} />)}

        {alive && g.shield && <View style={[styles.shield, { left: g.bx - 20, top: g.by - cy - 20 }]} />}
        {alive && g.magnet > 0 && <View style={[styles.magnetRing, { left: g.bx - 40, top: g.by - cy - 40, opacity: 0.25 + 0.15 * Math.sin(g.t * 10) }]} />}
        {alive && <Ball color={ball} outline={skin.outline && !fever} style={[styles.abs, { left: g.bx - 11, top: g.by - cy - 11 }]} />}

        {g.particles.map((q, i) => (
          <View key={`p${i}`} style={[styles.abs, { left: q.x - q.size / 2, top: q.y - cy - q.size / 2, width: q.size, height: q.size, borderRadius: q.size, backgroundColor: q.color, opacity: q.life / q.max }]} />
        ))}

        {g.popups.map((u, i) => (
          <Text key={`u${i}`} style={[styles.popup, { left: u.x - 100, top: u.y - cy, color: u.color, opacity: Math.min(1, u.life * 2) }]}>{u.text}</Text>
        ))}
      </View>

      <Hud g={g} fever={fever} challenge={challenge} />

      {showHint && g.score === 0 && alive && (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintTxt}>TAP when the arrow points{'\n'}at the next planet</Text>
          <Text style={styles.hintSub}>Aim for the center = PERFECT</Text>
        </View>
      )}
    </Pressable>
  );
}

function PlanetView({ p, active, top, t }: { p: Planet; active: boolean; top: number; t: number }) {
  const k = active ? Math.max(0.15, p.fuse / p.fuseMax) : 1;
  const r = p.r * (0.55 + 0.45 * k);
  const danger = active && k < 0.35;
  const color = danger ? C.danger : p.gold ? C.gold : p.boss ? hsl(285, 55, 45) : hsl(p.hue, 70, 60);
  return (
    <>
      {p.ring && <BossRing p={p} top={top} />}
      {p.boss && <Text style={[styles.bossTag, { left: p.x - 50, top: top - p.orbit - 34 }]}>{p.ring ? 'BOSS' : 'CLEARED'}</Text>}
      <View style={[styles.ring, { left: p.x - p.orbit, top: top - p.orbit, width: p.orbit * 2, height: p.orbit * 2, borderRadius: p.orbit, borderColor: p.gold ? '#ffd34daa' : active ? '#ffffff55' : '#ffffff22', borderWidth: p.gold ? 2.5 : 1.5 }]} />
      <View style={[styles.abs, { left: p.x - r, top: top - r, width: r * 2, height: r * 2, borderRadius: r, backgroundColor: color, opacity: danger && Math.floor(t * 10) % 2 ? 0.6 : 1 }]} />
      <View style={[styles.abs, { left: p.x - r * 0.45, top: top - r * 0.55, width: r * 0.5, height: r * 0.5, borderRadius: r, backgroundColor: '#ffffff40' }]} />
    </>
  );
}

const RING_DOTS = 30;

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

function ghostLabel(g: State) {
  const lead = g.ghostIdx - g.cur;
  if (lead > 0) return { text: `GHOST AHEAD +${lead}`, color: C.dim };
  if (lead < 0) return { text: `AHEAD OF GHOST +${-lead}`, color: C.mint };
  return { text: 'NECK AND NECK', color: C.text };
}

function Hud({ g, fever, challenge }: { g: State; fever: boolean; challenge?: ChallengeType }) {
  const next = challenge ? nextMedal(statOf(challenge, { score: g.score, coins: g.coinsRun }), challenge) : undefined;
  const bossNext = g.planets.find((p) => p.idx === g.cur + 1)?.ring;
  const ghost = ghostActive(g) && !g.dead ? ghostLabel(g) : null;
  return (
    <View style={styles.hud} pointerEvents="none">
      {challenge && <Text style={styles.daily}>{challenge.glyph} {challenge.name.toUpperCase()} · {next ? `${next.name} at ${next.score} ${statUnit(challenge)}` : 'GOLD!'}</Text>}
      <Text style={styles.score}>{g.score}</Text>
      <Text style={styles.coins}>● {g.coinsRun}</Text>
      {g.combo > 1 && <Text style={styles.combo}>COMBO x{g.combo}{!fever && g.combo % g.rules.feverEvery === g.rules.feverEvery - 1 ? '  · next = FEVER' : ''}</Text>}
      {fever && <Timer label="FEVER  ×2 ●" value={g.fever / (g.mods.feverTime + g.rules.feverBonus)} color={C.pink} />}
      {g.magnet > 0 && <Timer label="MAGNET" value={g.magnet / g.mods.magnetTime} color={C.pink} />}
      {g.shield && <Text style={[styles.combo, { color: C.cyan }]}>SHIELD ON</Text>}
      {ghost && <Text style={[styles.status, { color: ghost.color }]}>{ghost.text}</Text>}
      {bossNext && !g.dead && <Text style={[styles.status, { color: C.pink }]}>BOSS AHEAD · FLY THROUGH THE GAP</Text>}
    </View>
  );
}

function Timer({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.timer}>
      <Text style={[styles.timerTxt, { color }]}>{label}</Text>
      <ProgressBar value={value} color={color} height={5} width={120} />
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  ring: { position: 'absolute' },
  aim: { position: 'absolute', width: 5, height: 5, borderRadius: 3 },
  coin: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: C.gold, borderWidth: 2, borderColor: C.goldDeep },
  popup: { position: 'absolute', width: 200, textAlign: 'center', fontWeight: '900', fontSize: 18 },
  hud: { position: 'absolute', top: TOP_INSET, left: 0, right: 0, alignItems: 'center' },
  score: { color: C.text, fontFamily: F.display, fontSize: 64, fontWeight: '900' },
  coins: { color: C.gold, fontFamily: F.mono, fontSize: 18, fontWeight: '800', marginTop: -4 },
  combo: { color: C.mint, fontSize: 16, fontWeight: '900', marginTop: 6 },
  bestLine: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 2, borderColor: '#ffd34d88', borderStyle: 'dashed' },
  bestTxt: { position: 'absolute', right: 10, top: -22, color: C.gold, fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  power: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff15' },
  powerTxt: { fontWeight: '900', fontSize: 15 },
  shield: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: C.cyan, backgroundColor: '#4cc9f022' },
  magnetRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: C.pink },
  timer: { alignItems: 'center', marginTop: 6, gap: 3 },
  timerTxt: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
  ghost: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ffffffaa', backgroundColor: '#ffffff26', alignItems: 'center' },
  ghostTxt: { position: 'absolute', top: -16, left: -19, width: 60, textAlign: 'center', color: '#ffffffaa', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  ringDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: C.pink, opacity: 0.85 },
  gapEdge: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: C.mint },
  bossTag: { position: 'absolute', width: 100, textAlign: 'center', color: C.pink, fontFamily: F.display, fontWeight: '900', fontSize: 14, letterSpacing: 3 },
  daily: { color: C.gold, fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2 },
  status: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: 6 },
  hint: { position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center' },
  hintTxt: { color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  hintSub: { color: C.mint, fontSize: 15, fontWeight: '700', marginTop: 8 },
});
