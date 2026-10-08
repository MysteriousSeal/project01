import { StyleSheet, Text, View } from 'react-native';
import { attemptsLeft, CHALLENGE_ATTEMPTS, ChallengeSlot, medalsOf, nextMedal, typeOf } from '../../game/meta/challenge';
import { statUnit } from '../../game/meta/challengeTypes';
import { alpha, C, CARD, F, RADIUS } from '../theme';
import { Button } from './Button';
import { Icon } from './Icon';
import { Pips } from './Pips';

type Props = { slot: ChallengeSlot; onPlay?: () => void; highlight?: boolean };

export function ChallengeRow({ slot, onPlay, highlight }: Props) {
  const t = typeOf(slot);
  const unit = statUnit(t);
  const left = attemptsLeft(slot);
  const next = nextMedal(slot.best, t);
  const done = left === 0 || !next;

  return (
    <View style={[styles.card, highlight && styles.highlight]}>
      <View style={styles.top}>
        <View style={[styles.tile, done && styles.tileDone]}>
          <Icon name={t.icon} size={20} color={done ? C.dim : C.gold} />
        </View>
        <View style={styles.body} accessible accessibilityLabel={`${t.name}. ${t.summary}`}>
          <Text style={styles.name}>{t.name}</Text>
          <Text style={styles.summary} numberOfLines={2}>{t.summary}</Text>
        </View>
        {onPlay &&
          (done ? (
            <Button label={next ? 'Done' : 'Gold!'} variant="muted" labelColor={next ? C.dim : C.gold} style={styles.btn} />
          ) : (
            <Button label="Play" variant="gold" onPress={onPlay} style={styles.btn} accessibilityLabel={`Play ${t.name}, ${left} attempts left`} />
          ))}
      </View>

      <View style={styles.bottom}>
        <View style={styles.medals} accessible accessibilityLabel={`Medals: ${medalsOf(t).map((m) => `${m.name} at ${m.score} ${unit}`).join(', ')}. ${slot.medal} earned.`}>
          {medalsOf(t).map((m, i) => (
            <View key={m.name} style={styles.chip}>
              <View style={[styles.dot, { borderColor: m.color }, i < slot.medal && { backgroundColor: m.color }]} />
              <Text style={[styles.chipTxt, { color: i < slot.medal ? m.color : C.dim }]}>{m.score}</Text>
            </View>
          ))}
          <Text style={styles.unit}>{unit}</Text>
        </View>
        <View style={styles.meta} accessible accessibilityLabel={`${left} of ${CHALLENGE_ATTEMPTS} attempts left. Best ${slot.best} ${unit}.`}>
          <Pips total={CHALLENGE_ATTEMPTS} filled={left} color={C.gold} />
          <Text style={styles.best}>Best <Text style={styles.bestVal}>{slot.best}</Text></Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...CARD, alignSelf: 'stretch', padding: 12, gap: 10 },
  highlight: { borderColor: C.gold },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tile: { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: alpha(C.gold, 0.12), borderWidth: 1.5, borderColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  tileDone: { backgroundColor: C.surface, borderColor: C.line },
  body: { flex: 1 },
  name: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 16 },
  summary: { color: C.dim, fontSize: 12, lineHeight: 16, marginTop: 1 },
  btn: { minWidth: 70, paddingVertical: 10 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  medals: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  chipTxt: { fontFamily: F.mono, fontSize: 12, fontWeight: '700' },
  unit: { color: C.dim, fontSize: 11, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  best: { color: C.dim, fontSize: 12, fontWeight: '700' },
  bestVal: { color: C.text, fontFamily: F.mono },
});
