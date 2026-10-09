import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { dailyLevel } from '../game/levels';
import { recordDailyComplete } from '../storage/progress';
import { Button } from '../ui/components/Button';
import { useGoBack } from '../ui/hooks/useGoBack';
import { PuzzleBoard } from '../ui/puzzle/PuzzleBoard';
import { C, F } from '../ui/theme';
import { today } from '../ui/time';

export default function DailyScreen() {
  const goBack = useGoBack();
  // Pinned at open: the puzzle and the streak day must agree even if play crosses midnight.
  const [date] = useState(today);
  const level = useMemo(() => dailyLevel(date), [date]);
  const [streak, setStreak] = useState<number | null>(null);

  return (
    <PuzzleBoard
      level={level}
      title="DAILY CHALLENGE"
      onBack={goBack}
      onSolved={() => recordDailyComplete(date).then((r) => setStreak(r.streak))}
      solvedActions={() => (
        <>
          {streak !== null && (
            <View style={styles.streak}>
              <Text style={styles.flame}>🔥</Text>
              <Text style={styles.streakText}>{streak}-DAY STREAK</Text>
            </View>
          )}
          <Button label="DONE" size="lg" onPress={goBack} />
        </>
      )}
    />
  );
}

const styles = StyleSheet.create({
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flame: { fontSize: 18 },
  streakText: { fontFamily: F.mono, fontSize: 14, fontWeight: '800', color: C.ink },
});
