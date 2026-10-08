import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { currentChallenges, isOpen } from './src/game/meta/challenge';
import { skinById, themeById, trailById } from './src/game/meta/cosmetics';
import { claimDaily, dailyStatus } from './src/game/meta/dailyReward';
import { applyRun, ensureMissions, RunReport } from './src/game/meta/progress';
import { Save } from './src/game/meta/save';
import { retryMode, RunConfig, RunMode, startRun } from './src/game/meta/session';
import type { RunResult } from './src/game/sim/engine';
import { haptic, hapticForEvent } from './src/services/haptics';
import { loadSave, writeSave } from './src/services/storage';
import { TabBar, TabId } from './src/ui/components/TabBar';
import { DailyScreen } from './src/ui/screens/DailyScreen';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/game/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';
import { ShopScreen } from './src/ui/screens/shop/ShopScreen';
import { C } from './src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

type Run = { id: number; config: RunConfig };
type Outcome = { result: RunResult; report: RunReport };

export default function App() {
  const { width, height } = useWindowDimensions();
  const [save, setSave] = useState<Save | null>(null);
  const [tab, setTab] = useState<TabId>('home');
  const [run, setRun] = useState<Run | null>(null);
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

  const loaded = save !== null;
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  const inMenu = run === null;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!inMenu) setRun(null);
      else if (tab !== 'home') setTab('home');
      else return false;
      return true;
    });
    return () => sub.remove();
  }, [inMenu, tab]);

  if (!save) return <View style={styles.root} />;

  const goTab = (t: TabId) => {
    setTab(t);
    setRun(null);
    setOutcome(null);
  };

  const play = (mode: RunMode, type?: string) => {
    const started = startRun(save, mode, type);
    if (!started) return;
    setSave(started.save);
    setOutcome(null);
    setRun((r) => ({ id: (r?.id ?? 0) + 1, config: started.config }));
  };

  const retry = () => {
    if (!run) return;
    const next = retryMode(save, run.config);
    play(next.mode, next.type);
  };

  const finishRun = (result: RunResult) => {
    if (!run) return;
    const report = applyRun(save, result, { mode: run.config.mode, challenge: run.config.challenge?.id });
    setSave(report.save);
    setOutcome({ result, report });
    if (report.completed.length || report.levelAfter > report.levelBefore) haptic('success');
  };

  const claim = () => {
    const next = claimDaily(save);
    if (!next) return;
    setSave(next);
    haptic('success');
  };

  const dailyBadge = dailyStatus(save).available || currentChallenges(save.challenges).slots.some(isOpen);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {run && !outcome && (
        <GameScreen key={run.id} W={width} H={height} skin={skinById(save.skin)} trailStyle={trailById(save.trail).id} theme={themeById(save.theme)} config={run.config} onEvent={hapticForEvent} onEnd={finishRun} />
      )}
      {!run && (
        <>
          <View style={styles.page}>
            {tab === 'home' && <HomeScreen save={save} onPlay={() => play('normal')} onShop={() => goTab('shop')} />}
            {tab === 'daily' && <DailyScreen save={save} onPlay={(type) => play('daily', type)} onClaim={claim} />}
            {tab === 'shop' && <ShopScreen save={save} onChange={setSave} />}
            {tab === 'settings' && (
              <SettingsScreen
                save={save}
                onChange={(settings) => setSave({ ...save, settings })}
                onAddCoins={__DEV__ ? (amount) => setSave({ ...save, wallet: save.wallet + amount }) : undefined}
              />
            )}
          </View>
          <TabBar tab={tab} onChange={setTab} badges={{ daily: dailyBadge }} />
        </>
      )}
      {run && outcome && (
        <GameOverScreen
          result={outcome.result}
          report={outcome.report}
          onRetry={retry}
          onHome={() => goTab(run.config.mode === 'daily' ? 'daily' : 'home')}
          onShop={() => goTab('shop')}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.space },
  page: { flex: 1 },
});
