import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { C } from '../ui/theme';

// Puzzle screens turn off the iOS edge-swipe back gesture: drawing a line along the left edge
// of the board would otherwise trigger it.
const PUZZLE_SCREEN = { gestureEnabled: false };

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.canvas } }}>
        <Stack.Screen name="game/[level]" options={PUZZLE_SCREEN} />
        <Stack.Screen name="daily" options={PUZZLE_SCREEN} />
      </Stack>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
