import { Pressable, StyleSheet, Text, View } from 'react-native';
import { levelInfo } from '../../game/meta/progress';
import { Save } from '../../game/meta/save';
import { C, F, fmt, GUTTER, RADIUS, TOP_INSET } from '../theme';
import { ProgressBar } from './ProgressBar';
import { Coin, Icon } from './Icon';

type Props = { save: Save; onShop?: () => void; onSettings?: () => void; onSeason?: () => void; seasonReady?: boolean };

export function TopBar({ save, onShop, onSettings, onSeason, seasonReady }: Props) {
  const { lvl, into, need } = levelInfo(save.xp);
  const wallet = (
    <>
      <Text style={styles.wallet}><Coin size={16} /> {fmt(save.wallet)}</Text>
      {onShop && <Text style={styles.shop}>SHOP</Text>}
    </>
  );
  return (
    <View style={styles.bar}>
      <View style={styles.row} accessible accessibilityLabel={`Level ${lvl}`}>
        <Text style={styles.lvl}>LV {lvl}</Text>
        <ProgressBar value={into / need} color={C.sky} height={8} width={90} />
      </View>
      {onShop ? (
        <Pressable onPress={onShop} hitSlop={10} style={styles.row} accessibilityRole="button" accessibilityLabel={`${save.wallet} coins, open shop`}>
          {wallet}
        </Pressable>
      ) : (
        <View style={styles.row}>
          {wallet}
          {onSeason && (
            <Pressable onPress={onSeason} hitSlop={10} style={({ pressed }) => [styles.gear, styles.season, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel={`Season pass${seasonReady ? ', rewards ready' : ''}`}>
              <Icon name="star" size={16} color={C.gold} />
              {seasonReady && <View style={styles.dot} />}
            </Pressable>
          )}
          {onSettings && (
            <Pressable onPress={onSettings} hitSlop={10} style={({ pressed }) => [styles.gear, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="Settings">
              <Icon name="gear" size={17} color={C.soft} />
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', alignSelf: 'stretch', paddingHorizontal: GUTTER, paddingTop: TOP_INSET, paddingBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lvl: { color: C.text, fontSize: 15, fontWeight: '700', fontFamily: F.mono },
  wallet: { color: C.gold, fontSize: 18, fontWeight: '700', fontFamily: F.mono },
  gear: { width: 34, height: 34, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: C.surface, borderWidth: 1, borderColor: C.line, marginLeft: 4 },
  pressed: { opacity: 0.7 },
  season: { borderColor: C.goldEdge, backgroundColor: C.goldWash },
  dot: { position: 'absolute', top: -3, right: -3, width: 10, height: 10, borderRadius: 5, backgroundColor: C.pink, borderWidth: 1.5, borderColor: C.space },
  shop: { color: C.space, backgroundColor: C.gold, fontWeight: '900', fontSize: 13, paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADIUS.sm, overflow: 'hidden' },
});
