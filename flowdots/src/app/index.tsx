import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WORLD_COUNT } from '../game/levels';
import { dailyStatus } from '../storage/progress';
import { useProgress } from '../ui/hooks/useProgress';
import { DailyCard } from '../ui/levelSelect/DailyCard';
import { WorldRoute } from '../ui/levelSelect/WorldRoute';
import { C, F } from '../ui/theme';
import { today } from '../ui/time';

const NO_RECORDS = {};

export default function LevelSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const progress = useProgress();
  const openLevel = useCallback((levelId: number) => router.push(`/game/${levelId}`), [router]);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.header}>
          <Text style={styles.title}>FLOWDOTS</Text>
          <Text style={styles.subtitle}>CONNECT · FILL · SOLVE</Text>
        </View>

        <DailyCard status={progress && dailyStatus(progress, today())} onPress={() => router.push('/daily')} />

        {Array.from({ length: WORLD_COUNT }, (_, worldIndex) => (
          <WorldRoute
            key={worldIndex}
            worldIndex={worldIndex}
            highestUnlocked={progress?.highestUnlocked ?? 1}
            records={progress?.levels ?? NO_RECORDS}
            onOpen={openLevel}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },
  header: { alignItems: 'center', marginBottom: 18 },
  title: { color: C.ink, fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 36, letterSpacing: 1 },
  subtitle: { color: C.inkDim, fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
});
