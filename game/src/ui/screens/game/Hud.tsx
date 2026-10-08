import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { nextMedal, statOf } from '../../../game/meta/challenge';
import { ChallengeType, statUnit } from '../../../game/meta/challengeTypes';
import { ghostActive, State } from '../../../game/sim/engine';
import { Coin, Icon } from '../../components/Icon';
import { ProgressBar } from '../../components/ProgressBar';
import { C, F, TOP_INSET } from '../../theme';

function ghostLabel(g: State) {
  const lead = g.ghostIdx - g.cur;
  if (lead > 0) return { text: `GHOST AHEAD +${lead}`, color: C.dim };
  if (lead < 0) return { text: `AHEAD OF GHOST +${-lead}`, color: C.mint };
  return { text: 'NECK AND NECK', color: C.text };
}

export function Hud({ g, challenge }: { g: State; challenge?: ChallengeType }) {
  const fever = g.fever > 0;
  const next = challenge ? nextMedal(statOf(challenge, { score: g.score, coins: g.coinsRun }), challenge) : undefined;
  const bossNext = !g.dead && g.planets.some((p) => p.idx === g.cur + 1 && p.ring);
  const ghost = ghostActive(g) && !g.dead ? ghostLabel(g) : null;
  const feverSoon = !fever && g.combo > 1 && g.combo % g.rules.feverEvery === g.rules.feverEvery - 1;
  return (
    <View style={styles.hud} pointerEvents="none">
      {challenge && (
        <Text style={styles.daily}>
          <Icon name={challenge.icon} size={12} color={C.gold} /> {challenge.name.toUpperCase()} · {next ? `${next.name} at ${next.score} ${statUnit(challenge)}` : 'GOLD!'}
        </Text>
      )}
      <Text style={styles.score}>{g.score}</Text>
      <Text style={styles.coins}>
        <Coin size={16} /> {g.coinsRun}
      </Text>
      {g.combo > 1 && <Text style={styles.combo}>COMBO x{g.combo}{feverSoon ? '  · next = FEVER' : ''}</Text>}
      {fever && <Timer label={<>FEVER ×2 <Coin size={13} color={C.pink} /></>} value={g.fever / (g.mods.feverTime + g.rules.feverBonus)} color={C.pink} />}
      {g.magnet > 0 && <Timer label="MAGNET" value={g.magnet / g.mods.magnetTime} color={C.pink} />}
      {g.shield && <Text style={[styles.combo, { color: C.cyan }]}>SHIELD ON</Text>}
      {ghost && <Text style={[styles.status, { color: ghost.color }]}>{ghost.text}</Text>}
      {bossNext && <Text style={[styles.status, { color: C.pink }]}>BOSS AHEAD · FLY THROUGH THE GAP</Text>}
    </View>
  );
}

function Timer({ label, value, color }: { label: ReactNode; value: number; color: string }) {
  return (
    <View style={styles.timer}>
      <Text style={[styles.timerTxt, { color }]}>{label}</Text>
      <ProgressBar value={value} color={color} height={5} width={120} />
    </View>
  );
}

const styles = StyleSheet.create({
  hud: { position: 'absolute', top: TOP_INSET, left: 0, right: 0, alignItems: 'center' },
  daily: { color: C.gold, fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2 },
  score: { color: C.text, fontFamily: F.display, fontSize: 64, fontWeight: '900' },
  coins: { color: C.gold, fontFamily: F.mono, fontSize: 18, fontWeight: '800', marginTop: -4 },
  combo: { color: C.mint, fontSize: 16, fontWeight: '900', marginTop: 6 },
  status: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: 6 },
  timer: { alignItems: 'center', marginTop: 6, gap: 3 },
  timerTxt: { fontWeight: '900', fontSize: 14, letterSpacing: 1 },
});
