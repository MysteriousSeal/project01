import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { Button } from '../../ui/components/Button';
import { PuzzleBoard } from '../../ui/components/PuzzleBoard';
import { generateLevel, generateSolution, worldForLevel } from '../../game/generate';
import { recordLevelComplete } from '../../game/save';
import { dotColors } from '../../game/theme';

export default function GameScreen() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const levelId = Math.max(1, Number(level) || 1);
  // Keyed by levelId so navigating to a new level remounts this with fresh state, instead of
  // syncing state to a changed prop via an effect.
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <Board key={levelId} levelId={levelId} />
    </>
  );
}

function Board({ levelId }: { levelId: number }) {
  const router = useRouter();
  const def = useMemo(() => generateLevel(levelId), [levelId]);
  const solution = useMemo(() => generateSolution(levelId), [levelId]);
  const accentColor = dotColors[worldForLevel(levelId) % dotColors.length];

  return (
    <PuzzleBoard
      def={def}
      solution={solution}
      title={`LEVEL ${levelId}`}
      accentColor={accentColor}
      onBack={() => router.back()}
      onSolved={(timeMs, stars) => {
        recordLevelComplete(levelId, timeMs, stars);
      }}
      solvedActions={() => (
        <View style={{ gap: 12, alignItems: 'center' }}>
          <Button label="NEXT LEVEL" size="lg" onPress={() => router.replace(`/game/${levelId + 1}`)} />
          <Button label="LEVEL SELECT" variant="secondary" onPress={() => router.replace('/')} />
        </View>
      )}
    />
  );
}
