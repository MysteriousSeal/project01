import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StarRow } from '../ui/components/StarRow';
import { worldForLevel, worldName, WORLD_SIZE } from '../game/generate';
import { getDailyStatus, getLevelRecords, loadHighestUnlocked, LevelRecord } from '../game/save';
import { C, dotColors, F, GUTTER, RADIUS, softShadow } from '../game/theme';

const TOTAL_LEVELS = 60;

export default function LevelSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [highestUnlocked, setHighestUnlocked] = useState(1);
  const [records, setRecords] = useState<Record<number, LevelRecord>>({});
  const [daily, setDaily] = useState<{ streak: number; completedToday: boolean } | null>(null);

  useEffect(() => {
    loadHighestUnlocked().then(setHighestUnlocked);
    getLevelRecords().then(setRecords);
    getDailyStatus().then(setDaily);
  }, []);

  const levels = Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }}>
        <View style={styles.header}>
          <Text style={styles.title}>FLOWDOTS</Text>
          <Text style={styles.subtitle}>CONNECT · FILL · SOLVE</Text>
        </View>

        <Pressable
          onPress={() => router.push('/daily')}
          style={({ pressed }) => [styles.dailyCard, softShadow(0.1, 10, 3), pressed && styles.pressed]}
        >
          <Text style={styles.dailyFlame}>{daily?.completedToday ? '✅' : '🔥'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.dailyTitle}>DAILY CHALLENGE</Text>
            <Text style={styles.dailySubtitle}>
              {daily?.completedToday
                ? `Done for today · ${daily.streak}-day streak`
                : daily && daily.streak > 0
                  ? `${daily.streak}-day streak — keep it going`
                  : 'A fresh puzzle every day'}
            </Text>
          </View>
          <Text style={styles.dailyChevron}>›</Text>
        </Pressable>

        {Array.from({ length: TOTAL_LEVELS / WORLD_SIZE }, (_, worldIndex) => {
          const worldColor = dotColors[worldIndex % dotColors.length];
          const worldLevels = levels.filter((id) => worldForLevel(id) === worldIndex);
          return (
            <View key={worldIndex} style={styles.worldBlock}>
              <View style={styles.worldHeader}>
                <View style={[styles.worldDot, { backgroundColor: worldColor }]} />
                <Text style={styles.worldName}>{worldName(worldIndex)}</Text>
              </View>

              <View style={styles.track}>
                {worldLevels.map((levelId, i) => {
                  const locked = levelId > highestUnlocked;
                  const isNext = levelId === highestUnlocked;
                  const record = records[levelId];
                  return (
                    <View key={levelId} style={styles.stationWrap}>
                      {i > 0 && <View style={[styles.connector, { backgroundColor: worldColor }]} />}
                      <Pressable
                        disabled={locked}
                        onPress={() => router.push(`/game/${levelId}`)}
                        style={({ pressed }) => [pressed && !locked && styles.pressed]}
                      >
                        <View
                          style={[
                            styles.station,
                            locked ? styles.stationLocked : { borderColor: worldColor },
                            isNext && styles.stationNext,
                            isNext && { borderColor: worldColor, backgroundColor: worldColor },
                          ]}
                        >
                          <Text style={[styles.stationText, (locked || isNext) && styles.stationTextInverted]}>
                            {locked ? '•' : levelId}
                          </Text>
                        </View>
                      </Pressable>
                      <View style={styles.starSlot}>{record ? <StarRow stars={record.stars} size={9} /> : null}</View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.canvas },
  header: { alignItems: 'center', marginBottom: 18 },
  title: { color: C.ink, fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 36, letterSpacing: 1 },
  subtitle: { color: C.inkDim, fontSize: 12, fontWeight: '700', letterSpacing: 2, marginTop: 2 },
  dailyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.surface,
    borderRadius: RADIUS.lg,
    padding: 14,
    marginHorizontal: GUTTER,
    marginBottom: 28,
  },
  dailyFlame: { fontSize: 24 },
  dailyTitle: { color: C.ink, fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  dailySubtitle: { color: C.inkDim, fontSize: 12, marginTop: 2 },
  dailyChevron: { color: C.inkDim, fontSize: 22, fontWeight: '900' },
  pressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
  worldBlock: { marginBottom: 8 },
  worldHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: GUTTER, marginBottom: 6 },
  worldDot: { width: 10, height: 10, borderRadius: 5 },
  worldName: { color: C.ink, fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 15, letterSpacing: 1 },
  track: { alignItems: 'center' },
  stationWrap: { alignItems: 'center' },
  connector: { width: 5, height: 20, borderRadius: 3 },
  station: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationLocked: { borderColor: C.locked, backgroundColor: C.canvas },
  stationNext: { borderWidth: 3 },
  stationText: { color: C.ink, fontWeight: '900', fontSize: 16 },
  stationTextInverted: { color: C.surface },
  starSlot: { height: 12, marginTop: 2, marginBottom: 6 },
});
