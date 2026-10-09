import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../ui/components/Button';
import { PuzzleBoard } from '../ui/components/PuzzleBoard';
import { generateDaily, generateDailySolution } from '../game/generate';
import { recordDailyComplete } from '../game/save';
import { C, F } from '../game/theme';

export default function DailyScreen() {
  const router = useRouter();
  const def = useMemo(() => generateDaily(), []);
  const solution = useMemo(() => generateDailySolution(), []);
  const [streak, setStreak] = useState<number | null>(null);

  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <PuzzleBoard
        def={def}
        solution={solution}
        title="DAILY CHALLENGE"
        onBack={() => router.back()}
        onSolved={() => {
          recordDailyComplete().then(({ streak: s }) => setStreak(s));
        }}
        solvedActions={() => (
          <View style={{ alignItems: 'center', gap: 12 }}>
            {streak !== null && (
              <View style={styles.streakRow}>
                <Text style={styles.streakFlame}>🔥</Text>
                <Text style={styles.streakText}>{streak}-DAY STREAK</Text>
              </View>
            )}
            <Button label="DONE" size="lg" onPress={() => router.replace('/')} />
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakFlame: { fontSize: 18 },
  streakText: { fontFamily: F.mono, fontSize: 14, fontWeight: '800', color: C.ink },
});
