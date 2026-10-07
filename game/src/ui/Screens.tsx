import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RunResult } from '../game/GameView';
import { levelInfo, missionLabel, RunReport } from '../game/progress';
import { Mission, Save } from '../game/save';
import { nextSkin } from '../game/skins';

export function Home({ save, onPlay, onShop }: { save: Save; onPlay: () => void; onShop: () => void }) {
  return (
    <Pressable style={styles.full} onPress={onPlay}>
      <TopBar save={save} onShop={onShop} />
      <Text style={styles.title}>ORBIT{'\n'}HOP</Text>
      <Text style={styles.sub}>BEST {save.best}</Text>
      <View style={styles.playBtn}>
        <Text style={styles.playTxt}>TAP TO PLAY</Text>
      </View>
      <Missions missions={save.missions} />
    </Pressable>
  );
}

export function GameOver({ result, report, onRetry, onHome, onShop }: { result: RunResult; report: RunReport; onRetry: () => void; onHome: () => void; onShop: () => void }) {
  const { save } = report;
  const leveled = report.levelAfter > report.levelBefore;
  return (
    <View style={styles.overRoot}>
      <TopBar save={save} onShop={onShop} inline />
      <ScrollView style={{ flex: 1, alignSelf: 'stretch' }} contentContainerStyle={styles.overScroll}>
        {report.newBest && <Text style={styles.newBest}>NEW BEST!</Text>}
        <Text style={styles.big}>{result.score}</Text>
        <Text style={styles.sub}>BEST {save.best}  ·  +{report.xpGained} XP</Text>
        <View style={styles.row}>
          <Stat label="COINS" value={`+${result.coins}`} color="#ffd34d" />
          <Stat label="PERFECTS" value={`${result.perfects}`} color="#7dffb2" />
          <Stat label="COMBO" value={`x${result.bestCombo}`} color="#9ad7ff" />
        </View>
        {(leveled || report.completed.length > 0) && (
          <View style={styles.rewards}>
            {leveled && <Text style={styles.levelUp}>LEVEL UP! LV {report.levelAfter}  ● +{report.levelReward}</Text>}
            {report.completed.map((m) => (
              <Text key={m.id} style={styles.done}>✓ {missionLabel(m)}  ● +{m.reward}</Text>
            ))}
          </View>
        )}
        <NextUnlock save={save} onShop={onShop} />
        <Missions missions={save.missions} />
      </ScrollView>
      <View style={styles.overBottom}>
        <Pressable style={[styles.playBtn, { marginTop: 0 }]} onPress={onRetry}>
          <Text style={styles.playTxt}>PLAY AGAIN</Text>
        </Pressable>
        <Pressable onPress={onHome} hitSlop={12}>
          <Text style={styles.link}>HOME</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function TopBar({ save, onShop, inline }: { save: Save; onShop?: () => void; inline?: boolean }) {
  const { lvl, into, need } = levelInfo(save.xp);
  return (
    <View style={inline ? styles.topBarInline : styles.topBar}>
      <View style={styles.lvlBox}>
        <Text style={styles.lvl}>LV {lvl}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${(into / need) * 100}%` }]} />
        </View>
      </View>
      <Pressable onPress={onShop} hitSlop={10} style={styles.walletBox}>
        <Text style={styles.wallet}>● {save.wallet}</Text>
        {onShop && <Text style={styles.shop}>SHOP</Text>}
      </Pressable>
    </View>
  );
}

function NextUnlock({ save, onShop }: { save: Save; onShop: () => void }) {
  const k = nextSkin(save);
  if (!k) return null;
  const ready = save.wallet >= k.price;
  return (
    <Pressable onPress={onShop} style={[styles.unlock, ready && styles.unlockReady]}>
      <View style={[styles.unlockDot, { backgroundColor: k.ball, shadowColor: k.trail }]} />
      <View style={{ flex: 1 }}>
        <Text style={styles.mText}>{ready ? `${k.name} is ready to unlock!` : `${k.name}: ● ${k.price - save.wallet} to go`}</Text>
        <View style={styles.mBar}>
          <View style={[styles.mFill, { backgroundColor: '#ffd34d', width: `${Math.min(1, save.wallet / k.price) * 100}%` }]} />
        </View>
      </View>
    </Pressable>
  );
}

function Missions({ missions }: { missions: Mission[] }) {
  return (
    <View style={styles.missions}>
      {missions.map((m) => (
        <View key={m.id} style={styles.mission}>
          <View style={{ flex: 1 }}>
            <Text style={styles.mText}>{missionLabel(m)}</Text>
            <View style={styles.mBar}>
              <View style={[styles.mFill, { width: `${(m.progress / m.target) * 100}%` }]} />
            </View>
          </View>
          <Text style={styles.mReward}>● {m.reward}</Text>
        </View>
      ))}
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statVal, { color }]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  full: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  topBar: { position: 'absolute', top: 60, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topBarInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  overRoot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0b1026ee', alignItems: 'center' },
  overScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  overBottom: { alignItems: 'center', paddingTop: 10, paddingBottom: 34 },
  rewards: { alignSelf: 'stretch', alignItems: 'center', backgroundColor: '#ffd34d14', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8, gap: 4 },
  lvlBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lvl: { color: '#fff', fontSize: 16, fontWeight: '900' },
  bar: { width: 90, height: 8, borderRadius: 4, backgroundColor: '#ffffff22', overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#9ad7ff' },
  walletBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wallet: { color: '#ffd34d', fontSize: 20, fontWeight: '900' },
  shop: { color: '#0b1026', backgroundColor: '#ffd34d', fontWeight: '900', fontSize: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  title: { color: '#fff', fontSize: 72, fontWeight: '900', textAlign: 'center', lineHeight: 72, letterSpacing: 4 },
  sub: { color: '#9ad7ff', fontSize: 18, fontWeight: '800', letterSpacing: 2, marginTop: 8 },
  big: { color: '#fff', fontSize: 76, fontWeight: '900', lineHeight: 84 },
  newBest: { color: '#ffd34d', fontSize: 26, fontWeight: '900', letterSpacing: 3 },
  row: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'center', marginVertical: 16, gap: 10 },
  stat: { alignItems: 'center', backgroundColor: '#ffffff12', borderRadius: 14, paddingVertical: 10, flex: 1, maxWidth: 104 },
  statVal: { fontSize: 24, fontWeight: '900' },
  statLbl: { color: '#ffffff99', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  levelUp: { color: '#ffd34d', fontSize: 18, fontWeight: '900' },
  done: { color: '#7dffb2', fontSize: 14, fontWeight: '800', textAlign: 'center' },
  playBtn: { marginTop: 24, backgroundColor: '#7dffb2', paddingHorizontal: 44, paddingVertical: 18, borderRadius: 40 },
  playTxt: { color: '#0b1026', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  link: { color: '#ffffffaa', fontSize: 16, fontWeight: '800', letterSpacing: 2, marginTop: 16 },
  unlock: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, padding: 10, borderRadius: 12, backgroundColor: '#ffffff10', borderWidth: 1.5, borderColor: 'transparent' },
  unlockReady: { borderColor: '#ffd34d' },
  unlockDot: { width: 24, height: 24, borderRadius: 12, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  missions: { alignSelf: 'stretch', marginTop: 16, gap: 8 },
  mission: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff10', borderRadius: 12, padding: 10, gap: 10 },
  mText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  mBar: { height: 6, borderRadius: 3, backgroundColor: '#ffffff22', marginTop: 6, overflow: 'hidden' },
  mFill: { height: 6, backgroundColor: '#7dffb2' },
  mReward: { color: '#ffd34d', fontWeight: '900', fontSize: 14 },
});
