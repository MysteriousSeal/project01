import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { currentChallenges, medalStreak } from '../../game/challenge';
import { challengeTypesFor } from '../../game/challengeTypes';
import { dailyStatus } from '../../game/daily';
import { Save } from '../../game/save';
import { ChallengeRow } from '../components/ChallengeRow';
import { Coin, Icon } from '../components/Icon';
import { TopBar } from '../components/TopBar';
import { C, F, GAP, GUTTER, RADIUS } from '../theme';

type Props = { save: Save; onPlay: (type: string) => void; onClaim: () => void };

export function DailyScreen({ save, onPlay, onClaim }: Props) {
  const reward = dailyStatus(save);
  const today = currentChallenges(save.challenges);
  const streak = medalStreak(today);
  const now = new Date();
  const tomorrow = challengeTypesFor(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));

  return (
    <View style={styles.root}>
      <TopBar save={save} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Text style={styles.title} accessibilityRole="header">Daily</Text>
          {streak > 0 && <Text style={styles.streak}>{streak}-day medal streak</Text>}
        </View>

        {reward.available ? (
          <Pressable style={[styles.reward, styles.rewardOn]} onPress={onClaim} accessibilityRole="button" accessibilityLabel={`Claim daily reward, ${reward.reward} coins`}>
            <View style={styles.dayBadge}>
              <Text style={styles.dayNum}>{reward.streak}</Text>
            </View>
            <Text style={styles.rewardTxt}>Daily reward · day {reward.streak}</Text>
            <Text style={styles.claim}>Claim <Coin color={C.space} size={12} /> {reward.reward}</Text>
          </Pressable>
        ) : (
          <View style={styles.reward} accessible accessibilityLabel={`Daily reward claimed, ${save.streak}-day streak`}>
            <Text style={styles.rewardDone}><Icon name="check" size={12} color={C.mint} /> Daily reward claimed · {save.streak}-day streak</Text>
          </View>
        )}

        <Text style={styles.section}>TODAY&apos;S CHALLENGES · SAME PLANETS FOR EVERYONE · UPGRADES OFF</Text>
        {today.slots.map((slot) => <ChallengeRow key={slot.type} slot={slot} onPlay={() => onPlay(slot.type)} />)}

        <View style={styles.tomorrow} accessible accessibilityLabel={`Tomorrow: ${tomorrow.map((t) => t.name).join(', ')}`}>
          <Text style={styles.section}>TOMORROW</Text>
          <View style={styles.tomorrowRow}>
            {tomorrow.map((t) => (
              <Text key={t.id} style={styles.tomorrowTxt} numberOfLines={1}>
                <Icon name={t.icon} size={12} color={C.dim} /> {t.name}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.space },
  content: { paddingHorizontal: GUTTER, paddingBottom: 20, gap: GAP },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 2 },
  title: { color: C.text, fontFamily: F.display, fontWeight: '900', fontSize: 30, letterSpacing: 2 },
  streak: { color: C.gold, fontSize: 12, fontWeight: '800' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 8, borderRadius: RADIUS.md, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  rewardOn: { backgroundColor: '#ffd34d14', borderColor: '#ffd34d88', borderWidth: 1.5 },
  dayBadge: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center' },
  dayNum: { color: C.space, fontFamily: F.mono, fontSize: 14, fontWeight: '800' },
  rewardTxt: { flex: 1, color: C.text, fontSize: 14, fontWeight: '800' },
  rewardDone: { color: C.dim, fontSize: 13, fontWeight: '700' },
  claim: { color: C.space, backgroundColor: C.gold, fontWeight: '900', fontSize: 13, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, overflow: 'hidden' },
  section: { color: C.dim, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, lineHeight: 16, marginTop: 4 },
  tomorrow: { gap: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: RADIUS.md, borderWidth: 1, borderColor: C.line, borderStyle: 'dashed' },
  tomorrowRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4 },
  tomorrowTxt: { color: '#ffffffbb', fontSize: 13, fontWeight: '700' },
});
