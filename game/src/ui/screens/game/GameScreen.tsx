import { useEffect, useEffectEvent, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Skin, Theme, TrailStyle } from '../../../game/meta/cosmetics';
import { RunConfig } from '../../../game/meta/session';
import { hsl } from '../../../game/palette';
import { Comet, createState, GameEvent, revive, ghostActive, isSettled, launchDir, POWER_COLOR, RunResult, runResult, State, step, tap, TUNING, zoneOf } from '../../../game/sim/engine';
import { seededRng } from '../../../game/sim/rng';
import { Ball } from '../../components/Ball';
import { Coin, Icon } from '../../components/Icon';
import { Starfield } from '../../components/Starfield';
import { TrailDot, trailLength } from '../../components/TrailDot';
import { alpha, C } from '../../theme';
import { Hud } from './Hud';
import { PlanetView } from './PlanetView';
import { EndFlow } from './endFlow';
import { ReviveOverlay } from './ReviveOverlay';

type Props = {
  W: number;
  H: number;
  skin: Skin;
  trailStyle: TrailStyle;
  theme: Theme;
  config: RunConfig;
  onEvent?: (e: GameEvent, combo: number) => void;
  onEnd: (r: RunResult) => void;
  /** Coins for the next revive of this run, or null when none is offered. */
  reviveOffer?: (used: number) => number | null;
  onRevive?: (used: number) => void;
  wallet?: number;
};



const COMET_SEED = 7919;
const MAX_DT = 1 / 30;

function useGameLoop(s: State, onEvent: Props['onEvent'], onEnd: Props['onEnd'], reviveOffer: Props['reviveOffer']) {
  const [, setFrame] = useState(0);
  const [offer, setOffer] = useState<number | null>(null);
  const [flow] = useState(() => new EndFlow());
  const emit = useEffectEvent((e: GameEvent) => onEvent?.(e, s.combo));
  const finish = useEffectEvent((r: RunResult) => onEnd(r));
  const priceFor = useEffectEvent(() => reviveOffer?.(s.revives) ?? null);

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, MAX_DT) : 0;
      last = now;
      step(s, dt);
      for (const e of s.events) emit(e);
      s.events.length = 0;
      const next = flow.tick(dt, s.dead, priceFor);
      if (next === 'end') finish(runResult(s));
      else if (next !== null) setOffer(next);
      setFrame((f) => f + 1);
      if (!(flow.ended && isSettled(s))) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [s, flow]);

  const resume = () => {
    flow.resume();
    setOffer(null);
  };
  const decline = () => {
    flow.decline();
    setOffer(null);
  };
  return { offer, resume, decline };
}

export function GameScreen({ W, H, skin, trailStyle, theme, config, onEvent, onEnd, reviveOffer, onRevive, wallet = 0 }: Props) {
  const [g] = useState(() => {
    const seeded = config.seed !== undefined;
    return createState(W, H, {
      bestIdx: config.bestIdx, mods: config.mods, rules: config.rules, ghost: config.ghost, headStart: config.headStart,
      rng: seeded ? seededRng(config.seed!) : Math.random,
      cometRng: seeded ? seededRng(config.seed! + COMET_SEED) : Math.random,
    });
  });
  const { offer, resume, decline } = useGameLoop(g, onEvent, onEnd, reviveOffer);
  const accept = () => {
    onRevive?.(g.revives);
    revive(g);
    resume();
  };

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

        {g.planets.map((p) => <PlanetView key={p.idx} p={p} active={p.idx === g.cur} top={p.y - cy} t={g.t} color={theme.planet(p.idx)} />)}

        {ghostPlanet && (
          <View style={[styles.ghost, { left: ghostPlanet.x + Math.cos(g.t * 2.4) * ghostPlanet.orbit - 11, top: ghostPlanet.y + Math.sin(g.t * 2.4) * ghostPlanet.orbit - cy - 11 }]}>
            <Text style={styles.ghostTxt}>GHOST</Text>
          </View>
        )}

        {g.coins.map((c, i) => (c.taken ? null : <View key={`c${i}`} style={[styles.coin, { left: c.x - 9, top: c.y - cy - 9, transform: [{ scaleX: Math.abs(Math.cos(g.t * 3 + i)) * 0.7 + 0.3 }] }]} />))}

        {g.comets.map((c, i) => (c.taken ? null : <CometView key={`m${i}`} c={c} top={c.y - cy} t={g.t} />))}

        {g.powerups.map((u, i) =>
          u.taken ? null : (
            <View key={`pw${i}`} style={[styles.power, { left: u.x - 16, top: u.y - cy - 16, borderColor: POWER_COLOR[u.kind], transform: [{ scale: 1 + 0.12 * Math.sin(g.t * 6 + i) }] }]}>
              <Icon name={u.kind === 'shield' ? 'shield-halved' : 'magnet'} size={15} color={POWER_COLOR[u.kind]} />
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
          <Text key={`u${i}`} style={[styles.popup, { left: u.x - 100, top: u.y - cy, color: u.color, opacity: Math.min(1, u.life * 2) }]}>
            {u.text}
            {u.coins && <> <Coin size={16} /></>}
          </Text>
        ))}
      </View>

      <Hud g={g} challenge={config.challenge} />

      {offer !== null && <ReviveOverlay price={offer} score={g.score} wallet={wallet} onRevive={accept} onDecline={decline} />}

      {config.showHint && g.score === 0 && alive && (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintTxt}>TAP when the arrow points{'\n'}at the next planet</Text>
          <Text style={styles.hintSub}>Aim for the center = PERFECT</Text>
        </View>
      )}
    </Pressable>
  );
}

const COMET_TAIL = 7;

function CometView({ c, top, t }: { c: Comet; top: number; t: number }) {
  const back = -Math.sign(c.vx);
  return (
    <>
      {Array.from({ length: COMET_TAIL }, (_, i) => {
        const k = 1 - (i + 1) / (COMET_TAIL + 1);
        const size = 4 + 10 * k;
        return <View key={i} style={[styles.abs, { left: c.x + back * (i + 1) * 11 - size / 2, top: top - size / 2 + Math.sin(t * 20 + i) * 1.5, width: size, height: size, borderRadius: size, backgroundColor: i < 2 ? C.text : C.sky, opacity: 0.85 * k }]} />;
      })}
      <View style={[styles.comet, { left: c.x - 11, top: top - 11 }]} />
    </>
  );
}

const styles = StyleSheet.create({
  comet: { position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: C.text, borderWidth: 3, borderColor: C.sky, shadowColor: C.sky, shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  abs: { position: 'absolute' },
  aim: { position: 'absolute', width: 5, height: 5, borderRadius: 3 },
  coin: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: C.gold, borderWidth: 2, borderColor: C.goldDeep },
  popup: { position: 'absolute', width: 200, textAlign: 'center', fontWeight: '900', fontSize: 18 },
  bestLine: { position: 'absolute', left: 0, right: 0, height: 0, borderTopWidth: 2, borderColor: alpha(C.gold, 0.53), borderStyle: 'dashed' },
  bestTxt: { position: 'absolute', right: 10, top: -22, color: C.gold, fontWeight: '900', fontSize: 13, letterSpacing: 2 },
  power: { position: 'absolute', width: 32, height: 32, borderRadius: 16, borderWidth: 3, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(C.text, 0.08) },
  shield: { position: 'absolute', width: 40, height: 40, borderRadius: 20, borderWidth: 2.5, borderColor: C.cyan, backgroundColor: alpha(C.cyan, 0.13) },
  magnetRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: C.pink },
  ghost: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: alpha(C.text, 0.67), backgroundColor: alpha(C.text, 0.15), alignItems: 'center' },
  ghostTxt: { position: 'absolute', top: -16, left: -19, width: 60, textAlign: 'center', color: alpha(C.text, 0.67), fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  hint: { position: 'absolute', bottom: 90, left: 0, right: 0, alignItems: 'center' },
  hintTxt: { color: C.text, fontSize: 20, fontWeight: '800', textAlign: 'center' },
  hintSub: { color: C.mint, fontSize: 15, fontWeight: '700', marginTop: 8 },
});
