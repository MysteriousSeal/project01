import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { skinById, trailById } from './src/game/cosmetics';
import { claimDaily } from './src/game/daily';
import type { RunResult } from './src/game/engine';
import { applyRun, ensureMissions, RunReport } from './src/game/progress';
import { Save } from './src/game/save';
import { modsFrom } from './src/game/upgrades';
import { haptic, hapticForEvent } from './src/services/haptics';
import { loadSave, writeSave } from './src/services/storage';
import { C } from './src/ui/theme';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { ShopScreen } from './src/ui/screens/shop/ShopScreen';

type Screen = 'home' | 'play' | 'over';
type Outcome = { result: RunResult; report: RunReport };

const TUTORIAL_GAMES = 3;

export default function App() {
  const { width, height } = useWindowDimensions();
  const [save, setSave] = useState<Save | null>(null);
  const [screen, setScreen] = useState<Screen>('home');
  const [shopOpen, setShopOpen] = useState(false);
  const [run, setRun] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    let alive = true;
    loadSave().then((s) => alive && setSave(ensureMissions(s)));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (save) writeSave(save);
  }, [save]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (shopOpen) setShopOpen(false);
      else if (screen !== 'home') setScreen('home');
      else return false;
      return true;
    });
    return () => sub.remove();
  }, [shopOpen, screen]);

  const mods = useMemo(() => modsFrom(save?.upgrades ?? {}), [save?.upgrades]);

  if (!save) return <View style={styles.root} />;

  const play = () => {
    setRun((r) => r + 1);
    setScreen('play');
  };

  const finishRun = (result: RunResult) => {
    const report = applyRun(save, result);
    setSave(report.save);
    setOutcome({ result, report });
    setScreen('over');
    if (report.completed.length || report.levelAfter > report.levelBefore) haptic('success');
  };

  const claim = () => {
    const next = claimDaily(save);
    if (!next) return;
    setSave(next);
    haptic('success');
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {screen !== 'home' && (
        <GameScreen
          key={run}
          W={width}
          H={height}
          skin={skinById(save.skin)}
          trailStyle={trailById(save.trail).id}
          mods={mods}
          showHint={save.games < TUTORIAL_GAMES}
          bestIdx={save.bestPlanet}
          onEvent={hapticForEvent}
          onEnd={finishRun}
        />
      )}
      {screen === 'home' && <HomeScreen save={save} onPlay={play} onShop={() => setShopOpen(true)} onClaim={claim} />}
      {screen === 'over' && outcome && <GameOverScreen result={outcome.result} report={outcome.report} onRetry={play} onHome={() => setScreen('home')} onShop={() => setShopOpen(true)} />}
      {shopOpen && <ShopScreen save={save} onChange={setSave} onClose={() => setShopOpen(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.space },
});
