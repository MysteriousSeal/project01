import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useEffectEvent, useState } from 'react';
import { Alert, BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { currentChallenges, isOpen, resetAttempts } from './src/game/meta/challenge';
import { skinById, themeById, trailById } from './src/game/meta/cosmetics';
import { claimDaily, dailyStatus } from './src/game/meta/dailyReward';
import { applyRun, ensureMissions, RunReport } from './src/game/meta/progress';
import { Save } from './src/game/meta/save';
import { retryMode, RunConfig, RunMode, startRun } from './src/game/meta/session';
import { progressSummary, recommendedSource, SaveSource, touch } from './src/game/meta/sync';
import type { RunResult } from './src/game/sim/engine';
import { haptic, hapticForEvent } from './src/services/haptics';
import { loadSave, writeSave } from './src/services/storage';
import { supabaseAccount } from './src/services/account';
import { supabase } from './src/services/supabase';
import { useCloudSync } from './src/services/useCloudSync';
import { usePrefetchLeaderboards } from './src/services/useLeaderboards';
import { AccountSection } from './src/ui/screens/AccountSection';
import { telemetry, useTelemetry } from './src/services/useTelemetry';
import { ChangeReason, diffLedger, openingEntry } from './src/game/meta/ledger';
import { runRow, uuid } from './src/game/meta/stats';
import { TabBar, TabId } from './src/ui/components/TabBar';
import { DailyScreen } from './src/ui/screens/DailyScreen';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/game/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { RanksScreen } from './src/ui/screens/RanksScreen';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';
import { ShopScreen } from './src/ui/screens/shop/ShopScreen';
import { C } from './src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

const accountApi = supabase ? supabaseAccount(supabase) : null;

const describe = (s: Save) => {
  const p = progressSummary(s);
  return `Level ${p.level} · ${p.wallet} coins · best ${p.best} · ${p.games} games`;
};

const chooseProgress = (local: Save, remote: Save) =>
  new Promise<SaveSource>((resolve) => {
    const best = recommendedSource(local, remote);
    Alert.alert(
      'Choose your progress',
      `This account already has progress.\n\nAccount: ${describe(remote)}\nThis phone: ${describe(local)}\n\nThe other one will be replaced.`,
      [
        { text: best === 'local' ? 'Keep this phone (recommended)' : 'Keep this phone', onPress: () => resolve('local') },
        { text: best === 'remote' ? 'Use account progress (recommended)' : 'Use account progress', onPress: () => resolve('remote'), style: 'default' },
      ],
      { cancelable: false },
    );
  });

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

  const switchAccount = useCloudSync(save, (remote) => setSave(ensureMissions(remote)));
  useTelemetry(save?.name ?? '');
  usePrefetchLeaderboards();

  const needsOpening = save !== null && !save.ledgerStarted && telemetry !== null;
  const startLedger = useEffectEvent(() => {
    if (!save || save.ledgerStarted) return;
    if (save.wallet > 0) void telemetry?.logLedger([openingEntry(save, uuid())]);
    setSave(touch({ ...save, ledgerStarted: true }));
  });
  useEffect(() => {
    if (needsOpening) startLedger();
  }, [needsOpening]);

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

  const update = (next: Save, reason: ChangeReason = { source: 'other' }) => {
    void telemetry?.logLedger(diffLedger(save, next, reason, uuid));
    setSave(touch(next));
  };

  const goTab = (t: TabId) => {
    setTab(t);
    setRun(null);
    setOutcome(null);
  };

  const play = (mode: RunMode, type?: string) => {
    const started = startRun(save, mode, type);
    if (!started) return;
    update(started.save);
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
    const runId = uuid();
    void telemetry?.logRun(runRow(runId, run.config, result, save.challenges.day || null));
    update(report.save, { source: 'run', runId });
    setOutcome({ result, report });
    if (report.completed.length || report.levelAfter > report.levelBefore) haptic('success');
  };

  const claim = () => {
    const next = claimDaily(save);
    if (!next) return;
    update(next, { source: 'daily_reward' });
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
            {tab === 'ranks' && <RanksScreen save={save} />}
            {tab === 'shop' && <ShopScreen save={save} onChange={(next) => update(next, { source: 'shop' })} />}
            {tab === 'settings' && (
              <SettingsScreen
                save={save}
                onChange={(settings) => update({ ...save, settings })}
                onRename={(name) => update({ ...save, name })}
                account={accountApi && <AccountSection api={accountApi} beforeAuth={async () => void (await telemetry?.flush())} onSwitched={() => switchAccount(chooseProgress)} />}
                onAddCoins={__DEV__ ? (amount) => update({ ...save, wallet: save.wallet + amount }, { source: 'dev' }) : undefined}
                onResetAttempts={__DEV__ ? () => update({ ...save, challenges: resetAttempts(save.challenges) }) : undefined}
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
