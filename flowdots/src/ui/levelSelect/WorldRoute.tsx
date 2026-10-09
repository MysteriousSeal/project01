import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { levelsInWorld, worldName } from '../../game/levels';
import { LevelRecord } from '../../storage/progress';
import { StarRow } from '../components/StarRow';
import { Tappable } from '../components/Tappable';
import { C, F, GUTTER, worldColor } from '../theme';

type Props = {
  worldIndex: number;
  highestUnlocked: number;
  records: Record<number, LevelRecord>;
  onOpen: (levelId: number) => void;
};

// One world drawn as a metro line: stations joined by the world's line color, top to bottom.
export const WorldRoute = memo(function WorldRoute({ worldIndex, highestUnlocked, records, onOpen }: Props) {
  const color = worldColor(worldIndex);
  return (
    <View style={styles.world}>
      <View style={styles.header}>
        <View style={[styles.headerDot, { backgroundColor: color }]} />
        <Text style={styles.name}>{worldName(worldIndex)}</Text>
      </View>
      <View style={styles.track}>
        {levelsInWorld(worldIndex).map((levelId, i) => (
          <View key={levelId} style={styles.stop}>
            {i > 0 && <View style={[styles.connector, { backgroundColor: color }]} />}
            <Station
              levelId={levelId}
              color={color}
              state={levelId > highestUnlocked ? 'locked' : levelId === highestUnlocked ? 'next' : 'open'}
              onOpen={onOpen}
            />
            <View style={styles.starSlot}>{records[levelId] && <StarRow stars={records[levelId].stars} size={9} />}</View>
          </View>
        ))}
      </View>
    </View>
  );
});

type StationState = 'locked' | 'next' | 'open';

function Station({ levelId, color, state, onOpen }: { levelId: number; color: string; state: StationState; onOpen: (id: number) => void }) {
  const locked = state === 'locked';
  return (
    <Tappable
      disabled={locked}
      onPress={() => onOpen(levelId)}
      accessibilityLabel={locked ? `Level ${levelId}, locked` : `Level ${levelId}`}
      style={[
        styles.station,
        locked ? styles.stationLocked : { borderColor: color },
        state === 'next' && { backgroundColor: color },
      ]}
    >
      <Text style={[styles.stationText, state === 'next' && styles.stationTextNext, locked && styles.stationTextLocked]}>
        {locked ? '•' : levelId}
      </Text>
    </Tappable>
  );
}

const styles = StyleSheet.create({
  world: { marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: GUTTER, marginBottom: 6 },
  headerDot: { width: 10, height: 10, borderRadius: 5 },
  name: { color: C.ink, fontFamily: F.display, fontWeight: F.displayWeight, fontSize: 15, letterSpacing: 1 },
  track: { alignItems: 'center' },
  stop: { alignItems: 'center' },
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
  stationText: { color: C.ink, fontWeight: '900', fontSize: 16 },
  stationTextNext: { color: C.surface },
  stationTextLocked: { color: C.locked },
  starSlot: { height: 12, marginTop: 2, marginBottom: 6 },
});
