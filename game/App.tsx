import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import { currentChallenges, isOpen, resetAttempts } from './src/game/meta/challenge';
import { skinById, themeById, trailById } from './src/game/meta/cosmetics';
import { claimDaily, dailyStatus } from './src/game/meta/dailyReward';
import { applyRun, RunReport } from './src/game/meta/progress';
import { autoplayConfig, retryMode, RunConfig, RunMode, startRun } from './src/game/meta/session';
import { reviveOffer } from './src/game/meta/revive';
import { claimSeason, SEASON, seasonStatus } from './src/game/meta/season';
import type { GameEvent, RunResult } from './src/game/sim/engine';
import { gameFeedback } from './src/services/device/feedback';
import { haptic } from './src/services/device/haptics';
import { preloadSounds } from './src/services/device/sound';
import { useCloudSync } from './src/services/hooks/useCloudSync';
import { usePrefetchLeaderboards } from './src/services/hooks/useLeaderboards';
import { useSaveState } from './src/services/hooks/useSaveState';
import { AccountSection } from './src/ui/screens/AccountSection';
import { useTelemetry } from './src/services/hooks/useTelemetry';
import { accountApi, telemetry } from './src/services/instances';
import { runRow, uuid } from './src/game/meta/stats';
import { TabBar, TabId } from './src/ui/components/TabBar';
import { chooseProgress } from './src/ui/dialogs/chooseProgress';
import { DailyScreen } from './src/ui/screens/DailyScreen';
import { GameOverScreen } from './src/ui/screens/GameOverScreen';
import { GameScreen } from './src/ui/screens/game/GameScreen';
import { HomeScreen } from './src/ui/screens/HomeScreen';
import { RanksScreen } from './src/ui/screens/RanksScreen';
import { SeasonScreen } from './src/ui/screens/SeasonScreen';
import { SettingsScreen } from './src/ui/screens/SettingsScreen';
import { TrophiesScreen } from './src/ui/screens/TrophiesScreen';
import { ShopScreen } from './src/ui/screens/shop/ShopScreen';
import { C } from './src/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

/**
 * `runId` is the server id shared by the run row and any revive paid during it. `bot` runs are
 * dev autoplay: nothing about them is saved, logged or ranked.
 */
type Run = { id: number; runId: string; config: RunConfig; bot?: boolean };
type Outcome = { result: RunResult; report: RunReport };
/** Pages opened from Home on top of the tabs. */
type Overlay = 'settings' | 'season' | null;

export default function App() {
  const { width, height } = useWindowDimensions();
  const [tab, setTab] = useState<TabId>('home');
  const [page, setPage] = useState<Overlay>(null);
  const [newTrophies, setNewTrophies] = useState(false);
  const { save, update, replace } = useSaveState(() => tab !== 'trophies' && setNewTrophies(true));
  const [run, setRun] = useState<Run | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const switchAccount = useCloudSync(save, replace);
  useTelemetry(save?.name ?? '');
  usePrefetchLeaderboards();

  const loaded = save !== null;
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  const soundOn = save?.settings.sound ?? false;
  useEffect(() => {
    if (soundOn) preloadSounds();
  }, [soundOn]);

  const inMenu = run === null;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!inMenu) setRun(null);
      else if (page) setPage(null);
      else if (tab !== 'home') setTab('home');
      else return false;
      return true;
    });
    return () => sub.remove();
  }, [inMenu, tab, page]);

  if (!save) return <View style={styles.root} />;

  const goTab = (t: TabId) => {
    setTab(t);
    if (t === 'trophies') setNewTrophies(false);
    setPage(null);
    setRun(null);
    setOutcome(null);
  };

  const play = (mode: RunMode, type?: string) => {
    const started = startRun(save, mode, type);
    if (!started) return;
    update(started.save);
    setOutcome(null);
    setRun((r) => ({ id: (r?.id ?? 0) + 1, runId: uuid(), config: started.config }));
  };

  const startBot = () => {
    setOutcome(null);
    setRun((r) => ({ id: (r?.id ?? 0) + 1, runId: '', config: autoplayConfig(save), bot: true }));
  };

  const retry = () => {
    if (!run) return;
    const next = retryMode(save, run.config);
    play(next.mode, next.type);
  };

  const finishRun = (result: RunResult) => {
    if (!run) return;
    if (run.bot) return startBot();
    const report = applyRun(save, result, { mode: run.config.mode, challenge: run.config.challenge?.id });
    const { runId } = run;
    void telemetry?.logRun(runRow(runId, run.config, result, save.challenges.day || null));
    update(report.save, { source: 'run', runId });
    setOutcome({ result, report });
    if (report.completed.length || report.levelAfter > report.levelBefore) haptic('success');
  };

  const onGameEvent = (e: GameEvent, combo: number) => gameFeedback(e, combo, save.settings.sound);

  const offerRevive = (used: number) => (run ? reviveOffer(run.config.mode, used, save.wallet) : null);

  const payRevive = (used: number) => {
    const price = offerRevive(used);
    if (!run || price === null) return false;
    update({ ...save, wallet: save.wallet - price }, { source: 'revive', runId: run.runId, count: used + 1 });
    return true;
  };

  const claim = () => {
    const next = claimDaily(save);
    if (!next) return;
    update(next, { source: 'daily_reward' });
    haptic('success');
  };

  const claimSeasonTiers = (tiers?: number[]) => {
    const claimed = claimSeason(save, tiers);
    if (!claimed) return;
    update(claimed.save, { source: 'season', season: SEASON.id, tiers: claimed.coinTiers });
    haptic('success');
  };

  const season = seasonStatus(save);
  const dailyBadge = dailyStatus(save).available || currentChallenges(save.challenges).slots.some(isOpen);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {run && !outcome && (
        <GameScreen key={run.id} W={width} H={height} skin={skinById(save.skin)} trailStyle={trailById(save.trail).id} theme={themeById(save.theme)} config={run.config} onEvent={onGameEvent} onEnd={finishRun} reviveOffer={offerRevive} onRevive={payRevive} wallet={save.wallet} autoplay={run.bot} onStop={() => setRun(null)} />
      )}
      {!run && (
        <>
          <View style={styles.page}>
            {!page && tab === 'home' && <HomeScreen save={save} onPlay={() => play('normal')} onShop={() => goTab('shop')} onSettings={() => setPage('settings')} onSeason={season.open ? () => setPage('season') : undefined} seasonReady={season.claimable.length > 0} />}
            {!page && tab === 'daily' && <DailyScreen save={save} onPlay={(type) => play('daily', type)} onClaim={claim} />}
            {!page && tab === 'ranks' && <RanksScreen save={save} />}
            {!page && tab === 'shop' && <ShopScreen save={save} onChange={(next) => update(next, { source: 'shop' })} />}
            {!page && tab === 'trophies' && <TrophiesScreen save={save} />}
            {page === 'season' && <SeasonScreen save={save} onBack={() => setPage(null)} onClaim={claimSeasonTiers} />}
            {page === 'settings' && (
              <SettingsScreen
                onBack={() => setPage(null)}
                save={save}
                onChange={(settings) => update({ ...save, settings })}
                onRename={(name) => update({ ...save, name })}
                account={accountApi && <AccountSection api={accountApi} beforeAuth={async () => void (await telemetry?.flush())} onSwitched={() => switchAccount(chooseProgress)} />}
                onAddCoins={__DEV__ ? (amount) => update({ ...save, wallet: save.wallet + amount }, { source: 'dev' }) : undefined}
                onResetAttempts={__DEV__ ? () => update({ ...save, challenges: resetAttempts(save.challenges) }) : undefined}
                onAutoplay={__DEV__ ? startBot : undefined}
              />
            )}
          </View>
          <TabBar tab={tab} onChange={goTab} badges={{ daily: dailyBadge, trophies: newTrophies }} />
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
