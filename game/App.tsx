import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { attemptsLeft, challengeSeed, currentChallenges, isOpen, slotOf, startChallenge, typeOf } from './src/game/challenge';
import { skinById, trailById } from './src/game/cosmetics';
import { claimDaily, dailyStatus, dayKey } from './src/game/daily';
import type { RunResult } from './src/game/engine';
import { applyRun, ensureMissions, RunMode, RunReport } from './src/game/progress';
import { Save } from './src/game/save';
import { DEFAULT_MODS, modsFrom } from './src/game/upgrades';
import { haptic, hapticForEvent } from './src/services/haptics';
import { loadSave, writeSave } from './src/services/storage';
import { TabBar, TabId } from './src/ui/components/TabBar';
import { DailyScreen } from './src/ui/screens/DailyScreen';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';
import { ShopScreen } from './src/ui/screens/shop/ShopScreen';
import { C } from './src/ui/theme';

type Screen = 'menu' | 'play' | 'over';
type Outcome = { result: RunResult; report: RunReport };

const TUTORIAL_GAMES = 3;

export default function App() {
  const { width, height } = useWindowDimensions();
  const [save, setSave] = useState<Save | null>(null);
  const [screen, setScreen] = useState<Screen>('menu');
  const [tab, setTab] = useState<TabId>('home');
  const [run, setRun] = useState(0);
  const [mode, setMode] = useState<RunMode>('normal');
  const [active, setActive] = useState('');
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
      if (screen !== 'menu') setScreen('menu');
      else if (tab !== 'home') setTab('home');
      else return false;
      return true;
    });
    return () => sub.remove();
  }, [screen, tab]);

  const mods = useMemo(() => modsFrom(save?.upgrades ?? {}), [save?.upgrades]);

  if (!save) return <View style={styles.root} />;

  const goTab = (t: TabId) => {
    setTab(t);
    setScreen('menu');
  };

  const play = (next: RunMode, type = '') => {
    if (next === 'daily') {
      const challenges = startChallenge(save.challenges, type);
      if (!challenges) return;
      setSave({ ...save, challenges });
      setActive(type);
    }
    setMode(next);
    setRun((r) => r + 1);
    setScreen('play');
  };

  const activeSlot = slotOf(currentChallenges(save.challenges), active);
  const retry = () => (mode === 'daily' && activeSlot && attemptsLeft(activeSlot) > 0 ? play('daily', active) : play('normal'));

  const finishRun = (result: RunResult) => {
    const report = applyRun(save, result, { mode, challenge: active });
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

  const daily = mode === 'daily';
  const dailyBadge = dailyStatus(save).available || currentChallenges(save.challenges).slots.some(isOpen);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {screen === 'menu' ? (
        <>
          <View style={styles.page}>
            {tab === 'home' && <HomeScreen save={save} onPlay={() => play('normal')} onShop={() => goTab('shop')} />}
            {tab === 'daily' && <DailyScreen save={save} onPlay={(type) => play('daily', type)} onClaim={claim} />}
            {tab === 'shop' && <ShopScreen save={save} onChange={setSave} />}
            {tab === 'settings' && <SettingsScreen save={save} onChange={(settings) => setSave({ ...save, settings })} />}
          </View>
          <TabBar tab={tab} onChange={setTab} badges={{ daily: dailyBadge }} />
        </>
      ) : (
        <GameScreen
          key={run}
          W={width}
          H={height}
          skin={skinById(save.skin)}
          trailStyle={trailById(save.trail).id}
          mods={daily ? DEFAULT_MODS : mods}
          showHint={save.games < TUTORIAL_GAMES}
          bestIdx={daily ? 0 : save.bestPlanet}
          ghost={!save.settings.ghost ? [] : daily && activeSlot ? activeSlot.ghost : save.ghost}
          seed={daily ? challengeSeed(save.challenges.day || dayKey(new Date()), active) : undefined}
          challenge={daily && activeSlot ? typeOf(activeSlot) : undefined}
          onEvent={hapticForEvent}
          onEnd={finishRun}
        />
      )}
      {screen === 'over' && outcome && (
        <GameOverScreen result={outcome.result} report={outcome.report} onRetry={retry} onHome={() => goTab(daily ? 'daily' : 'home')} onShop={() => goTab('shop')} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.space },
  page: { flex: 1 },
});
