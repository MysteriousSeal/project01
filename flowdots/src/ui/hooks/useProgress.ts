import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { loadProgress, Progress } from '../../storage/progress';

// Reloads whenever the screen regains focus: coming back from a solved level must show the new
// stars and unlock without a remount.
export function useProgress(): Progress | null {
  const [progress, setProgress] = useState<Progress | null>(null);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadProgress().then((p) => {
        if (alive) setProgress(p);
      });
      return () => {
        alive = false;
      };
    }, []),
  );
  return progress;
}
