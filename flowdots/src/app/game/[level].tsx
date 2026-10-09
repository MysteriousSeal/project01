import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { campaignLevel, isLevelId, LEVEL_COUNT, worldForLevel } from '../../game/levels';
import { recordLevelComplete } from '../../storage/progress';
import { Button } from '../../ui/components/Button';
import { useGoBack } from '../../ui/hooks/useGoBack';
import { PuzzleBoard } from '../../ui/puzzle/PuzzleBoard';
import { worldColor } from '../../ui/theme';

export default function GameScreen() {
  const { level } = useLocalSearchParams<{ level: string }>();
  const levelId = Number(level);
  // The route param is user-controllable (deep links), so anything outside the campaign goes home.
  if (!isLevelId(levelId)) return <Redirect href="/" />;
  // Keyed by levelId so "next level" remounts with fresh state instead of syncing it in an effect.
  return <CampaignBoard key={levelId} levelId={levelId} />;
}

function CampaignBoard({ levelId }: { levelId: number }) {
  const router = useRouter();
  const goBack = useGoBack();
  const level = useMemo(() => campaignLevel(levelId), [levelId]);
  const isLast = levelId === LEVEL_COUNT;

  return (
    <PuzzleBoard
      level={level}
      title={`LEVEL ${levelId}`}
      accentColor={worldColor(worldForLevel(levelId))}
      onBack={goBack}
      onSolved={({ timeMs, stars }) => recordLevelComplete(levelId, timeMs, stars)}
      solvedActions={() => (
        <>
          {!isLast && <Button label="NEXT LEVEL" size="lg" onPress={() => router.replace(`/game/${levelId + 1}`)} />}
          <Button label="LEVEL MAP" variant={isLast ? 'primary' : 'secondary'} size={isLast ? 'lg' : 'md'} onPress={goBack} />
        </>
      )}
    />
  );
}
