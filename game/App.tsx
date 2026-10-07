import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GameEvent } from './src/game/engine';
import GameView, { RunResult } from './src/game/GameView';
import { applyRun, claimDaily, ensureMissions, RunReport } from './src/game/progress';
import { defaultSave, loadSave, Save, writeSave } from './src/game/save';
import { skinById } from './src/game/skins';
import { Home } from './src/ui/Home';
import { GameOver } from './src/ui/Screens';
import { Shop } from './src/ui/Shop';

type Screen = 'home' | 'play' | 'over';

const buzz = (e: GameEvent) => {
  const H = Haptics;
  const p =
    e === 'perfect' ? H.impactAsync(H.ImpactFeedbackStyle.Medium)
    : e === 'land' ? H.impactAsync(H.ImpactFeedbackStyle.Light)
    : e === 'coin' ? H.selectionAsync()
    : e === 'death' ? H.notificationAsync(H.NotificationFeedbackType.Error)
    : e === 'milestone' || e === 'fever' || e === 'saved' ? H.impactAsync(H.ImpactFeedbackStyle.Heavy)
    : e === 'best' || e === 'power' ? H.notificationAsync(H.NotificationFeedbackType.Success)
    : null;
  p?.catch(() => {});
};

export default function App() {
  const { width: W, height: H } = useWindowDimensions();
  const [screen, setScreen] = useState<Screen>('home');
  const [run, setRun] = useState(0);
  const [save, setSave] = useState<Save>(() => ensureMissions(defaultSave()));
  const [result, setResult] = useState<RunResult | null>(null);
  const [report, setReport] = useState<RunReport | null>(null);
  const [shop, setShop] = useState(false);

  useEffect(() => {
    loadSave().then((s) => setSave(ensureMissions(s)));
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (shop) {
        setShop(false);
        return true;
      }
      if (screen === 'over') {
        setScreen('home');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [shop, screen]);

  const commit = (s: Save) => {
    setSave(s);
    writeSave(s);
  };

  const play = () => {
    setRun((r) => r + 1);
    setScreen('play');
  };

  const onEnd = (r: RunResult) => {
    const rep = applyRun(save, r);
    commit(rep.save);
    if (rep.completed.length || rep.levelAfter > rep.levelBefore) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setResult(r);
    setReport(rep);
    setScreen('over');
  };

  const openShop = () => setShop(true);
  const skin = skinById(save.skin);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {screen !== 'home' && <GameView key={run} W={W} H={H} ballColor={skin.ball} trailColor={skin.trail} showHint={save.games < 3} bestIdx={save.bestPlanet} onEvent={buzz} onEnd={onEnd} />}
      {screen === 'home' && <Home save={save} onPlay={play} onShop={openShop} onClaim={() => { commit(claimDaily(save)); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }} />}
      {screen === 'over' && result && report && <GameOver result={result} report={report} onRetry={play} onHome={() => setScreen('home')} onShop={openShop} />}
      {shop && <Shop save={save} onChange={commit} onClose={() => setShop(false)} onBuy={() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1026' },
});
