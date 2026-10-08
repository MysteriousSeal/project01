import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GameScreen } from './src/ui/GameScreen';

export default function App() {
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));

  useEffect(() => {
    // app.json asks for landscape; this also holds it in Expo Go.
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).catch(() => {});
  }, []);

  return (
    <>
      <StatusBar hidden />
      <GameScreen seed={seed} />
    </>
  );
}
