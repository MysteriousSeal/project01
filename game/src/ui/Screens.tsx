import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { RunResult } from '../game/GameView';
import { levelInfo, missionLabel, RunReport } from '../game/progress';
import { Mission, Save } from '../game/save';
import { nextSkin } from '../game/skins';
import { F, fmt } from './theme';

export function GameOver({ result, report, onRetry, onHome, onShop }: { result: RunResult; report: RunReport; onRetry: () => void; onHome: () => void; onShop: () => void }) {
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const { save } = report;
  const leveled = report.levelAfter > report.levelBefore;
  return (
    <View style={styles.overRoot}>
      <TopBar save={save} onShop={onShop} inline />
      <View style={styles.overMid}>
        <View style={styles.badges}>
          {report.newBest && <Text style={[styles.badge, { backgroundColor: '#ffd34d' }]}>NEW BEST!</Text>}
          {leveled && <Text style={[styles.badge, { backgroundColor: '#9ad7ff' }]}>LEVEL {report.levelAfter}  ● +{report.levelReward}</Text>}
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={[styles.big, compact && { fontSize: 56, lineHeight: 62 }]}>{result.score}</Text>
          <Text style={styles.sub}>BEST {save.best}  ·  +{report.xpGained} XP</Text>
        </View>
        <View style={styles.row}>
          <Stat label="COINS" value={`+${result.coins}`} color="#ffd34d" compact={compact} />
          <Stat label="PERFECTS" value={`${result.perfects}`} color="#7dffb2" compact={compact} />
          <Stat label="COMBO" value={`x${result.bestCombo}`} color="#9ad7ff" compact={compact} />
        </View>
        <NextUnlock save={save} onShop={onShop} />
        <Missions missions={report.shown} compact={compact} />
      </View>
      <View style={styles.overBottom}>
        <Pressable style={styles.retryBtn} onPress={onRetry}>
          <Text style={styles.playTxt}>PLAY AGAIN</Text>
        </Pressable>
        <Pressable onPress={onHome} hitSlop={12}>
          <Text style={styles.link}>HOME</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function TopBar({ save, onShop }: { save: Save; onShop?: () => void; inline?: boolean }) {
  const { lvl, into, need } = levelInfo(save.xp);
  return (
    <View style={styles.topBarInline}>
      <View style={styles.lvlBox}>
        <Text style={styles.lvl}>LV {lvl}</Text>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${(into / need) * 100}%` }]} />
        </View>
      </View>
      <Pressable onPress={onShop} hitSlop={10} style={styles.walletBox}>
        <Text style={styles.wallet}>● {fmt(save.wallet)}</Text>
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

function Missions({ missions, compact }: { missions: Mission[]; compact?: boolean }) {
  return (
    <View style={[styles.missions, compact && { marginTop: 10, gap: 6 }]}>
      {missions.map((m) => {
        const done = m.progress >= m.target;
        return (
          <View key={m.id} style={[styles.mission, compact && { paddingVertical: 7 }, done && styles.missionDone]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.mText, done && { color: '#7dffb2' }]}>{done ? '✓ ' : ''}{missionLabel(m)}</Text>
              <View style={styles.mBar}>
                <View style={[styles.mFill, { width: `${(m.progress / m.target) * 100}%` }]} />
              </View>
            </View>
            <Text style={[styles.mReward, done && { color: '#7dffb2' }]}>{done ? '+' : '● '}{m.reward}</Text>
          </View>
        );
      })}
    </View>
  );
}

function Stat({ label, value, color, compact }: { label: string; value: string; color: string; compact?: boolean }) {
  return (
    <View style={[styles.stat, compact && { paddingVertical: 6 }]}>
      <Text style={[styles.statVal, { color }, compact && { fontSize: 20 }]}>{value}</Text>
      <Text style={styles.statLbl}>{label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  topBarInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 8 },
  overRoot: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0b1026ee', alignItems: 'center' },
  overMid: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 20 },
  badges: { flexDirection: 'row', gap: 8, minHeight: 28, alignItems: 'center' },
  badge: { color: '#0b1026', fontWeight: '900', fontSize: 14, letterSpacing: 1, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, overflow: 'hidden' },
  retryBtn: { backgroundColor: '#7dffb2', paddingHorizontal: 44, paddingVertical: 16, borderRadius: 40 },
  missionDone: { borderWidth: 1.5, borderColor: '#7dffb2' },
  overBottom: { alignItems: 'center', paddingTop: 6, paddingBottom: 30 },
  lvlBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lvl: { color: '#fff', fontSize: 15, fontWeight: '700', fontFamily: F.mono },
  bar: { width: 90, height: 8, borderRadius: 4, backgroundColor: '#ffffff22', overflow: 'hidden' },
  barFill: { height: 8, backgroundColor: '#9ad7ff' },
  walletBox: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wallet: { color: '#ffd34d', fontSize: 18, fontWeight: '700', fontFamily: F.mono },
  shop: { color: '#0b1026', backgroundColor: '#ffd34d', fontWeight: '900', fontSize: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, overflow: 'hidden' },
  sub: { color: '#9ad7ff', fontSize: 18, fontWeight: '800', letterSpacing: 2, marginTop: 8 },
  big: { color: '#fff', fontSize: 76, fontWeight: '900', lineHeight: 84 },
  row: { flexDirection: 'row', alignSelf: 'stretch', justifyContent: 'center', gap: 10 },
  stat: { alignItems: 'center', backgroundColor: '#ffffff12', borderRadius: 14, paddingVertical: 10, flex: 1, maxWidth: 104 },
  statVal: { fontSize: 24, fontWeight: '900' },
  statLbl: { color: '#ffffff99', fontSize: 11, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  playBtn: { marginTop: 24, backgroundColor: '#7dffb2', paddingHorizontal: 44, paddingVertical: 18, borderRadius: 40 },
  playTxt: { color: '#0b1026', fontSize: 22, fontWeight: '900', letterSpacing: 2 },
  link: { color: '#ffffffaa', fontSize: 16, fontWeight: '800', letterSpacing: 2, marginTop: 16 },
  unlock: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: '#ffffff10', borderWidth: 1.5, borderColor: 'transparent' },
  unlockReady: { borderColor: '#ffd34d' },
  unlockDot: { width: 24, height: 24, borderRadius: 12, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
  missions: { alignSelf: 'stretch', marginTop: 16, gap: 8 },
  mission: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff10', borderRadius: 12, padding: 10, gap: 10 },
  mText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  mBar: { height: 6, borderRadius: 3, backgroundColor: '#ffffff22', marginTop: 6, overflow: 'hidden' },
  mFill: { height: 6, backgroundColor: '#7dffb2' },
  mReward: { color: '#ffd34d', fontWeight: '900', fontSize: 14 },
});
