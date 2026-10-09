import { useRouter } from 'expo-router';
import { useCallback } from 'react';

// Back to the previous screen, or to the level map when opened directly (deep link / reload)
// with nothing underneath. Replacing to '/' from a pushed screen would instead stack a second
// copy of the map on top of the first.
export function useGoBack(): () => void {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);
}
